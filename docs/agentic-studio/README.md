# Agentic Studio: agency growth campaign

The native ABM space **Liberty Mutual — Expand your small-business practice** has been created and executed in the customer's tenant. Three initial runs completed and produced six artifacts. Content Generation is currently marked **incomplete pending a reviewed rerun**: the final generated artifact reported that the selected Brand Kit's attachment contents were unavailable. The workflow is not accepted as finally complete, and native Brand Kit retrieval is not verified.

The Brand Kit itself is created, published and assigned to the `liberty-mutual-agent-portal` site. These completed configuration steps are separate from proof that an Agentic run retrieved its contents. See the [capability ledger](capability-ledger.md) for the exact evidence and limitations. All customer-facing copy is free of sandbox labels; internal provenance remains explicit.

## Run inputs

- `native-run-prompt.txt`: complete paste-ready prompt, constraints and campaign input.
- `cedar-ridge-campaign-input.json`: minimally necessary fictional account context, role goals, working route allowlist, native Brand Kit ID and official source ledger.
- `reference-campaign-draft.json`: source-grounded desired-output example written by the implementation process. It must not be represented as a native Agentic Studio result.

Campaign: **Expand your small-business practice**. Native Brand Kit: `7dc084e7-9b2a-4b2b-bf66-e3e8fd865156`. Account: Cedar Ridge Insurance; TX; independent channel; appointed for personal and small-commercial lines. The supplied September 2025–August 2026 production totals reconcile to the integration fixtures. Principal Avery, producer Jordan and account-manager Maya share the same agency. The fourth variant is a neutral fallback, not a fourth invented colleague.

The application fixture campaign ID is `expand-small-business`; the CMS editorial slug is `expand-small-business-practice`. Keep both identifiers explicit in the native workflow record until one canonical ID is adopted across event instrumentation, workflow and CMS. Existing CMS datasource names are already provided, so the draft can be reviewed against the implemented portal without duplicating content.

## Native setup and current evidence

| Native record | Value |
|---|---|
| Space name | Liberty Mutual — Expand your small-business practice |
| Space ID | `944bcaa4-a10d-4bec-93bc-ebcff9c86328` |
| Starting template | ABM Campaign |
| Brand Kit ID | `7dc084e7-9b2a-4b2b-bf66-e3e8fd865156` |
| Site assignment | `liberty-mutual-agent-portal` |
| Initial execution | Three completed runs; six generated artifacts |
| Content Generation acceptance | Incomplete; reviewed rerun pending |
| Native kit retrieval | Unverified; generated output reported attachment contents unavailable |

The installed ABM template uses Account Data Enricher, Brief Generator and Bulk Content Generator. The published Liberty Mutual kit was selected as context for all three stages. The run and artifact counts above record native execution, not content approval or successful retrieval. Individual run IDs, artifact IDs and execution timestamps have not been transcribed into this repository; retrieve them from the named native space when closing acceptance.

## Continue the reviewed run

1. Open the existing space by the name and ID above. Preserve its initial artifacts as history rather than replacing them with `reference-campaign-draft.json`.
2. Check Agentic settings and the selected agent's capabilities for Context Retrieval and Brand Kits. Keep the published kit selected in the run context. A new top-level Brand Context is a separate feature, not a documented prerequisite for consuming a Brand Kit. See [agent configuration](https://doc.sitecore.com/sai/en/users/sitecoreai/working-with-agentic-studio/understanding-agents/create-a-standard-agent.html) and [the distinction between Brand Context and Brand Kits](https://doc.sitecore.com/sai/en/users/sitecoreai/brand-context/when-to-use-brand-context-or-a-brand-kit.html).
3. Rerun Content Generation with the supplied fictional account context, the reviewed brief and the source-grounded brand excerpt provided through Agent Context. Treat that excerpt as explicit input; its use does not prove native kit retrieval. Keep the stage incomplete until the new native outputs have been reviewed.
4. Record the actual rerun ID, time, output artifact IDs and review outcome in the capability ledger. If the agent still cannot retrieve kit contents, retain that limitation. A selected kit name or an agent's assertion is insufficient evidence of retrieval; inspect the native tool/source result where available.
5. Review all role variants against the acceptance checks below. Only approved changes should move into the existing CMS datasources and proceed through the installed Sitecore workflow. No email sending, audience activation, automated approval or public publishing belongs in this drafting flow.

For a repeat installation, the official [ABM Campaign guide](https://doc.sitecore.com/sai/en/users/sitecoreai/working-with-agentic-studio/understanding-spaces/create-a-space/abm-campaign.html) describes creating the three-agent flow and selecting Brand Kits as context. Site assignment is configured through **Channels → site Dashboard → Localization → Configuration → Brand kit → Save**, as documented in [Assign a brand kit to a site](https://doc.sitecore.com/sai/en/users/sitecoreai/ai-capabilities-in-sitecoreai/assign-a-brand-kit-to-a-site.html).

## Acceptance checks

- The native run identifies the selected Brand Kit, input campaign and account.
- Native Brand Kit retrieval is supported by actual returned brand content or source/tool evidence. If a reviewed excerpt is used instead, the evidence identifies that input and leaves native retrieval unverified.
- All four role variants exist, differ in purpose, and retain a neutral fallback.
- Every CTA is in the supplied route allowlist and opens the corresponding authored CMS page.
- Every factual product or legal assertion has an exact primary source; recommendations and fictional account facts are labeled in the internal source ledger.
- No financial figure, account score, private identity, credential or client record appears in visitor-facing copy.
- Texas workers compensation guidance does not become a blanket statement that coverage is universally optional or universally required.
- The account-manager variant recommends discovery/referral, not actions beyond that colleague's authorization.
- Draft outputs remain reviewable; no live send or publication occurred.
- Workflow evidence records actual native results. The checked-in reference draft is never used as proof of Agentic execution.

## Walkthrough for marketing and IT

The intended marketing walkthrough translates one agency-level opportunity into useful role-specific content, with brand and source review before approval. Until the Content Generation rerun is accepted, present its outputs as working drafts and explain the retrieval limitation. IT can inspect the native space, fictional inputs, stable identifiers, generated artifacts and separate editorial publishing boundary. UDL audience matching and server-side authorization remain outside the drafting workflow; a content-personalization decision never grants access to agency records.

The measurement plan is a proposed evaluation design. A sandbox cannot establish commercial conversion lift from manufactured activity. For a later real study, randomize and analyze at agency level to reduce cross-colleague contamination and agree event semantics, consent and retention with the customer.
