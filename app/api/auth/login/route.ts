import {z} from 'zod';
import {configured,isOwnerEmail} from '@/lib/config';
import {adminDb} from '@/lib/supabase';
import {captcha,limit} from '@/lib/protection';
import {assert,errorResponse,readJson,requireSameOrigin} from '@/lib/security';
import {loginEmail} from '@/lib/notifications';
export async function POST(request:Request){try{requireSameOrigin(request);assert(configured(),503,'The client portal is being prepared. Please contact VYNTRIO for access.');const input=z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),turnstileToken:z.string().optional()}).parse(await readJson(request));await limit(request,'login-ip',10,3600);await limit(request,'login-email',4,3600,input.email);await captcha(input.turnstileToken);const {data:profile}=await adminDb().from('profiles').select('id').eq('email',input.email).maybeSingle();if(profile||isOwnerEmail(input.email))await loginEmail(input.email);return Response.json({ok:true,message:'If this email has workspace access, a sign-in link has been sent. Check your inbox and spam folder.'});}catch(error){return errorResponse(error);}}
