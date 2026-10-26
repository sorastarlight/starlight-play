# CODEX-264: Mounted draft catalogue routing

Full-Hub integration inspection caught a routing defect after CODEX-263:the outer Hub transport treated the new catalogue read as a create request. The read was refused by the draft writer because no payload was supplied;it could not create a product. The standalone editor tests did not exercise that outer transport. Deployed-source equality alone did not prove the mounted workflow worked.

One callback now forwards the exact command/arguments already allowlisted by the draft adapter. A new regression test extracts and executes the actual mounted callback with the real adapter/controller;it asserts catalogue loading calls only admin_store_draft_options and verifies exact create arguments separately. It does not duplicate the callback implementation.

The complete rendered Hub fixture successfully opens Items & Economy/Add product and loads70 fictional choices through the actual shell. The call log contains only the expected catalogue reads,with no create. A held read followed by a staff-to-ordinary account switch leaves staff hidden and0choices after completion. No hosted authenticated page,application read/create or notice acknowledgement was used.

Publication pending:js/admin-next.js only;guarded frontend rollback prepared. No SQL,permission,product/player data,provider,cleanup or APP stamp change. APP20261008-rc133 unchanged. Private browser evidence:C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex264/full-shell-draft.png .
