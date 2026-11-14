import {z} from 'zod';
import {managementIdentity} from '@/lib/management-auth';
import {limit} from '@/lib/protection';
import {assert,errorResponse,readJson,requireSameOrigin} from '@/lib/security';
import {audit} from '@/lib/auth';
export async function POST(request:Request){try{
 requireSameOrigin(request);const current=await managementIdentity();
 assert(current.assurance==='aal2',403,'Complete your authenticator verification before changing the management password.');
 await limit(request,'management-password',3,900,current.user.id);
 const input=z.object({password:z.string().min(12,'Use at least 12 characters.').max(128)}).parse(await readJson(request));
 const {error}=await current.db.auth.updateUser({password:input.password});
 assert(!error,400,'The password could not be updated. Use a new, strong password, or request a fresh setup link and retry.');
 await audit(current.user.id,'management_password_changed','profiles',current.user.id);
 await current.db.auth.signOut({scope:'global'});
 return Response.json({ok:true});
}catch(error){return errorResponse(error);}}
