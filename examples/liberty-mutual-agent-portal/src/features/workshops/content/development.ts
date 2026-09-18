import type { WorkshopGuide } from "../types";

const repository = "https://github.com/tohams/liberty-mutual-sitecoreai";
const appSource = `${repository}/blob/main/examples/liberty-mutual-agent-portal`;
const repositoryDocs = `${repository}/blob/main/docs`;
const portal = "https://liberty-mutual-agent-portal.vercel.app";
const preview =
  "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app";
const sitecore =
  "https://portal.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb";
const pageBuilder =
  "https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb";
const deployments =
  "https://vercel.com/thomas-lins-projects-67630b98/liberty-mutual-sitecoreai/deployments";

// This is documentation for an operator's deliberate status inspection. It is
// displayed as text and is never evaluated by the workshop application.
const inspectPackStatus = `node --input-type=module <<'NODE'
const { DEMO_PORTAL, WORKSHOP_PACK, PORTAL_OPERATOR_SECRET } = process.env;
if (!DEMO_PORTAL || !/^(0[1-9]|1[0-5])$/.test(WORKSHOP_PACK ?? '') || !PORTAL_OPERATOR_SECRET) {
  throw new Error('Confirm the host, assigned pack and protected operator environment first.');
}
const url = new URL('/api/portal/operator/reset', DEMO_PORTAL);
url.searchParams.set('reviewerPack', WORKSHOP_PACK);
const response = await fetch(url, {
  headers: { Authorization: 'Bearer ' + PORTAL_OPERATOR_SECRET },
  redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000)
});
if (!response.ok) throw new Error('Status lookup failed: HTTP ' + response.status);
const status = await response.json();
console.log(JSON.stringify({
  reviewerPack: status.reviewerPack,
  runId: status.runId,
  profileGeneration: status.profileGeneration,
  pendingRestart: status.pendingRestart ? {
    requestId: status.pendingRestart.requestId,
    phase: status.pendingRestart.phase,
    status: status.pendingRestart.status
  } : null
}, null, 2));
NODE`;

export const developmentGuides: WorkshopGuide[] = [
  {
    slug: "architecture-and-ownership",
    audience: "development",
    category: "Understand the implementation",
    title: "Architecture: follow an agent experience through the platform",
    summary:
      "Connect the portal you have seen to authored content, React components, native relevance services and saved work.",
    outcome:
      "Explain which service owns each part of the experience and which release path changes it.",
    duration: "15–20 minutes",
    personas: ["daniel"],
    prerequisites: [
      "Complete an agent walkthrough first, or sign in as Daniel to see My workspace, Learning & resources and Products & appetite.",
      "GitHub read access is needed for the linked implementation files. Your own Sitecore account is needed to inspect authoring; portal credentials do not grant that access.",
      "This is an inspection exercise. Do not change content, configuration, targeting or saved records.",
    ],
    links: [
      { label: "Open the agent portal", href: `${portal}/login` },
      { label: "Open the repository", href: repository },
      { label: "Open Page Builder", href: pageBuilder },
    ],
    steps: [
      {
        title: "Start with three visible experiences",
        action: [
          "Sign in as daniel.01 with password Sitecore. On My workspace, find Agency Growth. Open Learning & resources, then Products & appetite.",
          "Notice the distinction between the Agency Growth guidance card, the Resources A/B placement and the Products affinity banner.",
        ],
        expected: [
          "My workspace is the Sitecore Home item at /. It is not a separate /workspace page.",
          "Known UDL attributes guide Agency Growth; the separate Resources placement runs an A/B test; ProductSpotlight uses native affinity targeting. These do not grant transaction authority.",
        ],
      },
      {
        title: "Find the authored content and its React implementation",
        action: [
          "In Page Builder, select Liberty Mutual Agent Portal and keep the Default editing host. Inspect Home and Learning & resources without saving.",
          "In the repository, inspect src/components and the content model guide. Compare AgentGuidance, ResourceSearch, ResourceArticle, ResourceImage and ProductSpotlight with the rendered pages.",
        ],
        expected: [
          "Sitecore owns page fields, presentation and authored datasources. The Content SDK renders those fields through React and preserves native editing information.",
          "Default and Highlight are React exports. They are not audience names or experiment assignments. SDK component maps and metadata are generated; developers do not maintain them by hand.",
          "ResourceArticle uses the resource page itself for article content. Each article has a local Data/Resource image datasource; only ResourceImage is allowed in that article image slot.",
        ],
        links: [
          {
            label: "Content and component placement model",
            href: `${repositoryDocs}/content-model.md`,
          },
          {
            label: "Browse component implementations",
            href: `${repository}/tree/main/examples/liberty-mutual-agent-portal/src/components`,
          },
          {
            label: "Resource page branch and local image contract",
            href: `${repositoryDocs}/resource-page-authoring.md`,
          },
        ],
      },
      {
        title: "Trace content delivery separately from application hosting",
        action: [
          "Follow the authored page from SitecoreAI publication to Experience Edge, then to the Next.js application hosted on Vercel.",
          "Compare the production delivery URL with the designated editing preview. Production reads Live content; the configured editing preview reads Preview content.",
        ],
        expected: [
          "Experience Edge distributes published content separately from authoring. An authoring-only interruption need not prevent the website from reading previously published content.",
          "Sitecore operates its platform; Vercel operates hosting infrastructure. The application still depends on its code, configuration, identity, Search, decisioning and saved-work services.",
          "Managed services reduce infrastructure and upgrade work. They do not remove application dependency, access, integration or compatibility responsibilities. Contractual production SLAs are not a guarantee for this temporary POC or for the entire portal.",
        ],
      },
      {
        title: "Locate the operational integration boundary",
        action: [
          "Open src/contracts/portal.ts, src/server/data/portal.ts and src/server/state/store.ts.",
          "Compare the browser-facing PortalBootstrap and PortalAction contracts with the server authorization checks and the durable store.",
        ],
        expected: [
          "Insurance records and production history come from replaceable JSON-backed adapters. Submission actions illustrate workflows; they do not rate, bind, issue coverage or contact an underwriter.",
          "Protected server requests validate the signed-in agent, agency, reviewer pack and active run. expectedVersion detects stale work; idempotency keys avoid duplicate successful retries; Redis writes use atomic compare-and-set.",
          "Saved work persists across deployments until an explicit reset or instance deletion. Eight-hour login sessions are separate from that persistence.",
          "Contact your team uses native Sitecore Forms and its configured Demo Webhook. It does not create a portal action, Redis record, Salesforce write or email send in this sandbox.",
        ],
        links: [
          {
            label: "Portal API contracts",
            href: `${appSource}/src/contracts/portal.ts`,
          },
          {
            label: "Server actions and authorization",
            href: `${appSource}/src/server/data/portal.ts`,
          },
          {
            label: "Durable state implementation",
            href: `${appSource}/src/server/state/store.ts`,
          },
        ],
      },
      {
        title: "Understand identity, Search and personalization evidence",
        action: [
          "Read the identity and affinity contracts. Follow a signed-in browser identity to its current native UDL profile, then to the rule selecting authored content.",
          "Inspect ResourceSearch.tsx and its useSearch integration. Compare published article metadata with the separate Search source refresh process.",
        ],
        expected: [
          "An accepted IDENTITY event alone does not prove profile linking and decisioning are ready. A current native profile and rendered decision provide the next evidence.",
          "Products affinity scores build in SitecoreAI from tagged page views. The application sends the CMS route name; it does not calculate those scores in the browser.",
          "The native Top Affinity String checks all affinity groups, so another group or a tie can affect selection. Do not promise that decision-table row order breaks ties.",
          "Native Search returns indexed published resources. Resource publication and Search reindexing are separate; neither a source-code build nor a saved-work reset refreshes the index.",
          "Real navigation supplies page-view evidence for A/B testing. Link prefetch is disabled for the relevant portal links. Reported visits and goals are not proof of business lift or a winning variation.",
        ],
        links: [
          {
            label: "Identity and saved-work contract",
            href: `${appSource}/docs/auth-and-data.md`,
          },
          {
            label: "Native affinity implementation",
            href: `${repositoryDocs}/affinity-personalization.md`,
          },
          {
            label: "ResourceSearch implementation",
            href: `${appSource}/src/components/resource-search/ResourceSearch.tsx`,
          },
        ],
      },
      {
        title: "Assign the right owner to a proposed change",
        action: [
          "Classify a proposed change: editorial copy or image, React behavior, CMS model, native targeting/Search, or operational data integration.",
          "Use the release guide for the path that matches the change. Keep private server contexts, session secrets, editing secrets, operator credentials and Redis credentials outside browser code.",
        ],
        expected: [
          "Content authors review and publish ordinary content. Developers release frontend code through GitHub and Vercel. CMS definitions have their own scoped authoring release. Native configuration has its own publication or activation and runtime verification.",
          "The browser receives only its limited public child context. Local frontend development uses a separate local state namespace; changing a local editing secret does not register a new Page Builder host.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Sign out of the portal and close temporary inspection tabs. No reset, publication or redeployment is needed for this read-only exercise.",
      ],
    },
    related: ["state-authorization", "local-setup", "release-and-recovery"],
    sourceSlides: [
      33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 113, 114, 115, 116, 117, 118, 119,
      120, 121, 122,
    ],
  },
  {
    slug: "state-authorization",
    audience: "development",
    category: "Guided engineering exercise",
    title: "Authorization: one Florida draft, two different permissions",
    summary:
      "Create a shared draft as Avery, inspect Jordan’s restrictions, then trace the enforcement into the server.",
    outcome:
      "See that shared record visibility, current transaction authority and personalized content are separate concerns.",
    duration: "20–25 minutes",
    personas: ["avery", "jordan"],
    prerequisites: [
      "Use the designated preview and the same assigned reviewer suffix for Avery and Jordan. Pack 01 is reserved for presenters; attendees use their assigned pack from 02–15.",
      "Coordinate with anyone using that pack. Use a unique account name and a future effective date, and leave pre-existing records untouched.",
      "GitHub read access is required for the code trace. A coordinator handles any end-of-session saved-work reset.",
    ],
    links: [
      { label: "Open designated preview login", href: `${preview}/login` },
    ],
    steps: [
      {
        title: "Create a Florida Businessowners draft as Avery",
        action: [
          "Sign in as avery.01 with password Sitecore. Select Products & appetite → Risk state: Florida → Small business → Businessowners policy → Prepare account.",
          "Choose Retail, then Continue to account information. Enter a unique Named insured / account name, such as Cedar Ridge Florida Retail followed by your initials and today’s date.",
          "Choose a suitable future Requested effective date. Enter 8 for Number of employees and 800000 for Annual revenue ($). Select Save & review requirements.",
          "Record the reference and account name. Keep the record in Draft, close it, then use the name menu to Sign out.",
        ],
        expected: [
          "Avery can prepare a Florida BOP account. Florida and BOP remain the saved record’s context.",
          "The new record is Draft. Do not submit it yet: Jordan must inspect its draft controls before Avery completes it.",
        ],
      },
      {
        title: "Inspect the same draft as Jordan",
        action: [
          "Sign in as jordan.01 on the same preview host. Select Quote & submit and open the new Florida account using its name and reference.",
          "Read the state-authority explanation. Inspect Edit account, the three requirements checklist controls and Submit for review.",
        ],
        expected: [
          "Jordan can see the agency’s shared draft and its true Florida state.",
          "The message explains that current licenses do not authorize transactions in this state. Edit account, the checklist controls and Submit for review are disabled.",
          "The record is not silently converted to another state, assigned a different owner or hidden merely to avoid the authorization decision.",
        ],
      },
      {
        title: "Complete the unchanged draft as Avery",
        action: [
          "Close the draft and Sign out. Sign in as avery.01 and reopen the same reference in Quote & submit.",
          "Complete every displayed preparation requirement and select Submit for review. Reload the page and reopen the record.",
          "Record the status, reference and Florida state, then Sign out.",
        ],
        expected: [
          "Avery can complete and submit the same shared record. Its reference and Florida context persist as Submitted.",
          "This is an illustrative operational workflow using fictional account data; it does not send a submission to an insurance system.",
        ],
      },
      {
        title: "Trace the decision into the server",
        action: [
          "Open src/contracts/portal.ts, then src/domain/eligibility.ts in the application. Inspect the dated license, product/state and appointment decisions.",
          "Open src/server/data/portal.ts and src/server/data/eligibility-authorization.test.ts. Locate the checks for the actor, agency, assigned producer, saved jurisdiction and current requirements.",
          "Open src/server/state/store.ts to inspect environment/pack/run/agency scoping, expected versions, idempotency and atomic writes.",
        ],
        expected: [
          "Current authority uses the current UTC date and inclusive license validity boundaries. An old draft can become restricted if authority or product rules change.",
          "Denied direct-request tests require HTTP 403 and unchanged records/versions. Disabled buttons make the rule visible; the server enforces it.",
          "Content personalization cannot override licensing or transaction authorization. Production systems would supply the approved authority data through integrations.",
        ],
        links: [
          {
            label: "Eligibility rules",
            href: `${appSource}/src/domain/eligibility.ts`,
          },
          {
            label: "Server enforcement tests",
            href: `${appSource}/src/server/data/eligibility-authorization.test.ts`,
          },
          {
            label: "Server actions",
            href: `${appSource}/src/server/data/portal.ts`,
          },
          {
            label: "Durable store",
            href: `${appSource}/src/server/state/store.ts`,
          },
        ],
      },
    ],
    cleanup: {
      body: [
        "Keep the created account name and reference with your session notes. A coordinator may restore saved work for this one preview pack after every affected reviewer has finished.",
        "Do not reset another pack or the production host. The reset affects all seven personas and all agencies in the selected pack; it preserves native profiles and affinity/A/B history.",
      ],
    },
    related: [
      "release-and-recovery",
      "saved-work-reset",
      "architecture-and-ownership",
    ],
    sourceSlides: [43, 44, 45, 114, 115],
  },
  {
    slug: "local-setup",
    audience: "development",
    accountScope: "local",
    category: "Individual developer workshop",
    title: "Local setup: clone, configure and run the portal",
    summary:
      "Run the frontend against hosted Sitecore content and Search with isolated work on your own machine.",
    outcome:
      "Open a working local portal without installing a local CMS, VM, Docker or .NET runtime.",
    duration: "20–30 minutes after tools are installed",
    personas: ["daniel"],
    prerequisites: [
      "Install Git, VS Code and Node.js 24.19.0 with its included npm. The app’s .nvmrc records that version; a Node version manager is optional.",
      "Authenticate Git or VS Code to your approved GitHub account with read access to the private repository. GitHub CLI and write access are not required for the local exercise.",
      "Allow Internet access to GitHub, npm and the hosted Sitecore content/Search services.",
      "Use a new checkout for the exercise. Preserve any existing checkout containing your work; do not delete it to make room.",
    ],
    links: [{ label: "Open the private repository", href: repository }],
    steps: [
      {
        title: "Check the tools in a new terminal",
        action: [
          "After installing or selecting Node, open a new terminal so it receives the updated PATH. Run these version checks separately.",
          "If Node is a different version, select 24.19.0 with your installer or existing version manager before continuing.",
        ],
        code: "node --version\nnpm --version\ngit --version",
        expected: [
          "Node reports v24.19.0. npm and Git each report an installed version. TypeScript will be installed with the application; no global TypeScript installation is needed.",
        ],
      },
      {
        title: "Clone into your projects directory and make a personal branch",
        action: [
          "From a parent directory where you keep projects, clone the repository. Authenticate with your approved GitHub account if prompted.",
          "Replace your-name in the branch command with your own lowercase identifier. Creating this local branch does not deploy anything.",
          "Alternatively, use VS Code → View → Command Palette → Git: Clone, select the same repository and open it.",
        ],
        code: "git clone https://github.com/tohams/liberty-mutual-sitecoreai.git\ncd liberty-mutual-sitecoreai\ngit switch -c workshop/your-name-resource-search",
        expected: [
          "The repository root contains examples, authoring, docs and .github. Your workshop branch is separate from main.",
        ],
      },
      {
        title: "Open the root in VS Code; move the terminal into the app",
        action: [
          "Select File → Open Folder and choose liberty-mutual-sitecoreai, the repository root. Select Terminal → New Terminal.",
          "Keep that root open in Explorer. In the integrated terminal, run the directory change below once before any npm command.",
        ],
        code: "cd examples/liberty-mutual-agent-portal",
        expected: [
          "Explorer still shows the whole repository, while the terminal now points to liberty-mutual-sitecoreai/examples/liberty-mutual-agent-portal.",
          "The application directory contains package.json and package-lock.json. The repository root has no package.json; npm run or npm install there would fail with ENOENT.",
        ],
      },
      {
        title: "Let the setup helper prepare local configuration",
        action: [
          "From the application terminal, run npm run setup:local. It uses Node built-ins and can run before dependencies are installed.",
          "Open examples/liberty-mutual-agent-portal/.env.local in VS Code to inspect the variable names and settings. Keep the file and its values private.",
          "Confirm local-json state, sitecore content, the localhost origin and disabled tracking. Leave all Redis URL/token settings absent from every local environment file and from the terminal environment.",
        ],
        code: "npm run setup:local",
        expected: [
          "Fresh setup reports Created and fills this POC’s approved, distinct server Live and public browser contexts automatically. No manual context entry is required.",
          "It generates independent session, operator and editing secrets, a unique PORTAL_ENVIRONMENT, PORTAL_STATE_ADAPTER=local-json, PORTAL_LOCAL_STATE_DIRECTORY=.portal-state and NEXT_PUBLIC_PORTAL_TRACKING_ENABLED=false.",
          "Rerunning fills missing or blank contexts, preserves nonempty values and other settings, or reports left unchanged. A conflicting or ambiguous environment stops safely for review.",
          "Saved work stays in your ignored .portal-state directory without automatic expiry. Published content and Search remain shared services. Do not copy a deployed .env file or shared Redis credentials into this checkout.",
        ],
        note: "Redis settings take precedence over local JSON. Resolve any setup warning rather than bypassing it. A generated local editing secret does not change Sitecore’s configured editing host.",
      },
      {
        title: "Install the locked dependencies and align VS Code",
        action: [
          "Run npm ci in the same application directory. This installs the committed dependency versions; it does not replace setup:local.",
          "Open examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx. If prompted to use workspace TypeScript, select Allow.",
          "Otherwise select View → Command Palette → TypeScript: Select TypeScript Version → Use Workspace Version. Confirm 5.9.3 for this lockfile.",
        ],
        code: "npm ci",
        expected: [
          "Dependencies install from package-lock.json. The editor and command-line checks use the application’s TypeScript version. npm install would also require the app directory and would not create .env.local.",
        ],
      },
      {
        title: "Start the frontend and sign in locally",
        action: [
          "Run npm run dev and leave its terminal running. Wait for Ready, then open the local login link.",
          "Sign in as daniel.01 with password Sitecore. Each separate local checkout may reuse this login because its saved-work files are isolated.",
          "Select Learning & resources. Find What can we help you find? and the My licensed states default.",
        ],
        code: "npm run dev",
        links: [
          {
            label: "Open http://localhost:3000/login",
            href: "http://localhost:3000/login",
          },
        ],
        expected: [
          "The command generates Content SDK component maps, site metadata and import maps, then starts Next.js and the component-map watcher.",
          "The local portal reads published content and native Search. Daniel’s resource scope includes Illinois, Texas and nationwide guidance.",
          "Native tracking and personalization are disabled for this isolated local exercise. Use the configured HTTPS portal for UDL, affinity and A/B walkthroughs.",
        ],
        note: "Use HTTP, not HTTPS, for this local server. If Next.js selects another port, update NEXT_PUBLIC_SITE_URL to that local origin and restart. Leave Page Builder’s Default editing host unchanged.",
      },
    ],
    cleanup: {
      body: [
        "Continue to the component exercise with this terminal and browser. If stopping here, use Daniel Ortiz → Sign out, then Ctrl+C in the terminal.",
        "Keep .env.local and .portal-state to reuse the setup, and keep them out of Git. This setup needs no shared portal reset or CMS publish.",
      ],
    },
    related: ["component-development", "vscode-mcp"],
    sourceSlides: [40, 47, 48, 49, 50, 127],
  },
  {
    slug: "component-development",
    audience: "development",
    accountScope: "local",
    category: "Individual developer workshop",
    title: "Component development: edit, observe, test and restore",
    summary:
      "Change one heading in ResourceSearch while its native Search integration continues to work.",
    outcome:
      "Experience the local React feedback loop and verify a small change without publishing shared content.",
    duration: "20–30 minutes",
    personas: ["daniel"],
    prerequisites: [
      "Finish Local setup and keep the repository root open in VS Code. Run all commands from examples/liberty-mutual-agent-portal.",
      "Use your own clean workshop branch and the local browser. The default exercise is an uncommitted, reversible edit.",
      "Leave Sitecore Page Builder’s Default editing host unchanged. This exercise needs no CMS publish, shared CDP training or deployment.",
    ],
    links: [
      {
        label: "Open local Learning & resources",
        href: "http://localhost:3000/resources",
      },
    ],
    steps: [
      {
        title: "Record the native Search baseline",
        action: [
          "In your local browser, sign in as daniel.01 with password Sitecore. Select Learning & resources.",
          "Confirm the heading What can we help you find? Enter workers compensation and click Search.",
          "Keep My licensed states selected and record the Illinois, Texas and nationwide result titles you see.",
        ],
        expected: [
          "Native Search returns the currently published, indexed resources within Daniel’s licensed scope. Record actual titles rather than relying on a fixed result count, because the shared catalog can change.",
        ],
      },
      {
        title: "Find the code-owned heading",
        action: [
          "Open examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx in VS Code.",
          "Locate the existing h2 shown below. Inspect the surrounding useSearch integration without changing hooks, filters, fields or registration.",
        ],
        code: "<h2>What can we help you find?</h2>",
        expected: [
          "The heading is literal React text. Resource article titles, summaries and bodies are authored in Sitecore; changing this heading does not edit those content items.",
        ],
      },
      {
        title: "Change only the heading and save",
        action: [
          "Replace only the text inside the existing h2 with Find guidance for your next client conversation. Preserve the element and surrounding code.",
          "Save the file and return to the same localhost browser tab.",
        ],
        code: "<h2>Find guidance for your next client conversation</h2>",
        expected: [
          "Fast Refresh displays the new heading without a CMS publish or remote deployment. If the tab has been idle, reload once and confirm its address still starts with http://localhost.",
        ],
      },
      {
        title: "Verify the integrated behavior still works",
        action: [
          "Click Search with the same workers compensation query. Under Risk state, select Illinois.",
          "Compare the results to the baseline. Return to My licensed states after the comparison.",
        ],
        expected: [
          "Illinois and nationwide guidance remain; the Texas-specific result drops out when Illinois is selected. The one-line copy edit has not changed native retrieval or licensing filters.",
        ],
      },
      {
        title: "Review the diff and run the application checks",
        action: [
          "Stop the development server with Ctrl+C. Run each command below separately from the application directory and review its result.",
          "Use VS Code Source Control as well as the component diff. Do not stage environment files, .portal-state, generated .sitecore files or generated metadata.",
        ],
        code: "git diff -- src/components/resource-search/ResourceSearch.tsx\nnpm test\nnpm run test:setup\nnpm run lint\nnpm run type-check\nnpm run build",
        expected: [
          "The component diff contains only the intended heading. Tests, lint, TypeScript and the connected build pass before the change is considered ready.",
          "npm run build regenerates SDK artifacts, compiles the app and checks browser bundles for configured private values. A successful build is not a deployment or a native-service acceptance test.",
          "Authenticated npm start requires a properly configured durable store. The app deliberately rejects local-json in production mode; use npm run dev for this local workshop.",
        ],
        note: "If type checking runs before any development start or build in a fresh checkout, first run npm run sitecore-tools:generate-map and npm run sitecore-tools:build. The local setup guide already starts the development server.",
      },
      {
        title: "Restore only your exercise edit",
        action: [
          "Review the diff. If this file contains only the uncommitted workshop edit, run the restore command below. If it also contains other work, manually restore only this heading instead.",
          "Restart npm run dev. In Learning & resources, click Clear filters, erase the query text, then click Search.",
          "Confirm the original heading and default licensed-state resource view. Use Daniel Ortiz → Sign out, then stop dev with Ctrl+C.",
          "Run npm run build once more with dev stopped to return generated metadata to the build state. Leave generated next-env.d.ts changes out of a commit.",
        ],
        code: "git restore -- src/components/resource-search/ResourceSearch.tsx\nnpm run dev",
        expected: [
          "The original heading returns. Clear filters resets facets but does not erase the typed query; clearing both restores the baseline view. Only the intended exercise file was restored.",
        ],
      },
      {
        title: "Optional: let the coordinator demonstrate a hosted preview",
        action: [
          "If requested, the Vercel Hobby project owner reproduces the reviewed one-line edit, makes their own commit on a workshop branch and opens a pull request.",
          "The coordinator verifies CI, the exact Vercel source commit, configured preview credentials, durable state and an isolated namespace before testing the preview URL.",
        ],
        expected: [
          "A local commit, a GitHub push and a deployed preview are separate events. GitHub write access alone does not establish deployment eligibility for the private Hobby project.",
          "The branch preview does not automatically become the Page Builder editing host. The exercise requires no production merge or authoring-environment deployment.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Keep your local setup and state files private and untracked. No shared saved-work reset, new-profile restart or CMS restoration is needed for the default local exercise.",
        "If a coordinator created a shared preview, close the unmerged practice PR and follow the agreed branch cleanup process. Do not force-push shared work or merge a practice edit into main merely to finish the workshop.",
      ],
    },
    related: ["local-setup", "vscode-mcp", "release-and-recovery"],
    sourceSlides: [51, 52, 53, 54, 127],
  },
  {
    slug: "vscode-mcp",
    audience: "development",
    accountScope: "local",
    category: "Optional developer tools",
    title: "VS Code MCP: connect documentation, content and code",
    summary:
      "Use two remote MCP connections for a read-only explanation grounded in this portal and current Sitecore documentation.",
    outcome:
      "Inspect real Sitecore results beside the local ResourceSearch component and propose a change without making it.",
    duration: "15–20 minutes",
    personas: [],
    prerequisites: [
      "Open the liberty-mutual-sitecoreai repository root in a current VS Code with MCP support and approved Copilot Chat access in Agent mode.",
      "Use your own Sitecore account with a SitecoreAI application Admin role and access to Safeco Insurance Company of America POC.",
      "Have an approved Google account for the Documentation MCP’s separate sign-in. Organization policy must allow both connections.",
      "MCP is optional. The Node/npm exercise is unchanged, and the local development server may remain stopped. Portal agent logins do not authorize these developer connections.",
    ],
    links: [
      {
        label: "Open the checked-in configuration example",
        href: `${repositoryDocs}/examples/mcp.vscode.json`,
      },
      {
        label: "Official Sitecore Marketer MCP setup",
        href: "https://doc.sitecore.com/sai/en/users/sitecoreai/sitecore-marketer-mcp-server.html",
      },
      {
        label: "Open Sitecore Documentation",
        href: "https://doc.sitecore.com",
      },
    ],
    steps: [
      {
        title: "Create or merge the root workspace configuration",
        action: [
          "Select View → Command Palette → MCP: Open Workspace Folder MCP Configuration.",
          "Merge these two servers into the existing servers object, preserving other entries, and save as .vscode/mcp.json at the repository root.",
        ],
        code: '{\n  "servers": {\n    "liberty-mutual-sitecoreai": {\n      "type": "http",\n      "url": "https://marketer.sitecorecloud.io/mcp/marketer-mcp-prod"\n    },\n    "sitecore-documentation": {\n      "type": "http",\n      "url": "https://sitecore.mcp.kapa.ai"\n    }\n  }\n}',
        expected: [
          "The active configuration is under the root .vscode directory, not the app folder. The repository’s docs/examples/mcp.vscode.json is an inactive example.",
          "No password, Edge context, editing secret or bearer token belongs in this file. Use type and url; VS Code handles OAuth separately, without an auth property.",
        ],
      },
      {
        title: "Start the Sitecore connection and choose the actual tenant",
        action: [
          "Run MCP: List Servers → liberty-mutual-sitecoreai → Start Server. Review any trust prompt and the browser authorization request.",
          "Sign in with your own Sitecore account. For the intended connection, choose Allow Access, then Safeco Insurance Company of America POC and its SitecoreAI tenant for this portal.",
          "Return through Open Visual Studio Code. Review the displayed OAuth scopes before authorizing; this connection has requested openid, email, profile and offline_access.",
        ],
        expected: [
          "The authorization selects the tenant. The descriptive name liberty-mutual-sitecoreai in your local file does not select it.",
          "These OAuth scopes support account authorization; they are not an instruction to modify content. Tenant roles and the tools you allow govern the exercise.",
        ],
      },
      {
        title: "Start the documentation connection and select read tools",
        action: [
          "Run MCP: List Servers → sitecore-documentation → Start Server. Complete the separate Google sign-in when prompted and return to VS Code.",
          "Open Chat → Agent → Configure Tools, or Configure Chat → Tools where that label is shown.",
          "Enable the documentation query tools and only the necessary Sitecore read tools. Keep create, update, delete and publish tools disabled.",
        ],
        expected: [
          "Documentation authentication does not authorize the Liberty Mutual tenant. Server trust and approval of an individual tool call remain separate decisions.",
        ],
        note: "If startup fails, use MCP: List Servers → the server → Show Output. Check configuration syntax, account access, network and company policy. Avoid adding a duplicate connection through Ask AI → MCP if this configuration already defines it.",
      },
      {
        title: "Ask for documentation evidence",
        action: [
          "Start a new Agent chat and submit the prompt below. Inspect the actual tool result, open its source links and check the applicable SDK version.",
        ],
        code: "Use sitecore-documentation to explain how Sitecore Content SDK components render datasource fields and how placeholder restrictions work. Link the current official documentation. Do not change files or Sitecore content.",
        expected: [
          "A documentation tool call and relevant official links support the answer. An unsupported prose answer alone is not proof that the connection worked.",
        ],
      },
      {
        title: "Inspect the real portal site and Resources page",
        action: [
          "Submit the prompt below. Use returned site and page IDs; stop and correct tenant selection if liberty-mutual-agent-portal is absent.",
        ],
        code: "Use liberty-mutual-sitecoreai to list the available sites. Find liberty-mutual-agent-portal and show its site ID and content root. Find the Resources page and show its component names, datasource paths and allowed components for each placeholder. Use read tools only. Do not change or publish content.",
        expected: [
          "Actual native results identify the intended site and page. Relevant tools include list_sites, get_all_pages_by_site, get_components_on_page, get_allowed_comps_by_ph and get_content_item_by_path.",
          "The assistant should state when a detail is unavailable, rather than invent an ID. search_site searches page names, not arbitrary body text.",
        ],
      },
      {
        title: "Connect the results to the checked-out component",
        action: [
          "Open examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx in VS Code and submit the prompt below.",
          "Compare the answer with the file and the native results. Keep this exercise at a proposed change; the component guide covers applying and testing it.",
        ],
        code: "Use the Sitecore results, sitecore-documentation and ResourceSearch.tsx in this workspace to explain which resource-search content is authored in Sitecore and which text lives in code. Compare the implementation with the current Content SDK guidance. Propose one small heading edit, with the file path and relevant documentation links. Do not edit files or Sitecore content.",
        expected: [
          "The answer distinguishes CMS fields from React text and cites the local implementation. Local file inspection is a VS Code capability; the remote servers do not themselves read your checkout.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Start a New Chat. Run MCP: List Servers → each server → Stop Server. Stopping a server does not revoke account authorization; use the client’s account controls when intentionally disconnecting.",
        "A read-only exercise needs no content reset. Local JSON resets cannot undo changes to shared Sitecore content. Treat retrieved text as evidence, and review tool arguments before authorizing any later write.",
      ],
    },
    related: ["component-development", "resource-taxonomy"],
    sourceSlides: [123, 124, 125, 126],
  },
  {
    slug: "release-and-recovery",
    audience: "development",
    category: "Understand the implementation",
    title:
      "Releases: follow code, content and configuration on their own paths",
    summary:
      "Inspect real release evidence, then choose the appropriate release or recovery procedure for a proposed change.",
    outcome:
      "Distinguish CI success, deployed code and native runtime acceptance without triggering a release during the walkthrough.",
    duration: "20–25 minutes",
    personas: [],
    prerequisites: [
      "GitHub read access and permission to view the Vercel project. Your own authorized Sitecore account is needed for native inspection.",
      "This walkthrough is read-only. Deployments, model changes, host changes, publication and rollback are separate coordinator-approved operations.",
      "The temporary evaluation is not a production handoff. Future operating standards are discussion points, not required attendee setup.",
    ],
    links: [
      {
        label: "Open historical release PR #21",
        href: `${repository}/pull/21`,
      },
      { label: "Open current Vercel deployments", href: deployments },
      {
        label: "Open the release runbook",
        href: `${repositoryDocs}/developer-handoff.md#vercel-release-process`,
      },
    ],
    steps: [
      {
        title: "Connect a code change to its independent checks",
        action: [
          "Open PR #21 → Conversation. Expand the successful checks beside commit cac3e38, historically shown as 4 / 4 checks OK.",
          "Inspect Offline validation and Connected production build. Follow the Vercel status row’s Details link to the deployment, rather than relying only on the PR Checks tab.",
        ],
        expected: [
          "Offline validation checks source behavior and owned serialization contracts. Connected production build generates real SDK artifacts and compiles against published content.",
          "The historical affinity change merged as b99e3ca. Its successful record does not prove a later release; inspect the current source commit separately.",
          "Workflow YAML defines checks but does not establish enforced repository review policy. Required jobs, latest-push review and direct/force-push restrictions must be verified in remote repository settings.",
        ],
        links: [
          {
            label: "Inspect Portal validation workflow",
            href: `${repository}/blob/main/.github/workflows/portal-validation.yml`,
          },
        ],
      },
      {
        title: "Compare Ready with native runtime evidence",
        action: [
          "In Vercel, record the deployment’s environment, source commit and Ready status. Open the corresponding portal URL.",
          "Open the September 13 native affinity verification record and compare its exact host and commit to the historical release.",
          "For a new release, separately record its tester, time, persona, pack and affected journeys. Do not reuse an older native result as evidence for a new commit.",
        ],
        expected: [
          "A build, a deployed application and verified native identity/Search/decisioning are distinct checkpoints.",
          "Queued or Building is not Ready. A Ready deployment still needs relevant runtime checks, including authorization and saved work when those paths change.",
        ],
        links: [
          { label: "Open the production portal", href: `${portal}/login` },
          {
            label: "Read historical native runtime evidence",
            href: `${repositoryDocs}/qa-affinity-personalization-2026-09-13.md`,
          },
        ],
      },
      {
        title: "Choose the frontend or editorial path",
        action: [
          "For React, styles or server-code changes, review a branch/PR, the two CI jobs and a correctly configured Vercel preview before an approved merge to main.",
          "For ordinary page text, layout or image changes, use native authoring review and publication to Experience Edge. Reindex Liberty Mutual Agent Resources only when indexed fields change.",
        ],
        expected: [
          "Vercel’s Git integration deploys the configured branch. The app root is examples/liberty-mutual-agent-portal, with Node 24, npm ci and npm run build.",
          "A local commit alone deploys nothing. A Git push does not automatically run a Sitecore authoring deployment; its trigger must be configured separately.",
          "Native editorial publication does not need an ordinary frontend rebuild. Native Search and decisioning configuration retain their own refresh or activation steps.",
          "The SitecoreAI Vercel Deploy App or hosting-provider connection is a separate integration to verify; Git-connected Vercel deployment alone does not prove that connection is configured.",
        ],
      },
      {
        title: "Inspect the owned CMS model scope before a model release",
        action: [
          "Read authoring/scripts/deploy-content.sh and xmcloud.build.json from the repository root. Review their owned paths and the runbook’s --what-if procedure; do not apply it during this inspection.",
          "Compare the Model, SitePresentation and SupportForm definitions with the CreateOnly Content, Taxonomy and ResourcePageBranch seeds and the separately provisioned CampaignPageBranch.",
        ],
        expected: [
          "The current scoped CLI updates owned model definitions and exact presentation restrictions. It does not broadly overwrite authored pages or shared Sitecore trees.",
          "Initial content, taxonomy and the editable Resource page branch remain outside Items as Resources. CreateOnly adds missing seed items and preserves existing authored content; it is not a restore mechanism.",
          "The authoring resource package includes nextjs-starter, LibertyMutual.Model, LibertyMutual.SitePresentation and LibertyMutual.SupportForm. renderingHosts is empty because Vercel hosts the frontend and editing alias.",
          "A future integrated authoring deployment uses reviewed Git source and SitecoreAI Deploy configuration. It still requires schema, rendering and editing checks separate from Vercel.",
        ],
        links: [
          {
            label: "Inspect scoped CMS release script",
            href: `${repository}/blob/main/authoring/scripts/deploy-content.sh`,
          },
          {
            label: "Inspect authoring build configuration",
            href: `${repository}/blob/main/xmcloud.build.json`,
          },
        ],
      },
      {
        title: "Keep the Page Builder editing host intentional",
        action: [
          "In Page Builder, inspect the configured Default editing host. Keep it unchanged for local development.",
          "For a future intentional host change, have the platform owner review configure-portal-host.cjs without --apply first, using the intended CLI environment, editing origin and delivery origin.",
        ],
        expected: [
          "The registered alias must be reachable by Sitecore, use the Preview server context and matching editing secret, and keep its own state namespace.",
          "A branch preview or localhost is not automatically a registered editing host. An intentional host change requires its own application, site-grouping publication, SDK metadata regeneration and real canvas verification.",
          "Editing routes suppress engagement tracking and use safe fixture data; editing access does not grant operational account access.",
        ],
        links: [
          {
            label: "Inspect editing-host maintenance procedure",
            href: `${repositoryDocs}/developer-handoff.md#dedicated-editing-host`,
          },
        ],
      },
      {
        title: "Choose recovery for the layer that changed",
        action: [
          "For an application regression, coordinate a compatible known deployment and a reviewed source-code revert. For an editorial regression, restore the intended native version, review and republish it.",
          "For model changes, apply a compatible correction in the owned scope. Protect durable data before any schema migration.",
          "Discuss future monitoring, dependency triage, patch approval and escalation ownership separately from this temporary evaluation.",
        ],
        expected: [
          "Application rollback does not reset Redis, undo CMS publication or reverse experiment history. Saved-work reset cannot restore authored content.",
          "The repo already includes a lockfile, weekly Dependabot, pinned CI actions, bounded service requests and checks for configured private values in browser bundles. A production operating model would add its own monitoring, support and security acceptance.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close engineering inspection tabs. No redeploy, rollback, credential change, content publish or reset is needed for this walkthrough.",
      ],
    },
    related: [
      "architecture-and-ownership",
      "state-authorization",
      "component-development",
      "saved-work-reset",
    ],
    sourceSlides: [41, 42, 46, 128, 129, 130, 131, 132, 133],
  },
  {
    slug: "resource-taxonomy",
    audience: "development",
    category: "Content administration",
    title: "Resource metadata: inspect the author-managed choices",
    summary:
      "Trace readable dropdown labels to stable Search values and see why the custom Marketplace panel preserves text fields.",
    outcome:
      "Know where to maintain the vocabulary without accidentally broadening state authority or breaking indexed content.",
    duration: "10–15 minutes",
    personas: [],
    prerequisites: [
      "Use your own Sitecore account with the approved administrator/owner access for this installed Marketplace app.",
      "Inspect without editing by default. Coordinate any actual shared taxonomy or resource-version change with the content owner.",
      "Portal login and documentation access do not grant Sitecore editing permissions. Restricted-author access for this app requires separate acceptance.",
    ],
    links: [
      { label: "Open the Sitecore organization", href: sitecore },
      { label: "Open Page Builder", href: pageBuilder },
    ],
    steps: [
      {
        title: "Find the shared lists in Content Editor",
        action: [
          "From the organization’s SitecoreAI instance, open Content Editor. Navigate to /sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy.",
          "Open Risk states → TX. Inspect its item name, Display name and Description without changing them.",
        ],
        expected: [
          "TX is the stable canonical value; Texas is the readable label. The Description explains when authors should choose it.",
          "These taxonomy items remain editable CMS content and are excluded from Items as Resources. Normal application/model releases preserve them.",
        ],
      },
      {
        title: "See the choices in the installed Page Builder panel",
        action: [
          "In Page Builder, select Liberty Mutual Agent Portal → Learning & resources → an existing resource article. Confirm its language and version.",
          "Open Apps → Resource metadata. Inspect Risk state, Business family, Product, Distribution channel and Resource type.",
          "Select the Learning & resources landing page to see the panel’s non-resource guard, then return to the article.",
        ],
        expected: [
          "The five dropdowns each permit one choice. They are supplied by the managed taxonomy; Cross-state guidance stores All and does not bypass licensed-state filtering.",
          "The panel targets ResourcePage articles. A non-resource page is ineligible, and Approved versions are read-only in this implementation.",
          "An existing Draft can be edited in place. A new Draft is needed when the selected Approved version is intentionally being revised, not for every metadata save.",
        ],
      },
      {
        title: "Understand the save and concurrency boundaries",
        action: [
          "Inspect src/features/resource-metadata/metadata-service.ts and the authoring guide.",
          "If demonstrating a label change is explicitly agreed, record its original Display name or Description, edit that text in Content Editor and Save. In the panel, discard unsaved selections if needed and select Refresh.",
        ],
        expected: [
          "The panel rereads labels/help text, while the stable item name and stored Search values remain unchanged. Ordinary label changes need no code deployment.",
          "Save metadata validates selected Draft fields and reads changes back. The panel does not autosave, create versions, approve, publish or reindex.",
          "Discard changes restores unsaved selections only. After an uncertain save, Refresh and inspect the actual native values before deciding what to do next.",
          "Marketplace authorization uses an admin-backed API. Client permission checks do not establish backend role isolation, and native GraphQL has no atomic revision precondition; coordinate edits to the same version.",
        ],
        links: [
          {
            label: "Resource metadata authoring and access scope",
            href: `${repositoryDocs}/resource-metadata-authoring.md`,
          },
          {
            label: "Inspect metadata validation and save service",
            href: `${appSource}/src/features/resource-metadata/metadata-service.ts`,
          },
        ],
      },
      {
        title: "Review dependencies before adding or renaming a value",
        action: [
          "For a planned new option, inspect the ResourceMetadataOption insert type under the correct taxonomy list. Agree its stable item name, Display name and Description before creating it.",
          "Review application mappings, agent eligibility, existing resource values and Search validation with a developer. Do not add a temporary value simply for this inspection.",
        ],
        expected: [
          "Adding a state does not add a license or carrier appointment. Renaming an option’s item name does not update existing string values on articles.",
          "The managed labels serve the author panel. Visitor-facing facet labels currently come from the application and do not automatically adopt these display names.",
          "The five indexed fields remain versioned Single-Line Text because this tenant’s Search source rejected Droplist fields. The custom panel provides managed selection without changing that Search contract.",
        ],
      },
      {
        title: "Follow an approved resource change through delivery",
        action: [
          "For an actual content change, review the selected Draft, save the intended metadata, complete the native workflow and publish the intended page and changed local Resource image datasource.",
          "After indexed text or metadata changes, use Content → Search Sources → Liberty Mutual Agent Resources → Reindex Content, then check the article and its relevant licensed-state Search result.",
        ],
        expected: [
          "Saving, publication and reindexing are three different operations. An existing bookmark continues to use the resource’s stable item ID.",
          "An image-only change requires the appropriate page/datasource publication and asset delivery, but no Search reindex. New page branches affect new pages; they do not overwrite existing articles.",
        ],
      },
    ],
    cleanup: {
      body: [
        "For the default inspection, discard any unsaved panel selections and close temporary authoring tabs. No publish or reset is needed.",
        "If an agreed label/description was changed, restore its recorded original text in Content Editor, Save and Refresh the panel to confirm. If actual published resource values changed, use the coordinated editorial recovery and Search refresh process; a portal saved-work reset cannot undo them.",
      ],
    },
    related: ["architecture-and-ownership", "release-and-recovery"],
    sourceSlides: [117, 118, 119, 142],
  },
  {
    slug: "saved-work-reset",
    audience: "development",
    category: "Coordinator operations",
    title: "Reset saved work for one agreed reviewer pack",
    summary:
      "Restore fictional tasks, submissions, favorites and learning plans without replacing native profiles or their history.",
    outcome:
      "Verify a new saved-work run on the selected host with the same active UDL profile generation.",
    duration: "5–10 minutes after coordination",
    personas: [],
    prerequisites: [
      "Operator-only procedure: a coordinator must approve the exact host, pack and timing with every affected reviewer before any reset. Documentation login provides no reset authority.",
      "Use Node.js 24 and the private checkout. Run from examples/liberty-mutual-agent-portal in a macOS/Linux shell; adapt environment-variable syntax for another shell.",
      "Securely load the selected host’s separate PORTAL_OPERATOR_SECRET into the shell environment using the owner-approved process. Do not put it in a URL, command argument, screenshot, Git commit or chat.",
      "Deployed operations require configured durable Redis. A local reset instead targets localhost with that checkout’s own operator secret; never point a local exercise at shared Redis.",
    ],
    links: [
      {
        label: "Protected operator procedure and troubleshooting",
        href: `${appSource}/docs/auth-and-data.md#durable-work-and-resetting`,
      },
    ],
    steps: [
      {
        title: "Choose the control that matches the goal",
        action: [
          "If you only need to end a browsing session, Sign out. If you need baseline operational records, coordinate saved-work reset. If you need a fresh native identity set for affinity replay, use the separate restart guide.",
          "Confirm that nobody needs the current fictional records before replacing this pack’s active work. Record any example references required for your verification.",
        ],
        expected: [
          "Saved work has no automatic expiry. Signing in again resumes it; the eight-hour login lifetime does not reset it.",
          "Saved-work resets all seven personas and every agency in one pack on one host. It retains native identity, affinities and A/B history.",
        ],
      },
      {
        title: "Select exactly one host and confirm the assigned pack",
        action: [
          "The example below selects the designated preview and your documentation pack. Confirm that suffix with the coordinator; pack 01 is the presenter pack.",
          "For a deliberately approved production reset, replace DEMO_PORTAL with https://liberty-mutual-agent-portal.vercel.app. Do not run both host assignments as a batch.",
          "Confirm that the protected operator secret belongs to the selected host. The portal password Sitecore cannot authorize this procedure.",
        ],
        code: `export DEMO_PORTAL='${preview}'\nexport WORKSHOP_PACK='{{pack}}'`,
        expected: [
          "The intended host and pack are explicit. Preview and production saved-work namespaces are separate, so one command does not reset both hosts.",
        ],
      },
      {
        title: "Inspect the current status before deciding to reset",
        action: [
          "With the selected environment variables and protected secret already loaded, run this GET-only status inspection.",
          "Record the reviewerPack, runId and profileGeneration. If a pendingRestart is present, stop and have the coordinator resolve that operation first.",
        ],
        code: inspectPackStatus,
        expected: [
          "The response identifies the selected pack’s current run and profile generation. This status request does not request a reset or a new native import.",
        ],
      },
      {
        title: "Execute the coordinated saved-work reset once",
        action: [
          "Only after the scope and timing are agreed, run the command below once. This is an actual change, not a dry-run.",
          "Verify the receipt’s pack and mode before asking reviewers to continue.",
        ],
        code: 'node scripts/reset-reviewer-pack.mjs "$DEMO_PORTAL" "$WORKSHOP_PACK" saved-work',
        expected: [
          "reviewerPack matches the selected suffix, mode is saved-work, runId is new, profileGeneration is unchanged and clearBrowserIdentity is false.",
          "The operation does not import profiles or erase Sitecore native history. Other packs and the other host’s saved-work run remain unchanged.",
        ],
        note: "There is no dry-run option. If the response is unavailable or the receipt cannot be verified, inspect status before repeating; do not assume a lost response means the reset failed.",
      },
      {
        title: "Refresh and verify the baseline",
        action: [
          "Ask affected reviewers to refresh. Using the same selected host and pack, inspect the personas involved in your exercise.",
          "Confirm new example submissions, follow-ups or bonds have returned to the starting set, and new favorites/learning registrations have cleared. Compare recorded example references rather than deleting individual records.",
          "Recheck operator status and compare the run/profile values with the receipt.",
        ],
        expected: [
          "Starting operational work is restored. Existing logins are not universally invalidated by saved-work reset, and a stale action cannot overwrite the new run.",
          "Agency Growth, Products affinity or an A/B variation need not return to neutral: the native profiles and their accumulated history were deliberately retained.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Sign out of any verification accounts and close temporary details tabs. Keep the scoped receipt with the session record, without secrets.",
        "CMS content, Search, webhook receipts, Brand Kit edits and Agentic artifacts have separate recovery/lifecycle controls. Do not perform a fresh-profile restart merely to finish a saved-work cleanup.",
        "Remove operator credentials from the temporary shell environment when the operation is finished, following the coordinator’s handling process.",
      ],
    },
    related: [
      "fresh-profile-restart",
      "state-authorization",
      "release-and-recovery",
    ],
    sourceSlides: [135, 136, 137, 138, 141],
  },
  {
    slug: "fresh-profile-restart",
    audience: "development",
    category: "Coordinator operations",
    title: "Restart with fresh native profiles for a new journey",
    summary:
      "Provision and verify a new seven-persona UDL profile set when a clean affinity journey is needed.",
    outcome:
      "Activate a new saved-work run and profile generation without deleting earlier native history.",
    duration: "Allow up to 15 minutes for import verification",
    personas: [],
    prerequisites: [
      "Operator-only, optional procedure. Coordinate the exact host and pack with all affected reviewers and wait until they have finished. Documentation access does not grant permission to restart.",
      "Use the host-selection and read-only status steps in Reset saved work before continuing. Keep the host’s operator secret in the shell environment, not in this guide or an argument.",
      "The target server must have native profile-import configuration and durable state. This is not part of the default isolated local development exercise.",
      "Understand the effect: completion replaces saved work and invalidates that host/pack’s existing app sessions. It preserves older profiles, analytics, experiments and content.",
    ],
    links: [
      {
        label: "Operator restart and resume procedure",
        href: `${appSource}/docs/auth-and-data.md#durable-work-and-resetting`,
      },
    ],
    steps: [
      {
        title: "Confirm the active pack and starting profile generation",
        action: [
          "Complete the operator guide’s host selection, assigned-pack confirmation and status inspection. Record the current runId and profileGeneration.",
          "Confirm the reviewers need a new native journey. Saved-work reset and Sign out do not erase native browsing behavior.",
          "If an operation is already pending, inspect its status and resume that operation through its retained identity; do not start another import.",
        ],
        expected: [
          "A reviewer suffix selects the attendee’s pack. A runId identifies saved work. A profileGeneration identifies the pack’s active native identity set. They are different concepts.",
          "The usernames and passwords do not change: daniel.01 remains daniel.01 when his profile generation advances.",
        ],
      },
      {
        title: "Start the approved restart and preserve its operation identity",
        action: [
          "After the coordinator approves the selected host and pack, run this command from the app directory with DEMO_PORTAL, WORKSHOP_PACK and the protected secret already set.",
          "Keep the reported resume file and request identity. The helper waits and polls while the server prepares, imports and verifies the seven profiles.",
        ],
        code: 'node scripts/reset-reviewer-pack.mjs "$DEMO_PORTAL" "$WORKSHOP_PACK" restart',
        expected: [
          "The current pack remains active while import verification is pending. Pending is not completion.",
          "There is no artificial preloaded generation limit. Each restart creates unique, host-scoped identities and verifies all seven as newly created before activating them.",
        ],
        note: "This is a real operator action, not a dry-run. Restart does not reset experiment allocation/history or delete earlier CDP profiles.",
      },
      {
        title: "Verify completed before asking everyone to sign in again",
        action: [
          "Wait for a verified completed receipt. Compare it to the recorded starting state and selected pack.",
          "Confirm a new runId, profileGeneration advanced by exactly one and clearBrowserIdentity: true.",
          "Ask all affected reviewers to sign in again on that same host using their unchanged usernames and password Sitecore.",
        ],
        expected: [
          "Completion activates the fresh saved-work run and native profile set and invalidates the pack’s previous application sessions.",
          "The browser integration clears its supported previous Sitecore identity before identifying the new profile. A server operation cannot directly erase another browser’s local storage.",
          "A restart on preview does not advance production. New host-scoped sets do not reuse each other’s identities, although historical seed profiles can retain shared earlier history.",
        ],
      },
      {
        title: "Look up the actual active native profile",
        action: [
          "Sign in as the persona for the next journey. In a second tab in that same browser, open the bootstrap details link for the same host.",
          "Confirm agent.id. Copy udlIdentity.id and, if recording evidence, note session.runId and session.profileGeneration. Close the temporary details tab.",
          "In SitecoreAI, choose Performance → Profiles → Search filter → Liberty Mutual agent identity. Paste the active identifier, press Enter and open the matching agent.",
          "Inspect Overview and Engagement, including starting affinities, before opening any tagged resource pages. Record the initial Products banner on the same host.",
        ],
        expected: [
          "The lookup identifies the currently active profile, not a retired alias from an old direct link or the static historical fixture map.",
          "If udlIdentity is null, stop and ask the coordinator to verify native identity readiness before training affinity.",
          "Freshly imported profiles make a fresh journey possible; native targeting and experiment settings still determine the result. Record what the actual profile and page show.",
        ],
        links: [
          {
            label: "Production: current signed-in profile details",
            href: `${portal}/api/portal/bootstrap`,
          },
          {
            label: "Designated preview: current signed-in profile details",
            href: `${preview}/api/portal/bootstrap`,
          },
          { label: "Open Sitecore organization", href: sitecore },
        ],
      },
      {
        title: "Resume an interrupted operation without duplicating it",
        action: [
          "If the helper is interrupted or its wait expires, retain its operation file and rerun the same command to resume the same request and expected run.",
          "For a failed or mismatched receipt, or UPLOAD_UNCERTAIN, stop. The coordinator must inspect protected status and the native import before deciding the next action.",
          "Do not delete the resume file and blindly start again. An uncertain upload may already have reached Sitecore.",
        ],
        expected: [
          "Resuming a known operation reuses its identity. An unverified or failed import does not silently activate a new pack.",
          "A retained completed receipt proves that operation completed; current status confirms whether its set is still the active one.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Continue the intended affinity or personalization journey, or Sign out. Do not create another new profile set as routine end-of-session cleanup.",
        "Use a coordinated saved-work reset only if the new journey created operational records that should return to baseline. That reset keeps the new native history.",
        "Preserve earlier native profiles and receipts. Content restoration, Search refresh, webhook history and Agentic artifacts remain separate. Remove operator credentials from the temporary shell when finished.",
      ],
    },
    related: ["saved-work-reset", "architecture-and-ownership"],
    sourceSlides: [135, 137, 139, 140, 141],
  },
];
