# Published answers and Search synchronization

This integration reads **only Live Experience Edge**. Sitecore is the content system of record. Approved answers remain authored, reviewed, and published in SitecoreAI; the public API and Search index are downstream experiences of that same content.

## Server configuration

| Variable                                                     | Purpose                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `SITECORE_LIVE_EDGE_CONTEXT_ID`                              | Dedicated server Live content context. Required; never substituted with a Preview or browser context.                          |
| `PUBLIC_SITE_URL`                                            | Canonical HTTPS public-site origin. `NEXT_PUBLIC_SITE_URL` is accepted as an alternative.                                      |
| `PUBLICATION_WEBHOOK_SECRET`                                 | Dedicated random Bearer credential, at least 24 characters.                                                                    |
| `SITECORE_SEARCH_INGESTION_URL`                              | The tenant's Search Ingestion Service API base URL.                                                                            |
| `SITECORE_SEARCH_SOURCE_ID`                                  | Published Push source configuration ID.                                                                                        |
| `SITECORE_SEARCH_PUSH_API_KEY`                               | Server-only Push API credential.                                                                                               |
| `PUBLICATION_REDIS_REST_URL`, `PUBLICATION_REDIS_REST_TOKEN` | Durable lease, publication manifest, and receipt storage. Existing `KV_REST_API_URL` and `KV_REST_API_TOKEN` are alternatives. |

These credentials belong in the host's environment settings. Do not place them in browser variables or source files. A missing dependency fails explicitly; there is no in-memory production fallback.

## Webhooks

Configure an Experience Edge **OnEnd** webhook with POST destination `/api/sitecore/publication`, `Content-Type: application/json`, and `Authorization: Bearer <dedicated credential>`. Use this body:

```json
{
  "schemaVersion": 1,
  "site": "liberty-mutual-public-site",
  "event": "edge-publish-complete"
}
```

Experience Edge triggers OnEnd after processing published entities and clearing its cache. This is the preferred completion signal. A SitecoreAI CMS **publish:end** webhook can call the same endpoint as a catch-up signal. The handler accepts the documented `EventName` and `PublisherOptions` envelope, reads no content from that payload, and waits for changed Live content before treating a new CMS publication as complete. If Live has not caught up, it records `AWAITING_LIVE_PUBLICATION` and returns 503 with a retry interval. Initialize the manifest through an Edge completion or an authenticated reconciliation before relying on CMS catch-up alone.

Every authenticated **OnEnd** call also expires the public website's rendered-page cache, including publications that do not change the answer library. The handler uses Next.js `revalidatePath` for the actual rewritten route pattern, `/[site]/[locale]/[[...path]]`, and immediately expires the SDK's sitemap, robots, and site-specific dictionary tags. The next page request reads current published content; it does not require a frontend deployment. The website keeps its normal cache behavior between publications. This rendering head accepts only the public site's identity, so the invalidation does not affect another deployment or site.

Page expiration runs before Search synchronization because Edge has already confirmed delivery. A temporary Search failure returns a failed indexing receipt and allows publisher retry while the website can show its published update. The successful POST response includes a `delivery` summary even when its answer receipt is `unchanged`. Unauthorized and out-of-scope requests cannot expire caches. CMS catch-up calls expire pages only after the handler observes Live completion. The existing OnEnd body and credential need no change.

To verify an existing cache after deploying this handler, send the same authenticated OnEnd body once, then request Home and Bundling and inspect the current native logo or promotion wording. For the ongoing publishing check, edit a native shared datasource, complete its review, publish it, and confirm both public placements update without another frontend deployment. The Agent Portal's authenticated page already uses dynamic, uncached layout reads to isolate agent-specific content; its shared disclosure therefore receives published updates on the next page request without a second public-site cache webhook.

An authenticated initial sync or recovery uses the same body with `event` set to `reconcile`. Optional `expectedRevisions` maps approved-answer item IDs to the exact SHA-256 published-payload fingerprints expected on Live Edge. A missing expected revision returns a failed receipt rather than indexing older content. The endpoint does not publish content itself.

The handler reconciles at most 100 direct approved-answer items under the public site's **Data/Approved answers** library and the explicit PublicApprovedAnswer template. New or changed published documents produce `upsert`; previously indexed items absent from the complete Live library produce `delete`. Drafts never enter the Live query. An unreadable or incomplete library fails closed rather than being mistaken for an empty library.

Search operations follow the [SitecoreAI Ingestion Service API](https://doc.sitecore.com/sai/en/developers/sitecoreai/search-experiences/ingestion-service-api.html): 1–50 operations per request, at most 512 KiB, `Authorization: ApiKey`, locale `en`, stable Sitecore item IDs, and canonical result URLs. All fields are sent as strings. Dates use `YYYYMMDDTHHMMSSZ`. This source's fourteen technical field keys are `title`, `question`, `summary`, `body`, `canonicalurl`, `sourceurl`, `nextstepurl`, `revision`, `owner`, `effectivedate`, `reviewdate`, `state`, `product`, and `audience`. Use these keys even when Search displays a friendly or camel-case label. The stable document `id` is an operation property, outside `fields`; it must not be repeated as `fields.id`. The native Search datasource maps its result fields to these same technical keys. The independently versioned public content API retains its camel-case properties, including `canonicalUrl` and `effectiveDate`.

The handler checks each result, including 207 partial results, and retries only transient failed operations. A permanent failure does not advance the manifest. A global Redis lease serializes concurrent workers, and the manifest and receipt commit atomically. Replays are safe. Push sources avoid a scheduled crawl overwriting the pushed index.

An authorized GET to `/api/sitecore/publication` returns the latest receipt. Receipts include operation counts, a content fingerprint, timestamps, and a safe error code. They contain no credentials or article text. Individual receipts are retained for 30 days; the latest receipt and index manifest persist. A successful indexing receipt confirms the documented Push API's operation results. Rehearsal must also verify the actual Search result shown to a visitor.

## Read API

- `GET /api/content/v1/answers` returns the published collection.
- `GET /api/content/v1/answers/<Sitecore-item-ID>` returns one published answer or 404.

Responses use schema version `1.0` and include the native item version, a published-content revision fingerprint, answer, formal wording, explanation, source link, accountable owner, effective and review dates, audience metadata, next step, canonical article URL, and referenced public disclosure. The `revisionKind` value is `published-content-sha256`: Experience Edge excludes CMS Standard Fields such as `__Revision`, so the API identifies the actual delivered content instead of claiming to expose that CM UUID. They support ETags and a 15-second shared-cache lifetime. No preview query or arbitrary CMS path is accepted. Unpublished, nonexistent, or out-of-scope items are not exposed. Live service failures return 503 rather than a misleading empty response.

## Verification

Run `npm run test:publication`, then typecheck and build the app. The contract suite covers authentication, payload limits, Live-only reads, scope, revision catch-up, duplicate delivery, concurrent leases, permanent failures, retries, removal, ETags, and nonexistent or unpublished content. After configuration, rehearse a real approved-answer edit and publish: observe the changed published-content fingerprint in the read API, a successful authenticated publication receipt, and the updated Search result. Then unpublish the test answer and verify both API removal and Search deletion. Preserve and restore the original published answer when rehearsing.
