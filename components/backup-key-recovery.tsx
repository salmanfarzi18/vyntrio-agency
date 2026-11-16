'use client';
import {useState} from 'react';

export function BackupKeyRecovery(){
 const [busy,setBusy]=useState(false),[key,setKey]=useState(''),[message,setMessage]=useState(''),[visible,setVisible]=useState(false);
 async function recover(){
  setBusy(true);setMessage('');setKey('');
  try{
   const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},false,['encrypt','decrypt']);
   const publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);
   const response=await fetch('/api/management/backup-key-recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({publicKey}),cache:'no-store'});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Recovery could not complete.');
   const encrypted=Uint8Array.from(atob(result.encryptedKey),character=>character.charCodeAt(0));
   const recovered=await crypto.subtle.decrypt({name:'RSA-OAEP'},pair.privateKey,encrypted);
   setKey(new TextDecoder().decode(recovered));
   setMessage('The original key opened a saved backup successfully. Copy it into your password manager and Netlify’s Production BACKUP_ENCRYPTION_KEY setting.');
  }catch(error){setMessage(error instanceof Error?error.message:'Recovery could not complete.');}
  finally{setBusy(false);}
 }
 return <section className="card card-content">
  <p>Your owner password and two-step verification are required. Recovery checks the key against an existing encrypted backup.</p>
  <button className="button primary" disabled={busy||!!key} onClick={recover}>{busy?'Verifying the backup…':'Recover my original backup key'}</button>
  {message&&<p role="status" className="notice">{message}</p>}
  {key&&<>
   <label htmlFor="recovered-backup-key">Original backup encryption key</label>
   <input id="recovered-backup-key" type={visible?'text':'password'} value={key} readOnly autoComplete="off" spellCheck={false}/>
   <div className="row-actions section-gap">
    <button className="button" onClick={async()=>{try{await navigator.clipboard.writeText(key);setMessage('Copied. Save the key privately, then paste it into Netlify’s Production BACKUP_ENCRYPTION_KEY setting.');}catch{setMessage('Clipboard access was unavailable. Reveal the key and copy it privately.');}}}>Copy key privately</button>
    <button className="button" onClick={()=>setVisible(value=>!value)}>{visible?'Hide key':'Reveal privately'}</button>
    <button className="button" onClick={()=>{setKey('');setVisible(false);setMessage('Cleared from this page.');}}>Clear from page</button>
   </div>
   <p className="small-print">The recovered value stays in this page’s memory until you clear it or close the page. Keep the key out of screenshots and chat.</p>
  </>}
 </section>;
}
