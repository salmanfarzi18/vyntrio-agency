# VYNTRIO business email sender

Expected From: `VYNTRIO Agency <vyntrioagency@gmail.com>`.
Expected Reply-To: `vyntrioagency@gmail.com`.
To: the email saved for the individual inquiry, account or project client.

The older Google bridge is retained for encrypted Drive backups and legacy reports. Do not replace its URL or secret when connecting the business sender.

Deploy `integrations/BusinessEmailBridge.gs` from the business Google account, execute as Me. Its email/health actions require a signed request and refuse another effective sending account. It has no inbox or Drive-backup operations. Run `setupBusinessEmail` once; it creates a private `BUSINESS_EMAIL_BRIDGE_SECRET` Script property. Keep that value out of chat, logs and source control.

Production hosting settings:

- `EMAIL_PROVIDER=apps-script` (existing).
- `EMAIL_SENDER_BRIDGE_URL`: this sender's web-app `/exec` URL, not the library URL.
- `EMAIL_SENDER_BRIDGE_SECRET`: privately copy the sender Script property's value; save as a Production secret with Functions included.

The `EMAIL_BRIDGE_URL` and `EMAIL_BRIDGE_SECRET` settings continue to address the existing backup/report bridge. The new sender settings take effect after deployment. If either new sender setting is present but configuration is incomplete or sender verification fails, email delivery fails rather than falling back to the personal sender. Without either new setting, legacy sending remains supported for existing installations.

The owner Service connections panel displays the signed health response's email sender and the business sender's remaining recipient quota. Google email and backup bridge health are checked separately. A connection result alone does not prove actual email delivery: send a labelled test to the approved test-client mailbox and verify the received From, Reply-To and To headers without copying any private sign-in token.

Message IDs are retained for seven days for duplicate suppression. Google quotas and Apps Script availability still apply. A successful response means the Google send operation accepted the message, not guaranteed Inbox placement.
