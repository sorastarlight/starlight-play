# Resend sending domain setup

Prepared 2026-10-19 for auth.sorastarlight.net in region us-east-1. These are public DNS records, not API credentials. Verification is pending.

GoDaddy zone: sorastarlight.net. Enter the relative names below, preserving existing unrelated records. TTL: default/Auto (one hour is suitable if Auto is unavailable).

| Type | Name | Value |
|---|---|---|
| TXT | resend._domainkey.auth | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDRPJEDNZE8CcG9f5qd0mHAWH7P1Cp0BvFZ5x/kPidCP1UYCJAxsfkEkw75Jq4JLVG4OP/RKUSrGwbhVvhCnTSp1AMJNGqc4APmocM1Gw9aBY8Ue8nflxekDoFP17c/oWVL9TEODVCKchNsa0VYSDXB+tOXlTX+Rn8dX534C7dDoQIDAQAB |
| CNAME | rsend.auth | rsend.forge.rmta.net |
| CNAME | send.auth | send.forge.rmta.net |

Resend domain: https://resend.com/domains/9175abd8-7ac3-487d-9a48-33dc63ce5601

Only sending is needed; do not enable receiving or add an inbound MX. No root DMARC change is required by this three-record setup. Tracking is not configured.

Planned Supabase sender: no-reply@auth.sorastarlight.net, name Sora Starlight. SMTP host smtp.resend.com, port 465, username resend. Password will be a sending-only API key restricted to this verified domain, stored only in Supabase SMTP settings after confirmation. No key has been created.

GoDaddy blocks the embedded browser; the owner must add these records in a regular browser. After DNS verifies, finish the domain-restricted credential and SMTP connection, then test delivery without touching protected trainer accounts.
