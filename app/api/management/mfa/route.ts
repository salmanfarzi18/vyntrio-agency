import {z} from 'zod';
import {managementIdentity} from '@/lib/management-auth';
import {isOwnerEmail} from '@/lib/config';
import {limit} from '@/lib/protection';
import {assert,errorResponse,readJson,requireSameOrigin} from '@/lib/security';
import {audit} from '@/lib/auth';
export async function POST(request:Request){try{
 requireSameOrigin(request);const current=await managementIdentity();
 const input=z.discriminatedUnion('action',[
  z.object({action:z.literal('challenge')}),
  z.object({action:z.literal('verify'),factorId:z.uuid(),challengeId:z.uuid(),code:z.string().regex(/^\d{6}$/,'Enter the six-digit code.')})
 ]).parse(await readJson(request));
 const method=current.mfaMethod,owner=isOwnerEmail(current.user.email!);
 const ownerPhone=process.env.OWNER_MFA_PHONE||'+917339558400';
 const {data:factors,error:listError}=await current.db.auth.mfa.listFactors();assert(!listError&&factors,503,'Could not prepare verification. Please retry.');
 // No destination is accepted from the browser. Owner SMS is pinned to the
 // configured business number; other team members use pre-enrolled factors.
 const phones=factors.phone as Array<{id:string;phone?:string;status:string}>;
 let factorId=method==='phone'?phones.find(f=>!owner||f.phone===ownerPhone)?.id:factors.totp[0]?.id;
 if(input.action==='verify'){
  if(method==='phone'&&owner&&!factorId)factorId=factors.all.find(f=>f.factor_type==='phone'&&f.status==='unverified'&&'phone' in f&&f.phone===ownerPhone)?.id;
  assert(factorId&&input.factorId===factorId,403,'Please restart verification from management sign-in.');
  await limit(request,'management-mfa-verify-ip',20,900);await limit(request,'management-mfa-verify',8,900,current.user.id);
  const {error}=await current.db.auth.mfa.verify({factorId,challengeId:input.challengeId,code:input.code});
  assert(!error,400,'That code was not accepted. Please check the latest code and retry.');
  await audit(current.user.id,'management_mfa_verified','profiles',current.user.id);
  return Response.json({ok:true});
 }
 await limit(request,'management-mfa-send-ip',10,3600);await limit(request,'management-mfa-send',4,3600,current.user.id);await limit(request,'management-mfa-cooldown',1,60,current.user.id);
 if(method==='phone'&&!factorId&&owner){
  assert(current.passwordAuthenticated&&current.assurance==='aal2',403,'Complete your existing authenticator check in security setup before enrolling the owner phone.');
  const pending=factors.all.find(f=>f.factor_type==='phone'&&f.status==='unverified'&&'phone' in f&&f.phone===ownerPhone);
  if(pending)factorId=pending.id;
  else{const {data:enrolled,error}=await current.db.auth.mfa.enroll({factorType:'phone',phone:ownerPhone,friendlyName:'VYNTRIO owner phone'});assert(!error&&enrolled,503,'SMS verification is not activated yet. Complete the SMS provider setup first.');factorId=enrolled.id;}
 }
 assert(factorId,409,method==='phone'?'SMS verification needs setup by your owner. Contact the agency administrator.':'Please set up your authenticator using the security setup link below.');
 const challenge=method==='phone'?await current.db.auth.mfa.challenge({factorId,channel:'sms'}):await current.db.auth.mfa.challenge({factorId});
 assert(!challenge.error&&challenge.data,503,method==='phone'?'We could not send the SMS. Check your SMS service configuration before retrying.':'Could not start verification. Please retry.');
 return Response.json({ok:true,factorId,challengeId:challenge.data.id,method,destination:method==='phone'?(owner?'••••••8400':'your registered phone'):'your authenticator app'});
}catch(error){return errorResponse(error);}}
