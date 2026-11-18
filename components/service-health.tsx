'use client';
import {useEffect,useRef,useState} from 'react';
function PaymentConnection({disabled}:{disabled:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function check(){
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/portal/payment-connection',{method:'POST'}),result=await response.json();
   if(!response.ok){setMessage(result.error||'Could not check the connection. Please retry.');return;}
   setMessage(`${result.deployment} · ${result.mode}: ${result.message}`);
  }catch{setMessage('Could not check the connection. Please retry.');}finally{setBusy(false);}
 }
 return <div><button className="button small" disabled={disabled||busy} onClick={check}>{busy?'Checking Cashfree…':'Check payment connection'}</button><p className="small-print">Checks saved keys without creating an order or taking a payment.</p><p role="status" aria-live="polite">{message}</p></div>;
}
function MonitoringTest({disabled}:{disabled:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function send(){if(busy)return;setBusy(true);try{const response=await fetch('/api/portal/monitoring-test',{method:'POST'});const result=await response.json();setMessage(result.message||result.error||'Please retry later.');}catch{setMessage('Could not send the test. Please retry later.');}finally{setBusy(false);}}
 return <div><h3>Error alerts</h3><button className="button small" disabled={disabled||busy} onClick={send}>{busy?'Sending test…':'Send test error alert'}</button><p className="small-print">Owner only. Sends a labelled diagnostic error without changing client records.</p><p role="status" aria-live="polite">{message}</p></div>;
}
function RestoreTest({disabled}:{disabled:boolean}){
 const lock=useRef(false),controller=useRef<AbortController|null>(null);const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function run(){
  if(lock.current)return;lock.current=true;setBusy(true);controller.current=new AbortController();const signal=controller.current.signal;
  try{
   const response=await fetch('/api/portal/restore-test',{method:'POST',signal});let result=await response.json();if(!response.ok)throw Error(result.error||'Could not start recovery verification.');
   for(let attempt=0;['queued','running'].includes(result.status)&&attempt<120;attempt++){
    setMessage('Recovery is running safely in the separate test project…');await new Promise(resolve=>window.setTimeout(resolve,2500));if(signal.aborted)return;
    const status=await fetch('/api/portal/restore-test',{signal});result=await status.json();if(!status.ok)throw Error(result.error||'Could not check recovery progress.');
   }
   if(result.status==='completed')setMessage('Restore verified: '+result.records+' records across '+Object.keys(result.tables).length+' tables, '+result.files+' files checked. Email sending and payments were not run. Passwords and authenticator setup require separate recovery.');
   else setMessage(result.message||'The background job is still running. You can check its status again later.');
  }catch(error){if(!signal.aborted)setMessage(error instanceof Error?error.message:'Could not check recovery status.');}finally{lock.current=false;setBusy(false);}
 }
 return <div><h3>Isolated backup recovery</h3><p className="small-print">Owner only. Copies the latest encrypted backup to the separate VYNTRIO Restore Test project. It requires an empty test project and cannot overwrite the live database.</p><button className="button small" disabled={disabled||busy} onClick={run}>{busy?'Verifying recovery…':'Run isolated restore test'}</button><p role="status" aria-live="polite">{message}</p></div>;
}
export function ServiceHealth({preview=false}:{preview?:boolean}){const checking=useRef(false);const [value,setValue]=useState<Record<string,unknown>|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const refresh=async()=>{if(preview||checking.current)return;checking.current=true;setBusy(true);try{const response=await fetch('/api/portal/health'),result=await response.json();if(!response.ok)throw Error(result.error);setValue(result);setMessage('');}catch{setMessage('Could not check service connections. Please retry.');}finally{checking.current=false;setBusy(false);}};useEffect(()=>{const visibleRefresh=()=>{if(document.visibilityState==='visible')void refresh();};visibleRefresh();const timer=window.setInterval(visibleRefresh,60000);document.addEventListener('visibilitychange',visibleRefresh);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visibleRefresh);};},[preview]);return <section className="card"><div className="card-header"><h2>Service connections</h2><button className="button small" disabled={busy||preview} onClick={refresh}>{busy?'Checking…':'Refresh'}</button></div><div className="card-content">{value?<dl className="settings-dl"><span>Management verification</span><strong>{value.managementMfaMethod==='phone'?'Password + SMS code':'Password + authenticator'}</strong><span>Database</span><strong>{String(value.database)}</strong><span>Google email & backups</span><strong>{String(value.google)}</strong><span>Email sender</span><strong>{String(value.emailSender||'Not verified')}</strong><span>Email recipients left today</span><strong>{value.remainingEmailRecipients===null?'See email provider':String(value.remainingEmailRecipients)}</strong><span>Spam protection</span><strong>{value.spamProtection?'Connected':'Needs setup'}</strong><span>Backup configuration</span><strong>{value.backupsConfigured?'Ready for testing':'Needs setup'}</strong><span>Payment configuration</span><strong>{value.paymentsConfigured?String(value.paymentMode):'Needs setup'}</strong><span>Online checkout</span><strong>{value.paymentsEnabled?'Enabled':'Paused until verified'}</strong></dl>:<p>{preview?'Service checks are available in the connected workspace.':message||'Checking your connections…'}</p>}<PaymentConnection disabled={preview}/><MonitoringTest disabled={preview}/><RestoreTest disabled={preview}/><p className="small-print">Connections refresh every minute while this page is visible. Daily backups remain scheduled separately. Connection checks do not replace a successful email, payment, and backup restore test.</p></div></section>;}
