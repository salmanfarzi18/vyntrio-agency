import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {dailyBackupId} from '../lib/backup-claim';
import {assert as check,errorResponse,safeEqual} from '../lib/security';

async function worker(name:string,enabled=true,base='https://example.invalid',ok=true){
 const requests:Array<{url:string,authorization:string}>=[],exports:Record<string,any>={};
 const values:Record<string,string>={ENABLE_SCHEDULED_MAINTENANCE:String(enabled),NEXT_PUBLIC_SITE_URL:base,CRON_SECRET:'private-test-cron'};
 const context=vm.createContext({exports,URL,Response,AbortSignal,Netlify:{env:{get:(key:string)=>values[key]}},fetch:async(url:URL,options:{headers:{Authorization:string}})=>{requests.push({url:String(url),authorization:options.headers.Authorization});return new Response(null,{status:ok?200:503});}});
 const source=await readFile('netlify/functions/'+name+'.mjs','utf8');
 vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return {run:()=>exports.default(),requests};
}

test('Disabled schedules perform no network work; enabled workers authenticate their exact task',async()=>{
 for(const name of ['daily-maintenance','email-retries']){
  const disabled=await worker(name,false);assert.equal((await disabled.run()).status,204);assert.equal(disabled.requests.length,0);
  const enabled=await worker(name);assert.equal((await enabled.run()).status,204);
  assert.deepEqual(enabled.requests,[{url:'https://example.invalid/api/cron/maintenance'+(name==='email-retries'?'?task=email':''),authorization:'Bearer private-test-cron'}]);
 }
});
test('Scheduled workers reject HTTP configuration and report backend failure',async()=>{
 for(const name of ['daily-maintenance','email-retries']){
  const insecure=await worker(name,true,'http://example.invalid');await assert.rejects(insecure.run,/HTTPS/);assert.equal(insecure.requests.length,0);
  const failed=await worker(name,true,'https://example.invalid',false);await assert.rejects(failed.run,/failed/);
 }
});

async function maintenance(task:string,authorized=true,filesPending=0){
 const calls:string[]=[],exports:Record<string,any>={};
 const context=vm.createContext({exports,Response,URL,Date,require:(name:string)=>{
  if(name==='@/lib/config')return {env:()=> 'private-test-cron',AGENCY_ID:'test-agency'};
  if(name==='@/lib/security')return {assert:check,errorResponse,safeEqual};
  if(name==='@/lib/supabase')return {adminDb:()=>{calls.push('db');return {from:()=>({delete:()=>({lt:async()=>{calls.push('cleanup');}})})};}};
  if(name==='@/lib/notifications')return {dispatchEmails:async(count:number)=>{calls.push('email:'+count);return {sent:0};}};
  if(name==='@/lib/backup-claim')return {dailyBackupId};
  if(name==='@/lib/backups')return {createBackup:async(id:string)=>{assert.equal(id,dailyBackupId('test-agency'));calls.push('backup');return {id:'test',filesPending};}};
  throw Error('Unexpected import '+name);
 }});
 const source=await readFile('app/api/cron/maintenance/route.ts','utf8');
 vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const response=await exports.GET(new Request('https://example.invalid/api/cron/maintenance'+task,{headers:authorized?{Authorization:'Bearer private-test-cron'}:{}}));
 return {response,calls};
}
test('Email retries cannot trigger a database backup, and failed file copies fail the daily job',async()=>{
 const email=await maintenance('?task=email');assert.equal(email.response.status,200);assert.deepEqual(email.calls,['email:5']);
 const daily=await maintenance('');assert.equal(daily.response.status,200);assert(daily.calls.includes('backup'));assert(daily.calls.includes('cleanup'));
 const partial=await maintenance('',true,1);assert.equal(partial.response.status,503);
});
test('Unknown tasks and unauthorized scheduler requests perform no work',async()=>{
 for(const [task,authorized,status] of [['?task=email',false,401],['?task=unknown',true,400]] as const){const result=await maintenance(task,authorized);assert.equal(result.response.status,status);assert.deepEqual(result.calls,[]);}
});
