import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import type {SupabaseClient} from '@supabase/supabase-js';
import {decryptBackup} from './backup-crypto';

export const RESTORE_TARGET='https://frrmvmvittfhsmdchrrd.supabase.co';
export const RESTORE_SOURCE='https://kxwjkrfwtlgeeimceesj.supabase.co';
export const restoreTables=['agencies','profiles','memberships','inquiries','projects','project_members','milestones','updates','quotes','invoices','payment_orders','payments','legacy_payments','files','tickets','ticket_messages','audit_log','notification_outbox'] as const;
type Row=Record<string,any>;
export function checkRestoreTarget(source:string,target:string){
 if(source.replace(/\/$/,'')!==RESTORE_SOURCE||target.replace(/\/$/,'')!==RESTORE_TARGET)throw Error('Restore is restricted to the separate approved test project.');
}
export function decodeSnapshot(bytes:Buffer,key:string){
 const snapshot=JSON.parse(gunzipSync(decryptBackup(bytes,key),{maxOutputLength:20000000}).toString());
 if(snapshot.format!=='vyntrio-snapshot'||snapshot.version!==1||!snapshot.tables)throw Error('Unsupported backup format.');
 if(Object.keys(snapshot.tables).length!==restoreTables.length||restoreTables.some(t=>!Array.isArray(snapshot.tables[t])))throw Error('Snapshot table manifest is incomplete.');
 if(snapshot.tables.agencies.length!==1||snapshot.tables.agencies[0].id!=='11111111-1111-4111-8111-111111111111')throw Error('Snapshot belongs to another workspace.');
 return snapshot as {createdAt:string;tables:Record<string,Row[]>};
}
export function restoreRow(table:string,row:Row,ids:Map<string,string>){
 const copy=Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='string'&&ids.has(value)?ids.get(value):value]));
 if(table==='audit_log')delete copy.id;
 if(table==='notification_outbox'&&copy.status!=='sent')Object.assign(copy,{status:'failed',attempts:8,last_error:'Suppressed for isolated restore test.'});
 return copy;
}
function canonical(value:any):any{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 if(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(value)&&Number.isFinite(Date.parse(value)))return new Date(value).toISOString();
 return value;
}
export function rowDigest(rows:Row[]){return createHash('sha256').update(rows.map(r=>JSON.stringify(canonical(r))).sort().join('\n')).digest('hex');}
function checked<T extends {error:any}>(result:T):T{if(result.error)throw Error('Restore operation failed ('+(result.error.code||'provider')+').');return result;}

export async function restoreDrill(options:{source:SupabaseClient;target:SupabaseClient;sourceUrl:string;targetUrl:string;recoveryKey:string;bucket:string}){
 const {source,target,recoveryKey,bucket,sourceUrl,targetUrl}=options;
 checkRestoreTarget(sourceUrl,targetUrl);
 const started=Date.now();
 const users=checked(await target.auth.admin.listUsers({page:1,perPage:1}));
 if(users.data.users.length)throw Error('The restore-test project is not empty. No records were overwritten.');
 const buckets=checked(await target.storage.listBuckets()).data||[];
 if(!buckets.some(b=>b.id==='project-files'&&!b.public))throw Error('Restore target requires a private project-files bucket.');
 for(const table of restoreTables){
  const result=checked(await target.from(table).select('*',{count:'exact',head:true}));
  if(result.count&&(table!=='agencies'||result.count!==1))throw Error('The restore-test database is not empty. No records were overwritten.');
 }
 const latest=checked(await source.from('backup_runs').select('id,object_path,completed_at').eq('status','completed').not('object_path','is',null).order('completed_at',{ascending:false}).limit(1).single()).data;
 if(!latest?.object_path?.startsWith('database/'))throw Error('No completed snapshot is available.');
 const encrypted=checked(await source.storage.from(bucket).download(latest.object_path)).data;
 const snapshot=decodeSnapshot(Buffer.from(await encrypted!.arrayBuffer()),recoveryKey);
 // Decrypt/validate every file before writing any customer record to the target.
 const files:Array<{path:string;mime:string;bytes:Buffer;hash:string}>=[];
 for(const file of snapshot.tables.files){
  if(file.backup_status!=='completed'||!file.backup_path?.startsWith('files/')||typeof file.path!=='string')throw Error('Snapshot contains an unrecoverable file.');
  const blob=checked(await source.storage.from(bucket).download(file.backup_path)).data;
  const bytes=decryptBackup(Buffer.from(await blob!.arrayBuffer()),recoveryKey);
  if(bytes.length!==file.size)throw Error('Recovered file size does not match the backup manifest.');
  files.push({path:file.path,mime:file.mime_type,bytes,hash:createHash('sha256').update(bytes).digest('hex')});
 }
 const ids=new Map<string,string>();
 for(const profile of snapshot.tables.profiles){
  // Admin createUser does not send an invitation; confirmations and passwords
  // remain unset. Test accounts are banned from signing in. No production
  // session or MFA material is copied.
  const created=checked(await target.auth.admin.createUser({email:profile.email,email_confirm:false,ban_duration:'876000h',user_metadata:{full_name:profile.full_name||''}}));
  if(!created.data.user)throw Error('Could not prepare a restored account.');
  ids.set(profile.id,created.data.user.id);
 }
 const manifest:Record<string,{rows:number;digest:string}>={};
 for(const table of restoreTables){
  const expected=snapshot.tables[table].map(row=>restoreRow(table,row,ids));
  for(let offset=0;offset<expected.length;offset+=100){
   const chunk=expected.slice(offset,offset+100);
   checked(table==='audit_log'?await target.from(table).insert(chunk):await target.from(table).upsert(chunk));
  }
  const actual:Row[]=[];
  const order=['memberships','project_members'].includes(table)?'user_id':table==='payment_orders'?'order_id':'id';
  for(let page=0;page<100;page++){
   const result=checked(await target.from(table).select('*').order(order).range(page*1000,page*1000+999));
   actual.push(...result.data!);if(result.data!.length<1000)break;
  }
  const keys=expected[0]?Object.keys(expected[0]):[];
  const projected=actual.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]])));
  if(expected.length!==actual.length||rowDigest(expected)!==rowDigest(projected))throw Error('Recovered records differ from the snapshot in '+table+'.');
  manifest[table]={rows:actual.length,digest:rowDigest(projected)};
 }
 for(const file of files){
  checked(await target.storage.from('project-files').upload(file.path,file.bytes,{contentType:file.mime,upsert:false}));
  const recovered=checked(await target.storage.from('project-files').download(file.path)).data;
  if(createHash('sha256').update(Buffer.from(await recovered!.arrayBuffer())).digest('hex')!==file.hash)throw Error('Recovered file integrity check failed.');
 }
 return {ok:true,snapshotId:latest.id,snapshotCreatedAt:snapshot.createdAt,targetProject:'frrmvmvittfhsmdchrrd',records:Object.values(manifest).reduce((n,t)=>n+t.rows,0),tables:manifest,profiles:ids.size,files:files.length,filesVerified:true,notificationsSuppressed:true,paymentsNotInvoked:true,elapsedMs:Date.now()-started,completedAt:new Date().toISOString()};
}
