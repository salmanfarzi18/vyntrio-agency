import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Inquiry retries keep one reference when Cloudflare tokens rotate; changed project details get a new reference',async()=>{
  const handlers:Record<string,Function>={},requests:any[]=[];
  let counter=0;
  let fields:Record<string,string>={name:'AUDIT ONLY',email:'audit@example.com',phone:'9000000001',projectType:'Website Development',projectDetails:'Same project',consent:'yes',website:'','cf-turnstile-response':'challenge-one'};
  const form={reportValidity:()=>true,append:()=>{},scrollIntoView:()=>{},addEventListener:(name:string,fn:Function)=>handlers[name]=fn};
  const status={hidden:true,className:'',textContent:''};
  const submit={disabled:false,textContent:'',innerHTML:'',before:()=>{}};
  const document={head:{append:()=>{}},createElement:()=>({className:'',innerHTML:'',textContent:''}),querySelector:(selector:string)=>selector==='#inquiryForm'?{cloneNode:()=>form,replaceWith:()=>{}}:selector==='#formStatus'?status:selector==='#submitInquiry'?submit:null};
  const context=vm.createContext({document,window:{},AbortController,URLSearchParams,setTimeout,clearTimeout,crypto:{randomUUID:()=>String(++counter)},FormData:class{* [Symbol.iterator](){yield* Object.entries(fields);}},fetch:async(url:string,options:any)=>{
    if(url==='/api/config')return {json:async()=>({portalEnabled:true,turnstileSiteKey:null,cashfreeMode:'sandbox'})};
    assert.equal(url,'/api/inquiries');const payload=JSON.parse(options.body);requests.push(payload);
    return {ok:true,json:async()=>({ok:true,inquiryId:payload.inquiryId})};
  }});
  vm.runInContext(await readFile('public/landing-portal.js','utf8'),context);
  const submitForm=()=>handlers.submit({preventDefault:()=>{}});
  await submitForm();fields={...fields,'cf-turnstile-response':'challenge-two'};await submitForm();
  assert.equal(requests.length,2);
  assert.equal(requests[0].inquiryId,requests[1].inquiryId,'A security-token change must not create a duplicate inquiry');
  fields={...fields,projectDetails:'A different project'};await submitForm();
  assert.notEqual(requests[1].inquiryId,requests[2].inquiryId);
});
