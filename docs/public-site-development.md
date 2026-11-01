# Develop and release the two Liberty Mutual sites

The Agent Portal and the public website are separate SitecoreAI sites in one environment. Each has its own Next.js application, rendering host, Vercel project, URL, and analytics site identity. They share developer tooling and selected native content deliberately; deploying one application does not deploy the other.

| Responsibility | Agent Portal | Public website |
| --- | --- | --- |
| Application directory | `examples/liberty-mutual-agent-portal` | `examples/liberty-mutual-public-site` |
| Sitecore site name | `liberty-mutual-agent-portal` | `liberty-mutual-public-site` |
| Content root | `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal` | `/sitecore/content/LibertyMutual/liberty-mutual-public-site` |
| Vercel delivery URL | `https://liberty-mutual-agent-portal.vercel.app` | `https://liberty-mutual-public-site.vercel.app` |
| Site-specific components | `src/components` within the Portal application | `src/components` within the public application |

The public head derives from the official Content SDK `basic-nextjs` example already in this repository. The inspected repository baseline is `17a8080779a1ef83dc3f4f0047308582368d68c5`. The lockfiles specify Content SDK `2.3.0`, Sitecore tooling `2.2.1`, React `19.2.8`, public Next.js `16.3.2`, and Portal Next.js `16.3.3`. Use the delivered Git commit as the release identifier; `git rev-parse HEAD` shows the exact revision of a local checkout. Install from the lockfile rather than selecting newer package versions independently.

## Start the public website locally

Install Git, VS Code, and Node.js 24. A local Sitecore server, SQL Server, or Sitecore VM is unnecessary: the local frontend connects to the existing SitecoreAI environment.

1. Clone the team's repository, and open its root directory in VS Code.
2. Open a terminal, and change into `examples/liberty-mutual-public-site`. Application commands run in this directory; the repository root has no application `package.json`.
3. Install the locked dependencies, and create the ignored local configuration file:

   ```sh
   npm ci
   cp .env.example .env.local
   ```

4. Populate the configuration using the environment settings supplied by the project maintainer. Use the public site's name and the appropriate contexts; the table below explains each value's purpose.
5. Start the local application:

   ```sh
   npm run dev
   ```

6. Open `http://localhost:3000`. To use a secure local editing host, run `npm run dev:https`, and open `https://localhost:3000` after configuring the development certificate through the team's normal process.

For the Portal, change into `examples/liberty-mutual-agent-portal`, and follow its local setup instructions. Its login and saved-work features also require its workspace service configuration. The public site's configuration does not provide that service.

Run one application at a time on port 3000. When running both simultaneously, give one a different port, and select that application's actual origin in Page Builder. Each application has its own dependencies, `.env.local`, generated SDK files, and build output.

## Keep authoring and published delivery separate

| Public application value | Purpose |
| --- | --- |
| `SITECORE_EDGE_CONTEXT_ID` | Server Preview context used by signed Page Builder editing and SDK metadata generation |
| `SITECORE_EDITING_SECRET` | Signing secret that allows the editing host to validate Page Builder requests |
| `SITECORE_LIVE_EDGE_CONTEXT_ID` | Server Live context for ordinary pages, metadata, dictionaries, sitemaps, and content APIs |
| `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID` | Public Live browser context for Search, analytics, and personalization |
| `NEXT_PUBLIC_DEFAULT_SITE_NAME` | `liberty-mutual-public-site`, so this application serves the correct native site |
| `NEXT_PUBLIC_SITE_URL` | The current application's browsing origin, including its local port when developing |
| `PUBLIC_SITE_URL` | The canonical public delivery origin used in API and Search links |
| `NEXT_PUBLIC_PERSONALIZE_SCOPE` | The public site's independent personalization scope |

Preview requests are signed authoring requests. A Vercel Preview deployment still serves published content to an ordinary visitor; its environment name does not make draft content public. The application uses Live delivery explicitly outside signed editing requests.

The public site's publication integration additionally uses private Redis, webhook, and Search Ingestion settings described in the [publication integration guide](../examples/liberty-mutual-public-site/src/features/publication/README.md). Those values are server configuration. A frontend component edit does not require changing them.

## Edit a component in VS Code, and view it in Page Builder

1. Create a local Git branch for the change.
2. Start the public editing host with `npm run dev:https`.
3. Open the public site in SitecoreAI Page Builder, and select the local editing-host origin for the current browser session. This displays the local code against the shared authoring environment. Keep the site's shared hosted rendering-host configuration pointing to the deployed editing host.
4. Open a component such as `src/components/public-promotion/PublicPromotion.tsx`. Editable copy, images, links, and selected cards come from native Sitecore fields. Update the React markup or scoped styling while retaining the SDK field components and field metadata.
5. Observe the change through the local editing host. A local code change does not alter another developer's running application and does not publish content.
6. Restore the browser's editing-host selection to the hosted default after the local session. Stop the local server when it is no longer needed.

Use the SDK tooling to generate maps; do not edit `.sitecore/component-map` or other generated files manually. The `dev` and `build` commands already run the appropriate generation steps.

For a local production build:

```sh
npm run build
npm run start
```

This uses the production Next.js runtime locally. It still needs valid Live delivery settings and any services required by the selected feature. Native visitor testing, including personalization and analytics, additionally requires the appropriate browser context, visitor consent, and configured native rules.

## Release code, definitions, and content through their own paths

| Change | Release path | Result |
| --- | --- | --- |
| React, CSS, and application behavior | Review the Git branch, merge the approved change, and build the affected Vercel project | Updates that application's rendering code |
| Templates, rendering definitions, variants, and placeholder restrictions | Review serialized developer definitions, validate them, and deploy the named modules through SitecoreAI Deploy | Updates the native authoring contract |
| Page copy, images, navigation, promotions, and selected cards | Edit native content, complete Public Review, and publish the required dependencies | Updates published content without a frontend rebuild |

Both Vercel projects use this repository, with their own application root directories and environment settings. The SitecoreAI Deploy project uses `xmcloud.build.json` for the authoring solution. A Git-triggered deployment follows each project's configured branch and integration; the two rendering heads remain independently deployable.

Ordinary definition deployment includes `PublicWorkflow`, `PublicModel`, `PublicPresentation`, `PublicPartialPlaceholders`, and `PortalRelevancePresentation`, alongside the existing Portal developer modules. It excludes every `Seed` and `Bootstrap` module. The public Page/Partial Designs are developer-owned; their local Header/Footer Data is excluded from that definition deployment.

Installing definitions in the authoring environment and publishing them to Experience Edge are distinct steps. For initial setup or a schema change, publish the relevant template, rendering, and placeholder definition roots before publishing the content that uses them. Then publish the reviewed public content and its selected dependencies. An ordinary copy edit uses the content path alone; it does not require another code or schema deployment. The Portal's optional CLI publication targets only the Portal site, so it cannot publish the sibling public site by accident.

`PublicContentSeed` is an explicit **CreateOnly** installation operation. It creates missing factory items and preserves existing authored items. It is not a content reset. Restoring content is a separate, reviewed operation with before-images, native review, and publication. The factory snapshots do not replace backups of media binaries, profiles, Search configuration, Forms submissions, or hosting settings.

Existing approved Home, Bundling, Hero, Header, and Footer content was extended through new Draft versions. Their earlier versions and shared layouts are preserved. The dedicated fidelity helper uses versioned Final Renderings for the two existing pages and stops if it finds unexplained native layout decisions. Approval helpers execute native Submit and Approve commands, retain workflow history, and do not publish or write workflow states directly.

## Content ownership that authors can understand

- Page identity and metadata belong on the page item.
- Ordinary components and their Cards, Questions, and Links belong beneath that page's local Data folder. Ordered native Multilist selections determine their displayed order.
- The reusable **Bundle and save** Promotion is intentionally selected by both Home and Bundling.
- **Product availability notice** is one public-owned Disclosure item. Public components and the Agent Portal reference that same native item.
- Header navigation and Footer columns belong with their shared partial's Data.
- The Landing page branch creates independent blank local Hero and Introduction content. Its placeholders offer only the components appropriate to those regions.

Completing a content review and publishing the dependency are separate actions. Native workflow, permissions, media selection, and page creation should be checked using the intended author and approver accounts; administrator provisioning success alone does not prove those roles' access.

## Match Search technical keys to the configured schema

Search field display labels and technical keys are different. This environment's Push source accepts the lowercase technical names `title`, `question`, `summary`, `body`, `canonicalurl`, `sourceurl`, `nextstepurl`, `revision`, `owner`, `effectivedate`, `reviewdate`, `state`, `product`, and `audience`. A document's stable `id` is an operation property, outside its `fields` object.

The native Search datasource's mapping uses those same technical keys. For example, the UI's link maps to `canonicalurl`, and its effective-date value maps to `effectivedate`. A friendly label such as “Canonical URL” does not change the API key. The versioned public content API independently retains its camel-case properties, including `canonicalUrl` and `effectiveDate`; Search projection does not rename the public API contract.

## Verify before releasing

From the public application directory, run the applicable tests, linting, type checking, and production build. The public GitHub workflow includes visitor journey, analytics consent, structured-data, publication, health, and native-preservation tests. It also checks both native source generators and all Public/PortalRelevance serialization modules without CMS credentials.

After deployment, check the actual editing and delivery URLs. Create a page through the branch, edit its native fields, select media, insert allowed components, choose a variant, and save/reload. Publish a reviewed shared-content change, and observe its intended placements. The public Experience Edge OnEnd webhook expires rendered-page caches and synchronizes published answers into Search; the visitor's results and API response are the final verification points.

See [native model ownership](../authoring/items/liberty-mutual-public/README.md) and the [public application README](../examples/liberty-mutual-public-site/README.md) for component contracts, helper boundaries, and commands.
