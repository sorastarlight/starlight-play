# Resend SMTP connected — CODEX-13

The owner added the DNS records and explicitly confirmed creating a domain-restricted sending credential, storing it in Supabase SMTP, and sending one non-sensitive test to Resend's delivered@resend.dev simulator.

## Current configuration

- Resend domain auth.sorastarlight.net verified. Public DKIM and both CNAME values match RESEND-DNS-SETUP.md; Resend shows Domain verified. Region us-east-1. Receiving remains off; tracking is not configured. No root mail/DNS records were changed by Codex.
- API key name: Supabase Auth · Starlight Play. Sending access only, restricted to auth.sorastarlight.net. Key ID a9e6c1f4-9c9b-4904-a44c-9282248c02dd (not a secret). The key value was transferred directly into Supabase SMTP through the UI, never written to repository/files/chat output. Temporary browser clipboard and in-memory key variable cleared after use.
- Supabase custom SMTP enabled and persisted after reload. Host smtp.resend.com; port 465; username resend; sender no-reply@auth.sorastarlight.net; display name Pokémon StreamLink (updated at owner request). Dashboard confirmed successful save and indicates the stored password is hidden/encrypted.
- Supabase Auth rate limit: 30 emails/hour, confirmed visually on Rate Limits. No additional rate-limit settings changed. Resend free transactional limits remain 100/day and 3000/month; paid overages remain off. No purchase, upgrade or spending.
- Existing branded Supabase recovery template and recipient reset page remain in place. The domain setup does not install a receiving mailbox.

## Actual test and limits

One message was sent through Resend's built-in template Test email control to delivered@resend.dev. Subject: [TEST] Sora Starlight connection test — simulator only. It contained only a plain non-sensitive connection-test statement, with no trainer data, reset link or account action. Resend recorded Sent and then Delivered for email 01a15456-0e47-750e-8c03-e3984ab501f7.

The test used Resend's dashboard sender, not Supabase Auth or the SMTP credential. It establishes provider/domain simulator delivery; it does not prove the Supabase SMTP path, a real mailbox's inbox placement, or the full password-reset round trip. The SMTP configuration and credential scope were verified separately through persisted UI settings. No extra test messages or automatic retries were sent.

A draft named Connection test — simulator only (unpublished), ID fb2e42b4-92ac-4a01-92a4-1a8d2a5fbc32, remains in Resend as test evidence. It was not published and does not replace the actual Supabase recovery template.

## Remaining recovery gates

Private owner_recovery_settings.enabled remains false, with zero receipts verified read-only after setup. Staff-assisted email actions still require isolated real Auth/email QA and receipt-retention/privacy resolution. SMTP setup does not enable privileged recovery writes or authorize testing Sora, Twinkle, PlayTester or PlayerQA. No Auth user was fetched, created, changed or deleted. No password or trainer/economy/gameplay RPC was exercised. WIRE/Familiarity, D86 and APP rc133 remain unchanged.

No application code changed in this batch; no static suites were repeated for configuration/docs-only work. Verification evidence is public DNS, REAL DOM saved configuration/scope, and the single real provider simulator event. Dedicated approved QA is still needed for full Supabase recovery delivery and password completion.
