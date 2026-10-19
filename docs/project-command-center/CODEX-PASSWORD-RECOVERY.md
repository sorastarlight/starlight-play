# Password recovery foundation - CODEX-10

Owner accepted the recovery proposal and instructed proceeding. This batch implements its first phase: self-service password-reset completion and truthful username-reminder wording. Staff recovery emails/diagnostics/prepared identity changes are not implemented by this slice.

## Implemented flow

- Existing reset-email requests keep the established signin.html redirect, avoiding an unverified Auth redirect-allowlist change. Early routing on that page recognizes the password-recovery PKCE verifier and transfers to reset-password.html before shared Auth/sign-in initialization. Normal OAuth with its own verifier continues through the existing flow. A callback without its browser verifier fails closed with a fresh-link instruction.
- Both callback entry pages use no-referrer. Callback query/fragment is removed from browser history before loading the external SDK. Recovery page has no auth.js/game.js/nav.js/signin.js, game bootstrap or gameplay RPCs.
- A unique Auth storage/channel key and custom memory-only session store isolate recovery from the ordinary app session. Only the existing PKCE verifier is read/consumed from the requesting browser. No password or recovery JWT is stored persistently. The current normal sign-in is neither imported nor overwritten.
- Only a verified PKCE exchange enables the form. Bare signed-in sessions, missing/expired/reused codes, wrong user and legacy bearer-token fragments do not enable updates. Legacy fragments are scrubbed and require a new browser-bound link; no direct setSession bearer shortcut.
- User explicitly enters matching passwords (minimum eight characters; provider policy still applies). Server getUser is checked on entry and immediately before update; expiration, account changes and sign-out invalidate the form. Another app tab's logout/account change invalidates recovery; same-user refresh does not. Parallel submit is locked.
- Inputs clear when saving/finishing/invalidating. Weak-password rejection permits correction; uncertain errors do not claim success or auto-retry. Successful update shows Sign in and makes a best-effort local recovery-session sign-out, then clears memory. No global sign-out guarantee or claim of invalidating all existing access tokens.
- Username help now explains email/Twitch sign-in and finding the username on My Account; it no longer offers a pretend email form. The compatibility JS helper returns the same truthful guidance without invoking the old RPC.

## Hosted compatibility message correction

Applied migration `correct_username_reminder_message`, source supabase/correct-username-reminder-message.sql. Prerequisite source MD5 af23f54ad37bf89e3c5c242660ee64bb. Only the existing play_request_username_reminder response text changes; no lookup, mail transport, role, grant or account action added. Post-apply MD5 c6a012250389fb43669d40dbc2e1ae56; source checks confirm the false sent-mail claim is gone and accurate unavailable wording present. The routine itself was not invoked during testing. Existing cached clients therefore receive truthful wording too.

## Validation

- 73 non-writing suites/build validation pass; APP rc133 unchanged, 30 root HTML pages, 409 asset references. Two artifact-writing suites remain excluded.
- New recovery suite: 16 checks, including actual installed Supabase SDK 2.117.2 with mocked HTTP endpoints. PKCE verifier exchange, real SDK memory storage, provider update and local sign-out tested without hosted traffic. Existing app session remains unchanged. Other checks cover invalid/reused/expired code, ordinary login rejection, legacy fragment rejection, password mismatch, duplicate submit, user mismatch, sign-out race, weak/uncertain errors, routing and cross-tab invalidation.
- REAL DOM local synthetic fixture: ready form, password confirmation and successful synthetic update; expired link removes the form. Desktop screenshot inspected and 390px viewport has 375px document width (no horizontal overflow). Fixture is localhost-only and substitutes an Auth stub; no real password/identity is used.
- Live work was function-definition/catalog reads plus the message-only migration. No reset request was sent, no auth.users/profile rows read, and no live password, session, identity, role or protected-account action was performed. No gameplay/D86/activation/stamp/spending.

Actual provider email delivery, template behavior and recovery link completion through a real inbox remain unverified. Keeping the pre-existing redirect avoids adding a new allowlist requirement; it does not prove current provider configuration or mail health. Dedicated approved QA inbox/account is still required for a real round trip. Do not use protected accounts as incidental fixtures. Existing OAuth/login regression is source/mock evidence, not real authenticated Twitch verification.

Sources: [Supabase password recovery](https://supabase.com/docs/guides/auth/passwords), [resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) and current official auth-js PKCE source were reviewed. Provider settings and email templates were not changed. Build identity stays rc133; hard refresh existing sign-in tabs. Git introducing commit/Pages run record publication.

Next implementation slice: owner-only masked diagnostics from the approved proposal, before any staff send or identity-recovery action. Helpdesk remains a separate task.
