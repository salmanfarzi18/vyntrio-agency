import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const base='http://127.0.0.1:3210';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3210'],{stdio:'ignore',windowsHide:true,env:{...process.env,NEXT_PUBLIC_SITE_URL:base}});
const run=file=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,[file],{stdio:'inherit',windowsHide:true,env:{...process.env,SMOKE_BASE:base}});p.on('exit',code=>code===0?resolve():reject(new Error(file+' failed')));});
try{let ready=false;for(let i=0;i<30;i++){try{const r=await fetch(base);if(r.ok){ready=true;break;}}catch{}await delay(300);}if(!ready)throw Error('Local server was not reachable');await run('scripts/smoke-check.mjs');await run('scripts/public-surface-check.mjs');await run('scripts/capacity-check.mjs');}finally{server.kill();}
