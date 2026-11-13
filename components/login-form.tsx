'use client';
import {useState} from 'react';
import {ArrowRight,Mail,CheckCircle2} from 'lucide-react';
import {Turnstile} from './turnstile';
export function LoginForm({enabled,expired}:{enabled:boolean,expired:boolean}){const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false),[token,setToken]=useState(''),[reset,setReset]=useState(0);return <form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{const values=new FormData(e.currentTarget);const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:values.get('email'),turnstileToken:token})});const result=await response.json();if(!response.ok)throw Error(result.error);setError(false);setMessage(result.message);}catch(e){setError(true);setMessage(e instanceof Error?e.message:'Could not send your link. Please retry.');}finally{setBusy(false);setReset(v=>v+1);setToken('');}}}>
 {expired&&<div className="notice warning">That sign-in link has expired or was already used. Request a fresh link below.</div>}
 {!enabled&&<div className="notice warning">Your workspace is being prepared. Contact VYNTRIO for access.</div>}
 <label htmlFor="email">Email address</label><div className="input-icon"><Mail size={18}/><input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={254}/></div>
 <p className="field-note">Use the email address invited to your project.</p><Turnstile onToken={setToken} resetKey={reset}/>
 <button className="button primary full" disabled={busy||!enabled} type="submit">{busy?'Sending your secure link…':'Email me a sign-in link'}<ArrowRight size={18}/></button>
 {message&&<p role="status" className={'notice '+(error?'error':'success')}>{!error&&<CheckCircle2 size={18}/>} {message}</p>}
 <p className="login-footnote">No password to remember. Your personal sign-in link is sent to your inbox.</p>
 </form>;}
