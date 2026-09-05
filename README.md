# Starlight Play

Companion site for `play.sorastarlight.net`.

This repo is separate from the local stream overlay, Mix It Up commands, and the card binder.

## Hosting

Same pattern as the card binder:

- GitHub Pages from the `main` branch
- Custom domain: `play.sorastarlight.net`
- Preview: https://sorastarlight.github.io/starlight-play/

## Pages

| Page | URL | Who |
| --- | --- | --- |
| Play | `/` | Viewers watch the stream and take encounter turns |
| Bag | `/bag.html` | Trainer items and caught Pokémon |
| Store | `/store.html` | Starlight Pass (Twitch sub) and a locked Bits shelf |
| Staff | `/admin.html` | Encounter commands, timings, channel, pass grants |

Public nav is Play · Bag · Store. Staff appears only after the stream Twitch account signs in.

## GoDaddy DNS

Copy the existing `cards` record and change only the name:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `play` | `sorastarlight.github.io.` | 1 hour |

## Encounter commands

Staff controls on `/admin.html` write Play rounds in Supabase. Viewers join, prepare, and throw on the Play page.

This does **not** drive the local Mix It Up overlay yet. Stream overlay commands stay in Mix It Up until a bridge exists.

Odds match the free prototype: Poké 45% / Great 60% / Ultra 75%, berry +10pp, shared bait up to +15pp, cap 90%.

## Starlight Pass

The pass is channel-subscription status, not a paid catch chance.

- Viewers: Store → Check my subscription (needs Twitch login plus `user:read:subscriptions`)
- Staff can grant or remove a pass by Twitch login
- Bits cannot buy balls, berries, bait, or odds

## Twitch login

Play uses its own Supabase project. Do not put card-binder secrets here.

1. Open the [Twitch Developer Console](https://dev.twitch.tv/console) and register an application named `Starlight Play`.
2. Set Category to Website Integration.
3. Set OAuth Redirect URL to:

   `https://dtflmlbjhttoewqgkujf.supabase.co/auth/v1/callback`

4. Copy the Client ID and create a Client Secret.
5. In the **starlight-play** Supabase project: Authentication → Sign In / Providers → Twitch.
6. Enable Twitch, paste the Client ID and Client Secret, and save.
7. Paste the same Client ID into Staff → Stream channel.
8. Add these Redirect URLs in Authentication → URL Configuration:

   - `https://play.sorastarlight.net/`
   - `https://play.sorastarlight.net/bag.html`
   - `https://play.sorastarlight.net/store.html`
   - `https://play.sorastarlight.net/admin.html`
   - `https://sorastarlight.github.io/starlight-play/`
   - `https://sorastarlight.github.io/starlight-play/admin.html`

The live player follows the Twitch channel in `site_config.broadcaster_twitch_login` (currently `sorastarlight`). Encounter actions stay server-side; paid items stay off.

## Notes

Do not commit trainer saves, Twitch secrets, or service-role keys.
