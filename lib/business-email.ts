import {createHmac,randomUUID} from 'node:crypto';
import {env} from './config';
export function businessEmailConfigured(){return Boolean(process.env.EMAIL_SENDER_BRIDGE_URL||process.env.EMAIL_SENDER_BRIDGE_SECRET);}
export async function businessEmailBridge(action:'email'|'health',payload:Record<string,unknown>,fetcher:typeof fetch=fetch){
 const rawBody=JSON.stringify({id:randomUUID(),action,...payload}),timestamp=String(Date.now());
 const signature=createHmac('sha256',env('EMAIL_SENDER_BRIDGE_SECRET')).update(timestamp+rawBody).digest('base64');
 const response=await fetcher(env('EMAIL_SENDER_BRIDGE_URL'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'saasBridge',rawBody,timestamp,signature}),redirect:'follow',signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok||result.ok!==true||result.sender!=='vyntrioagency@gmail.com')throw Error('Business email sender could not be verified.');
 return result;
}
