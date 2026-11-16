import {redirect} from 'next/navigation';
import {identity} from '@/lib/auth';
import {managementSessionReady} from '@/lib/management-policy';
import {backupKeyRecoveryEnabled} from '@/lib/backup-key-recovery';
import {Brand} from '@/components/brand';
import {BackupKeyRecovery} from '@/components/backup-key-recovery';

export const metadata={title:'Private backup key recovery',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function RecoveryPage(){
 const current=await identity();
 if(!current||current.role!=='owner'||!managementSessionReady(current.role,current.assurance,current.methods,current.mfaMethod))redirect('/management/login');
 return <main className="standalone"><Brand subtitle="MANAGEMENT"/><h1>Recover your backup key</h1>
  {backupKeyRecoveryEnabled()?<BackupKeyRecovery/>:<p>Temporary recovery is unavailable on this deployment.</p>}
 </main>;
}
