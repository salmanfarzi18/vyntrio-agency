# VYNTRIO management access

The management entrance is `/management/login`. Clients continue at `/login` and `/portal`. The owner, administrators and staff work at `/management`; existing staff `/portal/...` links redirect there. Both interfaces use the same Supabase database and project IDs, with role and row permissions. No duplicate customer database or shared client password is created.

## Sign in now

1. Open https://vyntrio-agency.vercel.app/management/login.
2. Enter your invited work email and your existing account password privately. The owner email is vyntrioagency@gmail.com.
3. Complete the website security check, then select **Sign in to management**.
4. In the verification pop-up, choose **Continue with authenticator**, enter the current six-digit code from your authenticator app, and verify.
5. The management dashboard opens only after password authentication, trusted membership and second-factor verification are checked. A client account cannot become a team account by using this page.

Forgot your password or joining the team for the first time? Select **First time here or forgot your password?** Enter your invited work email and complete the security check. Open the private setup email yourself. Verify or enroll your authenticator, then choose a new password of at least 12 characters. Password changes sign out existing sessions; sign in again with the new password and authenticator. Neither passwords nor codes should be shared in chat. A team member who has lost an enrolled authenticator needs a verified administrator recovery process; the application does not bypass that factor.

Email links remain useful for verified account setup and recovery, but they do not authorize access to agency business records. Both application authorization and database row policies require a signed password authentication claim plus AAL2. The public client login directs staff to their separate entrance without sending a client magic link.

## SMS verification: prepared, not activated

The deployed default uses the existing authenticator, without purchasing an SMS service. No SMS-delivery test has been completed, and the application must not be described as sending working SMS codes yet.

Supabase's hosted **Advanced MFA Phone** is a paid feature. Its documentation lists US$75/month for the first project, plus the underlying paid plan and messaging-provider charges. Check the current total before enabling it; its add-on is not covered by the spend cap.

Official references:
- https://supabase.com/docs/guides/auth/auth-mfa/phone
- https://supabase.com/docs/guides/platform/manage-your-usage/advanced-mfa-phone
- https://supabase.com/docs/guides/auth/phone-login

After the owner approves the cost:

1. In the VYNTRIO Supabase project's Authentication settings, configure a supported SMS provider privately. Complete that provider's account, sender and any required India messaging registrations. Keep API credentials in the provider/Supabase settings, never source code or chat. A test-number simulation is not evidence of real SMS delivery.
2. Enable Phone MFA enrollment and verification under Authentication → Multi-Factor Authentication. Review and approve the paid add-on in your own account. Do not disable authenticator MFA or turn on public signups.
3. In Vercel Production, add the server configuration `OWNER_MFA_PHONE` with the value `+917339558400` and redeploy. The source defaults to that owner-approved business number, but the private setting is the place to maintain it. Never use a browser-supplied phone number as the destination.
4. Only when the provider is ready, activate the authoritative management policy in Supabase SQL Editor:

```sql
update public.agencies
set management_mfa_method = 'phone'
where id = '11111111-1111-4111-8111-111111111111';
```

This one database policy controls both the server and row permissions. Phone mode requires the signed `mfa/phone` claim; an authenticator-only or email-link session cannot bypass it to read agency data. No environment flag can silently relax the database requirement.

5. Sign in with the owner password. For the first phone enrollment, first open **Authenticator setup and recovery**, verify the existing authenticator, and return to management sign-in. Initial owner phone enrollment requires both password authentication and an already verified second factor; a stolen password alone cannot register a replacement phone.
6. Choose **Send SMS code** in the pop-up. Enter the code on the website yourself. The server selects the pinned owner phone and shows only the masked ending 8400. Resending is limited to one request per minute and four per hour. Other team members need their own pre-enrolled phone factors; do not share the owner's number or credentials across team accounts.
7. Confirm that a real SMS arrives, the code works once, incorrect/expired codes fail, and the dashboard remains inaccessible before verification. Test client isolation and management API checks again. Keep an owner recovery route available before changing or removing existing factors.

If delivery fails during activation, an authorized database administrator can restore the previous authenticator policy using `management_mfa_method = 'totp'` in the same scoped update. This is a controlled administrative recovery action, not a public fallback that bypasses SMS. Do not remove enrolled MFA factors or disable row security to fix delivery.

## Connected records and monitoring

- Supabase remains the primary database for inquiries, projects, milestones, payments, files and permissions. Password verification is handled by Supabase Auth; plaintext passwords and OTPs are not saved in application tables, emails, audit records or logs.
- Cashfree payments still use signed verification and the existing payment records. Google email, encrypted backups and explicit Sheets reporting keep their existing integrations. This change does not introduce an unverified automatic mirror of every source or historical payment.
- **Management → Workspace settings** checks database, Google bridge, spam protection and payment configuration. Connection status refreshes every 60 seconds while that page is visible, without overlapping requests. This is not an independent 24/7 uptime monitoring service.
- Daily maintenance remains scheduled at 02:00 UTC (07:30 IST) for backup and email retry work. Free-plan limits and task completion still need observation; a configured schedule does not prove a successful backup restore.
- Successful second-factor verification and password changes add audit entries without codes or passwords. Failed attempts are throttled using hashed rate-limit keys.

## Validation

Automated checks cover wrong passwords, client-to-team access denial, cross-origin rejection, factor substitution, wrong codes, password recovery restrictions, pinned phone selection and database enforcement of password/AAL2/phone claims. Real owner password entry, authenticator confirmation and real SMS delivery require the owner to complete those private steps. Do not treat mock tests as proof of real SMS delivery.
