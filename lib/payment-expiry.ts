import {assert} from './security';

// PostgREST timestamps may contain six fractional digits and a +00:00 offset.
// Send the whole-second UTC ISO form illustrated by Cashfree's Orders API.
// Keep this derived from the persisted reservation so retries are identical.
export function cashfreeExpiry(value:string,now=Date.now()){
 const milliseconds=new Date(value).getTime();
 assert(Number.isFinite(milliseconds)&&milliseconds>now+60000,409,'This checkout window has expired. Please refresh your inquiry or invoice before trying again.');
 return new Date(milliseconds).toISOString().replace(/\.\d{3}Z$/,'Z');
}
