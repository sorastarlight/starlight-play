# Next Capture Balance slice — source inventory

Preparation only. This is not an approved implementation or a completed server contract review.

The legacy js/admin.js source loads admin_capture_overview, renders balance/ball/berry data, and submits admin_capture_save_balance with p_balance. Its existing top-level fields are minChance,maxChance,shinyMultiplier,eventMultiplier,honeyContributorBonus,rewardBonusCoins,baseChanceTiers andhoneyTiers. Tier entries are copied before changing chance/multiplier. A separate admin_capture_simulate call exists; its side effects and permission closure have not been established here.

Migration hazards to avoid:

- The legacy renderer substitutes defaults for missing balance values. A new editor must treat missing or partial reads as unavailable and must not silently save defaults.
- Do not mix capture probability,coin reward,XP or encounter timing changes. The six published reward fields do not grant authority for this new slice.
- Preserve tier identities,ordering and unknown row fields; do not invent schema keys or reorder ranges from labels.
- Probability validation,Master Ball guarantees and multipliers must follow the actual server contract. Browser input min/max values alone are not proof.
- The timing-save endpoint has a separately recorded Bits-store side effect;do not reuse it as a shortcut.

Next preparation: read the existing selected offline CODEX-165 contract source and inspect the client tier labels. Prepare a concrete disconnected design with clearly fictional values and a full before/after review. Keep simulations separate until their read/write behavior is proven. Any new privileged implementation needs an owner design/local-work decision;SQL,publication and hosted saves remain separate.

No application endpoint,live configuration read,save,simulation,SQL change or provider action was run for this inventory. Protected legacy files were read only.
