# Native personalization configuration

This directory preserves source and evidence for native SitecoreAI personalization configuration. It is separate from CMS item serialization and application releases. Saving these files does not deploy a custom value, connect a decision table or activate a content variant.

## Choose the relevant surface

- Home **Guidance** (`AgentGuidance`) uses the known role and agency growth flag described below.
- Learning & resources has a separate [native Resources A/B test](../../docs/ab-testing.md).
- Products & appetite uses **Spotlight** (`ProductSpotlight`) and the built-in Top Affinity value, with [page assignments, model, native decision and verified browsing journeys](../../docs/affinity-personalization.md).
- Small business growth uses **Callout** (`CampaignCallout`) and the calculated premium-share condition described below.

These configurations are independent. Changing a serialized datasource does not configure cloud decisions, transfer native history or authorize insurance transactions.

## Agent priority

Home **Agency priorities** uses one String custom value, **Agent priority**, to select its complete recommendation collection. Its clearly named business rules live in **Optimization → Custom values → Agent priority**. The component decision table maps the result to authored content:

| Agent priority result | Business rule | Component content |
| --- | --- | --- |
| **Agency growth** | Agency principal, licensed in Texas, with agency small-business share below 20% | Agency growth priorities |
| **Producer priorities** | Producer, licensed in Illinois, specializing in small business, with positive individual small-business production | Producer priorities |
| **Standard** | No qualifying rule, or incomplete/untrusted data | Original For all agencies collection |

The [saved JavaScript](custom-values/agent-priority.js) puts **Rule 1: Agency growth** and **Rule 2: Producer priorities** above the validation and calculation helpers. Named variables describe role, licensing, production, and the growth opportunity. The single `growthShareLimitPercent` setting is **20**. Agency share is small-business written premium divided by combined agency personal-lines and small-business written premium. The producer rule separately checks the individual's production.

All rules require an identified profile with the **liberty-mutual-agent** identity provider, **USD** production currency, and **agency** metric scope. Invalid required premium values, including negative, fractional, non-finite, or unsafe integer cents, retain **Standard**. These rules select marketing content; they do not grant licensing, authorization, product eligibility, or transaction access.

A marketer can inspect the readable classification in **Optimization → Custom values**. Changes to eligibility use that JavaScript and require native testing and publication. Page Builder then uses straightforward **Agent priority is equal to Agency growth** and **Agent priority is equal to Producer priorities** comparisons. The standard result has no targeting row, so the original component remains in place. Editing the message or changing the order of approved cards remains native content authoring and requires no application code release.

[Native metadata](custom-values/agent-priority.metadata.json) and the [acceptance record](verification/agent-priority.native-setup.json) distinguish source preparation from actual native configuration, profile tests, previews, publication, and live verification. The custom value is Published, and its exact saved expression has been read back. Actual native tests matched Avery to the first table rule and Daniel to the second; fresh sign-ins showed both intended live experiences, and Maya received Standard. The Texas-first growth Draft and unchanged producer content rendered in Personalization Preview. Native review and Item/English publication updated Avery while Daniel stayed unchanged. The original Heading, Intro, and recommendation order were then restored in approved, published version 37, with native publication completion and live Avery readback verified. Saving these source files or deploying Git/Vercel does not configure the native custom value or decision table.

Avery's existing agency small-business share is approximately **14.46%**, so **20** qualifies her and **10** excludes her. Daniel qualifies for **Producer priorities** through his own Illinois licensing, specialization, and positive individual production. No persona or agency ID chooses the result.

Run the source checks from the repository root:

```bash
node authoring/personalization/verify-agent-priority.cjs
```

The checks validate exact output labels, role/state requirements, production boundaries, malformed metrics, trusted identity, and profile immutability. They compare all archived synthetic profiles with the previously verified Boolean conditions at their original parameters. CI also runs this verifier. Native profile tests prove qualification; **Personalization Preview** independently renders each selected content variant using current authoring content.

### Earlier Agency priorities configurations

The [earlier classification custom value](custom-values/agency-product-priorities.js) and the reusable [growth](conditions/agency-growth-opportunity.js) and [producer](conditions/producer-priorities.js) Boolean conditions remain unchanged for recovery. They are separate native entities. Their [historical acceptance evidence](verification/marketer-agency-priorities.native-setup.json) records the previously verified two-column table, threshold changes, native profile tests, previews, publication, and restored content. The new **Agent priority** acceptance record owns the current one-column configuration and verification status.

## Calculated small-business growth opportunity

The published Boolean custom value **Liberty Mutual - Small business growth opportunity** evaluates the identified agent's role and agency business mix. A principal or producer qualifies when small-commercial premium is less than 20% of the combined personal-lines and small-commercial premium. Missing, invalid or negative metrics, an unrelated identity provider, and non-matching roles return false. Values are imported fictional agency metrics; this sandbox has no live Salesforce data connection.

The active **Liberty Mutual - Campaign growth opportunity** decision table applies the true result to the CampaignCallout on `/growth/small-business`. The true variant uses **Data/Personal lines growth opportunity**; the original uses **Data/Growth opportunity**. Its guidance has no effect on licensing, authorization, product eligibility or underwriting.

- [Saved JavaScript expression](custom-values/small-business-growth-opportunity.js)
- [Native configuration identifiers](custom-values/small-business-growth-opportunity.metadata.json)
- [Native profile tests and published browser observations](verification/small-business-growth-opportunity.native-tests.json)

In Page Builder, select **Small-business growth → Layers → Callout → Edit personalization rules** to inspect the table. Select **Original** or the **is true** variant to preview its authored copy. Avoid stopping the running personalization during a walkthrough.

To see actual decisions, use the [published portal login](https://liberty-mutual-agent-portal.vercel.app/login). Avery sees **Build on your personal-lines relationships**; Daniel and Maya see **Turn local knowledge into a stronger submission**. Sign out between personas. The editing preview can show unpublished content and is not the acceptance surface for Live delivery or expiration.

Run the 16 local boundary checks from the repository root:

```bash
node authoring/personalization/verify-small-business-growth-opportunity.cjs
```

Changes to this source still require an explicit native Custom Value update, tests and publication. Git/Vercel deployments do not deploy the decision configuration. Native personalization and an A/B test cannot run on the same component; this campaign callout remains separate from the Resources A/B component.

## Small-business growth role

The native custom value **Liberty Mutual - Small business growth role** is published in the Safeco Insurance Company of America POC organization.

| Property | Value |
|---|---|
| Native ID | `d533bc1e-ded3-4755-84d7-a0805e5dabf8` |
| Friendly name | `liberty_mutual__small_business_growth_role` |
| Return type | String |
| Source | [small-business-growth-role.js](custom-values/small-business-growth-role.js) |
| Native metadata | [small-business-growth-role.metadata.json](custom-values/small-business-growth-role.metadata.json) |
| Native test evidence | [small-business-growth-role.native-tests.json](verification/small-business-growth-role.native-tests.json) |

The value returns a role only when the profile is identified, includes the `liberty-mutual-agent` identity provider, and has `extensions.smallBusinessGrowthAudience` equal to boolean `true`. Allowed results are `principal`, `producer`, `account-manager` and the fallback `neutral`. It uses the seeded agency-level growth cohort and individual role; it does not calculate the cohort or authorize agency operations.

The native Test UI loaded the actual imported Avery profile `477f6b6f-673b-42e3-83ab-1bf0a8aa0ed2` and returned `principal`. Five further native tests used modified request JSON: cohort false returned neutral, producer returned producer, account-manager returned account-manager, anonymous returned neutral, and an unrelated identity provider returned neutral. These changes affected test context only, not persisted profiles. They do not establish that separate producer or account-manager records were retrieved.

The Home migration uses the **Liberty Mutual - Home growth guidance** decision table on the existing Home page's AgentGuidance component. It retains the same **Liberty Mutual - Small business growth role** custom value and three exact-match rows selecting `commercial-growth-principal`, `commercial-growth-producer`, and `commercial-growth-account-manager`. The original component uses `commercial-growth-neutral`.

Historical validation before the Home migration confirmed the original decision table's Published and LIVE status. The native Avery profile test matched Rule 1; that page and four referenced data sources were published without subpages or unrelated items. Those results describe the original configuration, rather than acceptance of the migrated Home page.

Earlier production checks selected all three role copies, but principal and account-manager initially required a refresh. The current application establishes browser identity through the native `IDENTITY` event and observes profile-link readiness before workspace navigation. Native campaign decisions use the linked browser's `sc_cid`; the server also requires an active signed portal session and verified profile generation. It does not use an external agent identifier to look up a decision profile or use fixture attributes to select a campaign variant. Native discovery, rule execution, variant validation and rewrites remain in the Content SDK integration. Unavailable linking or decisioning retains neutral guidance. The corrected release preview passed all 37 connected assertions, including first and second workspace responses for three positive roles and the unrelated neutral profile. See [deployment-specific QA evidence](../../docs/qa-evidence-2026-09-10.md) and its linked release pull request; earlier refresh-based results remain historical evidence.

An editorial round trip was also observed: a temporary inline headline edit was published, appeared in the authenticated production page, then was restored to the original copy and published again. This is separate from the custom-value contract tests.

## Reproduce and maintain

On the current tenant, locate the existing custom value by its name and ID before changing anything. On a destination tenant, create the equivalent String custom value using the exact source expression, record the new native ID, test with an imported identified agent and neutral cases, then publish through the native UI. Tenant IDs are evidence of this installation, not portable deployment identifiers.

After publication, connect the value to the intended native decision table and map its role results to approved CMS variants. Record decision-table execution and an identified browser journey separately. Profile rules select content; the application continues to enforce business authorization on the server.

Run the local source contract check from the repository root:

```bash
node authoring/personalization/verify-small-business-growth-role.cjs
```

This check evaluates the saved expression with small synthetic contexts and makes no network requests. Its additional edge cases are local checks, not additional native observations. The native evidence file records only the six cases actually reported from the native UI.
