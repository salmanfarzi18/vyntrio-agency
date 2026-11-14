import {notFound} from 'next/navigation';
import {type Identity,needsMfa} from './auth';
import {portalData} from './portal-data';
import {Portal} from '@/components/portal';
import {SecurityPanel} from '@/components/security-panel';
export async function renderWorkspace(current:Identity,path:string[]){
 const section=path[0]||'overview',id=path[1];
 if(!['overview','inquiries','clients','projects','payments','legacyPayments','invoices','quotes','tickets','notifications','backups','activity','account','security','settings','team'].includes(section)||path.length>2)notFound();
 if(!['owner','admin'].includes(current.role)&&['inquiries','clients','legacyPayments','notifications','backups','activity','settings','team'].includes(section))notFound();
 if(current.role==='staff'&&['payments','invoices','quotes'].includes(section))notFound();
 if(needsMfa(current)||section==='security')return <SecurityPanel required={needsMfa(current)} name={current.profile?.full_name||current.user.email!}/>;
 return <Portal key={section+':'+id} data={await portalData(current,section,id)}/>;
}
