import {ArrowRight,ArrowUpRight,Check,CreditCard,FileText,Layers3,LockKeyhole,Milestone,ShieldCheck} from 'lucide-react';
import {Brand} from '@/components/brand';
import {LoginForm} from '@/components/login-form';
import {configured} from '@/lib/config';
import {identity} from '@/lib/auth';
import {redirect} from 'next/navigation';

export default async function LoginPage({searchParams}:{searchParams:Promise<{expired?:string}>}){
 if(await identity())redirect('/portal');
 const query=await searchParams;
 return <div className="login-page">
  <section className="login-story">
   <Brand inverse/>
   <div className="story-body">
    <span className="eyebrow light">IDEAS INTO REALITY. TOGETHER.</span>
    <h1>Great projects.<br/>Clear progress.<br/><span>One workspace.</span></h1>
    <p>A shared space for your ideas, milestones, and everything we’re building together.</p>
    <div className="story-project">
     <div className="story-project-top"><span className="story-icon"><Layers3 size={23}/></span><span>Your next big idea<small>Built with VYNTRIO</small></span><span className="mini-pill">Connected</span></div>
     <div className="story-timeline"><span><Check size={15}/> Plan</span><i/><span><Check size={15}/> Design</span><i/><span className="current">Build</span><i/><span>Launch</span></div>
     <div className="story-progress"><i/></div>
     <div className="story-card-bottom"><span><Milestone size={16}/> Every milestone, in one place.</span><ArrowUpRight size={18}/></div>
    </div>
    <div className="story-promises"><span><ShieldCheck size={17}/> Private by design</span><span><LockKeyhole size={17}/> Secure access</span></div>
   </div>
   <footer>From Idea to Digital Reality.<span>VYNTRIO Agency</span></footer>
  </section>
  <section className="login-main">
   <a className="back-home" href="/">← Back to website</a>
   <div className="login-panel onboarding-panel">
    <div className="login-symbol"><LockKeyhole size={25}/></div>
    <span className="eyebrow">YOUR VYNTRIO WORKSPACE</span>
    <h2>Welcome back.</h2>
    <p className="muted login-intro">Your ideas, your progress, and our team—all in one place.</p>
    <section className="onboarding-card" aria-labelledby="start-your-idea">
     <span className="onboarding-kicker">NEW TO VYNTRIO</span>
     <h3 id="start-your-idea">Let’s start with your idea.</h3>
     <div className="onboarding-steps" aria-label="Two steps to your workspace">
      <div><span className="onboarding-step-icon"><FileText size={17}/></span><span><small>STEP 01</small>Share your project</span></div>
      <div><span className="onboarding-step-icon"><CreditCard size={17}/></span><span><small>STEP 02</small>Confirm with ₹1</span></div>
     </div>
     <p>Once both steps are complete and your payment is verified, we’ll email your private workspace sign-in link.</p>
     <a className="onboarding-link" href="/#contact">Start my project inquiry <ArrowRight size={16}/></a>
    </section>
    <h3 className="workspace-signin-title">Your workspace sign-in</h3>
    <p className="workspace-signin-note">Completed both steps? Use the same email you shared with us.</p>
    <LoginForm enabled={configured()} expired={query.expired==='1'}/>
    <p className="existing-access-note">Existing project clients and the VYNTRIO team can use their invited email.</p>
    <div className="help-line">A little help getting started? <a href="mailto:vyntrioagency@gmail.com">Talk to our team <ArrowUpRight size={14}/></a></div>
   </div>
   <footer>© {new Date().getFullYear()} VYNTRIO Agency <a href="mailto:vyntrioagency@gmail.com">Need help?</a></footer>
  </section>
 </div>;
}
