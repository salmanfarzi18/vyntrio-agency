'use client';
import {useEffect,useState} from 'react';
export function ConfirmSignIn({recovery=false}:{recovery?:boolean}){
 const [token,setToken]=useState(''),[type,setType]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const values=new URLSearchParams(window.location.hash.slice(1));setToken(values.get('token_hash')||'');setType(values.get('type')||'');window.history.replaceState(null,'',window.location.pathname+window.location.search);setReady(true);},[]);
 return <><button className="button primary" disabled={!ready||!token||busy} onClick={async()=>{
  setBusy(true);setMessage('');try{const response=await fetch('/api/auth/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:token,type})});const result=await response.json();if(!response.ok)throw Error(result.error);setToken('');window.location.assign(result.next==='/management/password'?'/management/password':'/portal');}catch(error){setMessage(error instanceof Error?error.message:'Could not verify your link.');}finally{setBusy(false);}
 }}>{busy?'Verifying your private link…':recovery?'Continue to password reset →':'Continue to workspace →'}</button>
 {ready&&!token&&<p className="notice warning">This private link is missing or has already been opened. Please request a fresh email below.</p>}
 {message&&<p className="notice error" role="alert">{message}</p>}
 <a className="text-link" href={recovery?'/management/login?recover=1':'/login'}>{recovery?'Request a new password reset email':'Request a new sign-in link'}</a>
 <a className="text-link" href={recovery?'/management/password':'/portal'}>{recovery?'Already verified? Set your password':'Already signed in? Open workspace'}</a></>;
}
