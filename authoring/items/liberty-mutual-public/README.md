# Public website native content

This site lives beside the Agent Portal in the existing LibertyMutual site collection. It has independent site, Home, presentation, rendering-host, hostname, and analytics identities. `public-contract.json` records the actual native site scaffold identities and the stable project definition/content IDs.

The official native `createSite` operation created the SXA scaffold. `public-site-identities.json` preserves those IDs. `public-native-scaffold.json` retains non-personal configuration from that new scaffold so generation does not discard its Dictionary, languages, themes, or media bindings. Capture is a one-time installation action, not a way to turn later marketer edits into developer defaults.

## Ownership and release

| Module | Owner and purpose | Normal definition deploy |
| --- | --- | --- |
| LibertyMutual.PublicWorkflow | Public-only Draft → Awaiting approval → Approved; no automatic publish action | Yes |
| LibertyMutual.PublicModel | Templates, field definitions, renderings, and global placeholder contracts | Yes |
| LibertyMutual.PublicPartialPlaceholders | Three restricted native SXA partial companion placeholder settings | Yes |
| LibertyMutual.PublicPresentation | Page/Partial Designs, site placeholder restrictions, variants, palette, and insertion rules | Yes |
| LibertyMutual.PublicBootstrap | Initial site name, Settings, and Home template/layout initialization; guarded against fresh before-images | No |
| LibertyMutual.PublicContentSeed | Initial editable pages, local Data, shared libraries, and partial content; CreateOnly | No |
| LibertyMutual.PublicBranchSeed | Blank landing-page branch and local Data prototype; CreateOnly | No |
| LibertyMutual.PublicSiteSeed | Additional native Settings descendants, preserving existing ones; CreateOnly | No |

Ordinary releases must not include Bootstrap or seed modules. An explicit restoration is separate from both frontend deployment and initial installation. No script in this directory publishes content automatically.

## First editable slice

- **Home** and **Bundling** have independent local Hero and Introduction items in each page's Data folder.
- Both pages intentionally select **Bundle and save**, the same Promotion item in the public site's Promotions library. Default and Compact are presentation variants of that same content.
- **Product availability notice** is a public-owned Disclosure. Public components and the portal's SharedDisclosure component reference the same native ID.
- **Header**, **Page body**, and **Footer** partials form the shared Public website Page Design. The body exposes a Hero slot and a Content slot with explicit component allowlists.
- The **Landing page** branch, offered beneath public Home, creates a fresh Data folder with blank Hero and Introduction fields. Ordinary copy is local; reusable Promotion/Disclosure selection is intentional.
- Public editorial items start in Draft in **Liberty Mutual Public Review**, which provides Draft → Awaiting approval → Approved. Approval and publication are deliberate native operations.

## Prepare and verify

From the repository root, use Python 3 with PyYAML:

```sh
python authoring/scripts/public-build-model.py --check
node --test authoring/scripts/public-contract.test.cjs
dotnet sitecore ser push -n demo -i LibertyMutual.PublicModel --what-if
```

The generator is offline. `--check` fails on drift or stale generated files. Running without that flag regenerates only this model's owned source files; it performs no native operations.

The expanded factory seed contains 17 public routes and 10 source-backed answer items. Home, Bundling, and Auto use native ordered cards, FAQs, links, product choices, and shared navigation. Ordinary page blocks and their selected child items belong beneath each page's Data; header and footer selections belong beneath their partial Data. Every selected item carries native fields and review workflow. The independent Portal remains in its own site, hosting project, and analytics identity.

`public-model-extensions.json` adds the developer contracts. `public-editorial-records.json` is a serialization input for the explicit CreateOnly factory seed, not a runtime content store. `public-media-bindings.json` contains actual native media identities and the preserved Modern Media image; it contains no authentication credentials. The three source-faithful logo bindings replace the initial logo only in new reviewed content versions, preserving prior history.

`public-configure-fidelity.cjs` prepares six guarded changes after the definitions and new content exist: new Draft versions for Home, Bundling, their Hero datasources, and Header/Footer. It preserves all preceding approved versions, the shared page layouts, the real Home image, and the canonical Promotion/Disclosure identities. Existing Final Renderings, personalization, tests, or unexplained layout changes stop the procedure. Capture a private before-image, inspect its plan, apply against that same snapshot, and then perform native review and publication separately. A partial journal is evidence to inspect, not permission to retry blindly.

The root serialization exclusions preserve native revision, update timestamp, and update-user metadata. Sitecore's canonical disk formatting is retained separately from semantic field values, preventing representation-only updates during definition releases. The native partial thumbnails and creation timestamps are preserved too.

`public-bootstrap.cjs` captures fresh private before-images, checks native identity/configuration and the source digest, applies only the three bootstrap targets when explicitly requested, and reads back the result. It protects the portal's Settings, grouping, and dedicated rendering host, plus the shared Default host. A failed or uncertain write must be read back before retrying.

`public-configure-host.cjs` configures only the dedicated public rendering host, public grouping, and declared public Settings. It preserves the independently registered public analytics mapping and checks the protected portal/Default items. Supply the actual stable editing and delivery origins, snapshot first, review the plan, and apply against that same before-image.

Keep native before-images and journals outside the repository. CLI authentication stays in ignored `.sitecore/user.json` and is never printed or copied into source.

## Acceptance in Page Builder

Source and API checks are intermediate evidence. Verify the deployed editing host, create a new page through Home → Landing page, edit blank fields, select real media, save/reload, insert permitted components, and confirm inappropriate components are absent. Verify promotion variant selection and existing shared-item selection. Approve and publish the intended dependencies, then observe the change in both public placements and the portal disclosure consumers. Recheck Portal/Default settings after configuration. Do not mark these behaviors verified until they have been observed in their intended interfaces.
