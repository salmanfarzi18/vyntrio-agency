import {timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {RESTORE_TARGET,restoreDrill} from '../../lib/restore-drill.ts';
const reportPath='restore-tests/latest.json';
export default async function(request){
 const expected=Netlify.env.get('CRON_SECRET')||'',actual=request.headers.get('authorization')||'';
 const a=Buffer.from(actual),b=Buffer.from('Bearer '+expected);
 if(!expected||a.length!==b.length||!timingSafeEqual(a,b))throw Error('Unauthorized restore job');
 const sourceUrl=Netlify.env.get('NEXT_PUBLIC_SUPABASE_URL');
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const source=createClient(sourceUrl,Netlify.env.get('SUPABASE_SECRET_KEY'),options);
 const bucket=Netlify.env.get('BACKUP_BUCKET');
 const previous=await source.storage.from(bucket).download(reportPath);
 if(previous.error)throw Error('Restore job was not prepared');
 const prepared=JSON.parse(await previous.data.text());
 if(prepared.status!=='queued')return;
 async function save(value){const result=await source.storage.from(bucket).upload(reportPath,Buffer.from(JSON.stringify(value)),{contentType:'application/json',upsert:true});if(result.error)throw Error('Could not save recovery verification');}
 await save({...prepared,status:'running'});
 try{
  const target=createClient(RESTORE_TARGET,Netlify.env.get('RESTORE_TEST_SUPABASE_SECRET_KEY'),options);
  const result=await restoreDrill({source,target,sourceUrl,targetUrl:RESTORE_TARGET,recoveryKey:Netlify.env.get('BACKUP_ENCRYPTION_KEY'),bucket});
  await save({status:'completed',startedAt:prepared.startedAt,...result});
  await source.from('audit_log').insert({actor_id:prepared.ownerId,action:'restoreDrillVerified',entity:'backup',entity_id:result.snapshotId});
 }catch(error){
  const message=error instanceof Error&&/^(The restore-test project is not empty|The restore-test database is not empty|Recovered records differ from the snapshot in [a-z_]+\.|Recovered file integrity check failed\.|Restore operation failed \([a-zA-Z0-9_]+\)\.)/.test(error.message)?error.message:'Recovery verification did not complete. Inspect the isolated test project before retrying.';
  await save({status:'failed',startedAt:prepared.startedAt,completedAt:new Date().toISOString(),message});
  throw Error('Isolated recovery verification failed');
 }
}
export const config={background:true};
