import {test} from 'node:test';
import assert from 'node:assert/strict';
import {portalData} from '../lib/portal-loader';
import type {Identity} from '../lib/auth';

function client(userId:string,role='owner'){
 const calls:string[]=[];let active=0,peak=0;
 async function execute(table:string){
  calls.push(table);active++;peak=Math.max(peak,active);
  await new Promise<void>(resolve=>setImmediate(resolve));active--;
  return {data:table==='portal_summary'?{open_tickets:1}:table==='portal_collections_by_month'?[]:[{id:userId,full_name:userId}],count:1,error:null};
 }
 const db={rpc:(name:string)=>execute(name),from:(table:string)=>{
  const builder:Record<string,unknown>={};
  for(const method of ['select','order','limit','range','eq','neq'])builder[method]=()=>builder;
  builder.single=async()=>{const result=await execute(table);return {...result,data:(result.data as unknown[])[0]};};
  builder.then=(resolve:unknown,reject:unknown)=>execute(table).then(resolve as never,reject as never);
  return builder;
 }};
 return {identity:{db,role,user:{id:userId,email:userId+'@example.invalid'},profile:{full_name:userId}} as unknown as Identity,calls,peak:()=>peak};
}
test('Settings fetches only the summary, without unrelated client/project/team records',async()=>{
 const c=client('owner-a');const data=await portalData(c.identity,'settings');
 assert.deepEqual(c.calls,['portal_summary']);assert.deepEqual(data.clients,[]);assert.deepEqual(data.projects,[]);assert.equal(data.team,undefined);
});
test('Independent dashboard queries overlap and concurrent users never share results',async()=>{
 const owner=client('owner-a'),customer=client('client-b','client');
 const [agency,clientView]=await Promise.all([portalData(owner.identity,'overview'),portalData(customer.identity,'overview')]);
 assert(owner.peak()>1);assert(customer.peak()>1);
 assert.equal(agency.projects[0].id,'owner-a');assert.equal(clientView.projects[0].id,'client-b');
 assert.deepEqual(clientView.clients,[]);assert(!customer.calls.includes('profiles'));assert(!customer.calls.includes('memberships'));assert(!customer.calls.includes('portal_collections_by_month'));
});
test('Project detail fetches scoped records without a redundant paginated project list',async()=>{
 const c=client('client-c','client');const data=await portalData(c.identity,'projects','project-x');
 assert.equal(c.calls.filter(v=>v==='projects').length,2); // dialog/project labels + current project
 assert.equal(data.project?.id,'client-c');assert.equal(data.total,0);assert.deepEqual(data.rows,[]);
 for(const table of ['milestones','updates','invoices','quotes','files','tickets','project_members'])assert(c.calls.includes(table));
});
