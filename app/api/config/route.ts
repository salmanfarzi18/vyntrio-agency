import {configured} from '@/lib/config';
export function GET(){return Response.json({portalEnabled:configured(),turnstileSiteKey:process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY||null,cashfreeMode:process.env.CASHFREE_ENV==='production'?'production':'sandbox'},{headers:{'Cache-Control':'no-store'}});}
