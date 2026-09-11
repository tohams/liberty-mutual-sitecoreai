# State eligibility release verification — September 11, 2026 UTC

Scope: PR [#14](https://github.com/tohams/liberty-mutual-sitecoreai/pull/14), implementation through `1ef8fe60084a36c8c913efc8571766843ac04a1e`. The [eligibility runbook](state-eligibility.md) describes the model, synthetic data boundary and repeatable acceptance commands.

## Automated checks

- 80 application tests pass, including four real React/Content SDK render checks run in a child process. Coverage includes cross-agent Florida submissions, retained owners, expired/revoked/future licenses, agency and producer appointments, product withdrawal, stale requirements/industries, original-state bypasses, legacy bonds, unchanged storage after denial, state navigation and native link query formatting.
- Type checking and strict ESLint pass locally.
- [GitHub Actions run 34545720040](https://github.com/tohams/liberty-mutual-sitecoreai/actions/runs/34545720040) passes both jobs: connected production build and offline validation. This includes content/identity contracts, owned Sitecore serialization, SDK generation, TypeScript, lint, tests and browser-bundle secret checks.
- Vercel preview deployment `61ayskzK9CE55sQUkomtRuEXr46Z` is ready on the stable editing alias.

## Deployed acceptance

The deployed state-eligibility script passed ten checks on reviewer pack 04. Jordan could not create, complete, submit or relabel an unauthorized Florida risk. Avery could not move Jordan's Texas record to Florida while retaining Jordan as owner. Denials preserved saved versions and records. Avery's eligible Florida checklist and submission path succeeded. Daniel's scoped bootstrap exposes IL/TX authority; the unavailable Illinois recreational product is refused despite Maya having an active Illinois license.

Browser acceptance on the final preview confirmed:

| Journey | Observed result |
| --- | --- |
| Daniel: product state selector | Illinois and Texas only; 17 available products in IL and 18 in TX |
| Texas product → farm/ranch guidance → preparation article | Valid `state=TX` retained through native links and back links; article loads without an encoded-question-mark path |
| Intake opened from Texas, deliberately changed to Illinois | Saved as Illinois; returned navigation uses Illinois |
| Explicit `/quote?new=1&state=FL` for Daniel | Empty state selection and disabled continuation; no silent home-state fallback |
| Effective date changed to October 11, 2026 | Saved record retains the displayed date |
| Effective date changed to October 11, 2040 | Availability explanation and disabled save; existing record unchanged |
| Jordan opens Avery's Florida record | Actual Florida state remains visible, with an authority explanation and disabled checklist |
| Maya filters personal products | Four products in IL; five in TX, where recreational coverage is available in the fictional rules |
| Marcus creates and submits an Illinois bond | Correct saved state, automatic selection of the new record, and Submitted status |

The scripted preview cases are `sub-26a034f6-bf60-4c6d-bbc7-bdd094f96b02` (Avery/FL, Submitted) and `sub-294a155d-ac47-4316-b38c-1840f6e94a0c` (Jordan/TX, Draft). Browser checks also created Prairie Market Partners (`SUB-1EAC38C7`, Daniel/IL, Draft) and Prairie Civic Builders (`BND-932E385F`, Marcus/IL, Submitted). These four newly created fictional preview records are retained. No preexisting records or reviewer packs were reset.

**Later rehearsal reset:** the [subsequent seven-loop rehearsal](qa-seven-loops-2026-09-11.md) reset packs `01`–`04` on both hosts before and after its checks. The references above now describe historical evidence and are no longer active saved-work records; the retention statement records the earlier release-check outcome.

## Native platform regression

- The native personalization harness passed all 37 checks on preview: sign-in, verified profile linking, audience variants, logout and anonymous redirect for Avery, Jordan, Maya and Elena. No decision retries or identity resets were used.
- Native Search state/facet/query/pagination checks pass: all 12 resources; Daniel 11; Maya 12; nationwide 9; Florida plus nationwide 10; Daniel's state-guidance facet 2; Daniel's workers-compensation query 4.
- Native Page Builder Home canvas reloads successfully on the updated editing host. AgentGuidance renders and operational controls remain disabled in authoring context. No CMS edits or publishing were performed in this check.

## Production gate and limits

Merge and production checks are recorded in PR #14 after the final documentation commit. Production acceptance uses the default script mode: bootstrap reads and denied requests, without successful transactional writes. Hosting remains Vercel Hobby with the existing free Redis integration.

This release verifies the application against its explicit fictional authority and product rules. It does not certify real insurance eligibility or compliance. The customer must supply approved carrier entities, state/line authority mappings, licensing/appointment records and underwriting rules behind the documented adapter before real insurance work.
