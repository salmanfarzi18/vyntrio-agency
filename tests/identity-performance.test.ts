import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {hasAuthMethod,managementSessionReady} from '../lib/management-policy';
import {assert as check,HttpError} from '../lib/security';

async function identityHarness({owner=true,member=true,entitled=true,claimsFail=false}={}){
 const writes:string[]=[],reads:string[]=[],filters:Array<[string,string,unknown]>=[];let active=0,maxActive=0;
 const read=async(table:string)=>{reads.push(table);active++;maxActive=Math.max(active,maxActive);await new Promise(resolve=>setImmediate(resolve));active--;return {data:table==='profiles'?{id:'user-one',email:'owner@example.invalid'}:table==='memberships'?(member?{role:'owner'}:null):{management_mfa_method:'totp'},error:null};};
 const from=(table:string)=>{let operation='read';const query={select(){return query;},eq(key:string,value:unknown){filters.push([table,key,value]);return query;},is(key:string,value:unknown){filters.push([table,key,value]);return query;},update(){operation='write';writes.push(table);return query;},upsert(){operation='write';writes.push(table);return query;},single:()=>read(table),maybeSingle:()=>read(table),then(resolve:any,reject:any){return (operation==='read'?read(table):Promise.resolve({error:null})).then(resolve,reject);}};return query;};
 const db={from,auth:{getUser:async()=>({data:{user:{id:'user-one',email:'owner@example.invalid',email_confirmed_at:'verified',user_metadata:{role:'owner'}}},error:null}),getClaims:async()=>{active++;maxActive=Math.max(active,maxActive);await new Promise(resolve=>setImmediate(resolve));active--;return {data:claimsFail?null:{claims:{aal:'aal2',amr:[{method:'password'},{method:'totp'}]}},error:claimsFail?Error('Invalid claims'):null};}}};
 const exports:Record<string,any>={};const context=vm.createContext({exports,process:{env:{}},console,require:(name:string)=>{
  if(name==='server-only')return {};
  if(name==='next/navigation')return {redirect:()=>{throw Error('Redirect');}};
  if(name==='./config')return {AGENCY_ID:'agency-one',configured:()=>true,isOwnerEmail:()=>owner,env:()=> 'owner@example.invalid'};
  if(name==='./supabase')return {adminDb:()=>({from}),userDb:async()=>db};
  if(name==='./workspace-access')return {workspaceAccess:async()=>({allowed:entitled})};
  if(name==='./security')return {HttpError,assert:check};
  if(name==='./management-policy')return {hasAuthMethod,managementSessionReady};
  throw Error('Unexpected import '+name);
 }});
 vm.runInContext(ts.transpileModule(await readFile('lib/auth.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return {exports,writes,reads,filters,maxActive:()=>maxActive};
}
test('Existing management navigation overlaps account reads and does not rewrite profile or membership',async()=>{
 const h=await identityHarness();const identity=await h.exports.identity();assert.equal(identity.role,'owner');assert.equal(identity.passwordAuthenticated,true);assert(h.maxActive()>=4);assert(!h.writes.includes('profiles'));assert(!h.writes.includes('memberships'));assert(h.filters.some(([table,key,value])=>table==='inquiries'&&key==='email'&&value==='owner@example.invalid'));
});
test('Navigation optimization still denies invalid claims and unentitled accounts despite editable owner metadata',async()=>{
 const invalid=await identityHarness({claimsFail:true});assert.equal(await invalid.exports.identity(),null);
 const unentitled=await identityHarness({owner:false,member:false,entitled:false});assert.equal(await unentitled.exports.identity(),null);assert(!unentitled.writes.includes('memberships'));
 const client=await identityHarness({owner:false,member:false});assert.equal((await client.exports.identity()).role,'client');
});
