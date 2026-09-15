# Liberty Mutual Agent Portal — presenter runbook

Nine reusable loops for marketing, platform owners and developers. Each loop has a business story, an observable result and a clear implementation boundary. This is presenter documentation; the agent-facing site has no demonstration controls or labels.

The separate [developer setup and component-edit workshop](developer-quickstart.md) adds a hands-on local exercise without changing these nine loop numbers. Developers create isolated local configuration, sign in as `daniel.01`, change the `ResourceSearch` heading, verify native Search and restore the original heading. Portal tracking remains disabled. Add it to an IT session when attendees will use their own machines; allow setup time before the walkthrough.

**Evidence baseline:** the state-eligibility release in [PR #14](https://github.com/tohams/liberty-mutual-sitecoreai/pull/14), merged September 11, 2026 UTC, and the subsequent [seven-loop rehearsal](qa-seven-loops-2026-09-11.md). That historical rehearsal records portal and native UI observations, 80 passing application tests, connected CI for that release, deployed eligibility checks and 37 native personalization checks on each host. All eight operational scopes were reset afterward, the 56-account baseline passed, and the temporary CMS summary was restored in the live site and native Search. Customer author/approver separation remains open. The separate September 14 [Brand Kit consumption repair](agentic-studio/brand-kit-consumption-repair-2026-09-14.md) verifies native drafting from complete authored guidance, while retaining the historical ABM excerpt input and the vendor metadata/array limitation. The earlier [release evidence](qa-evidence-2026-09-11.md) remains historical evidence.

**Loop 8 status:** **Liberty Mutual Small Business Guide CTA** is Live. Its exact guide goal was saved and reopened before activation on September 14, 2026 UTC. Published A/B content passed 18 checks and a normal production Daniel `.04` visit reached the guide. Native goal attribution remains pending. The preceding **Liberty Mutual Small Business Resource CTA** was ended with control retained; its historical report is separate. See the [current experiment record](ab-testing.md) and [verification record](qa-ab-testing-2026-09-14.md).

**Loop 9 status:** both topic journeys passed on production and preview. Daniel built native workers-compensation affinities and Maya built household affinities, each reaching 2 views and score 1.00 before the matching authored Products spotlight rendered. Both CTAs retained the selected risk state, Elena’s no-affinity profile stayed neutral and all 37 existing Workspace checks passed on each host. The correction sends CMS page names, matching the native affinity assignments. See the [affinity contract](affinity-personalization.md) and [September 13 QA record](qa-affinity-personalization-2026-09-13.md) for the neutral comparison and historical evidence.

## Choose the session

| Loop | Story | Audience | Suggested time |
| --- | --- | --- | --- |
| [1](#loop-1-one-agency-different-people) | One agency, different people | Marketing, marketing operations | 5 minutes |
| [2](#loop-2-find-the-right-answer) | Find the right answer | Marketing, Search owners | 4 minutes |
| [3](#loop-3-from-opportunity-to-submission) | From opportunity to submission | Marketing and IT | 6 minutes |
| [4](#loop-4-different-specialties-one-portal) | Different specialties, one portal | Business stakeholders, IT | 5–7 minutes |
| [5](#loop-5-marketing-owns-the-content) | Marketing owns the content | Authors, approvers, implementers | 6–8 minutes plus indexing; allow extra time for metadata and page creation |
| [6](#loop-6-grow-an-agency-relationship) | Grow an agency relationship | Marketing, marketing operations | 7 minutes |
| [7](#loop-7-beneath-the-implementation) | Beneath the implementation | Developers, platform owners | 8–10 minutes |
| [8](#loop-8-a-clearer-next-step) | A clearer next step | Marketing, optimization and platform owners | 5 minutes plus reporting |
| [9](#loop-9-an-interest-becomes-a-relevant-next-step) | An interest becomes a relevant next step | Marketing, personalization and platform owners | 5–7 minutes |

For a **30-minute marketing session**, use 1 → 2 → 5 → 6 with a short introduction and questions. Rehearse the publication/indexing transition in advance. For a **30-minute IT session**, use 3 → 7, add the relevant specialty from 4, and inspect the UDL profile and native decision behind loop 1. A five-minute specialist loop covers one or two branches; showing all four needs more time.

Loop 8 can replace loop 6 for an optimization-focused session when its verification limits are stated. Inspect the existing test and results; creating another test is not part of an ordinary presentation.

Loop 9 can accompany loop 1 to distinguish known agent attributes from browsing-derived interest. Loop 1 uses role and an imported growth cohort; loop 8 uses experiment allocation; loop 9 uses affinity conditions on a separate Products component. Keep their evidence and outcomes separate. For a fresh neutral-to-interest transition, prepare and run loop 9 before other loops visit tagged workers-compensation or household pages. Otherwise, inspect the existing history and describe the result as a repeat visit rather than a fresh starting profile.

## Before presenting

1. Coordinate one reviewer pack and an active run. Do not reset a pack another reviewer is using. Packs `01`–`04` contain the same people with separate operational work and native profile identifiers. Users in the same agency and pack share agency work; favorites and learning registrations belong to the individual agent.
2. Use the [production portal](https://liberty-mutual-agent-portal.vercel.app/login) for browsing and live native experience inspection. Use the [designated preview portal](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/login) for planned submission, bond, cross-agent and reset exercises. Preview has a separate operational namespace. **The Sitecore tenant and published content are shared: publishing CMS content can affect production and all packs.** Native profile identity is keyed by pack, person and generation, without environment; the same combination on preview and production shares UDL history.
3. Open Sitecore in a separate tab, in **Safeco Insurance Company of America POC**, site **Liberty Mutual Agent Portal** (site name `liberty-mutual-agent-portal`). Have access to Page Builder, Search, UDL/personalization, Design and Agentic as needed. Portal usernames do not provide Sitecore administrative access. For loop 7, also open the private GitHub repository and release PR.
4. Use the synthetic password **`Sitecore`** for every portal login. The `.01` usernames below illustrate one complete pack; keep your assigned suffix throughout instead of switching to pack `01`. For example, a pack `04` reviewer uses `avery.04`, `jordan.04` and the other `.04` accounts. The customer deck uses pack `04` for hosted loops; its separate local workshop uses `daniel.01` with isolated local state. Use one portal tab when switching people. Click the current agent’s name at the top right, such as **Avery Brooks → Sign out**, then sign in again. Historical cross-agent records have been reset; create a new case in the assigned preview pack.
5. Confirm the pack has not expired. Saved work lasts seven days from the run's start; application sessions last eight hours. An expired workspace requires a deliberate operator reset, not repeated login attempts. Check current product-rule dates before a transactional exercise; the business-metrics scenario is fixed while authorization uses current UTC.
6. Rehearse the chosen loops on the deployment you will present. The guide records baseline headings and counts; approved editorial changes can change copy and Search totals. Do not alter profiles or force audience matches simply to reproduce a screenshot.
7. Before a fresh loop 9 replay, record the selected host, pack and current profile generation, then inspect Daniel’s, Maya’s and Elena’s native history. Production and preview share history for the same person/pack/generation. If a restart is needed, first verify that the next imported generation is available and unused for this journey on both hosts; coordinate the whole pack and restart before sign-in. Signing out or resetting saved work does not clear affinities. See [Reset and repeat](#reset-and-repeat).

| Example login | Person / agency | Role | Licensed states |
| --- | --- | --- | --- |
| `avery.01` | Avery Brooks / Cedar Ridge | Agency principal | TX, FL, IL |
| `jordan.01` | Jordan Ellis / Cedar Ridge | Small commercial producer | TX, IL |
| `maya.01` | Maya Chen / Cedar Ridge | Personal lines account manager | TX, FL, IL |
| `daniel.01` | Daniel Ortiz / Prairie Oak | Business insurance producer | IL, TX |
| `priya.01` | Priya Shah / Harborline | Commercial account executive | FL, TX, IL |
| `marcus.01` | Marcus Reed / Harborline | Surety specialist | FL, TX, IL |
| `elena.01` | Elena Park / Summit Specialty | Wholesale broker | IL, TX, FL |

The insurance records, premium figures, authority records and operational actions are synthetic integration examples. Native CMS, Search, UDL, personalization, Design and Agentic configuration are inspectable in Sitecore. No workflow rates or binds insurance, issues a bond, or sends an email to a customer or underwriter.

## Loop 1: One agency, different people

**Story:** Liberty Mutual supports an agency's growth through guidance tailored to each colleague's role.

**Start:** Avery, Jordan and Maya from the same pack; Elena as the comparison outside the growth cohort. Portal access is enough for the agent journey; UDL and personalization access are needed for the platform reveal. No operational writes are required.

1. Sign in as `avery.01` using your assigned pack suffix. In **My workspace**, introduce Cedar Ridge, agency production and priorities. Find the **Agency growth** card below **Your priorities**, record its headline and follow its action button. This is separate from the **Agency growth** page in the left navigation; its technical component name is `AgentGuidance`.
2. Sign out; repeat with `jordan.01`, then `maya.01`. Explain their different responsibilities within the same agency. Their workspaces also differ in operational scope.
3. Sign in as `elena.01`. Show the neutral guidance for a wholesale broker outside the small-business growth cohort.
4. In UDL, inspect the correct person, pack and active profile generation. Review individual role, agency relationship, state/specialty attributes and `smallBusinessGrowthAudience`. Keep individual production distinct from agency totals.
5. Open the Published JavaScript Custom Value **Liberty Mutual - Small business growth role**. In **Page Builder → Home → Layers → AgentGuidance**, click **Edit personalization rules**. Inspect the Live **Liberty Mutual - Small business growth guidance** table, tracing cohort plus role to the authored `AgentGuidance` datasource. Click **Cancel** to leave the rules unchanged.

**Expected baseline:**

| Person | Guidance heading |
| --- | --- |
| Avery | Build your next chapter in small business |
| Jordan | Bring a stronger submission to the table |
| Maya | Connect everyday conversations to new needs |
| Elena | Resources for your next client conversation |

**Explain:** “One agency opportunity can produce different next steps for its principal, producer and account manager.” Native UDL identity and decisioning select CMS content. The agency growth cohort is a seeded attribute; the display is not calculating a new live segment from a policy system. Marketing attributes never grant transaction permissions.

**If the result differs:** neutral guidance is an intentional fallback when identity linkage or decisioning is unavailable. An unexpected neutral result for Avery/Jordan/Maya is not proof of successful targeting. Record the person, pack, deployment and time, then inspect identity/rule evidence rather than repeatedly refreshing until a match appears.

**Leave it ready:** sign out. Native engagement history remains; ordinary logout does not require a reset. See the [native personalization record](../authoring/personalization/README.md).

## Loop 2: Find the right answer

**Story:** an agent finds useful guidance across all their licensed states, without sorting through irrelevant state-specific results.

**Start:** `daniel.01`, with `maya.01` as the comparison. Use the native connected resource library. Saving one resource is optional and writes only the selected person's saved work.

1. Open **Learning & resources**. Confirm **Risk state → My licensed states**. Daniel's default includes Illinois, Texas and nationwide guidance, despite Illinois being his home state.
2. Search **Workers compensation**. Show Illinois, Texas and relevant nationwide results; Florida-only guidance is absent from this default.
3. Select **Texas**, then **Illinois**, then **Nationwide guidance only**. Each state includes its applicable guidance plus nationwide content; the last option excludes state-only articles. Daniel's selector offers neither Florida nor an All states override.
4. Use **Clear filters** to restore licensed-state scope while retaining the search phrase. If demonstrating empty results, use an unmatched phrase and **Reset search** to clear it too.
5. Open the Texas workers compensation article. Point to the source and reviewed date. If it is not already saved, select **Save resource**; reload and confirm its saved state.
6. Sign out and compare Maya. Her three-state license profile includes Florida in the default results.

**Expected baseline:** 12 authored resources overall, 11 for Daniel's licensed-state scope, 12 for Maya and 9 nationwide-only. Daniel's workers-compensation query returned 4 in the verified release. Treat these as baseline evidence rather than fixed product limits after new content is published.

**Explain:** “The article and its searchable metadata come from the same Sitecore ResourcePage.” Native Search performs the query, facets, pagination and counts. Custom query composition supplies active licensed-state context; the portal's durable service stores favorites. Direct articles and saved-resource views use that same licensed scope. These guidance checks do not replace the additional permissions required to advance insurance work.

**If the result differs:** inspect query, facets and current published/indexed content. Do not call an indexing delay a failed publication or describe local filtering as native Search. The optional Search Configuration Manager plugin editor is not enabled; configuration currently uses its existing JSON field.

**Leave it ready:** clear the query/filters and sign out. Keep the new favorite or remove only the one added during this loop. See [Search composition](content-model.md#native-resource-search-composition).

## Loop 3: From opportunity to submission

**Story:** an agent turns product guidance into a prepared account while retaining the correct jurisdiction.

**Start:** `daniel.01` on the designated preview, in a coordinated pack. This loop creates one new fictional submission. Use a unique account name such as **Prairie Market Partners — presenter initials** so it is easy to find afterward.

1. Open **Products & appetite**. Confirm that **Risk state** offers only Illinois and Texas. Select **Texas**.
2. Open **Explore coverage** on a product card. Inspect the native guidance and use **Back to products & appetite**; Texas remains selected.
3. On **Businessowners policy**, select **Prepare account**. Confirm the coverage and Texas risk state. Choose **Retail** under **Business type**, then **Continue to account information**.
4. Enter the unique fictional account name, a valid upcoming effective date within configured product availability, employee count and annual revenue. Select **Save & review requirements**.
5. In the saved record, confirm the actual risk state, effective date and reference. Complete each current preparation requirement. **Submit for review** becomes available only when preparation is complete and authority remains valid.
6. Submit this newly created record, then reload and reopen it. Confirm its state and Submitted status persist.

**Optional state-change branch:** before saving step 4, go **Back**, deliberately change Texas to Illinois, and continue. Save and verify Illinois in both the record and return navigation. This demonstrates an explicit change, not an automatic substitution.

**Expected result:** saved state and date match the input; the required checklist is enforced; the submitted record survives reload. With an explicit unlicensed `state=FL` new-intake link, Daniel must choose an available state instead of silently falling back to his home state.

**Explain:** “Published guidance supports the conversation; the operational adapter checks whether this person can advance this account.” Licenses, required authority, carrier appointments, product availability and preparation rules are checked again on the server. The configured rules are fictional, not approved Liberty Mutual underwriting rules. Submission does not bind coverage.

**If blocked:** read the reason. Check the selected state, industry, date and current rule, not only the broad product list. Use a new account for a new attempt; do not change someone else's existing review record to make the scenario pass.

**Leave it ready:** record the reference and retain the new preview submission. A coordinator can later reset the entire assigned pack using the process below; there is no implied per-record delete action.

## Loop 4: Different specialties, one portal

**Story:** the same platform supports personal lines, commercial/specialty work and surety with different operational views.

**Start:** use `maya.01` and `marcus.01` on the designated preview for saved work, and `priya.01` and `elena.01` on production for read-only comparisons; substitute your assigned suffix throughout. Select the branches relevant to the audience. The renewal branch creates a task; the surety branch creates a bond request. The commercial and wholesale branches are read-only.

**Personal lines — Maya:**

1. Open **Clients & policies → Review renewals** and select the **Morgan household** **Homeowners** row (`LM-8426101`); the Auto row (`LM-8426100`) has the same household name.
2. Select **Renewal review → Save a renewal follow-up**. In **Keep the conversation moving**, enter a distinctive **Follow-up title**, **Due date** and notes, then **Save follow-up**.
3. Close the account panel, select **My workspace**, then **Your priorities → All priorities**, and reload. Show the new priority attached to the policy. Saved follow-ups are not in the workspace's **Renewals** filter. Explain the separation between saving an administrative task and changing insurance coverage.

**Commercial and specialty — Priya:**

1. Open **Clients & policies** and choose **Coastal Fabrication Group → Commercial property** (`LM-8426108`); its General liability row is `LM-8426109`. Inspect **Overview**, **Renewal review** and **Documents**. The optional **Coverage summary** is an authenticated generated reference document, not an issued policy PDF.
2. Open **Products & appetite → Commercial → Commercial property → Explore coverage**. Return and select **Specialty → Specialty casualty → Explore coverage**. Priya’s seeded book has no specialty policy, so the specialty branch uses product guidance. Her independent-agency channel opens the retail-specialty guide.
3. Contrast the relevant book and product guidance with Maya's personal-lines work. Priya and Marcus share Harborline; they still have different specialties. This branch does not require changing a policy.

**Wholesale specialty — Elena:**

1. After Priya signs out, sign in as Elena on production. Open **Clients & policies → Northpoint Property Partners → Specialty casualty** (`LM-8426111`). Inspect **Overview**, **Documents** and **Renewal review** without changing the policy.
2. Open **Products & appetite → Specialty → Specialty casualty → Explore coverage**. Elena’s wholesale channel opens the wholesale-specialty guide, distinct from Priya’s retail-specialty guide.
3. Click **Elena Park** at the top right and inspect **Distribution channel** and **Licensed states** in **Your profile**, then **Sign out**.

**Surety — Marcus:**

1. Open **Quote & submit → New bond request**.
2. Enter a new fictional **Principal legal name** and **Obligee**. Choose a **Bond type** and licensed **State**, enter **Bond amount ($)** and any request notes.
3. Select **Save bond request**. The new record opens automatically; confirm its saved state and amount.
4. Select **Submit bond request**, then reload. Under **Your submissions → Bond requests**, find the new principal and reopen it. Confirm the same reference, state, amount and **Submitted** status.

**Expected result:** scoped books and preparation options differ by specialty; the new task/bond remains after reload. A new bond follows Draft → Submitted. Use a newly created Draft for this loop; the current UI does not provide a complete response/edit loop for an older bond marked Information needed.

**Explain:** these are custom application workflows backed by synthetic insurance data and durable Redis state. Sitecore supplies the editable experience and guidance. No policy change, bond issuance or outbound underwriter message takes place.

**Leave it ready:** note the task title and bond reference, retain the new work and sign out after each person. Coordinate the preview pack’s saved-work reset only after all created examples from loops 3, 4 and 7 have been reviewed. Do not mark unrelated priorities complete during the presentation.

## Loop 5: Marketing owns the content

**Story:** a marketer updates an agent resource once and follows it through preview, publication and Search without deploying application code.

**Optional creation exercise:** before or after this existing-article walkthrough, use the [new resource and Media exercise](resource-page-authoring.md#a-short-creation-exercise). Create an independent unpublished **Resource page**, observe its blank fields and local **Data/Resource image**, and select an existing asset through **Browse media library → Media BETA**. Recycle only that practice page afterward. Keep this exercise separate from the published Texas article restoration below; an agent workspace reset cannot reset CMS content.

**Start:** native Content, Page Builder and Search Sources access, the correct customer author and approver roles, and an agreed temporary edit plus restoration wording. **Customer author/approver separation remains unverified.** The control path below describes this tenant's workflow; it does not establish acceptance with separate customer accounts. Allow time for an explicit Search source reindex after publication and restoration.

1. In the portal site, locate **Home → Learning & resources → Workers compensation: a Texas starting point** (item name `texas-workers-compensation`). Select **ResourceArticle** and inspect its title, summary, body, source and reviewed date. The page itself is the datasource; the unused **Data/Resources** copies are not the active source.
2. Show the current article and Search result in another tab. Record the original summary.
3. Open that same resource item in native **Content** and create a **new English draft version** with a descriptive name, such as **Presenter verification**. Edit **Summary** without altering regulatory meaning, then click outside the field. Content mode autosaves on blur; wait for the **Saved** checkmark rather than looking for a Save button. Preview this version in **Editor** using the configured **Default** editing host. Record the new version number; do not edit the published version in place or change the editing host for this exercise.
4. From **Draft**, choose **Actions → Approve**, then **Submit** in the workflow dialog. Confirm the item reaches **Approved**. Perform these steps with the appropriate roles; a seed item's status or an administrator's access does not prove customer separation of duties.
5. Choose **Publish Page**. Keep **Page** and **Current language (English)** selected and leave **Subpages** off. Uncheck **Include related items first**, then uncheck **All references**; switching off All references hides the related-items checkbox, so set the related-items option first. Select **Start publish**, confirm completion, then verify the new summary in the live article and resource listing.
6. Open **Content → Search Sources**. Locate **Liberty Mutual Agent Resources**, confirm source ID `b5e24aff-8b5b-4653-bf66-deef52c1241a`, and choose **Reindex Content** for that source. Wait for the indexing job to finish, then verify that the native Search result card contains the changed summary before recording the editorial loop as successful. No Git deployment is required.
7. In Page Builder, open **Home → Layers → AgentGuidance** and inspect the reusable **Data/Guidance** datasources and the **Default** and **Highlight** variants. Show the eyebrow, headline, body and action-link fields that marketing owns.

**Managed metadata exercise:** use the installed app’s existing organization administrator/owner access. After creating the English Draft in step 3 and before approval in step 4, open **Apps → Resource metadata**. Record **Risk state**, **Business family**, **Product**, **Distribution channel** and **Resource type**. These are five single-select lists. Change **Resource type** to **Preparation guide**, observe the unsaved count, then **Discard changes**. Repeat the selection and click **Save metadata**; **Refresh** must retain it. Restore the recorded original type with another **Save metadata**, then **Refresh** before continuing publication. Discard does not undo a completed save. Approved versions are read-only. Follow the [Resource metadata panel guide](resource-metadata-authoring.md#use-the-resource-metadata-panel) for the full validation and access boundaries.

**Expected result:** one authored source drives article and Search metadata; editable component fields remain native; operational actions are disabled in the authoring context. The full customer author → approver → publication round trip must be recorded before it is described as accepted.

**Explain:** “Content changes and application releases have separate ownership and release paths.” This native content source requires an explicit reindex to ingest published changes; publication alone is not proof that Search is current. See [Sitecore's content-source workflow](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/search-experiences/manage-content-sources.html). The editing host isolates operational preview data, but publishing in this shared Sitecore tenant can update the live site. A reviewer-pack reset does not undo a CMS publication.

**If the transition is not ready:** show the saved version, preview and last verified native evidence. Check the owned source's indexing status and record a pending or failed job without claiming Search success. Do not bypass approval, perform a broad site publication, or rebuild unrelated CMS indexes to force one card to change.

**Leave it ready:** create another **new English draft version**, named for the restoration, and restore the agreed original wording, or explicitly retain the approved change. After editing **Summary**, click outside the field and wait for the **Saved** checkmark. For restoration, use **Actions → Approve**, then **Submit** in its dialog, confirm the Draft reaches **Approved**, and repeat the scoped **Publish Page** settings: Include related items off first, then All references off; Subpages off, Page and current English on. Run **Reindex Content** on **Liberty Mutual Agent Resources** again and verify the restored summary in the article, listing and native Search result. Record the item/version, publication and indexing results. See [content model and publishing](content-model.md) and [customer-role acceptance](developer-handoff.md#runtime-acceptance-and-evidence).

## Loop 6: Grow an agency relationship

**Story:** marketing researches the real Watkins Insurance Group and prepares three useful outreach emails for its CEO, a construction-focused advisor, and the commercial client service team.

**Start:** native Design and Agentic access. No portal agent login is needed for this loop. The portal's fictional Cedar Ridge users remain a separate example.

1. Open **Design → Brand kits → Liberty Mutual — Independent Agents**. Inspect the published Knowledge PDF, authored **Visual guidance**, and English site assignment in **Channels → Liberty Mutual Agent Portal → Localization → Configuration**. Public-source kit provenance is separate from customer corporate-brand approval.
2. Open [Liberty Mutual | Watkins Insurance Group outreach](https://agentic-studio-use.sitecorecloud.io/spaces/c7b405d0-efc0-4bac-9cb4-86e7a67c4251). In the **Artifacts** dropdown, select **Watkins | Account research and campaign brief**. When the conversation scrolls to that card, click its expand arrows to open the full dialog. Read the current agency facts and distinct role goals.
3. In the dialog's left list, select **Watkins | Principal email preview | Patrick Watkins**, then **Preview**. Observe a planning conversation and **Explore construction capabilities**.
4. In the left list, select **Watkins | Advisor email preview | Clint Bradford**. Click **Preview** if needed. Observe three contractor-discovery questions and **Read the construction checklist**.
5. Select **Watkins | Client service email preview** in the left list. Click **Preview** if needed. Observe the claims-service handoff and **View commercial claims reporting options**.
6. Close the dialog and expand the actual **Get Brand Kit** and **Get Brand Kit Section** results. For source details, open **Watkins outreach | Evidence and editorial review** through the Artifacts dropdown and its card's expand arrows. Keep the source dossier and implementation JSON outside the readable email preview.

**Expected result:** a sourced account example with three distinct role messages. The [native execution record](agentic-studio/watkins-native-evidence.md) records which research, generation and HTML previews were actually verified.

**Brand grounding:** expand the corrected Watkins run’s **Get Brand Kit** and **Get Brand Kit Section** results. The returned **Visual Guidelines** includes complete authored palette, Roboto and logo guidance. The [September 14 saved brief](agentic-studio/brand-kit-consumption-repair-2026-09-14.md) remains separate historical proof.

**Leave it ready:** close the dialog and retain the saved outputs. No email send, CMS publication, audience activation or workspace reset is part of this inspection. The fictional portal's Agency Growth content and UDL identities remain unchanged.

## Loop 7: Beneath the implementation

**Story:** developers can trace an agent action through clear contracts and server rules, then release changes with repeatable checks.

**Optional hands-on extension:** use the [developer workshop](developer-quickstart.md) to change a component locally and inspect Fast Refresh before discussing the shared release pipeline. Each attendee's JSON state is local; this extension does not require a shared preview reset, CMS publication or Git push.

**Start:** GitHub/code access and a coordinated preview pack. Avery and Jordan must share the same pack. The cross-agent API cases in [release evidence](qa-evidence-2026-09-11.md) and [rehearsal evidence](qa-seven-loops-2026-09-11.md) used preview pack `04`; the fresh browser Draft check used preview pack `01`. The reset cycle removed those records from active saved work. Use their IDs as historical evidence and create a new Draft for this loop.

1. Briefly show Daniel's licensed-only Products selector and retained state through intake, or reuse the result of loop 3.
2. In preview, have Avery create a new Florida BOP draft and note its ID/reference. Sign out and sign in as Jordan from the same pack. Open that shared record: Florida remains visible, with an authority explanation and disabled Edit/checklist/Submit controls. Keep this comparison in Draft; an already Submitted record does not prove the same Draft-button restrictions.
3. Trace [public contracts](../examples/liberty-mutual-agent-portal/src/contracts/portal.ts) → [shared eligibility decisions](../examples/liberty-mutual-agent-portal/src/domain/eligibility.ts) → [server action enforcement](../examples/liberty-mutual-agent-portal/src/server/data/portal.ts). Show current UTC validity, required lines, carrier/state appointments, actor and assigned-producer checks, current preparation rules and the refusal to silently change a saved jurisdiction.
4. Inspect [cross-agent regression tests](../examples/liberty-mutual-agent-portal/src/server/data/eligibility-authorization.test.ts) and deployed acceptance evidence. Direct unauthorized API requests return `403`; denied writes preserve versions and records. A disabled button alone is not the permission boundary.
5. Show the [durable store contract](../examples/liberty-mutual-agent-portal/src/server/state/store.ts): environment/pack/run/agency scope, expected versions, idempotency keys and atomic compare-and-set. Sign back in as Avery to complete and submit the newly created eligible record if demonstrating the positive path live.
6. Open [PR #21](https://github.com/tohams/liberty-mutual-sitecoreai/pull/21), the deck’s historical affinity release example. In **Conversation**, click the green **4 / 4 checks OK** beside commit `cac3e38`. Inspect **Offline validation** and **Connected production build**, then the **Details** link for **Vercel — Deployment has completed**. The Checks tab alone does not expose that deployment row. Compare the exact source commit and host with the [September 13 native runtime record](qa-affinity-personalization-2026-09-13.md). Record the current deployed commit separately; later releases are not proved by this historical PR. Explain generated SDK maps and separate code/content releases.
7. If identity integration is the audience's focus, inspect [browser-profile decisioning](../examples/liberty-mutual-agent-portal/src/server/personalization/browser-profile-decision.ts), the native UDL profile and LIVE decision table. Contrast server authorization with marketing personalization and its neutral fallback.

**Optional operator exercise:** use Node.js 24 and the private repository checkout with its synthetic `fixtures/portal-logins.json` available. From `examples/liberty-mutual-agent-portal`, the following existing helper creates two new fictional preview records and verifies the cross-agent negative and eligible positive paths. It uses portal logins, not the operator reset secret. Choose `--pack` deliberately; never assume `04` is unused.

```sh
node scripts/verify-state-eligibility.mjs --origin https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app --pack 04 --exercise-preview
```

It retains the new records, does not edit preexisting records, and does not reset a pack. Production acceptance uses the default mode without `--exercise-preview`, performing bootstrap reads and denied requests only. See the [eligibility runbook](state-eligibility.md) before running it.

**Expected result:** API enforcement matches the UI's explanation; eligible work persists; code, content and state have distinct ownership boundaries; release gates and native runtime evidence are both available. CI alone does not establish correct native tenant configuration. The fictional adapter must be replaced with approved insurance-system authority and underwriting data for real use.

**Leave it ready:** retain the newly created preview records and record their references. Close test sessions. No deploy, rollback, secret change or reset is needed merely to explain the implementation.

## Loop 8: A clearer next step

**Story:** marketing tests whether a more specific action label helps agents discover the small-business growth guide.

**Start:** native Page Builder/A/B and results access, the [current experiment's acceptance record](ab-testing.md#native-configuration-and-acceptance-record), and an assigned portal account. **Liberty Mutual Small Business Guide CTA** is Live. Published treatments and normal guide navigation are verified; native goal attribution remains pending. Use the existing test rather than creating another. A normal authenticated visit adds native history; do not promise a particular treatment or stable assignment. The ended **Liberty Mutual Small Business Resource CTA** report describes an earlier test.

1. Open **Learning & resources**. Below the search results, locate the visible **Useful guidance, easier to find** banner. Explain that the test changes the action label only.
2. In **Page Builder → Pages → Home → Learning & resources → Layers**, click the test icon beside **AgentGuidance**. Inspect A **Start with small business** and B **Build your small-business practice** in native treatment preview; keep the headline, body, layout and destination identical. Return the editor selection to A without changing the test.
3. Show the configured **50/50** allocation, **100%** participation and **Increase page views** goal for `/resources/expand-small-business-practice`. The first test includes authenticated Resources visitors without additional role, agency, state or growth-cohort targeting. The workspace's existing personalization is a separate experience.
4. From a normal authenticated Resources visit, follow the displayed treatment's action. Both target the same growth guide. Trace the native page variant and destination event using the recorded evidence. In **Performance → Profiles → Search filter**, choose **Liberty Mutual agent identity**. In `examples/liberty-mutual-agent-portal/fixtures/udl/profile-identity-map.json`, match the username and active generation, copy its `identifier`, paste it into the native search field and press Enter. Open the matching person and **Engagement**. Use the current operator receipt or authenticated bootstrap to confirm the active generation; an old direct profile reference can open a retired alias without sessions. Seeing A's copy alone does not distinguish assigned control from fallback; editor preview or an explicit B layout request does not establish random assignment or goal attribution.
5. Open **Performance → Component A/B/n tests → Site: liberty-mutual-agent-portal → Test: Liberty Mutual Small Business Guide CTA**. Describe the observed visits and reporting status. A destination-page goal measures movement to the guide, including possible alternate navigation paths; it does not prove a click on this button or insurance conversion. Rehearsal traffic is insufficient to establish a winning label.

**Expected result:** a native experiment holds the content comparison, allocation and page-view goal; authenticated delivery and attribution have their own recorded checks. A configured test and two previews alone do not prove live measurement.

**Explain:** “We can test whether a clearer next step helps agents find useful guidance.” The card sits below Search, so a page allocation does not prove the action was visible. The test demonstrates the optimization process; manufactured traffic cannot establish business lift or statistical confidence.

**If results are not ready:** show the recorded configuration and verified treatments, identify the pending measurement check and preserve the actual reporting status. Do not force identities or generate repeat visits to make a winner appear.

**Leave it ready:** sign out and preserve the experiment's state and history. Operational resets do not stop or reset the test. Production and preview share native history for the same pack/person/generation. See the [experiment's measurement and lifecycle boundaries](ab-testing.md#rehearsal-reset-and-lifecycle).

## Loop 9: An interest becomes a relevant next step

**Story:** the Products spotlight can respond to an agent's current interest while their known profile and transaction permissions remain unchanged.

**Start:** coordinated Daniel and Maya accounts, access to native Affinities, Profiles and **Liberty Mutual - Product interest spotlight**, and the [affinity acceptance record](affinity-personalization.md#acceptance-record). The historical accepted topic journeys used pack `03` on preview and pack `04` on production, generation 0; Elena `.04` provided the no-affinity comparison on both hosts. These are evidence references, not instructions to switch packs. Keep the assigned pack and selected host throughout this replay. Before any tagged browsing, inspect the current generation and starting scores for Daniel, Maya and Elena. For a fresh transition, run this loop before other tagged-page visits, or coordinate a checked next generation as described under [Before presenting](#before-presenting). A fresh login is not a clean affinity baseline.

1. Match Daniel’s username and active generation in `examples/liberty-mutual-agent-portal/fixtures/udl/profile-identity-map.json`. In **Performance → Profiles → Search filter → Liberty Mutual agent identity**, paste its `identifier`, press **Enter**, open Daniel and inspect **Overview → Top affinities**. Then sign in on the selected portal host and open **Products & appetite → Risk state → Illinois**. Record known attributes, starting scores and the actual headline. Expect **Protection built around the business you know.** only for a verified no-affinity profile; an existing history can already select a topic. `ProductSpotlight` is the hero above the catalog, separate from `AgentGuidance`.
2. Open **Performance → Settings → Affinities**, select **Liberty Mutual Agent Portal**, and inspect `insurance_interest = workers_compensation` on the Illinois and Texas workers-compensation resource pages. The Florida resource is tagged with the same value. Household interest is assigned to the household-renewal resource and `/products/personal`. The Products landing page is untagged, so merely returning to see the spotlight does not reinforce its selected interest.
3. As Daniel, open **Learning & resources** and click **Workers compensation** under **Popular**. On **Workers compensation: an Illinois starting point**, select **Read resource**. Use browser **Back**, then click **Workers compensation** under **Popular** again before selecting **Read resource** on **Workers compensation: a Texas starting point**. Browser Back returns to the library with a blank query; repeat the focused search instead of assuming its results were retained. In the same identified profile, confirm the native events use CMS names `illinois-workers-compensation` and `texas-workers-compensation`, then observe the resulting interest score. Their URLs still include `/resources/`; the event page name must match the native affinity assignment. The accepted Daniel journey showed 1 view after Illinois and 2 after Texas, with score 1.00. Existing history can change the result; these observations are not a guaranteed delay or visit threshold.
4. Return to **Products & appetite** with Illinois still selected. In **Liberty Mutual - Product interest spotlight**, inspect the saved **Custom Value → Top Affinity** String input (`top_affinity_value`) and its `workers_compensation` datasource mapping. For the same Daniel profile whose score you just inspected, verify **Build a stronger workers compensation conversation** and **Review account preparation**. Record the native score, saved table mapping, rendered headline and CTA; Daniel’s known attributes stay unchanged.
5. Follow the action to `/resources/build-a-bop-submission` and confirm Illinois context is retained. This is the existing general account-preparation resource. Check that the catalog and transaction controls still follow state and agency eligibility. Interest selects content relevance; it does not grant authority.
6. After Daniel signs out, use a separately checked Maya profile on the same host. Record her starting Products headline with Texas selected; it is neutral only if her inspected profile has no affinities. Select **Personal lines → Homeowners → Explore coverage**, then **Explore preparation guide**. The journey is `/products/personal?state=TX` → `/resources/prepare-a-household-renewal?state=TX`. Inspect her native household score, the saved household table mapping, then **Make the next household renewal conversation count** on Products. Follow its checklist CTA and confirm Texas remains selected. Finally, sign out and use an independently checked Elena profile with no affinities to verify the neutral headline; the preceding users’ topic choices must not carry over.

**Expected result:** actual tagged-page visits build a native affinity signal that selects an authored ProductSpotlight variant for the same agent. A saved tag, previewed variant or configured condition alone does not prove that transition. Keep the native score, saved table mapping, rendered result and comparison evidence in the [affinity record](affinity-personalization.md).

**Input boundary:** the built-in custom value has no affinity-name selector in the inspected UI. The site currently uses only `insurance_interest`; do not describe the input as explicitly scoped to it. No valid affinities returns `null` according to Sitecore's documentation; neutral delivery was verified for Elena’s no-affinity profile. A separate raw null-input receipt was not captured. The inspected built-in source retains the first encountered value when scores tie. That is not a business priority or a guarantee of stable topic ordering; see the [source-contract evidence](affinity-personalization.md#saved-native-decision-and-built-in-contract).

**Explain:** “Known attributes tell us who the agent is; browsing adds a signal about what interests them now.” This extends the personalization story beyond loop 1's role/cohort inputs. It is independent of loop 8's A/B allocation, and it does not claim reading completion, intent to transact or measured business lift.

**Current acceptance status:** production merge `b99e3ca` and corrected preview `cd96c0d` passed Daniel and Maya’s separate native topic journeys. Each produced **2 native views, score 1.00**, for workers compensation and household respectively, then the matching authored spotlight and a state-preserving CTA. Both hosts passed 37 existing Workspace personalization checks. Elena’s no-affinity comparison retained neutral content on both hosts. The original failed journeys remain in the [QA record](qa-affinity-personalization-2026-09-13.md).

**Leave it ready:** record the ending profile generation, topic scores, content and comparison outcome, then sign out. Logout and `saved-work` reset retain native history. A `restart` affects the entire pack and advances to the next already-imported, verified generation; old history remains. Check that the target generation is available and unused on either host before relying on it for a clean rehearsal. Follow [Reset and repeat](#reset-and-repeat).

## Reset and repeat

Use the [operator reset runbook](../examples/liberty-mutual-agent-portal/docs/auth-and-data.md#durable-work-and-resetting); operator controls are intentionally absent from agent navigation. The command requires the separate operator secret in the shell environment. Never put that secret in this document, a URL or a presentation.

| Finish action | Effect | Use when |
| --- | --- | --- |
| Sign out | Preserves saved work and native history | Ending ordinary loops or changing person |
| `saved-work` reset | Starts a fresh operational run for all agencies in the selected pack; retains native identity generation/history | Coordinated return to the operational baseline |
| `restart` reset | Starts a fresh operational run, invalidates old sessions and advances to the next already-imported, verified profile generation | Advance the selected pack to the next verified profile generation |

Neither reset erases prior Sitecore analytics or restores CMS content. Other packs remain separate. A clean native history requires confirming that the target generation has not already been exercised on either host; restart checks import verification, not the absence of events. Restart stops when no next verified generation is available; it is not an unlimited “erase CDP” button. Announce a planned pack reset to active reviewers and have them refresh or sign in again as the operator runbook requires. Do not reset merely to tidy up four newly created presentation records while another person is reviewing them.

## Presenter record

Copy this checklist into the review notes after a rehearsal or customer session. Record evidence, not only whether a screen opened.

- Date/time, presenter, deployment/commit, tenant and assigned pack:
- Loops completed and people used:
- Expected guidance vs. observed guidance; Search scope/results:
- New task/submission/bond references and whether retained:
- CMS item/version, approval roles, publication/indexing result, restoration decision:
- Agentic artifacts reviewed; historical excerpt input, native authored-text consumption proof and remaining metadata/array limitation stated:
- A/B experiment ID/state, treatment, goal evidence and reporting time; any pending checks:
- Affinity profile generation, starting/ending topic scores, saved table mapping, rendered spotlight/CTA and comparison result; any pending checks:
- Failures, unexpected neutral results, owner and next action:
- Logout/reset completed, or saved work deliberately retained:
