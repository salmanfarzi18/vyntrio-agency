'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Eye,EyeOff,KeyRound,LockKeyhole,ShieldCheck,X} from 'lucide-react';
import {Turnstile} from './turnstile';

type Challenge={factorId:string;challengeId:string;method:'phone'|'totp';destination:string};
export function ManagementLogin({authenticated=false,method='totp',destination='/management'}:{authenticated?:boolean;method?:'phone'|'totp';destination?:string}){
 const [verificationMethod,setVerificationMethod]=useState(method),[signedIn,setSignedIn]=useState(authenticated),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[sent,setSent]=useState(false),[recover,setRecover]=useState(false),[visible,setVisible]=useState(false),[token,setToken]=useState(''),[reset,setReset]=useState(0),[challenge,setChallenge]=useState<Challenge|null>(null),[open,setOpen]=useState(authenticated),[code,setCode]=useState(''),[verifyError,setVerifyError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(!open)return;opener.current=document.activeElement as HTMLElement;const element=dialog.current;element?.showModal();return()=>{element?.close();opener.current?.focus();};},[open]);
 async function request(path:string,body:unknown){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.error||'Please retry shortly.');return result;}
 async function startChallenge(){setBusy(true);setVerifyError('');setCode('');try{const result=await request('/api/management/mfa',{action:'challenge'});setChallenge(result);}catch(error){setVerifyError(error instanceof Error?error.message:'Could not start verification.');}finally{setBusy(false);}}
 return <>
  {!signedIn?<form onSubmit={async event=>{
   event.preventDefault();if(busy)return;setBusy(true);setMessage('');setSent(false);
   const fields=new FormData(event.currentTarget);
   try{const result=await request(recover?'/api/management/recovery':'/api/management/login',{email:fields.get('email'),...(!recover?{password:fields.get('password')}:{}),turnstileToken:token});
    if(recover){setMessage(result.message);setSent(true);}else{setVerificationMethod(result.method==='phone'?'phone':'totp');setSignedIn(true);setOpen(true);}
   }catch(error){setMessage(error instanceof Error?error.message:'Could not sign in. Please retry.');}finally{setBusy(false);setReset(v=>v+1);setToken('');}
  }} aria-busy={busy}>
   <label htmlFor="management-email">Work email</label><input id="management-email" name="email" type="email" autoComplete="username" placeholder="Your invited work email" required maxLength={254} readOnly={busy}/>
   {!recover&&<><label htmlFor="management-password">Password</label><div className="management-password-field"><input id="management-password" name="password" type={visible?'text':'password'} autoComplete="current-password" required maxLength={128} readOnly={busy}/><button type="button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></>}
   <Turnstile onToken={setToken} resetKey={reset}/>
   <button className="button primary full" disabled={busy} type="submit"><LockKeyhole size={17}/>{busy?'Please wait…':recover?'Email my private setup link':'Sign in to management'}<ArrowRight size={17}/></button>
   {message&&<p className={'notice '+(sent?'success':'error')} role="status">{message}</p>}
   <button className="management-recovery" type="button" disabled={busy} onClick={()=>{setRecover(v=>!v);setMessage('');setReset(v=>v+1);setToken('');}}>{recover?'Back to password sign-in':'First time here or forgot your password?'}</button>
  </form>:<div className="management-verified-password"><ShieldCheck size={24}/><h3>One more check.</h3><p>Confirm it’s you before opening your management dashboard.</p><button className="button primary full" type="button" onClick={()=>setOpen(true)}>Continue to verification <ArrowRight size={17}/></button><button className="management-recovery" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.assign('/management/login');}}>Use another account</button></div>}
  <dialog ref={dialog} className="modal management-verification" aria-labelledby="management-verification-title" onCancel={()=>{setOpen(false);setCode('');}}>
   <div className="modal-header"><h2 id="management-verification-title">Verify it’s you</h2><button type="button" className="icon-button" aria-label="Close verification" disabled={busy} onClick={()=>{setOpen(false);setCode('');}}><X size={20}/></button></div>
   <div className="management-verification-body"><span className="management-lock"><KeyRound size={27}/></span><p>{verificationMethod==='phone'?'Use the six-digit code sent to your registered phone.':'Use the six-digit code from your authenticator app.'}</p>
    {!challenge?<button className="button primary full" disabled={busy} onClick={startChallenge}>{busy?'Preparing verification…':verificationMethod==='phone'?'Send SMS code':'Continue with authenticator'}</button>:<form onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setVerifyError('');try{await request('/api/management/mfa',{action:'verify',factorId:challenge.factorId,challengeId:challenge.challengeId,code});setCode('');window.location.assign(destination);}catch(error){setVerifyError(error instanceof Error?error.message:'Please check the code and retry.');}finally{setBusy(false);}}}>
     <p className="field-note">{challenge.method==='phone'?'Code sent to '+challenge.destination:'Open '+challenge.destination+'. Codes change regularly.'}</p>
     <label htmlFor="management-code">Six-digit verification code</label><input id="management-code" className="mfa-code" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus/>
     <button className="button primary full section-gap" disabled={busy} type="submit">{busy?'Verifying…':'Verify and open dashboard'}<ArrowRight size={17}/></button>
     {challenge.method==='phone'&&<button type="button" className="management-recovery" disabled={busy} onClick={startChallenge}>Resend SMS code</button>}
    </form>}
    {verifyError&&<p className="notice error" role="alert">{verifyError}</p>}
    <p className="small-print">Your dashboard stays locked until verification succeeds.</p><a className="text-link" href="/management/security">Authenticator setup and recovery <ArrowRight size={14}/></a>
   </div>
  </dialog>
 </>;
}
