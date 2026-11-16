import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constants,generateKeyPairSync,privateDecrypt,randomBytes} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {z} from 'zod';
import {wrapBackupKey} from '../lib/backup-key-recovery';
import {encryptBackup,decryptBackup} from '../lib/backup-crypto';
import {assert as check,HttpError,errorResponse,readJson} from '../lib/security';

const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=pair.publicKey.export({format:'jwk'}) as {kty:string;n:string;e:string};
const recoveryKey=randomBytes(32).toString('base64');
const encryptedBackup=encryptBackup(gzipSync(Buffer.from(JSON.stringify({format:'vyntrio-snapshot',version:1,tables:{}}))),recoveryKey);

async function recoveryRequest({role='owner',signedIn=true,mfa=true,enabled=true,corrupt=false,auditFails=false,origin=true}={}){
 let audited=false,exported=false;
 const db={from:(table:string)=>{
  if(table==='audit_log')return {insert:async()=>{audited=true;return {error:auditFails?Error('Audit unavailable'):null};}};
  const builder:any={};for(const method of ['select','eq','not','order','limit'])builder[method]=()=>builder;
  builder.single=async()=>({data:{id:'audit-backup',object_path:'database/test.vyn',completed_at:'2026-11-16'},error:null});return builder;
 },storage:{from:()=>({download:async()=>({data:new Blob([corrupt?new Uint8Array([0]):new Uint8Array(encryptedBackup)]),error:null})})}};
 const exports:Record<string,any>={};
 const context=vm.createContext({exports,Response,Buffer,require:(name:string)=>{
  if(name==='node:zlib')return {gunzipSync};
  if(name==='zod')return {z};
  if(name==='@/lib/auth')return {requireIdentity:async(staff:boolean)=>{assert(staff);if(!signedIn)throw new HttpError(401,'Sign in');if(!mfa)throw new HttpError(403,'Verify');return {role,user:{id:'owner-id',email:'owner@example.invalid'}};}};
  if(name==='@/lib/supabase')return {adminDb:()=>db};
  if(name==='@/lib/config')return {env:(name:string)=>name==='BACKUP_ENCRYPTION_KEY'?recoveryKey:'bucket',isOwnerEmail:()=>true};
  if(name==='@/lib/security')return {assert:check,errorResponse,readJson,requireSameOrigin:()=>check(origin,403,'Origin rejected')};
  if(name==='@/lib/protection')return {limit:async()=>{}};
  if(name==='@/lib/backup-crypto')return {decryptBackup};
  if(name==='@/lib/backup-key-recovery')return {backupKeyRecoveryEnabled:()=>enabled,wrapBackupKey:(key:string,publicKey:typeof jwk)=>{exported=true;return wrapBackupKey(key,publicKey);}};
  throw Error('Unexpected import '+name);
 }});
 const source=await readFile('app/api/management/backup-key-recovery/route.ts','utf8');
 vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const response=await exports.POST(new Request('https://example.invalid/api/management/backup-key-recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({publicKey:jwk})}));
 return {response,body:await response.json(),audited,exported};
}

test('Recovery verifies a saved backup and returns only an owner-browser encrypted key',async()=>{
 const {response,body,audited}=await recoveryRequest();assert.equal(response.status,200);assert(audited);
 assert.match(response.headers.get('cache-control')||'',/no-store/);assert(!JSON.stringify(body).includes(recoveryKey));
 const restored=privateDecrypt({key:pair.privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(body.encryptedKey,'base64')).toString();assert.equal(restored,recoveryKey);
});
test('Recovery denies anonymous, non-owner, missing MFA, cross-origin and disabled requests',async()=>{
 for(const [options,status] of [[{signedIn:false},401],[{role:'admin'},403],[{mfa:false},403],[{origin:false},403],[{enabled:false},404]] as const){
  const result=await recoveryRequest(options);assert.equal(result.response.status,status);assert(!result.exported);assert(!result.audited);
 }
});
test('An unreadable backup or failed audit never returns the recovery key',async()=>{
 for(const options of [{corrupt:true},{auditFails:true}]){const result=await recoveryRequest(options);assert.equal(result.response.status,503);assert.equal(result.body.encryptedKey,undefined);}
});
