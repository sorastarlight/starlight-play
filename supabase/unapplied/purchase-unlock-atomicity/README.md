# Purchase unlock atomicity — CODEX-96

Owner-approved and installed as migration20261022084110. INSTALL.sql is the reviewed private INSTALL-BOTH.sql, unchanged. It adds an immediate FOUND check after each avatar unlock update in play_buy_cart(jsonb,uuid) and play_buy_sku(text); a losing concurrent checkout raises and rolls back its transaction. Prices, grants, signatures, ACLs and existing records are unchanged. The one-argument cart wrapper continues to delegate.

Seventeen REAL LOCAL SQL checks passed before installation using captured target/helper bodies and fictional catalog/grant/snapshot fixtures. They cover cart/SKU/mixed races, retry, normal purchases, insufficient funds, serialization failure, rollback and drift refusal. No real Bits/provider or full hosted schema/gameplay certification. Exact installed source and six attributes per target verified; five helpers and delegating wrapper unchanged. See docs/project-command-center/evidence/codex96-install-verification.json.

ROLLBACK.sql is the exact tested guarded combined rollback. It restores the duplicate-charge risk and must never run automatically. No historical refunds, player cleanup or hosted purchase test is authorized. Files live under unapplied as reviewed recovery packets, not an instruction to bulk replay them. Guard refusal means investigate drift.
