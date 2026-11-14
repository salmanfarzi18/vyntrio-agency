# Verification and release status

**Updated 14 November 2026:** Read [LIVE_AUDIT_STATUS.md](LIVE_AUDIT_STATUS.md) for current deployed checks, corrected defects and remaining blockers. The sections below describe the earlier source-preparation baseline, before private connections and the live audit.

## Automated checks
- TypeScript route and application type checks.
- Production Next.js build.
- Embedded PostgreSQL migrations and access-control tests: anonymous/client separation, cross-client access denial, staff assignment, staff MFA at the database layer, finance restrictions, role/email mutation denial, expected-amount verification, duplicate payment handling, reserved checkout reuse, and six-month collection totals.
- Exact-body Cashfree signature checks, forged-message rejection, receipt expiry/binding, integer currency validation.
- Authenticated encryption round-trip and tamper/wrong-key rejection.
- Google service bridge signature/timestamp rejection and repeated-email-ID deduplication using mocks.
- CSV quoting/newlines and formula-prefix escaping.
- Local production HTTP smoke checks: public landing/login, authenticated route redirects, private API denial, CSRF rejection, invalid inquiry rejection, unsigned webhook rejection, production preview disabled, public config without server keys.

## Browser checks
The local development UI was inspected on desktop and at a 390px mobile viewport, including navigation, project tabs, and layout overflow. Fictional records are labelled and are not inserted into the database. The preview route is disabled in production.

## External setup
The user's new Supabase project was prepared with the application tables and access policies. The existing Vercel live website and original inquiry/payment Apps Script remain separate from the upgrade.

The owner selected manual entry of all private service keys. Consequently real sign-in/email delivery, Turnstile validation, new Cashfree checkout/webhook integration, offsite backup delivery, full restore, legacy import, and commercial hosting suitability still require the activation checks. A successful local build is not evidence those external services are configured.
