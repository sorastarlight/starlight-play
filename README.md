# Starlight Play

Private companion site for `play.sorastarlight.net`.

This repo is separate from the local stream overlay, Mix It Up commands, and the card binder.

## Hosting

- GitHub: `sorastarlight/starlight-play` (private)
- Cloudflare Pages: `starlight-play`
- Preview: https://starlight-play.pages.dev
- Custom domain: `play.sorastarlight.net`

## GoDaddy DNS

Add this record, then wait for it to propagate:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `play` | `starlight-play.pages.dev` | 1 hour / 600 seconds |

Do not point this hostname at GitHub Pages. The live host is Cloudflare Pages, same pattern as `cards.sorastarlight.net`.

## Deploy

From this folder:

```powershell
wrangler pages deploy . --project-name starlight-play --commit-dirty=true
```

## Notes

Do not commit trainer saves, Twitch secrets, or service-role keys.
