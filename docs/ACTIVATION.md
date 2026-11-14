# Activate VYNTRIO SaaS on the existing Vercel project

The source is prepared; private keys are intentionally not included. Keep the existing main deployment until these steps and live checks pass. Do not paste this Next.js project into Apps Script.

## 1. Database
Your Supabase project is `kxwjkrfwtlgeeimceesj`:
`https://supabase.com/dashboard/project/kxwjkrfwtlgeeimceesj`

The app uses the public project URL `https://kxwjkrfwtlgeeimceesj.supabase.co`. The database migrations are in `supabase/migrations/`. For a new empty project, run 001, 002, 003, 004, then 20261114064431_harden_portal_audit.sql. Do not rerun 001 on an existing installed database. The existing project was checked on 14 November 2026: base tables, team policies, reports and the legacy-link function are present, and the hardening migration has been applied. All 20 application tables have row security enabled; both application storage buckets are private. See LIVE_AUDIT_STATUS.md for outstanding launch checks.

Under Supabase Auth, keep the Email provider enabled and disable public signups. Set the site URL to `https://vyntrio-agency.vercel.app` and allow `/auth/confirm` on your chosen site/preview host. Clients are invited from the owner dashboard. The first owner email defaults to `vyntrioagency@gmail.com`; change ADMIN_EMAIL before the first owner sign-in if needed.

## 2. Free Google email and offsite backups
1. Create a NEW, separate Apps Script project named “VYNTRIO SaaS Services”. Keep your working inquiry Code.gs project unchanged.
2. Paste `integrations/SaaSBridge.gs` into the new project's Code.gs.
3. Run `setupBridge`. Review and approve Google's access request yourself. It prepares a private delivery log, a private encrypted-backup folder, and a bridge secret.
4. Under Script properties, set LEGACY_SPREADSHEET_ID to the ID from your existing Google Sheet URL. Keep it private. Then deploy as Web app: Execute as **Me**, access **Anyone**. Sensitive actions still require a valid signed request and timestamp; the endpoint does not expose records publicly.
5. Copy its `/exec` URL and the `SAAS_BRIDGE_SECRET` Script property into the corresponding private Vercel variables below. Do not put them in GitHub or chat.

## 3. Spam protection
Create a free Cloudflare Turnstile widget with `vyntrio-agency.vercel.app` as an allowed hostname. For preview testing, add the exact stable Vercel branch-preview hostname too. Copy the site key and secret into their respective Vercel fields. Do not allow all of `vercel.app`.

## 4. Vercel environment variables
Open your EXISTING Vercel project → Settings → Environment Variables. Put real values there, never in the source archive. Configure Preview separately from Production where appropriate.

| Variable | What to enter |
|---|---|
| NEXT_PUBLIC_SITE_URL | `https://vyntrio-agency.vercel.app` in Production; use localhost for local development |
| NEXT_PUBLIC_SUPABASE_URL | `https://kxwjkrfwtlgeeimceesj.supabase.co` |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase publishable key |
| SUPABASE_SECRET_KEY | Supabase server secret key; never a NEXT_PUBLIC variable |
| ADMIN_EMAIL | `vyntrioagency@gmail.com`, or the email you control for owner access |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Cloudflare widget site key |
| TURNSTILE_SECRET_KEY | Cloudflare widget secret |
| RATE_LIMIT_SALT | A new random secret, at least 32 bytes |
| PAYMENT_LINK_SECRET | Another independent random secret, at least 32 bytes |
| STAFF_MFA_REQUIRED | `true` (production always enforces staff MFA) |
| CASHFREE_CLIENT_ID | Cashfree credentials matching the selected mode |
| CASHFREE_SECRET_KEY | Cashfree secret matching the selected mode |
| CASHFREE_ENV | `sandbox` for testing; `production` for real payments |
| EMAIL_PROVIDER | `apps-script` |
| EMAIL_BRIDGE_URL | New Google SaaS Services `/exec` URL |
| EMAIL_BRIDGE_SECRET | New bridge's `SAAS_BRIDGE_SECRET` property |
| CRON_SECRET | Another independent random secret, at least 32 bytes |
| BACKUP_ENCRYPTION_KEY | A new 32-byte random key encoded as base64; keep an offline recovery copy |
| BACKUP_BUCKET | `vyntrio-backups` |

`LEGACY_APPS_SCRIPT_URL` can retain the existing endpoint from `.env.example`. Resend variables are optional; they are used only after you own and verify an email domain and switch EMAIL_PROVIDER.

To generate ONE random value privately on your computer, run this yourself and copy the output directly to its private setting. Run it separately for each new secret:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
```

Do not send the output in chat. Email login links also stay private. They use a confirmation step so an email scanner does not consume the link just by opening it.

## 5. Preview and connect Cashfree
Use the SaaS source on a separate branch/preview first. The Vercel framework is declared as Next.js. The existing live site must remain on its working version while you configure and test the upgrade.

Keep your existing Payment Form webhook. Add a Payment Gateway **successful payment** webhook pointing to `https://vyntrio-agency.vercel.app/api/cashfree-webhook` when activating Production. For sandbox/staging, use its matching sandbox credentials and reachable staging endpoint. A preview protected by Vercel authentication cannot receive ordinary Cashfree webhook deliveries; choose a staging endpoint reachable by Cashfree while keeping client data protected by application login.

Workspace Settings now includes **Check payment connection**, available only to an MFA-verified owner/admin. It makes one read-only order lookup with a randomly generated absent order reference, never creates an order or moves money, and returns no credentials/customer data. Only Cashfree's specific `404 order_not_found` response is treated as evidence that the read request passed authentication; generic errors remain unconfirmed. This does not prove checkout permission, signed webhook delivery, or bank settlement. The displayed deployment and mode identify which environment's saved keys were checked. Production-only keys cannot be checked by clicking this button in a Preview build.

Saving Production variables does not deploy the SaaS. Keep the Production Payment Gateway webhook form unsaved until a staged Production backend has been deployed and checked. Do not point Production Cashfree at a protected Preview endpoint or replace the existing Payment Form webhook.

New checkout orders are generated by the backend against an inquiry or invoice ID. Browsing to the return page never marks a payment paid. The webhook verifies the signature and expected order amount, then records it once. Check bank settlement separately in Cashfree.

## 6. Required live acceptance checks
1. Request the owner login link; open it yourself and complete authenticator MFA.
2. In Settings, confirm database, Google bridge, quota, spam protection and payment mode.
3. Invite a test client. Confirm the invitation arrives and that client can see only their own project.
4. Add a milestone; send it for review; have the client approve it.
5. Send a quotation and payment request. Test sandbox checkout and signed webhook delivery. A real-money test must be performed by you.
6. Upload a small test file. Confirm an unauthorized client cannot download it.
7. Run a backup, check the encrypted offsite copy, and perform a restore into a new empty test database using the recovery instructions.
8. Import earlier Sheets records, review any unmatched payment, and compare totals. Never trust editable spreadsheet payment text as payment proof.
9. Only then promote the tested source to the existing Production project.

After successful cutover, the database is authoritative. Settings → Update Sheets report creates separate reporting tabs. Retire the old anonymous inquiry-submission action once the new form is proven; keep signed legacy payment notifications available for any outstanding old orders. The old public endpoint should not remain an alternative path for accepting unprotected new inquiries.

## Limits and ownership
No new live email, login, backup restore or checkout has been verified merely by preparing this source. See OPERATIONS.md and VERIFICATION.md for the exact checks performed. You chose to enter all private values yourself.

Vercel Hobby is restricted to personal/non-commercial use. Confirm a suitable plan before commercial launch; no purchase or upgrade has been made. Supabase Free may pause inactive projects. Consumer Google accounts have a limited daily recipient quota. These are free-tier starting limits, not an uptime or zero-delay guarantee.

