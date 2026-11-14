import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {assert as check,errorResponse,verifyCashfree} from '../lib/security';
import {workspaceAccessNotice} from '../lib/workspace-access';

test('The actual webhook queues workspace access only after verification and restores inquiry binding on duplicate delivery',async()=>{
 let paid=false;const accessJobs=new Set<string>(),receiptJobs=new Set<string>();let accessCalls=0;
 const db={async rpc(_:string,input:{p_amount:number}){if(input.p_amount!==100)return {data:null,error:Error('Amount mismatch')};const duplicate=paid;paid=true;return {data:duplicate?{duplicate:true}:{duplicate:false,inquiry_id:'inquiry-one'},error:null};},from:(table:string)=>{
  const builder={select(){return builder;},eq(){return builder;},async single(){return {data:table==='payment_orders'?{inquiry_id:'inquiry-one',invoice_id:null}:{email:'client@example.invalid'},error:null};}};return builder;
 }};
 const exports:Record<string,any>={},key='private-local-test-key',timestamp='1794655000000';
 const context=vm.createContext({exports,Buffer,Response,console:{error(){},warn(){}},require:(name:string)=>{
  if(name==='next/server')return {after:()=>{}};
  if(name==='@/lib/supabase')return {adminDb:()=>db};
  if(name==='@/lib/config')return {configured:()=>true,env:(name:string)=>name==='CASHFREE_SECRET_KEY'?key:'owner@example.invalid',legacyUrl:()=>''};
  if(name==='@/lib/security')return {assert:check,errorResponse,verifyCashfree};
  if(name==='@/lib/notifications')return {dispatchEmails:async()=>{},queueEmail:async(event:string)=>{receiptJobs.add(event);},queueWorkspaceAccess:async(id:string)=>{assert(paid,'Access must not be queued before payment is recorded');assert.equal(id,'inquiry-one');accessCalls++;accessJobs.add(workspaceAccessNotice({id,email:'client@example.invalid',payment_status:'paid'})!.eventKey);}};
  throw Error('Unexpected import '+name);
 }});
 const source=await readFile('app/api/cashfree-webhook/route.ts','utf8');vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const post=async(amount:number,validSignature=true)=>{
  const raw=JSON.stringify({type:'PAYMENT_SUCCESS_WEBHOOK',data:{order:{order_id:'test-order'},payment:{payment_status:'SUCCESS',cf_payment_id:'test-payment',payment_currency:'INR',payment_amount:amount,payment_time:'2026-11-14T10:00:00Z'}}});
  const signature=createHmac('sha256',validSignature?key:'forged').update(timestamp+raw).digest('base64');
  return exports.POST(new Request('https://example.invalid/api/cashfree-webhook',{method:'POST',headers:{'x-webhook-timestamp':timestamp,'x-webhook-signature':signature},body:raw}));
 };
 assert.equal((await post(1,false)).status,401);assert.equal(accessJobs.size,0);
 assert.equal((await post(2)).status,503);assert.equal(accessJobs.size,0);
 assert.equal((await post(1)).status,200);assert.equal(accessJobs.size,1);
 const duplicate=await post(1);assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).duplicate,true);assert.equal(accessJobs.size,1);assert.equal(accessCalls,2);assert.equal(receiptJobs.size,2);
});
