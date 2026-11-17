// Enable only after the new host is verified; run a single production scheduler.
export default async function(){
 if(Netlify.env.get('ENABLE_SCHEDULED_MAINTENANCE')!=='true')return new Response(null,{status:204});
 const base=Netlify.env.get('NEXT_PUBLIC_SITE_URL'),secret=Netlify.env.get('CRON_SECRET');
 if(!base||!secret)throw new Error('Maintenance configuration is incomplete');
 const url=new URL('/api/cron/maintenance',base);
 if(url.protocol!=='https:')throw new Error('Maintenance requires HTTPS');
 const response=await fetch(url,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error('Scheduled maintenance failed; inspect private backup status');
 return new Response(null,{status:204});
}
