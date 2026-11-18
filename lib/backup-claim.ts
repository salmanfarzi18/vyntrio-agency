import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';

export function dailyBackupId(agency:string,now=new Date()){
 const hash=createHash('sha256').update('vyntrio-daily-backup:'+agency+':'+now.toISOString().slice(0,10)).digest('hex');
 return `${hash.slice(0,8)}-${hash.slice(8,12)}-8${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

// The existing primary key arbitrates concurrent workers. Conditional retry
// updates ensure only one worker can take over a failed or abandoned run.
export async function claimBackupRun(db:SupabaseClient,id?:string,now=new Date()){
 const inserted=await db.from('backup_runs').insert(id?{id}:{}).select('id').single();
 if(!inserted.error)return {id:inserted.data.id as string,claimed:true};
 if(!id||inserted.error.code!=='23505')throw inserted.error;
 const found=await db.from('backup_runs').select('id,status,created_at,record_count').eq('id',id).single();
 if(found.error||!found.data)throw found.error||Error('Backup state unavailable');
 const run=found.data;
 if(run.status==='completed')return {id,claimed:false,status:'completed',recordCount:Number(run.record_count)||0};
 if(run.status==='running'&&new Date(run.created_at).getTime()>now.getTime()-10*60000)return {id,claimed:false,status:'running'};
 const retried=await db.from('backup_runs').update({status:'running',created_at:now.toISOString(),completed_at:null,error:null}).eq('id',id).eq('status',run.status).eq('created_at',run.created_at).select('id').maybeSingle();
 if(retried.error)throw retried.error;
 return retried.data?{id,claimed:true}:{id,claimed:false,status:'running'};
}
