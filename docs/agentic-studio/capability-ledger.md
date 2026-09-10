# Brand and Agentic capability ledger

Status recorded September 10, 2026, from the implementation owner's native UI observations. This is the handoff record for Brand Kit and ABM capabilities only. It does not certify unrelated identity, personalization, Search or deployment behavior.

## Native identifiers

- Organization: Safeco Insurance Company of America POC.
- Site: `liberty-mutual-agent-portal`.
- Brand Kit: `7dc084e7-9b2a-4b2b-bf66-e3e8fd865156`.
- ABM space: `944bcaa4-a10d-4bec-93bc-ebcff9c86328`.
- Space name: **Liberty Mutual — Expand your small-business practice**.
- Initial Account Enrich run: `b4049977-fb08-44bb-a506-c1a98b27b35a`.
- Initial Brief run: `e04cc244-8e06-4d2e-8dfb-23e0f5e3c459`.
- Initial Content run: `776c2332-51e0-4348-a4c3-1e58c49c85c4`.

## Capability evidence

| Capability | Status | Evidence and boundary |
|---|---|---|
| Native Brand Kit creation and publication | Completed | The kit exists and is published in SitecoreAI Design. Its reviewed source pack is checked in under `docs/brand`. |
| Brand Kit assignment to the portal site | Completed | The published kit is assigned to `liberty-mutual-agent-portal`. This records configuration; AI generation/optimization behavior needs its own acceptance evidence. |
| Native ABM space setup | Completed | The named space exists with the ABM Campaign template and its three initial agent stages. |
| Initial native agent execution | Completed as an execution event | Three initial runs completed and produced six native artifacts. Counts do not imply output approval. Initial run IDs are recorded above; individual artifact IDs and timestamps have not yet been transcribed here. |
| Selected Brand Kit context | Configured | The same published kit was selected for all three initial stages. Selection alone does not prove its contents were consumed. |
| Native Brand Kit retrieval by the ABM agents | **Unverified** | The final generated artifact reported that attachment contents were unavailable despite the selected kit. No successful native retrieval result is recorded here. The cause is not established. |
| Revised native Content Generation | Generated; human review remains | A direct Content Generator run produced a seventh artifact on `2026-09-10T15:35:46.526Z`: **Liberty Mutual — Expand your small-business practice - Generated Content**, with content title **Cedar Ridge Insurance ABM — Revised Final Human-Review Package**. It preserves the four supplied seed payloads and adds an internal relationship-manager brief, source ledger and measurement design. The native JSON explicitly reports no successful Brand Kit retrieval. |
| Complete ABM workflow acceptance | Drafting example available; retrieval limitation remains | The native space reports Completed. This is execution status, not brand/compliance approval. The revised artifact distinguishes existing telemetry from proposed campaign impression and attribution events; it makes no conversion-lift claim. Its audience prose says the cohort flag is “present”; the implemented rule correctly requires boolean `true`. Reviewers must use the implemented rule and correct that prose before reusing the brief. |
| Checked-in campaign reference | Local implementation artifact | `reference-campaign-draft.json` is a desired-output example created by the implementation process, not a native generated artifact or proof of execution. |
| Outbound activation and publication | Outside this drafting flow | Drafting does not authorize email delivery, audience activation, automatic approval or CMS publication. Any approved CMS changes follow the existing editorial workflow. |

## Close the remaining acceptance work

The seventh artifact is available in the [native Space](https://app.sitecorecloud.io/agentic/chat-new/944bcaa4-a10d-4bec-93bc-ebcff9c86328?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df). Both its native Content and JSON views are available; a later inspection of Content successfully displayed the full generated Markdown, approximately 20,284 characters. No local export exists. An attempted UI edit of the three cohort-flag phrases failed, and no native save was performed; the boolean-`true` correction remains outstanding. Record any subsequent artifact/run identifiers, reviewer, corrections and acceptance separately. Do not mark native retrieval verified when the agent used the provided brand excerpt. Preserve that limitation even when the generated draft is useful.

Keep the initial six artifacts as native run history. Exporting them later must preserve their relationship to their actual runs; the local reference JSON must never substitute for those outputs.
