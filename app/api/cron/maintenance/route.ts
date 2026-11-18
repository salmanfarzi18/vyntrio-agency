import {adminDb} from '@/lib/supabase';
import {env,AGENCY_ID} from '@/lib/config';
import {assert,errorResponse,safeEqual} from '@/lib/security';
import {dispatchEmails} from '@/lib/notifications';
import {createBackup} from '@/lib/backups';
import {dailyBackupId} from '@/lib/backup-claim';
export const maxDuration=60;
export async function GET(request:Request){
 try{
  assert(safeEqual(request.headers.get('authorization')||'','Bearer '+env('CRON_SECRET')),401,'Unauthorized.');
  const task=new URL(request.url).searchParams.get('task');
  assert(!task||task==='email',400,'Unknown maintenance task.');
  if(task==='email')return Response.json({ok:true,...await dispatchEmails(5)});
  const db=adminDb();
  await db.from('rate_limits').delete().lt('window_start',new Date(Date.now()-2*86400000).toISOString());
  const [emails,backup]=await Promise.allSettled([dispatchEmails(2),createBackup(dailyBackupId(AGENCY_ID))]);
  if(backup.status==='rejected')throw backup.reason;
  assert(!backup.value.filesPending,503,'Database snapshot saved, but file backups require attention.');
  return Response.json({ok:true,...backup.value,emailStatus:emails.status});
 }catch(error){return errorResponse(error);}
}
