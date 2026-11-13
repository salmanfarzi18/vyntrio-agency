import {notFound} from 'next/navigation';
import {needsMfa,requirePage} from '@/lib/auth';
import {portalData} from '@/lib/portal-data';
import {Portal} from '@/components/portal';
import {SecurityPanel} from '@/components/security-panel';
export const dynamic='force-dynamic';
export default async function PortalPage({params}:{params:Promise<{path?:string[]}>}){const current=await requirePage(),{path=[]}=await params;const section=path[0]||'overview',id=path[1];if(!['overview','inquiries','clients','projects','payments','legacyPayments','invoices','quotes','tickets','notifications','backups','activity','account','security','settings','team'].includes(section)||path.length>2)notFound();if(!['owner','admin'].includes(current.role)&&['inquiries','clients','legacyPayments','notifications','backups','activity','settings','team'].includes(section))notFound();if(current.role==='staff'&&['payments','invoices','quotes'].includes(section))notFound();if(needsMfa(current)||section==='security')return <SecurityPanel required={needsMfa(current)} name={current.profile?.full_name||current.user.email!}/>;return <Portal key={section+':'+id} data={await portalData(current,section,id)}/>;}
