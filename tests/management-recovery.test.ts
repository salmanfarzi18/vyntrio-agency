import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
import {z} from 'zod';
import {assert as check,errorResponse,readJson,requireSameOrigin} from '../lib/security';

async function load(file:string,dependencies:Record<string,unknown>,extra:Record<string,unknown>={}){
 const exports:Record<string,any>={};const context=vm.createContext({exports,Response,URL,URLSearchParams,AbortSignal,process:{env:{EMAIL_PROVIDER:'resend'}},...extra,require:(name:string)=>{if(name in dependencies)return dependencies[name];throw Error('Unexpected import '+name);}});
 vm.runInContext(ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return exports;
}
test('Management recovery generates a recovery token and a clearly labelled private password email',async()=>{
 let generated:any,delivery:any;
 const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:'existing-owner'},error:null})})})}),auth:{admin:{generateLink:async(input:unknown)=>{generated=input;return {data:{properties:{hashed_token:'local-test-token-only',verification_type:'recovery'}},error:null};}}}};
 const exports=await load('lib/notifications.ts',{
  'server-only':{},'node:crypto':crypto,'./supabase':{adminDb:()=>db},'./config':{env:()=> 'local-test-setting',siteUrl:()=> 'https://example.invalid'},'./workspace-access':{workspaceAccess:async()=>({allowed:true,reason:'owner'})},'./security':{assert:check}
 },{fetch:async(_:string,input:{body:string})=>{delivery=JSON.parse(input.body);return {ok:true};}});
 await exports.managementRecoveryEmail('Owner@Example.invalid');
 assert.equal(generated.type,'recovery');assert.equal(delivery.to[0],'owner@example.invalid');assert.equal(delivery.subject,'Set your VYNTRIO management password');
 const link=new URL(delivery.text.match(/https:\/\/example\.invalid\/auth\/confirm[^\s]+/)[0]);assert.equal(link.searchParams.get('purpose'),'management-reset');assert.equal(new URLSearchParams(link.hash.slice(1)).get('type'),'recovery');assert(!link.searchParams.has('token_hash'));assert.match(delivery.text,/authenticator/);
});
test('An ordinary client cannot obtain a management password recovery token',async()=>{
 let generated=false;
 const exports=await load('lib/notifications.ts',{'server-only':{},'node:crypto':crypto,'./supabase':{adminDb:()=>{generated=true;}},'./config':{env:()=> 'owner@example.invalid',siteUrl:()=> 'https://example.invalid'},'./workspace-access':{workspaceAccess:async()=>({allowed:true,reason:'paid_inquiry'})},'./security':{assert:check}});
 await assert.rejects(exports.managementRecoveryEmail('client@example.invalid'),/invited team members/);
 // Creating the server client is harmless; no generateLink or delivery API is available.
 assert.equal(generated,true);
});
test('Email confirmation verifies the token before choosing a fixed recovery or client destination',async()=>{
 let accepts=true,verifiedType='';
 const exports=await load('app/api/auth/confirm/route.ts',{'zod':{z},'@/lib/supabase':{userDb:async()=>({auth:{verifyOtp:async(input:{type:string})=>{verifiedType=input.type;return {error:accepts?null:Error('Expired')};}}})},'@/lib/protection':{limit:async()=>{}},'@/lib/security':{assert:check,errorResponse,readJson,requireSameOrigin}});
 const post=async(type:string)=>{const response=await exports.POST(new Request('https://example.invalid/api/auth/confirm',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({token_hash:'a'.repeat(64),type,next:'https://untrusted.invalid'})}));return {response,result:await response.json()};};
 assert.equal((await post('recovery')).result.next,'/management/password');assert.equal(verifiedType,'recovery');
 assert.equal((await post('magiclink')).result.next,'/portal');accepts=false;const rejected=await post('recovery');assert.equal(rejected.response.status,400);assert.equal(rejected.result.next,undefined);
});
