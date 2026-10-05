# Cursor project rules (Play site)

This document explains persistent AI coding instructions for **Pokémon StreamLink**.

## Mechanism

Cursor loads **project rules** from `.cursor/rules/*.mdc` (YAML frontmatter + Markdown).

This repo does **not** use a legacy root `.cursorrules` file.

StreamLink rules are versioned here:

`play-site/.cursor/rules/streamlink-*.mdc`

If you open the parent Cursor workspace (`PokemonRPG`), the same files also exist at the workspace `.cursor/rules/` path so agents pick them up in that layout.

## Rule index

| File | When it applies | Topic |
| --- | --- | --- |
| `streamlink-core.mdc` | Always | Product naming, architecture (HTML/JS/`play.css`/Supabase), owner-review discipline |
| `streamlink-authority.mdc` | Always | Server-authoritative gameplay; presentation isolation; destructive ops |
| `streamlink-ui.mdc` | Play site HTML/CSS/JS | Pastel game UI, layout shift, responsive QA, sprites, a11y/motion |
| `streamlink-data-kanto.mdc` | Data/asset areas | No invented Pokémon data; Kanto #001–151; Seen/Caught |
| `streamlink-supabase.mdc` | `supabase/**` | RPC/RLS safety |
| `streamlink-qa-release.mdc` | Always | PlayTester safety, admin QA paths, stamps, honest PASS, closure reports |

## Updating

1. Edit the relevant `.mdc`.
2. Keep workspace + `play-site` copies aligned when both exist.
3. Prefer new scoped files over one giant always-on rule.
4. Commit through normal Play site git flow (`stamp-build` is **not** required for rule-only changes).

## Precedence

- Current owner task instructions win over general project rules.
- These files guide agents; they do not replace `README.md`, migrations, or live DB authority.
- Adding or editing rules must not by itself change production gameplay or APP build IDs.
