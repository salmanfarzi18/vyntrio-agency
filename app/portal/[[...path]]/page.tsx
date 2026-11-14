import {redirect} from 'next/navigation';
import {requirePage} from '@/lib/auth';
import {isTeamRole} from '@/lib/management-policy';
import {renderWorkspace} from '@/lib/render-workspace';
export const dynamic='force-dynamic';
export default async function PortalPage({params}:{params:Promise<{path?:string[]}>}){const current=await requirePage(),{path=[]}=await params;if(isTeamRole(current.role))redirect('/management'+(path.length?'/'+path.join('/') :''));return renderWorkspace(current,path);}
