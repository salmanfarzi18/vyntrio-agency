import {z} from 'zod';
import {userDb} from '@/lib/supabase';
import {captcha,limit} from '@/lib/protection';
import {assert,errorResponse,readJson,requireSameOrigin} from '@/lib/security';
import {managementIdentity} from '@/lib/management-auth';
export async function POST(request:Request){try{
 requireSameOrigin(request);
 const input=z.object({email:z.email().max(254).transform(v=>v.trim().toLowerCase()),password:z.string().min(1).max(128),turnstileToken:z.string().optional()}).parse(await readJson(request));
 await limit(request,'management-login-ip',10,900);await limit(request,'management-login-email',5,900,input.email);await captcha(input.turnstileToken);
 const db=await userDb();const {error}=await db.auth.signInWithPassword({email:input.email,password:input.password});
 assert(!error,401,'Those sign-in details were not accepted. Please check your email and password.');
 let method:'phone'|'totp'='totp';try{method=(await managementIdentity()).mfaMethod;}catch{await db.auth.signOut({scope:'local'});assert(false,403,'Those details do not have management access. Please use client sign-in for your project.');}
 return Response.json({ok:true,next:'verification',method});
}catch(error){return errorResponse(error);}}
