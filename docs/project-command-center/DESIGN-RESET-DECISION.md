# Owner decision — Admin Hub design reset (issue #6)

**Owner decision recorded:** Proposal A — Record Workspace selected for the next Admin Hub design stage. No existing preview is approved for replacement.

**A1** visual approval of Gate 2A / card workspace — **OPEN** (not granted).  
**A3** one canonical grant UI (Trainers desk vs Oak QA vs future Support case) — **OPEN** (not decided here).  
**A7** adopt Workspace 2.0 as the live Trainers tab — **NOT APPROVED**.  
**A8** choose the next design direction — **APPROVED: Proposal A (Record Workspace)**. Design-direction only, not implementation, A1, merge, or deployment.  
**A9** implement the issue #7 spec into `admin-next.html` — **NOT AUTHORIZED**.

No merge, deploy, APP stamp, SQL, or Batch F is requested.

---

## Side by side

| | **A — Record workspace** | **B — Inbox split** |
|---|---|---|
| Find | Full-width table. Search + 50-row pager. | Same search + pager, in a narrow name list. |
| Inspect | Table goes away. Full-width record. | List stays. Record uses remaining width. |
| Restore | All trainers restores query / page / scroll. | Selection stays visible in the list. |
| 390px | List **or** record. | Same. |
| What staff sees first | One job: find **or** inspect. | Two jobs at once: scan + inspect. |
| Risk | Extra click to compare a neighbor. | Same “two densities in one view” the owner rejected when the list was cards. |
| Pattern | Shopify / Stripe customer **index then details**. Intercom “collapse list”. | Intercom Inbox default. Linear split views. |
| Writes | Support doorway only. A3 untouched. | Same. |
| Data | Same verified RPC mapping. Same unavailable gaps. | Same. |
| Implementation later | New Trainers layout in `admin-next.html` **after A9**. Existing card + Workspace 2.0 fixtures stay for comparison until then. | Same rule. |

## Preferred hypothesis

**Proposal A.**

The owner’s note was about the *layout of the data*, not “make the list skinnier.” Finding a trainer and reading a dossier are sequential. Putting a directory beside a record forced 300px cards, then a table, to compete with the same fields they already show. A full-width index and a full-width record put each field in one place.

Proposal B remains the right alternative if staff’s real job during a stream is hopping between several trainers without losing the list. That is a workflow choice, not a CSS choice.

## What is not being asked

- Do not treat A or B as A1 visual acceptance of the current fixtures.
- Do not treat A as A7 (Workspace 2.0 table is a prototype, not this IA).
- Do not implement writes, Oak QA merge, or Batch F.
- Do not replace `admin-next.html` until **A9** is explicit. A8 only approved the design direction.

## Owner selection recorded

Proposal A is the chosen design direction (A8). Issue #7 delivers the integrated specification and static hub prototype. Do **not** replace `admin-next.html`, merge, deploy, modify SQL or staff roles, or start privileged Batch F on the strength of A8. A1, A3, and A7 retain their prior dispositions.
