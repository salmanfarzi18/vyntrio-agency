# VYNTRIO Production release — 14 November 2026

The SaaS is deployed at https://vyntrio-agency.vercel.app. This is a deployment record, not a claim that every acceptance check or a real-money transaction has passed.

## Deployed application
- Website: https://vyntrio-agency.vercel.app/
- Sign-in: https://vyntrio-agency.vercel.app/login
- Owner/client workspace: https://vyntrio-agency.vercel.app/portal
- Initial application release: b0ec304501853816b83a6b71fa08d653396af24a, main branch. Subsequent main commits record the launch and add the checkout pause described below.
- Initial promoted deployment: dpl_6HBjCkp2TniWow2yx4GqfV6USqAa, READY. Current deployment follows the latest successful main build.
- Function region: hnd1 (Tokyo); Node.js 22; Next.js.
- Previous production deployment retained for rollback: dpl_S6riB3Nrhtj2A9D5jcAKZCt6i9s2. Do not delete it until the new customer flows are accepted.

## Configuration completed
- With the owner's specific approval, existing database, email, anti-spam, backup, rate-limit and authentication settings were enabled for Production without reading or changing their private values.
- Cashfree Production credentials remain separate from Preview credentials. Runtime configuration reports production mode and an enabled portal; this does not prove Cashfree accepted an API request.
- Supabase Auth's default site and exact /auth/confirm callback now include the public Production address. The existing exact Preview callback was retained.
- Main now contains the SaaS source. The domain promotion completed and automatic Production domain assignment for later main builds was restored.
- Existing database records, legacy Google Sheet records, and the legacy Payment Form configuration were not deleted or bulk-migrated.

## Verified
- Fifteen automated Node tests and TypeScript/Next.js build checks passed before release.
- Seventeen harmless anonymous HTTP checks passed against the public domain after promotion: homepage/login, sign-in redirect, disabled demo, private API access denial, origin checks, invalid inquiry rejection, unsigned webhook rejection and public configuration shape.
- The unauthenticated /portal response uses Next.js's streamed login redirect. Its HTTP 200 shell contains the explicit /login redirect and no agency workspace; private responses are no-store.
- Before domain promotion, the same configured Production backend served the authenticated owner workspace and reported the database and Google bridge connected. An encrypted snapshot and private Drive copy were verified during the preceding audit.
- The homepage's client login link points to the public /login page. The public login page renders the Cloudflare human-verification widget.
- A Production error/fatal log query returned no entries for the inspected fifteen-minute window. This is a bounded observation, not an uptime guarantee.

## Still requires acceptance
- Owner sign-in on the public hostname and authenticator completion were subsequently confirmed by the owner. A missing-email concern was resolved by using the agency Gmail inbox instead of the connected personal Gmail account. No private sign-in link or authenticator code was read.
- The owner ran the Production Cashfree connection check: access was rejected (the initial UI grouped 401/403). New online checkout is paused with PAYMENTS_ENABLED=false while this is corrected. Inquiry saving, sign-in and the dashboard stay available. The improved check reports the safe HTTP status/category without returning keys.
- Cashfree authenticated connection, a user-performed real payment, and signed webhook success/duplicate handling remain unfinished. No real payment was initiated by the agent. The unsigned webhook endpoint is externally reachable and rejects missing signatures.
- Client approvals/replies, live private-file upload/download, full restore into an empty target, and legacy report/import reconciliation remain unfinished.
- Consumer email quotas, Supabase Free availability and commercial hosting suitability remain operational limits to review. There is no promise of zero delay, perfect security or guaranteed inbox placement.
- Rotate the previously shared authenticator setup if that enrollment has not already been replaced; never share a setup QR, setup key, email link or one-time code.

## Owner's next checks
1. Sign in using vyntrioagency@gmail.com. In Gmail, use that account's inbox, not another connected personal account. Open the newest VYNTRIO sign-in email privately and complete the existing authenticator step.
2. Open Workspace Settings and select Check payment connection once. HTTP 401 requires the matching Production Payment Gateway key pair to be re-entered privately in Vercel and redeployed. HTTP 403 requires review of account/API activation and access restrictions. Do not blindly disable IP restrictions or share credentials.
3. Keep PAYMENTS_ENABLED=false until the read-only connection check is accepted. Enabling checkout requires an explicit true value and redeployment; then perform the INR 1 test yourself against a labelled inquiry. Confirm payment/order identifiers and paid status in the workspace, separately from bank settlement in Cashfree. A failed checkout must not stop inquiry saving.
4. Complete the remaining customer, file and recovery acceptance checks before describing the system as fully verified.

The older LIVE_AUDIT_STATUS.md describes the preceding audit. This release record supersedes its earlier statements that main and Production were unchanged.

## Checkout expiry correction
After the owner corrected the private Production key pair, Cashfree accepted the read-only API check and checkout was enabled for a manual test. That test hit `order_expiry_time_invalid` during order creation; it did not reach a created Cashfree order in the inspected failures. No signed payment or bank settlement is inferred from a failed creation request.

The fix converts the persisted PostgreSQL timestamp to whole-second UTC ISO before sending it to Cashfree. A separate migration sets new reservations to a whole-second 30-minute window. Existing order/payment records are not rewritten. Regression tests cover timestamp precision, offsets, stable retry payloads, near-expiry rejection and the database lease duration. Nineteen tests and the production build pass; a fresh live checkout still requires user verification.
