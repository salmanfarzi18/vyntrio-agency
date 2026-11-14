import {requireIdentity} from '@/lib/auth';
import {limit} from '@/lib/protection';
import {assert,errorResponse,requireSameOrigin} from '@/lib/security';
import {checkPaymentConnection} from '@/lib/payment-connection';

export const runtime='nodejs';
export async function POST(request:Request){
  try{
    requireSameOrigin(request);
    const current=await requireIdentity(true);
    assert(['owner','admin'].includes(current.role),403,'Admin access required.');
    await limit(request,'payment-connection',5,600,current.user.id);
    const result=await checkPaymentConnection({mode:process.env.CASHFREE_ENV,clientId:process.env.CASHFREE_CLIENT_ID,secretKey:process.env.CASHFREE_SECRET_KEY});
    return Response.json({ok:true,...result,mode:process.env.CASHFREE_ENV||'not configured',deployment:process.env.VERCEL_ENV||'local'},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}
