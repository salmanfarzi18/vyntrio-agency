import {redirect} from 'next/navigation';
import {identity,needsMfa} from '@/lib/auth';
import {isTeamRole} from '@/lib/management-policy';
import {renderWorkspace} from '@/lib/render-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Agency management | VYNTRIO',robots:{index:false,follow:false}};
export default async function ManagementPage({params}:{params:Promise<{path?:string[]}>}){
 const current=await identity();if(!current)redirect('/management/login');if(!isTeamRole(current.role))redirect('/portal');
 if(!current.passwordAuthenticated)redirect('/management/password');
 if(needsMfa(current))redirect('/management/login');
 const {path=[]}=await params;return renderWorkspace(current,path);
}
