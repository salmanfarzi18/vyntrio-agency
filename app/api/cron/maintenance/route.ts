import {adminDb} from '@/lib/supabase';
import {env} from '@/lib/config';
import {assert,errorResponse,safeEqual} from '@/lib/security';
import {dispatchEmails} from '@/lib/notifications';
import {createBackup} from '@/lib/backups';
export const maxDuration=60;
export async function GET(request:Request){try{assert(safeEqual(request.headers.get('authorization')||'','Bearer '+env('CRON_SECRET')),401,'Unauthorized.');const db=adminDb();await db.from('rate_limits').delete().lt('window_start',new Date(Date.now()-2*86400000).toISOString());const [emails,backup]=await Promise.allSettled([dispatchEmails(2),createBackup()]);if(backup.status==='rejected')throw backup.reason;return Response.json({ok:true,...backup.value,emailStatus:emails.status});}catch(error){return errorResponse(error);}}
