import 'server-only';
import {redirect} from 'next/navigation';
import {AGENCY_ID,configured,isOwnerEmail,env} from './config';
import {adminDb,userDb} from './supabase';
import {workspaceAccess} from './workspace-access';
import {HttpError,assert} from './security';
import {hasAuthMethod,managementSessionReady} from './management-policy';
export async function identity(){if(!configured())return null;const db=await userDb();const {data:{user},error}=await db.auth.getUser();if(error||!user?.email||!user.email_confirmed_at)return null;const service=adminDb();
 await service.from('profiles').upsert({id:user.id,email:user.email.toLowerCase()},{onConflict:'id'});
 if(isOwnerEmail(user.email)){const {error:ownerError}=await service.from('memberships').upsert({agency_id:AGENCY_ID,user_id:user.id,role:'owner'});if(ownerError)throw ownerError;}
 const {data:membership}=await db.from('memberships').select('role').eq('agency_id',AGENCY_ID).eq('user_id',user.id).maybeSingle();
 const [{data:profile},{data:agency,error:policyError}]=await Promise.all([db.from('profiles').select('*').eq('id',user.id).single(),membership?service.from('agencies').select('management_mfa_method').eq('id',AGENCY_ID).single():Promise.resolve({data:null,error:null})]);if(policyError)throw policyError;
 if(!membership&&!(await workspaceAccess(service,user.email,env('ADMIN_EMAIL'),user.id)).allowed)return null;
 // Only a verified authenticated mailbox can claim historical inquiries for that email.
 await service.from('inquiries').update({user_id:user.id}).is('user_id',null).eq('email',user.email.toLowerCase());
 const {data:claims,error:claimsError}=await db.auth.getClaims();if(claimsError||!claims)return null;
 const methods=claims.claims.amr;
 return {user,profile,role:membership?.role||'client',db,assurance:String(claims.claims.aal||'aal1'),methods,mfaMethod:agency?.management_mfa_method==='phone'?'phone' as const:'totp' as const,passwordAuthenticated:hasAuthMethod(methods,'password')};
}
export type Identity=NonNullable<Awaited<ReturnType<typeof identity>>>;
export function needsMfa(current:Identity){return current.role!=='client'&&(current.assurance!=='aal2'||(current.mfaMethod==='phone'&&!hasAuthMethod(current.methods,'mfa/phone')));}
export async function requireIdentity(staff=false){const current=await identity();if(!current)throw new HttpError(401,'Please sign in again.');if(current.role!=='client')assert(managementSessionReady(current.role,current.assurance,current.methods,current.mfaMethod),403,'Please sign in with your management password and complete two-step verification.');if(staff)assert(current.role!=='client',403,'This action is available to the VYNTRIO team only.');return current;}
export async function requirePage(){const current=await identity();if(!current)redirect('/login');return current;}
export async function canProject(current:Identity,id:string){const {data,error}=await current.db.from('projects').select('*').eq('id',id).maybeSingle();assert(!error&&data,404,'Project not found.');return data;}
export async function audit(actor:string,action:string,entity:string,id:string){const {error}=await adminDb().from('audit_log').insert({actor_id:actor,action,entity,entity_id:id});if(error)console.error('Audit entry could not be stored.');}
