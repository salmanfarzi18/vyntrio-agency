# VYNTRIO Agency Workspace

Next.js client/admin portal for the existing VYNTRIO Vercel site. The original landing page and branding are retained in public/landing.html; /login and /portal add the workspace.

Features: invite-only passwordless login; staff MFA; client-isolated projects; admin/staff/client roles; assigned team members; inquiry pipeline; milestones and client approvals; updates and internal notes; quotations and printable documents; invoices and Cashfree checkout; verified payment ledger; private file uploads; support conversations; email outbox; encrypted database/file backups; private Google Drive copies; legacy Sheets import and reporting; CSV exports; audit history; Turnstile and distributed rate limits.

## Development
Node 22+, then `npm ci`, `npm test`, `npm run typecheck`, `npm run dev`.
Prepare local environment from .env.example using private values. Never commit a populated environment file. Public config alone cannot grant admin access. `npm run build` validates the production bundle.

`/preview` is available only during local development, uses labelled fictional data, and prevents writes/payments. Production returns 404 for this route. `/login` clearly shows when the portal is not configured. A missing database configuration retains the existing inquiry/legacy webhook path during migration; production activation must verify the new configuration before switching traffic.

## Deployment
See docs/OPERATIONS.md for private service setup, migration, rollout, quotas and recovery. Existing production origin: https://vyntrio-agency.vercel.app/.

Use a preview deployment until the required service configuration and end-to-end checks pass. No secrets or client records are included in this repository. Example preview records are not imported into the database.
