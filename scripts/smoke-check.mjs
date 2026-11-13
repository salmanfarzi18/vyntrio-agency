import assert from 'node:assert/strict';
const base=process.env.SMOKE_BASE||'http://localhost:3000';
const checks=[];
async function expect(path,status,options={}){const response=await fetch(base+path,{redirect:'manual',...options});assert.equal(response.status,status,path);checks.push({path,status});return response;}
let response=await expect('/',200);const html=await response.text();assert(html.includes('VYNTRIO'));assert(html.includes('/landing-portal.js'));assert(html.includes('action="/api/inquiries"'));
await expect('/login',200);await expect('/portal',307);await expect('/preview',404);await expect('/auth/confirm',200);
for(const path of ['/api/portal/health','/api/portal/export?type=clients','/api/portal/backup-download?id=unknown','/api/portal/files?id=unknown'])await expect(path,401);
await expect('/api/portal/actions',403,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
await expect('/api/portal/actions',401,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
await expect('/api/inquiries',400,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
await expect('/api/cashfree-webhook',401,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
response=await expect('/api/config',200);const config=await response.json();assert.deepEqual(Object.keys(config).sort(),['cashfreeMode','portalEnabled','turnstileSiteKey']);
console.log(JSON.stringify({passed:checks.length,checks,note:'No inquiry, email, payment, or production request was sent.'},null,2));

