import {z} from 'zod';
import {userDb} from '@/lib/supabase';
import {limit} from '@/lib/protection';
import {assert,errorResponse,readJson,requireSameOrigin} from '@/lib/security';
export async function POST(request:Request){try{requireSameOrigin(request);const input=z.object({token_hash:z.string().regex(/^[A-Za-z0-9_-]{32,256}$/),type:z.enum(['magiclink','invite','signup','recovery'])}).parse(await readJson(request));await limit(request,'confirm-login',15,600);const db=await userDb();const {error}=await db.auth.verifyOtp(input);assert(!error,400,'This sign-in link expired or was already used. Request a new link.');return Response.json({ok:true});}catch(error){return errorResponse(error);}}
