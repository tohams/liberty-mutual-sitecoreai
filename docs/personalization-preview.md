# Personalization Preview

Personalization Preview is a separate private Page Builder app for inspecting the variants already configured on an Agent Portal page. Audience Preview continues to evaluate its prepared synthetic audiences independently.

## Using the app

1. Open an Agent Portal page in Page Builder, and choose **Apps → Personalization Preview**.
2. Connect the same Sitecore account if the existing Sitecore session cannot connect automatically.
3. Choose **Default** or an existing variant under each personalization name.
4. Select **Preview page**, and then **Open preview** to inspect the current draft.
5. Select **Refresh choices** after changing the page's personalization configuration.

The app reads native flow definitions and maps their outcomes to verified native preview variant IDs. It does not interpret custom JavaScript, create CDP profiles, change rules, or publish content. Selecting an outcome previews its presentation; use Sitecore's condition testing to verify visitor eligibility. A changed configuration invalidates an earlier selection, so the app asks the author to select from the latest choices.

## Installation and isolation

The private App Studio registration is **Personalization Preview**, with the **Page context panel** extension point. Its deployment URL is `/apps/personalization-preview` on the Agent Portal editing host. It uses SitecoreAI API access, a separate regular-web-app sign-in credential, and pop-up permission for connection and preview windows. Install it only in the intended SitecoreAI environment.

Configure these server-only settings independently of Audience Preview:

- `PERSONALIZATION_PREVIEW_AUTH0_CLIENT_ID`
- `PERSONALIZATION_PREVIEW_AUTH0_CLIENT_SECRET`
- `PERSONALIZATION_PREVIEW_AUTH0_SECRET` — a separate 32-byte hexadecimal session key.
- `PERSONALIZATION_PREVIEW_APP_BASE_URL` — the HTTPS origin that hosts the new routes.
- `PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID`
- `PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID` — the new installed app's `application.context.resourceAccess` → `xmcloud` → `context.preview` value.
- `PERSONALIZATION_PREVIEW_EDGE_CONTEXT_ID` — optional CMS Preview content context override; otherwise the normal CMS Preview context is used.

Use `NEXT_PUBLIC_PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID` only for the public app identifier. No credential belongs in a public environment variable.

The app has its own authentication cookie, callback paths, API routes, rate-limit namespace, and short-lived actor-bound preview tokens. Each preview rechecks the author's page/version access and validates the selections against the current native configuration. Its read-only rendering reuses the existing native component-receipt composition without changing Audience Preview's behavior or stored scenarios.
