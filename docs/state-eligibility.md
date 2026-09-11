# State eligibility and risk context

The portal separates educational browsing, agency record visibility and permission to advance insurance work. One shared eligibility module describes the decision; the server recomputes it before each protected action. A disabled button, a URL parameter or a Sitecore audience match never grants permission.

## Decision inputs

`examples/liberty-mutual-agent-portal/fixtures/eligibility.json` is the versioned synthetic adapter for the sandbox. It provides:

| Record | Purpose |
| --- | --- |
| Agent authority | Agent, state, lines of authority, status and validity dates |
| Carrier appointment | Carrier, state, agency and optional individual producer, authorized lines, status and validity dates |
| Product/state rule | State availability, carrier, required authority, required appointment scope, valid dates, allowed industries and preparation requirements |
| Bond mapping | Explicit supported bond-type names and the product whose rules apply, including existing saved bond labels |

The product rule can require agency appointment, producer appointment or both. The current fictional records require both. Agency appointments and business specialization remain separate checks; a principal's administrative role does not waive their own state authority. The original `licensedStates`, product `states` and agency `appointedLines` remain hard caps for compatibility with existing adapters.

Authority is evaluated on the server's current UTC date, with inclusive `validFrom`/`validThrough` calendar dates. Product availability is checked for the current date and the requested policy effective date. The fixed business-metrics scenario date does not keep an expired license active. Date overrides exist for deterministic domain tests; action requests cannot supply an authority clock or replace the server's rule snapshot.

Unknown or conflicting rules, missing authority, inactive/expired/future records, the wrong carrier or state, missing required lines and unavailable products produce a denial with a useful reason. There is no permissive fallback to a broad state list when the dated adapter is missing.

The [NAIC's producer-data overview](https://content.naic.org/cipr_topics/topic_national_insurance_producer_registry_nipr.htm) describes state, authorized lines, license status, appointments and their dates as distinct information. [Florida's licensing guidance](https://www.myfloridacfo.com/division/agents/licensing) also distinguishes current licensing and appointments. These sources motivate the model; they are not the portal's complete legal ruleset.

**The fixture values are illustrative, not Liberty Mutual's actual licensing, appointment, product availability or underwriting determinations.** The authority-code mapping is a sandbox mapping and must be replaced with customer-approved state-specific mappings and actual carrier entities. The application supports one explicit risk state per request; multi-jurisdiction insurance rules require an expanded operational integration.

## Enforcement and saved work

`src/domain/eligibility.ts` contains the pure decisions. `src/server/data/portal.ts` applies them using server-owned records. UI components use the same functions for new-product choices and use server-computed `actionEligibility` decisions for existing submissions and bonds. Bootstrap includes only the current agent's authority records and relevant appointments; it does not expose another producer's full profile merely to calculate a button state.

The acting producer must be eligible for an existing submission's actual state before saving, completing requirements or submitting. The assigned producer must also be eligible for the proposed state and product. A principal cannot change a Texas draft to Florida while leaving a TX/IL-only producer assigned. The action refuses the change with an explanation; it does not silently reassign the account.

Existing-record transitions recheck current product availability and required preparation. They do not rely on a draft's earlier successful save as continuing authorization. Product withdrawal, expired or revoked authority, and changed preparation rules can therefore prevent an old draft from advancing. Bond save and submit use the mapped product and actual saved risk state.

Agency record visibility and administrative follow-up/service tasks remain separate. A colleague may see a shared record with a read-only restriction. Saving a service-request task does not change insurance coverage. Educational articles, saved resources and general learning remain available under the previously agreed browsing behavior.

No durable namespace is changed or reset by this release. Existing saved records retain their IDs, states, owners and statuses. An incompatible record becomes restricted; the application does not rewrite its jurisdiction to make it pass. Successful idempotent retries remain nonduplicating. Denied requests must leave the persisted version and records unchanged.

## Interface behavior

- Products & appetite offers currently active licensed states. It filters products by the dated product/state availability rule. Browsing another business line remains possible where a product is available; Prepare account additionally requires the acting agent's full transaction eligibility.
- The selected risk state is carried in the `state` query parameter through product guidance, return links and intake. Only recognized, licensed states are accepted as new-work preferences. An explicit invalid or unavailable preference requires a choice instead of silently falling back to home state.
- Existing submissions always begin with their saved state. An unavailable state remains visible, with an explanation and blocked actions; it is never replaced by the first option in a dropdown.
- State and product changes are deliberate choices. The form checks their preparation requirements and eligibility together, and the server validates the submitted combination again.
- Native AgentGuidance links carry valid operational context while retaining Content SDK field metadata. External sources, authentication/API links and editor/preview field rendering remain unchanged.
- Home state is labeled as home state. It is a default for new work only when there is no explicit risk-state selection; it is not the account's jurisdiction.
- Search and workspace content defaults receive the active licensed-state projection. The explicit All states research option and saved educational articles continue to work.

## Illustrative state differences

The adapter includes examples that exercise actual code paths without changing existing initial insurance records:

- Recreational coverage is unavailable in Illinois in the fictional rule set.
- The Florida recreational checklist adds storage/storm preparation.
- The Texas farm/ranch rule includes a ranching scenario and a livestock checklist item.

These examples demonstrate product/state availability, allowed industry and preparation differences. They must not be presented as verified Liberty Mutual underwriting rules. Normal editorial publication does not replace this operational authority adapter, and changing a CDP profile does not authorize a transaction.

## Validation and deployment review

Run the application tests for cross-agent submissions, retained assignment, expired/revoked/future authority, agency and producer appointment differences, product withdrawal, malformed/duplicate rules, changed checklists and state selection/navigation. Fixture validation checks explicit authority/rule relationships so inconsistent initial operational records do not silently enter the scenario. Current authority restrictions on an existing saved workspace are enforced at action time.

The deployed API acceptance helper supports two modes from the active application directory:

```sh
node scripts/verify-state-eligibility.mjs --origin https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app --pack 04 --exercise-preview
node scripts/verify-state-eligibility.mjs --origin https://liberty-mutual-agent-portal.vercel.app --pack 04
```

The explicit preview exercise creates two new fictional records: an Avery-owned Florida draft and a Jordan-owned Texas draft. It checks denied cross-agent completion/submission/state changes, preservation of owner/state after refusal, and Avery's valid submission path. It retains those two preview records for browser inspection and never edits a preexisting record or resets a reviewer pack. The default production mode checks bootstrap decisions and denied requests only; it must not produce a successful transactional write. Credentials and cookies are never printed. Each login is logged out afterward.

Browser acceptance covers Daniel's licensed-only selector, product/detail/back/intake context, explicit invalid-state handling, Jordan's read-only view of the Florida case, deliberate state changes and a valid submission/bond flow. Run the normal connected build and serialization checks, then repeat production acceptance after deployment. A customer implementation must connect approved authority/appointment and underwriting sources behind the same boundary before using these decisions for real insurance work.
