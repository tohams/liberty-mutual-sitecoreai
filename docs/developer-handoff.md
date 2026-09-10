# Developer and platform handoff

This guide explains how to operate, change and transfer the Liberty Mutual agent portal. It distinguishes compiled application behavior from tenant configuration and runtime verification. The portal uses native Sitecore content; operational account, policy, submission and production records are fictional fixtures with durable, isolated workspaces.

## Ownership and architecture

The active rendering host is `liberty-mutual-agent-portal`, at `examples/liberty-mutual-agent-portal`. It uses Next.js App Router, React, TypeScript and the Sitecore Content SDK. Other `examples/` directories retain upstream starter reference code and are not additional customer applications.

| Layer | Responsibility | Change owner |
| --- | --- | --- |
| Native pages and datasources | Page layout, guidance, resource copy, imagery, reusable component variants | Marketing with editorial review |
| Templates, rendering definitions and placeholders | Field contracts and what authors can compose | Sitecore implementers |
| Public contracts and feature UI | Agent workflows, form behavior and presentation | Frontend developers |
| Server adapters | Session validation, agency and reviewer-pack scope, operational actions, native resource metadata | Application developers |
| Redis state provider | Durable state, atomic changes, namespace isolation and expiry | Platform administrators |
| Unified Data Layer | Imported agent identities, profile attributes, native decisions and events | Marketing operations and developers |
| Native Search | Content source, field mappings, indexing and relevance | Search/content administrators |
| Design Studio and Agentic Studio | Brand Kit, approved campaign inputs, agent workflow and review | Marketing operations |

`src/contracts/portal.ts` defines the safe API payload. Server modules never export credentials, Redis configuration or operator keys through bootstrap responses. Protected APIs enforce their own session and agency scope. UI filtering is not the authorization boundary.

`ResourcePage` is the single authority for resource title, summary, body, type, risk state and taxonomy. The native resource item is also its article datasource. Bootstrap hydrates current published metadata from Experience Edge, with small paginated queries; favorites use the stable native item ID. Marketer edits appear through the normal publish workflow, without maintaining a duplicate resource catalog in application code. The explicit local fixture adapter is reserved for isolated engineering tests.

## Environment configuration

Start with the application's `.env.remote.example`. Keep real values out of Git. Separate production, preview and local configuration; do not import a developer's entire environment file indiscriminately.

| Setting | Scope and purpose |
| --- | --- |
| `NEXT_PUBLIC_DEFAULT_SITE_NAME` | `liberty-mutual-agent-portal` |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en`; enable another locale only with matching CMS content and application routing |
| `SITECORE_EDGE_CONTEXT_ID` | Server-only SDK context: Live delivery access in production; Preview content access on the dedicated editing host |
| `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID` | Public-scoped child context containing only the required browser resources; never a master Live or Preview context |
| `NEXT_PUBLIC_SITECORE_EDGE_PLATFORM_HOSTNAME` | Approved Edge platform URL, normally `https://edge-platform.sitecorecloud.io` |
| `SITECORE_EDITING_SECRET` | Server-only editing endpoint secret, matching the authorized Sitecore rendering host |
| `PORTAL_SESSION_SECRET` | Server-only random signing secret of at least 32 characters; independently provision per environment |
| `PORTAL_OPERATOR_SECRET` | Separate server-only random reset secret of at least 32 characters; never available to portal users |
| `PORTAL_ENVIRONMENT` | Unique state namespace, for example `liberty-mutual-production` or `liberty-mutual-preview`; production and previews must not share it |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel-connected HTTP Redis credentials; aliases `PORTAL_REDIS_REST_URL` and `PORTAL_REDIS_REST_TOKEN` are also supported |
| `PORTAL_CONTENT_ADAPTER` | `sitecore` for connected environments; `fixtures` is allowed only outside Vercel and production |
| `PORTAL_VERIFIED_PROFILE_GENERATIONS` | Comma-separated generations actually imported and verified in this tenant; never infer from the presence of a JSONL file |
| `NEXT_PUBLIC_PORTAL_TRACKING_ENABLED` | Enable only after profile import, consent handling and native identity/event verification |

Sitecore master Live and Preview context IDs are secrets. The tenant's Context IDs UI also marks the Edge resource as private. The scoped `liberty-mutual-agent-portal-browser` context contains the Liberty Mutual Site Analytics identifier plus Files and Forms, which the UI automatically adds as required dependencies. It excludes Edge and DemoSite. The separate `liberty-mutual-agent-portal-server-live` and `liberty-mutual-agent-portal-server-preview` contexts include the corresponding private Edge resource and the same portal dependencies. Keep their values in protected server configuration. CI uses the private scoped Live context as a GitHub Actions secret, never as a public variable. See [Sitecore Context IDs](https://doc.sitecore.com/portal/en/developers/sitecore-cloud-portal/context-ids.html) and [scoped context management](https://doc.sitecore.com/portal/en/developers/sitecore-cloud-portal/context-ids/manage-scoped-context-ids.html).

The provisioned free Redis integration is connected to Vercel Production and Preview. Local development must receive its own provider configuration or explicitly use `PORTAL_STATE_ADAPTER=local-json`. Deployed instances fail clearly when no durable provider is configured; they never fall back to memory or an ephemeral filesystem. Shared preview namespaces are isolated from production but shared among previews; use a separate namespace per preview project when independent review sessions are required.

Do not enable verbose Sitecore editing diagnostics on a shared deployment: the upstream SDK's editing debug path can log secret comparisons. Keep secrets in protected configuration and review logging changes before enabling them.

## Build and continuous integration

Node.js 24 is required. `npm ci` installs the committed dependency graph. The app's `npm run build` generates the actual Sitecore component maps and SDK metadata before compiling Next.js. Generated `.sitecore` files are ignored build artifacts, not source files to edit by hand.

The active [workflow](../.github/workflows/portal-validation.yml) runs on feature pull requests to `main`, pushes to `main`, and manual dispatch. It pins third-party actions to reviewed commits, grants read-only repository permission and does not retain checkout credentials.

* **Offline validation** runs strict lint, meaningful domain/authorization/state/routing tests, read-only seed and UDL contract checks, and native CLI validation of the two owned serialization modules. Dependency and CLI restoration use public package networks; no tenant login is needed.
* **Connected production build** generates real SDK artifacts, typechecks and compiles against published Sitecore content. It requires repository **secret** `SITECORE_SERVER_EDGE_CONTEXT_ID` for the private scoped Live context and **variable** `SITECORE_PUBLIC_EDGE_CONTEXT_ID` for the scoped browser context. The optional variable `SITECORE_EDGE_PLATFORM_HOSTNAME` supplies a nondefault Edge URL. No editing, session, Redis or operator credentials are given to PR builds.

Missing public context fails the connected job explicitly. Offline checks do not produce a substitute build, and a skipped or unavailable connected build is not release approval. Configure GitHub branch protection to require both named jobs; configure one approving reviewer, approval of the latest push and resolved conversations. These repository settings must be checked after transfer.

The private scoped context used by CI can read published environment content; it is not browser-safe. Review workflow changes and repository collaborator access accordingly. Fork PRs do not receive repository secrets and cannot pass the connected build without an authorized build context. Never solve a failing PR build by exposing private Edge access, a master context, a Preview context or an administrative token in a public variable.

## Vercel release process

Configure the project root as `examples/liberty-mutual-agent-portal`, framework Next.js, Node.js 24, install command `npm ci`, build command `npm run build`, and production branch `main`. The platform generates output directories automatically.

1. Validate application and model changes in a feature branch. Deploy a preview using preview credentials and its own state namespace.
2. When model changes are needed, use the scoped CLI release below. Review the `--what-if` output before applying a schema change.
3. Publish approved CMS content through the native editorial process. Content publication is separate from Git deployment.
4. Verify preview behavior with the affected personas and reviewer packs, including native editing when its contract changed.
5. Merge the approved PR to `main`. Confirm the resulting Vercel deployment, then run the deployed acceptance checks below.

For a model release, run from the repository root with an authorized CLI environment already configured:

```sh
authoring/scripts/deploy-content.sh ENVIRONMENT --what-if
authoring/scripts/deploy-content.sh ENVIRONMENT
```

Normal releases push only `LibertyMutual.Model`, using `CreateAndUpdate` within the three owned model roots. The initial `--seed` option creates missing content only. The content module is `CreateOnly`; it never overwrites a marketer's existing item. `--publish` explicitly publishes the owned site and model roots. It does not include related items outside that scope. Never run a broad starter-wide serialization push for this portal.

### Dedicated editing host

The SDK's editing request headers select the page, language, version and edit mode; they do not replace its configured server context ID. The deployed editing host therefore needs a Preview server context, while production uses Live content. A Preview context was verified to return `pageEditing: true` with editable metadata for the owned home page; Live returned normal delivery fields.

Use a stable editing deployment alias and a separate state namespace. Allow Sitecore to reach that alias; other previews can retain Vercel Authentication. Both `/api/editing/config` and `/api/editing/render` remain protected by the editing secret. Tracking is suppressed for the verified editor route, whose operational data is a safe fixture without an agent identity.

The configuration script defaults to read-only and mutates only the dedicated rendering host and the owned site grouping:

```sh
node authoring/scripts/configure-portal-host.cjs ENVIRONMENT https://EDITING_HOST https://DELIVERY_HOST
node authoring/scripts/configure-portal-host.cjs ENVIRONMENT https://EDITING_HOST https://DELIVERY_HOST --apply
dotnet sitecore publish item -n ENVIRONMENT -p '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Settings/Site Grouping/liberty-mutual-agent-portal' -l en --pt Edge
```

It configures the application, rendering and configuration URLs; assigns that named host to the site; lists the delivery/editing hostnames; and preserves the existing analytics mapping. Regenerate SDK site metadata after publication. The initial CreateOnly seed stays environment-neutral; apply this host configuration after seeding a new tenant. Verify a real native editing canvas before recording editing acceptance.

Keep an environment-to-tenant mapping in the team's private operations inventory. The current UDL verification ledger is scoped to the Safeco Insurance Company of America POC organization and its actual tenant ID; importing its files into another tenant requires new verification and configuration.

## Reviewer accounts, profile identity and reset

There are seven named personas across four agency profiles and four isolated reviewer packs. The JSON credentials are intentionally fictional handoff material. The provisioning script converts them into salted scrypt hashes for server-only runtime verification. Rotate them by regenerating the hash file and redeploying; never re-use them for customer employees or real insureds.

Each action is scoped to the authenticated agency, reviewer pack and active run. Mutations require an idempotency key and expected state version. A stale tab receives a conflict and must refresh; retrying an identical successful action does not duplicate the work. Eight-hour signed HttpOnly sessions are distinct from native SDK cookies. Login and logout clear only the intended Sitecore identity cookies so another persona does not inherit the former browser identity.

The operator-only reset has two deliberate modes:

* `saved-work` starts a fresh operational run for the selected pack, retaining its native profile generation and prior native history.
* `restart` starts fresh operational work, advances to the next already-verified native profile generation and invalidates that pack's older application sessions. It does not erase native CDP history.

Use the [auth/data runbook](../examples/liberty-mutual-agent-portal/docs/auth-and-data.md) for exact reset commands, state expiry behavior and credential distribution. Reviewers should coordinate pack assignments: agents in one agency and pack intentionally share agency work.

The native import ledger records 112 successfully imported profiles for generations 0–3 in the current tenant. The import's correlation UUID differs from its opaque business identifier. Keep the `liberty-mutual-agent` provider and runtime identity mapping aligned. Do not re-run the export merely to refresh timestamps: new correlation IDs change the verified artifact checksum. Future imports require their own result record before enabling new reset generations.

## Runtime acceptance and evidence

Record the deployment URL, commit, tenant, tester, time, persona, pack and result for each check. Use native platform records or browser/network observations to substantiate native behavior.

| Area | Acceptance evidence |
| --- | --- |
| Access | Logged-out protected routes redirect; APIs return 401; fabricated editing flags do not disclose private data; unknown tenant/locale is rejected |
| Persona isolation | Principal, producer, account-manager and specialty views use the intended scope; another agency or reviewer pack cannot read or mutate the same record |
| Durable work | Create/save/submit, requirements, follow-up, service request and bond workflows survive reload and a new deployment; duplicate requests do not duplicate state |
| Native resource editing | Change an authored title or summary, publish, and verify browse/search/article views agree; favorites survive the metadata change |
| Native UDL | Log in, resolve the intended imported provider identity, observe an event on that profile, and verify switching personas creates the correct association |
| Native personalization | Inspect the published native rule/table, its actual profile context and the resulting component variant for positive and negative profiles |
| Native Search | Confirm the owned source indexes authored resource fields and returns relevant state/product guidance from native queries |
| Native Agentic Studio | Verify the campaign workflow and Brand Kit in the tenant, with inputs, generated output and human review recorded; no outbound delivery is implied |
| Session/reset | Logout clears the application session and intended SDK cookies; saved-work and restart resets behave as documented and cannot affect a different pack |
| Usability | Desktop/mobile, keyboard navigation, visible focus, form errors and empty states work; no dead action, placeholder label or unhandled server error remains |

Passing CI verifies code and content contracts. It does not prove that a customer tenant has the correct live decision table, source index or campaign configuration. Keep those acceptance results with the release record rather than treating configuration screens as automatic proof of an end-to-end outcome.

## Recovery and maintenance

For an application regression, promote the previous known-good Vercel deployment and verify its configuration remains compatible with the current model. Revert the code change through a PR. Rollback does not reset Redis work or unpublish CMS changes.

For an editorial regression, restore the appropriate native content version and republish after review. The CreateOnly seed is not a restore mechanism. For a model regression, apply a reviewed compatible correction; do not delete fields or widen module scopes as an emergency shortcut. Export durable state before a schema migration, and keep schema versions backward compatible across adjacent deployments.

Dependency updates arrive through Dependabot for the active app and GitHub Actions. Review SDK and Next.js changes together, run the normal checks, and repeat the affected native acceptance paths. Keep the lockfile committed. Monitor Vercel runtime failures, Redis availability/limits, native publishing/indexing status and session errors without logging passwords or full profile payloads.

## Customer ownership transfer

Transfer this repository and this Vercel project to the customer's chosen organization/team using the platforms' supported transfer flows. Re-check the current transfer prerequisites before execution. Transfer or recreate the Redis integration under customer ownership; project transfer alone must not be assumed to transfer its database or billing relationship.

Verify repository access, GitHub App installation scope, project linkage, branch protection, environment configuration, domains and deployment protection after transfer. Check that the customer controls the Sitecore organization, rendering host settings, Brand Kit, Search source, native decision tables and Agentic workflow. Re-import and reverify UDL identities if the destination tenant changes.

Provision fresh session, operator and integration secrets through the customer's approved channel, update the linked systems, verify operation and then revoke the former access. Deliver the synthetic credential list privately with reviewer-pack assignments and the reset runbook. Complete the same acceptance checks from a customer-owned account before closing handoff.
