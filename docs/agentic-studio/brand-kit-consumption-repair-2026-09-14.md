# Native Brand Kit consumption repair — September 14, 2026

A fresh native Agentic run now retrieves and uses the complete authored visual guidance. Its saved creative brief contains the correct palette, typography and logo direction without those answers being supplied in the request. **This repairs the demonstrated drafting workflow; Sitecore’s conflicting top-level color metadata and empty-array projection still persist.**

## What changed

In **Design → Brand kits → Liberty Mutual — Independent Agents → Sections → Visual Guidelines**, the existing **Visual guidance** text field was expanded to include the reviewed palette and logo guidance already present in the native lists. The exact saved text is [brand-kit-visual-guidance.txt](../brand/brand-kit-visual-guidance.txt). The field was set to **Non AI editable**, so automatic enrichment does not overwrite it. Future manual changes require deliberate review of this maintained copy alongside the original lists.

The kit ID remains `7dc084e7-9b2a-4b2b-bf66-e3e8fd865156`; Visual Guidelines section ID is `99bfb352-4ff5-4168-b824-14a580c0a7f5` and Visual guidance field ID is `dbdf2939-e48c-4b42-bdae-c849523f68ae`. Original palette/logo arrays, the published knowledge document and site assignment were retained. No agent configuration, campaign activation or portal deployment was needed for this repair.

The source contains seven palette/role entries covering six distinct hex values, plus seven logo guidelines. Navy and yellow are public agent-site observations; the supporting colors and portal design are implementation choices, not claimed corporate standards.

## Inspect the saved proof

1. Open the [native verification conversation](https://agentic-studio-use.sitecorecloud.io/conversations/6605d4e6-b423-4510-afd0-161f2ee99dc8), **Liberty Mutual — Brand-grounded ABM creative brief**, using your authorized Sitecore account.
2. Inspect the request: it asks for native retrieval and conflict handling, without supplying the expected colors, a brand excerpt or web sources.
3. Expand **Get Brand Kit** and the **Get Brand Kit Section** results. The run made one kit read and four section calls. Verify that Visual Guidelines returns the complete saved **Visual guidance** text; the section and field IDs above identify it precisely.
4. Open the saved artifact **Liberty Mutual Independent Agents | Small-Business Resources ABM Creative Brief**. Its visual execution section uses navy `#1A1446`, yellow `#FFD000`, canvas `#F5F6FA`, secondary text `#5A6276`, border `#DADEE7` and teal `#006B68` with their authored roles. It also includes Roboto with Arial/system fallbacks, logo-preservation rules, audience/state constraints and a human review checkpoint.
5. Read its evidence receipt. It explicitly reports the conflicting generic color metadata and uses the retrieved authored guidance instead. This is an inspected native artifact, not a locally supplied reference draft.

The original eight artifacts in the separate ABM space remain historical outputs. In particular, the September 10 package still records its supplied-excerpt input; this new proof does not retroactively change that provenance. No campaign was activated or automatically published.

## Repeat the grounding check

Use a **new conversation** with the existing kit selected and native **Brand Kits** and **Context Retrieval** capabilities available. Paste only [brand-kit-grounding-prompt.txt](brand-kit-grounding-prompt.txt). It requests a new reviewable artifact; reading the existing proof above does not require a rerun.

- Keep expected hex values and the saved guidance file out of the request. A supplied answer or excerpt would not test native grounding.
- Inspect raw returned content, not only the agent’s claim that it used the kit. Confirm the complete text was retrieved before the draft was produced.
- Compare every used palette value/role and logo/typography rule with the saved native guidance. Report conflicting metadata separately; missing required guidance should stop the draft.
- Check the state and authorization boundaries and human review checkpoint. A generated brief is not customer brand approval, underwriting approval or measured campaign effectiveness.
- Record the new conversation and artifact, then leave them as review history. Do not reset profiles, alter the existing ABM artifacts or activate/publish content for this check.

For a new tenant, install and review the kit normally, then maintain the same complete Visual guidance text if that tenant’s retrieval also omits arrays. Use the destination kit’s real ID in the request. Do not assume this tenant’s implementation workaround is required everywhere.

## Remaining platform issue

The native UI contains populated Colour palettes and Logo guideline arrays, but fresh **Get Brand Kit Section** output returns empty arrays. **Get Brand Kit** also returns top-level `#4F46E5`/`#A78BFA`, which conflict with the authored source. These fields remain unsuitable as the palette authority. The read-only context filesystem exposes an extracted snapshot, not a supported persistent color-update path. No vendor mapping repair has been demonstrated.

Sitecore documents [manual subsection editing and protection from AI enrichment](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/brand-kits/review-or-refine-a-brand-kit-section.html). The [Brand Management API](https://api-docs.sitecore.com/ai-skills/ai-brand-management-rest-api) supports subsection values; its published kit model does not define those top-level colors. These supported content controls underpin this consumption repair, while the projection discrepancy remains separate. The [September 13 retrieval record](brand-kit-retrieval-2026-09-13.md) preserves the earlier checkpoint.
