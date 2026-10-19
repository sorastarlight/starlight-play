# Friendly account emails — CODEX-14

Owner requested user-friendly emails while proceeding with recovery QA. Supabase hosted templates now use the same pearl/lilac card, readable text, clear action button, explanation of why the email arrived, unsolicited-request guidance and no-reply notice.

| Template | Subject | Source |
|---|---|---|
| Confirm signup | Confirm your Trainer Account email | supabase/templates/confirmation.html |
| Change email | Confirm your Trainer Account email change | supabase/templates/email-change.html |
| Reset password | Reset your Pokémon StreamLink password | supabase/templates/recovery.html |

Existing signup and email-change sources are backed up alongside these files as *.previous.html. Their prior subjects were Confirm your email address and Confirm your new email address. Recovery's earlier backup remains unchanged.

Signup/email-change preserve the provider ConfirmationURL; recovery preserves the fixed reset-password.html token-hash fragment and explicit recipient confirmation. No user metadata, remote assets or tracking added. No fabricated delivery, expiry duration, support mailbox or account changes promised. Email-change explains that both inboxes may require confirmation. No-reply is not a receiving mailbox. Invitation/magic-link/reauthentication flows are not exposed by current site UI and were left unchanged. Security notification switches were observed off and were not enabled.

Hosted editor source was selected/copied and matched byte-for-byte to each intended source before save; saved rendered previews checked. Recovery and email-change success toasts verified; signup saved state verified by revisiting. Template preview is not mailbox rendering proof. Documentation checked against current Supabase Auth template docs and changelog; upcoming legacy TLS cipher retirement does not change this template work.

The reset-request screen now suggests checking spam instead of incorrectly requiring the same browser. STATIC: 20 password-recovery checks passed with no hosted traffic; build validation passed (APP 20261008-rc133, 30 HTML pages, 413 stamped references). No new email sent. Full Supabase SMTP/recipient/password round trip awaits an existing nonprotected account inbox supplied by owner; owner must personally enter and submit the new password. Staff recovery-send flag stays disabled; receipt policy remains unresolved. No protected-user mutation, gameplay, build stamp or spending.

## Real EmailQA delivery

Owner created a new EmailQA account and supplied its controlled inbox for the reset test. Sent exactly one reset request through the public sign-in form. The UI returned its enumeration-safe confirmation. Resend's list shows the reset message Delivered (01a15462-9171-722c-8ccf-e44fbe12213e); the owner-created signup confirmation also shows Delivered (01a15461-c283-719a-99d2-c7075bbc2c79). No message body/token was opened or copied by Codex. This confirms actual Supabase SMTP delivery to the recipient mail server, not inbox placement or password completion. Owner must open the message and complete password entry/submission. No protected accounts used; staff sender remains disabled.

Published a3a0da20; GitHub Pages run 39261673136 succeeded. Updated reset request guidance verified served. Test inbox address intentionally omitted from public repository records.

## Owner-confirmed completion

Owner reported success after completing EmailQA password reset on 2026-10-19. Combined evidence: public reset request accepted, Resend Delivered, and owner-confirmed recipient/password completion. This is one successful real recovery round trip; independent sign-in after reset was not separately observed by Codex. Staff-assisted sender remains disabled pending receipt-retention/privacy resolution and its separate privileged-path verification. No additional email sent or password handled by Codex.

Owner wording revision: reset email now names Pokémon StreamLink in its subject, header and account description, replacing Sora Starlight Trainer Account. Recovery link and behavior unchanged. Hosted source matched before save; rendered preview checked. Copy-only; no new email sent.
