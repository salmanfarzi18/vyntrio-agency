import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import vm from 'node:vm';
import {businessEmailBridge} from '../lib/business-email';

test('Business sender refuses a personal deployment, validates signatures and deduplicates without inbox/Drive access',()=>{
 const properties:Record<string,string>={BUSINESS_EMAIL_BRIDGE_SECRET:'private-test-secret'},sent:any[]=[];
 let account='salmanfarzi2004@gmail.com';
 const ctx={console,Date,JSON,Session:{getEffectiveUser:()=>({getEmail:()=>account})},PropertiesService:{getScriptProperties:()=>({getProperty:(k:string)=>properties[k],setProperty:(k:string,v:string)=>{properties[k]=v;},getProperties:()=>({...properties}),deleteProperty:(k:string)=>{delete properties[k];}})},Utilities:{Charset:{UTF_8:'utf8'},base64Encode:(v:Uint8Array)=>Buffer.from(v).toString('base64'),computeHmacSha256Signature:(v:string,k:string)=>createHmac('sha256',k).update(v).digest()},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:(v:any)=>sent.push(v)},ContentService:{MimeType:{JSON:'json'},createTextOutput:(value:string)=>({value,setMimeType(){return this;}})}};
 vm.createContext(ctx);vm.runInContext(readFileSync('integrations/BusinessEmailBridge.gs','utf8'),ctx);
 const script=ctx as unknown as {doPost:(e:any)=>{value:string};setupBusinessEmail:()=>void};
 const rawBody=JSON.stringify({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',action:'email',to:'client@example.invalid',subject:'Sender verification',body:'Labelled test only'}),timestamp=String(Date.now()),signature=createHmac('sha256',properties.BUSINESS_EMAIL_BRIDGE_SECRET).update(timestamp+rawBody).digest('base64');
 const post=(sig=signature)=>JSON.parse(script.doPost({postData:{contents:JSON.stringify({action:'saasBridge',rawBody,timestamp,signature:sig})}}).value);
 assert.throws(()=>script.setupBusinessEmail(),/business Google account/);
 assert.equal(post().ok,false);assert.equal(sent.length,0);
 account='vyntrioagency@gmail.com';assert.equal(post('forged').ok,false);assert.equal(sent.length,0);
 assert.equal(post().sender,account);assert.equal(sent[0].to,'client@example.invalid');assert.equal(sent[0].replyTo,account);assert.equal(sent[0].name,'VYNTRIO Agency');
 assert.equal(post().duplicate,true);assert.equal(sent.length,1);
});
test('Website signs requests to the separate email endpoint and rejects an unverified sender',async()=>{
 const url=process.env.EMAIL_SENDER_BRIDGE_URL,key=process.env.EMAIL_SENDER_BRIDGE_SECRET;
 process.env.EMAIL_SENDER_BRIDGE_URL='https://script.google.com/macros/s/test/exec';process.env.EMAIL_SENDER_BRIDGE_SECRET='private-test-secret';
 try{
  for(const sender of ['salmanfarzi2004@gmail.com',undefined])await assert.rejects(()=>businessEmailBridge('health',{},async()=>Response.json({ok:true,sender}) as any),/could not be verified/);
  const result=await businessEmailBridge('email',{to:'client@example.invalid',subject:'Test',body:'Test'},async(input,options)=>{
   assert.equal(String(input),process.env.EMAIL_SENDER_BRIDGE_URL);const body=JSON.parse(String(options?.body));assert.equal(body.signature,createHmac('sha256','private-test-secret').update(body.timestamp+body.rawBody).digest('base64'));assert.equal(JSON.parse(body.rawBody).to,'client@example.invalid');
   return Response.json({ok:true,sender:'vyntrioagency@gmail.com'});
  });assert.equal(result.ok,true);
 }finally{if(url===undefined)delete process.env.EMAIL_SENDER_BRIDGE_URL;else process.env.EMAIL_SENDER_BRIDGE_URL=url;if(key===undefined)delete process.env.EMAIL_SENDER_BRIDGE_SECRET;else process.env.EMAIL_SENDER_BRIDGE_SECRET=key;}
});
