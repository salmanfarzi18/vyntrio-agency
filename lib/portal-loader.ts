
import {resources,type Resource} from './resources';
import type {Identity} from './auth';
export type Row=Record<string,any>;
export type PortalData={section:string,id?:string,role:string,name:string,email:string,userId:string,profile:Row,summary:Row,rows:Row[],total:number,projects:Row[],clients:Row[],updates:Row[],milestones:Row[],invoices:Row[],quotes:Row[],files:Row[],tickets:Row[],messages:Row[],monthly?:Row[],team?:Row[],members?:Row[],project?:Row,preview?:boolean};
export async function portalData(current:Identity,section:string,id?:string):Promise<PortalData>{const db=current.db;const result:PortalData={section,id,role:current.role,name:current.profile?.full_name||current.user.email!.split('@')[0],email:current.user.email!,userId:current.user.id,profile:current.profile||{},summary:{},rows:[],total:0,projects:[],clients:[],updates:[],milestones:[],invoices:[],quotes:[],files:[],tickets:[],messages:[]};
 // All work is scoped to this request's authenticated client; do not cache
 // private results across requests or users. Fetch independent data together.
 const pending:Promise<void>[]=[];
 pending.push((async()=>{const stats=await db.rpc('portal_summary');if(stats.error)throw stats.error;result.summary=stats.data||{};})());
 if(['overview','projects','invoices','quotes','tickets'].includes(section))pending.push((async()=>{const {data,error}=await db.from('projects').select('*,milestones(id,status)').order('created_at',{ascending:false}).limit(200);if(error)throw error;result.projects=data||[];})());
 if(['owner','admin'].includes(current.role)){
  if(['overview','projects','inquiries','activity'].includes(section))pending.push((async()=>{const {data,error}=await db.from('profiles').select('id,email,full_name,phone').order('created_at',{ascending:false}).limit(200);if(error)throw error;result.clients=data||[];})());
  if(section==='team'||(section==='projects'&&id))pending.push((async()=>{const {data,error}=await db.from('memberships').select('user_id,role,profiles(full_name,email)').limit(200);if(error)throw error;result.team=data||[];})());
 }
 if(section in resources&&!(section==='projects'&&id)&&!(section==='tickets'&&id))pending.push((async()=>{const {data,count,error}=await db.from(resources[section as Resource]).select('*',{count:'exact'}).order('created_at',{ascending:false}).range(0,19);if(error)throw error;result.rows=data||[];result.total=count||0;})());
 if(id&&section==='projects'){
  pending.push((async()=>{const {data:project,error}=await db.from('projects').select('*').eq('id',id).single();if(error)throw error;result.project=project;})());
  pending.push((async()=>{
  const responses=await Promise.all(['milestones','updates','invoices','quotes','files','tickets'].map(table=>db.from(table).select('*').eq('project_id',id).order('created_at',{ascending:table==='milestones'}).limit(200)));
  for(let i=0;i<responses.length;i++){if(responses[i].error)throw responses[i].error;(result as unknown as Record<string,unknown>)[['milestones','updates','invoices','quotes','files','tickets'][i]]=responses[i].data||[];}
  })());
  pending.push((async()=>{const {data:members,error}=await db.from('project_members').select('user_id').eq('project_id',id);if(error)throw error;result.members=members||[];})());
 }
 if(section==='tickets'&&id){pending.push((async()=>{const {data:ticket,error}=await db.from('tickets').select('*').eq('id',id).single();if(error)throw error;result.rows=[ticket];})());pending.push((async()=>{const {data,error}=await db.from('ticket_messages').select('*').eq('ticket_id',id).order('created_at').limit(200);if(error)throw error;result.messages=data||[];})());}
 if(section==='overview'){
  pending.push((async()=>{const {data,error}=await db.from('milestones').select('*,projects(title)').neq('status','approved').order('due_date',{ascending:true,nullsFirst:false}).limit(5);if(error)throw error;result.milestones=data||[];})());
  pending.push((async()=>{const {data,error}=await db.from('updates').select('*,projects(title)').eq('internal',false).order('created_at',{ascending:false}).limit(5);if(error)throw error;result.updates=data||[];})());
  pending.push((async()=>{const {data,error}=await db.from('invoices').select('*,projects(title)').eq('status','pending').order('created_at',{ascending:false}).limit(5);if(error)throw error;result.invoices=data||[];})());
  if(['owner','admin'].includes(current.role))pending.push((async()=>{const monthly=await db.rpc('portal_collections_by_month');if(monthly.error)throw monthly.error;result.monthly=monthly.data||[];})());
 }
 await Promise.all(pending);
 return result;
}
