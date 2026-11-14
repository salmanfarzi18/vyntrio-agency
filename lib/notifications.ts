import 'server-only';
import {createHmac,randomUUID} from 'node:crypto';
import {adminDb} from './supabase';
import {env,siteUrl} from './config';
import {workspaceAccess,workspaceAccessNotice} from './workspace-access';
import {assert} from './security';
export async function bridge(action:'email'|'backup'|'exportLegacy'|'sheetMirror'|'health',payload:Record<string,unknown>){const rawBody=JSON.stringify({id:randomUUID(),action,...payload}),timestamp=String(Date.now());const signature=createHmac('sha256',env('EMAIL_BRIDGE_SECRET')).update(timestamp+rawBody).digest('base64');const response=await fetch(env('EMAIL_BRIDGE_URL'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'saasBridge',rawBody,timestamp,signature}),redirect:'follow',signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok||result.ok!==true)throw new Error('Google delivery bridge unavailable');return result;}
export async function sendEmail(to:string,subject:string,body:string,id= randomUUID()){
 if(process.env.EMAIL_PROVIDER==='resend'){const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env('RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:env('EMAIL_FROM'),to:[to],subject,text:body}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Email delivery unavailable');return;}
 await bridge('email',{id,to,subject,body});
}
export async function queueEmail(eventKey:string,to:string,subject:string,body:string){const {error}=await adminDb().from('notification_outbox').upsert({event_key:eventKey,recipient:to,subject,body},{onConflict:'event_key',ignoreDuplicates:true});if(error)throw error;}
export async function queueWorkspaceAccess(inquiryId:string){
 const {data,error}=await adminDb().from('inquiries').select('id,email,payment_status').eq('id',inquiryId).single();if(error)throw error;
 const notice=workspaceAccessNotice(data);if(notice)await queueEmail(notice.eventKey,notice.to,notice.subject,notice.body);
}
export async function dispatchEmails(count=2){const service=adminDb();const {data,error}=await service.rpc('claim_notifications',{p_limit:count});if(error)throw error;let sent=0;for(const item of data||[]){try{
 if(item.event_key.startsWith('workspace-access:')){
  const inquiryId=item.event_key.slice('workspace-access:'.length);
  const {data:inquiry,error:lookupError}=await service.from('inquiries').select('email,payment_status').eq('id',inquiryId).single();if(lookupError)throw lookupError;
  assert(inquiry?.payment_status==='paid'&&inquiry.email===item.recipient,403,'Workspace access requires a verified payment.');
  // A retry generates a fresh link and a fresh delivery ID together. Never
  // persist a usable sign-in token in the notification outbox or logs.
  await loginEmail(item.recipient,true);
 }else await sendEmail(item.recipient,item.subject,item.body,item.id);
 const {error:saved}=await service.from('notification_outbox').update({status:'sent',sent_at:new Date().toISOString(),last_error:null}).eq('id',item.id);if(saved)throw saved;sent++;
 }catch{await service.from('notification_outbox').update({status:'failed',last_error:'Delivery failed; retry scheduled.',next_attempt_at:new Date(Date.now()+Math.min(86400000,60000*2**item.attempts)).toISOString()}).eq('id',item.id);}}return {sent,processed:data?.length||0};}
export async function ensureAccount(email:string){const service=adminDb();const {data:profile,error}=await service.from('profiles').select('id').eq('email',email.toLowerCase()).maybeSingle();if(error)throw error;if(profile)return profile;const created=await service.auth.admin.createUser({email,email_confirm:false});if(created.error)throw created.error;assert(created.data.user,503,'Unable to prepare workspace access.');return created.data.user;}
export async function loginEmail(email:string,welcome=false){
 email=email.trim().toLowerCase();const service=adminDb(),access=await workspaceAccess(service,email,env('ADMIN_EMAIL'));
 assert(access.allowed,403,'Let’s start with your idea. Please complete your project inquiry and ₹1 confirmation before requesting workspace access.');
 await ensureAccount(email);
 const {data,error}=await service.auth.admin.generateLink({type:'magiclink',email,options:{redirectTo:siteUrl()+'/auth/confirm'}});if(error||!data.properties?.hashed_token)throw new Error('Unable to generate sign-in link');
 const url=new URL('/auth/confirm',siteUrl());url.hash=new URLSearchParams({token_hash:data.properties.hashed_token,type:data.properties.verification_type}).toString();
 const intro=welcome?'Your project details and ₹1 payment are confirmed. Welcome to your VYNTRIO workspace!\n\nOur team will review your idea and be in touch. You can use this private link to access your workspace:':'Sign in to your VYNTRIO workspace:';
 await sendEmail(email,welcome?'Welcome to your VYNTRIO workspace':'Your secure VYNTRIO sign-in link',`${intro}\n\n${url}\n\nThis link is personal and expires. Do not forward it. If it expires, request a fresh link at ${siteUrl()}/login.\n\nVYNTRIO Agency\nvyntrioagency@gmail.com`);
 return data.user;
}
export const projectNotice=(title:string,message:string)=>`${title}\n\n${message}\n\nView your project securely: ${siteUrl()}/portal\n\nVYNTRIO Agency`;
