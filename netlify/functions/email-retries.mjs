export default async function(){
 if(Netlify.env.get('ENABLE_SCHEDULED_MAINTENANCE')!=='true')return new Response(null,{status:204});
 const base=Netlify.env.get('NEXT_PUBLIC_SITE_URL'),secret=Netlify.env.get('CRON_SECRET');
 if(!base||!secret)throw new Error('Email retry configuration is incomplete');
 const url=new URL('/api/cron/maintenance?task=email',base);
 if(url.protocol!=='https:')throw new Error('Email retries require HTTPS');
 const response=await fetch(url,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error('Email retries failed; inspect private delivery status');
 return new Response(null,{status:204});
}
