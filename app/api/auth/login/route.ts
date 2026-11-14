import {z} from 'zod';
import {configured,env} from '@/lib/config';
import {adminDb} from '@/lib/supabase';
import {captcha,limit} from '@/lib/protection';
import {assert,errorResponse,readJson,requireSameOrigin} from '@/lib/security';
import {workspaceAccess} from '@/lib/workspace-access';
import {loginEmail} from '@/lib/notifications';
export async function POST(request:Request){try{requireSameOrigin(request);assert(configured(),503,'The client portal is being prepared. Please contact VYNTRIO for access.');const input=z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),turnstileToken:z.string().optional()}).parse(await readJson(request));await limit(request,'login-ip',10,3600);await limit(request,'login-email',4,3600,input.email);await captcha(input.turnstileToken);const access=await workspaceAccess(adminDb(),input.email,env('ADMIN_EMAIL'));if(access.allowed)await loginEmail(input.email);return Response.json({ok:true,message:'If your inquiry and payment are complete, or you already have workspace access, we will email your private sign-in link. Please check your inbox and spam. New here? Start with a project inquiry below.'});}catch(error){return errorResponse(error);}}
