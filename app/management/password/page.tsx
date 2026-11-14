export const dynamic='force-dynamic';
import {redirect} from 'next/navigation';
import {identity} from '@/lib/auth';
import {isTeamRole} from '@/lib/management-policy';
import {Brand} from '@/components/brand';
import {SecurityPanel} from '@/components/security-panel';
import {ManagementPassword} from '@/components/management-password';
export const metadata={title:'Secure management password | VYNTRIO',robots:{index:false,follow:false}};
export default async function PasswordPage(){const current=await identity();if(!current)redirect('/management/login');if(!isTeamRole(current.role))redirect('/portal');if(current.assurance!=='aal2')return <SecurityPanel required name={current.user.email!} destination="/management/password"/>;
 return <main className="standalone"><Brand subtitle="MANAGEMENT"/><span className="eyebrow">YOUR PRIVATE ACCOUNT</span><h1>Set your management password.</h1><p>Your email and authenticator are verified. Choose your password privately below. You’ll sign in again after saving.</p><ManagementPassword/></main>;
}
