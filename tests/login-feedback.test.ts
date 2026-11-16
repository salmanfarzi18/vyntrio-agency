import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {z} from 'zod';
import {assert as check,errorResponse,readJson,requireSameOrigin} from '../lib/security';

async function loginHarness({allowed=true,emailFails=false,captchaFails=false,reason='paid_inquiry'}={}){
 const calls:string[]=[],exports:Record<string,any>={};
 const context=vm.createContext({exports,Response,require:(name:string)=>{
  if(name==='zod')return {z};
  if(name==='@/lib/config')return {configured:()=>true,env:()=> 'owner@example.invalid'};
  if(name==='@/lib/supabase')return {adminDb:()=>({})};
  if(name==='@/lib/security')return {assert:check,errorResponse,readJson,requireSameOrigin};
  if(name==='@/lib/protection')return {limit:async(_:unknown,scope:string)=>{calls.push(scope);},captcha:async()=>{calls.push('captcha');if(captchaFails)throw Error('Rejected challenge');}};
  if(name==='@/lib/workspace-access')return {workspaceAccess:async()=>{calls.push('access');return {allowed,reason};}};
  if(name==='@/lib/notifications')return {loginEmail:async(email:string)=>{calls.push('email:'+email);if(emailFails)throw Error('Provider unavailable');}};
  throw Error('Unexpected import '+name);
 }});
 const source=await readFile('app/api/auth/login/route.ts','utf8');
 vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const response=await exports.POST(new Request('https://example.invalid/api/auth/login',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({email:'Client@example.invalid',turnstileToken:'test-token'})}));
 return {response,calls,result:await response.json()};
}
test('Eligible login confirms the inbox only after delivery accepts the email',async()=>{
 const {response,calls,result}=await loginHarness();
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(result.next,'check_inbox');
 assert.deepEqual(calls,['client-login-ip','captcha','client-login-cooldown','client-login-email','access','email:client@example.invalid']);
});
test('Incomplete inquiry receives the inquiry next step and never a sign-in email',async()=>{
 const {response,calls,result}=await loginHarness({allowed:false});
 assert.equal(response.status,200);assert.equal(result.next,'complete_inquiry');assert(!calls.some(c=>c.startsWith('email:')));assert(!result.message.includes('We’ve sent'));
});
test('Email failure does not claim delivery and CAPTCHA failure does not inspect eligibility',async()=>{
 const failedEmail=await loginHarness({emailFails:true});assert.equal(failedEmail.response.status,503);assert.equal(failedEmail.result.next,undefined);
 const failedCaptcha=await loginHarness({captchaFails:true});assert.equal(failedCaptcha.response.status,503);assert(!failedCaptcha.calls.includes('access'));assert(!failedCaptcha.calls.includes('client-login-email'));assert(!failedCaptcha.calls.some(c=>c.startsWith('email:')));
});

test('Management accounts are directed to password sign-in without sending a client magic link',async()=>{
 const {result,calls}=await loginHarness({reason:'owner'});assert.equal(result.next,'management_login');assert(!calls.some(c=>c.startsWith('email:')));
});
