# VYNTRIO launch readiness — 16 November 2026

## Decision

The application exists and is already accessible on the Vercel address. It is **not yet signed off as an end-to-end production launch**. The owner selected migration to Netlify Free for commercial use, rather than purchasing Vercel Pro. Netlify account/repository onboarding is underway. Domain requested: `vyntrio.in`; availability/ownership is not verified. No purchase has been made by the agent.

## Evidence and the 15 launch checks

| # | Check | Status and evidence | Remaining acceptance |
|---|---|---|---|
| 1 | Forms, payments, email | Partial. Existing database contains 4 paid inquiries, 3 paid gateway orders, 43 sent notifications. Automated tests cover verified/deduplicated payments and retryable inquiries. | Fresh labelled inquiry → owner performs ₹1 payment → signed webhook → paid database status → actual client inbox → workspace on final host. Records alone do not prove settlement or inbox placement. |
| 2 | Real mobile devices | Pending. Prior version was checked at 320/390/1440 CSS widths; that is not physical-device testing. | Owner has Android, no iPhone. Test Android; arrange iOS Safari or a device-testing service before signing off iOS. Retest new assets on final deployment. |
| 3 | Links and 404 | Local pass: public routes, custom 404, 55 cacheable assets and internal anchors checked. | Scan final deployed URLs and external destinations after domain cutover. |
| 4 | SSL / HTTPS | Existing Vercel host: HTTP 308 to HTTPS, valid HTTPS fetch, HSTS present. | New Netlify URL/domain SSL issuance and forced HTTPS verification after DNS. |
| 5 | Secrets and access | Production dependency audit: 0 known vulnerabilities. Public-file credential pattern scan: 0 matches. All 20 application tables use RLS; both storage buckets are private. Existing tests cover client isolation, MFA, denied forged payments and private no-store responses. | Private keys entered by owner in new host. Check Auth settings, rotate any previously exposed authenticator enrollment and review disabled leaked-password protection. A pattern scan is not a full penetration test/history audit. |
| 6 | Policies and cookies | Prepared dedicated Privacy, Terms, Refund and Cookie URLs, privacy contact, data-use/provider/retention notices and optional analytics opt-in. Removed unverified template testimonials and labelled portfolio examples as illustrative concepts. | Owner confirms legal identity, business contact/retention practices, refund terms and obtains appropriate India DPDP/consumer-law review. These pages are not a legal compliance certification. |
| 7 | SEO / Google | Prepared robots.txt, sitemap.xml, canonical tags and indexable public pages; private workspace/auth routes remain noindex. Previews are noindex. | Own final domain → verify Google Search Console → submit sitemap and request indexing. Google controls crawl/index time. |
| 8 | Speed / images | Homepage HTML reduced from 5,058,694 bytes to about 190 KB. PNGs moved to WebP; TTFs compressed from 1,958,216 to 670,856 bytes total. Content-hashed assets get immutable caching. | Google PageSpeed API returned HTTP 429 shared quota; no live LCP/CLS score certified. Run PageSpeed on final deployment; target mobile LCP <2.5s, CLS <0.1, INP <200ms. Real field data needs real visitors. |
| 9 | Share previews | Prepared branded favicon, Apple icon, 1200×630 preview, title/description, OG/Twitter tags and canonical URLs. | Inspect real WhatsApp/LinkedIn previews; caches may need refreshing. |
| 10 | GA4 | Consent-gated public analytics code is prepared. Only explicit opt-in loads Google; confirmed inquiry save emits generate_lead, with no form contents or tokens. | Owner creates GA4 web stream, sets public measurement ID privately in hosting settings, then verifies consent behavior and DebugView. No live GA4 property is connected yet. |
| 11 | Capacity | Local production benchmark: 100 simultaneous homepage requests, 0 failures, p95 193 ms; 1,000 simultaneous homepage requests, 0 failures, p95 1,495 ms. | This is homepage HTML from a single local server, not 1,000 hosted browsers or database/payment concurrency. Budgeted hosted ramp test after monitoring and host setup. Stop on errors or quota pressure. |
| 12 | Slow networks | Payload work completed; no measured Slow 4G browser run yet. | Chrome DevTools Slow 4G, disabled cache; test first view, menus, inquiry, errors and checkout. |
| 13 | Edge cases | 41 automated tests pass plus 31 anonymous/invalid-input HTTP checks. Coverage includes idempotent inquiry references, malformed data, payment amount precision, signatures, duplicates and expired tokens. | Browser checks: empty/invalid fields, double clicks, CAPTCHA expiry, dropped connection and pending payment without a second charge on final host. |
| 14 | Monitoring | Minimal non-sensitive `/api/health` liveness endpoint prepared. Existing private owner health diagnostics retained. | No UptimeRobot/Better Stack/Sentry account is connected. Create monitor, error project, privacy filters and alert destination; induce a safe test incident to confirm notification. Liveness alone does not prove DB/email health. |
| 15 | Backups | Three completed snapshots; daily runs on 15 and 16 November include private Google Drive offsite status. Latest: 139 records, completed 16 Nov at 07:59 IST. One stored project file reports backed up. AES-256-GCM/tamper tests pass. | Full restore into a fresh isolated target with records/files/permissions/login verification; offline recovery-key copy. Enable one scheduler after cutover; verify next scheduled run. Current snapshot does not preserve old Auth sessions/MFA or provider settings. |

## Database advisor interpretation

- `rate_limits` is intentionally server-only: RLS with no client policy denies browser access.
- Four identity/ownership boolean SECURITY DEFINER helpers are used by RLS; existing policy tests cover isolation. Do not blindly revoke them and break policies.
- Leaked-password protection is disabled and should be reviewed now that management password login exists. Staff MFA remains required.
- Unused relationship indexes are informational on this small data set; they were not deleted merely to clear notices.

## One-week execution sequence (16–23 November, IST)

1. **16 Nov:** technical audit, asset reduction, SEO/policy/consent work, isolated tests, Netlify import.
2. **17 Nov:** owner enters private host settings; verify sign-in/MFA, Turnstile, email and checkout on the new host; set up monitoring accounts.
3. **18 Nov:** domain purchase by owner, attach domain and exact provider DNS records, TLS; update Supabase URLs, Turnstile host allowlist and Cashfree domain/webhook.
4. **19 Nov:** complete labelled payment/client/file journeys and Android checks; arrange iOS Safari check.
5. **20 Nov:** budgeted hosted traffic ramp, Slow 4G/PageSpeed checks, fix failures; inspect quota/cost headroom.
6. **21 Nov:** isolated restore drill and alert delivery test; confirm policies and final public copy.
7. **22–23 Nov:** final domain acceptance, Search Console verification/sitemap/indexing request, monitor and release verdict. Index appearance/ranking date is not guaranteed.

Do not declare all 15 checks passed while the remaining acceptance items above are open. Do not promise no lag, no crashes, instant email or unlimited free capacity.

## Netlify migration procedure

Use this repository as a full Next.js app, not a static folder upload. Base directory blank; build `npm run build`; publish `.next`; Node 22. `netlify.toml` includes native public-page rewrites and the adapter handles authenticated/API routes. The scheduled function stays disabled until `ENABLE_SCHEDULED_MAINTENANCE=true` is explicitly set.

Owner enters the same private Supabase, Cashfree, bridge, encryption and protection settings listed in ACTIVATION.md. Do not print/export old secrets or put them in the repo. Use the exact same backup encryption key and keep the offline recovery copy. Change NEXT_PUBLIC_SITE_URL to the verified new primary URL. Keep PAYMENTS_ENABLED=false until the new hostname is approved and the connection/checkout are ready for a supervised test.

Update Supabase Auth Site URL and allowed confirmation redirects, Cloudflare widget exact hostnames, Cashfree Production whitelist and webhook `/api/cashfree-webhook`. Confirm new-domain DNS/HTTPS before changing links. Preserve MX and other email records. Do not enable two daily schedulers; stop the old one only after the new one is ready and verified.

Netlify Free supports commercial projects but current credit-based accounts have a 300-credit monthly hard limit and no auto-recharge. A free plan is not a high-traffic guarantee. Supabase Free may pause inactive projects; Apps Script consumer email has daily quotas. Monitor usage and upgrade before those limits threaten service.

## Authoritative references

- https://vercel.com/docs/plans/hobby
- https://www.netlify.com/blog/introducing-netlify-free-plan/ (commercial-use statement; use current pricing, not this old post's quotas)
- https://www.netlify.com/pricing/
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://docs.netlify.com/build/functions/scheduled-functions/
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://developers.google.com/search/docs/fundamentals/get-on-google
- https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa
