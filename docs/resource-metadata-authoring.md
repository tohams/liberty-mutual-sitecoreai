# Native metadata authoring

Metadata describes where content applies and how readers find it. Both sites use native **Checklist** fields backed by managed Sitecore taxonomy items. Authors edit the actual page or reusable content item through **Page Builder** using normal permissions, versions, and workflow.

## Agent Portal resources

In **Page Builder**, select **Agent Portal** and **Editor**. Under **Pages → Home → Learning & resources**, select an article, open its **Content tree options (…)** menu, and choose **Page content**. The native pane opens beside the website canvas. The same page owns the visible article and its classification.

| Native field          | Technical name   | Managed Source under `Data/Taxonomy` |
| --------------------- | ---------------- | ------------------------------------ |
| Risk states           | `state`          | Risk states                          |
| Business families     | `businessFamily` | Business families                    |
| Products              | `product`        | Products                             |
| Distribution channels | `channel`        | Distribution channels                |
| Resource types        | `resourceType`   | Resource types                       |

Each collapsed control reports the number of selected items. Open it to see the individual checkboxes, choose the values that apply, and close the list. Multiple selected values classify the same article; they do not require separate combination choices.

Use **Cross-state guidance** on its own when the article applies across supported states. State-specific guidance uses its applicable states. The portal separately enforces the signed-in agent’s active licenses, including Search results, saved resources, and direct article access.

### Edit, verify, and release

1. Record the original text and selected checkboxes before a shared demonstration.
2. Create a named **English Draft**, then select that version and open **Page content**.
3. Open a native checklist, change the applicable selections, close it, and click outside the field. Wait for the native **Saved** checkmark.
4. Reload the page, return to the same draft, and reopen the checklist to verify persistence. Native fields save automatically.
5. Preview visible article content in **Editor** with **Default editing host**. Complete the configured review workflow, then publish the approved page. Include changed local image content when appropriate.
6. Verify the published article and its **Learning & resources** result. The configured publication flow synchronizes Search automatically after published content reaches **Experience Edge**.

For a temporary demonstration change, restore the original values through a new draft, review, and publication, then verify both surfaces again. A workshop-number reset restores agent data, not CMS content.

## Public website content

The **Public Website** uses native **State applicability**, **Products**, and **Audience** checklists. Edit page classification through **Page content** or its **Content** view. A reusable approved answer owns its own classification: select its visible **Approved answer** component and use its native **Content** fields, or open the answer in **Page Builder Content**.

Select products individually, such as **Auto**, **Homeowners**, and **Condo**. The managed options live under the public site’s **Data/Taxonomy/States**, **Products**, and **Audiences** folders. Use an **All** choice on its own. Normal permissions, versions, approval, and publication apply.

## Maintain the taxonomy

The Agent Portal choices live under:

`/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy`

The Public Website choices live under:

`/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Taxonomy`

In **Page Builder → Content**, navigate to the appropriate **Data → Taxonomy** folder and select a managed option. Its native item ID identifies the choice. **Display name** supplies a readable label, and **Description** explains when the choice applies. The stable item name supplies the application’s classification code.

Native checklist fields store selected item references. Editing a display label preserves the referenced item ID. Changing a stable code or adding a supported state or product also requires checking the application mappings, published content, Search behavior, and agent eligibility rules.

The folder’s insertion rules permit managed option items. Taxonomy remains editable content, with a separate **CreateOnly** seed that preserves later author changes during ordinary releases. A new Resource page begins with blank classification fields; the page branch does not copy another article’s choices.

## Delivery and implementation

The rendering application reads published taxonomy references for article labels and relevance. The configured publication service reads **Live Experience Edge** content and projects approved resource text and resolved classification codes into the native **SitecoreAI Search** Push source. It preserves stable resource IDs across versions and removes records that are no longer in the published projection.

This is an application integration with SitecoreAI’s publishing and Search APIs. Authoring remains native: content fields, managed Source folders, automatic saving, page permissions, language versions, and workflow. The author follows one review-and-publish sequence; the integration maintains the searchable copy.

Keep developer-owned definitions separate from editable content. Ordinary model releases update field definitions and rendering contracts. Taxonomy and resource-page branches use deliberate **CreateOnly** seeding. Baseline restoration is a separate operation and must preserve the intended content versions, local data, workflows, and published state.

For page creation, image ownership, and exact publication controls, see [Create and maintain resource pages](resource-page-authoring.md). For the native field and Search design, see [Content model](content-model.md#native-resource-search-composition).
