import {randomUUID} from 'node:crypto';

// A deliberately absent order checks authentication without creating an order,
// reserving a payment, returning customer data, or moving money.
export async function checkPaymentConnection(
  settings:{mode?:string;clientId?:string;secretKey?:string},
  request:typeof fetch=fetch,
){
  const mode=settings.mode;
  if(mode!=='sandbox'&&mode!=='production')return {status:'needs_setup',message:'Set CASHFREE_ENV to sandbox or production.'};
  if(!settings.clientId||!settings.secretKey)return {status:'needs_setup',message:'Save the matching Cashfree App ID and Secret Key for this environment.'};
  if(settings.clientId!==settings.clientId.trim()||settings.secretKey!==settings.secretKey.trim())return {status:'needs_setup',message:'Remove leading or trailing spaces from the saved Cashfree credentials.'};
  const base=mode==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';
  try{
    const response=await request(base+'/orders/vyn_connection_'+randomUUID().replaceAll('-',''),{
      method:'GET',cache:'no-store',redirect:'error',
      headers:{'x-client-id':settings.clientId,'x-client-secret':settings.secretKey,'x-api-version':'2025-01-01'},
      signal:AbortSignal.timeout(15000),
    });
    const body=await response.json().catch(()=>null);
    const providerCode=typeof body?.code==='string'&&/^[a-z_]{1,80}$/.test(body.code)?body.code:undefined;
    if(response.status===401||response.status===403){
      const message=response.status===401
        ?`Cashfree returned HTTP 401: authentication failed. Re-enter the matching ${mode==='production'?'Production':'Test'} Payment Gateway App ID and Secret Key for this environment. Do not use credentials from another payment mode or Payouts.`
        :'Cashfree returned HTTP 403: access was forbidden. Check Payment Gateway API activation and account/IP access restrictions in Cashfree; do not disable security protections blindly.';
      console.warn('Cashfree connection check rejected',{status:response.status,code:providerCode||'not_provided',mode});
      return {status:'rejected',providerStatus:response.status,providerCode,message};
    }
    // A generic proxy 404 is not evidence of accepted credentials.
    if(response.status===404&&body?.code==='order_not_found')return {status:'accepted',message:'Cashfree accepted this read-only API check. Checkout and webhook delivery still need verification.'};
    return {status:'unconfirmed',message:'Cashfree did not return the expected authentication-check response. Review its API logs; no payment was created.'};
  }catch{return {status:'unconfirmed',message:'Could not confirm the Cashfree connection. No payment was created. Please retry later.'};}
}
