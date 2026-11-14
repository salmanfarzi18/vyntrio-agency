import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {z} from 'zod';
import {assert as check,errorResponse,readJson,requireSameOrigin,HttpError} from '../lib/security';
import {hasAuthMethod,managementSessionReady} from '../lib/management-policy';

const factor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',challenge='33333333-3333-4333-8333-333333333333';
type Options={role?:string;aal?:string;password?:boolean;loginError?:boolean;mode?:'totp'|'phone';codeError?:boolean;phone?:string};
async function harness(file:string,options:Options={}){
 const {role='owner',aal='aal1',password=true,loginError=false,mode='totp',codeError=false,phone='+917339558400'}=options;
 const calls:string[]=[],exports:Record<string,any>={};let selectedPhone='';
 const db={auth:{
  signInWithPassword:async()=>{calls.push('password');return {error:loginError?Error('Bad login'):null};},
  signOut:async()=>{calls.push('signout');return {error:null};},
  updateUser:async()=>{calls.push('update-password');return {error:null};},
  mfa:{listFactors:async()=>({data:{totp:[{id:factor,status:'verified',factor_type:'totp'}],phone:mode==='phone'?[{id:factor,phone,status:'verified',factor_type:'phone'}]:[],all:[]},error:null}),
   enroll:async(params:{phone:string})=>{selectedPhone=params.phone;calls.push('enroll');return {data:{id:factor},error:null};},
   challenge:async()=>{calls.push('challenge');return {data:{id:challenge},error:null};},
   verify:async()=>{calls.push('verify');return {error:codeError?Error('Invalid code'):null};}
  }
 }};
 const current={role,mfaMethod:mode,assurance:aal,passwordAuthenticated:password,user:{id:'owner-id',email:'owner@example.invalid'},db};
 const context=vm.createContext({exports,Response,process:{env:{}},require:(name:string)=>{
  if(name==='zod')return {z};
  if(name==='@/lib/supabase')return {userDb:async()=>db};
  if(name==='@/lib/config')return {isOwnerEmail:()=>true};
  if(name==='@/lib/management-policy')return {managementMfaMethod:()=>mode};
  if(name==='@/lib/management-auth')return {managementIdentity:async()=>{calls.push('identity');if(role==='client')throw new HttpError(403,'Team only');return current;}};
  if(name==='@/lib/auth')return {audit:async()=>{calls.push('audit');}};
  if(name==='@/lib/protection')return {limit:async()=>{calls.push('limit');},captcha:async()=>{calls.push('captcha');}};
  if(name==='@/lib/security')return {assert:check,errorResponse,readJson,requireSameOrigin};
  throw Error('Unexpected import '+name);
 }});
 vm.runInContext(ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return {calls,phone:()=>selectedPhone,post:async(body:unknown,origin='https://example.invalid')=>{const response=await exports.POST(new Request('https://example.invalid/api/management/test',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,result:await response.json()};}};
}

test('Management requires password plus AAL2 and never treats a client role as team',()=>{
 assert(!managementSessionReady('owner','aal2',[{method:'magiclink'},{method:'totp'}]));
 assert(!managementSessionReady('owner','aal1',[{method:'password'}]));
 assert(!managementSessionReady('client','aal2',[{method:'password'},{method:'totp'}]));
 assert(managementSessionReady('owner','aal2',[{method:'password'},{method:'totp'}]));
 assert(managementSessionReady('staff','aal2',['password','mfa/totp']));
 assert(!managementSessionReady('owner','aal2',['password','mfa/totp'],'phone'));
 assert(managementSessionReady('owner','aal2',['password','mfa/phone'],'phone'));
 assert(!hasAuthMethod({password:true},'password'));
});
test('Actual management login rejects incorrect credentials and signs out non-team accounts',async()=>{
 const body={email:'owner@example.invalid',password:'test-password-only',turnstileToken:'test'};
 const invalid=await harness('app/api/management/login/route.ts',{loginError:true});assert.equal((await invalid.post(body)).status,401);assert(!invalid.calls.includes('identity'));
 const client=await harness('app/api/management/login/route.ts',{role:'client'});assert.equal((await client.post(body)).status,403);assert(client.calls.includes('signout'));
 const owner=await harness('app/api/management/login/route.ts');assert.equal((await owner.post(body)).result.next,'verification');assert.deepEqual(owner.calls.slice(-3),['captcha','password','identity']);
});
test('Actual management MFA refuses substituted factors, bad codes, cross-origin requests and client accounts',async()=>{
 const body={action:'verify',factorId:factor,challengeId:challenge,code:'123456'};
 const owner=await harness('app/api/management/mfa/route.ts');assert.equal((await owner.post({...body,factorId:other})).status,403);assert(!owner.calls.includes('verify'));
 assert.equal((await owner.post(body,'https://untrusted.invalid')).status,403);
 const client=await harness('app/api/management/mfa/route.ts',{role:'client'});assert.equal((await client.post(body)).status,403);assert(!client.calls.includes('verify'));
 const bad=await harness('app/api/management/mfa/route.ts',{codeError:true});assert.equal((await bad.post(body)).status,400);assert(!bad.calls.includes('audit'));
 assert.equal((await owner.post(body)).status,200);assert(owner.calls.includes('audit'));
});
test('Owner SMS cannot be redirected to another phone or enrolled with a password alone',async()=>{
 const wrongPhone=await harness('app/api/management/mfa/route.ts',{mode:'phone',phone:'+919000000000'});
 assert.equal((await wrongPhone.post({action:'challenge',phone:'+919000000001'})).status,403);assert(!wrongPhone.calls.includes('enroll'));assert(!wrongPhone.calls.includes('challenge'));
 const correct=await harness('app/api/management/mfa/route.ts',{mode:'phone'});const result=await correct.post({action:'challenge',phone:'+919000000001'});assert.equal(result.status,200);assert.equal(result.result.destination,'••••••8400');assert.equal(correct.phone(),'');
});
test('Management password recovery requires an already verified second factor and signs sessions out',async()=>{
 const unverified=await harness('app/api/management/password/route.ts');assert.equal((await unverified.post({password:'long-test-password-only'})).status,403);assert(!unverified.calls.includes('update-password'));
 const verified=await harness('app/api/management/password/route.ts',{aal:'aal2',password:false});assert.equal((await verified.post({password:'short'})).status,400);assert(!verified.calls.includes('update-password'));
 assert.equal((await verified.post({password:'long-test-password-only'})).status,200);assert.deepEqual(verified.calls.slice(-3),['update-password','audit','signout']);
});
