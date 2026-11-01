# Managed metadata in Page Builder

The existing **Resource metadata** Marketplace app supports two native contracts:

- **Agent Portal resource articles:** the original risk state, business family, product, distribution channel, and resource type selectors.
- **Public website pages:** state applicability, product, and audience selectors. **Content to classify** starts on the page itself. The author can explicitly select a shared **Approved answer** that the page actually references. The panel identifies its native path and version before any edit.

Page metadata and approved-answer metadata have different consumers. Page metadata classifies the page. The public Search publisher and versioned content API consume the approved-answer item's metadata. Choosing an approved answer deliberately affects that shared item wherever it is reused.

Managed choices live under the public website's **Data/Taxonomy/States**, **Products**, and **Audiences** folders. Each option has a stable text value (its item name), a readable display name, and a description. Administrators maintain these native items; the app reads current choices rather than embedding them in a browser fixture. `public-taxonomy.json` is the additive initial seed, not an overwrite policy.

## Provision the public choices

Run `node authoring/scripts/provision-public-taxonomy.cjs demo --report /absolute/private/public-taxonomy-review.json` from the repository root to inspect the plan. Use a new report path and add `--apply` to create only missing folders and options. The operation preserves existing items and author edits. It does not publish, change field definitions, alter workflows, or create credentials. Existing `ResourceMetadataFolder` and `ResourceMetadataOption` templates must be deployed first.

Metadata fields remain versioned **Single-Line Text** because the native Search source expects that supported type. The Marketplace app supplies managed selectors without changing that indexing contract.

## Native permissions and review

The Marketplace connection uses the current Sitecore user. Native page/language permissions, locking, and workflow state are checked. Approved items remain read only. To edit an approved answer, open its displayed path in Page Builder **Content**, create its draft version, return to the page, reopen the panel, and choose that answer. Save, submit, review, and publish the content through its normal workflow. Public answer publication synchronizes Search and the content API.

The app verifies the selected page's references and the target item's path, template, version, revision, workflow, allowed fields, and current managed choices again before a save. It rejects stale context and never retries an uncertain mutation. The page's shared/final presentation is read only for datasource discovery; the app never writes presentation XML. Native fields outside the three public metadata fields are preserved.

The standalone app URL is inert. It initializes its authenticated transport only inside the Sitecore Marketplace host for this organization and tenant. No credentials or selections are persisted in the browser.
