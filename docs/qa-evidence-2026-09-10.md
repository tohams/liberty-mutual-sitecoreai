# Connected portal QA evidence — September 10, 2026

The deployed portal passed the browser journeys below, and the native Unified Data Layer profile contains the corresponding page and Search events. These observations establish working delivery, authenticated operational state, native content retrieval and event ingestion. They do not replace customer-role Page builder acceptance or a complete security assessment.

**Current handoff status, 21:28 UTC: blocked.** After the required SitecoreAI redeployment, the managed CM hostname stopped resolving and post-deployment connected acceptance failed. Earlier passing results below are historical; see [Master Context ID retirement](#master-context-id-retirement) for the current recovery evidence.

| Review context | Value |
| --- | --- |
| Application | `https://liberty-mutual-agent-portal.vercel.app` |
| Initial browser-tested deployment | `1231528`, reported by the release coordinator |
| Sitecore organization | Safeco Insurance Company of America POC |
| Site | `liberty-mutual-agent-portal` |
| Production persona | Avery Brooks, `avery.03`, reviewer pack `03` |
| Browser viewports | 1280 × 720 and 390 × 844 |
| Evidence methods | Browser UI/accessibility inspection, native tenant record inspection, targeted unauthenticated HTTP probes, automated tests |

## Browser acceptance

| Journey | Observed result |
| --- | --- |
| HTTPS login | Opened Avery's workspace with Cedar Ridge Insurance data, principal scope, Texas context and native CMS guidance. |
| Native Search | Loaded 12 authored resources, six per page, with five populated native facets. “Workers compensation” returned five matches; selecting Texas narrowed the result to its authored state guide. |
| Search recovery | Clearing filters restored the broader result set. An unmatched phrase showed an empty state; “Explore all resources” restored the full catalog. Pagination moved between both result pages and returned focus to the result summary. These recovery checks were run against the same connected local application before deployment. |
| Saved native resource | Saving the Texas guide changed its pressed state and saved count. The native article opened correctly, and the saved state survived a full production reload. |
| Native article | Rendered authored title, summary, rich text, source links and the formatted September 10, 2026 review date. |
| Mobile | Workspace, client record cards, Search and article layouts fit a 390px viewport. The mobile menu exposed navigation while making the page content inert, then closed after navigation. |
| Logout | Returned to login. A fresh direct request for `/workspace` also returned to login. |

Additional connected local checks in pack `01` exercised the commercial submission path through draft save, preparation requirements and submission, then confirmed persistence after reload. A policy renewal follow-up saved successfully. Learning registration showed an accessible success message inside its modal. Native resource and product links resolve to the serialized CMS route inventory.

Production QA changed only the Texas guide favorite in pack `03`. Local pack `01` contains QA submission/follow-up/learning activity. Use the documented operator reset if a clean walkthrough is required; no native history was erased. The temporary local QA route was removed, the production session was signed out, and the browser viewport was restored.

## Native Unified Data Layer verification

Native tenant inspection resolved Avery's imported pack `03` profile to `477f6b6f-673b-42e3-83ab-1bf0a8aa0ed2`. Its extensions correctly identify reviewer pack `03`, state `TX` and role `principal`. At inspection it contained **12 events in one session**.

The native timeline includes page views for `/workspace`, `/resources` and the Texas resource article. A Search click event contains:

```json
{
  "interactionType": "clicked",
  "keyword": "Workers compensation",
  "componentId": "dab6066f-44f8-59ef-b7a5-e79550a291fb",
  "nullResults": false
}
```

This confirms the browser journey reached the intended imported native profile and that the Search event contract was accepted. Browser identity events use the provider's opaque identifier and do not send personal-name fields. The imported fixture profiles contain fictional first and last names, including Avery Brooks. No customer name, policy number or account free text is required for this association. This evidence does not by itself prove a positive and negative native personalization rule test or complete persona-switch isolation.

## Editing and access-boundary review

Source review confirms the SDK editing render handler checks the editing secret before enabling Next.js Draft Mode. The server page checks actual `draftMode().isEnabled`; a raw cookie name is only a proxy routing hint. Normal rendering requires a verified portal session, while valid editing uses `getEditorBootstrap()` without reading or writing a reviewer's durable workspace. That snapshot has no UDL identity. Normal Page builder actions and tracking are disabled.

The review corrected a Design Library-specific context gap: standalone component previews now receive `PortalEditorProvider`, which requires the isolated editor snapshot, disables actions and supplies no operational write path. It rejects an operational run or tracking identity. Editor profile controls also cannot sign out a separate agent session. These changes are covered by the new editor-context regression tests and must be included in the release following the initial browser-tested commit.

Targeted production HTTP checks on September 10 returned:

| Unauthenticated request | Result |
| --- | --- |
| `/workspace` | `307` to `/login` |
| `/workspace?sc_mode=edit` with fabricated editing data | `307` to `/login` |
| `/workspace` with a fabricated `__prerender_bypass` cookie | `307` to `/login` |
| Bootstrap with fabricated draft or session cookies | `401 UNAUTHENTICATED`, private/no-store |
| Mutation request with fabricated draft cookie and valid same-origin header | `401 UNAUTHENTICATED`, private/no-store |
| Editing render request with an invalid secret | `401` |

Operational APIs independently require a signed portal session. Mutations also check same origin, agency/line scope, active run, state version and idempotency. Operator reset uses a separate server secret. Keep Sitecore editing debug logs disabled because the upstream SDK debug path can print secret comparisons.

## Verification and remaining acceptance

The full application typecheck passed. Frontend lint and four CMS-route/editor-context regression tests passed. Backend and release-build evidence is maintained in the [implementation review](implementation-review.md) and [developer handoff](developer-handoff.md).

The remaining editor acceptance is a real customer-role Page builder/Design Library round trip: select a datasource, edit populated and empty fields, preview standalone Search, switch a variant, apply supported styles and publish approved content through the customer's approval workflow. Native personalization and switching between signed-in agent profiles have passed the separate checks below and the [production release acceptance](https://github.com/tohams/liberty-mutual-sitecoreai/pull/9). Those results and the administrator editor checks do not establish that the customer-role browser exercise has passed.

### Release verification of native identity correction

Preview commit `6af2a96bd9680bba0611d44eef5e454428b93475`, Vercel deployment `HwjwK6KJQYowDc25sJyXG44Hw3Lc`, passed all GitHub checks in run `34522185094`: 50 application tests, ESLint, full TypeScript, connected production build, content contracts and both serialization modules. The connected build checked 24 emitted browser assets and found no configured private context value in them. Vercel also completed its build, including the new postbuild private-value check.

Actual hydrated-browser sign-in then selected the expected guidance on the first workspace load for all four pack `04` accounts, with no refresh: principal for Avery, producer for Jordan, account manager for Maya, and neutral for Elena. Each account was signed out before the next; Elena's workspace showed her own agency records. No saved work was changed. Reloading the native Page Builder canvas on this deployment rendered the portal with neutral guidance and disabled operational mutation controls. Selecting the guidance headline exposed its native Headline editing control. This was an administrator check, not a customer-role approval test.

The first strict HTTP acceptance attempt on this preview did **not** pass. At the original two-second profile-link budget, Avery, Maya and Elena reached the 2,001 ms readiness deadline. Avery's first and second workspace responses remained neutral. Jordan linked in 1,103 ms and received the producer variant twice; Maya's two subsequent responses selected account-manager guidance; Elena's two responses remained correctly neutral. All native create and IDENTITY requests returned `201`. The result was five failed assertions, retained as failed evidence.

A separate `--measure-link` diagnostic made no workspace or personalization decision requests. It observed fresh native profile links after 416 ms for Avery, 377 ms for Jordan, 398 ms for Maya, and 791 ms for Elena, measured from the accepted IDENTITY receipt. Including baseline and receipt, those measurements were 737, 565, 581 and 1,023 ms. No cache-control, age or x-cache headers were returned; their absence does not establish whether an intermediary cached a response. This establishes variable asynchronous linkage, not a replacement acceptance pass.

The subsequent release widens the bounded native-link allowance to six seconds inside an eight-second optional sign-in preparation budget, returning as soon as linking completes. Ordinary identity tracking remains capped at two seconds; server decision and discovery budgets remain two seconds and 1.5 seconds respectively. Its final deployed acceptance must be recorded separately; these earlier observations do not certify that later build.

### Passing preview release

Commit `a95366be68fa98bbe9975e6a4c2e9836f248c3e9`, preview deployment `GLHMpKboMpu6h9PKmHeLDS2NJYPS`, passed all 37 connected acceptance assertions with reviewer pack `04`. Avery, Jordan and Maya received their correct native role variant on both independent workspace requests; Elena received neutral guidance twice. Every native browser-create and identity receipt returned `201`, and every logout restored the anonymous redirect. No decision was retried and no saved-work reset was performed.

| Persona | Native profile readiness | First workspace | Second workspace |
| --- | --- | --- | --- |
| Avery | 822 ms | Principal, 1,735 ms | Principal, 591 ms |
| Jordan | 2,876 ms | Producer, 873 ms | Producer, 593 ms |
| Maya | 2,242 ms | Account manager, 625 ms | Account manager, 523 ms |
| Elena | 805 ms | Neutral, 864 ms | Neutral, 515 ms |

GitHub run `34522939424` passed Offline validation and Connected production build. Temporary `PORTAL_PERSONALIZATION_DIAGNOSTICS` was set to `false` for both Vercel Production and Preview before this deployment. Production verification is recorded in the [release pull request](https://github.com/tohams/liberty-mutual-sitecoreai/pull/9) after promotion; customer-role editorial approval remains a separate handoff check.

### Master Context ID retirement

The owner confirmed that the SitecoreAI `Demo` environment is used exclusively for this POC. At **20:55 UTC on September 10, 2026**, native master regeneration succeeded and replaced both the Live and Preview master Context IDs.

| Check after regeneration | Observed result |
| --- | --- |
| Content requests with the original Live and Preview masters | Both returned `404`. |
| Content requests with the existing scoped Live and Preview contexts | Both returned `200` with native Home content. |
| Private Edge content request with the public browser context | Returned `403`, as expected for its browser-only scope. |
| Existing three scoped child values | Unchanged; no Vercel or GitHub value changes were needed. |
| Local environment configuration | Nine ignored files migrated from old master values to the appropriate server child or public browser scope according to each key; permissions set to `0600`. No credential values entered Git. |

SitecoreAI [Build and deploy `6XUSEOqPB2caaZlw99oWFl`](https://deploy.sitecorecloud.io/projects/7f0TVOCnwZyTYy9vJwhC8/cm-environments/4Ng6xXzEpoWJNPisksPG2y/deployments/6XUSEOqPB2caaZlw99oWFl?organization=org_XqL3u1MSNVuubOTb) completed in **16 minutes 31 seconds**, but its post actions failed: `warmUpCM` failed for all three configured URLs, and `populateSchema` and `reindex` failed immediately. The unchanged CM hostname returned HTTP `530` with a Cloudflare error `1000` HTML page. Native Page builder displayed “Cannot connect to tenant.” Environment Details retained the replacement master IDs and the same CM hostname; new application logs reported Sitecore startup at 21:12:43 UTC. Application startup alone does not establish that the managed hostname is reachable.

One standard **Restart environment** was requested around 21:19 UTC; the native UI confirmed initiation. Subsequent CM requests failed DNS resolution. Resolver `1.1.1.1` returned `NXDOMAIN` at 21:23 UTC. An authoritative recheck against `itzel.ns.cloudflare.com` at **21:28 UTC** also returned `NXDOMAIN`, with the authoritative-answer flag and zero answers. Restart initiation is not evidence of completed recovery. Cloudflare documents the preceding error `1000` as a DNS, proxy or origin-routing problem; the exact cause in this Sitecore-managed environment has not been established. [Cloudflare error reference](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1000/)

The post-deployment strict production harness recorded **six failed assertions**. Native browser creation for Avery and Jordan exceeded its two-second deadline; each account then received neutral guidance on both workspace requests instead of its expected role variant. Some subsequent identity steps for those accounts were skipped. Maya and Elena completed their expected outcomes. The run failed; the earlier complete 37-assertion pass remains historical evidence only. The relationship between these timeouts and the CM outage has not been established.

A subsequent read-only `verify-edge-content.cjs` run passed for all **27 native Live Edge routes**, including page compositions, editable fields, Search configuration and resource template projection. The portal sign-in page returned `200`. Deploy's System status screen reported every listed service Healthy at approximately 21:31, including Pages, Provisioning, Edge Proxy and Cloudflare. That aggregate status did not establish this environment's authoring availability.

**Handoff remains blocked** pending managed CM DNS restoration, scoped Preview and native editor recovery, and a fresh connected acceptance run. A support request was prepared locally as `sitecore-support-request-2026-09-10.md`; it has not been sent because outbound submission has not been authorized. The scope checks before deployment do not establish post-deployment Preview availability.

This was master-only Context ID regeneration. The unchanged scoped children are an empirical result for this environment, not a promise that children survive all rotations. Sitecore's separate [full secret rotation procedure](https://doc.sitecore.com/sai/en/developers/sitecoreai/deploying-sitecoreai/deploy-app/manage-an-environment/rotate-deploy-secrets-for-your-environments.html) changes the editing secret and underlying Edge token as well, and requires updating scoped contexts.

### Repeatable native personalization acceptance

From `examples/liberty-mutual-agent-portal`, use Node 24 to run the opt-in server-rendering acceptance script after the intended deployment is ready. Running it without arguments only displays help and makes no network requests. The reviewer pack and public browser Context ID are required; neither has a default. The script reads the existing private `fixtures/portal-logins.json` and never prints its credentials or session cookies. The already-installed `tsx` loader imports the same TypeScript profile-link readiness helper used by the login screen; no new dependency is needed.

```sh
node --import tsx scripts/verify-native-personalization.mjs --self-test
node --import tsx scripts/verify-native-personalization.mjs \
  --origin https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app \
  --pack 04 \
  --public-context '<reviewed-public-browser-context-id>'
```

The only allowed remote origins are the stable preview URL above and `https://liberty-mutual-agent-portal.vercel.app`, both over HTTPS. An explicitly selected local instance is also supported with `--origin http://localhost:3000 --pack 04 --public-context '<reviewed-public-browser-context-id>' --allow-localhost`. This remains a connected native test even when the portal itself is local. Before running, the operator must verify that the supplied public browser scope matches the compiled deployment's `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID`. The script accepts only the reviewed public context in its explicit allowlist; updating that allowlist requires reviewing the replacement public scope and deployment configuration. **Never supply a Live or Preview master Context ID.** No `.env` files, operator secrets, master Sitecore credentials or deployment-protection bypass credentials are loaded. A deployment that redirects to Vercel authentication fails this check.

The connected run makes one signed-out workspace check, then uses a fresh in-memory cookie jar for each of Avery (principal), Jordan (producer), Maya (account manager), and Elena (outside the campaign). It submits each fixture login with the same-origin header and verifies an HttpOnly session cookie (also Secure on HTTPS). It obtains the verified `udlIdentity` exclusively from authenticated bootstrap, creates a fresh native browser through the public Events endpoint, and keeps the returned `sc_cid` cookie only in that jar. The script follows the pinned SDK IDENTITY payload and reuses login's readiness helper: read the fresh browser's baseline profile, submit one IDENTITY event, then observe browser/show until its profile reference changes. Baseline read, identity receipt and bounded polling share a six-second maximum, stopping as soon as linkage is observed. Browser creation and IDENTITY must each return `201`; unavailable readiness fails acceptance.

After readiness, it requests `/workspace` twice with a normal browser user agent. It still makes both observations if native readiness failed, so the neutral fallback remains visible in the report. Each response must contain exactly one rendered `h2` inside the `aside` labelled “Agent guidance”, matching the appropriate headline read from the four serialized `commercial-growth-*` guidance seeds. `firstMatched` and `secondMatched` are strict independent assertions: a correct second response never erases a first-response failure. There are no decision retries or wait-and-refresh recovery steps. The only polling observes the browser/profile link before navigation; it does not call personalization decisions repeatedly.

The assertion scans actual HTML elements, excluding scripts and React payloads, comments, templates, explicit hidden/ARIA-hidden trees, inline-hidden elements and React's hidden streaming containers. This is server-rendered markup evidence, not a computed-style or hydrated browser assertion. The script reproduces the browser identity sequence through public endpoints; it does not execute browser JavaScript or prove other browser analytics ingestion. Native decision execution occurs through the deployed server's authenticated personalization integration using the linked browser cookie. No profile administration API is called and no identifier is guessed or derived from fixture names.

Each persona signs out in a `finally` block, followed by an anonymous workspace redirect assertion using that same jar; cookies are then discarded. Only persona labels, step names, HTTP statuses, timings and pass/fail results are printed. Failures produce a nonzero exit code; response bodies, tokens, headers, identifiers and detailed errors are suppressed. The script makes no saved-work mutations, resets, profile imports, outbound messages or email calls. It creates normal browser/identity events and server decision telemetry. A fully exercised run has **37 assertions**. Record the deployment, selected pack and actual results separately; adding this harness is not evidence that a connected run has passed.

For separate link-only measurement, add `--measure-link` to the same command. This diagnostic observes fresh native profile linkage for at most ten seconds and makes no workspace or decision requests. It reports timings and only the allowlisted `cache-control`, `age` and `x-cache` response metadata, if present. Missing caching headers do not establish whether an intermediary cached a response. Diagnostic completion is not a strict acceptance pass. The HTTP harness reuses the profile-link helper, while the full eight-second browser preparation and old in-page SDK concurrency have separate local tests and browser acceptance.
