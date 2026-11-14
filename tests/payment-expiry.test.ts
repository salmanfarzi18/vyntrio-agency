import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cashfreeExpiry} from '../lib/payment-expiry';

test('Cashfree receives a stable whole-second UTC expiry from PostgreSQL timestamps',()=>{
 const now=Date.parse('2026-11-14T08:40:00Z'),value='2026-11-14T09:10:00.959298+00:00';
 assert.equal(cashfreeExpiry(value,now),'2026-11-14T09:10:00Z');
 assert.equal(cashfreeExpiry(value,now+45000),cashfreeExpiry(value,now));
 assert.equal(cashfreeExpiry('2026-11-14T14:40:00.959298+05:30',now),cashfreeExpiry(value,now));
 assert.match(cashfreeExpiry(value,now),/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});
test('Invalid or nearly expired checkout windows cannot be sent to Cashfree',()=>{
 const now=Date.parse('2026-11-14T08:40:00Z');
 for(const value of ['not-a-date','2026-11-14T08:39:59Z','2026-11-14T08:40:30Z','2026-11-14T08:41:00Z'])assert.throws(()=>cashfreeExpiry(value,now),/checkout window has expired/);
});
