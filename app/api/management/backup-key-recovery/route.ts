import {gunzipSync} from 'node:zlib';
import {z} from 'zod';
import {requireIdentity} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {env,isOwnerEmail} from '@/lib/config';
import {assert,errorResponse,readJson,requireSameOrigin} from '@/lib/security';
import {limit} from '@/lib/protection';
import {decryptBackup} from '@/lib/backup-crypto';
import {backupKeyRecoveryEnabled,wrapBackupKey} from '@/lib/backup-key-recovery';

export const runtime='nodejs';
export async function POST(request:Request){
 try{
  requireSameOrigin(request);
  assert(backupKeyRecoveryEnabled(),404,'Recovery is unavailable on this deployment.');
  const current=await requireIdentity(true);
  assert(current.role==='owner'&&isOwnerEmail(current.user.email!),403,'Only the verified agency owner can recover this key.');
  await limit(request,'backup-key-recovery',2,900,current.user.id);
  const {publicKey}=z.object({publicKey:z.object({kty:z.literal('RSA'),n:z.string().regex(/^[A-Za-z0-9_-]{342}$/),e:z.literal('AQAB')})}).parse(await readJson(request,2048));
  const key=env('BACKUP_ENCRYPTION_KEY'),db=adminDb();
  const {data:backup,error}=await db.from('backup_runs').select('id,object_path,completed_at').eq('status','completed').not('object_path','is',null).order('completed_at',{ascending:false}).limit(1).single();
  assert(!error&&backup?.object_path,503,'A completed backup is required to verify the original key.');
  const {data:file,error:downloadError}=await db.storage.from(env('BACKUP_BUCKET')).download(backup.object_path);
  assert(!downloadError&&file,503,'Could not read the verification backup.');
  const snapshot=JSON.parse(gunzipSync(decryptBackup(Buffer.from(await file.arrayBuffer()),key),{maxOutputLength:32000000}).toString());
  assert(snapshot.format==='vyntrio-snapshot'&&snapshot.version===1,503,'The backup could not be verified.');
  const encryptedKey=wrapBackupKey(key,publicKey);
  const {error:auditError}=await db.from('audit_log').insert({actor_id:current.user.id,action:'recoverBackupKey',entity:'backup',entity_id:backup.id});
  assert(!auditError,503,'The recovery audit record could not be saved.');
  return Response.json({ok:true,encryptedKey,verifiedBackupAt:backup.completed_at},{headers:{'Cache-Control':'private, no-store','Pragma':'no-cache'}});
 }catch(error){const response=errorResponse(error);response.headers.set('Cache-Control','private, no-store');return response;}
}
