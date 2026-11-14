import {requireIdentity,audit} from '@/lib/auth';
import {createBackup} from '@/lib/backups';
import {limit} from '@/lib/protection';
import {assert,errorResponse,requireSameOrigin} from '@/lib/security';

export const runtime='nodejs';
export const maxDuration=60;

export async function POST(request:Request){
  try{
    requireSameOrigin(request);
    const current=await requireIdentity(true);
    assert(['owner','admin'].includes(current.role),403,'Only an agency admin can create backups.');
    await limit(request,'manual-backup',3,3600,current.user.id);
    const result=await createBackup();
    await audit(current.user.id,'createBackup','backup',result.id);
    return Response.json({ok:true,...result,message:result.filesPending
      ? `Database snapshot saved. ${result.filesPending} file backups still need attention; review the backup record.`
      : 'Encrypted backup completed and copied to private Google Drive.'});
  }catch(error){return errorResponse(error);}
}
