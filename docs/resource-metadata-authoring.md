# Resource metadata authoring

Resource metadata uses a shared vocabulary so state, product and other filters retain consistent values. The managed lists live at:

`/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy`

| Managed folder | ResourcePage field | Initial choices |
| --- | --- | --- |
| Risk states | `state` | All, FL, IL, TX |
| Business families | `businessFamily` | farm-ranch, midsize-large, personal, retail-specialty, small-commercial, surety, wholesale-specialty |
| Products | `product` | auto-home, businessowners-policy, commercial-auto, commercial-package, contract-commercial-bonds, farm, specialty, workers-compensation |
| Distribution channels | `channel` | independent-agent, wholesale |
| Resource types | `resourceType` | Bond guide, Checklist, Conversation guide, Learning path, Placement guide, Preparation guide, Referral guide, State guidance, Submission guide |

## Why the panel preserves text fields

The **Resource metadata** custom Marketplace app presents five dropdowns backed by editable Sitecore content. It writes the existing ResourcePage **Single-Line Text** fields, preserving their native Search contract. The standard Content Editor fields remain text fields; the dropdown interface is in the Page Builder app.

A separate validation template containing a Droplist and a Single-Line Text field was published and inspected in native Search source setup. Search accepted the text field and displayed **Field validation error** for the Droplist. The setup form was canceled without creating a source. The temporary template and content were unpublished and moved to the Recycle Bin. This matches the current [supported content-source field types](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/search-experiences/understanding-search-sources/fields.html).

Although [Droplist returns a scalar value](https://doc.sitecore.com/sai/en/developers/sitecoreai/introduction-to-framework-agnostic-sitecore-development/content-rendering/field-types-in-rendering-data.html), that alone does not prove native Search support. Do not change these indexed fields to Droplist or Droplink until the native source configuration and full filter regression checks pass.

## Maintain the lists

1. Open Content Editor and navigate to the Taxonomy folder above.
2. Open the relevant list and select an option.
3. Use **Display name** for the readable label and **Description** to explain when to choose it. For example, item name `TX` has display name **Texas**.
4. To add an option, insert a **ResourceMetadataOption** under the relevant list. Use a stable item name; do not use that item name as an editable display label.
5. Review existing resource metadata before renaming or removing a canonical item name. Existing string values do not automatically update when an option item is renamed.

The lists are seeded in English. Add corresponding language versions before enabling another authoring language; the panel does not silently fall back to English.

The folder template limits its normal Insert options to ResourceMetadataOption. Taxonomy content remains editable and is excluded from Items as Resources. Renaming a display label does not rewrite indexed resource values.

Adding a state or business family to a list does not extend an agent's licensing, appointment or authorization. The current portal supports TX, FL and IL and applies separate server-side eligibility rules. New vocabulary values may also require application mapping and Search validation. Visitor-facing facet labels currently come from the application; they do not yet read these display names.

## Use the Resource metadata panel

The app is activated and installed in the **SitecoreAI / Demo** environment. Its Page Builder panel has been verified using the installed Marketplace connection. The registration and installation details are recorded in `authoring/marketplace/resource-metadata-app.json`.

1. In SitecoreAI **Page Builder**, choose **Liberty Mutual Agent Portal** in the site selector.
2. Open **Learning & resources** in the page tree, then select a resource article beneath it. The landing page itself is not a ResourcePage and cannot be edited with this panel.
3. Select the intended language and version. An approved resource is read-only; create a new draft version using the page's normal version/workflow controls first.
4. Open **Apps**, then **Resource metadata**. The panel shows the selected article, language, version and five saved metadata values.
5. Select **Risk state**, **Business family**, **Product**, **Distribution channel** and **Resource type** as needed. Read the help text under each choice. **Cross-state guidance** stores the canonical value `All`; it does not override licensing rules.
6. Review the unsaved-change count, then select **Save metadata**. The app validates the current page, permissions, draft workflow, field definitions and choices again before changing only the fields you edited.
7. Observe the saved confirmation. The app reads the values back and refreshes the page canvas. **Discard changes** restores the last values loaded into the panel; it does not undo an already completed save.
8. Complete the normal content review, approval and publication process. Then open **Content → Search Sources → Liberty Mutual Agent Resources** and run **Reindex Content**. Saving metadata alone performs neither operation.
9. In the portal, open **Learning & resources** as the intended agent and verify the relevant filter and result. State eligibility continues to apply independently of the authoring panel.

The panel does not autosave. Changing the selected page, language or version clears unsaved selections and displays a message. If another author changes the page or an administrator changes a managed list, refresh the panel before saving again. **Refresh** rereads the native page and lists; discard unsaved selections first when prompted. If a saved value is no longer in its list, it remains visible as an invalid value until an author deliberately selects a valid replacement.

An uncertain save is not retried automatically. Refresh and inspect the actual saved values before making another change. The panel does not create versions, approve, publish, reindex, alter layouts or modify content outside this site's ResourcePage items.

Installed-panel acceptance verified all five lists and help text, Discard changes, a three-field save with native readback, and canvas refresh. All 92 unrelated fields remained unchanged. Switching pages cleared unsaved selections; returning to the saved resource reloaded Texas. The approved Texas article at version 7 remained read-only, and the Learning & resources landing page was correctly ineligible. See the [acceptance record](qa-resource-metadata-app-2026-09-14.md) for the full verification details.

## Application and installation

This is a private **custom Marketplace app** using the [Page Builder context-panel extension](https://doc.sitecore.com/mp/en/developers/marketplace/extension-points.html). It is not a public Marketplace listing or a replacement for native Search.

| Setting | Value |
| --- | --- |
| Name | Resource metadata |
| Type | Custom |
| Deployment URL | `https://liberty-mutual-agent-portal.vercel.app` |
| Route | `/resource-metadata` |
| App registration ID | `86157b8a-7411-415d-9931-1e7508b7bd81` |
| App Studio status | Activated |
| Installation status | Installed |
| Installed target | SitecoreAI / Demo |
| Installed app tenant ID (`marketplaceAppTenantId`) | `bb0e3dd3-909e-4c0b-5f0e-08df0e9c530e` |
| Extension point | SitecoreAI Page builder context panel |
| API access | SitecoreAI APIs: Authoring and Management GraphQL, Sites REST, Pages REST, Agent API and Search Configuration REST |
| Browser permissions | None |
| Organization | Safeco Insurance Company of America POC (`org_XqL3u1MSNVuubOTb`) |
| SitecoreAI environment | `scaipocusem400b-sitecoreai950c-demo4418` |
| Tenant ID | `97eea84c-ac47-4d91-7e4f-08defdaaa7df` |
| Initial access | Organization administrators and owners |

The app is activated in **Cloud Portal → App studio → Studio** and installed for the target above through **My apps**. The installed iframe reported `marketplaceAppTenantId=bb0e3dd3-909e-4c0b-5f0e-08df0e9c530e`. The manifest records it as `marketplaceAppTenantId`, distinct from the app registration ID and the SDK’s `installationId` property.

For a future handoff or reinstallation, use the configuration above and `public/marketplace/resource-metadata-icon.svg` from the active Next.js app. Install only in the intended environment and update the manifest after verifying its Page Builder panel. App Studio requires a single-level extension route such as `/resource-metadata`; nested routes are not accepted. Follow the current [registration](https://doc.sitecore.com/mp/en/developers/marketplace/register-a-custom-app.html), [configuration](https://doc.sitecore.com/mp/en/developers/marketplace/configure-and-activate-a-custom-app.html) and [installation](https://doc.sitecore.com/mp/en/developers/marketplace/install-an-activated-custom-app.html) instructions when the UI changes.

The code deploys with the existing portal through GitHub and Vercel on the current Hobby plan. It requires no additional portal credentials or new server-side authoring endpoint. The public route displays instructions when opened outside Page Builder. Marketplace provides the authorized environment context inside its iframe. The app checks the exact organization and tenant before querying Sitecore.

### Permissions and concurrency

Marketplace [built-in authorization](https://doc.sitecore.com/mp/en/developers/sdk/0/sitecore-marketplace-sdk/built-in-authorization.html) uses an admin machine token. The downstream authoring API does not automatically retain the original author's permissions and may attribute changes to a generic Marketplace user. The app checks Page Builder write/language permissions, lock status and the native draft workflow before each write. These client-side checks do not constitute backend role-based authorization.

Keep access limited to organization administrators/owners until a separate restricted-author acceptance test and the organization's security review approve broader access. Never assume that a successful administrator test proves restricted-user isolation. The Marketplace SDK currently logs some request/response details in the browser console; do not export unredacted console logs or profile/context payloads.

Native Authoring GraphQL does not provide an atomic revision precondition. The panel compares revisions, unrelated fields and fresh list values immediately before saving, watches Page Builder change events and verifies the result afterward. This reduces the conflict window but cannot provide a database-level compare-and-swap guarantee. Do not edit the same resource version concurrently during a workshop.

### Developer entry points

- `src/features/resource-metadata/metadata-contract.ts` and `src/data/resource-metadata-model.json`: site, templates, five fields and typed values. A Node contract test checks the app-local model against the authoritative serialized manifests so Vercel can build within the application directory.
- `src/features/resource-metadata/metadata-service.ts`: transport-independent native reads, validation, minimal writes and readback.
- `src/features/resource-metadata/useResourceMetadataPanel.ts`: Marketplace SDK connection, selected-page subscriptions, state and canvas refresh.
- `src/features/resource-metadata/ResourceMetadataPanel.tsx`: accessible form and workflow messages.
- `src/app/resource-metadata/`: route and metadata; no portal navigation or visitor analytics.
- `src/proxy.ts` and `next.config.ts`: exact public shell route and allowed Sitecore frame ancestors. All protected portal routes keep their existing login requirements.

Paths above are relative to `examples/liberty-mutual-agent-portal`. The app uses the existing Node 24 setup and normal `npm ci`, `npm run dev`, `npm run type-check`, `npm run lint`, `npm test` and `npm run build` commands. Opening the local route directly validates only the inert shell. End-to-end authoring validation requires an installed Marketplace context panel; CLI service checks do not prove the iframe handshake or installation.

## Deployment and verification

```sh
# Verify generated files and serialization locally.
python authoring/scripts/build-resource-taxonomy-seed.py --check
python authoring/scripts/validate-content-seed.py
dotnet sitecore ser validate -i LibertyMutual.Model -i LibertyMutual.Content -i LibertyMutual.SitePresentation -i LibertyMutual.Taxonomy -i LibertyMutual.ResourcePageBranch

# Existing site: explicitly seed only missing taxonomy items.
authoring/scripts/deploy-content.sh demo --seed-taxonomy --what-if
authoring/scripts/deploy-content.sh demo --seed-taxonomy
```

Inspect every proposed Model, SitePresentation and SupportForm change before applying a release to an existing environment. `--seed-taxonomy` limits the additional seed to taxonomy; it still runs the normal Model, SitePresentation and SupportForm pushes. If `--what-if` shows unrelated native overrides changing, stop and reconcile the intended model before applying the release.

`--seed` includes the content, taxonomy and blank resource-page branch when creating a new site. A normal release updates Model, SitePresentation and SupportForm without seeding or recreating editorial items. All three seed modules are CreateOnly and stay outside Items as Resources (IAR). See the [release procedure](developer-handoff.md#vercel-release-process) for the exact module order and seed flags. The additive generator creates missing local files; it rejects changes to existing files instead of overwriting captured seed content. Capture intentional vocabulary changes into source through a reviewed serialization update.

After any indexed-field change, publish the intended content, reindex **Liberty Mutual Agent Resources**, and run the native verifier from the application folder:

```sh
node --import tsx scripts/verify-resource-state-search.mjs --public-context PUBLIC_CONTEXT_ID --index b5e24aff-8b5b-4653-bf66-deef52c1241a
```

Replace `PUBLIC_CONTEXT_ID` with the approved browser context configured as `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID` in your local environment. Use the public browser context, not an editing secret or server credential.

It checks licensed states, all current product/business-family/channel/resource-type filters, unknown terms, combinations, pagination and queries against the real native Search service. The current catalog has 12 resources; Daniel's licensed-state scope returns 11.
