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

This confirms the browser journey reached the intended imported native profile and that the Search event contract was accepted. Profiles intentionally omit personal-name fields; identity uses the provider's opaque identifier and verified attributes. No customer name, policy number or account free text is required for this association. This evidence does not by itself prove a positive and negative native personalization rule test or complete persona-switch isolation.

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
