import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPaymentConnection} from '../lib/payment-connection';

test('Payment connection checks are read-only, mode-bound and never return credentials',async()=>{
  for(const mode of ['sandbox','production']){
    let calls=0;
    const result=await checkPaymentConnection({mode,clientId:'private-app',secretKey:'private-secret'},async(url,options)=>{
      calls++;assert.match(String(url),new RegExp('^https://'+(mode==='production'?'api':'sandbox')+'\\.cashfree\\.com/pg/orders/vyn_check_[a-f0-9]{32}$'));
      assert(new URL(String(url)).pathname.split('/').at(-1)!.length<=45);assert.equal(options?.method,'GET');assert.equal(options?.body,undefined);assert.equal(options?.redirect,'error');
      return Response.json({code:'order_not_found'},{status:404});
    });
    assert.equal(calls,1);assert.equal(result.status,'accepted');assert(!JSON.stringify(result).includes('private-'));
  }
});
test('Payment connection never treats rejected access, a generic 404 or a timeout as success',async()=>{
  const settings={mode:'production',clientId:'private-app',secretKey:'private-secret'};
  for(const status of [401,403,404,429,500]){
    const result=await checkPaymentConnection(settings,async()=>Response.json({code:'unexpected',secret:'private-secret'},{status}));
    assert.notEqual(result.status,'accepted');assert(!JSON.stringify(result).includes('private-secret'));
    if(status===401||status===403){assert.equal(result.providerStatus,status);assert.match(result.message,new RegExp('HTTP '+status));}
  }
  assert.equal((await checkPaymentConnection(settings,async()=>{throw Error('private-secret');})).status,'unconfirmed');
  const never=async()=>{throw Error('must not request');};
  assert.equal((await checkPaymentConnection({...settings,mode:'prod'},never)).status,'needs_setup');
  assert.equal((await checkPaymentConnection({...settings,secretKey:''},never)).status,'needs_setup');
  assert.equal((await checkPaymentConnection({...settings,secretKey:' trailing '},never)).status,'needs_setup');
});
test('Online checkout fails closed until explicitly enabled',async()=>{
  const {paymentsEnabled}=await import('../lib/config');const saved=process.env.PAYMENTS_ENABLED;
  try{for(const value of [undefined,'false','1','TRUE','true ']){if(value===undefined)delete process.env.PAYMENTS_ENABLED;else process.env.PAYMENTS_ENABLED=value;assert.equal(paymentsEnabled(),false);}process.env.PAYMENTS_ENABLED='true';assert.equal(paymentsEnabled(),true);}
  finally{if(saved===undefined)delete process.env.PAYMENTS_ENABLED;else process.env.PAYMENTS_ENABLED=saved;}
});
