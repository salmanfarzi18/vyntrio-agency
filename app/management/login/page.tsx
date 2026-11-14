import {redirect} from 'next/navigation';
import {Brand} from '@/components/brand';
import {ManagementLogin} from '@/components/management-login';
import {identity,needsMfa} from '@/lib/auth';
import {isTeamRole} from '@/lib/management-policy';
import {ShieldCheck,LockKeyhole,ChartNoAxesCombined} from 'lucide-react';
export const metadata={title:'Management sign-in | VYNTRIO',robots:{index:false,follow:false}};
export default async function ManagementLoginPage({searchParams}:{searchParams:Promise<{password?:string;recover?:string}>}){
 const current=await identity(),team=!!current&&isTeamRole(current.role),query=await searchParams;
 if(team&&current.passwordAuthenticated&&!needsMfa(current))redirect('/management');
 if(team&&!current.passwordAuthenticated)redirect('/management/password');
 return <div className="login-page management-page"><section className="login-story"><Brand inverse subtitle="MANAGEMENT"/><div className="story-body"><span className="eyebrow light">THE TEAM BEHIND THE IDEAS</span><h1>Your agency.<br/>{' '}Your overview.<br/><span>Under control.</span></h1><p>Manage clients, projects, payments and your team from one protected workspace.</p><div className="management-promises"><p><ChartNoAxesCombined size={21}/> Connected business records</p><p><LockKeyhole size={21}/> Access based on your team role</p><p><ShieldCheck size={21}/> Password and two-step verification</p></div></div><footer>From Idea to Digital Reality.<span>VYNTRIO Agency</span></footer></section><section className="login-main"><a className="back-home" href="/">← Back to website</a><div className="login-panel management-panel"><div className="login-symbol"><ShieldCheck size={26}/></div><span className="eyebrow">VYNTRIO MANAGEMENT</span><h2>Welcome, team.</h2><p className="login-intro muted">Sign in with your work email and password. We’ll verify it’s you before opening the dashboard.</p>{query.password==='updated'&&<p className="notice success" role="status">Your password has been updated. Please sign in again.</p>}<ManagementLogin initialRecovery={query.recover==='1'} authenticated={team} method={team?current.mfaMethod:undefined}/><p className="management-client-link">Here for your project? <a href="/login">Client sign-in →</a></p><p className="small-print">Management accounts are invitation-only. Public registration cannot create a team account.</p></div><footer>© {new Date().getFullYear()} VYNTRIO Agency</footer></section></div>;
}
