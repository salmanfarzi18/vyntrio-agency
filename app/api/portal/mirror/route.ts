import {requireIdentity} from '@/lib/auth';
import {assert,errorResponse,requireSameOrigin} from '@/lib/security';
import {mirrorToSheets} from '@/lib/mirror';
export const maxDuration=60;
export async function POST(request:Request){try{requireSameOrigin(request);const current=await requireIdentity(true);assert(['owner','admin'].includes(current.role),403,'Only an admin can update the Sheets report.');await mirrorToSheets();return Response.json({ok:true});}catch(error){return errorResponse(error);}}
