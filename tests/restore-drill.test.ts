import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {timingSafeEqual} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {encryptBackup} from '../lib/backup-crypto';
import {checkRestoreTarget,decodeSnapshot,RESTORE_SOURCE,RESTORE_TARGET,restoreDrill,restoreRow,restoreTables,rowDigest} from '../lib/restore-drill';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {assert as check,errorResponse,requireSameOrigin,HttpError} from '../lib/security';

test('Restore refuses production, arbitrary targets and malformed backup manifests',()=>{
 checkRestoreTarget(RESTORE_SOURCE,RESTORE_TARGET);
 for(const target of [RESTORE_SOURCE,'https://other.supabase.co',RESTORE_TARGET+'.evil.test'])assert.throws(()=>checkRestoreTarget(RESTORE_SOURCE,target));
 const key=randomBytes(32).toString('base64'),tables=Object.fromEntries(restoreTables.map(t=>[t,[] as any[]]));
 tables.agencies=[{id:'11111111-1111-4111-8111-111111111111'}];
 const encode=()=>encryptBackup(gzipSync(Buffer.from(JSON.stringify({format:'vyntrio-snapshot',version:1,tables}))),key);
 const encrypted=encode();assert.equal(decodeSnapshot(encrypted,key).tables.agencies.length,1);
 assert.throws(()=>decodeSnapshot(encrypted,randomBytes(32).toString('base64')));
 const corrupt=Buffer.from(encrypted);corrupt[corrupt.length-1]^=1;assert.throws(()=>decodeSnapshot(corrupt,key));
 delete (tables as Record<string,any>).payments;assert.throws(()=>decodeSnapshot(encode(),key),/incomplete/);
});
test('Restore preserves relationships, blocks unsent emails and verifies content independent of row order',()=>{
 const ids=new Map([['source-user','restored-user']]);
 const original={id:123,actor_id:'source-user',action:'approve',created_at:'2026-11-18T00:00:00+00:00'};
 const restored=restoreRow('audit_log',original,ids);
 assert.equal(restored.actor_id,'restored-user');assert.equal(restored.id,undefined);assert.equal(original.id,123);
 for(const status of ['pending','sending','failed']){const row=restoreRow('notification_outbox',{status,attempts:1},ids);assert.equal(row.status,'failed');assert.equal(row.attempts,8);}
 assert.equal(restoreRow('notification_outbox',{status:'sent',attempts:1},ids).status,'sent');
 assert.equal(rowDigest([restored,{x:1}]),rowDigest([{x:1},{created_at:'2026-11-18T00:00:00.000Z',action:'approve',actor_id:'restored-user'}]));
 assert.notEqual(rowDigest([{body:'original'}]),rowDigest([{body:'changed'}]));
});
test('An occupied target aborts before reading the source backup or performing any writes',async()=>{
 let touched=false;
 const target={auth:{admin:{listUsers:async()=>({data:{users:[{id:'existing'}]},error:null})}}} as any;
 const source={from:()=>{touched=true;throw Error('Must not read');}} as any;
 await assert.rejects(()=>restoreDrill({source,target,sourceUrl:RESTORE_SOURCE,targetUrl:RESTORE_TARGET,recoveryKey:'unused',bucket:'unused'}),/not empty/);
 assert.equal(touched,false);
});

test('Recovery endpoint rejects clients, administrators, signed-out and cross-origin calls before accessing either database',async()=>{
 const source=await readFile('app/api/portal/restore-test/route.ts','utf8');
 for(const scenario of [{role:'client',status:403},{role:'admin',status:403},{role:'anonymous',status:401},{role:'owner',origin:'https://elsewhere.invalid',status:403},{role:'owner',status:503}]){
  let touched=false;const exports:Record<string,any>={};
  const context=vm.createContext({exports,Response,process:{env:{}},require:(name:string)=>{
   if(name==='@/lib/security')return {assert:check,errorResponse,requireSameOrigin};
   if(name==='@/lib/auth')return {requireIdentity:async(strong:boolean)=>{assert.equal(strong,true);if(scenario.role==='anonymous')throw new HttpError(401,'Sign in');return {role:scenario.role};}};
   if(name==='@/lib/config')return {env:()=>{touched=true;throw Error('No configuration access');}};
   if(name==='@/lib/protection')return {limit:async()=>{touched=true;}};
   if(name==='@supabase/supabase-js')return {createClient:()=>{touched=true;}};
   if(name==='@/lib/supabase')return {adminDb:()=>{touched=true;}};
   if(name==='@/lib/restore-drill')return {restoreDrill:()=>{touched=true;}};
   throw Error('Unexpected import');
  }});
  vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  const response=await exports.POST(new Request('https://example.invalid/api/portal/restore-test',{method:'POST',headers:{origin:scenario.origin||'https://example.invalid'}}));
  assert.equal(response.status,scenario.status);assert.equal(touched,false);
 }
});

test('Background recovery authenticates before any data access and saves only aggregate verification results',async()=>{
 const source=await readFile('netlify/functions/restore-verification.mjs','utf8');
 for(const authorized of [false,true]){
  const values:Record<string,string>={CRON_SECRET:'test-only',NEXT_PUBLIC_SUPABASE_URL:RESTORE_SOURCE,SUPABASE_SECRET_KEY:'source-private',RESTORE_TEST_SUPABASE_SECRET_KEY:'test-private',BACKUP_BUCKET:'private-backups',BACKUP_ENCRYPTION_KEY:'private-recovery'};
  let stored:any={status:'queued',startedAt:'2026-11-18T00:00:00Z',ownerId:'owner-id'},clientCount=0,restores=0;
  const exports:Record<string,any>={};
  const db={storage:{from:()=>({download:async()=>({data:new Blob([JSON.stringify(stored)]),error:null}),upload:async(_path:string,bytes:Buffer)=>{stored=JSON.parse(bytes.toString());return {error:null};}})},from:()=>({insert:async()=>({error:null})})};
  const context=vm.createContext({exports,Buffer,Date,Netlify:{env:{get:(key:string)=>values[key]}},require:(name:string)=>{
   if(name==='node:crypto')return {timingSafeEqual};
   if(name==='@supabase/supabase-js')return {createClient:()=>{clientCount++;return db;}};
   if(name==='../../lib/restore-drill.ts')return {RESTORE_TARGET,restoreDrill:async(options:any)=>{assert.equal(options.sourceUrl,RESTORE_SOURCE);assert.equal(options.targetUrl,RESTORE_TARGET);assert.equal(options.recoveryKey,'private-recovery');restores++;return {ok:true,records:23,files:1};}};
   throw Error('Unexpected import');
  }});
  vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  assert.equal(exports.config.background,true);
  const request=new Request('https://example.invalid/.netlify/functions/restore-verification',{method:'POST',headers:{authorization:authorized?'Bearer test-only':'wrong'}});
  if(!authorized){await assert.rejects(()=>exports.default(request),/Unauthorized/);assert.equal(clientCount,0);assert.equal(restores,0);}
  else{await exports.default(request);assert.equal(restores,1);assert.equal(stored.status,'completed');assert.equal(stored.ownerId,undefined);assert(!JSON.stringify(stored).includes('private-'));await exports.default(request);assert.equal(restores,1);}
 }
});
