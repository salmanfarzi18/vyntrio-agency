export const dynamic='force-dynamic';
import {redirect} from 'next/navigation';
import {identity} from '@/lib/auth';
import {isTeamRole} from '@/lib/management-policy';
import {SecurityPanel} from '@/components/security-panel';
export const metadata={title:'Management security | VYNTRIO',robots:{index:false,follow:false}};
export default async function ManagementSecurity(){const current=await identity();if(!current)redirect('/management/login');if(!isTeamRole(current.role))redirect('/portal');return <SecurityPanel required name={current.user.email!} destination={current.passwordAuthenticated?'/management/login':'/management/password'}/>;}
