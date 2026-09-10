# Native personalization configuration

This directory preserves source and evidence for native SitecoreAI personalization configuration. It is separate from CMS item serialization and application releases. Saving these files does not deploy a custom value, connect a decision table or activate a content variant.

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

Publication was confirmed by the native UI's Published status. The **Liberty Mutual - Small business growth guidance** decision table is connected to the workspace AgentGuidance component and is **LIVE**. Its three exact-match rows select the existing `commercial-growth-principal`, `commercial-growth-producer`, and `commercial-growth-account-manager` data sources. The original component uses `commercial-growth-neutral`. The native Avery profile test matched Rule 1; the page and four referenced data sources were published without subpages or unrelated items.

Earlier production browser checks selected the principal, producer and account-manager copies and left the unrelated specialist on neutral content. Principal and account-manager initially required a refresh. The current application establishes browser identity through the native `IDENTITY` event and observes profile-link readiness before workspace navigation. Native campaign decisions use the linked browser's `sc_cid`; the server also requires an active signed portal session and verified profile generation. It does not use an external agent identifier to look up a decision profile or use fixture attributes to select a campaign variant. Native discovery, rule execution, variant validation and rewrites remain in the Content SDK integration. Unavailable linking or decisioning retains neutral guidance. Final deployed fresh-login acceptance of this browser-linked approach remains pending the release owner's QA; the earlier observations do not certify the latest changes.

An editorial round trip was also observed: a temporary inline headline edit was published, appeared in the authenticated production page, then was restored to the original copy and published again. This is separate from the custom-value contract tests.

## Reproduce and maintain

On the current tenant, locate the existing custom value by its name and ID before changing anything. On a destination tenant, create the equivalent String custom value using the exact source expression, record the new native ID, test with an imported identified agent and neutral cases, then publish through the native UI. Tenant IDs are evidence of this installation, not portable deployment identifiers.

After publication, connect the value to the intended native decision table and map its role results to approved CMS variants. Record decision-table execution and an identified browser journey separately. Profile rules select content; the application continues to enforce business authorization on the server.

Run the local source contract check from the repository root:

```bash
node authoring/personalization/verify-small-business-growth-role.cjs
```

This check evaluates the saved expression with small synthetic contexts and makes no network requests. Its additional edge cases are local checks, not additional native observations. The native evidence file records only the six cases actually reported from the native UI.
