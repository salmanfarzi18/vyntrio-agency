import type {SupabaseClient} from '@supabase/supabase-js';
import {AGENCY_ID} from './config';

// Called only with a server-owned database client. Profile existence alone is
// never an entitlement. Existing project clients retain their invited access.
export async function workspaceAccess(db:SupabaseClient,email:string,ownerEmail:string,userId?:string){
 const address=email.trim().toLowerCase();
 if(address===ownerEmail.trim().toLowerCase())return {allowed:true,reason:'owner'};
 let id=userId;
 if(!id){const {data,error}=await db.from('profiles').select('id').eq('email',address).maybeSingle();if(error)throw error;id=data?.id;}
 const [paid,team,project]=await Promise.all([
  db.from('inquiries').select('id').eq('email',address).eq('payment_status','paid').limit(1).maybeSingle(),
  id?db.from('memberships').select('role').eq('agency_id',AGENCY_ID).eq('user_id',id).maybeSingle():Promise.resolve({data:null,error:null}),
  id?db.from('projects').select('id').eq('client_id',id).limit(1).maybeSingle():Promise.resolve({data:null,error:null}),
 ]);
 for(const result of [paid,team,project])if(result.error)throw result.error;
 if(team.data&&['owner','admin','staff'].includes(team.data.role))return {allowed:true,reason:'team'};
 if(paid.data)return {allowed:true,reason:'paid_inquiry'};
 if(project.data)return {allowed:true,reason:'existing_client'};
 return {allowed:false,reason:'inquiry_required'};
}

export function workspaceAccessNotice(inquiry:{id:string;email:string;payment_status:string}){
 if(inquiry.payment_status!=='paid')return null;
 return {eventKey:'workspace-access:'+inquiry.id,to:inquiry.email,subject:'Your VYNTRIO workspace link',body:'Project details and payment verified. Send the private workspace welcome email.'};
}
