import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.env.SMOKE_BASE||'http://127.0.0.1:3210',rows=[];
for(const path of ['/','/privacy','/terms','/refunds','/cookies','/robots.txt','/sitemap.xml','/favicon.png','/social-preview.png','/api/health']){const r=await fetch(base+path);const body=await r.text();assert.equal(r.status,200,path);rows.push({path,status:r.status});if(path==='/')assert(/name="robots" content="index,follow"/.test(body));}
const r=await fetch(base+'/this-page-does-not-exist');assert.equal(r.status,404);assert((await r.text()).includes('Let’s get you back on track.'));rows.push({path:'invalid URL',status:404});
const html=await readFile('public/landing.html','utf8'),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const missing=[...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]).filter(id=>!ids.has(id));assert.deepEqual(missing,[]);
const assets=[...new Set([...html.matchAll(/\/assets\/[a-f0-9]{16}\.[a-z0-9]+/g)].map(m=>m[0]))];
for(const asset of assets){const r=await fetch(base+asset);assert.equal(r.status,200,asset);assert.match(r.headers.get('cache-control')||'',/immutable/);await r.arrayBuffer();}
const sensitive=/(?:sb_secret_[A-Za-z0-9_-]{12,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|AKIA[0-9A-Z]{16})/;
for(const path of ['public/landing.html','public/landing-portal.js','public/landing-motion.js','public/landing-launch.js','public/site-settings.json'])assert(!sensitive.test(await readFile(path,'utf8')),'Potential server credential in '+path);
await writeFile('audit/public-surface.json',JSON.stringify({rows,checkedAssets:assets.length,brokenInternalAnchors:missing,credentialPatternMatches:0,note:'Pattern scan is not a full secret-history or penetration audit.'},null,2));console.log(JSON.stringify({publicRoutes:rows.length,assets:assets.length,brokenInternalAnchors:missing.length}));
