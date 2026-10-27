# Service Desk wording consistency — October27

Routine one-file copy maintenance in `js/support.js`: sign-in, account-change, unavailable/denied, reply and new-ticket wording now consistently uses **Service Desk**. Ticket-limit feedback uses plain ticket language. API names, data fields, role checks, state changes, retention and email/recovery behavior are unchanged.

All187 selected non-writing regression suites and build pass, including11 actual-source mocked conversation/loading/mutation-boundary checks. Twenty-eight local rendered states cover staff/player conversations, empty lists, list failures, denied access, signed-out and conversation failures at320/390/768/1280. No horizontal overflow, old reload/sign-in wording or disclosure-style details elements were found. Actual New Service Desk ticket dialog naming/Escape cancellation and account-change clearing passed. No ticket was submitted or changed; fictional RPC supports list/get only and records zero writes.

Local fixtures and screenshots stay outside Git. These checks do not replace real screen-reader/device or hosted owner-session acceptance. Publication scope is only js/support.js under CODEX78, with static deployed source verification. No SQL, Auth authority, email, notice acknowledgement, provider call, player mutation or APP stamp.

LIVE:main e3c039cda563fe22bec6d26e9cb43cc48c2668c7;Pages40600967148 SUCCESS;static HTTP200 js/support.js exactly matches. No hosted ticket/authentication/application call occurred.
