# Author and extend the small-business growth campaign

The campaign is a CMS-composed page with independent local content items. Marketers can edit, duplicate, reorder, preview, and approve its components without changing application code. Its alert has a rich text body and a date window. Its conversation form uses the portal's existing saved-work service; it does not send an email or create a record in Salesforce or Snowflake.

## Pages and content ownership

| Item                                       | Purpose                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Home/growth/small-business`               | Published campaign. Open [Small-business growth](https://liberty-mutual-agent-portal.vercel.app/growth/small-business) after signing in.          |
| `Home/growth/campaign-practice`            | Unpublished working copy for Page builder exercises. Open **Agency growth → Campaign practice** in Page builder.                                  |
| `Presentation/Page Branches/Campaign page` | Blank branch for creating another campaign under **Agency growth**. It creates a page, a local `Data` folder, and seven independent content items. |
| `Home/growth/campaign-schedule-check`      | Created only when an operator prepares the bounded scheduled-publication exercise. It is separate from the marketing practice page.               |

All paths are beneath `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal`. The published page and its practice copies are created through the Authoring API. They are explicitly excluded from the broad content serialization module, are not deployed as item resources, and remain editable. The blank branch is an explicit `CreateOnly` seed, also excluded from authoring resource packages. Normal releases update developer-owned templates, rendering definitions, layouts, placement restrictions, and component-library labels, icons, and groups.

## Components and placement

| Region                | Page Builder name / React component | Author fields                                                  |
| --------------------- | ------------------- | -------------------------------------------------------------- |
| Campaign introduction | **Heading** / `CampaignHero` | Eyebrow, Title, Summary, Icon                                  |
| Main content          | **Alert** / `CampaignAlert` | Title, rich text Body, Visible from (UTC), Visible until (UTC) |
| Main content          | **Callout** / `CampaignCallout` | Eyebrow, Title, rich text Body, Action link                    |
| Main content          | **Accordion** / `CampaignAccordion` | Question, rich text Answer                                     |
| Sidebar               | **Links** / `CampaignLinkList` | Title, Icon, three General Link fields                         |
| Sidebar               | **Contact** / `CampaignContact` | Title, Summary, Button label                                   |

**Campaign** is the component-library section. Its **Layout** component (`CampaignPage`) provides the three nested regions. The short labels and distinct icons identify each component in Page Builder; the React names, item IDs, and placeholder rules remain stable. The top-level `headless-campaign-page` placeholder permits only that container. Its hero, main, and sidebar placeholders have explicit allowlists; a contact component cannot be placed in an accordion region. `CampaignPage` is restricted to the `CampaignPage` template. Dynamic placeholder identifiers keep nested components associated with their parent when the page is duplicated.

The branch uses page-relative datasource paths such as `page:/Data/Growth opportunity`. A page duplicate receives its own data, and the branch's fields begin blank. The campaign's default callout is independent from the local **Personal lines growth opportunity** datasource used for calculated-profile personalization.

## Workflow, versions and safe exercises

The page uses the existing **Basic Workflow**. Its local content uses **Basic Datasource Workflow**. The page's native **Approve** command includes the existing datasource workflow action, so referenced local content can follow the page's approval. The initial published campaign is approved. **Campaign practice** starts in Draft and is not published.

Use the practice page for layout changes, duplicate components, AI copy refinement and autosave checks. Autosave retains edits on the current item/version; it does not publish them. Create a new page version before a versioning exercise. Review the page and referenced content before approving or publishing. The repository seed preserves existing content rather than resetting it.

The [shared-content and bulk-maintenance exercise](../docs/marketing-capability-walkthrough.md#shared-content-and-bulk-maintenance) is a read-only inspection in **Page Builder → Content → Home → Agency growth → Campaign practice → Data**. Inspect **Growth opportunity → Body**, **Preparation update → Body**, **Prepare for review → Answer**, and **Your next step → Title** for the repeated phrase relationship team. Leave all fields unchanged and the page unpublished. If your workshop role is limited to a paired **Workshop practice** page, follow the presenter for this inspection.

This exercise identifies the bulk-editing requirement; it does not demonstrate a multi-item replacement command in **Page Builder**. A shared datasource can reduce maintenance when components should always use identical copy. A one-time update across independent items instead needs a scoped bulk-update implementation, such as an API workflow or a **Marketplace Content Export/Import Tool** evaluation. The suggested extension is not installed or validated in this sandbox. Any bulk-update implementation needs explicit item, field, language, and version scope, plus review, workflow, publication, and a tested restoration process. No content restoration or reviewer reset is needed after the read-only inspection.

## Alert visibility and actual publication are separate

The alert's **Visible from (UTC)** and **Visible until (UTC)** control whether that already-published component renders. A blank boundary is unrestricted; the start is inclusive and the end exclusive. Page builder still shows the alert and its date-window explanation so an author can edit it. These fields do not publish or remove an item from Experience Edge.

Native page **Schedule publishing availability** controls which versions are eligible for a publish operation. Automatic publication and expiration need a publisher to run at the date boundaries. The bounded script below demonstrates that external automation against a dedicated page. It installs no recurring job, service or paid integration. A production implementation should use a managed scheduler, protected service credentials, monitoring and documented delivery/cache tolerances.

## Run the bounded publication and expiration exercise

Prerequisites: the campaign model is deployed, Node.js 24 is available, and an operator has logged in through the Sitecore CLI under the writable environment name `demo`. The script reads the existing private `.sitecore/user.json`; no credential goes into the command or repository. Keep its journal outside the repository.

1. Choose explicit UTC start/end timestamps in the next fifteen minutes. Allow time to run preparation, and leave at least 90 seconds between start and end. Three to five minutes gives more time to inspect Experience Edge and the rendered page.
2. Review the bounded plan, replacing the timestamp placeholders:

   ```sh
   node authoring/scripts/schedule-campaign-publication.cjs demo --prepare --starts-at START_ISO_UTC --ends-at END_ISO_UTC
   ```

3. Prepare the dedicated page and its local Data, with the same native availability dates on every item:

   ```sh
   node authoring/scripts/schedule-campaign-publication.cjs demo --prepare --starts-at START_ISO_UTC --ends-at END_ISO_UTC --apply --journal /absolute/private/campaign-schedule.json
   ```

4. Run the bounded publisher in a terminal that will remain open:

   ```sh
   node authoring/scripts/schedule-campaign-publication.cjs demo --run --apply --journal /absolute/private/campaign-schedule.json
   ```

5. Before the start, confirm the dedicated page is absent from Experience Edge. After the start operation completes, inspect [Scheduled campaign preview](https://liberty-mutual-agent-portal.vercel.app/growth/campaign-schedule-check) while signed in. Use this published-site URL for availability checks: Page builder and editing hosts configured with Preview content access can still show unpublished or expired items. Allow publishing and cache propagation time; native job completion is not proof of immediate global delivery.
6. After the end operation completes, confirm that the route and its expired local content are absent from Experience Edge and that the deployed route is no longer available. The CMS items remain available for inspection. The journal records both publishing operation IDs and their completion status.

The script refuses to overwrite an existing scheduling-proof page, publish unrelated items, widen the subtree, continue after content changes, or retry an uncertain publication submission. It resumes a confirmed publishing operation using the same journal. Expiration is a real publish operation that reevaluates native availability dates; no client-side hiding is used as evidence of unpublishing.

### Prepare the exercise for another run

The fixed `campaign-schedule-check` path is deliberately not overwritten. After the earlier run has completed, preserve its journal and use the following reviewed cleanup before preparing a new run:

1. Confirm the earlier journal records both publishing operations as complete, the end time has passed, and the published-site URL above is unavailable. If a publishing submission is uncertain, resolve it using its recorded operation ID before proceeding.
2. In Page builder, select **Agency growth → Scheduled campaign preview**. Verify its full path is `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home/growth/campaign-schedule-check` and its item ID matches the page recorded in that run's journal. Inspect its local `Data` folder: it must contain only the seven items recorded in that journal. Stop if other content or versions have been added.
3. Open that page's **Content tree options (… ) → Delete**. In **Delete item**, verify the dialog names only your scheduling page, then select **Delete**. SitecoreAI moves the page and its children to the recycle bin, where they remain recoverable. Do not select the **Agency growth** parent, **Small-business growth**, or **Campaign practice**; do not empty the recycle bin. [SitecoreAI item deletion behavior](https://doc.sitecore.com/sai/en/users/sitecoreai/build-pages/managing-the-site-tree/create-delete-and-rename-items.html).
4. Confirm only `campaign-schedule-check` has disappeared from the content tree. Choose a new private journal filename and fresh UTC timestamps, then repeat the prepare and run commands above. Retain the old journal with its original item IDs and operation IDs; never reuse it for the newly created page.

Deleting the expired exercise page does not publish its siblings or reset agent work. If it is still available on the published site, investigate publishing before cleaning it up or beginning another run.

## Provision another environment

1. Deploy the normal `LibertyMutual.Model`, `LibertyMutual.SitePresentation`, and `LibertyMutual.ComponentLibrary` modules through the existing deployment process.
2. Validate and explicitly create the blank branch, once the site exists:

   ```sh
   dotnet sitecore ser validate -i LibertyMutual.CampaignPageBranch
   dotnet sitecore ser push -n demo -i LibertyMutual.CampaignPageBranch --what-if
   dotnet sitecore ser push -n demo -i LibertyMutual.CampaignPageBranch
   ```

3. Capture and review an environment-specific, create-only content plan:

   ```sh
   node authoring/scripts/seed-campaign-content.cjs demo --snapshot /absolute/private/campaign-before.json
   node authoring/scripts/seed-campaign-content.cjs demo --baseline /absolute/private/campaign-before.json
   node authoring/scripts/seed-campaign-content.cjs demo --baseline /absolute/private/campaign-before.json --apply --journal /absolute/private/campaign-seed.json
   ```

4. Review the new page, its local Data, the Campaign component group and the Agency growth branch insertion rule. Publish only the approved campaign and its required developer-owned model. Keep the practice copy unpublished.

The seed never replaces existing editorial fields or publishes content. It appends a Campaign branch insertion option to Agency growth and one matching branch rule while preserving the existing resource-page rule. Capture a new baseline if an author has changed configuration since the earlier review. Do not use the broad initial-site seed as a reset tool.

## Validation

```sh
python authoring/scripts/build-campaign-seed.py --check
python authoring/scripts/build-component-library.py --check
python authoring/scripts/validate-content-seed.py
node --test authoring/scripts/campaign-authoring.test.cjs authoring/scripts/schedule-campaign-publication.test.cjs
```

CI runs these checks together with the existing content, placement, deployment and application checks. The campaign model source is `authoring/scripts/campaign-authoring-model.cjs`; the generated manifest lists every owned item and field contract.
