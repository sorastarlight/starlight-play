# Reward calendar polish and Pass capacity removal

Owner requested clickable Pass calendar details, unique daily items, removal of the 25-space Pass perk, local reset times, compact Oak supplies and confirmed Empty Cart. This packet replaces only three private functions and the existing Pass category perks copy. It changes no item quantities, purchased capacity, reward timing, eligibility, grants or permissions.

INSTALL.sql guards exact function definitions, ACLs and perks copy before applying. ROLLBACK.sql restores those definitions and copy with inverse guards. An existing over-capacity Bag keeps every item; spending and deposits remain available, while new supplies safely overflow. Rollback may reintroduce the capacity perk and the older calendar preview. No claim is run.

LOCAL: 12 SQL check groups, plus full dependency replay (berry37, calendar24, bundle8, owner11, rotation28). Real browser checks cover clickable item details, Escape/backdrop dismissal, focus return, four responsive widths, and cart cancel/confirm. The automatic daily rotation already has seven distinct items in each week; earned snapshots and explicit custom staff bundles are retained.

Oak calendars show recorded grants for collected days; upcoming days preview configured supplies and continued-streak extras. The random common Berry is identified as random until collected. Actual claim eligibility remains server authoritative, including the existing cooldown.
