import {createClient} from '@supabase/supabase-js';
import {requireIdentity,audit} from '@/lib/auth';
import {adminDb} from '@/lib/supabase';
import {env} from '@/lib/config';
import {limit} from '@/lib/protection';
import {assert,errorResponse,requireSameOrigin} from '@/lib/security';
import {RESTORE_TARGET,restoreDrill} from '@/lib/restore-drill';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 try{
  requireSameOrigin(request);
  const current=await requireIdentity(true);
  assert(current.role==='owner',403,'Owner access required.');
  assert(process.env.RESTORE_TEST_SUPABASE_SECRET_KEY,503,'Add the separate restore-test project key in private hosting settings first.');
  await limit(request,'restore-test',1,120,'frrmvmvittfhsmdchrrd');
  const target=createClient(RESTORE_TARGET,env('RESTORE_TEST_SUPABASE_SECRET_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await restoreDrill({source:adminDb(),target,sourceUrl:env('NEXT_PUBLIC_SUPABASE_URL'),targetUrl:RESTORE_TARGET,recoveryKey:env('BACKUP_ENCRYPTION_KEY'),bucket:env('BACKUP_BUCKET')});
  await audit(current.user.id,'restoreDrillVerified','backup',result.snapshotId);
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error);}
}
