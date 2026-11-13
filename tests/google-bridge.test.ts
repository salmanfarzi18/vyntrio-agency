import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import vm from 'node:vm';
test('Private Google bridge rejects forged/expired requests and deduplicates email delivery',()=>{
 const rows:unknown[][]=[['Message ID','Sent At']],sent:unknown[]=[],secret='private-bridge-test-secret';
 const ctx={console,Date,JSON,PropertiesService:{getScriptProperties:()=>({getProperty:(key:string)=>key==='SAAS_BRIDGE_SECRET'?secret:'private-id'})},Utilities:{Charset:{UTF_8:'utf8'},base64Encode:(v:Uint8Array)=>Buffer.from(v).toString('base64'),computeHmacSha256Signature:(value:string,key:string)=>createHmac('sha256',key).update(value).digest()},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{openById:()=>({getSheets:()=>[{getDataRange:()=>({getValues:()=>rows}),appendRow:(r:unknown[])=>rows.push(r)}]})},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:(v:unknown)=>sent.push(v)},ContentService:{MimeType:{JSON:'json'},createTextOutput:(value:string)=>({value,setMimeType(){return this;}})}};
 vm.createContext(ctx);vm.runInContext(readFileSync('integrations/SaaSBridge.gs','utf8'),ctx);const context=ctx as unknown as {doPost:(e:unknown)=>{value:string}};
 const rawBody=JSON.stringify({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',action:'email',to:'client@example.invalid',subject:'Your project update',body:'Private update'}),timestamp=String(Date.now()),signature=createHmac('sha256',secret).update(timestamp+rawBody).digest('base64');
 const post=(v:unknown)=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(v)}}).value);
 assert.equal(post({action:'saasBridge',rawBody:rawBody+' ',timestamp,signature}).ok,false);assert.equal(sent.length,0);
 assert.equal(post({action:'saasBridge',rawBody,timestamp,signature}).ok,true);assert.equal(post({action:'saasBridge',rawBody,timestamp,signature}).duplicate,true);assert.equal(sent.length,1);
 const expired=String(Date.now()-3600000),oldSignature=createHmac('sha256',secret).update(expired+rawBody).digest('base64');assert.equal(post({action:'saasBridge',rawBody,timestamp:expired,signature:oldSignature}).ok,false);
});
