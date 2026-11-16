export const AGENCY_ID='11111111-1111-4111-8111-111111111111';
export const legacyUrl=()=>process.env.LEGACY_APPS_SCRIPT_URL||'https://script.google.com/macros/s/AKfycbxT-lfMvF3fBRRzIGtQOATXMnZG3kfPO75adZmHjdksP47omDfwAU5qDC-Qp1mGrwYE/exec';
export const configured=()=>!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_SECRET_KEY);
export const paymentsEnabled=()=>process.env.PAYMENTS_ENABLED==='true';
export function env(name:string){const value=process.env[name];if(!value)throw new Error(`Missing configuration: ${name}`);return value;}
export function siteUrl(){const netlifyPreview=['deploy-preview','branch-deploy'].includes(process.env.CONTEXT||'')&&process.env.DEPLOY_PRIME_URL;const url=process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_BRANCH_URL?'https://'+process.env.VERCEL_BRANCH_URL:netlifyPreview||process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';return url.replace(/\/$/,'');}
export function isOwnerEmail(email:string){return email.toLowerCase()===env('ADMIN_EMAIL').trim().toLowerCase();}
