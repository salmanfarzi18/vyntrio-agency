import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {ErrorEvent} from '@sentry/browser';
import {AUDIT_ERROR,privateErrorEvent} from '../lib/monitoring-privacy';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {assert as check,errorResponse,requireSameOrigin,HttpError} from '../lib/security';

test('Error reports remove customer content and credentials even from SDK enrichment',()=>{
 const secret='client@example.test +917339558400 private-token';
 const raw={type:undefined,event_id:'a'.repeat(32),timestamp:1,platform:'javascript',message:secret,user:{email:secret,ip_address:'127.0.0.1'},request:{url:'https://example.test/auth?token='+secret,cookies:{session:secret},data:secret},extra:{record:secret},contexts:{trace:{data:secret}},tags:{client:secret},breadcrumbs:[{message:secret}],exception:{values:[{type:secret,value:secret,stacktrace:{frames:[{filename:'https://example.test/private/app.js?token='+secret,function:secret,vars:{password:secret},context_line:secret,lineno:42,colno:7,in_app:true}]}}]}} as unknown as ErrorEvent;
 const result=privateErrorEvent(raw)!;
 assert(!JSON.stringify(result).includes('private-token'));
 assert(!JSON.stringify(result).includes('example.test'));
 assert(!JSON.stringify(result).includes('7339558400'));
 assert.equal(result.exception?.values?.[0].value,'Unexpected application error');
 assert.deepEqual(result.exception?.values?.[0].stacktrace?.frames?.[0],{filename:'app.js',lineno:42,colno:7,in_app:true});
 assert.deepEqual(Object.keys(result).sort(),['environment','event_id','exception','level','platform','timestamp','type']);
});
test('Only the fixed diagnostic label survives; transactions are discarded',()=>{
 assert.equal(privateErrorEvent({type:undefined,exception:{values:[{type:'Error',value:AUDIT_ERROR}]}})?.exception?.values?.[0].value,AUDIT_ERROR);
 assert.equal(privateErrorEvent({type:undefined,exception:{values:[{value:AUDIT_ERROR+' private detail'}]}})?.exception?.values?.[0].value,'Unexpected application error');
 assert.equal(privateErrorEvent({type:'transaction'} as unknown as ErrorEvent),null);
});

test('Live diagnostic endpoint denies visitors, clients and cross-origin requests; failed sending is not success',async()=>{
 const source=await readFile('app/api/portal/monitoring-test/route.ts','utf8');
 for(const scenario of [{role:'owner',origin:'https://elsewhere.invalid',expected:403},{role:'client',expected:403},{role:'anonymous',expected:401},{role:'owner',sent:false,expected:503},{role:'owner',sent:true,expected:200}]){
  let sends=0,limits=0;
  const exports:Record<string,any>={};
  const context=vm.createContext({exports,Response,process:{env:{NEXT_PUBLIC_SENTRY_DSN:'configured'}},require:(name:string)=>{
   if(name==='@/lib/security')return {assert:check,errorResponse,requireSameOrigin};
   if(name==='@/lib/auth')return {requireIdentity:async(strong:boolean)=>{assert.equal(strong,true);if(scenario.role==='anonymous')throw new HttpError(401,'Sign in');return {role:scenario.role,user:{id:'audit-owner'}};}};
   if(name==='@/lib/protection')return {limit:async()=>{limits++;}};
   if(name==='@/lib/monitoring-server')return {testMonitoring:async()=>{sends++;return scenario.sent;}};
   throw Error('Unexpected import');
  }});
  vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  const response=await exports.POST(new Request('https://example.invalid/api/portal/monitoring-test',{method:'POST',headers:{origin:scenario.origin||'https://example.invalid'}}));
  assert.equal(response.status,scenario.expected);
  assert.equal(sends,scenario.expected===200||scenario.expected===503?1:0);
  assert.equal(limits,sends);
  if(scenario.expected===503)assert.equal((await response.json()).ok,false);
 }
});
