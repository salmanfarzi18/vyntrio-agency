import {userDb} from '@/lib/supabase';
import {requireSameOrigin,errorResponse} from '@/lib/security';
export async function POST(request:Request){try{requireSameOrigin(request);const db=await userDb();await db.auth.signOut();return Response.json({ok:true});}catch(error){return errorResponse(error);}}
