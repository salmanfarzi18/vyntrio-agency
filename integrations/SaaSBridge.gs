/** VYNTRIO private Google service bridge.
 * Create a SEPARATE Apps Script project for this file. Deploy as a web app,
 * execute as yourself, access Anyone. Requests require an HMAC secret.
 * Script properties: SAAS_BRIDGE_SECRET, LEGACY_SPREADSHEET_ID,
 * BACKUP_FOLDER_ID, BRIDGE_LOG_SPREADSHEET_ID (last two are made by setupBridge).
 * Keep all property values private. No payment credentials belong here.
 */
function doGet(){return output_({ok:true,service:'VYNTRIO private Google bridge'});}
function doPost(e){try{
 const input=JSON.parse(e.postData.contents),secret=PropertiesService.getScriptProperties().getProperty('SAAS_BRIDGE_SECRET');
 if(!secret||input.action!=='saasBridge'||typeof input.rawBody!=='string'||input.rawBody.length>4500000)return output_({ok:false});
 const timestamp=String(input.timestamp||''),signature=String(input.signature||'');
 if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>300000||!/^[A-Za-z0-9+/]{43}=$/.test(signature))return output_({ok:false});
 const expected=Utilities.base64Encode(Utilities.computeHmacSha256Signature(timestamp+input.rawBody,secret,Utilities.Charset.UTF_8));
 if(!constantTime_(signature,expected))return output_({ok:false});
 const data=JSON.parse(input.rawBody);if(!/^[a-f0-9-]{36}$/i.test(String(data.id||'')))return output_({ok:false});
 if(data.action==='email')return send_(data);
 if(data.action==='health')return output_({ok:true,remainingRecipients:MailApp.getRemainingDailyQuota()});
 if(data.action==='backup')return backup_(data);
 if(data.action==='exportLegacy')return exportLegacy_();
 if(data.action==='sheetMirror')return mirror_(data);
 return output_({ok:false});
 }catch(error){console.error('Bridge action failed. Check configuration and quotas.');return output_({ok:false});}}
function setupBridge(){
 const properties=PropertiesService.getScriptProperties();
 if(!properties.getProperty('SAAS_BRIDGE_SECRET'))properties.setProperty('SAAS_BRIDGE_SECRET',Utilities.getUuid()+Utilities.getUuid());
 if(!properties.getProperty('BACKUP_FOLDER_ID'))properties.setProperty('BACKUP_FOLDER_ID',DriveApp.createFolder('VYNTRIO encrypted backups').getId());
 if(!properties.getProperty('BRIDGE_LOG_SPREADSHEET_ID')){const book=SpreadsheetApp.create('VYNTRIO private delivery log');book.getSheets()[0].appendRow(['Message ID','Sent At']);properties.setProperty('BRIDGE_LOG_SPREADSHEET_ID',book.getId());}
 // Set LEGACY_SPREADSHEET_ID privately before using imports or Sheets reports.
 console.log('Bridge initialized. Remaining email recipients today: '+MailApp.getRemainingDailyQuota()+'. Keep Script properties private.');
}
function send_(data){
 const to=String(data.to||''),subject=String(data.subject||''),body=String(data.body||'');
 if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)||subject.length>180||!subject||body.length>32000||!body)return output_({ok:false});
 const lock=LockService.getScriptLock();lock.waitLock(15000);
 try{const log=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BRIDGE_LOG_SPREADSHEET_ID')).getSheets()[0];
 if(log.getDataRange().getValues().some(function(row){return row[0]===data.id;}))return output_({ok:true,duplicate:true});
 if(MailApp.getRemainingDailyQuota()<1)return output_({ok:false,error:'quota'});
 MailApp.sendEmail({to:to,subject:subject,body:body,name:'VYNTRIO Agency',replyTo:'vyntrioagency@gmail.com'});
 log.appendRow([data.id,new Date()]);return output_({ok:true});
 }finally{lock.releaseLock();}
}
function backup_(data){
 const filename=String(data.filename||'');if(!/^(database|file)-[A-Za-z0-9._-]+\.vyn$/.test(filename)||String(data.contents||'').length>4200000)return output_({ok:false});
 const folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('BACKUP_FOLDER_ID'));
 const prior=folder.getFilesByName(filename);if(!prior.hasNext())folder.createFile(Utilities.newBlob(Utilities.base64Decode(data.contents),'application/octet-stream',filename));
 if(data.kind==='database'){const cutoff=Date.now()-30*86400000,files=folder.getFiles();let scanned=0;while(files.hasNext()&&scanned++<1000){const file=files.next();if(file.getName().indexOf('database-')===0&&file.getDateCreated().getTime()<cutoff)file.setTrashed(true);}}
 return output_({ok:true});
}
function exportLegacy_(){
 const book=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('LEGACY_SPREADSHEET_ID'));
 const source=book.getSheetByName('Inquiries'),ledger=book.getSheetByName('CashfreePayments');if(!source)return output_({ok:false});
 const inquiries=source.getDataRange().getValues().slice(1).filter(function(r){return r[1]&&r[2]&&r[3];}).map(function(r){return {createdAt:date_(r[0]),reference:String(r[1]),name:String(r[2]),email:String(r[3]),phone:String(r[4]),projectType:String(r[5]),details:String(r[6])};});
 const payments=ledger?ledger.getDataRange().getValues().slice(1).filter(function(r){return r[5]==='PAID';}).map(function(r){return {orderId:String(r[1]),paymentId:String(r[2]),paidAt:date_(r[9]),inquiryReference:String(r[10]||'')};}):[];
 return output_({ok:true,inquiries:inquiries,payments:payments});
}
function mirror_(data){
 const allowed=['SaaS_Inquiries','SaaS_Projects','SaaS_Payments'];if(allowed.indexOf(data.sheetName)<0||!Array.isArray(data.rows)||data.rows.length>10000)return output_({ok:false});
 const book=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('LEGACY_SPREADSHEET_ID'));let sheet=book.getSheetByName(data.sheetName);if(!sheet)sheet=book.insertSheet(data.sheetName);
 const rows=data.rows.map(function(row){return row.map(function(value){const s=String(value==null?'':value);return /^[=+\-@\t\r]/.test(s)?"'"+s:s;});});
 if(!rows.length)return output_({ok:true});const width=rows[0].length;if(width>25||rows.some(function(r){return r.length!==width;}))return output_({ok:false});
 sheet.clearContents();sheet.getRange(1,1,rows.length,width).setNumberFormat('@').setValues(rows);sheet.setFrozenRows(1);return output_({ok:true});
}
function date_(v){const d=new Date(v);return isNaN(d.getTime())?null:d.toISOString();}
function constantTime_(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function output_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
