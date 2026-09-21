# Practice page authoring

The two hands-on guides, **Edit page content** and **Improve content with AI**, use **Page Builder → Home → Practice → Practice NN**. Participants replace `NN` with their assigned workshop number. The source guides use `{{pack}}`, which the workshop guide resolves to the signed-in participant’s number. **Practice 01** is reserved for presenters; attendees use **Practice 02–20** as assigned. Item names are `practice-01` through `practice-20`, under `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home/practice`. **Practice** is a native Common/Folder item; expand it and select the assigned numbered page rather than trying to edit the folder as a page.

Each page uses the existing `CampaignPage` template and `CampaignLayout` page layout and owns a separate `Data` folder with **Campaign introduction**, **Preparation update**, **Growth opportunity**, **Start the conversation**, **Prepare for review**, **Useful resources**, and **Your next step**. Page composition and datasource references must stay within the same numbered page. A workshop number identifies these copies; it does not grant CMS access or isolate shared media, component definitions, presentation settings, or other global configuration. Participants sign into SitecoreAI with their own invited identity and require edit access to their assigned page and Data items.

Keep every numbered Practice page unpublished. The provisioning model sets `__Never publish` on the Practice folder, pages, and local Data items; leave that protection in place. Saving updates CMS authoring and the Page Builder preview. It does not publish the page. Shared resource publication, creation of a resource page, and the existing Author/Approver workflow remain presenter demonstrations. The single **Workshop practice → Demo** workflow page serves the separate presenter-led publishing exercise. The unused workflow pair pages have been removed.

## Native component choices

Use these names from `component-library-manifest.json` in participant instructions:

| Area | Native placeholder | Allowed component names |
| --- | --- | --- |
| Page container | `headless-campaign-page` | Layout |
| Title | `headless-campaign-hero-{*}` | Heading |
| Main | `headless-campaign-main-{*}` | Alert, Callout, Accordion |
| Sidebar | `headless-campaign-sidebar-{*}` | Links, Contact |

The expected starter page contains a Heading; Alert, Callout, and two Accordions in the main area; and Links and Contact in the sidebar. Preserve the containing Layout, its dynamic placeholder identifier, and the starter components’ identifiers. Native placeholder settings define the component choices. The frontend applies the corresponding rendering allowlist as a second check.

In **Layers**, expand **Layout**. The starter page shows the title as **headless-campaign-hero-1**, the main area as **headless-campaign-main-1**, and the sidebar as **headless-campaign-sidebar-1**. **Insert into** (**+**) on an area opens the **Components** picker. Its **Campaign** group lists only components allowed in that selected area.

The component guide requires a positive and a negative check: an Accordion is offered in the main area and is not offered in the sidebar. Showing a globally available component in the library alone does not prove that a particular placeholder accepts it. Participants inspect these choices without changing placeholder settings.

## Hands-on loop and cleanup

1. In the assigned page’s **Data → Growth opportunity**, record the exact **Title**, edit it, and wait for **Saved**. Verify the Callout heading in Editor and record the starter component order.
2. Inspect the native insertion choices for the main, title, and sidebar placeholders.
3. With the assigned page still selected, open **Components → Campaign** and drag **Accordion** between the yellow Alert and white Callout. The **Assign content item** dialog opens at the page’s own Data folder, offering **Prepare for review** and **Start the conversation**. Select **Prepare for review**, then **Assign**. Leave its fields unchanged. **Duplicate and assign** would create an extra item and is not part of this exercise.
4. Select the added Accordion. If a text field is selected, choose its parent **Accordion** in the right pane. Click the component toolbar’s **Move down** arrow once. Verify that the added component now follows Callout, before the original **Where should my team begin?** accordion.
5. Select that added component below Callout and click **Delete** (trash icon) in the component toolbar, then **Delete** in the **Delete component** confirmation to remove only its placement. Retain the original two Accordions and the Prepare for review datasource. Restore the recorded Growth opportunity Title, wait for Saved, reload, and verify the original heading and component order.
6. For AI assistance, use the same numbered page’s **Growth opportunity → Body**. Record the original wording and formatting, review the AI correction and rewrite, then restore the exact starting Body and verify it after reload.

There is no automatic CMS reset. The portal’s workshop-number reset restores portal work and activates new agent profiles; it does not restore authoring fields, layouts, datasources, publishing, or CMS history. Complete each guide’s cleanup explicitly. Do not delete the Practice page, its Layout, its original components, or any original Data item.

## Verification boundary

The repository model supplies the component names and allowlists above. Native Page Builder verification must cover the assigned page route, saved content edits, allowed and disallowed insertion choices, selection of the page-local datasource, add/reorder/remove controls, saved layout after reload, and restoration. Keep a record of the workshop number and what was actually exercised. Source review or screenshot inspection alone does not establish that every mutating step has been rehearsed.

## Adding workshop numbers

The practice model and route allowlist use the workshop numbers in `examples/liberty-mutual-agent-portal/fixtures/manifest.json`. To extend the existing 01–15 set to 01–20, retain the external native manifest that records the existing items, including the repaired Common/Folder identity. Review a scoped plan before applying it:

```sh
node authoring/scripts/provision-authoring-practice-content.cjs demo --manifest /absolute/private/native-manifest.json --numbers 16,17,18,19,20
```

The expected plan preserves 136 existing items and creates 45 items: Practice 16–20, their five Data folders, and thirty-five local datasources. Add `--apply` to the reviewed command to create those items. The command stops if any existing item is missing, has a different native identity or ownership marker, or if a new path already contains unrecorded content. It never updates existing content, creates versions, changes permissions, or publishes. The original 01–15 ownership marker remains unchanged as provenance, and the external manifest records the additive contract extension.

Capture and compare the existing page and datasource fields, native versions, layout, workflow, and identities before and after apply. Verify the five new pages in native Page Builder and retain their `__Never publish` protection. This procedure only creates numbered Practice content; the retired Workshop practice pair pages remain retired. SitecoreAI identity invitations and access are separate from the workshop portal accounts.
