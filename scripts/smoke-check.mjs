import assert from 'node:assert/strict';
const base=process.env.SMOKE_BASE||'http://localhost:3000';
const checks=[];
async function expect(path,status,options={}){const response=await fetch(base+path,{redirect:'manual',...options});assert.equal(response.status,status,path);checks.push({path,status});return response;}
let response=await expect('/',200);const html=await response.text();assert(html.includes('VYNTRIO'));assert(html.includes('/landing-portal.js'));assert(html.includes('action="/api/inquiries"'));
await expect('/login',200);
// A loading boundary can stream the shell before the auth guard redirects.
// Check the exact login redirect, rather than mistaking the HTTP 200 shell
// for authenticated access. No private workspace may be rendered there.
const portal=await fetch(base+'/portal',{redirect:'manual'});
if(portal.status===307)assert.equal(new URL(portal.headers.get('location'),base).pathname,'/login');
else{assert.equal(portal.status,200);const shell=await portal.text();assert(shell.includes('NEXT_REDIRECT;replace;/login;307;'));assert.match(shell,/<meta[^>]*http-equiv="refresh"[^>]*content="1;url=\/login"/);assert(!shell.includes('MANAGE YOUR AGENCY'));}
assert.match(portal.headers.get('cache-control')||'',/no-store/);checks.push({path:'/portal',status:portal.status,redirect:'/login'});
await expect('/preview',404);await expect('/auth/confirm',200);
for(const path of ['/api/portal/health','/api/portal/export?type=clients','/api/portal/backup-download?id=unknown','/api/portal/files?id=unknown']){const privateResponse=await expect(path,401);assert.match(privateResponse.headers.get('cache-control')||'',/no-store/);}
await expect('/api/portal/actions',403,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
await expect('/api/portal/actions',401,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
await expect('/api/portal/backups',401,{method:'POST',headers:{Origin:base}});
await expect('/api/portal/payment-connection',403,{method:'POST'});
await expect('/api/portal/payment-connection',401,{method:'POST',headers:{Origin:base}});
await expect('/api/inquiries',400,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
await expect('/api/cashfree-webhook',401,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
response=await expect('/api/config',200);const config=await response.json();assert.deepEqual(Object.keys(config).sort(),['cashfreeMode','paymentsEnabled','portalEnabled','turnstileSiteKey']);
if(!config.paymentsEnabled)await expect('/api/payments/create',503,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
console.log(JSON.stringify({passed:checks.length,checks,note:'Only anonymous access and invalid-input checks ran; no inquiry, email, or payment was created.'},null,2));

