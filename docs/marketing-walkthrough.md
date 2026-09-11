# Marketing and platform walkthrough

Use this guided review to follow an agent's work, inspect the content behind it, and trace an agency campaign through SitecoreAI. Allow about 30 minutes. The audience is the team that will own content, audiences, Search, brand governance and platform operations.

**Review status:** this guide describes the implemented experience and recorded native evidence as of September 10, 2026. The release preview passed all 37 native identity, first/second workspace, logout and anonymous-access assertions. See [connected QA evidence](qa-evidence-2026-09-10.md) and its linked release pull request for deployment-specific results. Customer author/approver-role acceptance remains a separate handoff step.

## 1. Begin with the agency, then compare its people

Open the [portal login](https://liberty-mutual-agent-portal.vercel.app/login). Obtain one reviewer pack and its fictional account usernames from the review coordinator; every portal account uses the password `Sitecore`. Use the same pack throughout. In the separate Sitecore window, select **Safeco Insurance Company of America POC** and the **liberty-mutual-agent-portal** site.

Sign in as **Avery Brooks**, the Cedar Ridge Insurance principal. In **My workspace**, review the agency, Texas context, priorities and available lines. Open **Agency growth** to discuss the fictional production mix. The scenario covers September 2025–August 2026; these figures represent insurance-system inputs, not Sitecore engagement measurements.

Return to the workspace and follow its Agent guidance link. Then use **Sign out** and repeat with Jordan, Maya and Elena. The baseline campaign copy is:

| Person | Role and campaign experience | Useful next step |
| --- | --- | --- |
| Avery Brooks | Principal: **Build your next chapter in small business** | Explore the agency growth learning path |
| Jordan Ellis | Small commercial producer: **Bring a stronger submission to the table** | Read the BOP preparation checklist, then inspect **Quote & submit** |
| Maya Chen | Personal lines account manager: **Connect everyday conversations to new needs** | Learn discovery questions and involve the appropriate teammate |
| Elena Park | Wholesale broker outside the growth cohort: **Resources for your next client conversation** | Browse relevant resources without the small-business campaign |

Avery, Jordan and Maya belong to the same agency but have different responsibilities. Their operational views also reflect server-enforced role and specialty scope. **The native campaign changes guidance; it does not grant access to policies or submission actions.** Neutral guidance is also the fallback when native identity or decisioning is unavailable. Record an unexpected neutral result during the positive-persona checks rather than presenting it as successful targeting.

For one operational example, use Maya's **Clients & policies → Review renewals**, open an available policy, and save a renewal follow-up. Reload to inspect the saved work. These records and actions use synthetic integrations; they do not change real insurance coverage or send a message.

### Check products against the account state

With Daniel, open **Products & appetite** and confirm Risk state offers Illinois and Texas. Select Texas, open a coverage guide, and return: the chosen state should remain Texas. Prepare account carries that same state into intake. Compare personal recreational coverage with Maya in Illinois versus Texas to see an illustrative product-availability difference. These operational rules come from fictional integration data, separately from native Search and personalization.

A colleague may see a shared submission that they cannot advance. For example, Jordan can view an Avery-owned Florida request but cannot edit, complete or submit it with TX/IL-only authority. The original risk state remains visible; no dropdown silently changes it. Use the designated preview acceptance records for this walkthrough rather than changing an existing customer-review record. See the [state eligibility runbook](state-eligibility.md).

## 2. Find state guidance with native Search

Sign in as **Daniel Ortiz** and open [Learning & resources](https://liberty-mutual-agent-portal.vercel.app/resources). **Risk state** starts at **My licensed states**: Illinois, Texas and nationwide guidance. His Illinois home state does not exclude his Texas license. His workspace recommendations also consider both licenses and his specialties.

Search **Workers compensation**. Illinois, Texas and relevant nationwide guidance should appear; Florida-only guidance should not. Choose **All states** to research the broader catalog, or **Florida** to see Florida plus nationwide guidance. **Nationwide guidance only** excludes all state-specific articles. **Clear filters** returns to My licensed states while retaining the search phrase; **Reset search** from an empty result clears the phrase too.

Open the Texas workers compensation guide, inspect its reviewed date and Texas Department of Insurance source, save it, and reload to confirm its saved state. Saved articles and direct article links remain available even outside the default licensed-state scope. These are educational resources; browsing them never grants transaction eligibility. Sign out and compare **Maya Chen**, whose profile has all three supported state licenses, so her default includes Florida as well.

The initial connected review found 12 authored resources and five native facets. Search queries and results use SitecoreAI Search. Saving a resource uses the portal's individual saved-work service. The article and its searchable metadata come from the same native ResourcePage, so marketers do not maintain duplicate article copy in JSON. See the [content model](content-model.md#native-resource-search-composition). The optional Search Configuration Manager plugin editor is not yet enabled; its existing configuration field contains JSON for platform owners to manage.

## 3. Edit once and follow publication

In native Page builder, locate **Home → resources → texas-workers-compensation** under the portal site. Select its **ResourceArticle** and inspect the title, summary, body, source and reviewed date. The resource page itself is the datasource. Use **Home/resources**, not the preserved, unused **Data/Resources** copies.

Make an agreed, small summary edit without changing the regulatory meaning. Preview it, follow the installed workflow's approval step, and publish the exact owned item. Verify the article and resource listing, then allow native Search to index the published update before checking its result card. A Git deployment is not needed for an ordinary editorial change. Restore rehearsal wording through the same workflow when appropriate.

On **workspace**, inspect **AgentGuidance** and the reusable datasources under **Data/Guidance**. Its editable fields are eyebrow, headline, rich-text body and action link; **Default** and **Highlight** are presentation variants. This is the authoring boundary behind the campaign cards. The editor uses an isolated preview of operational data and does not submit agent work.

The tenant's Basic workflows are installed. Confirm this round trip with the actual customer author and approver roles during acceptance; initial approved seed content is not evidence of customer approval.

## 4. Inspect the profile and native rule

In Unified Data Layer, inspect the imported fictional profile for the chosen person and reviewer pack. Review role, state, specialization, agency production attributes and the agency-level `smallBusinessGrowthAudience` flag. Distinguish individual production fields from agency totals.

Open the published custom value **Liberty Mutual - Small business growth role** and the LIVE decision table **Liberty Mutual - Small business growth guidance**. Positive rows require an identified profile, the `liberty-mutual-agent` provider, boolean `true` for the cohort, and a supported role. Three rows select principal, producer and account-manager datasources; the original component provides neutral content. The [native configuration record](../authoring/personalization/README.md) preserves the expression and actual test boundaries.

The tenant accepted 112 synthetic profile records. Earlier native inspection also found Avery's page and Search events. Review those as identity and event-ingestion evidence, not proof of business conversion or every persona's latest fresh-login result.

## 5. Review the Brand Kit and agency campaign

In SitecoreAI Design, open the published **Liberty Mutual — Independent Agents** Brand Kit and inspect its site assignment. Its [source pack](brand/README.md) records public official brand references and separates them from original portal direction. It is not a customer-approved corporate brand manual.

Open the existing [Agentic Studio ABM space](https://app.sitecorecloud.io/agentic/chat-new/944bcaa4-a10d-4bec-93bc-ebcff9c86328?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df), **Liberty Mutual — Expand your small-business practice**. Follow its Account Data Enricher, Brief Generator and Bulk Content Generator stages. Cedar Ridge is the account; its colleagues receive different guidance for the same growth opportunity.

Review the **eighth artifact**, titled **Cedar Ridge Insurance ABM — Final Reviewed Implementation Package**. It contains the corrected audience contract and four validated seed payloads, available in native Content, JSON and Preview views. Its title does not replace human editorial approval, and the earlier artifacts remain run history.

The Brand Kit was selected as context, but native retrieval of its contents remains **unverified**. The useful revised output used a supplied, source-grounded brand excerpt. Explain this boundary using the [capability ledger](agentic-studio/capability-ledger.md). Review generated copy before moving approved changes into the existing CMS datasources. This workflow has not sent emails, activated audiences or automatically published its drafts.

## 6. Leave the next reviewer a predictable starting point

Sign out after the review. Ask the coordinator for **saved-work** reset to restore the chosen pack's operational baseline while preserving its native history, or **restart** for a new run using the next verified imported profile generation. Restart requires signing in again. Other packs remain separate; neither option erases earlier Sitecore analytics. See the [reset runbook](../examples/liberty-mutual-agent-portal/docs/auth-and-data.md#durable-work-and-resetting).

Record the reviewed deployment, persona results, editorial round trip and remaining questions in the handoff evidence. Native CMS, Search, UDL and Agentic artifacts are inspectable platform work; login accounts, insurance records, production figures and operational actions are synthetic integration examples. Final release acceptance belongs in the [developer handoff](developer-handoff.md), separately from this guided script.
