import {requireIdentity} from '@/lib/auth';
import {limit} from '@/lib/protection';
import {assert,errorResponse,requireSameOrigin} from '@/lib/security';
import {testMonitoring} from '@/lib/monitoring-server';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  requireSameOrigin(request);
  const current=await requireIdentity(true);
  assert(current.role==='owner',403,'Owner access required.');
  await limit(request,'monitoring-test',2,600,current.user.id);
  assert(process.env.NEXT_PUBLIC_SENTRY_DSN,503,'Error monitoring is not configured.');
  const queued=await testMonitoring();
  return Response.json({ok:queued,message:queued?'Test error sent. Check Sentry and your alert inbox to confirm receipt.':'The test could not be sent. Please retry later.'},{status:queued?200:503,headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error);}
}
