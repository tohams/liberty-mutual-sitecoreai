# Liberty Mutual public website

An independent Next.js rendering host for `liberty-mutual-public-site`, derived from the official Sitecore Content SDK `basic-nextjs` example in this repository. It shares the SitecoreAI environment with the Agent Portal and has its own site identity, rendering host, URL, and public content tree.

## Run locally

Use Node.js 24, and run application commands from `examples/liberty-mutual-public-site`:

```sh
npm ci
cp .env.example .env.local
# Populate Preview, Live, and browser Edge contexts plus the editing secret from the Deploy app.
npm run dev
```

For a secure local editing host, use `npm run dev:https`. Signed Page Builder editing uses the environment's Preview context. Ordinary pages, metadata, sitemaps, and public APIs use the explicit Live context in every deployment, including Preview hosts. The browser uses the Live public context for Search and consent-based measurement. The site name remains `liberty-mutual-public-site` throughout. Never commit `.env.local`.

For a production build and local production server:

```sh
npm run build
npm run start
```

## Content and components

All page composition comes from Sitecore layout data. The SDK's generated maps register the rendering components, and `PublicPageBody` exposes the governed hero and content placeholders. Native SDK fields preserve Page Builder's editing metadata.

- Hero, Article, Image, CTA, selector, section, split-content, and FAQ datasources belong in each page's local `Data` folder. Ordered Cards, Questions, and Links are native items selected with local Multilist fields.
- Home and Bundling deliberately share the Promotion in `Data/Promotions/Bundle and save`. Its `Default` and `Compact` rendering variants present the same content differently.
- The public-owned Disclosure is intentionally shared with the Agent Portal by native datasource reference.
- Header and Footer belong to the shared partial design. Their native fields supply the navigation and branding.

The component folders describe their responsibility: `public-hero`, `public-product-selector`, `public-section`, `public-split-content`, `public-faq`, and `public-breadcrumbs` compose the consumer experience. Variants select presentations such as `QuoteIntro`, `Quote`, `ProofCards`, `TextColumns`, and `ImageRightSoft`. The same page structure renders every native route through the catch-all page; adding an authored page does not require a new Next.js route file.

The selector carries validated product and ZIP context to the internal quote or agent page. That page presents the selected context before linking to the real external entry point. It does not calculate a premium or make an eligibility decision. General Link values remain native fields: internal links store the path, query string, and anchor separately so the SDK can render them correctly.

Native content and rendering IDs are documented in the repository's `authoring/items/liberty-mutual-public/public-contract.json`. Use native Page Builder and workflow for ordinary content changes. See [publication and Search synchronization](src/features/publication/README.md) for the publish-complete webhook, Live read API, Search source, and receipt contract.

`npm run sitecore-tools:generate-map` and `npm run sitecore-tools:build` generate SDK files. Do not hand-edit `.sitecore` output. CMS definitions, authored content, and frontend deployments have separate release paths; a normal frontend deployment does not reset content.

## Verify

```sh
npm run lint
npm run type-check
npm run build
npm run test:analytics
npm run test:journey
npm run test:structured-data
npm run test:publication
npm run test:health
```

Source asset provenance is recorded in `asset-sources.json`. The website's selected public imagery and logo are the public Liberty Mutual website's assets; no customer RFP material or real policy data is included in this application.

Analytics respects the visitor's choice. The supported SDK sends native page-view and Search interactions after analytics consent. CTA selections and the four scroll milestones are distinct custom events available in SitecoreAI's Events dashboard. Editing and preview sessions do not produce visitor measurements. No application-generated dashboard counters substitute for Sitecore's received data.

## Daily service health check

The production Vercel Cron calls `/api/sitecore/health` once per day using the `CRON_SECRET` bearer token. The route verifies that the existing private Redis service can write and read its isolated diagnostic key. This key expires after two days; it does not change the lifetime of saved portal work. The route emits no visitor analytics or Sitecore events.

Configure `KV_REST_API_URL`, `KV_REST_API_TOKEN`, and `CRON_SECRET` as private server environment variables. The handler accepts only HTTPS Upstash endpoints and rejects redirects. Missing authorization returns 401; missing configuration or a failed round trip returns a generic 503. The schedule is `0 12 * * *`, in UTC, and the daily timing is subject to Vercel's Hobby schedule behavior.

Run `npm run test:health` to verify authorization, configuration validation, failures, and the isolated expiring-key round trip. The regular production build also scans emitted browser assets for configured private values; it fails without displaying those values if a leak or incomplete scan is detected.
