# Atomic notice claim — installed

Owner-approved migration20261022171505 codex118_atomic_notice_claim is installed and exact-source/attribute verified. The historical unapplied folder name does not mean this is pending. Only public.play_notices() changed;no endpoint was invoked.

Overlapping calls previously returned the same unseen notice. The correction constructs the unchanged chronological response from UPDATE RETURNING rows,so concurrent callers collectively receive one copy. It changes no reward grants. It is not network-acknowledged exactly-once delivery;response loss may still consume a notice.

15REAL LOCAL SQL checks executed the actual guarded install/rollback,including concurrent baseline/candidate,ownership,payload/order,transaction rollback and drift refusal. Private source/harness stays under LOCALAPPDATA/PokemonStreamLink/security/codex118.

Both packets guard exact source/ACL/owner/search_path/security-definer/volatility/strictness/parallel attributes. Replay only against a matching baseline;do not automatically roll back,it restores duplicate delivery. No new SQL,notice delivery,gameplay,provider,email,APP stamp or final release authority follows.

INSTALL SHA256 145fef9bbf6b78f79c84518e308707322e235d3ed285a19e532306e46f2b7ea5
ROLLBACK SHA256 0fe6375d82779a3fed5969f588d183a8b43390331e9e8b7a83995ff51563302f
