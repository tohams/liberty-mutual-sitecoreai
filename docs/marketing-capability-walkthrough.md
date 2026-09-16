# Marketing capabilities walkthrough

This guide follows the small-business growth campaign from an agent's visit to the content, targeting and release controls that marketing owns. Use it with the [agent and marketing loops](demo-loops.md), the [content authoring guide](resource-page-authoring.md), and the [operator reset procedure](demo-loops.md#reset-and-repeat). The capability map at the end accounts for all 33 requested functions and identifies where application work or a production integration is involved.

Start with the agent experience, then open SitecoreAI to see how it is managed. The developer workshop is a separate exercise and is not a prerequisite for marketing users.

Salesforce remains Liberty Mutual's existing business backend. SitecoreAI manages the portal's content, relevant guidance, Search and experiments. The current POC uses fictional JSON data and imported UDL attributes; it is not connected to Liberty Mutual's Salesforce instance. Production integration will agree the relevant objects and transactions, link agent/agency identity, map approved fields and freshness, and secure backend reads and writes.

## Accounts and preparation

Use an assigned reviewer pack throughout. The examples below use `.04`; substitute your assigned suffix consistently. Every fictional portal password is `Sitecore`. SitecoreAI itself uses your own invited account in **Safeco Insurance Company of America POC** and the **Liberty Mutual Agent Portal** site.

| Workspace | URL | Use |
|---|---|---|
| Live portal | [https://liberty-mutual-agent-portal.vercel.app/login](https://liberty-mutual-agent-portal.vercel.app/login) | Read-only campaign exploration, Search and personalization comparisons |
| Designated preview | [https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/login](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/login) | A new saved conversation request and coordinated cleanup |
| Page Builder | [Liberty Mutual Agent Portal in Page Builder](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb) | Content editing, component composition, AI assistance, preview and workflow |
| SitecoreAI | [Safeco Insurance Company of America POC](https://app.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df) | Profiles, personalization, performance, Media and Brand Kit work |

Read the cleanup at the end of each exercise before changing anything. Portal saved work, native CMS content and UDL profile history have different reset procedures. A shared preview pack must not be reset while another reviewer is using it. Leave the configured **Default** editing host selected during marketing exercises.

**Delivery context matters.** Production uses Sitecore Live content. The designated Vercel preview uses CMS Preview content and can display unpublished or expired items. Use production to verify publication, expiration and ordinary native personalization delivery. Use Page Builder's Default host to inspect drafts, and the designated preview for the isolated saved-request exercise.

If you want to observe affinity starting from an unused profile, complete the preparation in [loop 9](demo-loops.md#loop-9-an-interest-becomes-a-relevant-next-step) before browsing tagged guidance. Signing out or resetting saved work does not clear affinity or experiment history.

## 1. Experience the campaign as an agent

The live campaign is [https://liberty-mutual-agent-portal.vercel.app/growth/small-business](https://liberty-mutual-agent-portal.vercel.app/growth/small-business). Its navigation label is **Small business growth**. The CMS page's display name is **Small-business growth**.

| Step | Click or enter | Observe |
|---|---|---|
| C1 | Sign in as `daniel.04`. Beside **Agency growth**, select **Show Agency growth pages**, then **Small business growth**. | The child page opens. **Overview** still leads to the agency production view. |
| C2 | Under **ON THIS PAGE**, select **Opportunity**, **Your questions** and **Your next step** in turn. | Each anchor moves to the corresponding part of the page. The page title includes the growth icon. |
| C3 | Expand **Where should my team begin?** and **What should we prepare before asking for a review?** | Each accordion displays its own authored answer. Use Tab and Enter or Space to inspect keyboard operation. |
| C4 | Under **Keep useful guidance close**, select **Develop your small-business practice**. Return to the campaign. | The link opens the current resource. The callout's preparation action and the other resource links remain clear, separate destinations. |

The campaign's hero, alert, callout, questions, resource list and contact introduction are native authored content. The page layout and each component's behavior come from the application. The role and premium-share example below personalizes the callout separately from the existing Home, Products and Resources experiences.

**Finish:** return to the campaign or sign out. These clicks create no saved insurance or contact record. They can create normal native analytics history.

## 2. Save a conversation request

Use the **designated preview**, `daniel.04`, and an agreed reviewer pack for this exercise. A saved request becomes shared agency work.

| Step | Click or enter | Observe |
|---|---|---|
| C5 | Open **Small business growth → Your next step → Plan a conversation**, then press Escape. | **Plan your next growth conversation** opens with **Close dialog** focused. Escape closes it and returns focus to **Plan a conversation**. |
| C6 | Reopen the dialog. In **What would you like to discuss?**, enter a unique topic such as `Growth review Thomas 2026-09-16`. Select **Save conversation request**. | Required-field validation prevents an empty request. After a valid save, the dialog closes and **Request saved.** appears. |
| C7 | Select **View your requests**, then reload **Support**. | The saved topic remains associated with the agency's request. |
| C8 | Record the topic and sign out. | The coordinator can include this new record in the preview pack's agreed saved-work reset after all reviewers finish. |

This is a custom React form using the portal's authenticated action service and durable data store. It saves an administrative request. It does not send email, create a Salesforce activity, or change insurance coverage. In Page Builder, authors can inspect the dialog but cannot submit operational work.

The separate native **Contact your team** form below demonstrates SitecoreAI Forms authoring and webhook delivery. It does not use this saved-request service.

**Finish:** use the [saved-work reset](demo-loops.md#reset-and-repeat) for the selected preview pack only. A reset affects the entire pack, not just this request. Preserve unrelated review work until its owners finish.

## Native Forms: Contact your team

This exercise connects a marketer-managed SitecoreAI form to its configured receiver. **Verified September 16, 2026:** native activation and Test webhook delivery work; preview checks cover required-field/email validation and a 390-pixel layout without horizontal overflow. A production submission by `daniel.04` reached the receiver with all five fields, displayed the success message and left saved portal requests unchanged. Reloading clears the form and message. The current free receiver expires September 23, 2026; follow the [receiver preparation](native-forms-operator-guide.md#receiver-availability) before later runs and repeat the [acceptance checks](native-forms-operator-guide.md#acceptance-and-reset) after configuration changes.

| Step | Click or inspect | Observe |
|---|---|---|
| F1 | In SitecoreAI, open **Forms → Active → Contact your team**. From the preview, select **Edit form**, then **Edit**. | The active form designer opens. The form is available for `liberty-mutual-agent-portal`. |
| F2 | Inspect **Your name**, **Work email**, **Agency name**, **How can we help?** and **What would you like to discuss?** | All five fields are required. Topic choices are **Agency growth**, **Product guidance** and **Portal support**. |
| F3 | Open **Settings** using the gear. Inspect **Demo Webhook**, site availability and the success message. | The webhook uses **No authentication**. The configured site is `liberty-mutual-agent-portal`. |
| F4 | Inspect **Push changes**, then return to the form preview without changing the form. | The action updates an active form. This inspection leaves the form and its live behavior unchanged. |
| F5 | Sign in as `daniel.04`, password `Sitecore`, at the [portal login](https://liberty-mutual-agent-portal.vercel.app/login). Open [Support → Contact your team](https://liberty-mutual-agent-portal.vercel.app/support#contact-your-team). Enter `Daniel Ortiz`, `daniel.04@example.com` and `Prairie Oak Insurance`. | **Your name**, **Work email** and **Agency name** contain those fictional values. |
| F6 | Under **How can we help?**, select **Agency growth**. In **What would you like to discuss?**, enter a message with a fresh unique marker such as `LM-NATIVE-yourname-date-time`. Select **Send request** once. | **Thank you. Your request has been received.** appears. The fields clear and the form remains visible. |
| F7 | Open the receiver's inspection inbox, select the **POST** with your marker, then inspect **Request Content** or **Raw Content**. | JSON matches the five submitted values; request metadata identifies **Contact your team**. Match the unique message marker. |
| F8 | Reload to clear the confirmation. Repeat with a new message marker and leave earlier receipts unchanged. | No saved-work reset is needed. Portal reset does not erase webhook receipts. |

Before entering the fictional values at F5, optionally select **Send request** with empty fields, then try an invalid **Work email**. Five required-field errors appear; an invalid email shows **Email address must follow the format user@example.com**. Neither invalid attempt sends a receipt.

For F7, the configured **Demo Webhook** URL is the POST destination. Use the receiver owner's inspection inbox instead; webhook.site uses `/#!/view/<receiver-id>`. The unique receiver URL is not stored in this repository. Native submissions remain separate from **Your service & follow-up requests**, which lists the custom conversation flow in C5–C8.

**Finish:** retain the receiver history and record the unique marker as evidence. Reload the form to clear the success message, then use a new marker to repeat the exercise; sign out when finished. The portal's saved-work reset does not erase webhook requests. Keep the active form and page binding. See the [native Forms operator guide](native-forms-operator-guide.md) for configuration, evidence and reset boundaries.

## 3. Compose and maintain the campaign in Page Builder

The content lives beneath:

`/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home/growth/small-business`

The separate **Campaign practice** page is beneath `Home/growth/campaign-practice` and stays unpublished. Coordinate its use when several authors share the sandbox. For an independent new page, the **Campaign page** branch supplies the campaign layout, restricted placeholders and blank local content.

This component-copy exercise needs a coordinator. Before starting, the coordinator records the original component layout and local Data items. They restore that exact layout and recycle only the newly created datasource at the end. It is separate from a portal saved-work reset.

| Step | Click or inspect | Observe |
|---|---|---|
| C9 | Open **Page Builder → Liberty Mutual Agent Portal → Home → Agency growth → Campaign practice**. In **Layers**, select the first **CampaignAccordion**. | The floating component toolbar is available. Keep **Default** as the editing host. |
| C10 | Select **Duplicate component**. Inspect the copy and its datasource. | The duplicate has its own local content item, for example **Start the conversation_var2**. Later copies can use another suffix. |
| C11 | Select **Move up**. Open **Swap with another component** and inspect the choices; cancel without swapping. | Main offers **CampaignAccordion**, **CampaignAlert** and **CampaignCallout**. |
| C12 | Select **CampaignLinkList → Swap with another component**, inspect, then cancel. Have the coordinator restore the recorded practice layout. | Sidebar offers **CampaignContact** and **CampaignLinkList**. The coordinator recycles only the duplicate's new datasource and verifies the original layout; the page remains unpublished. |

The **Content** panel exposes the fields appropriate to the selected component. Page Builder supports drag-and-drop composition; this walkthrough uses the verified native toolbar controls. Inspect the campaign at a narrow browser width as part of the responsive rendering review. Content/layout changes do not require an application Git deployment.

| Component | Author-managed fields | Intended location |
|---|---|---|
| CampaignHero | Eyebrow, Title, Summary, Icon | Hero |
| CampaignAlert | Title, rich-text Body, Visible from (UTC), Visible until (UTC) | Main |
| CampaignCallout | Eyebrow, Title, rich-text Body, Action link | Main |
| CampaignAccordion | Question, rich-text Answer | Main |
| CampaignLinkList | Title, Icon, First link, Second link, Third link | Sidebar |
| CampaignContact | Title, Summary, Button label | Sidebar |

The local Data items have descriptive names: **Campaign introduction**, **Preparation update**, **Growth opportunity**, **Start the conversation**, **Prepare for review**, **Useful resources** and **Your next step**. Authors can find content by its purpose instead of tracing anonymous items.

When copying a page or component, check its datasource before editing. A duplicate rendering that still points to a shared item will continue to share that content. Use an independent local content item when the new page should have its own copy. Use a shared datasource deliberately when one approved change should appear in several places.

**Finish:** the coordinator restores only the practice layout/content changed by this exercise and verifies its original component count, order and datasource references. Recycle only the newly created independent datasource and leave the page unpublished. If you created an independent practice page, delete only that page and its local descendants after verifying its name. Preserve the branch, live campaign and reusable Media assets.

## 4. Improve copy with AI and recover saved work

Use the [Page Builder Content tab](https://pages.sitecorecloud.io/content?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb&sc_itemid=5e8f7d72-96e3-4c9f-a865-0231ee3a1512&sc_lang=en). The path is **Home → Agency growth → Campaign practice → Data → Growth opportunity**. This exercise edits that item's **Body** field, not the campaign hero Summary.

| Step | Click or enter | Observe |
|---|---|---|
| C13 | Open **Body**. Record its exact original content, then enter a temporary sentence containing a spelling or grammar error. | The change affects only this practice datasource. |
| C14 | Select **Optimize with AI → Fix spelling and grammar**. Compare both versions and select **Keep optimized**. Wait for the save checkmark and reload. | The accepted correction persists in the saved Body. |
| C15 | Reopen **Optimize with AI**. Prompt: `Write two concise sentences for an agency preparing a small-business submission.` Review the generated draft and select **Revert to original**. | The proposed wording remains subject to author review. The assigned Liberty Mutual Brand Kit option is available. Revert cancels this current rewrite. |
| C16 | Restore the exact Body recorded before C13. Click outside the field, wait for the save checkmark and reload. | The original content remains. The live campaign has not changed. |

This is prompted drafting or rewriting within an existing rich-text field. Review generated wording for accuracy and intended meaning before accepting it. **Revert to original** affects the current AI operation; it does not automatically restore the field's value from before the complete exercise. Keep the original record for final restoration.

Content optimization uses authored Brand Context, Tone of Voice and Dos and Don'ts. Its use of those sections does not mean it retrieves the complete Brand Knowledge PDF for every edit. The Agentic Studio example has its own recorded Brand Kit retrieval path.

Autosave protects changes that reached the server. Named content versions provide a deliberate recovery point. Neither establishes recovery of keystrokes that never saved, nor a universal offline draft-recovery feature.

**Finish:** confirm the original text and layout, leave the practice page unpublished, and close unused tabs.

## 5. Organize resources, images and metadata

Continue with [loop 5](demo-loops.md#loop-5-marketing-owns-the-content) and the [ResourcePage creation exercise](resource-page-authoring.md#a-short-creation-exercise). A new ResourcePage starts with blank fields and its own **Data → Resource image** item.

For an existing page, the installed **Resource metadata** Marketplace app exposes five single-select choices managed in the site's **Data/Taxonomy** lists. The workflow is **select → observe unsaved changes → Discard**, then **select → Save metadata → Refresh → restore the original → Save metadata → Refresh**. Approved versions remain read-only in this app. [Metadata instructions](resource-metadata-authoring.md).

Modern Media stores the reusable assets. The local Image field stores the selected image and its delivery/rendition details. Image selection, an asset's public delivery link and page publication are separate operations.

| Step | Click or inspect | Observe |
|---|---|---|
| I1 | Open **Content → Media BETA** and select `liberty-mutual-small-business-team-planning.png`. | The existing image's native asset dialog opens. |
| I2 | Open **Details → Tags → Edit tags**. Inspect without changing values. | Stored tags describe the subject matter; they are separate from ResourcePage taxonomy. |
| I3 | Click **Alt text** to open its editable field. Inspect **Description** and the public-link expiration. | The reviewed alt text is `Two colleagues reviewing a tablet beside boxes on warehouse shelves.` Expiration is **None**. |
| I4 | Leave the existing values unchanged and close the dialog. | The shared asset remains available; this inspection requires no page publication. |

SitecoreAI's Modern Media image-upload workflow can generate editable alt text and tags. These are suggestions for an author to review. This image-enrichment capability does not automatically populate every ResourcePage taxonomy field, and its documented automatic enrichment excludes PDFs, audio and video. Reusing an existing asset demonstrates the stored metadata; an actual upload and review is required to observe new AI suggestions.

**Finish:** recycle only the unpublished practice ResourcePage. Preserve shared images and the page branch. Restore any temporary metadata before approving a real article.

## 6. Govern publication and timed visibility

The Texas resource loop supplies the deliberate release path: create a named English Draft, edit Summary, wait for Saved, preview using Default, approve, publish only the intended English page and explicitly reindex **Liberty Mutual Agent Resources**. Verify the live article and Search result. Restore the original through a new version and the same publication/indexing sequence.

This shows the operator workflow. Separate customer author and approver accounts need their own access acceptance before the workflow is described as proven separation of duties. Portal agent roles and Sitecore staff roles serve different purposes.

### Rich-text alerts

The campaign's **Preparation update** datasource has a rich-text **Body**, **Visible from (UTC)** and **Visible until (UTC)**. An empty start or end leaves that side of the visibility window open. An inactive alert remains available in the editing context so an author can find and change it.

Record original values before an exercise. Test a future, active and expired window only on isolated practice content, then restore the original dates/body. A display window controls when the application shows an already-published component. It does not publish or retire the underlying content item.

### Scheduled publication and expiration

The platform owner follows the [bounded publication exercise](../authoring/CAMPAIGN-AUTHORING.md#run-the-bounded-publication-and-expiration-exercise). It creates a dedicated **campaign-schedule-check** page, separate from **Campaign practice**, with matching native publishing availability on the page and its local content. A terminal script invokes two scoped native publication operations at the UTC start and end boundaries, records their operation IDs and then exits. It installs no recurring service or paid integration.

This tenant retains the completed, expired scheduling sample for inspection. Before another timed run, the operator follows [Prepare the exercise for another run](../authoring/CAMPAIGN-AUTHORING.md#prepare-the-exercise-for-another-run) to verify its journal and recycle only that isolated sample. Use a new journal and fresh timestamps. The script deliberately refuses to overwrite the existing page.

Inspect three delivery states: the page is absent before the start, present after the first publication reaches Experience Edge, and absent again after the expiration publication propagates. Verify the **production** rendered route as well as **Live** Edge; a completed publishing job alone is not evidence of immediate global delivery. The designated preview uses CMS Preview access and can still display expired items. The CMS items remain available for inspection.

This is external scheduling automation. Native **Schedule publishing availability** controls content eligibility; a publisher still needs to run. Production scheduling needs a managed scheduler, protected credentials, monitoring and recovery. A portal saved-work reset does not cancel a publishing operation. The operator guide contains the exact commands, scope checks and journal requirements.

### Shared content and bulk maintenance

| Step | Click or inspect | Observe |
|---|---|---|
| C17 | Open [Content editor](https://xmc-scaipocusem400b-sitecoreai950c-demo4418.sitecorecloud.io/sitecore/shell/Applications/Content%20Editor.aspx?sc_bw=1&organization=org_XqL3u1MSNVuubOTb), also available in Page Builder's top-left navigation menu. Paste `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home/growth/campaign-practice/Data` into the left search. Select **Direct Hit → Data**, then the magnifier beside **Content**. | The content search opens within the practice Data folder. |
| C18 | Enter `*` and press Enter. Review all results and record original copy. Select the down arrow **More search options → Search operations → Search and replace**. | Eight results: the Data folder and seven local datasource items. The live campaign is outside the scope. |
| C19 | At **What word would you like to replace?**, enter `relationship team\|relationship colleagues` and select **OK**. Dismiss the completion message with **OK**. | Four fields change across **Growth opportunity**, **Preparation update**, **Prepare for review** and **Your next step**. |
| C20 | Select the **Search [1]** tab. Repeat **Search and replace** with `relationship colleagues\|relationship team`. Inspect the four affected fields. | All original wording returns. Leave the practice page unpublished. |

For frequently reused approved copy, a shared datasource is easier to maintain than many independent copies. Search and replace demonstrates multi-item text maintenance; it is not a generic spreadsheet editor for arbitrary field changes. Follow versions, review and normal publication for real bulk changes. The [campaign authoring guide](../authoring/CAMPAIGN-AUTHORING.md#workflow-versions-and-safe-exercises) describes the exercise scope.

## 7. Target by known data, calculated criteria and browsing interest

Keep the four examples separate so each capability is easy to understand.

| Example | Native targeting input | Authored output |
|---|---|---|
| Home Agency Growth | Identified agent, growth cohort and role | Principal, producer, account-manager or neutral card |
| Small-business campaign callout | Identified principal/producer plus calculated small-commercial premium share | Growth opportunity or neutral campaign guidance |
| Products spotlight | Affinity scores accumulated from tagged resource visits | Workers compensation, household or neutral spotlight |
| Resources A/B test | Experiment eligibility and allocation | One of two CTA labels, measured against a guide visit |

For the calculated campaign example, the premium-share value is:

`small-commercial written premium / (personal written premium + small-commercial written premium)`

The growth criterion is below 20%. Cedar Ridge's seeded share is about 14.46%, while Prairie Oak's is about 36.86%. The value also requires an identified principal or producer. Missing, invalid or zero-total data follows the neutral path.

| Step | Click or inspect | Observe |
|---|---|---|
| P1 | In Page Builder, open **Home → Agency growth → Small-business growth**. Select **CampaignCallout** in **Layers** and click **Edit personalization rules**. | The right panel shows **Personalized**. Its variant selector offers **Original** and **1 Liberty Mutual - Small business growth opportunity is true**. Leave the active rules running. |
| P2 | Open the [custom JavaScript value](https://app.sitecorecloud.io/personalize/custom-values/9faad837-0e23-4b5b-af10-c6883dba86ac?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df) and inspect its input attributes. | The threshold, identity/role requirements and neutral fallback are explicit. |
| P3 | Load Avery's actual Sitecore profile, then Daniel's from the same pack. Use [profile lookup](demo-loops.md) to obtain the native profile ID. | Avery meets the growth criterion; Daniel follows neutral guidance. The portal's imported identifier is not necessarily the native profile ID. |
| P4 | [Sign in](https://liberty-mutual-agent-portal.vercel.app/login) as `avery.04` and open the campaign. Sign out, then repeat as `daniel.04`. | Avery sees **Build on your personal-lines relationships**. Daniel sees **Turn local knowledge into a stronger submission**. Compare those headings with the native test. |

The current source metrics are fictional JSON data imported into profile extensions. Connecting the existing Salesforce backend needs approved identifiers, field mappings, permissions and freshness. Confirm any Snowflake data requirement separately. The CMS does not automatically discover or query those internal systems.

Follow [loop 9](demo-loops.md#loop-9-an-interest-becomes-a-relevant-next-step) for the native affinity profile and Products spotlight comparison. Affinity scores adapt to browsing after topics are assigned to pages. This differs from autonomous machine-learning audience discovery or a predictive recommendation model. Broader ML recommendations and analytical models require the appropriate product capability, entitlement, data and integration design.

**Finish:** leave native rules and variants unchanged. Keep the recorded profile history. Only an operator's coordinated profile-generation restart selects a fresh logical identity, and that restart is separate from saved-work reset.

## 8. Measure the result and prepare agency outreach

The [Resources A/B example](ab-testing.md) compares **Start with small business** with **Build your small-business practice**. Inspect its authored variants, configured goal, normal delivered experience and native results. The goal is a guide-page visit, not a policy sale. Small samples do not establish a winner.

**Keep the Resources A/B test on its separate, unpersonalized page.** [Sitecore's test-creation guidance](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/create-an-a-b-n-test.html) excludes pages with personalization configured. A second component on a personalized page is not an established workaround. The Resources experiment stays separate from personalized Home guidance, the Products affinity spotlight and the calculated campaign callout.

The [Watkins Agentic Studio example](agentic-studio/README.md) then expands the campaign story to account-based outreach. Review real agency research and readable HTML email previews for the principal, advisor and service team. Inspect the actual Brand Kit retrieval evidence. These are reviewed outreach artifacts; no emails were sent.

**Finish:** retain the experiment and research artifacts. No CMS publication, audience activation, forced traffic allocation or email send is required for this inspection.

## Coverage of the 33 requested functions

| # | Function | Where to see it and the implementation boundary |
|---|---|---|
| 1 | Publish content | Section 6 and the Texas article loop: authoring, approval, scoped publication and Search refresh. |
| 2 | Personalize by state | Daniel/Maya journeys show licensed-state filtering in the portal and Search. Native state-based page/component variants are a separate configuration option; the current native examples use role, calculated share and affinity. |
| 3 | Accordions | C3: two authored questions on the campaign. |
| 4 | Content Organization & Media | Sections 3 and 5: local Data folders, branches, taxonomy and Modern Media. |
| 5 | Workflow & Collaboration | Section 6: versions and approval/publication. Separate customer author/approver access still requires acceptance. |
| 6 | Versioning & Publishing | The Texas loop retains original, temporary and restoring versions. |
| 7 | Governance, Security & Access | Restricted placeholders, staff roles and portal server authorization have distinct responsibilities. |
| 8 | Accessibility & Compliance | Campaign semantic controls, keyboard operation, dialog focus, labels and descriptive images. Validation supports accessibility; it is not a compliance certification. |
| 9 | Clone / copy pages and components | Section 3: copy with an intentional local/shared datasource; branches provide an independent starting structure. |
| 10 | Scheduled publish | Section 6: configured scoped publishing automation with a verified delivery transition. |
| 11 | Caching controls | Published delivery plus application retrieval/revalidation settings. Architecture owns the CMS, Edge, frontend and CDN boundaries. |
| 12 | Responsive rendering | Review the actual campaign at desktop and narrow browser widths, including navigation, accordions and the dialog. |
| 13 | L2 Navigation | C1/C2: Agency growth child navigation and campaign section anchors. |
| 14 | Call out | The authored CampaignCallout with heading, rich text and action link. |
| 15 | Link box component | **Keep useful guidance close**: titled, icon-led list of three authored links. |
| 16 | Main navigation | Portal navigation and the Agency growth child. State/MI/reward navigation targeting needs an agreed data model and component rules; no live MI feed is implied. |
| 17 | Modal | C5: triggered contact dialog with keyboard behavior. Event/MI triggers need the relevant integration and display logic. |
| 18 | CTA Buttons | Campaign preparation and conversation actions, plus the existing Resources A/B CTA. |
| 19 | Page title | CampaignHero's authored title and icon. |
| 20 | Salesforce/Snowflake data connectors | Salesforce is the existing backend; its live connection remains integration work. The POC uses replaceable JSON-backed adapters and imported profile extensions. Confirm Snowflake requirements separately. |
| 21 | Alerts | Section 6: rich-text alert body and explicit UTC visibility dates. |
| 22 | Dynamic data-driven personalization rules | P1–P4: native JavaScript calculation, decision table and browser comparison. |
| 23 | AI-Driven Personalization | AI-assisted content, native affinity and experiments. Autonomous ML segmentation/recommendations need separately confirmed capabilities and data design. |
| 24 | Drag and drop components | Page Builder supports drag-and-drop composition. C9–C12 use verified Duplicate component, Move up and restricted Swap controls. |
| 25 | Spell / grammar check in editor | C14: **Fix spelling and grammar** within Optimize content. This is an author-invoked AI action. |
| 26 | AI-assisted content drafting | C15: prompt-based drafting with author review and assigned brand guidance. |
| 27 | AI metadata and alt text suggestions | Modern Media image-upload enrichment and review. It does not auto-populate arbitrary ResourcePage taxonomy fields. |
| 28 | Auto-save and draft recovery | C16 and named versions. Persisted changes can be reopened; unsaved keystrokes are outside that promise. |
| 29 | Forms | F1–F8 cover native **Contact your team**. Native authoring, preview validation and production submission/receipt are verified. C5–C8 separately demonstrate custom durable portal requests. The inspection receiver is not a production database or CRM. |
| 30 | A/B testing | Section 8 and the native Resources experiment. Keep it on a page without configured personalization. Custom application feature tests may need broader instrumentation. |
| 31 | Bulk edit of fields and content | C17–C20: native Content Editor Search and replace over reviewed practice fields. Shared datasource reuse remains a distinct technique. |
| 32 | Scheduled unpublish / content expiration | Section 6: scoped restriction and republish automation, distinct from hiding an alert. |
| 33 | Personalization variant preview | Page Builder's selected variants and decision-table profile tests, followed by ordinary signed-in delivery. |

## Final cleanup

- Sign out of each portal session and close unused browser tabs.
- Restore recorded practice content/layout, dates and metadata. Leave practice pages unpublished or recycle only the new pages you created.
- Complete the Texas article's restoring publication and explicit Search refresh if that loop changed it.
- Confirm the bounded publication script has completed, preserve its job journal and verify the dedicated page's final expired state. Resolve any interrupted operation before repeating it.
- Coordinate the selected preview pack's saved-work reset after all reviewers finish.
- Retain native Forms receiver history and record each exercise's message marker. Reload with a new marker for another run; portal saved-work reset does not remove webhook requests.
- Preserve native profile, affinity, experiment and research history. A whole-pack identity restart is a separate operator decision.

## Supporting product documentation

The precise UI and enabled features depend on the tenant. New SitecoreAI capabilities can have a phased rollout.

- [Optimize content with AI](https://doc.sitecore.com/sai/en/users/sitecoreai/ai-capabilities-in-sitecoreai/optimize-content-with-ai.html)
- [Brand Kit inputs used by copilots](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/brand-kits/using-brand-knowledge-and-brand-kit-sections-in-copilots.html)
- [Modern Media upload and automatic image metadata](https://doc.sitecore.com/sai/en/users/sitecoreai/manage-media/modern-media-library/upload-a-media-file.html)
- [Component personalization](https://doc.sitecore.com/sai/en/users/sitecoreai/component-personalization.html)
- [Profile-based personalization tests](https://doc.sitecore.com/sai/en/users/sitecoreai/component-personalization/test-the-component-personalization.html)
- [Affinities](https://doc.sitecore.com/sai/en/users/sitecoreai/audience-and-insights/affinities.html)
- [Profile import](https://doc.sitecore.com/sai/en/developers/sitecoreai/profile-import.html)
- [Sitecore Connect](https://doc.sitecore.com/connect/en/users/sitecore-connect/introduction-to-sitecore-connect.html)
- [A/B/n settings and goals](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/configure-a-b-n-test-settings.html)
- [Native Forms and webhook destinations](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/forms/forms.html)
- [Forms data delivery and storage boundary](https://doc.sitecore.com/sai/en/developers/sitecoreai/data-privacy.html)
- [Content Editor search operations](https://doc.sitecore.com/sai/en/users/sitecoreai/the-search-operations.html)
- [Sitecore Search AI-driven experiences](https://doc.sitecore.com/search/en/users/search-user-guide/ai-driven-experiences.html)
- [Analytical models in Sitecore Personalize](https://doc.sitecore.com/personalize/en/users/sitecore-personalize/managing-analytical-models-in-sitecore-personalize.html)
