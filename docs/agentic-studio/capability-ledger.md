# Brand and Agentic capability ledger

Current status includes the separate September 13 retrieval verification. The September 10 execution and configuration observations below remain historical evidence. This is the handoff record for Brand Kit and ABM capabilities only. It does not certify unrelated identity, personalization, Search or deployment behavior.

## Native identifiers

- Organization: Safeco Insurance Company of America POC.
- Site: `liberty-mutual-agent-portal`.
- Brand Kit: `7dc084e7-9b2a-4b2b-bf66-e3e8fd865156`.
- ABM space: `944bcaa4-a10d-4bec-93bc-ebcff9c86328`.
- Space name: **Liberty Mutual — Expand your small-business practice**.
- Initial Account Enrich run: `b4049977-fb08-44bb-a506-c1a98b27b35a`.
- Initial Brief run: `e04cc244-8e06-4d2e-8dfb-23e0f5e3c459`.
- Initial Content run: `776c2332-51e0-4348-a4c3-1e58c49c85c4`.

## Current retrieval status

On September 13, native **Get Brand Kit** and all nine **Get Brand Kit Section** calls succeeded in a separate read-only conversation. The existing ABM artifacts still document their September 10 excerpt input. Structured top-level colors remain inconsistent with the authored Visual guidance. See the [retrieval record](brand-kit-retrieval-2026-09-13.md) for the actual conversation, returned fields and limitations. No campaign was rerun or published for this check.

## September 10 capability evidence

| Capability | Status | Evidence and boundary |
|---|---|---|
| Native Brand Kit creation and publication | Completed | The kit exists and is published in SitecoreAI Design. Its reviewed source pack is checked in under `docs/brand`. |
| Brand Kit assignment to the portal site | Completed | The published kit is assigned to `liberty-mutual-agent-portal`. This records configuration; AI generation/optimization behavior needs its own acceptance evidence. |
| Native ABM space setup | Completed | The named space exists with the ABM Campaign template and its three initial agent stages. |
| Initial native agent execution | Completed as an execution event | Three initial runs completed and produced six native artifacts. Counts do not imply output approval. Initial run IDs are recorded above; individual artifact IDs and timestamps have not yet been transcribed here. |
| Selected Brand Kit context | Configured | The same published kit was selected for all three initial stages. Selection alone does not prove its contents were consumed. |
| Native Brand Kit retrieval by the ABM agents | **Unverified** | The final generated artifact reported that attachment contents were unavailable despite the selected kit. No successful native retrieval result is recorded here. The cause is not established. |
| Revised native Content Generation | Generated; human review remains | A direct Content Generator run produced a seventh artifact on `2026-09-10T15:35:46.526Z`: **Liberty Mutual — Expand your small-business practice - Generated Content**, with content title **Cedar Ridge Insurance ABM — Revised Final Human-Review Package**. It preserves the four supplied seed payloads and adds an internal relationship-manager brief, source ledger and measurement design. The native JSON explicitly reports no successful Brand Kit retrieval. |
| Final native audience-contract revision | Generated and statically checked | An eighth artifact was created on `2026-09-10T19:34:20.737Z`, with content title **Cedar Ridge Insurance ABM — Final Reviewed Implementation Package**. Its native JSON contains 24,890 characters of Markdown. All three positive rows now require an identified profile, the `liberty-mutual-agent` provider, scalar boolean `true`, and the exact supported role. The neutral row explicitly covers absent, false, unresolved and malformed values. Its four JSON seed payloads parse successfully and preserve the reviewed copy and single-paragraph HTML bodies. |
| Complete ABM workflow acceptance | Drafting example available; retrieval limitation remains | The native space reports Completed. This is execution status, not brand/compliance approval. Use the eighth artifact for the corrected audience contract. It distinguishes existing telemetry from proposed campaign impression and attribution events and makes no conversion-lift claim. Native Brand Kit retrieval remains unverified. |
| Checked-in campaign reference | Local implementation artifact | `reference-campaign-draft.json` is a desired-output example created by the implementation process, not a native generated artifact or proof of execution. |
| Outbound activation and publication | Outside this drafting flow | Drafting does not authorize email delivery, audience activation, automatic approval or CMS publication. Any approved CMS changes follow the existing editorial workflow. |

## September 10 retrieval configuration inspection

On September 10, 2026, the implementation owner observed the embedded Agentic Studio interface exposing Start over, History, Chat/Artifacts, Select Agent and the composer. The documented Agentic Settings/Tools management controls were not visible. The global CMS Settings page exposed utilities rather than those Agentic controls. Context Retrieval configuration was therefore not inspected; whether it is disabled, and whether any role or entitlement explains the UI difference, remain unverified. This observation does not establish the cause of the Brand Kit retrieval limitation or change its status.

Sitecore documents the Agentic-specific navigation in [Agentic Studio settings](https://doc.sitecore.com/sai/en/users/sitecoreai/working-with-agentic-studio/agentic-studio-settings/agentic-studio-settings.html). Its [tool inventory](https://doc.sitecore.com/sai/en/users/sitecoreai/working-with-agentic-studio/agentic-studio-settings/tools-available-to-chats-and-agents.html) lists Context Retrieval under Standard tools and Brand Kits under Agent API tools. They were unverified at that September 10 checkpoint. On September 13, Agentic Settings > Tools visibly enabled Context Retrieval and Brand Kits with read-only access, and the separate retrieval record verified returned content. This does not establish the cause of the earlier failure.

## Close the remaining acceptance work

All eight artifacts are available in the [native Space](https://app.sitecorecloud.io/agentic/chat-new/944bcaa4-a10d-4bec-93bc-ebcff9c86328?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df). The eighth artifact supersedes the seventh for audience-contract prose. Its native JSON view was inspected and parsed. After generation settled, its Content and Preview views also displayed the complete body. No local export exists. The correction was made through a subsequent native Content Generator run after direct Content-editor interaction failed; the earlier artifacts remain unchanged as run history. Do not mark native retrieval verified when the agent used the provided brand excerpt. Preserve that limitation even when the generated draft is useful.

Keep the initial six artifacts as native run history. Exporting them later must preserve their relationship to their actual runs; the local reference JSON must never substitute for those outputs.
