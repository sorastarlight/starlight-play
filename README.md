# Starlight Play

Companion site for `play.sorastarlight.net`.

This repo is separate from the local stream overlay, Mix It Up commands, and the card binder.

## Hosting

Same pattern as the card binder:

- GitHub Pages from the `main` branch
- Custom domain: `play.sorastarlight.net`
- Preview: https://sorastarlight.github.io/starlight-play/

## GoDaddy DNS

Copy the existing `cards` record and change only the name:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `play` | `sorastarlight.github.io.` | 1 hour |

## Twitch login

Play uses its own Supabase project. Do not put card-binder secrets here.

1. Open the [Twitch Developer Console](https://dev.twitch.tv/console) and register an application named `Starlight Play`.
2. Set Category to Website Integration.
3. Set OAuth Redirect URL to:

   `https://dtflmlbjhttoewqgkujf.supabase.co/auth/v1/callback`

4. Copy the Client ID and create a Client Secret.
5. In the **starlight-play** Supabase project: Authentication → Sign In / Providers → Twitch.
6. Enable Twitch, paste the Client ID and Client Secret, and save.
7. Add these Redirect URLs in Authentication → URL Configuration:

   - `https://play.sorastarlight.net/`
   - `https://sorastarlight.github.io/starlight-play/`

The live player follows the Twitch channel in `site_config.broadcaster_twitch_login` (currently `sorastarlight`). Encounter actions stay server-side; paid items stay off.

## Notes

Do not commit trainer saves, Twitch secrets, or service-role keys.
