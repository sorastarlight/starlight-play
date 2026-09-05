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

Staff controls on `/admin.html` queue Mix It Up commands. A small bridge on the stream PC runs the same `community.py` engine Mix It Up already uses, writes `Data/encounter-state.js` for the overlay, and publishes that encounter to Play.

1. In Staff → Mix It Up link, create a token.
2. Copy `Data/play-bridge.example.json` to `Data/play-bridge.json` and paste the token.
3. Run `MixItUp/Start-Play-Bridge.bat` (or the Mix It Up action group `Play - Start Stream Bridge`) and leave it running.

Chat commands still work. Do not commit `Data/play-bridge.json`.

This does **not** replace Mix It Up. The overlay still reads local files. Play buttons follow the live Mix It Up round while the bridge is online.

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
