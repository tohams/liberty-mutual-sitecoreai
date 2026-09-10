# Connected portal QA evidence — September 10, 2026

The deployed portal passed the browser journeys below, and the native Unified Data Layer profile contains the corresponding page and Search events. These observations establish working delivery, authenticated operational state, native content retrieval and event ingestion. They do not replace customer-role Page builder acceptance or a complete security assessment.

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

The remaining editor acceptance is a real customer-role Page builder/Design Library round trip: select a datasource, edit populated and empty fields, preview standalone Search, switch a variant, apply supported styles and publish approved content. Native personalization, persona switching and workflow approval also need their own positive/negative acceptance evidence. The readonly context correction is a tested code change, not a claim that this customer-role browser exercise has already passed.

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

The connected run makes one signed-out workspace check, then uses a fresh in-memory cookie jar for each of Avery (principal), Jordan (producer), Maya (account manager), and Elena (outside the campaign). It submits each fixture login with the same-origin header and verifies an HttpOnly session cookie (also Secure on HTTPS). It obtains the verified `udlIdentity` exclusively from authenticated bootstrap, creates a fresh native browser through the public Events endpoint, and keeps the returned `sc_cid` cookie only in that jar. The script follows the pinned SDK IDENTITY payload and reuses login's readiness helper: read the fresh browser's baseline profile, submit one IDENTITY event, then observe browser/show until its profile reference changes. Baseline read, identity receipt and bounded polling share a two-second deadline. Browser creation and IDENTITY must each return `201`; unavailable readiness fails acceptance.

After readiness, it requests `/workspace` twice with a normal browser user agent. It still makes both observations if native readiness failed, so the neutral fallback remains visible in the report. Each response must contain exactly one rendered `h2` inside the `aside` labelled “Agent guidance”, matching the appropriate headline read from the four serialized `commercial-growth-*` guidance seeds. `firstMatched` and `secondMatched` are strict independent assertions: a correct second response never erases a first-response failure. There are no decision retries or wait-and-refresh recovery steps. The only polling observes the browser/profile link before navigation; it does not call personalization decisions repeatedly.

The assertion scans actual HTML elements, excluding scripts and React payloads, comments, templates, explicit hidden/ARIA-hidden trees, inline-hidden elements and React's hidden streaming containers. This is server-rendered markup evidence, not a computed-style or hydrated browser assertion. The script reproduces the browser identity sequence through public endpoints; it does not execute browser JavaScript or prove other browser analytics ingestion. Native decision execution occurs through the deployed server's authenticated personalization integration using the linked browser cookie. No profile administration API is called and no identifier is guessed or derived from fixture names.

Each persona signs out in a `finally` block, followed by an anonymous workspace redirect assertion using that same jar; cookies are then discarded. Only persona labels, step names, HTTP statuses, timings and pass/fail results are printed. Failures produce a nonzero exit code; response bodies, tokens, headers, identifiers and detailed errors are suppressed. The script makes no saved-work mutations, resets, profile imports, outbound messages or email calls. It creates normal browser/identity events and server decision telemetry. A fully exercised run has **37 assertions**. Record the deployment, selected pack and actual results separately; adding this harness is not evidence that a connected run has passed.
