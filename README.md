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

Keep the trailing dot if GoDaddy shows it on `cards`.

## Notes

Do not commit trainer saves, Twitch secrets, or service-role keys.
