import 'server-only';
import {env} from './config';
export function cashfreeBase(){return process.env.CASHFREE_ENV==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';}
export class CashfreeError extends Error{constructor(public status:number,public code='request_failed'){super('Cashfree request failed');this.name='CashfreeError';}}
export async function cashfree(path:string,body?:unknown,idempotencyKey?:string){
 const response=await fetch(cashfreeBase()+path,{method:body?'POST':'GET',headers:{'x-client-id':env('CASHFREE_CLIENT_ID'),'x-client-secret':env('CASHFREE_SECRET_KEY'),'x-api-version':'2025-01-01','Content-Type':'application/json',...(idempotencyKey?{'x-idempotency-key':idempotencyKey}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(!response.ok){
  const details=await response.json().catch(()=>null);
  const code=typeof details?.code==='string'&&/^[a-z_]{1,80}$/.test(details.code)?details.code:'request_failed';
  // Only provider error category/status are logged, never credentials or customer payloads.
  console.error('Cashfree API request failed',{status:response.status,code,operation:body?'create-order':'read-order',mode:process.env.CASHFREE_ENV==='production'?'production':'sandbox'});
  throw new CashfreeError(response.status,code);
 }
 return response.json();
}
