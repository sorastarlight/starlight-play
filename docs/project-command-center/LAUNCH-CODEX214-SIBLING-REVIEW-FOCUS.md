# CODEX-214 — sibling confirmation focus

The CODEX212 issue prompted a targeted check of the existing approved product,floor-presentation and six-reward dialogs. Actual local baseline showed product/floor review headings above the scroll viewport at desktop width and reward headings above it at320px. Desktop reward review happened to start at0;no blanket claim is made that every old dialog failed at every width.

Add only conditional heading focus and scrollTop0 immediately after showModal when a dialog overflows. Non-overflowing reviews retain their existing button autofocus. Return/cancel/Escape,confirmation actions and the product dialog keyboard loop remain unchanged. Exact source comparison proves these three additions are the only runtime changes;no model,adapter,controller,command,payload,permission or save logic changes.

REAL LOCAL DOM:three mounted modules with fictional records;baseline and candidate scroll/heading/focus measurements;12responsive review states and4editor layouts at320/390/768/1024;three short reviews retain button focus and Escape returns their opener. No horizontal overflow measured. No fictional write or hosted application call ran. These checks do not substitute for physical device or screen-reader acceptance.

122LOCAL HARNESS suites pass. Build31HTML477refs/APP20261008-rc133 unchanged. Exact three-file rollback and refusal before writes on drift pass. Files:js/admin-next-mart.js,js/admin-next-floors.js,js/admin-next-config.js. Temporary fixture artifacts remain in LOCALAPPDATA/PokemonStreamLink/security/codex214. Scoped routine publication follows under CODEX78;no SQL,authenticated navigation,notice,catalog/configuration save,Auth/provider,grant,gameplay,protected-account action or stamp. Sora NO;Twinkle NO;PlayTester role unchanged.
