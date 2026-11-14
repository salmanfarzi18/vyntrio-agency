import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {workspaceAccess,workspaceAccessNotice} from '../lib/workspace-access';

function database(facts:{profile?:boolean;team?:boolean;paid?:boolean;project?:boolean;error?:boolean}={}){
 const queries:Array<{table:string;filters:Record<string,string>}> = [];
 const db={from:(table:string)=>{
  const filters:Record<string,string>={};const query={table,filters};queries.push(query);
  const builder={select(){return builder;},eq(key:string,value:string){filters[key]=value;return builder;},limit(){return builder;},async maybeSingle(){
   if(facts.error&&table==='inquiries')return {data:null,error:Error('Database unavailable')};
   const data=table==='profiles'&&facts.profile?{id:'verified-user'}:
    table==='memberships'&&facts.team?{role:'staff'}:
    table==='inquiries'&&facts.paid&&filters.payment_status==='paid'?{id:'paid-inquiry'}:
    table==='projects'&&facts.project?{id:'assigned-project'}:null;
   return {data,error:null};
  }};return builder;
 }};
 return {db:db as unknown as SupabaseClient,queries};
}
test('A profile or unpaid inquiry alone cannot receive workspace access',async()=>{
 for(const facts of [{},{profile:true}]){const c=database(facts);assert.equal((await workspaceAccess(c.db,'new@example.invalid','owner@example.invalid')).allowed,false);assert(c.queries.some(q=>q.table==='inquiries'&&q.filters.payment_status==='paid'));}
});
test('A verified paid inquiry grants access even before an Auth account exists',async()=>{
 const c=database({paid:true});const result=await workspaceAccess(c.db,' PAID@EXAMPLE.INVALID ','owner@example.invalid');assert.equal(result.reason,'paid_inquiry');assert.equal(result.allowed,true);assert(c.queries.some(q=>q.table==='inquiries'&&q.filters.email==='paid@example.invalid'));
});
test('Owner, trusted team memberships and existing project clients retain access',async()=>{
 const owner=database();assert.equal((await workspaceAccess(owner.db,'OWNER@example.invalid','owner@example.invalid')).reason,'owner');assert.equal(owner.queries.length,0);
 const team=database({profile:true,team:true});assert.equal((await workspaceAccess(team.db,'team@example.invalid','owner@example.invalid')).reason,'team');
 const client=database({profile:true,project:true});assert.equal((await workspaceAccess(client.db,'client@example.invalid','owner@example.invalid')).reason,'existing_client');
});
test('A failed eligibility query never silently allows sign-in',async()=>{
 const c=database({profile:true,project:true,error:true});await assert.rejects(workspaceAccess(c.db,'client@example.invalid','owner@example.invalid'),/Database unavailable/);
});
test('Only verified payment queues one stable welcome event, without storing a sign-in token',()=>{
 const inquiry={id:'test-inquiry',email:'paid@example.invalid',payment_status:'pending'};
 assert.equal(workspaceAccessNotice(inquiry),null);
 const first=workspaceAccessNotice({...inquiry,payment_status:'paid'}),retry=workspaceAccessNotice({...inquiry,payment_status:'paid'});
 assert.deepEqual(first,retry);assert.equal(first?.eventKey,'workspace-access:test-inquiry');assert(!JSON.stringify(first).includes('token_hash'));assert(!JSON.stringify(first).includes('/auth/confirm'));
});
