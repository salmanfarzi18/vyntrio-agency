import * as Sentry from '@sentry/node';
import {AUDIT_ERROR,privateCollection,privateErrorEvent} from './monitoring-privacy';
let started=false;
export function startServerMonitoring(){
 if(started||!process.env.NEXT_PUBLIC_SENTRY_DSN)return;
 started=true;
 Sentry.init({dsn:process.env.NEXT_PUBLIC_SENTRY_DSN,defaultIntegrations:false,dataCollection:{...privateCollection,httpBodies:[]},maxBreadcrumbs:0,beforeSend:privateErrorEvent});
}
export function reportServerError(error:unknown){
 try{startServerMonitoring();return started?Sentry.captureException(error instanceof Error?error:new Error('Unexpected application error')):undefined;}catch{return undefined;}
}
export async function testMonitoring(){
 const id=reportServerError(new Error(AUDIT_ERROR));
 return Boolean(id&&await Sentry.flush(4000));
}
export async function flushMonitoring(){try{await Sentry.flush(1500);}catch{/* Keep the original response. */}}
