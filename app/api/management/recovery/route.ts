import {z} from 'zod';
import {adminDb} from '@/lib/supabase';
import {env} from '@/lib/config';
import {captcha,limit} from '@/lib/protection';
import {workspaceAccess} from '@/lib/workspace-access';
import {loginEmail} from '@/lib/notifications';
import {errorResponse,readJson,requireSameOrigin} from '@/lib/security';
export async function POST(request:Request){try{
 requireSameOrigin(request);const input=z.object({email:z.email().max(254).transform(v=>v.trim().toLowerCase()),turnstileToken:z.string().optional()}).parse(await readJson(request));
 await limit(request,'management-recovery-ip',6,3600);await limit(request,'management-recovery-email',3,3600,input.email);await captcha(input.turnstileToken);
 const access=await workspaceAccess(adminDb(),input.email,env('ADMIN_EMAIL'));
 if(access.allowed&&['owner','team'].includes(access.reason))await loginEmail(input.email);
 return Response.json({ok:true,message:'If this is an invited management email, a private account setup link is on its way. Open it and complete your authenticator check before setting a new password.'});
}catch(error){return errorResponse(error);}}
