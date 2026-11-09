# Published Agent Portal resources

Sitecore remains the system of record. Authors edit the native resource fields and managed Checklist classifications, complete the normal workflow, and publish. This service reads only the Portal's published **Live Experience Edge** resource catalog and synchronizes its dedicated **Push source**. It neither saves nor publishes CMS content.

The existing native content source remains separate until the dedicated Push source and Portal binding pass verification. The runtime explicitly refuses the old Portal source ID and the public website's source ID. Its storage namespace is `lm-portal:resource-publication:v1:{sourceId}`, separate from workspaces, resets, and the public site's publisher.

## Server configuration

| Variable                                                             | Purpose                                                                                                                            |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `PORTAL_RESOURCE_PUBLIC_ORIGIN`                                      | Portal HTTPS origin used for resource result links.                                                                                |
| `PORTAL_RESOURCE_LIVE_EDGE_CONTEXT_ID`                               | Dedicated Live context. No Preview or browser-context fallback.                                                                    |
| `PORTAL_RESOURCE_SEARCH_SOURCE_ID`                                   | The dedicated Portal Push source configuration ID.                                                                                 |
| `PORTAL_RESOURCE_SEARCH_INGESTION_URL`                               | The source's displayed API Endpoint base URL.                                                                                      |
| `PORTAL_RESOURCE_SEARCH_PUSH_API_KEY`                                | Server-only Push API credential.                                                                                                   |
| `PORTAL_RESOURCE_PUBLICATION_WEBHOOK_SECRET`                         | Dedicated random Bearer credential, at least 24 characters.                                                                        |
| `PORTAL_RESOURCE_REDIS_REST_URL`, `PORTAL_RESOURCE_REDIS_REST_TOKEN` | Durable publication manifests, leases, and receipts. Existing `KV_REST_API_URL` and `KV_REST_API_TOKEN` are accepted alternatives. |

Keep credentials in server environment settings. None belongs in browser variables, source files, or workshop instructions. Missing configuration fails explicitly. There is no in-memory production store.

## Source fields

Define the fields before ingesting content. Technical field names are case-sensitive.

| Key              | Type   | Use                                                |
| ---------------- | ------ | -------------------------------------------------- |
| `title`          | String | Searchable and retrievable resource title.         |
| `summary`        | String | Searchable and retrievable result summary.         |
| `body`           | String | Searchable published article text.                 |
| `url`            | String | Retrievable Portal resource URL.                   |
| `revision`       | String | Retrievable fingerprint for verifying publication. |
| `state`          | Tags   | Filterable and retrievable risk states.            |
| `businessfamily` | Tags   | Filterable and retrievable business families.      |
| `product`        | Tags   | Filterable and retrievable independent products.   |
| `channel`        | Tags   | Filterable and retrievable distribution channels.  |
| `resourcetype`   | Tags   | Filterable and retrievable resource types.         |

The [Ingestion Service API](https://doc.sitecore.com/sai/en/developers/sitecoreai/search-experiences/ingestion-service-api.html) accepts string field values. This tenant's **Tags** fields were verified to split comma-delimited strings into independent indexed terms: `IL,TX` becomes `['IL', 'TX']`, and `auto,home` becomes `['auto', 'home']`. JSON-array strings and pipe-delimited strings do not provide the same facet membership. `encodeResourceTags` is the one wire adapter; it rejects comma-bearing option codes and control characters. The native Search query returns arrays and performs facet filtering before totals and pagination.

The shared `src/domain/resource-metadata.ts` decoder resolves published Checklist references to canonical option item names. It checks the Portal taxonomy folder, option template, and complete references. Missing, unpublished, foreign, or invalid choices fail the complete source read. Legacy published text remains readable during the rollout. **All** is an explicit nationwide selection and cannot be combined with specific states. Adding a taxonomy term does not grant an agent a license or product permission.

## Publication callback

Configure an Experience Edge **OnEnd** webhook:

- Method: `POST`
- Destination: `/api/sitecore/resource-publication` on the Portal origin
- Headers: `Content-Type: application/json`, `Authorization: Bearer <dedicated credential>`

```json
{
  "schemaVersion": 1,
  "site": "liberty-mutual-agent-portal",
  "event": "edge-publish-complete"
}
```

The callback reads at most 200 direct **ResourcePage** items beneath this Portal's **Home/resources** in English. It rejects incomplete pagination, failed native reads, malformed resource metadata, and duplicate identities. It never trusts content embedded in the callback. Preview drafts and unrelated templates do not enter the source.

A durable lease serializes callbacks. Changed published documents are upserted; documents absent from a complete Live catalog are deleted. A failed read or rejected indexing operation preserves the previous manifest. The writer respects the API's 50-operation and 512 KiB limits and validates every operation result, including partial responses. It retries only transient failures. Repeated callbacks are idempotent.

An authenticated initial synchronization or recovery uses the same body with `event` set to `reconcile`. Optional `expectedRevisions` can require specific published fingerprints. A CMS `publish:end` envelope is also accepted as a catch-up signal, but it cannot declare completion until the service observes changed Live content or the expected fingerprints. Prefer the Edge callback, which confirms that delivery has completed.

An authenticated `GET` to the same endpoint returns the latest safe receipt. The endpoint is an operations interface, not an authoring screen. Author walkthroughs should show normal publication completion and the resulting Portal content, rather than internal receipts or credentials.

### Register the environment callback

From the repository root, `authoring/scripts/portal-register-resource-search-webhook.cjs` prepares an authenticated, read-only registration plan using the normal Sitecore CLI environment and a temporary environment-scoped Edge administration client. Pass the environment name, `--edge-client`, `--runtime-env`, and `--report` with absolute private paths. The setup client's private JSON contains the project ID, environment ID, client ID, and client secret; keep it outside source control and hosting settings.

The registrar verifies the exact environment/project binding, inventories existing hooks, and preserves the public website's separate callback. An identical Portal hook is unchanged. A conflicting or duplicate owned hook stops the operation. Only `--apply --before /absolute/private/before.json` creates a missing Portal hook; it records a before-image and verifies the native readback. Reports omit credentials. Revoke the temporary setup client after registration. The script does not create or revoke that client itself, publish content, or change any other hook.

The API handler is already outside the Portal session proxy because the proxy matcher excludes API routes. The route requires the dedicated Bearer credential before reading content or sending Search operations; no agent login cookie is required or accepted as authorization.

## Verification

Run the resource-publication test suite and the shared metadata/consumer checks on Node 24. Rehearse a normal native Checklist edit, approval, and publication; verify the resulting independent Tags terms in the dedicated source. Verify licensed-state filtering, nationwide inclusion, combined facets, exact pagination, unpublish/removal, and preservation of unrelated resources before changing the Portal's source binding. A successful Push response alone does not prove visitor filtering or published freshness.
