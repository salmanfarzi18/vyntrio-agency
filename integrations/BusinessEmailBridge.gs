/** Deploy only from vyntrioagency@gmail.com, execute as Me. Email only.
 * Run setupBusinessEmail and keep BUSINESS_EMAIL_BRIDGE_SECRET private.
 * No spreadsheet, Drive backup or Gmail inbox access is required.
 */
function doGet(){return output_({ok:true,service:'VYNTRIO business email sender'});}
function sender_(){return Session.getEffectiveUser().getEmail().trim().toLowerCase();}
function setupBusinessEmail(){
 if(sender_()!=='vyntrioagency@gmail.com')throw Error('Sign in with the VYNTRIO business Google account first.');
 const properties=PropertiesService.getScriptProperties();
 if(!properties.getProperty('BUSINESS_EMAIL_BRIDGE_SECRET'))properties.setProperty('BUSINESS_EMAIL_BRIDGE_SECRET',Utilities.getUuid()+Utilities.getUuid());
 console.log('Business sender ready. Keep the bridge secret private.');
}
function doPost(e){try{
 const input=JSON.parse(e.postData.contents),secret=PropertiesService.getScriptProperties().getProperty('BUSINESS_EMAIL_BRIDGE_SECRET');
 if(!secret||input.action!=='saasBridge'||typeof input.rawBody!=='string'||input.rawBody.length>50000)return output_({ok:false});
 const timestamp=String(input.timestamp||''),signature=String(input.signature||'');
 if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>300000||!/^[A-Za-z0-9+/]{43}=$/.test(signature))return output_({ok:false});
 const expected=Utilities.base64Encode(Utilities.computeHmacSha256Signature(timestamp+input.rawBody,secret,Utilities.Charset.UTF_8));
 if(!constantTime_(signature,expected))return output_({ok:false});
 if(sender_()!=='vyntrioagency@gmail.com')return output_({ok:false,error:'sender_mismatch'});
 const data=JSON.parse(input.rawBody);
 if(!/^[a-f0-9-]{36}$/i.test(String(data.id||'')))return output_({ok:false});
 if(data.action==='health')return output_({ok:true,sender:'vyntrioagency@gmail.com',remainingRecipients:MailApp.getRemainingDailyQuota()});
 if(data.action!=='email')return output_({ok:false});
 const to=String(data.to||''),subject=String(data.subject||''),body=String(data.body||'');
 if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)||!subject||subject.length>180||!body||body.length>32000)return output_({ok:false});
 const lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  const properties=PropertiesService.getScriptProperties(),key='sent_'+data.id;
  if(properties.getProperty(key))return output_({ok:true,duplicate:true,sender:'vyntrioagency@gmail.com'});
  if(MailApp.getRemainingDailyQuota()<1)return output_({ok:false,error:'quota'});
  MailApp.sendEmail({to:to,subject:subject,body:body,name:'VYNTRIO Agency',replyTo:'vyntrioagency@gmail.com'});
  properties.setProperty(key,String(Date.now()));
  const all=properties.getProperties(),cutoff=Date.now()-7*86400000;
  Object.keys(all).forEach(function(k){if(k.indexOf('sent_')===0&&Number(all[k])<cutoff)properties.deleteProperty(k);});
  return output_({ok:true,sender:'vyntrioagency@gmail.com'});
 }finally{lock.releaseLock();}
 }catch(error){console.error('Business email request failed. Check authorization and quota.');return output_({ok:false});}}
function constantTime_(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function output_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
