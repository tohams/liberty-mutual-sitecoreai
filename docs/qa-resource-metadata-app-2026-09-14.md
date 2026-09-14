# Resource metadata application acceptance — September 14, 2026

## Scope and current status

The custom Resource metadata Page Builder panel and managed taxonomy implementation are complete in source. Native service validation, Search regression checks and local production compilation passed. Marketplace registration, installation and end-to-end iframe acceptance remain pending; the public shell alone is not evidence of an installed app.

Environment: Safeco Insurance Company of America POC; SitecoreAI tenant `97eea84c-ac47-4d91-7e4f-08defdaaa7df`; site `liberty-mutual-agent-portal`. App route: `/marketplace/resource-metadata` on the existing portal host.

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
| Local route/authentication | App shell and SVG returned 200; protected bootstrap returned 401; unknown Marketplace route and resources redirected to login. Exact Sitecore frame-ancestor policy returned on the shell. |
| Standalone browser | App title, instructions and Sitecore-styled shell rendered without agent navigation, agent login or visitor analytics. |

Native service checks used authenticated CLI transport and supplied Pages context. They prove the actual Authoring GraphQL read/write contract; they do not prove Marketplace installation, SDK handshake or the originating user's permission propagation.

## Required installation acceptance

1. Record the app registration ID, installed tenant and access scope in `authoring/marketplace/resource-metadata-app.json`.
2. Open a real ResourcePage draft in Page Builder and open Apps → Resource metadata. Verify application context, five native dropdown lists, readable labels and help text.
3. On a disposable unpublished resource, change selections, discard, save and inspect native readback. Confirm canvas refresh, correct language/version and unchanged unrelated fields.
4. Verify approved read-only behavior, a non-resource page, a page/version switch, changed managed choices and an intervening content update.
5. Recycle the disposable item without publishing or indexing it.
6. Test a restricted customer author separately before granting broader app access. Marketplace's admin-backed authorization does not itself preserve the initiating author's backend permissions.

See [Resource metadata authoring](resource-metadata-authoring.md) for the author walkthrough, release procedure and known concurrency/authorization limits.
