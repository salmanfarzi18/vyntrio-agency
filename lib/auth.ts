import 'server-only';
import {redirect} from 'next/navigation';
import {AGENCY_ID,configured,isOwnerEmail} from './config';
import {adminDb,userDb} from './supabase';
import {HttpError,assert} from './security';
export async function identity(){if(!configured())return null;const db=await userDb();const {data:{user},error}=await db.auth.getUser();if(error||!user?.email||!user.email_confirmed_at)return null;const service=adminDb();
 await service.from('profiles').upsert({id:user.id,email:user.email.toLowerCase()},{onConflict:'id'});
 if(isOwnerEmail(user.email)){const {error:ownerError}=await service.from('memberships').upsert({agency_id:AGENCY_ID,user_id:user.id,role:'owner'});if(ownerError)throw ownerError;}
 const {data:membership}=await db.from('memberships').select('role').eq('agency_id',AGENCY_ID).eq('user_id',user.id).maybeSingle();
 const {data:profile}=await db.from('profiles').select('*').eq('id',user.id).single();
 // Only a verified authenticated mailbox can claim historical inquiries for that email.
 await service.from('inquiries').update({user_id:user.id}).is('user_id',null).eq('email',user.email.toLowerCase());
 const {data:assurance}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
 return {user,profile,role:membership?.role||'client',db,assurance:assurance?.currentLevel||'aal1'};
}
export type Identity=NonNullable<Awaited<ReturnType<typeof identity>>>;
export function needsMfa(current:Identity){return current.role!=='client'&&(process.env.NODE_ENV==='production'||process.env.STAFF_MFA_REQUIRED!=='false')&&current.assurance!=='aal2';}
export async function requireIdentity(staff=false){const current=await identity();if(!current)throw new HttpError(401,'Please sign in again.');assert(!needsMfa(current),403,'Complete two-step verification in Security before continuing.');if(staff)assert(current.role!=='client',403,'This action is available to the VYNTRIO team only.');return current;}
export async function requirePage(){const current=await identity();if(!current)redirect('/login');return current;}
export async function canProject(current:Identity,id:string){const {data,error}=await current.db.from('projects').select('*').eq('id',id).maybeSingle();assert(!error&&data,404,'Project not found.');return data;}
export async function audit(actor:string,action:string,entity:string,id:string){const {error}=await adminDb().from('audit_log').insert({actor_id:actor,action,entity,entity_id:id});if(error)console.error('Audit entry could not be stored.');}
