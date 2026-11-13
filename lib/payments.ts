import 'server-only';
import {env} from './config';
export function cashfreeBase(){return process.env.CASHFREE_ENV==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';}
export class CashfreeError extends Error{constructor(public status:number){super('Cashfree request failed');}}
export async function cashfree(path:string,body?:unknown,idempotencyKey?:string){const response=await fetch(cashfreeBase()+path,{method:body?'POST':'GET',headers:{'x-client-id':env('CASHFREE_CLIENT_ID'),'x-client-secret':env('CASHFREE_SECRET_KEY'),'x-api-version':'2025-01-01','Content-Type':'application/json',...(idempotencyKey?{'x-idempotency-key':idempotencyKey}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new CashfreeError(response.status);return response.json();}
