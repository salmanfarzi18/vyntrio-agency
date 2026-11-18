import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import type {SupabaseClient} from '@supabase/supabase-js';
import {claimBackupRun,dailyBackupId} from '../lib/backup-claim';

// Exercise the claim against PostgreSQL uniqueness and conditional UPDATE,
// rather than a mock that always awards the lock to one worker.
function client(pg:PGlite){return {from:()=>{
 let operation='select',values:Record<string,unknown>={},filters:Array<[string,unknown]>=[],columns='*';
 const query={insert(v:Record<string,unknown>){operation='insert';values=v;return query;},update(v:Record<string,unknown>){operation='update';values=v;return query;},select(v:string){columns=v;return query;},eq(k:string,v:unknown){filters.push([k,v]);return query;},single:execute,maybeSingle:execute};
 async function execute(){try{
  const params:unknown[]=[],bind=(v:unknown)=>{params.push(v);return '$'+params.length;};
  const where=()=>filters.length?' where '+filters.map(([k,v])=>k+'='+bind(v)).join(' and '):'';
  const sql=operation==='insert'?(Object.keys(values).length?`insert into backup_runs (${Object.keys(values).join(',')}) values (${Object.values(values).map(bind).join(',')})`:'insert into backup_runs default values')+' returning '+columns:operation==='update'?'update backup_runs set '+Object.entries(values).map(([k,v])=>k+'='+bind(v)).join(',')+where()+' returning '+columns:'select '+columns+' from backup_runs'+where();
  const result=await pg.query(sql,params);const row=result.rows[0] as Record<string,unknown>|undefined;
  if(row?.created_at instanceof Date)row.created_at=row.created_at.toISOString();
  return {data:row||null,error:null};
 }catch(error){return {data:null,error};}}
 return query;
}} as unknown as SupabaseClient;}

test('Concurrent scheduled calls create one snapshot claim; completed repeats skip, failures and stale runs retry once',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec("create table backup_runs(id uuid primary key default gen_random_uuid(),status text default 'running',created_at timestamptz default now(),completed_at timestamptz,record_count bigint,error text)");
  const now=new Date(),db=client(pg),id=dailyBackupId('agency',now);
  const claim=()=>claimBackupRun(db,id,now);
  assert.equal((await Promise.all([claim(),claim(),claim()])).filter(v=>v.claimed).length,1);
  assert.equal((await pg.query<{count:number}>('select count(*) as count from backup_runs')).rows[0].count,1);
  await pg.query("update backup_runs set status='completed',record_count=233 where id=$1",[id]);
  const repeated=await claim();assert.equal(repeated.claimed,false);assert.equal(repeated.recordCount,233);assert.equal(repeated.status,'completed');
  await pg.query("update backup_runs set status='failed' where id=$1",[id]);
  assert.equal((await Promise.all([claim(),claim(),claim()])).filter(v=>v.claimed).length,1);
  await pg.query("update backup_runs set created_at='2000-01-01' where id=$1",[id]);
  assert.equal((await Promise.all([claim(),claim()])).filter(v=>v.claimed).length,1);
  const manual=await claimBackupRun(db);assert.equal(manual.claimed,true);assert.notEqual(manual.id,id);
  assert.notEqual(dailyBackupId('agency',new Date('2026-11-19')),dailyBackupId('agency',new Date('2026-11-18')));
  assert.notEqual(dailyBackupId('agency',now),dailyBackupId('other-agency',now));
 }finally{await pg.close();}
 await assert.rejects(()=>claimBackupRun(client(pg),'11111111-1111-8111-a111-111111111111'));
});
