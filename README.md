# Liberty Mutual agent portal

A SitecoreAI sandbox prepared for customer handoff, for independent agents and the marketing and engineering teams who support them. The experience combines an authenticated agent workspace with native, editable Sitecore content. Account, policy and submission data are deliberately synthetic; changes persist within isolated reviewer packs.

The application is built on the official [SitecoreAI starter repository](https://github.com/Sitecore/xmcloud-starter-js), using the Content SDK and Next.js App Router. Original starters remain as upstream reference material. The active application and rendering host are **`examples/liberty-mutual-agent-portal`**.

## Start here

| Audience | Guide |
| --- | --- |
| Developers and platform administrators | [Developer handoff](docs/developer-handoff.md) |
| Marketers and content implementers | [Content model and publishing](docs/content-model.md) |
| Marketing and platform walkthrough | [Guided portal walkthrough](docs/marketing-walkthrough.md) |
| Presenters and review coordinators | [Eight demo loops: scripts, accounts and reset guidance](docs/demo-loops.md) |
| Campaign reviewers | [Agentic Studio campaign and native evidence](docs/agentic-studio/README.md) |
| Review coordinators and integration developers | [Authentication, data and reset runbook](examples/liberty-mutual-agent-portal/docs/auth-and-data.md) |
| Brand and content reviewers | [Brand sources and usage](docs/brand/README.md) |
| Contributors | [Branch and review workflow](CONTRIBUTING.md) |

## Run locally

Use Node.js 24 and npm with the committed lockfile. Local authoring also requires access to this SitecoreAI tenant. Copy the environment template, then obtain the appropriate delivery context and editing secret through the team's approved credential channel.

```sh
cd examples/liberty-mutual-agent-portal
npm ci
cp .env.remote.example .env.local
# Configure .env.local as described in docs/auth-and-data.md.
npm run dev
```

Open `http://localhost:3000/login`. Review coordinators distribute the synthetic account credentials from the private fixture file; the website and API never publish the login list. For local development only, set `PORTAL_STATE_ADAPTER=local-json` and a unique `PORTAL_ENVIRONMENT`. Deployed environments require the configured HTTP Redis provider. Keep native Sitecore content enabled; the explicit local fixture content adapter exists for isolated engineering tests.

## Repository map

```text
examples/liberty-mutual-agent-portal/
  src/app/                  Routes, protected APIs and Sitecore editing endpoints
  src/components/           CMS-rendered components
  src/features/portal/      Agent workspace presentation and interactions
  src/contracts/            Public-safe UI/API contracts and stable taxonomy
  src/server/               Authentication, authorization, fixtures, CMS and state adapters
  fixtures/                 Synthetic accounts, operational data and UDL import artifacts
  scripts/                  Credential provisioning and operator reset tools
  docs/auth-and-data.md      Detailed integration and operations runbook

authoring/items/liberty-mutual/   Scoped content model and CreateOnly initial seed
authoring/scripts/                Validation and controlled CMS release tools
docs/brand/                      Source-backed brand and editorial assets
.github/workflows/               PR and main-branch validation
```

## Delivery model

Feature branches open pull requests to `main`. Both **Offline validation** and **Connected production build** must pass. The connected build requires the repository secret `SITECORE_SERVER_EDGE_CONTEXT_ID` for private scoped Live delivery access and the variable `SITECORE_PUBLIC_EDGE_CONTEXT_ID` for the scoped browser context. Missing configuration fails visibly; no stub Sitecore files are generated to make a build pass.

Vercel uses the application directory as its project root, `npm ci` for installation, `npm run build` for builds, and Node.js 24. Production and preview deployments require separate state namespaces. Deploying code does not publish marketing content or import profiles. Initial content creation is an explicit one-time action; normal model releases preserve marketer edits.

The [handoff guide](docs/developer-handoff.md) describes configuration, acceptance checks, rollback and ownership transfer. Native feature completion must be verified in the actual tenant and browser; a successful compilation alone is not that evidence.

## Provenance

The upstream license is retained in [LICENSE.MD](LICENSE.MD). Historical DMZ workflow instructions are archived under [docs/upstream](docs/upstream/ARCHIVE.md). Public SEO and crawler guidance from the starter is reference material and does not apply to the protected agent workspace. Brand assets are documented with their sources; they are not represented as customer-approved brand guidelines.
