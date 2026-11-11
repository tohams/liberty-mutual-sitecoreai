# Personalization Preview

Personalization Preview is a private Page Builder app for inspecting the content variants already configured on an Agent Portal page.

## Using the app

1. Open an Agent Portal page in Page Builder, and choose **Apps → Personalization Preview**.
2. Connect the same Sitecore account if the existing Sitecore session cannot connect automatically.
3. Choose **Default** or an existing content variant under each component or personalization name.
4. Select **Preview page** to open the current draft in a new tab. A loading view appears while the selected variants are prepared, and the preview opens automatically. If the browser blocks the tab, use the **Open preview** recovery button.
5. Select **Refresh choices** after changing the page's personalization configuration.

The app maps native configuration to verified native preview variant IDs. When decision-table metadata is available, it uses that metadata. Otherwise, it reads the selected page's authorized native variant configuration and labels the choices using the actual component and content-variant names. Content-variant names describe the selected content, rather than the conditions that make a visitor eligible for it.

The app does not interpret custom JavaScript, create CDP profiles, change rules, or publish content. Selecting an outcome previews its presentation; use Sitecore's condition testing to verify visitor eligibility. A changed configuration invalidates an earlier selection, so the app asks the author to select from the latest choices.

## Installation and isolation

The private App Studio registration is **Personalization Preview**, with the **Page context panel** extension point. Its deployment URL is `/apps/personalization-preview` on the Agent Portal editing host. It uses SitecoreAI API access, a separate regular-web-app sign-in credential, and pop-up permission for connection and preview windows. Install it only in the intended SitecoreAI environment.

Configure these server-only settings:

- `PERSONALIZATION_PREVIEW_AUTH0_CLIENT_ID`
- `PERSONALIZATION_PREVIEW_AUTH0_CLIENT_SECRET`
- `PERSONALIZATION_PREVIEW_AUTH0_SECRET` — a separate 32-byte hexadecimal session key.
- `PERSONALIZATION_PREVIEW_APP_BASE_URL` — the HTTPS origin that hosts the app.
- `PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID`
- `PERSONALIZATION_PREVIEW_MARKETPLACE_TENANT_ID` — this app's installed Marketplace tenant, shown in its Page Builder iframe URL; this is separate from the CMS tenant.
- `PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID` — the new installed app's `application.context.resourceAccess` → `xmcloud` → `context.preview` value.
- `PERSONALIZATION_PREVIEW_EDGE_CONTEXT_ID` — optional CMS Preview content context override; otherwise the normal CMS Preview context is used.

Use `NEXT_PUBLIC_PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID` only for the public app identifier. No credential belongs in a public environment variable.

The app has its own authentication cookie, callback paths, API routes, rate-limit namespace, and short-lived actor-bound preview tokens. Each preview rechecks the author's page/version access and validates the selections against the current native configuration. Its read-only rendering composes verified native component receipts for the selected page and version.

## Performance checks

Browser User Timing measures record catalog loading (`personalization-preview-catalog`) and preparation (`personalization-preview-prepare`), including response parsing. API `Server-Timing` headers identify the authentication, page authorization, catalog, native rendering, and token stages. These measurements contain durations only.

The preview document marks `personalization-preview-rendered` after hydration, font readiness, and two animation frames. Its `data-personalization-preview-rendered-ms` attribute measures navigation to that point. Check visible images separately; this marker does not imply that every image has loaded. Compare first-use and repeat runs using current page configuration, and verify the rendered content against the selected outcomes.

### Verified on November 11, 2026

Twenty production-browser runs passed across Home, Products & appetite, and the personalized agency-growth landing page. The reproducible matrix used seed `20261111`, covered 17 distinct selections, and included three paired repeats. It checked the expected visible headings, agency-card introductions and ordering, absence of unselected content, and loaded images in the viewport. Every measured preview remained in a visible tab.

| Measurement | Median | Observed maximum |
| --- | ---: | ---: |
| Load current choices | 0.89 s | 3.55 s |
| Prepare selected preview | 0.92 s | 1.63 s |
| Open preview to hydrated rendering | 1.17 s | 2.55 s |

The three paired repeat runs rendered in 1.13–1.16 seconds. The two slower choice loads were dominated by Sitecore page authorization and metadata reads. These are observed single-user results, rather than a load test or latency guarantee. Preparation and navigation were measured separately; the measurements exclude manual pauses between them. The current interface launches the preview directly from **Preview page**.

Browser verification was accompanied by source tests, lint and TypeScript checks, a production build, and the browser-bundle credential check. The app tests did not change content, targeting rules, or agent profiles.
