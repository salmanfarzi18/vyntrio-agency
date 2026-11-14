import 'server-only';
import {redirect} from 'next/navigation';
import {AGENCY_ID,configured,isOwnerEmail,env} from './config';
import {adminDb,userDb} from './supabase';
import {workspaceAccess} from './workspace-access';
import {HttpError,assert} from './security';
import {hasAuthMethod,managementSessionReady} from './management-policy';
export async function identity(){
 if(!configured())return null;
 const db=await userDb(),{data:{user},error}=await db.auth.getUser();
 if(error||!user?.email||!user.email_confirmed_at)return null;
 const service=adminDb();
 // These independent reads are request-scoped. Never share identity or private
 // records between users, and never turn verified claims into a global cache.
 const [profileResult,membershipResult,agencyResult,claimsResult]=await Promise.all([
  db.from('profiles').select('*').eq('id',user.id).maybeSingle(),
  db.from('memberships').select('role').eq('agency_id',AGENCY_ID).eq('user_id',user.id).maybeSingle(),
  service.from('agencies').select('management_mfa_method').eq('id',AGENCY_ID).single(),
  db.auth.getClaims()
 ]);
 if(claimsResult.error||!claimsResult.data)return null;
 for(const result of [profileResult,membershipResult,agencyResult])if(result.error)throw result.error;
 let profile=profileResult.data,membership=membershipResult.data;
 // Normal visits only read existing account records. Creation and owner
 // bootstrap run only when needed, rather than writing them on every click.
 if(!profile){const saved=await service.from('profiles').upsert({id:user.id,email:user.email.toLowerCase()},{onConflict:'id'}).select('*').single();if(saved.error)throw saved.error;profile=saved.data;}
 if(isOwnerEmail(user.email)&&membership?.role!=='owner'){const {error:ownerError}=await service.from('memberships').upsert({agency_id:AGENCY_ID,user_id:user.id,role:'owner'});if(ownerError)throw ownerError;membership={role:'owner'};}
 const [access,claimed]=await Promise.all([
  membership?Promise.resolve({allowed:true}):workspaceAccess(service,user.email,env('ADMIN_EMAIL'),user.id),
  service.from('inquiries').update({user_id:user.id}).is('user_id',null).eq('email',user.email.toLowerCase())
 ]);
 if(claimed.error)throw claimed.error;if(!access.allowed)return null;
 const claims=claimsResult.data.claims,methods=claims.amr;
 return {user,profile,role:membership?.role||'client',db,assurance:String(claims.aal||'aal1'),methods,mfaMethod:agencyResult.data?.management_mfa_method==='phone'?'phone' as const:'totp' as const,passwordAuthenticated:hasAuthMethod(methods,'password')};
}
export type Identity=NonNullable<Awaited<ReturnType<typeof identity>>>;
export function needsMfa(current:Identity){return current.role!=='client'&&(current.assurance!=='aal2'||(current.mfaMethod==='phone'&&!hasAuthMethod(current.methods,'mfa/phone')));}
export async function requireIdentity(staff=false){const current=await identity();if(!current)throw new HttpError(401,'Please sign in again.');if(current.role!=='client')assert(managementSessionReady(current.role,current.assurance,current.methods,current.mfaMethod),403,'Please sign in with your management password and complete two-step verification.');if(staff)assert(current.role!=='client',403,'This action is available to the VYNTRIO team only.');return current;}
export async function requirePage(){const current=await identity();if(!current)redirect('/login');return current;}
export async function canProject(current:Identity,id:string){const {data,error}=await current.db.from('projects').select('*').eq('id',id).maybeSingle();assert(!error&&data,404,'Project not found.');return data;}
export async function audit(actor:string,action:string,entity:string,id:string){const {error}=await adminDb().from('audit_log').insert({actor_id:actor,action,entity,entity_id:id});if(error)console.error('Audit entry could not be stored.');}
