import {z} from 'zod';
import {configured,env} from '@/lib/config';
import {adminDb} from '@/lib/supabase';
import {captcha,limit} from '@/lib/protection';
import {assert,errorResponse,readJson,requireSameOrigin} from '@/lib/security';
import {workspaceAccess} from '@/lib/workspace-access';
import {loginEmail} from '@/lib/notifications';
export async function POST(request:Request){try{
 requireSameOrigin(request);
 assert(configured(),503,'The client portal is being prepared. Please contact VYNTRIO for access.');
 const input=z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),turnstileToken:z.string().optional()}).parse(await readJson(request));
 await limit(request,'login-ip',10,3600);
 await limit(request,'login-email',4,3600,input.email);
 await captcha(input.turnstileToken);
 const access=await workspaceAccess(adminDb(),input.email,env('ADMIN_EMAIL'));
 if(!access.allowed)return Response.json({ok:true,next:'complete_inquiry',message:'Let’s get your workspace ready. Please complete your project inquiry and ₹1 confirmation using this email. Once your payment is verified, we’ll email your private sign-in link. Already completed both? Please check your inquiry email or contact our team for a little help.'},{headers:{'Cache-Control':'no-store'}});
 await loginEmail(input.email);
 return Response.json({ok:true,next:'check_inbox',message:'You’re all set! We’ve sent your private sign-in link to this email. It should arrive shortly—please check your inbox and spam folder.'},{headers:{'Cache-Control':'no-store'}});
}catch(error){return errorResponse(error);}}
