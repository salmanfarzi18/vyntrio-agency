'use client';
import {useEffect,useState} from 'react';
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
export function ServiceHealth({preview=false}:{preview?:boolean}){const [value,setValue]=useState<Record<string,unknown>|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const refresh=async()=>{if(preview)return;setBusy(true);try{const response=await fetch('/api/portal/health'),result=await response.json();if(!response.ok)throw Error(result.error);setValue(result);setMessage('');}catch{setMessage('Could not check service connections. Please retry.');}finally{setBusy(false);}};useEffect(()=>{refresh();},[]);return <section className="card"><div className="card-header"><h2>Service connections</h2><button className="button small" disabled={busy||preview} onClick={refresh}>{busy?'Checking…':'Refresh'}</button></div><div className="card-content">{value?<dl className="settings-dl"><span>Database</span><strong>{String(value.database)}</strong><span>Google email & backups</span><strong>{String(value.google)}</strong><span>Email recipients left today</span><strong>{value.remainingEmailRecipients===null?'See email provider':String(value.remainingEmailRecipients)}</strong><span>Spam protection</span><strong>{value.spamProtection?'Connected':'Needs setup'}</strong><span>Backup configuration</span><strong>{value.backupsConfigured?'Ready for testing':'Needs setup'}</strong><span>Payment configuration</span><strong>{value.paymentsConfigured?String(value.paymentMode):'Needs setup'}</strong></dl>:<p>{preview?'Service checks are available in the connected workspace.':message||'Checking your connections…'}</p>}<PaymentConnection disabled={preview}/><p className="small-print">Connection checks do not replace a successful email, payment, and backup restore test.</p></div></section>;}
