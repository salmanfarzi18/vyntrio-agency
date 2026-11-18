import {requireIdentity} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {env,siteUrl} from '@/lib/config';
import {limit} from '@/lib/protection';
import {assert,errorResponse,requireSameOrigin} from '@/lib/security';
export const runtime='nodejs';
const path='restore-tests/latest.json';
async function report(){
 const result=await adminDb().storage.from(env('BACKUP_BUCKET')).download(path);
 if(result.error){if(String(result.error.statusCode)==='404'||result.error.message==='Object not found')return {status:'not_started'};throw Error('Recovery status unavailable');}
 const {ownerId,...safe}=JSON.parse(await result.data.text());return safe;
}
export async function GET(){
 try{const current=await requireIdentity(true);assert(current.role==='owner',403,'Owner access required.');return Response.json(await report(),{headers:{'Cache-Control':'no-store'}});}catch(error){return errorResponse(error);}
}
export async function POST(request:Request){
 try{
  requireSameOrigin(request);
  const current=await requireIdentity(true);
  assert(current.role==='owner',403,'Owner access required.');
  assert(process.env.RESTORE_TEST_SUPABASE_SECRET_KEY,503,'Add the separate restore-test project key in private hosting settings first.');
  await limit(request,'restore-test',1,120,'frrmvmvittfhsmdchrrd');
  const previous=await report();
  if(['completed','queued','running'].includes(previous.status))return Response.json(previous,{status:previous.status==='completed'?200:202});
  const prepared={status:'queued',startedAt:new Date().toISOString(),ownerId:current.user.id};
  const saved=await adminDb().storage.from(env('BACKUP_BUCKET')).upload(path,Buffer.from(JSON.stringify(prepared)),{contentType:'application/json',upsert:true});
  assert(!saved.error,503,'Could not prepare the recovery test.');
  const response=await fetch(new URL('/.netlify/functions/restore-verification',siteUrl()),{method:'POST',headers:{Authorization:'Bearer '+env('CRON_SECRET')},signal:AbortSignal.timeout(10000)});
  assert(response.status===202,503,'Could not start the background recovery job.');
  return Response.json({status:'queued',startedAt:prepared.startedAt},{status:202,headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error);}
}
