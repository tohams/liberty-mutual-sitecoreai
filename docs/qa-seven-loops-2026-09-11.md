# Seven-loop rehearsal evidence — September 11, 2026 UTC

**All seven loops were rehearsed, with the capability qualifications below.** The original CMS summary is restored in the live article, metadata catalog, editor and native Search; final saved-work resets and all 56 account baselines passed. This record combines the implementation owner's fresh browser observations with the retained API, Search, baseline and engineering audit outputs. It records the seven paths in the [presenter runbook](demo-loops.md); it does not certify customer author/approver separation or successful native Brand Kit retrieval.

## Environment and initial baseline

| Scope | Rehearsal target |
| --- | --- |
| Production | [Liberty Mutual Agent Portal](https://liberty-mutual-agent-portal.vercel.app/login) |
| Operational preview | [Designated preview portal](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/login) |
| Native tenant | Safeco Insurance Company of America POC; site `liberty-mutual-agent-portal` |
| Application release | `86c5c7f5d5e8036826493b285b2e91072ca4bd38`, the [PR #15](https://github.com/tohams/liberty-mutual-sitecoreai/pull/15) documentation merge following [PR #14](https://github.com/tohams/liberty-mutual-sitecoreai/pull/14)'s state-eligibility implementation |

The authorized initial **saved-work** reset completed for packs `01`–`04` on both hosts between **02:22:25 and 02:22:28 UTC**. All eight runs retained native profile generation `0`; no restart or native-history deletion was performed. The subsequent baseline verifier checked all **56 environment/account combinations**, with **1,544 assertions passed**, no failed account, separate production/preview operational runs and unchanged fixture sources. That initial baseline check finished at **02:25:37 UTC**.

Operational state is isolated by environment, pack, run and agency. Native profile identity uses pack, person and generation without environment, so matching combinations on preview and production share native UDL history. CMS content and the Search source are also shared across hosts and packs. Earlier release-evidence record IDs describe their historical runs; the initial reset means they are not current rehearsal records.

## Loop 1 — One agency, different people

Fresh production sign-ins showed the expected guidance headings. Each positive persona's action opened its intended article, and Elena's neutral action opened the resource experience:

| Person | Observed guidance |
| --- | --- |
| Avery | Build your next chapter in small business |
| Jordan | Bring a stronger submission to the table |
| Maya | Connect everyday conversations to new needs |
| Elena | Resources for your next client conversation; **Browse resources** opened the resource experience |

Native **Performance → Profiles** inspection opened Avery's actual profile `5295e6b4-7d26-451c-80ff-1b6883dd15d1`, for pack `01`, generation `0`. It showed role `principal`, agency `cedar-ridge`, the true growth-cohort flag, TX/FL/IL license attributes, and distinct agency versus individual production metrics. Native page views for workspace and quote from this rehearsal were visible.

The published **Liberty Mutual - Small business growth role** contract was inspected. In the workspace editor, **Layers → AgentGuidance → personalization → Edit personalization rules** opened the LIVE three-role decision table. Testing with the actual Avery profile matched the principal row in green; the other rows were red. **Clear test**, then **Cancel**, left the rule configuration unchanged. Profile test context was not saved into another person's record.

The native personalization harness also passed **37 assertions on production and 37 on preview**, covering signed-in identity linkage, first and second workspace results, the three positive roles, Elena's neutral result, logout and anonymous redirect. It used no decision retries or profile resets. These are native identity/decision observations; the signed application session and server-owned authority data still govern transactions.

## Loop 2 — Find the right answer

Daniel's browser default returned **11 resources** for IL/TX plus nationwide guidance. The **Workers compensation** query returned **4** with that licensed scope, **5** with All states, **3** with Florida plus nationwide guidance, and **2** with Nationwide guidance only. **Clear filters** restored the licensed scope while retaining the query. An unmatched query returned zero; **Reset search** cleared it. Maya's unfiltered licensed default returned **12 resources**.

Daniel saved the Texas resource, reloaded, and retained the saved association. That association also survived the temporary CMS summary change in loop 5. The **Unsave** toggle remained pressed (`aria-pressed=true`); it was not clicked to remove the favorite. The separate persisted-record audit passed **17 of 17 checks** and confirmed it remained saved before the final reset. Final baseline verification then confirmed favorites were empty.

The fresh [native Search acceptance script](../examples/liberty-mutual-agent-portal/scripts/verify-resource-state-search.mjs) passed against source `b5e24aff-8b5b-4653-bf66-deef52c1241a` at approximately **02:32:43 UTC**:

| Native scope/query | Count |
| --- | ---: |
| All resources | 12 |
| Daniel's licensed scope | 11 |
| Maya's licensed scope | 12 |
| Florida plus nationwide | 10 |
| Nationwide only, without a text query | 9 |
| Daniel's scope plus State guidance facet | 2 |
| Daniel's scope plus Workers compensation query | 4 |

Native pagination, stable totals, unique result IDs, state OR filters, nationwide inclusion, empty-license handling, facet intersection and empty results passed. Query counts and unfiltered counts above are separate observations. The same complete script passed again at **03:03:48.873 UTC**, after restoration, with all counts unchanged. The exact summary-publication check is recorded in loop 5.

## Loop 3 — From opportunity to submission

On preview, Daniel selected Texas in **Products & appetite**, opened the small-business BOP guide, returned with Texas retained, and used **Prepare account** on Businessowners policy. Retail was selected explicitly. The form saved **October 15, 2026** as the requested effective date.

Submission **`SUB-D4C8FC72`** retained Texas, required all three checklist entries and reached **Submitted**. Reloading and reopening the record preserved its status and entered date. This verifies a custom preparation workflow with server-side checks and durable storage; it does not rate or bind insurance.

## Loop 4 — Different specialties, one portal

| Branch | Fresh browser result |
| --- | --- |
| Maya — personal lines | Opened Morgan household's Homeowners policy `pol-002`, saved a renewal follow-up due **September 18, 2026**, and verified it persisted under **Your priorities → All priorities**. It is a follow-up task, not an item in the Renewals-only filter. |
| Priya — commercial/specialty | Inspected Coastal Fabrication Group's Commercial property **Overview**, **Documents** and **Renewal review**, then the commercial and retail-specialty guides with Florida context. Her seeded book has no specialty policy; that portion used product guidance. |
| Marcus — surety | Created an Illinois **Contract performance** request for **$250,000**, saved and submitted **`BND-AD240CA2`**, then reloaded and confirmed Submitted status. |

The workflows preserved the intended specialty scope and saved state. Viewing a policy document does not establish real insurance-system document integration, and the bond request did not issue a bond or establish surety credit. No outbound client or underwriter message was sent.

## Loop 5 — Marketing owns the content

The Texas ResourcePage `/Home/resources/texas-workers-compensation`, item `b0467ff2-ef7d-5fd2-a452-98afde3be186`, was edited through native Content. Its original summary was:

> A source-linked overview for discussions with Texas employers.

New English draft version **2**, named **Presenter verification**, used this temporary summary:

> Use this source-linked overview to prepare your next conversation with a Texas employer.

From **Draft**, the native **Actions → Approve** command and its **Submit** dialog button moved the version to **Approved**. Submit was a dialog action, not a separate workflow state. **Publish Page** targeted the current English page with **Subpages** and **All references** off. At **02:34:05 UTC**, a read-only Authoring API snapshot confirmed version 2 was Approved. The field comparison found the summary was the only changed content field; standard version, revision, timestamp, lock and thumbnail metadata also changed.

At **02:35:43 UTC**, the authenticated live article's actual rendered summary and the native CMS metadata catalog both matched the temporary wording. Search still contained the original summary. This mismatch was retained as evidence rather than treated as successful Search propagation.

The native content source requires an explicit refresh after publication. **Content → Search Sources → Liberty Mutual Agent Resources → Reindex Content** was invoked for source `b5e24aff-8b5b-4653-bf66-deef52c1241a`. It showed Pending for several minutes. At **02:51:21 UTC**, the public native Search SDK returned the exact temporary summary, and the browser result was inspected. This follows [Sitecore's content-source workflow](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/search-experiences/manage-content-sources.html); no automatic publication-to-Search cadence was established. Internal CMS core/master index rebuilds were not used for this refresh.

Restoration used another new English draft, version **3**, named **Restored resource summary**, followed by the same approval and scoped publication. The read-only master snapshot at **02:53:33 UTC** confirmed it was Approved with the original wording. At **02:54:47 UTC**, a field comparison found all non-system content matched version 1, and the live article's rendered summary plus native metadata catalog both matched the original exactly. The reloaded Page Builder iframe also displayed the original summary and full article with version 3 marked **Live** and **Saved**. The same Search source was reindexed again at approximately **02:58 UTC**. Native Search returned the exact original summary at **03:03:04.469 UTC**, and the refreshed Search Sources UI showed **Succeeded**. The complete Search assertion script passed at **03:03:48.873 UTC**, with the original summary and all 12 resources intact. Version 2 remains in editorial history; version 3 is the restored live version.

Fresh workspace editor inspection showed the reusable `commercial-growth-neutral` AgentGuidance datasource used in three places, its eyebrow/headline/body/action-link fields and help text, and the **Default** and **Highlight** variants. The variant menu was inspected without changing the selection. Operational **Mark priority complete** controls were disabled in the actual editor canvas.

The observed workflow used the available implementation account. **Customer author/approver separation remains unverified.** This rehearsal does not establish that separate customer users can complete the approval round trip with the intended permissions.

## Loop 6 — Grow an agency relationship

Fresh native UI inspection confirmed the published **Liberty Mutual — Independent Agents** Brand Kit. The inspected kit/source displayed **13 pages and 13 chunks**; Tone of Voice was reviewed. **Channels → Liberty Mutual Agent Portal Dashboard → Localization → Configuration** showed English as the supported language and **Liberty Mutual — Independent Agents** in the Brand kit field, confirming the site assignment. No field was edited or saved.

The existing **Liberty Mutual — Expand your small-business practice** ABM space showed Completed, three connected stages and eight artifacts. The eighth artifact, **Cedar Ridge Insurance ABM — Final Reviewed Implementation Package**, was inspected in **Content, JSON and Preview**. It contained four persona payloads, the strict identified-provider/role contract with scalar boolean `true`, explicit neutral handling, and the distinction between existing telemetry and proposed campaign measurement.

**Native Brand Kit retrieval remains unverified.** The existing artifact reports retrieval as **UNAVAILABLE** and uses the supplied brand excerpt. Its Completed status and title do not establish successful retrieval, customer approval or live CRM enrichment. No new agent generation, audience activation, publication or outbound delivery was initiated in this loop. The [capability ledger](agentic-studio/capability-ledger.md) retains the earlier artifact history and this implementation boundary.

## Loop 7 — Beneath the implementation

In a fresh preview browser exercise, Avery created the Florida Draft **`SUB-7BB13767`**. Jordan then opened the same agency record: Florida remained visible, the license explanation appeared, and Edit, checklist and Submit controls were disabled. This was a Draft-specific UI check, separate from the API harness's subsequently submitted Florida case.

The deployed [state-eligibility helper](../examples/liberty-mutual-agent-portal/scripts/verify-state-eligibility.mjs) passed **4 production checks** without successful transactional writes and **10 preview checks** on pack `04`. It verified unauthorized creation, completion, submission and state relabeling; retained-owner eligibility; and unchanged saved records/versions after denials. Avery's eligible checklist and submission path succeeded. All harness logins were logged out. Its preview cases were:

- Avery/Florida: `sub-5fc72e46-c1d2-4f3e-88f9-2248a21b6414`, Submitted after the positive path.
- Jordan/Texas: `sub-ea0412ac-7d69-4d2b-8cc0-4686c786cc2f`, Draft.

Independent engineering inspection confirmed the [contracts](../examples/liberty-mutual-agent-portal/src/contracts/portal.ts), [eligibility decisions](../examples/liberty-mutual-agent-portal/src/domain/eligibility.ts), [server enforcement](../examples/liberty-mutual-agent-portal/src/server/data/portal.ts) and [durable store](../examples/liberty-mutual-agent-portal/src/server/state/store.ts). Current UTC authority, actor/assigned-owner checks, agency/producer carrier appointments, state-specific requirements, idempotency and atomic version checks are explicit boundaries. UDL profiles select guidance and cannot grant these permissions.

Fresh local testing on Node.js **24.19.0** passed **80 tests, with no failures or skips**. The latest main [CI run 34547449710](https://github.com/tohams/liberty-mutual-sitecoreai/actions/runs/34547449710) passed Offline validation and Connected production build against the release SHA, including lint, type checking, content/identity contracts, owned serialization, SDK generation and production compilation. GitHub Production deployment `6383959773` and its Vercel status reported success for that SHA.

Unauthenticated checks on both hosts returned login `200`, workspace redirect `307`, bootstrap `401`, and a redirect for a fabricated `sc_mode=edit` query. Local editor-isolation tests passed: editor data has no operational identity or write path. These code/HTTP checks complement the native editor inspection; they are not a replacement for customer-role acceptance.

## Final restoration and reset gate

All eight final **saved-work** resets for packs `01`–`04` on production and preview returned success between **02:59:34.819 and 02:59:35.652 UTC**. All run IDs changed and native profile generation remained `0`. The production browser was signed out and the operational preview test tab closed before reset; no subsequent operational writes were performed.

The final baseline verifier ran from **02:59:53 to 03:00:19 UTC** and passed **56 of 56 environment/account combinations, with 1,656 assertions and no failures**. Saved work matched the fixture baseline at version `0`; favorites and learning registrations were empty. All eight scopes remained isolated, source fixtures were unchanged, and native identity fingerprints matched the initial baseline with generation `0` retained. Every verifier session was logged out and anonymous bootstrap access was denied.

The reset removed the rehearsal records from active operational runs; the record references in this file and the older PR #14 evidence are historical. It did not erase native events or restore CMS copy. CMS restoration was checked separately in loop 5.

CMS restoration, the native Search reindex/result, operational reset checks and fresh Brand Kit site-assignment inspection are complete. Customer role separation and native Brand Kit retrieval remain explicit unverified capability boundaries after cleanup.

## Audit provenance

The operator workspace retains raw evidence outside Git under `audits/`: initial and final reset JSON; initial and final 56-account baseline JSON; `loop-persisted-records-2026-09-11.json`; production/preview native-personalization logs; `loop-seven-state-eligibility-2026-09-11.json`; the 80-test log and engineering evidence; native Search totals; Texas v1/v2/v3 Authoring API snapshots, content-field comparisons, live propagation checks and timestamped Search observations. Final results are retained in `seven-loops-final-reset-2026-09-11.json`, `operational-baseline-final-2026-09-11T03-00-19-851Z.json` and `loop-5-texas-final-restoration-search-2026-09-11.json`. Browser findings above were recorded by the implementation owner during this rehearsal. Secrets, cookies and operator credentials are not included in this document.
