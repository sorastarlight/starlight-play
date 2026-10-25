# Future content management requirements

Recorded October25,2026 from the owner's request. This is a future requirements note,not an approved implementation design or a new launch blocker. No runtime,SQL,provider or publication change is included.

## Owner intent

Routine additions should be manageable through clear content tools rather than requiring a separate development project each time:

- Add new Mart items across all supported product/item kinds,not only the current six-core-item draft slice.
- Add or change the items included in Starlight Pass reward bundles.
- Add a new site page.
- Add Pokémon individually,with the necessary game data supplied and checked rather than manually reconstructing every attribute.

These are distinct needs. Listing an existing supported item in Mart is different from introducing an item with a new gameplay effect. Configuring Pass bundle contents is different from editing the six general PokéCoin reward amounts. Adding an informational page is different from creating a page with a new authenticated operation. The tools should make those distinctions understandable without exposing database terminology to the owner.

## Pokémon data: verified current repository architecture

The offline battle-reference builder is [tools/build-gen9-ref.js](../../tools/build-gen9-ref.js). It imports CSVs from a pinned PokéAPI repository revision and emits versioned reference data. It explicitly prohibits runtime catch/admin paths from calling the builder or PokéAPI. The checked-in [reference documentation](../../data/gen9-ref/README.md) identifies content build `sl-ref-20261013-227b573`,upstream commit `227b573712414a86ba299d322fa398fbb2893edc`,and Kanto1–151 plus cataloged forms. These describe the repository source/build process,not a fresh production database inventory.

The current builder explicitly filters forms/species/evolutions to Kanto. A Gen IX ruleset does **not** mean every generation is already supported. It resolves each form's learnset from its supported source group and leaves unsupported mappings unresolved;it does not invent moves or silently copy another form's data. Art availability is a separate requirement from reference-data availability.

Consequently,a future individual-Pokémon tool should be an import-and-validation workflow,not an unrestricted row editor or just a name/sprite form. Adding a species may also require related forms,evolution-family members or other reference dependencies. A species outside the enabled roster cannot be assumed ready merely because PokéAPI has an entry.

## Suggested direction for later design

These are recommendations to review when implementation is scheduled,not additional owner decisions already made:

| Area | Desired content workflow | Boundaries to resolve |
|---|---|---|
| Shared item catalog | Friendly name,canonical art,description and supported item behavior;reuse the same definition in Mart and eligible reward bundles. | Adding a listing must not pretend to implement a new gameplay effect. Unsupported effects need development and testing. |
| Mart | Extend draft/review tools to the remaining product kinds and inventory categories. | Handle Bits,avatar/unlockable products,multi-item bundles and each kind's validation explicitly. Existing create-only six-core-item workflow is an initial slice. |
| Starlight Pass | Select supported rewards and quantities for daily/weekly bundles,with clear previews and change history. | Eligibility,cooldowns,existing claims,capacity rules and reward delivery remain server-authoritative;changing bundle contents must not silently alter those rules. |
| Pages | A reusable page template or guided content editor with title,content,preview and navigation placement. | Decide the appropriate authoring model later. Preserve accessibility,responsive layout and access controls;new account/gameplay operations need separate functionality. |
| Pokémon | Search by name/dex,select species/form,preview imported data and report missing dependencies before enabling it. | Verify types/base stats,forms,abilities and slots,natures/stat compatibility,move definitions/learnsets,evolution conditions and family candy,art and generation availability. Keep imports versioned and reproducible. |

For Pokémon,prefer a staged import that shows what will be added,what related data is required and what remains unresolved. Keep existing specimens stable unless a separately reviewed migration is needed. Do not silently refresh upstream data during play. Generation filtering and individual additions should share the same catalog instead of accumulating Kanto-specific exceptions.

The next design should identify which tasks the owner can complete entirely through the Hub and which require new mechanics or reference support. Preview,validation,audit history and recovery should make ordinary content changes routine while preserving the game's existing authority model. This note authorizes no importer,page builder,new item effect,Pass reward change or catalog activation.
