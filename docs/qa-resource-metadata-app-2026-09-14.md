# Resource metadata application acceptance — September 14, 2026

## Scope and current status

The custom Resource metadata Page Builder panel is deployed, activated and installed in the Liberty Mutual SitecoreAI environment. Real Page Builder acceptance passed for native SDK connection, all five managed lists, draft save/readback, canvas refresh, Discard, page-switch protection, approved-resource read-only behavior and non-resource rejection. Native service validation, Search regression checks and production compilation also passed. App registration: `86157b8a-7411-415d-9931-1e7508b7bd81`; installed Marketplace app tenant: `bb0e3dd3-909e-4c0b-5f0e-08df0e9c530e`.

Environment: Safeco Insurance Company of America POC; SitecoreAI tenant `97eea84c-ac47-4d91-7e4f-08defdaaa7df`; site `liberty-mutual-agent-portal`. App route: `/resource-metadata` on the existing portal host.

## Completed checks

| Check | Result |
| --- | --- |
| Managed vocabulary | Five editable folders and 30 options verified in native Data/Taxonomy. The All code has the label Cross-state guidance. |
| Native Search field compatibility | An isolated published Droplist was rejected by native source setup while Single-Line Text was accepted. No source was created; temporary content/template were unpublished and recycled. Existing resource fields remain Single-Line Text. |
| Native resource read | Approved Texas workers compensation article, English version 7, loaded with all five lists and remained read-only. |
| Native version safety | All five field definitions matched expected identities and Single-Line Text type; Shared and Unversioned flags were explicitly false. |
| Native draft save | A disposable, unpublished ResourcePage draft loaded through the service. Three metadata fields were saved by ID and read back correctly. Every unrelated field remained unchanged. |
| Native conflict handling | A separate Authoring API update changed the disposable resource after the panel snapshot. The next save was rejected as stale without replacing existing metadata. |
| No-change save | Submitting unchanged values caused no mutation. |
| Cleanup | Disposable ResourcePage `fd3dab98736b44b791c87d9a958bcedd` was recycled; its absence was verified. It was never published. |
| Permission logic | Supplied Page Builder permission context with canWrite=false loaded read-only and refused Save. Unit tests cover permission, locking, context, workflow, invalid options and stale state. This does not replace a real restricted-user Marketplace test. |
| Native Search regression | 12 total resources; Daniel's licensed scope returned 11. Passed state filters, 52 exact/licensed facet checks, 10 facet combinations, unknown terms, queries, pagination and empty results. |
| Application validation | 111 tests, lint, type-check and production build passed. The 12 service tests include model synchronization and Shared/Unversioned drift guards. |
| Client asset validation | Production postbuild scan checked 27 browser assets for configured private values; passed. |
| Authoring validation | 85 tests; generator check; 300 serialized items; all four serialization modules validated. |
| Marketplace registration | App Studio created application `86157b8a-7411-415d-9931-1e7508b7bd81` and activation completed. Its extension route uses the required single-level `/resource-metadata`. My apps confirmed Installed for SitecoreAI / Demo in the intended organization. |
| Local route/authentication | The `/resource-metadata` shell and existing SVG returned 200; a trailing slash redirected to the canonical route. The old nested route, child route and protected resources redirected to login; bootstrap returned 401. The new shell returned its SitecoreAI title and exact Sitecore frame-ancestor policy. Production build, postbuild scan, type-check and targeted lint passed after the route move. |
| Standalone browser | App title, instructions and Sitecore-styled shell rendered without agent navigation, agent login or visitor analytics. |

The native service checks above used authenticated CLI transport and supplied Pages context. The separate browser acceptance below exercised the installed Marketplace app and real Pages context. Neither an administrator browser session nor supplied permission flags prove restricted-user backend authorization.

## Installed Page Builder acceptance

The tests used the app deployed from commit `03a49f67ca8590e990d8d8b14f9c5e34f677f69e`, opened through **Page Builder → Apps → Resource metadata**. The native installation targeted only **SitecoreAI / Demo** in Safeco Insurance Company of America POC. No broader author access was granted.

| Browser step | Observed result |
| --- | --- |
| Open an unpublished ResourcePage draft | Marketplace SDK connected to the selected site and environment. The panel showed the exact resource title, English, version 1 and Draft. All five lists contained the native managed choices, readable labels and descriptions. |
| Change Risk state to Texas, then Discard changes | Unsaved-change count changed from 1 to 0; Cross-state guidance was restored. No save occurred. |
| Select Texas, Workers’ compensation and State guidance; Save metadata | The panel displayed 3 unsaved changes, then the saved confirmation. Native readback confirmed exactly `state=TX`, `product=workers-compensation` and `resourceType=State guidance`. Business family and channel stayed unchanged; all 92 protected fields stayed unchanged. Only normal revision/update audit fields also changed. |
| Observe the page canvas after Save | The article classification changed from SUBMISSION GUIDE ALL to STATE GUIDANCE TX after the automatic canvas refresh. The item remained English version 1, Draft, with Never publish enabled. |
| Select Florida without saving, then choose the existing Texas article | The panel explicitly reported that the selected page changed and unsaved selections were cleared. The existing article loaded its own Texas value. |
| Inspect the approved Texas article, version 7 | All five controls and Save were disabled. The panel instructed the author to create a new draft version with the normal Page Builder controls. The published article was not edited. |
| Select the Learning & resources landing page | The panel explained that a Liberty Mutual resource page must be selected; no editable metadata form was offered. |
| Return to the disposable draft and use Refresh | The saved Texas, Workers’ compensation and State guidance values loaded again with no unsaved changes. The discarded Florida selection was not written. |

The disposable item was `ac324c0870444fdebdf1b803b545bbcc`, under `/Home/resources/qa-resource-metadata-20260915013349-0c631bad`. Final native verification reconfirmed the expected metadata and all 92 protected fields before cleanup. The item was recycled with `permanently:false`; absence was verified by both ID and exact path. It had only English version 1 and was never approved, published or indexed. No permanent deletion was performed.

The real browser checks cover an administrator session. A separate restricted-customer-author test is required before expanding app access. Conflict rejection, managed-list drift, language/version drift and permissions/locking checks also have service/unit coverage; they were not all repeated through separate customer accounts or translated content in this installed browser session.

See [Resource metadata authoring](resource-metadata-authoring.md) for the author walkthrough, release procedure and known concurrency/authorization limits.

## Native registration and route release

Custom app `86157b8a-7411-415d-9931-1e7508b7bd81` was registered and activated in the named organization. Only **Page context panel** is enabled; its route is `/resource-metadata`. The SVG icon was uploaded successfully. All optional browser permissions are disabled. Only this organization can install the custom app.

App Studio rejected the original nested route, so [PR 42](https://github.com/tohams/liberty-mutual-sitecoreai/pull/42) moved the app to the supported single-level route. All checks passed; commit `03a49f67ca8590e990d8d8b14f9c5e34f677f69e` deployed successfully. The production route returned 200 with the correct title and exact Sitecore frame-ancestor policy.

The user accepted Marketplace Customer Terms of Use and approved the installation. My apps confirmed **Resource metadata was installed successfully**, and Update installation options showed only **SitecoreAI / Demo** selected. The granted SitecoreAI API group contains Authoring and Management GraphQL, Sites REST, Pages REST, Agent API and Search Configuration REST. The real app iframe supplied Marketplace app tenant ID `bb0e3dd3-909e-4c0b-5f0e-08df0e9c530e`. Optional browser permissions remain disabled.
