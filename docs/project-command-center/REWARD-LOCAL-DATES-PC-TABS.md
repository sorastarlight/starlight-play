# Local reward dates and retained PC Items view — October 27

Owner requested an Oak current-day fix,exact seven-day reward wording,smooth Pokémon/Items tab switching,and a clearer solution to UTC dates appearing a day ahead.

The frontend now names the active reward period using the workstation's current local date. Pass day previews show the actual local opening and closing times;future Pass dates are formatted locally. Existing server reset instants,eligibility,claim clocks and rewards remain unchanged. A shared server schedule with local date/time presentation avoids letting workstation clock/timezone changes create extra claims. This is a display correction,not adoption of per-device midnight claims.

Oak's supplied seven-day calendar can begin in the future before its configured streak start. That case now includes a highlighted current daily-gift tile before the seven future streak days,with a clear start-date note. It does not mark an unearned streak day as complete or advance eligibility. Once the streak has started,the normal seven-day layout remains. The reward sentence exactly matches the owner's requested wording.

PC Items retains its loaded DOM,selection and decoded sprites across same-account tab switches. A soft status refresh avoids rebuilding unchanged content;failed refresh leaves the last loaded box visible. Identity is checked before exposing retained content;account changes still reset immediately. Late refreshes and responses overlapping a transfer/arrangement cannot replace a changed view. Pokémon storage code is untouched.

LOCAL HARNESS:23 relevant regression suites and build pass,including new New York/Tokyo date,pre-start Oak,cache/failure/late-account and identity-before-exposure checks. Existing DST reset tests pass. REAL LOCAL DOM:four iframe sizes320/390/768/1280 (actual child layout widths305/375/753/1246),zero horizontal document overflow,30 item slots andzero broken images. Ten PC tab round trips retained the original sprite nodes. Future preview showed the local availability window and remained unavailable;no fictional grant/transfer/claim was submitted. These fixtures are not physical-device or hosted-player evidence.

Proposed routine publication scope:css/play.css,js/oak-daily.js,js/pass-calendar.js,js/pc-items.js,js/store.js. All five baseline files match current mainaec5627a before this task's edits. No SQL,Auth authority,provider call,live claim/transfer,APP stamp or protected-account action. Private screenshots and publication evidence:security/reward-local-display. Production evidence will be recorded after deployment.


LIVE:main f2bbcaeea228bb21db5d7d210d7b3e3556644651;Pages40619514511 SUCCESS;all5staticHTTP200sources match the published Git commit after line-ending normalization. No authenticated hosted navigation,notice,claim or transfer. APP unchanged. Private local screenshot:security/reward-local-display/oak-calendar.png. Temporary browser tabs closed;existing user tab and local server retained.
