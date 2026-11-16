import {writeFile,mkdir} from 'node:fs/promises';
const base=(process.argv[2]||'https://vyntrio-agency.vercel.app').replace(/\/$/,'');
const paths=['/','/robots.txt','/sitemap.xml','/privacy','/terms','/refunds','/cookies','/favicon.png','/social-preview.png','/definitely-not-a-real-vyntrio-page','/api/config','/api/health'];
const rows=[];
for(const path of paths){const started=performance.now();try{const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});const body=await r.arrayBuffer();rows.push({path,status:r.status,ms:Math.round(performance.now()-started),bytes:body.byteLength,headers:Object.fromEntries(['location','cache-control','x-vercel-cache','strict-transport-security','x-content-type-options','x-frame-options','x-robots-tag','content-type','content-encoding'].map(k=>[k,r.headers.get(k)]))});}catch(e){rows.push({path,error:e.message});}}
const http=await fetch(base.replace('https:','http:')+'/',{redirect:'manual',signal:AbortSignal.timeout(15000)}).then(r=>({status:r.status,location:r.headers.get('location')})).catch(e=>({error:e.message}));
const result={checkedAt:new Date().toISOString(),base,httpRedirect:http,rows};
await mkdir('audit',{recursive:true});await writeFile('audit/http-latest.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
