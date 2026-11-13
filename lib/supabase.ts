import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {env} from './config';
export const adminDb=()=>createClient(env('NEXT_PUBLIC_SUPABASE_URL'),env('SUPABASE_SECRET_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
export async function userDb(){
 const jar=await cookies();
 return createServerClient(env('NEXT_PUBLIC_SUPABASE_URL'),env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),{
  cookies:{
   getAll:()=>jar.getAll(),
   setAll:values=>{try{values.forEach(({name,value,options})=>jar.set(name,value,{...options,secure:process.env.NODE_ENV==='production',sameSite:'lax'}));}catch{/* Server Components cannot set cookies; proxy refreshes them. */}}
  }
 });
}
