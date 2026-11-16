import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Production crawl surface includes only public pages and real local assets',()=>{
 const html=fs.readFileSync('public/landing.html','utf8');
 assert(Buffer.byteLength(html)<250000,'Homepage must not regress to inline image/font megabytes');
 assert(!html.includes('data:font/'));
 for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g))assert(fs.existsSync('public'+match[1]),match[1]);
 assert(!html.includes('Startup Founder — FinTech MVP'),'Unverified template testimonials must not be published as real evidence');
 const sitemap=fs.readFileSync('public/sitemap.xml','utf8');
 for(const path of ['privacy','terms','refunds','cookies']){assert(sitemap.includes('/'+path+'</loc>'));assert(fs.existsSync('public/'+path+'.html'));}
 for(const path of ['/portal','/management','/api/'])assert(fs.readFileSync('public/robots.txt','utf8').includes('Disallow: '+path));
 assert(!sitemap.includes('/portal'));assert(!sitemap.includes('/management'));
});

test('Optional analytics is absent before consent and never receives form contents or tokens',async()=>{
 const listeners:Record<string,()=>void>={},appended:any[]=[];
 const element=()=>({style:{},append(...items:any[]){appended.push(...items);},addEventListener(){},setAttribute(){},remove(){}});
 const doc={head:{append:(e:any)=>appended.push(e)},body:{append:(e:any)=>appended.push(e)},createElement:element,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(name:string,f:()=>void)=>{listeners[name]=f;},title:'VYNTRIO',cookie:''};
 const window:any={};
 vm.runInNewContext(fs.readFileSync('public/landing-launch.js','utf8'),{document:doc,window,location:{origin:'https://example.test',pathname:'/',hash:'#token-secret'},localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>({json:async()=>({analyticsId:'G-TEST123'})})});
 await new Promise(r=>setImmediate(r));
 assert.equal(window.gtag,undefined);assert(!appended.some(e=>e.src?.includes('googletagmanager')));
 listeners['vyn:inquiry-saved']();assert.equal(window.gtag,undefined);
});
