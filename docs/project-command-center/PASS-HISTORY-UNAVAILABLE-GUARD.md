# Pass history unavailable-state guard

A seven-entry history array containing null records threw a TypeError in the calendar renderer, potentially interrupting Mart rendering. The frontend now treats null, primitive, array-valued or sparse records as unavailable history, using the existing fallback message and no calendar claim controls. Valid server history is unchanged. No claims or entitlement decisions are inferred.

Five malformed shapes and the existing calendar cases pass;173regression suites and build pass. One-file routine frontend publication:js/pass-calendar.js. No SQL, Auth/provider call, reward or account change. Rollback restores the file from mainc188b1ca.

Published main575b45bb; Pages40457482920 succeeded; exact hosted js/pass-calendar.js matches.173suites/build pass;no live application call.
