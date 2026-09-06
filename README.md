# Starlight Play

Companion site for `play.sorastarlight.net`.

This repo is separate from the local stream overlay, stream-PC encounter tools, and the card binder.

## Hosting

Same pattern as the card binder:

- GitHub Pages from the `main` branch
- Custom domain: `play.sorastarlight.net`
- Preview: https://sorastarlight.github.io/starlight-play/

## Pages

| Page | URL | Who |
| --- | --- | --- |
| Play | `/` | Viewers watch the stream and take encounter turns |
| My Inventory | `/inventory.html` | Trainer items, space, Lure arming, and caught Pokémon |
| My Pokédex | `/pokedex.html` | Caught, seen, and unseen Kanto species |
| Rankings | `/rankings.html` | Trainer level, catches, and hours watched |
| Trainer ID | `/trainer.html?u=login` | Public profile as other trainers see it |
| Settings | `/settings.html` | Display name, favorite Pokémon, Starlight Pass |
| Store | `/store.html` | Starlight Pass, item-sprite mart, Bits pack catalog |
| Events | `/events.html` | Upcoming Play calendar |
| Staff | `/admin.html` | Encounter commands, variants, channel, pass grants, Bits pack credit |

Public nav is Play · My Inventory · My Pokédex · Rankings · Store · Events. Staff appears only after the stream Twitch account signs in. `/bag.html` redirects to My Inventory.

## GoDaddy DNS

Copy the existing `cards` record and change only the name:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `play` | `sorastarlight.github.io.` | 1 hour |

## Encounter commands

Staff controls on `/admin.html` queue commands for the stream PC. A background bridge runs the community encounter engine, writes `Data/encounter-state.js` for the overlay, publishes that encounter to Play, and posts phase/result beats to Twitch chat.

The stream PC already has `Data/play-bridge.json` and starts the bridge at login. Do not commit that file.

Chat commands still work.

## Starlight Pass

The pass is channel-subscription status, not a paid catch chance.

- +25 inventory space while active
- Daily gift (20h): 2 Berries, 1 Bait, 20 PokéCoins
- Weekly crate (6d): 5 Poké Balls, 3 Berries, 1 Lure, 150 PokéCoins
- Pass ribbon on the trainer card
- Viewers: Store → Check my subscription (needs Twitch login plus `user:read:subscriptions`)
- The channel account is treated as Pass. Twitch does not list the broadcaster as a subscriber.
- Staff can grant or remove a pass by Twitch login

Automatic sub checks for viewers need the **Play** Twitch Client ID saved on the staff hub (same app as OAuth, not the card binder).

## Shop policy

Play never charges Bits. Rule: **BITS → guaranteed items → normal gameplay**.

- PokéCoins are earned (join +5, catch +20, Pass gifts). No cash value, no trading, no Bits conversion.
- Coin shelf and Bits Power-Up packs only grant known quantities (balls, berries, bait, Lure, inventory space).
- Bits packs are Custom Power-Ups on Twitch while live. The stream PC credits the matching SKU. Staff hub can still credit a pack by hand.
- Off the shelf: mystery balls, paid catch/shiny odds, buying a Pokémon, wagering.

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
   - `https://play.sorastarlight.net/inventory.html`
   - `https://play.sorastarlight.net/rankings.html`
   - `https://play.sorastarlight.net/trainer.html`
   - `https://play.sorastarlight.net/settings.html`
   - `https://play.sorastarlight.net/store.html`
   - `https://play.sorastarlight.net/pokedex.html`
   - `https://play.sorastarlight.net/events.html`
   - `https://play.sorastarlight.net/admin.html`
   - `https://play.sorastarlight.net/bag.html`
   - `https://sorastarlight.github.io/starlight-play/`
   - `https://sorastarlight.github.io/starlight-play/admin.html`

The live player follows the Twitch channel in `site_config.broadcaster_twitch_login` (currently `sorastarlight`). Encounter actions stay server-side. Bits stay on Twitch.

## Notes

Do not commit trainer saves, Twitch secrets, or service-role keys.
