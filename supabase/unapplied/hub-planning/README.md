# Planning migration and recovery

Installed migration20261026072445. Adds the explicit staff-only choices read and a private log-free loot preview helper; updates only the existing loot/economy estimate functions. Gameplay fallback, rewards, prices, permissions and all application rows remain unchanged.

`INSTALL.sql` pins reviewed sources, refuses existing new names and uses one transaction. `ROLLBACK.sql` pins all four candidates, restores the exact previous estimate definitions and drops only the two new stateless functions. No table or player cleanup. Six real local SQL groups and 156 suites passed; all five estimates succeeded inside READ ONLY. Preserve exact LF bytes listed in the recovery manifest. See CODEX-272 report.
