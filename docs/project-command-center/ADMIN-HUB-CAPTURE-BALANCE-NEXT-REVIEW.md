# Capture chance bounds — proposed next Admin Hub slice

CODEX-209 is a disconnected design proposal, not an approved implementation. Review prototype: [Capture chance limits](design-reset/hub-capture-limits-review.html). Values 0.04 and 0.78 are fictional.

## Proposed scope

Edit only minimum and maximum capture probability (minChance/maxChance). Inputs retain the stored probability precision; percentage previews are explanatory. Validate 0 <= minimum < maximum < 1. Review shows only changed fields, before/after values and the effect on server capture calculations. It does not promise that active encounters are insulated from changes.

A missing or partial read disables editing rather than substituting legacy defaults. Submit only edited keys through the existing save surface, once; verify through a fresh read before further editing. No automatic write retry or concurrent-edit lock is promised. Existing account-transition and staff permission boundaries must apply.

## Retained source evidence and limits

Selected CODEX-165 offline definitions show admin_capture_save_balance merging p_balance into private.capture_config(), validating the bounds, rejecting maximum 1, and returning ok/balance/message. The retained private.is_play_admin definition checks a non-null staff role; this is not evidence for an owner-only UI. Hashes and metadata are in evidence/codex209-offline-contract-review.json. Raw definitions remain private outside Git.

This is not certification of current installed source. The retained packet lacks the complete overview/config/staff-helper closure. Before integration, recheck fresh catalog source, permissions, helpers and read-side effects without invoking application endpoints. Stop if the proposed read has writes, the permissions differ, or new SQL is needed. The retained save has no demonstrated compare-and-swap revision guard.

The legacy renderer uses defaults for missing fields and sends broader settings. Its tier labels use minCatchRate for catch-rate ranges and minRate for honey ranges. Those arrays, unknown fields and order must not be reconstructed from labels.

## Excluded

Shiny/event/honey multipliers, catch/honey tiers, reward coins, XP, timing, Bits interactions, simulation, new SQL, live reads/saves and publication are excluded. The timing endpoint has a separately documented Bits-store side effect and is not a shortcut.

## Local evidence

Disconnected prototype uses connect-src none, no SDK, no Auth, no transport and no persistence. Actual local browser checks covered zero minimum, maximum 1 rejection with field focus, Escape return focus, discard, unavailable, unchanged draft, changed-field review and demo-only application. Four editor widths (320/390/768/1024) measured no horizontal overflow and minimum visible control height 44px; four review states showed the edited minimum only. Wide dialog screenshot inspected. Narrow harness screenshots were not reliable dialog screenshots and are not claimed as such. These checks do not establish real-device or assistive-technology acceptance, server behavior or live save success.

## Owner-return decision

Approve this two-field design and local integration/testing only, after source/permission closure review. Production publication, hosted reads/saves and any SQL remain separate decisions. No approval prompt was sent while the owner is away; independent readiness work continues.
