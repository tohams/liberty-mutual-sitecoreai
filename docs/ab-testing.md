# Resources guidance A/B test

**Current test: Liberty Mutual Small Business Guide CTA — Live.** On September 14, 2026 UTC, the guide page was explicitly selected as the goal, saved and reopened to verify the selection before activation. Published A and B content passed all 18 read-only checks, and a normal production Daniel `.04` visit reached the guide. Native goal attribution remains pending; a configured goal and a page visit do not establish a credited conversion or winner. See the [current verification record](qa-ab-testing-2026-09-14.md) and [eighth presenter loop](demo-loops.md#loop-8-a-clearer-next-step).

The preceding **Liberty Mutual Small Business Resource CTA** test was ended with A retained and published. Its history is preserved separately in the [September 11 record](qa-ab-testing-2026-09-11.md). Do not combine its visits or goals with the replacement test. Reconfiguration does not establish why the earlier report did not credit goals.

## Question and scope

Does a more specific, benefit-led action label help agents discover the small-business growth guide? The test changes one action-link label on **Learning & resources**. Both versions lead to the same useful article, and neither changes insurance eligibility or the agent's operational work.

| Setting | Definition |
| --- | --- |
| Native test name | **Liberty Mutual Small Business Guide CTA** |
| Native tenant/site | Safeco Insurance Company of America POC / `liberty-mutual-agent-portal` |
| Page | `/resources`, native `Home/resources`; English version **2**, named **Small-business CTA experiment** |
| Component | `AgentGuidance`, below `ResourceSearch` in `headless-main` |
| Existing datasource | `Data/Guidance/resources-guidance`, ID `584cc87c-ae9a-552a-962f-fa31b7e1e126` |
| Control A | **Start with small business** |
| Variant B | **Build your small-business practice**; separate native datasource `Data/Guidance/resources-guidance_var2`, ID `77e00d15-681c-45de-9079-aa08a48b7195` |
| Shared destination | `/resources/expand-small-business-practice` |
| Native goal | **Increase page views** for the destination above |
| Saved audience/participation | **All visitors**, with **100%** test participation; portal authentication restricts normal access to `/resources`; no additional role, agency, state or growth-cohort targeting |
| Saved allocation | 50% A / 50% B using the native experiment allocation |
| Saved outcome actions | Return traffic to A whether native results identify a winner or are inconclusive; any later adoption is an explicit editorial decision |
| Saved statistical settings | Defaults retained: **2%** base rate, **20%** minimum detectable difference, **95%** confidence; **21,110 visits per variant** under the [documented defaults](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/configure-a-b-n-test-settings.html) |

The current component's eyebrow is **Learning & resources**, its headline is **Useful guidance, easier to find**, and its body is **Find preparation checklists, state guidance and learning organized around the work you do.** Keep these fields, the layout, styling and destination identical between A and B. Only the General Link's visible text changes.

The control remains in [resources-guidance.yml](../authoring/items/liberty-mutual/items/content/LibertyMutual/liberty-mutual-agent-portal/Data/Guidance/resources-guidance.yml). Native snapshots of the approved [Resources page](../authoring/items/liberty-mutual/items/content/LibertyMutual/liberty-mutual-agent-portal/Home/resources.yml) and [B datasource](../authoring/items/liberty-mutual/items/content/LibertyMutual/liberty-mutual-agent-portal/Data/Guidance/resources-guidance_var2.yml) preserve the current version 2 layout and unchanged B content. This test belongs on the Resources page. The workspace already has native personalization and remains outside the experiment.

## Native setup and verification

The setup steps below document how this test was prepared and started. It is already in progress; do not repeat creation or activation to inspect it. Outstanding runtime checks are identified in the acceptance table.

Use the following creation steps for a new destination where the test does not exist. On the current tenant, inspect the existing Live test without creating, starting or replacing it.

1. Open Page Builder for the correct site and select **Home → Learning & resources** (item name `resources`). Inspect its current native A/B and personalization status before configuring the experiment. Sitecore does not permit an A/B test on a personalized page. If the live page differs from the recorded unpersonalized baseline, resolve that conflict before proceeding.
2. Select the existing **AgentGuidance** and create the native test. Preserve A as the current copy. Use **Copy original component** for B, then change only its action-link text to **Build your small-business practice**. This creates a separate content item for B. Keep the destination and other fields unchanged. See [Sitecore's test creation workflow](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/create-an-a-b-n-test.html).
3. Configure **Increase page views** and explicitly select the published `/resources/expand-small-business-practice` item in the site tree. **Save**, reopen **Configure**, and confirm the selected page persists before starting. Retain a 50/50 split, full test participation and no additional audience targeting. In automated actions, select **Assign all the traffic back to the control variant** for both winning and inconclusive outcomes. Inspect and record advanced sample-size settings without reducing them to manufacture a winner. Portal authentication supplies the access boundary. See [Sitecore's test settings](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/configure-a-b-n-test-settings.html).
4. Preview both treatments and follow each action to the same article. Verify the Search query, filters, pagination and save behavior are unchanged. Check that unrelated AgentGuidance placements, especially the personalized workspace, retain their existing copy and rules.
5. Use **Start → Continue**, which prepares the test in **Pending**, then publish the containing page and confirm **Live**. Normal authenticated delivery must separately verify the assigned variant, page-view identifier and destination goal. Do not infer activation from a saved Draft. See [Sitecore's start and publication workflow](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/start-an-a-b-n-test.html).
6. Inspect native results after processing; Sitecore documents that analytics can take up to 24 hours to appear. Record the reporting time and what is visible. Configuration, variant delivery and goal attribution are separate checks. Use the [site's A/B/n test dashboard](https://doc.sitecore.com/sai/en/users/sitecoreai/create-and-manage-sites/sites-dashboard/viewing-the-site-s-a-b-n-tests.html) to inspect status and results.

This editorial experiment uses the existing [AgentGuidance field component](../examples/liberty-mutual-agent-portal/src/components/agent-guidance/AgentGuidance.tsx). [PortalTracking](../examples/liberty-mutual-agent-portal/src/features/analytics/PortalTracking.tsx) derives the native page identifier from the CMS route, and [portal-analytics](../examples/liberty-mutual-agent-portal/src/lib/portal-analytics.ts) sends native page views. The page-level identifier stays `_default` for a component A/B test; native component selection is tracked separately through the decision request.

Portal navigation uses [PortalLink and PortalContentLink](../examples/liberty-mutual-agent-portal/src/components/ui/portal-link.tsx) with `prefetch={false}` so speculative navigation does not execute an experiment before the visitor opens the page. Earlier fixes supplied the current native `guestRef` alongside `browserId` and restored repeat page-view ingestion. Their validation belongs to the [historical runtime record](qa-ab-testing-2026-09-11.md); those earlier visits are not results for the current test.

For native engagement verification, use **Performance → Profiles → Client ID** to search the observed browser/client ID, then inspect the canonical profile's **Engagement**. A direct `browser/show` `customer.ref` may open a retired alias with no sessions, as observed for Daniel; that empty alias view alone does not prove identity or ingestion failed. The application follows the pinned SDK's returned `customer.ref` contract and does not perform its own alias resolution. Verify the client ID and events on the canonical native profile.

The test does not change an indexed ResourcePage or Search configuration. The resource-publication/reindex procedure in [loop 5](demo-loops.md#loop-5-marketing-owns-the-content) applies when indexed article content changes; it is not a substitute for publishing and verifying an A/B experiment.

## What the result means

The first goal measures **visits to the growth guide after experiment exposure**. It does not directly measure a click on this particular button, reading completion, a submitted account or additional premium. The destination also has links from the workspace and Agency growth. Native attribution settings and the actual conversion window must be inspected when interpreting results; a destination visit is not proof of which link was used.

The guidance card sits below Search. Being allocated a page variant does not prove the visitor scrolled to see the card. The initial audience deliberately includes every authenticated Resources visitor, including people for whom small-business learning is not their immediate task. A later audience-specific question would be a separate test.

A 50/50 setting is an allocation rule, not a promise that a small set of sign-ins will split evenly. The portal uses synthetic people and rehearsal traffic, so this environment can demonstrate configuration, delivery and measurement mechanics. It cannot establish commercial conversion lift or a trustworthy winning label from manufactured activity. Do not repeatedly reload, rotate identities or trigger events to create a preferred result. Native reports may remain inconclusive.

For a real customer study, agree the primary metric, minimum traffic and duration, stopping rule, and visitor-versus-agency analysis before launch. Colleagues share agency interests and operational work; this first native page experiment does not claim agency-level randomization. Do not treat a numerically higher conversion rate as a winner without adequate evidence.

## Rehearsal, reset and lifecycle

Use an assigned reviewer pack and sign out when finished. A normal authenticated visit can create native experiment and engagement history even if it writes no saved work. Editor/preview rendering is for content inspection and does not prove live tracking or attribution.

Production and the designated preview have separate operational namespaces but share the Sitecore site, experiment configuration and native profile identity for the same pack/person/generation. Preview traffic can therefore enter the same native history. Record the host and rehearsal period rather than describing preview as an isolated experiment population.

An operational **saved-work** reset changes the active saved-work run; it neither ends the native test nor erases experiment history or establishes a fresh assignment. A **restart** advances to an already-imported profile generation and still preserves prior native history. Neither is an experiment reset. See the [operator reset runbook](../examples/liberty-mutual-agent-portal/docs/auth-and-data.md#durable-work-and-resetting).

Inspect existing results for a repeat presentation; a new live test is not needed each time. If the test is ended or a treatment is selected, record the native lifecycle action and verify the published Resources page afterward. Preserve the experiment history and distinguish an editorial choice from a statistically supported winner. Restoring the control copy is a native content/experiment lifecycle change, separate from resetting operational data.

For handoff, the repository contains a narrow native snapshot of the Resources page and B datasource. The existing Content module remains **CreateOnly**. Item serialization does not establish transfer of the cloud experiment definition, allocation, reporting or history to another tenant. A new environment needs deliberate native setup and verification from this record; do not infer the experiment's flow ID from a component or variant GUID.

## Native configuration and acceptance record

This record describes the replacement test. Pending entries are not successful checks.

| Evidence | Recorded result |
| --- | --- |
| Current native test | **Liberty Mutual Small Business Guide CTA**; confirmed **Live** in Page Builder by **02:34 UTC, September 14, 2026** |
| Native inspection links | [Resources v2 in Page Builder](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb&sc_itemid=c9b4e46b-3b72-50d4-a96e-732c4d181b6a&sc_lang=en&sc_version=2); [current native A/B test dashboard](https://app.sitecorecloud.io/performance/dashboards/ab-tests?test=component_c9b4e46b3b7250d4a96e732c4d181b6a_e144a961809e570f9e26c1cdd5d4e99b_en_20260914t022704347z&site=&page=&organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df), then verify the selected site and test name |
| Native dashboard selector | `component_c9b4e46b3b7250d4a96e732c4d181b6a_e144a961809e570f9e26c1cdd5d4e99b_en_20260914t022704347z`; observed friendly key, not the unexposed flow-definition UUID or an activation timestamp |
| Page and B variation | Resources English **v2**, **Small-business CTA experiment**; full B variant `e144a961809e570f9e26c1cdd5d4e99b_a8d397f0f30145e384ea177916db4ce5`; unchanged B datasource `77e00d15-681c-45de-9079-aa08a48b7195` |
| Native SDK discovery name | `component_c9b4e46b3b7250d4a96e732c4d181b6a_e144a961809e570f9e26c1cdd5d4e99b_en*`; identifies the component execution, not a specific historical test |
| Saved goal | **Increase page views**; exact published guide item `2bf3a728-a631-5a90-a323-8922aca62f23` explicitly selected. After Save and reopening Configure, `expand-small-business-practice` remained selected |
| Allocation and audience | **50/50**, **100%**, **All visitors**. Base rate **2%**, minimum detectable difference **20%**, confidence **95%**, displayed sample size **21,110**. Both outcome actions return traffic to control |
| Published content and scope | **18/18** read-only Edge checks passed: new B discovery, expected labels/datasources, shared target, published goal page and preserved Search. Resources and reused B were captured with an exact two-item pull; only Resources YAML changed |
| Current normal navigation | Production Daniel `.04`, generation **0**, saw **Start with small business** on Resources at **02:34:42.220 UTC**, followed it to the guide around **02:35**, and signed out by **02:36**. No operational work was changed |
| Decision request evidence | The exact production Resources GET returned HTTP **200** and its Vercel trace included a native browser-profile read and POST `/v1/personalize`. The response/selection was not exposed, so accepted control allocation is not established |
| Native goal event contract | Goal `page` is `expand-small-business-practice`, language `en`; page-variant identifier `2bf3a728a6315a90a3238922aca62f23_en_default`. Inspect the canonical profile and same client/session for the current journey |
| Current aggregate goal attribution | **Pending**. Inspect the replacement test after native reporting processes the journey; Sitecore documents that analytics can take up to 24 hours. Do not substitute old report totals |
| Winner or measured business lift | Not established |
