# CODEX-76 — Email capacity and DNS readiness

ACCEPTED:owner chose keeping existing free capacity for launch.100messages/day and3000/month remain the launch budget;no upgrade,DNS,SMTP or throttle change is authorized.

Current read-only Resend domain page shows auth.sorastarlight.net Verified in us-east-1. The authenticated Usage page shows transactional Free,5/3000 monthly messages,0/100 daily messages and paid transactional overages off/disabled. Public DNS resolves the exact recorded DKIM TXT and both sending CNAMEs. These are present observations,not a fresh delivery/inbox-placement test. No email was sent,no message body/reset link/credential inspected,and no plan,overage,DNS or SMTP setting changed.

Current provider capacity is100 transactional messages/day and3000/month. This is a shared message budget,not a trainer count:signup confirmations,recovery and email changes all consume it. A launch burst can also hit Supabase's project email throttle sooner. That current field is redacted in this browser;it was not read around. The earlier CODEX-13 record visually verified30/hour;that historical figure is not current certification. Current visible per-user interval remains60seconds;sign-in/sign-up requests30 per5minutes perIP.

The free limits are suitable only if launch traffic fits them. Do not assume an account is broken when a quota is reached,ask users to try different addresses,or keep blindly resending. Check provider quota and delivery status,retain uncertain staff receipts for investigation,and wait for limits to reset. A larger audience needs a separate reviewed capacity/cost proposal;this review authorizes no spending or automatic upgrade. There is no new monitoring schedule or email test allowance.

Neither _dmarc.auth.sorastarlight.net nor _dmarc.sorastarlight.net currently returns a TXT record. This is a deliverability/anti-spoofing follow-up,not a failure of the three-record provider verification. No root policy or receiving mailbox was added. Any later DMARC policy must account for all domain senders and an actual reporting destination;do not invent a mailbox or publish enforcement blindly.

Historic real Supabase signup/reset delivery and owner-completed EmailQA recovery remain in ACCOUNT-EMAIL-TEMPLATES.md;the earlier staff recovery hold in RESEND-SMTP-CONNECTION.md is historical,superseded by the later approved staff workflow. This review does not resend or re-run those account actions. Passwords/APIkeys remain unchanged.

Before a public launch decision,confirm whether anticipated email demand fits the free limits or whether higher capacity is a prerequisite. No purchase is implied by either requirement choice. Other remaining launch limitations are still governed by LAUNCH-READINESS.md.

Evidence:evidence/email-capacity-codex76.json;evidence/email-dns-codex76.json. Sources:[Resend pricing](https://resend.com/pricing),[Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).
