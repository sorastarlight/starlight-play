# Avatar publication guard

One existing function replacement, preserving permissions and data. Rejects publishing an empty avatar collection; empty drafts remain editable. `INSTALL.sql` pins the previous source and staff guard, then checks the candidate. `ROLLBACK.sql` pins the candidate and restores the exact previous definition without editing products or styles. Keep both files byte-identical to the recovery manifest. Installed as migration20261026071051.

Seven isolated SQL groups and 155 regression suites passed. This packet does not publish or change products and does not invoke purchases. See the CODEX-271 command-center report.
