'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Mail,CheckCircle2,HeartHandshake} from 'lucide-react';
import {Turnstile} from './turnstile';

type Feedback={kind:'sent'|'inquiry'|'management'|'error';message:string};
export function LoginForm({enabled,expired}:{enabled:boolean,expired:boolean}){
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState<Feedback|null>(null),[token,setToken]=useState(''),[reset,setReset]=useState(0);
 const [email,setEmail]=useState(''),[retryTimes,setRetryTimes]=useState<Record<string,number>>({}),[now,setNow]=useState(0);
 const normalizedEmail=email.trim().toLowerCase();
 const remaining=Math.max(0,Math.ceil(((retryTimes[normalizedEmail]||0)-now)/1000));
 useEffect(()=>{
  if(!remaining)return;
  const timer=window.setInterval(()=>setNow(Date.now()),1000);
  return ()=>window.clearInterval(timer);
 },[remaining]);
 return <form aria-busy={busy} onSubmit={async e=>{
  e.preventDefault();if(busy||remaining)return;setBusy(true);setFeedback(null);
  try{
   const values=new FormData(e.currentTarget);
   const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:values.get('email'),turnstileToken:token})});
   const result=await response.json();
   const retrySeconds=response.ok?60:Number(result.retryAfterSeconds);
   if(Number.isFinite(retrySeconds)&&retrySeconds>0){const time=Date.now();setNow(time);setRetryTimes(previous=>({...previous,[normalizedEmail]:time+retrySeconds*1000}));}
   if(!response.ok)throw Error(result.error||'Could not send your link. Please retry.');
   if(!['check_inbox','complete_inquiry','management_login'].includes(result.next))throw Error('Please refresh this page and try again.');
   setFeedback({kind:result.next==='check_inbox'?'sent':result.next==='management_login'?'management':'inquiry',message:result.message});
  }catch(e){setFeedback({kind:'error',message:e instanceof Error?e.message:'Could not send your link. Please retry.'});}
  finally{setBusy(false);setReset(v=>v+1);setToken('');}
 }}>
 {expired&&<div className="notice warning">That sign-in link has expired or was already used. Request a fresh link below.</div>}
 {!enabled&&<div className="notice warning">Your workspace is being prepared. Contact VYNTRIO for access.</div>}
 <label htmlFor="email">Email address</label>
 <div className="input-icon"><Mail size={18}/><input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={254} readOnly={busy} value={email} onChange={event=>{setEmail(event.target.value);setFeedback(null);}}/></div>
 <p className="field-note">Your link goes only to this inbox. Please use your inquiry or invited email.</p>
 <Turnstile onToken={setToken} resetKey={reset}/>
 <button className="button primary full" disabled={busy||!enabled||remaining>0} type="submit">{busy?'Checking your workspace…':remaining?`Try this email again in ${remaining}s`:'Email me a sign-in link'}<ArrowRight size={18}/></button>
 {remaining>0&&<p className="field-note">You can enter a different email address while this countdown runs.</p>}
 <div aria-live="polite" aria-atomic="true">
  {feedback&&<div className={'notice login-feedback '+(feedback.kind==='error'?'error':feedback.kind==='sent'?'success':'inquiry')}>
   {feedback.kind!=='error'&&<div className="login-feedback-title">{feedback.kind==='sent'?<CheckCircle2 size={19}/>:<HeartHandshake size={19}/>}<strong>{feedback.kind==='sent'?'Your link is on its way':feedback.kind==='management'?'Your team has its own entrance':'Your next step starts here'}</strong></div>}
   <p>{feedback.message}</p>
   {feedback.kind==='inquiry'&&<div className="login-feedback-actions"><a href="/#contact">Complete my inquiry <ArrowRight size={15}/></a><a href="mailto:vyntrioagency@gmail.com">Contact our team</a></div>}
   {feedback.kind==='management'&&<div className="login-feedback-actions"><a href="/management/login">Go to management sign-in <ArrowRight size={15}/></a></div>}
  </div>}
 </div>
 <p className="login-footnote">A personal link, delivered privately. No password to remember.</p>
 </form>;
}
