# Liberty Mutual agent portal

A SitecoreAI sandbox prepared for customer handoff, for independent agents and the marketing and engineering teams who support them. The experience combines an authenticated agent workspace with native, editable Sitecore content. My workspace is the existing Sitecore Home page at `/`, which is also the sign-in destination. Account, policy and submission data are deliberately synthetic; changes persist within isolated reviewer packs.

The application is built on the official [SitecoreAI starter repository](https://github.com/Sitecore/xmcloud-starter-js), using the Content SDK and Next.js App Router. Original starters remain as upstream reference material. The active application and rendering host are **`examples/liberty-mutual-agent-portal`**.

Hosted workshops have **15 reviewer packs (`01`–`15`)**, each with the same seven personas: **105 fictional portal accounts**. Assign one pack per attendee and keep that suffix when switching personas. For a hosted presenter journey, coordinate use of an attendee’s pack and complete the guided work and its required cleanup before that attendee begins. Never reset a pack while an attendee is using it. The roles, licenses and four fictional agencies are unchanged. Each pack isolates saved work and native profile identities from other packs. The four native profile generations (`0`–`3`) remain separate from pack assignment. See the [login and reset runbook](examples/liberty-mutual-agent-portal/docs/auth-and-data.md#fictional-login-packs) for account names, shared-work boundaries and native import verification.

## Start here

| Audience | Guide |
| --- | --- |
| Developers starting on a new machine | [Local setup and component-edit workshop](docs/developer-quickstart.md) |
| Developers using an optional AI assistant | [SitecoreAI and Documentation MCP in VS Code](docs/vscode-sitecore-mcp.md) |
| Developers and platform administrators | [Developer handoff](docs/developer-handoff.md) |
| Marketers and content implementers | [Content model and publishing](docs/content-model.md) |
| Marketing and platform walkthrough | [Guided portal walkthrough](docs/marketing-walkthrough.md) |
| Form authors and integration owners | [Native Forms and webhook verification](docs/native-forms-operator-guide.md) |
| Presenters and review coordinators | [Nine demo loops: scripts, accounts and reset guidance](docs/demo-loops.md) |
| Campaign reviewers | [Agentic Studio campaign and native evidence](docs/agentic-studio/README.md) |
| Review coordinators and integration developers | [Authentication, data and reset runbook](examples/liberty-mutual-agent-portal/docs/auth-and-data.md) |
| Brand and content reviewers | [Brand sources and usage](docs/brand/README.md) |
| Contributors | [Branch and review workflow](CONTRIBUTING.md) |

## Run locally

Use Node.js **24.19.0**, npm, and the committed lockfile. Begin with a fresh authenticated clone of this private repository. The [developer quickstart](docs/developer-quickstart.md) covers access, VS Code, automatic POC context setup, and a reversible heading change that preserves native Search.

Open the repository root, `liberty-mutual-sitecoreai`, in VS Code. **The root has no `package.json`; npm commands must run inside the portal application.** In a terminal starting at the repository root, run:

```sh
cd examples/liberty-mutual-agent-portal
npm run setup:local
npm ci
npm run dev
```

`setup:local` creates `.env.local` with the approved scoped POC contexts before dependencies are installed. A rerun fills only missing/blank contexts and preserves existing values and secrets. `npm ci` installs dependencies using the committed lockfile. An `ENOENT` error referring to the root `package.json` means the terminal has not changed into the application directory. `npm install` also needs that directory and does not create the environment file.

Open `http://localhost:3000/login` and use the workshop’s `daniel.01` account with password `Sitecore`. Setup creates independent local secrets, a unique namespace, local JSON state, native content, and disabled portal tracking. Keep Redis credentials absent from every local environment file and your terminal: Redis takes precedence over local JSON. Each developer's saved work stays on their own machine; published content and native Search remain shared reads. Deployed environments require the configured HTTP Redis provider. The explicit fixture content adapter is an engineering-test seam, not a complete offline portal.

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
