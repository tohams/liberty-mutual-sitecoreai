# Native Brand Kit retrieval verification — September 13, 2026

**Historical checkpoint:** the [September 14 consumption repair](brand-kit-consumption-repair-2026-09-14.md) adds a verified native drafting path using complete authored text. Conflicting metadata and omitted arrays remain platform limitations; the observations below record the earlier read-only check.

Native read-only retrieval succeeded for **Liberty Mutual — Independent Agents** in the existing SitecoreAI tenant. This is separate from the September 10 ABM generation, whose artifacts record a supplied brand excerpt. It does not establish that those earlier runs retrieved the kit.

## Inspect the saved proof

In Agentic **Conversations**, open **Liberty Mutual — Read-only Brand Kit retrieval verification** (`4c4230ac-901f-4f4c-a90d-15bc38b0de76`). Expand the existing **Get Brand Kit** and **Get Brand Kit Section** results. The final response and actual tool results were inspected by **14:12:19 UTC on September 13**. This conversation has zero generated artifacts; no campaign rerun is needed.

- Exact kit: `7dc084e7-9b2a-4b2b-bf66-e3e8fd865156`. Get Brand Kit returned success.
- All nine section reads succeeded: Global Goals, Brand Context, Dos and Dont's, Tone of Voice, Checklist, Grammar Guidelines, Visual Guidelines, Image Style, and Glossary and Localization. Empty optional fields remained empty.
- The returned **Visual guidance** contains navy `#1A1446`, yellow `#FFD000`, Roboto with Arial/system fallbacks, logo preservation and accessible workspace guidance. Tone of Voice contains the authored agent-oriented wording guidance.
- Agentic **Settings > Tools** showed Context Retrieval and Brand Kits enabled, with read-only context access. No setting was changed.

## Remaining limits

Get Brand Kit and its Agentic projection returned top-level colors `#4F46E5` and `#A78BFA`, which conflict with the authored Visual guidance. The projection's cause is unestablished. Review the actual Visual guidance and reconcile the structured metadata before relying on those projected fields. No supported top-level color correction was exposed in the inspected native edit dialog or Brand Kit tools, and the dialog was canceled unchanged.

The generic context summary reported zero sections even though the nine precise section calls succeeded; it is not a reliable section inventory. The returned context files do not prove retrieval of published PDF chunks. The separate Knowledge UI confirmed the original PDF as Published with 13 chunks. Publication and site assignment are independently verified configuration.

This retrieval check changed no kit, page, workflow, rule, permission or campaign, and produced no outbound delivery or measured conversion lift. Customer editorial approval and corporate-brand acceptance remain separate. Preserve the existing ABM artifacts as their original execution history.
