# Portal authentication and insurance data

This application uses fictional insurance records behind a signed session. Sitecore owns authored content and native marketing capabilities. The JSON insurance adapters model the operational systems that a customer implementation would connect later. They do not rate or bind insurance, issue a bond, file a claim, or contact an underwriter.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/contracts/portal.ts` | Browser-safe domain and action contracts |
| `src/server/auth` | Credential verification, signed session, login throttling, native identity mapping |
| `src/server/data/fixtures.ts` | Immutable seed imports and relationship validation |
| `src/server/data/portal.ts` | Agency and role authorization, bootstrap projection, state transitions, resets |
| `src/server/state/store.ts` | Versioned durable-store contract; HTTP Redis and local JSON adapters |
| `src/server/http.ts` | Same-origin validation, bounded JSON requests, private responses, safe errors |
| `src/app/api/auth` | Login and logout handlers |
| `src/app/api/portal` | Authenticated workspace, actions, account documents, and protected operator reset |
| `fixtures` | Versioned fictional source records; never import from a client component |

Server modules import `server-only`. UI components consume `PortalBootstrap` and send a discriminated `PortalAction`; they never read fixture files or decide account authorization. Each request checks the signed agent-to-agency mapping and each record's owner. Principals can work across their agency's appointed lines; other users work within their specialization and licensed states. Browsing product and educational content does not grant transaction permission.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORTAL_SESSION_SECRET` | At least 32 characters of randomly generated signing material; required in every environment |
| `PORTAL_ENVIRONMENT` | Explicit lowercase namespace, such as `liberty-mutual-sandbox`; never share a namespace across unrelated deployments |
| `PORTAL_REDIS_REST_URL` | HTTPS endpoint for the customer-owned HTTP Redis store |
| `PORTAL_REDIS_REST_TOKEN` | Redis write token, server only |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Supported aliases for a Vercel marketplace Redis connection |
| `PORTAL_OPERATOR_SECRET` | Separate random secret, at least 32 characters, for the operator reset endpoint |
| `PORTAL_VERIFIED_PROFILE_GENERATIONS` | Comma-separated generations whose complete native UDL import has been checked; leave empty until confirmed |
| `PORTAL_STATE_ADAPTER=local-json` | Explicit local development only; never accepted on Vercel or in production |
| `PORTAL_LOCAL_STATE_DIRECTORY` | Optional local-only path; defaults to `.portal-state` |
| `PORTAL_CONTENT_ADAPTER` | `sitecore` (default) reads the published resource metadata; `fixtures` is restricted to explicit local engineering/tests |

There is no built-in signing secret. Deployment refuses to use a filesystem or memory fallback when Redis is absent. Store errors fail the action and preserve the previous workspace. No token belongs in a `NEXT_PUBLIC_` variable, client bundle, Sitecore content item, or analytics event.

The HTTP adapter uses a single Redis `EVAL` operation for compare-and-set, rather than separate read and write requests. The bearer token is in the authorization header, never the URL. Review the provider's current [HTTP Redis API](https://upstash.com/docs/redis/features/restapi) when replacing or transferring the integration. The adapter contract is small enough to replace with another durable provider that supports atomic version checks.

## Fictional login packs

Four packs (`01`–`04`) each contain seven identities:

| Username prefix | Person | Agency | Role |
| --- | --- | --- | --- |
| `avery` | Avery Brooks | Cedar Ridge Insurance | Agency principal |
| `maya` | Maya Chen | Cedar Ridge Insurance | Personal lines account manager |
| `jordan` | Jordan Ellis | Cedar Ridge Insurance | Small commercial producer |
| `daniel` | Daniel Ortiz | Prairie Oak Insurance | Business insurance producer |
| `priya` | Priya Shah | Harborline Risk Partners | Commercial account executive |
| `marcus` | Marcus Reed | Harborline Risk Partners | Surety specialist |
| `elena` | Elena Park | Summit Specialty Partners | Wholesale broker |

For example, `maya.01` and `maya.02` have different saved work and different native profile identifiers. The three Cedar Ridge users within one pack intentionally share the agency's operational work; favorites and learning registrations belong to the individual agent. Sharing the exact same username also shares its native marketing history.

The requested readable username/password source is `fixtures/portal-logins.json`. These are randomly generated, disposable fictional account passwords. Handle that file as operator material even though it contains no customer credentials. It is not imported by runtime code. `node scripts/provision-credentials.mjs` derives `fixtures/portal-credentials.json` using independent salts and scrypt. The server imports only that hashed artifact. Rerun provisioning after changing the source, then release the application. Never put either file into `public`, a download route, or a Sitecore media library.

Login verifies credentials on the server, applies a durable per-username attempt limit, and signs an eight-hour session using `jose`. Cookies are HttpOnly, SameSite=Lax, and Secure in production. The session carries trusted identity keys; permissions come from server-owned fixtures. POST requests from the browser require matching Origin and JSON content type. Body reading is bounded even if Content-Length is missing. Authentication errors do not disclose whether a username exists.

Successful login and logout expire the pinned SDK's `sc_cid` and `sc_cid_personalize` cookies, plus the exact legacy cookie names for this site's public context ID. Deletions use `/`, both host-only and the current hostname domain scope used by the SDK's server personalization proxy. They do not clear another application's cookies or a parent-domain namespace. The client also clears the supported event queue and transitions to a fresh document; that client step remains necessary because a server response cannot erase another browser tab's in-memory event state. A signed cookie alone does not trigger the login-page redirect: the corresponding reviewer workspace must still be active, preventing a redirect loop after an operator restart.

This is an access simulation for a controlled customer sandbox. Replace it with the customer's identity provider and appointment/authorization services before a production portal launch. Rotating the session-signing secret invalidates all existing sessions.

## API contract

All workspace and document responses use `Cache-Control: private, no-store`, `Vary: Cookie`, and noindex headers. API errors use `{ "error": { "code": "...", "message": "..." } }` without secrets or provider details.

| Endpoint | Contract |
| --- | --- |
| `POST /api/auth/login` | JSON `{ username, password }`; sets signed cookie |
| `POST /api/auth/logout` | Ends the cookie session; tells the client to clear supported Sitecore identity state |
| `GET /api/portal/bootstrap` | Returns the current `PortalBootstrap` |
| `POST /api/portal/actions` | Validates and persists a `PortalAction`, then returns a fresh bootstrap |
| `GET /api/portal/policies/{policyId}/documents/{documentId}` | Returns an authorized account-review text document |
| `POST /api/portal/operator/reset` | Separate operator bearer credential; JSON `{ reviewerPack, mode }` |

Every action includes `expectedVersion`, `runId`, and a new `idempotencyKey`. Repeating the exact payload with the same key does not duplicate an action. Reusing a key for another actor or payload is rejected. Competing writes return `VERSION_CONFLICT` rather than overwriting another user's work. The UI refreshes before the user retries.

Supported operations cover draft preparation and submission, missing-information responses, renewal follow-ups, service requests, task completion, bond requests, resource favorites, learning registration, and relationship conversation requests. A submitted request produces a scoped reference and activity history; it does not invoke a real insurance system. Client-facing text avoids claiming an actual email was sent or insurance was bound.

## Data definitions

The scenario clock is September 10, 2026. Production covers September 1, 2025 through August 31, 2026: the last twelve complete months for that scenario. Money uses integer USD cents. Dates without times are calendar dates; action and activity timestamps are UTC instants. No time-zone conversion should shift a policy's date-only values.

Agency production is an explicitly complete aggregate source. The policy and task collections are a curated working book, not the full underlying policy population. Do not divide the curated worklist by aggregate policy counts and label the result a conversion or retention rate. Agent-level production reconciles to agency totals. Written premium, new-business premium, and policy count are separate measures. They are not Sitecore engagement metrics.

Eighteen products span personal, small commercial, commercial, specialty, and surety. Product/state entries and preparation workflows are fictional integration scenarios, not official Liberty Mutual underwriting appetite. The connected resource library contains the 12 initial published CMS ResourcePages plus any valid new children authored in that location. Regulatory resource copy links to the applicable state regulator and should be revalidated whenever the scenario date changes.

`src/server/data/cms-resources.ts` reads Title, summary, body, type, state, family, source and review date directly from published ResourcePages. The same page is the editable ResourceArticle datasource. Small cursor-based query pages stay within Experience Edge complexity limits. Resources use stable native item IDs for saved favorites and explicit authored URLs for navigation; renaming a page does not change the favorite identifier. Only the explicit local fixture mode uses the older engineering resource JSON. Legacy operational resource references are resolved through `src/contracts/resource-routes.ts` for campaign and saved-work continuity. No title or summary mirror is synchronized from fixtures during a normal release.

The fixed scenario date makes fixtures repeatable. To advance the scenario, update policy and submission dates, task due dates, production boundaries, content effective dates, UDL profile exports, and the manifest together; rerun validation and the journey tests.

## Durable work and resetting

State keys are namespaced by environment, reviewer pack, run UUID, and agency. The store retains changes for seven days from the run's start, independently from eight-hour login sessions. Pack metadata retains the latest native generation and reset timestamp so a normal expiry cannot silently reuse an older marketing identity. Expired work returns `WORKSPACE_EXPIRED`; the operator starts a new run deliberately.

| Operation | Saved work | Native identity and history |
| --- | --- | --- |
| Sign out | Preserved | Client clears supported Sitecore identity state; stored native history remains |
| `saved-work` reset | Fresh run for the selected pack; all its agencies return to baseline | Same native identifier and historical events |
| `restart` reset | Fresh run and all existing app sessions for that pack are invalidated | Uses the next preimported, verified generation; earlier profiles and analytics remain historical |

Run the operator command with the separate secret in the shell environment:

```sh
node scripts/reset-reviewer-pack.mjs https://portal-host.example 01 saved-work
node scripts/reset-reviewer-pack.mjs https://portal-host.example 01 restart
```

The command reads `PORTAL_OPERATOR_SECRET`; it never accepts or prints that secret as a positional argument. Operators must tell active reviewers to refresh after resetting saved work, and to sign in again after restarting. On restart, the browser integration must clear its supported Sitecore SDK identity, cookies, and queued client state before identifying the next profile. A backend reset cannot erase another browser's client storage. The operator route is intentionally absent from portal navigation.

Reset advances the run UUID instead of deleting a shared database. Stale tabs cannot write into the active run, another pack stays intact, and old operational keys expire naturally. Restart stops when no next verified native generation is available. It never attempts to clear native history by reimporting the same person.

## Native Unified Data Layer mapping

`node scripts/export-udl-profiles.mjs` writes 112 JSONL profiles: 28 logins × four identity generations. `fixtures/udl/profile-identity-map.json` maps operator usernames to opaque identifiers; the browser receives only the active identifier. That value is an identifier under provider `liberty-mutual-agent`, not Sitecore's generated profile UUID.

The exported payload follows the [SitecoreAI profile-import schema](https://doc.sitecore.com/sai/en/developers/sitecoreai/profile-import/batch-file-format.html). Create the provider's native identity rule first, import the batch, and verify every result before setting `PORTAL_VERIFIED_PROFILE_GENERATIONS`. No email identifier is reused across generations. Profiles contain fictional names, states, roles, specialties, agency relationships, and production attributes; they contain no passwords, signing secrets, account names, policy numbers, or free-text notes.

The provisioned tenant accepted all 112 records in batch `ddb86a67-25c8-4bdd-9232-76c24811022e` on September 10, 2026; the exact file checksum and tenant scope are recorded in `fixtures/udl/import-verification.json`. The initial payload using extension arrays failed. The verified compatibility shape uses a top-level UUID correlation `id`, the unchanged opaque identifier, first/last name contact fields, and scalar-only extensions. Specializations and licensed states are separate boolean fields. Current Sitecore batch-format and troubleshooting pages differ on array support, so preserve the tenant-verified shape. Regenerating the file creates new transport correlation IDs without changing business/profile identifiers. One successful diagnostic probe may leave `importCompatibilityProbe=true` on Avery's first profile; it is internal diagnostic metadata and does not drive portal decisions.

Flat `personalWrittenPremiumCents`, `smallCommercialWrittenPremiumCents`, and corresponding fields retain agency scope for compatibility; `productionMetricScope` makes that explicit. `agencyPersonalWrittenPremiumCents` and its line equivalents are explicit agency aliases. `agentPersonalWrittenPremiumCents`, `agentPersonalPolicyCount`, and `agentPersonalNewBusinessPremiumCents` (and other lines) describe the individual agent. `smallBusinessGrowthAudience` is the seeded agency-level ABM cohort flag. State, role, specialty, and production attributes are available for authored native decisions; server authorization never trusts those marketing attributes.

`getEditorBootstrap()` is a pure fixture projection for a **verified** Sitecore editing request. It neither reads nor writes reviewer state and returns no UDL identity. Calling it must be gated by the Content SDK's validated editing mechanism, never by an arbitrary query parameter.

## Verification and replacement seams

Run the server tests with the React server condition so the `server-only` package remains effective:

```sh
NODE_OPTIONS='--conditions=react-server' node --import tsx --test src/server/**/*.test.ts
```

Tests cover signed-session tampering and expiry, credential validation, fixture reconciliation, agency and specialization isolation, persistence across store instances, idempotency, concurrent changes, stale tabs after reset, verified profile rotation, representative submission/surety/service/learning actions, CSRF and request-size rejection, Redis atomic command construction, and rejection of deployed filesystem fallback. The Redis protocol test is a contract test; production-provider persistence must also be checked against the actual provisioned store before handoff.

Replace fixtures and service methods behind the public contracts as real systems arrive. Keep account ownership checks in the data layer. Keep issued policy documents behind the same authorization boundary. Do not publish account records or restricted documents through Experience Edge or the editorial search index: those published stores must not be treated as account-level access-control systems.
