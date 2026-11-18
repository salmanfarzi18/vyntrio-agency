import type {ErrorEvent} from '@sentry/browser';

export const AUDIT_ERROR='VYNTRIO AUDIT - Error reporting verification';
export const privateCollection={userInfo:false,cookies:false,httpHeaders:false,httpBodies:[],urlQueryParams:false,graphQL:{document:false,variables:false},genAI:{inputs:false,outputs:false},mcp:{inputs:false,outputs:false},databaseQueryData:false,queues:false,stackFrameVariables:false,frameContextLines:0} as const;

// Rebuild an allowlisted event. Error messages, URLs and SDK enrichment can contain
// client records or sign-in credentials, so they never cross this boundary.
export function privateErrorEvent(event:ErrorEvent):ErrorEvent|null{
 if(event.type!==undefined)return null;
 const values=event.exception?.values?.map(value=>({
  type:['Error','TypeError','RangeError','ReferenceError','SyntaxError','URIError','EvalError'].includes(value.type||'')?value.type:'Error',
  value:value.value===AUDIT_ERROR?AUDIT_ERROR:'Unexpected application error',
  stacktrace:{frames:value.stacktrace?.frames?.map(frame=>({
   filename:(frame.filename||'').split(/[?#]/)[0].split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,100)||'application',
   lineno:frame.lineno,colno:frame.colno,in_app:frame.in_app
  }))||[]}
 }))||[{type:'Error',value:'Unexpected application error'}];
 return {type:undefined,event_id:event.event_id,timestamp:event.timestamp,platform:event.platform,environment:process.env.NODE_ENV==='production'?'production':'development',level:'error',exception:{values}};
}
