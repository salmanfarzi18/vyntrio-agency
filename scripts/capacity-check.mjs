import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.SMOKE_BASE||'http://127.0.0.1:3210';
// This isolated benchmark never sends forms, payments, email or authenticated requests.
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('This benchmark is restricted to the local release server. Use a separately budgeted hosted load test for production.');
const stages=[];
for(const users of [100,1000]){
 const start=performance.now();
 const results=await Promise.all(Array.from({length:users},async()=>{const t=performance.now();try{const r=await fetch(base+'/',{signal:AbortSignal.timeout(15000)});const html=await r.text();return {ok:r.status===200&&html.includes('VYNTRIO'),ms:performance.now()-t};}catch{return {ok:false,ms:performance.now()-t};}}));
 const times=results.map(x=>x.ms).sort((a,b)=>a-b),failed=results.filter(x=>!x.ok).length;
 const result={simultaneousPageRequests:users,failed,p50ms:Math.round(times[Math.floor(users*.5)]),p95ms:Math.round(times[Math.floor(users*.95)]),totalMs:Math.round(performance.now()-start)};stages.push(result);console.log(JSON.stringify(result));
 if(failed/users>.02)break;
}
await mkdir('audit',{recursive:true});await writeFile('audit/local-capacity.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:'Local production homepage HTML only; no hosted CDN, browsers, database, uploads, payments or external providers exercised. Not a production capacity guarantee.',stages},null,2));
