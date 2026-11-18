import * as Sentry from '@sentry/browser';
import {privateCollection,privateErrorEvent} from './monitoring-privacy';
let started=false;
export function startBrowserMonitoring(){
 if(started||typeof window==='undefined'||!process.env.NEXT_PUBLIC_SENTRY_DSN)return;
 started=true;
 Sentry.init({dsn:process.env.NEXT_PUBLIC_SENTRY_DSN,defaultIntegrations:false,dataCollection:{...privateCollection,httpBodies:[]},maxBreadcrumbs:0,beforeSend:privateErrorEvent});
 window.addEventListener('error',event=>reportBrowserError(event.error||new Error('Unexpected application error')));
 window.addEventListener('unhandledrejection',event=>reportBrowserError(event.reason));
}
export function reportBrowserError(error:unknown){
 try{startBrowserMonitoring();if(started)Sentry.captureException(error instanceof Error?error:new Error('Unexpected application error'));}catch{/* Reporting must never interrupt the workspace. */}
}
startBrowserMonitoring();
