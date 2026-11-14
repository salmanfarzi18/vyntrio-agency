# VYNTRIO live SaaS audit - 14 November 2026

## Release verdict
The SaaS preview has been deployed and audited. It is not yet approved for production cutover. The existing main website remains separate and unchanged.

## Automated checks
- 15 passing Node tests, including an embedded PostgreSQL policy/payment suite, a browser-handler simulation that verifies stable inquiry references across rotating Cloudflare tokens, read-only payment authentication checks, and concurrent request/user isolation of dashboard loading.
- TypeScript checks and successful Next.js production builds.
- 15 local production HTTP checks passed on the earlier audited build. The current suite has 17 checks, adding protected payment diagnostics and no-store assertions for private API denial responses. Rerunning the current suite was blocked by local network access (EACCES/timeout), so the latest 17-check suite is not recorded as passing.
- Signature, receipt expiry/binding, amount precision, encrypted-backup tamper/wrong-key rejection, Google bridge request/message deduplication, and CSV escaping.

## Live checks completed
- Owner email login and authenticator MFA; the invited audit client's verified email and sign-in are present in Auth.
- A labelled audit client/project, milestone review state, shared/internal notes, quotation, unpaid Sandbox invoice, support request/reply/resolution, and public inquiry saved in the database.
- The quotation document renders correctly. Seven audit business notifications show sent after one delivery attempt each; recipient inbox placement is not guaranteed by this status.
- Live client-claim database probes: one permitted project/profile; no internal notes, admin outbox records or audit records visible; direct payment insertion denied.
- 20 application tables with RLS, two private buckets; report function and service-only legacy-payment linking verified.
- Manual encrypted database snapshot completed and copied to private Google Drive. Drive independently lists the private snapshot; file retrieval through the Drive connector succeeds.
- Live 390px project layout: no document horizontal overflow.

## Defects corrected during the audit
- Missing manual backup route, caused by an overly broad Git ignore rule.
- Missing hosted legacy-payment linking function.
- Login throttling now reports the remaining fixed-window wait and a Retry-After value.
- Preview checkout uses a safe same-site anchor and displays Test Checkout; it cannot open the live payment form through the original direct link.
- Security-token refreshes no longer change the inquiry reference for unchanged project details.
- Fixed two mutable function search paths, removed browser execution grants on trigger functions, added 17 relationship indexes, and cached caller identity in seven RLS policies. The complete policy tests pass after the migration.

## Unfinished live acceptance checks
- Latest connection-check observation: Preview has no CASHFREE_ENV and reports missing payment configuration. Production-only values are not tested by a Preview build. Earlier 401 below refers to the previously configured audited Sandbox build, not a fresh test of Production keys.
- Cashfree Sandbox rejects the configured Preview key pair with HTTP 401 on the audited build. Order reservation succeeds; gateway checkout does not yet pass. Private values must be corrected by the owner and retested.
- External requests to the preview webhook hit Vercel Authentication. A proper reachable staging webhook path and signed Cashfree success/deduplication test are still needed; no protection was disabled.
- File selection through the browser extension remains blocked despite the user's permission change. Live upload/download is unverified. The portal backup-download browser event also timed out; successful Drive retrieval does not prove that portal download flow.
- Client milestone approval, quotation response and reply require the final customer-side interaction checks. Do not treat database read probes as a substitute for these UI actions.
- Full recovery into a fresh empty target, automatic scheduled production maintenance, Sheets reporting/import reconciliation, staff UI access, and production commercial hosting suitability are not signed off.
- A setup-key screenshot was previously shared; the owner must confirm fresh authenticator enrollment replaced that setup before launch. No setup key is included in this source.

## Speed and privacy follow-up
- Independent page queries now run concurrently using the current request's authenticated database client. Workspace Settings no longer fetches unused project/client/team lists (one summary query instead of four application queries, excluding identity checks).
- Internal workspace navigation uses Next.js links, with a branded loading state and a generic retry page. Download endpoints remain ordinary download links.
- API and auth responses explicitly request private/no-store caching; no cross-user data cache or optimistic payment success was introduced. A staff notification link now points to a permitted project page.
- These changes pass local tests and build. They are not a measured live latency guarantee. Browser-based Production inspection was stopped by an automatic approval-review usage limit; no restriction was bypassed and no Production deployment was changed.

## Advisor notices retained intentionally
- rate_limits is server-only with RLS and no client policy (default deny).
- Four caller-bound SECURITY DEFINER boolean helpers are intentionally callable by authenticated users because RLS depends on them. They check the authenticated identity/MFA/ownership; no browser payment-write function is exposed.
- Password leak protection remains disabled; this app uses passwordless invitations. Review provider password settings before adding password login.
- Newly added indexes can be reported unused on a small preview database. They were not removed just to clear the notice.

## Audit boundaries
Only clearly labelled audit records were created with the owner's approval. Real client records, Production environment values and the main deployment were not changed. No private service key was read, exported or committed. Vercel's direct protected-fetch tool was rejected because it would create a share link; browser-authenticated reads were retained. The Vercel connector's team access still returned 403 after the attempted consent flow, so its direct log reads are not counted as a pass. This audit is not a load test, penetration-test certification, uptime guarantee, or proof of bank settlement.

## Next sequence
1. Correct the Cashfree Test key pair privately in the actual project's Preview settings; verify a successful authenticated Cashfree API call.
2. Arrange an explicitly approved, reachable staging webhook path while preserving application access controls; verify success, amount mismatch rejection and duplicate event handling.
3. Finish client approval/reply and private-file upload/download checks.
4. Restore an encrypted snapshot into a fresh empty test target, then check restored records and files.
5. Reconcile legacy imports/reports, confirm a suitable commercial hosting plan, configure Production settings privately, and test a staged production build before requesting launch approval.
