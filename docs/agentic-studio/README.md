# Agentic Studio: agency growth campaign

The native ABM space **Liberty Mutual — Expand your small-business practice** has been created and executed in the customer's tenant. Three initial runs produced six artifacts; two subsequent Content Generator runs produced the reviewed package and its audience-contract correction. Use the final reviewed artifact, **Cedar Ridge Insurance ABM — Final Reviewed Implementation Package**, for the walkthrough. It is eighth in creation order, while the current Artifacts list is newest first. Its four seed payloads and strict audience rules were statically checked. The September 10 package records use of the reviewed brand excerpt when native retrieval was unavailable. A September 14 native creative-brief run now verifies consumption of the complete authored visual guidance without a supplied excerpt. The purple top-level metadata and omitted arrays still persist, so the run uses authored text and reports that conflict. See the [consumption repair and saved proof](brand-kit-consumption-repair-2026-09-14.md).

The Brand Kit itself is created, published and assigned to the `liberty-mutual-agent-portal` site. These completed configuration steps are separate from proof that an Agentic run retrieved its contents. See the [capability ledger](capability-ledger.md) for the exact evidence and limitations. All customer-facing copy is free of sandbox labels; internal provenance remains explicit.

## Run inputs

- [native-run-prompt.txt](native-run-prompt.txt): complete paste-ready campaign prompt, native grounding requirements, constraints and account input.
- [brand-kit-grounding-prompt.txt](brand-kit-grounding-prompt.txt): a smaller isolated grounding check that supplies no expected palette values or brand excerpt.
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
| Subsequent content generation | Two additional artifacts; the final reviewed artifact contains the corrected audience contract and four validated seed payloads |
| Content Generation acceptance | Useful internal review package; native Brand Kit retrieval and customer editorial approval remain separate |
| Native kit consumption | Verified in a separate September 14 creative-brief run using complete authored Visual guidance. Top-level color metadata and empty-array projection remain inconsistent; the September 10 ABM excerpt history is unchanged |

The installed ABM template uses Account Data Enricher, Brief Generator and Bulk Content Generator. The published Liberty Mutual kit was selected as context for all three stages. The run and artifact counts above record native execution, not content approval or successful retrieval. Initial run IDs and later artifact timestamps are recorded in the capability ledger. The final reviewed artifact's complete body was verified in native JSON, Content and Preview views.

## Inspect the existing workflow and artifacts

1. Open the existing space by the name and ID above. Inspect **Classic**: it currently shows eight **Done** rows across the three agent types. No **Run workflow** control is visible in this completed space. Preserve the workflow and original artifacts; `reference-campaign-draft.json` is a separate local example.
2. Check Agentic settings and the selected agent's capabilities for Context Retrieval and Brand Kits. Keep the published kit selected in the run context. A new top-level Brand Context is a separate feature, not a documented prerequisite for consuming a Brand Kit. See [agent configuration](https://doc.sitecore.com/sai/en/users/sitecoreai/working-with-agentic-studio/understanding-agents/create-a-standard-agent.html) and [the distinction between Brand Context and Brand Kits](https://doc.sitecore.com/sai/en/users/sitecoreai/brand-context/when-to-use-brand-context-or-a-brand-kit.html).
3. Open **Artifacts**, which lists eight items newest first. Open the first **Liberty Mutual — Expand your small-business practice - Generated Content** card, and verify the content heading **Cedar Ridge Insurance ABM — Final Reviewed Implementation Package**; the first two cards have the same generic label. Review that package and its excerpt provenance. For current grounding proof, open the [September 14 verification conversation](https://agentic-studio-use.sitecorecloud.io/conversations/6605d4e6-b423-4510-afd0-161f2ee99dc8), inspect its native tool results, and read **Liberty Mutual Independent Agents | Small-Business Resources ABM Creative Brief**. It is a separate artifact, not a ninth output in this ABM space. Keep the completed workflow and all eight artifacts unchanged.
4. For a deliberate new content run or destination tenant, record the actual run ID, time, returned tool evidence, artifact IDs and human review outcome. A selected kit name or an agent's assertion is insufficient evidence of retrieval. Use the [grounding checklist](brand-kit-consumption-repair-2026-09-14.md#repeat-the-grounding-check): retrieve authored Visual guidance, reject conflicting summary metadata, and verify the draft against actual returned content.
5. Review all role variants against the acceptance checks below. Only approved changes should move into the existing CMS datasources and proceed through the installed Sitecore workflow. No email sending, audience activation, automated approval or public publishing belongs in this drafting flow.

For a repeat installation, the official [ABM Campaign guide](https://doc.sitecore.com/sai/en/users/sitecoreai/working-with-agentic-studio/understanding-spaces/create-a-space/abm-campaign.html) describes creating the three-agent flow and selecting Brand Kits as context. Site assignment is configured through **Channels → site Dashboard → Localization → Configuration → Brand kit → Save**, as documented in [Assign a brand kit to a site](https://doc.sitecore.com/sai/en/users/sitecoreai/ai-capabilities-in-sitecoreai/assign-a-brand-kit-to-a-site.html).

## Acceptance checks

- The native run identifies the selected Brand Kit, input campaign and account.
- Native grounding is supported by actual returned brand content and tool evidence. Palette, logo and typography decisions follow the complete authored Visual guidance; conflicting metadata is reported. If required guidance is missing, stop rather than invent it. Any supplied-excerpt run remains explicitly separate from native retrieval proof.
- All four role variants exist, differ in purpose, and retain a neutral fallback.
- Every CTA is in the supplied route allowlist and opens the corresponding authored CMS page.
- Every factual product or legal assertion has an exact primary source; recommendations and fictional account facts are labeled in the internal source ledger.
- No financial figure, account score, private identity, credential or client record appears in visitor-facing copy.
- Texas workers compensation guidance does not become a blanket statement that coverage is universally optional or universally required.
- The account-manager variant recommends discovery/referral, not actions beyond that colleague's authorization.
- Draft outputs remain reviewable; no live send or publication occurred.
- Workflow evidence records actual native results. The checked-in reference draft is never used as proof of Agentic execution.

## Walkthrough for marketing and IT

The marketing walkthrough translates one agency-level opportunity into useful role-specific content, with brand and source review before approval. Present the final package as an internal draft. Distinguish the historical package’s excerpt input from the separate native creative brief’s verified use of authored text. The vendor metadata/array projection issue remains; the drafting workflow now handles it explicitly. IT can inspect the native space, fictional inputs, stable identifiers, generated artifacts and separate editorial publishing boundary. UDL audience matching and server-side authorization remain outside the drafting workflow; a content-personalization decision never grants access to agency records.

The measurement plan is a proposed evaluation design. A sandbox cannot establish commercial conversion lift from manufactured activity. For a later real study, randomize and analyze at agency level to reduce cross-colleague contamination and agree event semantics, consent and retention with the customer.
