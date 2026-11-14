import 'server-only';
import {identity} from './auth';
import {assert} from './security';
import {isTeamRole} from './management-policy';
export async function managementIdentity(){const current=await identity();assert(current,401,'Please sign in to management.');assert(isTeamRole(current.role),403,'This area is for the VYNTRIO management team.');return current;}
