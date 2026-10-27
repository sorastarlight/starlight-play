# Appearance ownership correction review — October 27

Source-only review of the legacy revoke function and current ownership helpers; no trainer records were read and no unlock, revoke, profile update, notice or application endpoint was executed.

## What revocation actually means

An ownership row is not the only way a trainer can use an appearance. Current helpers also recognize owner/admin entitlements, starter appearances and met progression requirements. The equip helper can recreate an earned ownership row. Deleting a row is therefore not a permanent restriction and must not be presented as a way to ban an appearance or undo earned progression.

The old function deletes the selected ownership row, resets a currently equipped Trainer ID background or frame, adds a console log and returns identity information. It has no team-background-specific equipped fallback in that definition. It also does not implement the native correction workflow's reviewed snapshot/request receipt. Reusing it directly would not establish modern protected-target, provenance, concurrent equip or retry guarantees. No production exploit or affected trainer is asserted by this review.

## Recommended first native scope

Add **Remove staff appearance gift** to an owned background's details only after a server read confirms it was a removable staff grant. Keep earned rewards, free starters, paid collections, derived staff entitlements, appearance definitions and other trainers' ownership unchanged. Preserve protected-account restrictions. Do not remove titles, Ribbons, Gym Badges or purchased Trainer appearance collections under this action.

A review must show the trainer, exact appearance, original grant source/time and equipped fallback if needed, then require a staff reason. The server must recheck owner/admin access, target protection, current grant provenance and reviewed revision under locks. It must refuse a changed or derived entitlement, use an actor-scoped request receipt, and record before/after audit data. If the appearance remains usable through another entitlement, explain that rather than claiming it was removed entirely. No automatic retry or repair.

Before implementation, inspect the full current paid/earned/starter entitlement and equip/profile trigger closure, including team backgrounds; use a valid owned/default fallback. A row deletion alone cannot prove the result. This is a policy/authority scope for owner review, not an installed endpoint or tested SQL packet. Broader cosmetic revocation is held.

## Routine presentation correction

The currently published Progression ownership detail incorrectly instructed staff to use a separate **Corrections** tab to change inventory, even when inspecting a background or title. The native inventory correction editor is already inside Inventory. The one-file copy correction now says **Ownership details are read-only** for unlocks; the unused inventory detail fallback refers to the existing Inventory tab. No controls, role checks, RPCs or ownership rules change.

All187 selected non-writing suites and build passed. Eight real local rendered group/detail states at320/390/768/1280 fit without horizontal overflow. Actual keyboard navigation and account-transition clearing are reviewed separately from provider/device acceptance. Raw source definitions, layouts and screenshots stay private in security/hub-unlock-review. Production publication evidence follows after verification.

LIVE routine copy fix: main ed8c343c795af7d65525db076a611d63d6af661a;Pages40593128854 SUCCESS;static HTTP200 js/admin-next-record.js matches exactly. Keyboard Escape returns to the ownership list and account denial clears the displayed trainer. No hosted account navigation or ownership mutation. Revocation design remains held.
