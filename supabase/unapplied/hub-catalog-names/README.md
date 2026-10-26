# Catalogue display names

Owner-authorized Admin Hub migration. This replaces only the private reward view's core Ball/Berry name projection with the current item definitions. Keys, sprites, availability, quantities, recipient rules and existing private ACL/security_invoker remain unchanged. No rows are edited or new grants made.

Seven isolated PostgreSQL check groups pass, including real reviewed item edits, read-only capture catalogue generation, shop options, exact rollback and drift refusal. The original SQL view declaration is used for exact rollback because re-parsing pg_get_viewdef adds implicit UNION aliases; the tested packet restores the original source hash. Initial rehearsal mismatches were confined to that rollback representation and corrected before installation.

Install/rollback refuse source or view-option/ACL drift. A rollback restores the original core labels without reverting staff item changes or deleting audit records. The four matching player presentation files have a separate guarded frontend rollback. No hosted item save, claim, grant, purchase or encounter was run.
