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

Server modules import `server-only`. UI components consume `PortalBootstrap` and send a discriminated `PortalAction`; they never read fixture files or decide account authorization. Each request checks the signed agent-to-agency mapping and record scope. State-sensitive actions also check current dated license authority, agency/producer carrier appointments, product/state availability and relevant assigned-producer eligibility. A principal can access agency work across appointed lines but does not bypass state authority. Browsing product and educational content does not grant transaction permission.

The [state eligibility runbook](../../../docs/state-eligibility.md) explains the synthetic authority adapter, current UTC evaluation, restricted saved records and acceptance checks. Bootstrap includes current-agent rule data and server-computed decisions for existing-record actions.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORTAL_SESSION_SECRET` | At least 32 characters of randomly generated signing material; required in every environment |
| `PORTAL_ENVIRONMENT` | Explicit lowercase namespace, such as `liberty-mutual-sandbox`; never share a namespace across unrelated deployments |
| `PORTAL_REDIS_REST_URL` | HTTPS endpoint for the customer-owned HTTP Redis store |
| `PORTAL_REDIS_REST_TOKEN` | Redis write token, server only |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Supported aliases for a Vercel marketplace Redis connection |
| `PORTAL_OPERATOR_SECRET` | Separate random secret, at least 32 characters, for the operator reset endpoint |
| `SITECORE_PROFILE_IMPORT_URL` | Tenant-specific native profile import HTTPS endpoint; server only |
| `SITECORE_PROFILE_IMPORT_API_KEY` | Native profile import API key; server only and separate from the operator secret |
| `PORTAL_VERIFIED_PROFILE_GENERATIONS` | Verified historical fixture generations used for the initial profile mapping; new on-demand restart profiles require their own durable import verification before activation |
| `PORTAL_STATE_ADAPTER=local-json` | Explicit local development only; never accepted on Vercel or in production |
| `PORTAL_LOCAL_STATE_DIRECTORY` | Optional local-only path; defaults to `.portal-state` |
| `PORTAL_CONTENT_ADAPTER` | `sitecore` (default) reads the published resource metadata; `fixtures` is restricted to explicit local engineering/tests |

There is no built-in signing secret. Deployment refuses to use a filesystem or memory fallback when Redis is absent. Store errors fail the action and preserve the previous workspace. No token belongs in a `NEXT_PUBLIC_` variable, client bundle, Sitecore content item, or analytics event.

The HTTP adapter uses a single Redis `EVAL` operation for compare-and-set, rather than separate read and write requests. The bearer token is in the authorization header, never the URL. Review the provider's current [HTTP Redis API](https://upstash.com/docs/redis/features/restapi) when replacing or transferring the integration. The adapter contract is small enough to replace with another durable provider that supports atomic version checks.

## Fictional login packs

Fifteen packs (`01`–`15`) each contain the same seven identities, for 105 fictional portal accounts:

| Username prefix | Person | Agency | Role |
| --- | --- | --- | --- |
| `avery` | Avery Brooks | Cedar Ridge Insurance | Agency principal |
| `maya` | Maya Chen | Cedar Ridge Insurance | Personal lines account manager |
| `jordan` | Jordan Ellis | Cedar Ridge Insurance | Small commercial producer |
| `daniel` | Daniel Ortiz | Prairie Oak Insurance | Business insurance producer |
| `priya` | Priya Shah | Harborline Risk Partners | Commercial account executive |
| `marcus` | Marcus Reed | Harborline Risk Partners | Surety specialist |
| `elena` | Elena Park | Summit Specialty Partners | Wholesale broker |

Reserve pack `01` for workshop presenters. Assign attendee and spare packs from `02`–`15` (14 non-presenter packs), keeping that suffix when switching among all seven personas. For example, the attendee assigned pack `12` uses `avery.12`, `maya.12`, `jordan.12`, `daniel.12`, `priya.12`, `marcus.12` and `elena.12`. Never reset a pack while an attendee is using it. The seven roles, licenses, appointments and four fictional agencies are unchanged across packs; the suffix selects an isolated copy, not a different role.

For example, `maya.01` and `maya.02` have different saved work and different native profile identifiers. The three Cedar Ridge users within one pack intentionally share the agency's operational work; favorites and learning registrations belong to the individual agent. Sharing the exact same username also shares its native marketing history. Each pack can be restarted on demand with a newly imported and verified set of seven native profiles. The original fixture generations (`0`–`3`) are historical seed sets, not a four-restart limit. The local developer exercise remains isolated on each workstation and can continue to use `daniel.01` with tracking disabled. Resource authoring uses each attendee’s own Sitecore sign-in and uniquely named unpublished page, not a portal reviewer pack.

The requested readable username/password source is `fixtures/portal-logins.json`. All 105 fictional accounts use the shared password `Sitecore`. Handle that file as operator material even though it contains no customer credentials. It is not imported by runtime code. `node scripts/provision-credentials.mjs` derives `fixtures/portal-credentials.json` using independent salts and scrypt. The server imports only that hashed artifact. Rerun provisioning after changing the source, then release the application. Never put either file into `public`, a download route, or a Sitecore media library.

Login verifies credentials on the server, applies a durable per-username attempt limit, and signs an eight-hour session using `jose`. Cookies are HttpOnly, SameSite=Lax, and Secure in production. The session carries trusted identity keys; permissions come from server-owned fixtures. POST requests from the browser require matching Origin and JSON content type. Body reading is bounded even if Content-Length is missing. Authentication errors do not disclose whether a username exists.

Successful login and logout expire the pinned SDK's `sc_cid` and `sc_cid_personalize` cookies, plus the exact legacy cookie names for this site's public context ID. Deletions use `/`, both host-only and the current hostname domain scope used by the SDK's server personalization proxy. They do not clear another application's cookies or a parent-domain namespace. The client also clears the supported event queue and transitions to a fresh document; that client step remains necessary because a server response cannot erase another browser tab's in-memory event state. A signed cookie alone does not trigger the login-page redirect: the corresponding reviewer workspace must still be active, preventing a redirect loop after an operator restart.

An explicit `/login` remains available after Page Builder use on the editing alias, including a verified Next.js Draft Mode session. Successful portal login clears only the two intended draft cookies; a rejected login preserves them.

After successful app authentication, the browser gives optional native identity preparation **eight seconds overall**. That budget includes authenticated bootstrap fetch and JSON parsing, waiting for old SDK work, clearing the supported queue, creating a fresh native browser and waiting for profile linkage. Any failure or deadline expiry still navigates to the workspace. The nested profile-link helper has **at most six seconds** within that overall budget: read the fresh browser's baseline profile, send one IDENTITY event, then observe browser/show until its profile reference changes. It stops immediately once the link is observed. Polling is bounded and applies only to explicit login. Ordinary tracking bounds its identity wait to two seconds without polling for an already-linked profile to change.

The public analytics adapter wrapper forces a fresh browser through the supported `setClientId()` contract and never mutates the supplied adapter or hidden SDK state. Actual in-flight SDK work stays tracked even after its caller times out. Fresh initialization waits for it to settle; generation and abort checks prevent a superseded continuation from sending an old identity or activating a late result. The SDK identity transport itself does not accept cancellation, so a bounded wait must not be described as canceling that HTTP request.

Campaign decisions first check the active portal session and verified profile generation. `src/server/personalization/browser-profile-decision.ts` then uses the request's existing `sc_cid` for one uncached native `browser/show` lookup through `src/lib/portal-identity-link.ts`. The response must identify that same browser; its native `customer.ref` becomes `guestRef`. This lookup is shared only among component decisions within the same HTTP request. The decision POST includes both the resolved `guestRef` and the same `browserId`, with no external agent identifier or email. It initializes no shared server analytics state and never substitutes a stale personalize/profile cookie or global profile reference when lookup fails.

For an operator's native history check, search **Performance → Profiles** by the browser's **Client ID** and inspect the canonical profile's **Engagement**. A returned `customer.ref` can point to a retired alias with no visible sessions; do not diagnose identity failure from that alias page alone. The decision adapter uses the reference returned by the pinned SDK contract, without custom alias resolution. Verify the same client ID and expected events on the profile located through the native UI.

One deadline covers signed-identity validation, browser lookup and native decision, including their response-body decoding: two seconds by default, configurable through `PERSONALIZE_MIDDLEWARE_CDP_TIMEOUT` and capped at ten seconds. Native transport is aborted at the deadline; late continuations cannot send a decision. Missing or mismatched browser/profile data, unknown variants, transport/decoding errors and timeouts remain neutral. There is no decision retry, lookup polling or fixture-selected campaign. Native campaign discovery and rewrites remain in the public Content SDK proxy, with its separate discovery cache preserved.

`PORTAL_PERSONALIZATION_DIAGNOSTICS` is off unless exactly `true`. Its allowlisted selection categories distinguish `accepted-control`, `accepted-variant`, `invalid` and `none`, alongside safe stage, timing and status fields. It never logs native profile references, cookies, raw response bodies or exception messages. UDL profile linking can complete after the identity-event response, so verify fresh-login behavior and native A/B assignment against the actual tenant; the bounded login-only readiness polling above remains separate from this single-lookup decision path.

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
| `GET /api/portal/operator/reset?reviewerPack=15` | Separate operator bearer credential; current run/generation and pending restart; optional `requestId` returns that retained operation receipt |
| `POST /api/portal/operator/reset` | Separate operator bearer credential; saved work uses `{ reviewerPack, mode: "saved-work" }`; restart also requires UUID `requestId` and `expectedRunId` |

Every action includes `expectedVersion`, `runId`, and a new `idempotencyKey`. Repeating the exact payload with the same key does not duplicate an action. Reusing a key for another actor or payload is rejected. Competing writes return `VERSION_CONFLICT` rather than overwriting another user's work. The UI refreshes before the user retries.

Supported operations cover draft preparation and submission, missing-information responses, renewal follow-ups, service requests, task completion, bond requests, resource favorites, learning registration, and relationship conversation requests. A submitted request produces a scoped reference and activity history; it does not invoke a real insurance system. Client-facing text avoids claiming an actual email was sent or insurance was bound.

## Data definitions

The scenario clock is September 10, 2026. Production covers September 1, 2025 through August 31, 2026: the last twelve complete months for that scenario. Money uses integer USD cents. Dates without times are calendar dates; action and activity timestamps are UTC instants. No time-zone conversion should shift a policy's date-only values.

Agency production is an explicitly complete aggregate source. The policy and task collections are a curated working book, not the full underlying policy population. Do not divide the curated worklist by aggregate policy counts and label the result a conversion or retention rate. Agent-level production reconciles to agency totals. Written premium, new-business premium, and policy count are separate measures. They are not Sitecore engagement metrics.

Eighteen products span personal, small commercial, commercial, specialty, and surety. Product/state entries and preparation workflows are fictional integration scenarios, not official Liberty Mutual underwriting appetite. The connected resource library contains the 12 initial published CMS ResourcePages plus any valid new children authored in that location. Regulatory resource copy links to the applicable state regulator and should be revalidated whenever the scenario date changes.

`src/server/data/cms-resources.ts` reads Title, summary, body, type, state, family, source and review date directly from published ResourcePages. The same page is the editable ResourceArticle datasource. Small cursor-based query pages stay within Experience Edge complexity limits. Resources use stable native item IDs for saved favorites and explicit authored URLs for navigation; renaming a page does not change the favorite identifier. Only the explicit local fixture mode uses the older engineering resource JSON. Legacy operational resource references are resolved through `src/contracts/resource-routes.ts` for campaign and saved-work continuity. No title or summary mirror is synchronized from fixtures during a normal release.

The fixed scenario date makes fixtures repeatable. To advance the scenario, update policy and submission dates, task due dates, production boundaries, content effective dates, UDL profile exports, and the manifest together; rerun validation and the journey tests.

## Durable work and resetting

State keys are namespaced by environment, reviewer pack, run UUID, and agency. Each agency's saved work is retained for seven days after its latest saved change; viewing it does not extend that retention. Eight-hour login sessions remain independent, and a reviewer pack does not lock users out because of its age. If the state store has already expired an agency's saved work, the next visit restores that agency's starting fixtures. Existing saved work is otherwise left untouched. This restoration preserves the run UUID, profile generation, verified native identities, and CDP history; it does not perform an operator reset. Durable pack metadata retains the latest native generation and restart timestamp.

| Operation | Saved work | Native identity and history |
| --- | --- | --- |
| Sign out | Preserved | Client clears supported Sitecore identity state; stored native history remains |
| `saved-work` reset | Fresh run for the selected pack; all its agencies return to baseline | Same native identifier and historical events |
| `restart` reset | After native verification, a fresh run replaces saved work and all existing app sessions for that pack are invalidated | Provisions a fresh set of seven native profiles on demand, verifies the complete import, then activates it; earlier profiles and analytics remain historical |

Run the operator command with the separate secret in the shell environment. The examples use reserved presenter pack `01`; for an attendee reset, use their assigned pack from `02`–`15`, confirm the host and coordinate with that attendee before selecting one reset mode. A pack reset affects all seven personas in that pack, not only the last login:

```sh
node scripts/reset-reviewer-pack.mjs https://portal-host.example 01 saved-work
node scripts/reset-reviewer-pack.mjs https://portal-host.example 01 restart
```

The command reads `PORTAL_OPERATOR_SECRET`; it never accepts or prints that secret as a positional argument. The native import endpoint and API key are configured only on the server; the CLI does not receive or store the native API key. Operators must tell active reviewers to refresh after resetting saved work, and to sign in again after restarting. On restart, the browser integration must clear its supported Sitecore SDK identity, cookies, and queued client state before identifying the next profile. A backend reset cannot erase another browser's client storage. The operator route is intentionally absent from portal navigation.

Reset advances the run UUID instead of deleting a shared database. Stale tabs cannot write into the active run, another pack stays intact, and old operational keys expire naturally. A restart creates new native identities for all seven personas in the selected pack; it does not delete existing CDP history or reimport an old identity to erase its events. There is no preallocated four-set ceiling. Native import availability and verification still determine when a restart can complete.

The command first reads the active run, then saves one request UUID and expected run UUID before it starts the restart. The private resume file is stored under `~/.sitecore/liberty-mutual-portal-operations/`, keyed by host and pack. It contains no operator secret, native API key, passwords or customer data. `--operation-file /absolute/path/restart.json` chooses another location. Keep that file until the operation completes.

A restart can take several short requests. The CLI reports progress and repeats the **same request UUID and expected run UUID** while the server imports and verifies the seven profiles. `202` means pending; only a validated `200` receipt with `status: completed` confirms that the new run and profiles are active. The previous run remains active while verification is pending. The command waits up to fifteen minutes, retries transient network errors, throttling and server errors with the same operation identity, and removes the resume file only after verified completion.

If the process stops or the wait expires, rerun the same host/pack/restart command on that workstation. It resumes from its file; it does not create another set. If the file is unavailable, the CLI can recover the pack's active pending operation from the operator endpoint. To resume a known operation explicitly, supply its original UUIDs together:

```sh
node scripts/reset-reviewer-pack.mjs https://portal-host.example 01 restart \
  --request-id REQUEST_UUID --expected-run-id ORIGINAL_RUN_UUID
```

A failed receipt, mismatched receipt or `UPLOAD_UNCERTAIN` stops the command and preserves the operation file. Do not delete that file and blindly rerun: inspect the protected operator status and native import first. An uncertain upload might already have reached Sitecore. Any subsequent attempt must be an explicit operator decision with a new request UUID, the current expected run UUID and a separate operation file. The CLI never silently retries an uncertain upload as a new operation. Saved-work reset remains one POST and does not import profiles; an unavailable response requires checking the current pack state before repeating it.

The protected status endpoint accepts `requestId` to retrieve an immutable operation receipt even after later restarts. Its audit fields retain the profile-set ID, environment scope, payload checksum/size, seven identifier/correlation pairs, and batch ID when known. Completed receipts also retain the seven canonical native profile IDs and verified created/updated/failed counts. Neither payload credentials nor API keys are retained. Use these fields to match an operation to the native import; an old completed receipt proves that operation completed, not that its profile set is still current.

### Find the active native profile

The static `fixtures/udl/profile-identity-map.json` contains the original seed only. After an on-demand restart, look up the live identity instead:

1. Sign in with the assigned persona and pack on the host used for the walkthrough.
2. In another tab in that same browser, open [production profile details](https://liberty-mutual-agent-portal.vercel.app/api/portal/bootstrap), or [preview profile details](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/api/portal/bootstrap) when using the designated preview. Confirm the `agent.id` matches the persona.
3. Copy the `id` inside `udlIdentity`; record `session.runId` and `session.profileGeneration` if collecting evidence. If `udlIdentity` is null, stop and ask the operator to verify native identity readiness. Close the temporary details tab.
4. In SitecoreAI, choose **Performance → Profiles → Search filter → Liberty Mutual agent identity**. Paste the identifier, press **Enter**, open the matching person, then inspect **Overview** or **Engagement**.

The original seed identifiers can share history across production and preview. Each new restart set includes the environment scope and a fresh set UUID, so matching usernames and numeric generations no longer imply the same native identity across hosts. Both hosts still share Sitecore content, native rules and experiment configuration.

## Native Unified Data Layer mapping

`node scripts/export-udl-profiles.mjs` describes the historical seed of 420 JSONL profiles: 105 logins × four fixture generations (`0`–`3`). This export is not the limit for on-demand restarts; each restart records and verifies its new profile set in durable operator state. `fixtures/udl/profile-identity-map.json` maps the original seed usernames/generations to opaque identifiers; it does not contain on-demand sets. The browser receives only the active identifier. That value is an identifier under provider `liberty-mutual-agent`, not Sitecore's generated profile UUID. All fifteen packs have verified initial native import receipts; import completion alone does not establish successful runtime identity linking or personalization.

The exported payload follows the [SitecoreAI profile-import schema](https://doc.sitecore.com/sai/en/developers/sitecoreai/profile-import/batch-file-format.html). Create the provider's native identity rule first, import the batch, and verify every result before setting `PORTAL_VERIFIED_PROFILE_GENERATIONS`. No email identifier is reused across generations. Profiles contain fictional names, states, roles, specialties, agency relationships, and production attributes; they contain no passwords, signing secrets, account names, policy numbers, or free-text notes.

The original four-pack import accepted all 112 records in batch `ddb86a67-25c8-4bdd-9232-76c24811022e` on September 10, 2026. Its unchanged payload is preserved at `fixtures/udl/imports/packs-01-04-2026-09-10.jsonl`; its checksum and tenant scope remain in `fixtures/udl/import-verification.json`. The additive batch `e538f430-54dc-4606-b4f2-82a3e53104ec` completed in the native UI with all 308 records and zero errors for packs `05`–`15`, generations `0`–`3`. Its exact payload is `fixtures/udl/imports/packs-05-15-2026-09-17.jsonl`, with the separate receipt in `fixtures/udl/import-verification-packs-05-15.json`. The original packs were not reimported or reset.

For an additive export, write the selected packs to a separate staging directory:

```sh
node scripts/export-udl-profiles.mjs /tmp/liberty-mutual-packs-05-15 --packs 05,06,07,08,09,10,11,12,13,14,15
```

This creates a selected-pack JSONL file and identity map for the historical seed in that directory. Keep the archived map in `fixtures/udl` intact. These packs are already imported; do not reimport a regenerated file to reset native history. Ordinary on-demand restarts use the protected operator workflow and its durable verification, not this export command.

The initial payload using extension arrays failed. The verified compatibility shape uses a top-level UUID correlation `id`, the unchanged opaque identifier, first/last name contact fields, and scalar-only extensions. Specializations and licensed states are separate boolean fields. Current Sitecore batch-format and troubleshooting pages differ on array support, so preserve the tenant-verified shape. Regenerating the file creates new transport correlation IDs without changing business/profile identifiers. One successful diagnostic probe may leave `importCompatibilityProbe=true` on Avery's first profile; it is internal diagnostic metadata and does not drive portal decisions.

Flat `personalWrittenPremiumCents`, `smallCommercialWrittenPremiumCents`, and corresponding fields retain agency scope for compatibility; `productionMetricScope` makes that explicit. `agencyPersonalWrittenPremiumCents` and its line equivalents are explicit agency aliases. `agentPersonalWrittenPremiumCents`, `agentPersonalPolicyCount`, and `agentPersonalNewBusinessPremiumCents` (and other lines) describe the individual agent. `smallBusinessGrowthAudience` is the seeded agency-level ABM cohort flag. State, role, specialty, and production attributes are available for authored native decisions; server authorization never trusts those marketing attributes.

`getEditorBootstrap()` is a pure fixture projection for a **verified** Sitecore editing request. It neither reads nor writes reviewer state and returns no UDL identity. Calling it must be gated by the Content SDK's validated editing mechanism, never by an arbitrary query parameter.

## Verification and replacement seams

Run the normal release test command, which includes all source tests and supplies the React server condition so the `server-only` package remains effective:

```sh
npm test
```

Tests cover signed-session tampering and expiry, credential validation, fixture reconciliation, agency and specialization isolation, persistence across store instances, idempotency, concurrent changes, stale tabs after reset, verified profile rotation, representative submission/surety/service/learning actions, CSRF and request-size rejection, Redis atomic command construction, and rejection of deployed filesystem fallback. The Redis protocol test is a contract test; production-provider persistence must also be checked against the actual provisioned store before handoff.

Identity tests additionally cover baseline/receipt ordering, unchanged and late profile-link results, hung reads and identity responses, total optional-preparation deadlines, queued SDK work after cancellation, superseded initialization, and the unchanged public adapter contract. These local tests do not replace fresh-login acceptance against the actual tenant.

Replace fixtures and service methods behind the public contracts as real systems arrive. Keep account ownership checks in the data layer. Keep issued policy documents behind the same authorization boundary. Do not publish account records or restricted documents through Experience Edge or the editorial search index: those published stores must not be treated as account-level access-control systems.
