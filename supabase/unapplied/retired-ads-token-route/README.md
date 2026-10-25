# Retired client ad-token route

Migration20261025225608 replaces only admin_director_command. The unused client token-storage action now refuses writes and directs staff to the supported Twitch Ads connection flow, which validates channel identity and permissions before using the service-only writer. Operational actions and existing credentials are unchanged.

Guarded install and rollback refuse source drift. Rollback restores the old branch and its known unsafe behavior;use only after explicit security review. Neither packet invokes the function or changes stored credentials.

Local schema-only rehearsal reproduces the old moderator write, confirms refusal for every client role and ordinary access denial, and preserves a normal Director pause. Existing Bits retry also passed a real overlapping SQL rehearsal:one item reward,one notice and one support-total credit. Its candidate lock change was unnecessary and is not included. Two rollback checks pass.

Production verification is source/ACL metadata only;no ad token,provider,Director action,Bits retry or gameplay call is included. The service credential writer and both Bits credit overloads remain service-only;their definitions and the retry definition are unchanged.
