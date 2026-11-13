import {requireIdentity} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {env} from '@/lib/config';
import {assert,errorResponse} from '@/lib/security';
export async function GET(request:Request){try{const current=await requireIdentity(true);assert(['owner','admin'].includes(current.role),403,'Only an agency admin can download backups.');const id=new URL(request.url).searchParams.get('id');const db=adminDb(),{data}=await db.from('backup_runs').select('object_path').eq('id',id||'').single();assert(data?.object_path,404,'Backup not found.');const {data:url,error}=await db.storage.from(env('BACKUP_BUCKET')).createSignedUrl(data.object_path,60,{download:true});if(error)throw error;return Response.redirect(url.signedUrl);}catch(error){return errorResponse(error);}}
