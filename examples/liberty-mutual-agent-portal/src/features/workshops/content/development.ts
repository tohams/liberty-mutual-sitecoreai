import type { WorkshopGuide } from "../types";

const repository = "https://github.com/tohams/liberty-mutual-sitecoreai";
const appSource = `${repository}/blob/main/examples/liberty-mutual-agent-portal`;
const repositoryDocs = `${repository}/blob/main/docs`;
const portal = "https://liberty-mutual-agent-portal.vercel.app";
const sitecore =
  "https://portal.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb";
const pageBuilder =
  "https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb";

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
      "Complete an agent walkthrough first, or sign in as Daniel to see **My workspace**, **Learning & resources** and **Products & appetite**.",
      "**GitHub** read access is needed for the linked implementation files. Your own **Sitecore** account is needed to inspect authoring; portal credentials do not grant that access.",
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
          "**Sign in** as **daniel.01** with password **Sitecore**. On **My workspace**, find **Agency Growth**. Open **Learning & resources**, then **Products & appetite**.",
          "Notice the distinction between the **Agency Growth** guidance card, the **Resources** A/B placement and the **Products** affinity banner.",
        ],
        expected: [
          "**My workspace** is the **Sitecore** **Home** item at /. It is not a separate /workspace page.",
          "Known UDL attributes guide **Agency Growth**; the separate **Resources** placement runs an A/B test; **ProductSpotlight** uses native affinity targeting. These do not grant transaction authority.",
        ],
      },
      {
        title: "Find the authored content and its React implementation",
        action: [
          "In **Page Builder**, select **Liberty Mutual Agent Portal** and keep the **Default** editing host. Inspect **Home** and **Learning & resources** without saving.",
          "In the repository, inspect **src/components** and the content model guide. Compare **AgentGuidance**, **ResourceSearch**, **ResourceArticle**, **ResourceImage** and **ProductSpotlight** with the rendered pages.",
        ],
        expected: [
          "**Sitecore** owns page fields, presentation and authored datasources. The **Content SDK** renders those fields through React and preserves native editing information.",
          "**Default** and **Highlight** are React exports. They are not audience names or experiment assignments. SDK component maps and metadata are generated; developers do not maintain them by hand.",
          "**ResourceArticle** uses the resource page itself for article content. Each article has a local **Data/Resource image** datasource; only **ResourceImage** is allowed in that article image slot.",
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
          "Follow the authored page from **SitecoreAI** publication to **Experience Edge**, then to the **Next.js** application hosted on **Vercel**.",
          "Compare the production delivery URL with the designated editing preview. Production reads Live content; the configured editing preview reads Preview content.",
        ],
        expected: [
          "**Experience Edge** distributes published content separately from authoring. An authoring-only interruption need not prevent the website from reading previously published content.",
          "**Sitecore** operates its platform; **Vercel** operates hosting infrastructure. The application still depends on its code, configuration, identity, Search, decisioning and saved-work services.",
          "Managed services reduce infrastructure and upgrade work. They do not remove application dependency, access, integration or compatibility responsibilities. Contractual production SLAs are not a guarantee for this temporary POC or for the entire portal.",
        ],
        note: "**What to notice:** Managed **SitecoreAI** authoring and delivery reduce the platform infrastructure and core upgrade work your team operates. Your frontend dependencies, integrations, access configuration and compatibility checks still need ownership.",
      },
      {
        title: "Locate the operational integration boundary",
        action: [
          "Open **src/contracts/portal.ts**, **src/server/data/portal.ts** and **src/server/state/store.ts**.",
          "Compare the browser-facing **PortalBootstrap** and **PortalAction** contracts with the server authorization checks and the durable store.",
        ],
        expected: [
          "Insurance records and production history come from replaceable JSON-backed adapters. Submission actions illustrate workflows; they do not rate, bind, issue coverage or contact an underwriter.",
          "Protected server requests validate the signed-in agent, agency, reviewer pack and active run. expectedVersion detects stale work; idempotency keys avoid duplicate successful retries; Redis writes use atomic compare-and-set.",
          "Saved work persists across deployments until an explicit reset or instance deletion. Eight-hour login sessions are separate from that persistence.",
          "**Contact your team** uses native **Sitecore Forms** and its configured **Demo Webhook**. It does not create a portal action, Redis record, Salesforce write or email send in this sandbox.",
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
          "Inspect **ResourceSearch.tsx** and its useSearch integration. Compare published article metadata with the separate Search source refresh process.",
        ],
        expected: [
          "An accepted IDENTITY event alone does not prove profile linking and decisioning are ready. A current native profile and rendered decision provide the next evidence.",
          "**Products** affinity scores build in **SitecoreAI** from tagged page views. The application sends the CMS route name; it does not calculate those scores in the browser.",
          "The native **Top Affinity String** checks all affinity groups, so another group or a tie can affect selection. Do not promise that decision-table row order breaks ties.",
          "Native Search returns indexed published resources. Resource publication and Search reindexing are separate; neither a source-code build nor a workspace reset refreshes the index.",
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
          "Content authors review and publish ordinary content. Developers release frontend code through **GitHub** and **Vercel**. CMS definitions have their own scoped authoring release. Native configuration has its own publication or activation and runtime verification.",
          "The browser receives only its limited public child context. Developers use **Page Builder**’s **Local host** option to preview their own running frontend; the shared **Default** editing host remains available to everyone else.",
        ],
      },
    ],
    cleanup: {
      body: [
        "**Sign out** of the portal and close temporary inspection tabs. No reset, publication or redeployment is needed for this read-only exercise.",
      ],
    },
    related: ["local-setup", "release-and-recovery"],
    sourceSlides: [
      33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 113, 114, 115, 116, 117, 118, 119,
      120, 121, 122,
    ],
  },
  {
    slug: "local-setup",
    audience: "development",
    accountScope: "local",
    category: "Individual developer workshop",
    title: "Local setup: clone, configure and run the portal",
    summary:
      "Run your own frontend and open it in **SitecoreAI Page Builder**, using shared content and isolated local portal work.",
    outcome:
      "See shared **SitecoreAI** pages rendered by the React code running on your own machine.",
    duration: "20–30 minutes after tools are installed",
    personas: ["daniel"],
    prerequisites: [
      "Install **Git**, **VS Code** and **Node.js** 24.19.0 with its included npm. The app’s **.nvmrc** records that version; a **Node** version manager is optional.",
      "Authenticate **Git** or **VS Code** to your approved **GitHub** account with read access to the private repository. **GitHub CLI** and write access are not required for the local exercise.",
      "Use **Chrome** for the local **Page Builder** exercise, with your own **SitecoreAI** account that has access to this site. Allow Internet access to **GitHub**, npm and the hosted **Sitecore** services. **Vercel** access is not required.",
      "Use a new checkout for the exercise. Preserve any existing checkout containing your work; do not delete it to make room.",
    ],
    links: [
      { label: "Open the private repository", href: repository },
      { label: "Open Page Builder", href: pageBuilder },
    ],
    steps: [
      {
        title: "Check the tools in a new terminal",
        action: [
          "After installing or selecting **Node**, open a new terminal so it receives the updated PATH. Run these version checks separately.",
          "If **Node** is a different version, select 24.19.0 with your installer or existing version manager before continuing.",
        ],
        code: "node --version\nnpm --version\ngit --version",
        expected: [
          "**Node** reports v24.19.0. npm and **Git** each report an installed version. **TypeScript** will be installed with the application; no global **TypeScript** installation is needed.",
        ],
        note: "**What to notice:** For this workshop, you run **Next.js** locally and connect to hosted **SitecoreAI**. No local **Sitecore CM**, **SQL Server**, **Solr**, **IIS**, **Docker** or VM is needed.",
      },
      {
        title: "Clone into your projects directory and make a personal branch",
        action: [
          "From a parent directory where you keep projects, clone the repository. Authenticate with your approved **GitHub** account if prompted.",
          "Replace your-name in the branch command with your own lowercase identifier. Creating this local branch does not deploy anything.",
          "Alternatively, use **VS Code** → **View** → **Command Palette** → **Git: Clone**, select the same repository and open it.",
        ],
        code: "git clone https://github.com/tohams/liberty-mutual-sitecoreai.git\ncd liberty-mutual-sitecoreai\ngit switch -c workshop/your-name-resource-search",
        expected: [
          "The repository root contains **examples**, **authoring**, **docs** and **.github**. Your workshop branch is separate from **main**.",
        ],
      },
      {
        title: "Open the root in VS Code; move the terminal into the app",
        action: [
          "Select **File** → **Open Folder** and choose **liberty-mutual-sitecoreai**, the repository root. Select **Terminal** → **New Terminal**.",
          "Keep that root open in **Explorer**. In the integrated terminal, run the commands below one at a time before any npm command.",
          "Check **Node** again after changing into the application directory. If it is not v24.19.0, select that version with your installer or existing version manager, then repeat the check in this terminal before continuing.",
        ],
        code: "cd examples/liberty-mutual-agent-portal\nnode --version",
        expected: [
          "**Explorer** still shows the whole repository, while the terminal now points to **liberty-mutual-sitecoreai/examples/liberty-mutual-agent-portal**.",
          "**Node** reports v24.19.0 in the same application terminal that will run npm. A version shown in an earlier terminal does not establish this terminal’s version.",
          "The application directory contains **package.json** and **package-lock.json**. The repository root has no **package.json**; npm run or npm install there would fail with ENOENT.",
        ],
      },
      {
        title: "Let the setup helper prepare local configuration",
        action: [
          "From the application terminal, run npm run setup:local. It uses **Node** built-ins and can run before dependencies are installed.",
          "Open **examples/liberty-mutual-agent-portal/.env.local** in **VS Code** to inspect the variable names and settings. Keep the file and its values private.",
          "Confirm local-json state, sitecore content, the localhost origin and disabled tracking. Leave all Redis URL/token settings absent from every local environment file and from the terminal environment.",
        ],
        code: "npm run setup:local",
        expected: [
          "Fresh setup reports **Created** and automatically configures this POC’s Preview server context, separate public browser context, site name and matching editing secret. No manual copy/paste of keys is needed.",
          "The editing secret matches this **SitecoreAI** environment. Session and operator secrets are generated independently for your machine, with a unique PORTAL_ENVIRONMENT, PORTAL_STATE_ADAPTER=local-json, PORTAL_LOCAL_STATE_DIRECTORY=**.portal-state** and NEXT_PUBLIC_PORTAL_TRACKING_ENABLED=false.",
          "Rerunning upgrades recognized earlier workshop defaults, fills missing settings and preserves custom configuration and existing local saved work. Resolve any reported custom-configuration conflict before continuing.",
          "Saved work stays in your ignored **.portal-state** directory without automatic expiry. Preview content and the published Search index remain shared services. Do not copy a deployed **.env** file or shared Redis credentials into this checkout.",
        ],
        note: "Redis settings take precedence over local JSON. Resolve any setup warning rather than bypassing it. Setup configures your local app; selecting **Local host** in **Page Builder** connects your canvas to it.",
      },
      {
        title: "Install the locked dependencies and align VS Code",
        action: [
          "Run npm ci in the same application directory. This installs the committed dependency versions; it does not replace setup:local.",
          "Open **examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx**. If prompted to use workspace **TypeScript**, select **Allow**.",
          "Otherwise select **View** → **Command Palette** → **TypeScript: Select TypeScript Version** → **Use Workspace Version**. Confirm 5.9.3 for this lockfile.",
        ],
        code: "npm ci",
        expected: [
          "Dependencies install from **package-lock.json**. The editor and command-line checks use the application’s **TypeScript** version. npm install would also require the app directory and would not create **.env.local**.",
        ],
      },
      {
        title: "Start the frontend and sign in locally",
        action: [
          "Run npm run dev and leave its terminal running. Wait for **Ready**, then open the local login link.",
          "**Sign in** as **daniel.01** with password **Sitecore**. Each separate local checkout may reuse this login because its saved-work files are isolated.",
          "Select **Learning & resources**. Find **What can we help you find?** and the **My licensed states** default.",
        ],
        code: "npm run dev",
        links: [
          {
            label: "Open http://localhost:3000/login",
            href: "http://localhost:3000/login",
          },
        ],
        expected: [
          "The command generates **Content SDK** component maps, site metadata and import maps, then starts **Next.js** and the component-map watcher.",
          "The local portal reads Preview content and the native published Search index. Daniel’s resource scope includes Illinois, Texas and nationwide guidance. Preview content can include unpublished pages; use the hosted production portal to verify publication.",
          "Native tracking and personalization are disabled for this isolated local exercise. Use the configured HTTPS portal for UDL, affinity and A/B walkthroughs.",
        ],
        note: "Use HTTP, not HTTPS, for this local server. If **Next.js** selects another port, update NEXT_PUBLIC_SITE_URL to that local origin, restart, and use the same port in **Page Builder**.",
      },
      {
        title: "Connect Page Builder to your running local frontend",
        action: [
          "In **Chrome**, open **Page Builder** with your own **SitecoreAI** account and select **Liberty Mutual Agent Portal**.",
          "Open **Default editing host**, select **Local host**, enter **http://localhost:3000** in **Enter the editing host url**, and click **Save**. Keep npm run dev running on this same machine.",
          "In the page tree, select **Learning & resources**. Find the **ResourceSearch** heading **What can we help you find?** on the canvas.",
        ],
        links: [{ label: "Open Page Builder", href: pageBuilder }],
        expected: [
          "The canvas now uses your local React components with shared **SitecoreAI** Preview content. This local selection does not replace the shared **Default** editing host or deploy your branch.",
          "The editor uses safe preview data without an agent login. Search controls are intentionally disabled on the canvas; test actual Search in the separate signed-in localhost tab.",
        ],
        note: "Use **Chrome** if an embedded-browser canvas stays loading. Do not edit or publish shared CMS fields during this code exercise: local code and saved work are individual, but **SitecoreAI** content is shared.",
      },
    ],
    cleanup: {
      body: [
        "Continue to the component exercise with the terminal, **Page Builder** and localhost tabs open. If stopping here, select **Default editing host** in the editing-host selector, sign out of the localhost portal with **Daniel Ortiz** → **Sign out**, then press Ctrl+C in the terminal.",
        "Keep **.env.local** and **.portal-state** to reuse the setup, and keep them out of **Git**. This setup needs no shared portal reset or CMS publish.",
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
      "Change one **ResourceSearch** heading in **VS Code**, see it in **Page Builder**, and verify Search in the local portal.",
    outcome:
      "Experience the local React feedback loop and verify a small change without publishing shared content.",
    duration: "20–30 minutes",
    personas: ["daniel"],
    prerequisites: [
      "Finish Local setup and keep the repository root open in **VS Code**. Run all commands from **examples/liberty-mutual-agent-portal**.",
      "Use your own clean workshop branch, **Page Builder** connected to **Local host**, and a separate localhost portal tab. The exercise is an uncommitted, reversible edit.",
      "Keep npm run dev running. This exercise needs no CMS publish, shared CDP training, **Vercel** access or deployment.",
    ],
    links: [
      {
        label: "Open local Learning & resources",
        href: "http://localhost:3000/resources",
      },
      { label: "Open Page Builder", href: pageBuilder },
    ],
    steps: [
      {
        title: "Record the canvas and functional Search baseline",
        action: [
          "In your local browser, sign in as **daniel.01** with password **Sitecore**. Select **Learning & resources**.",
          "Confirm the heading **What can we help you find?** Enter workers compensation and click **Search**.",
          "Keep **My licensed states** selected and record the Illinois, Texas and nationwide result titles you see. Then return to **Page Builder** → **Learning & resources**, with **Local host** selected, and confirm the same starting heading.",
        ],
        expected: [
          "Native Search returns the currently published, indexed resources within Daniel’s licensed scope. Record actual titles rather than relying on a fixed result count, because the shared catalog can change.",
        ],
      },
      {
        title: "Find the code-owned heading",
        action: [
          "Open **examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx** in **VS Code**.",
          "Locate the existing h2 shown below. Inspect the surrounding useSearch integration without changing hooks, filters, fields or registration.",
        ],
        code: "<h2>What can we help you find?</h2>",
        expected: [
          "The heading is literal React text. Resource article titles, summaries and bodies are authored in **Sitecore**; changing this heading does not edit those content items.",
        ],
      },
      {
        title: "Change only the heading and save",
        action: [
          "Replace only the text inside the existing h2 with **Find guidance for your next client conversation**. Preserve the element and surrounding code.",
          "Save the file and return to the **Page Builder** canvas for **Learning & resources**, keeping **Local host** selected.",
        ],
        code: "<h2>Find guidance for your next client conversation</h2>",
        expected: [
          "The canvas displays **Find guidance for your next client conversation** from your local React code without a CMS publish or deployment. If needed, click **Reload canvas** and confirm **Local host** is still selected.",
        ],
        note: "**What to notice:** Your **React** edit appears in **Page Builder** through **Local host**, with content still hosted in **SitecoreAI**. Your code change stays local; CMS content remains shared, so leave content fields unchanged during this exercise.",
      },
      {
        title: "Verify the integrated behavior still works",
        action: [
          "Return to the separate **http://localhost:3000/resources** portal tab. Confirm the changed heading, then click **Search** with the same workers compensation query. Under **Risk state**, select **Illinois**.",
          "Compare the results to the baseline. Return to **My licensed states** after the comparison.",
        ],
        expected: [
          "Illinois and nationwide guidance remain; the Texas-specific result drops out when Illinois is selected. The one-line copy edit has not changed native retrieval or licensing filters. These functional controls are tested in the portal, not the read-only editor canvas.",
        ],
      },
      {
        title: "Review the diff and run the application checks",
        action: [
          "Stop the development server with Ctrl+C. Run each command below separately from the application directory and review its result.",
          "Use **VS Code** **Source Control** as well as the component diff. Do not stage environment files, **.portal-state**, generated **.sitecore** files or generated metadata.",
        ],
        code: "git diff -- src/components/resource-search/ResourceSearch.tsx\nnpm test\nnpm run test:setup\nnpm run lint\nnpm run type-check\nnpm run build",
        expected: [
          "The component diff contains only the intended heading. Tests, lint, **TypeScript** and the connected build pass before the change is considered ready.",
          "npm run build regenerates SDK artifacts, compiles the app and checks browser bundles for configured private values. A successful build is not a deployment or a native-service acceptance test.",
          "Authenticated npm start requires a properly configured durable store. The app deliberately rejects local-json in production mode; use npm run dev for this local workshop.",
        ],
        note: "If type checking runs before any development start or build in a fresh checkout, first run npm run sitecore-tools:generate-map and npm run sitecore-tools:build. The local setup guide already starts the development server.",
      },
      {
        title: "Restore only your exercise edit",
        action: [
          "Review the diff. If this file contains only the uncommitted workshop edit, run the restore command below. If it also contains other work, manually restore only this heading instead.",
          "Restart npm run dev. In **Learning & resources**, click **Clear filters** if it is shown, erase the query text, then click **Search**.",
          "Confirm the original heading and default licensed-state resource view. In **Page Builder**, confirm the original heading on **Local host**, then switch the editing-host selector back to **Default editing host**. Use **Daniel Ortiz** → **Sign out** in the localhost portal, then stop dev with Ctrl+C.",
          "Run npm run build once more with dev stopped to return generated metadata to the build state. Leave generated **next-env.d.ts** changes out of a commit.",
        ],
        code: "git restore -- src/components/resource-search/ResourceSearch.tsx\nnpm run dev",
        expected: [
          "The original heading returns. **Clear filters** appears only when facets or Risk state differ from their defaults; it does not erase the typed query. Default filters and an empty query restore the baseline view. Only the intended exercise file was restored.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Keep your local setup and state files private and untracked. Confirm **Page Builder** is back on **Default editing host**. No shared workspace reset or CMS restoration is needed for this local exercise.",
        "The workshop ends with local verification. The release-path discussion explains how reviewed code would reach a shared environment; attendees do not need to push a branch, open a PR or access **Vercel**.",
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
      "Use two remote MCP connections for a read-only explanation grounded in this portal and current **Sitecore** documentation.",
    outcome:
      "Inspect real **Sitecore** results beside the local **ResourceSearch** component and propose a change without making it.",
    duration: "15–20 minutes",
    personas: [],
    prerequisites: [
      "Open the **liberty-mutual-sitecoreai** repository root in a current **VS Code** with MCP support and approved **Copilot Chat** access in **Agent** mode.",
      "Use your own **Sitecore** account with a **SitecoreAI** application **Admin** role and access to **Safeco Insurance Company of America POC**.",
      "Have an approved **Google** account for the **Documentation MCP**’s separate sign-in. Organization policy must allow both connections.",
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
          "Select **View** → **Command Palette** → **MCP: Open Workspace Folder MCP Configuration**.",
          "Merge these two servers into the existing servers object, preserving other entries, and save as **.vscode/mcp.json** at the repository root.",
        ],
        code: '{\n  "servers": {\n    "liberty-mutual-sitecoreai": {\n      "type": "http",\n      "url": "https://marketer.sitecorecloud.io/mcp/marketer-mcp-prod"\n    },\n    "sitecore-documentation": {\n      "type": "http",\n      "url": "https://sitecore.mcp.kapa.ai"\n    }\n  }\n}',
        expected: [
          "The active configuration is under the root **.vscode** directory, not the app folder. The repository’s **docs/examples/mcp.vscode.json** is an inactive example.",
          "No password, Edge context, editing secret or bearer token belongs in this file. Use type and url; **VS Code** handles OAuth separately, without an auth property.",
        ],
      },
      {
        title: "Start the Sitecore connection and choose the actual tenant",
        action: [
          "Run **MCP: List Servers** → **liberty-mutual-sitecoreai** → **Start Server**. Review any trust prompt and the browser authorization request.",
          "**Sign in** with your own **Sitecore** account. For the intended connection, choose **Allow Access**, then **Safeco Insurance Company of America POC** and its **SitecoreAI** tenant for this portal.",
          "Return through **Open Visual Studio Code**. Review the displayed OAuth scopes before authorizing; this connection has requested openid, email, profile and offline_access.",
        ],
        expected: [
          "The authorization selects the tenant. The descriptive name **liberty-mutual-sitecoreai** in your local file does not select it.",
          "These OAuth scopes support account authorization; they are not an instruction to modify content. Tenant roles and the tools you allow govern the exercise.",
        ],
      },
      {
        title: "Start the documentation connection and select read tools",
        action: [
          "Run **MCP: List Servers** → **sitecore-documentation** → **Start Server**. Complete the separate **Google** sign-in when prompted and return to **VS Code**.",
          "Open **Chat** → **Agent** → **Configure Tools**, or **Configure Chat** → **Tools** where that label is shown.",
          "Enable the documentation query tools and only the necessary **Sitecore** read tools. Keep create, update, delete and publish tools disabled.",
        ],
        expected: [
          "Documentation authentication does not authorize the Liberty Mutual tenant. Server trust and approval of an individual tool call remain separate decisions.",
        ],
        note: "If startup fails, use **MCP: List Servers** → the server → **Show Output**. Check configuration syntax, account access, network and company policy. Avoid adding a duplicate connection through **Ask AI** → MCP if this configuration already defines it.",
      },
      {
        title: "Ask for documentation evidence",
        action: [
          "Start a new **Agent** chat and submit the prompt below. Inspect the actual tool result, open its source links and check the applicable SDK version.",
        ],
        code: "Use sitecore-documentation to explain how Sitecore Content SDK components render datasource fields and how placeholder restrictions work. Link the current official documentation. Do not change files or Sitecore content.",
        expected: [
          "A documentation tool call and relevant official links support the answer. An unsupported prose answer alone is not proof that the connection worked.",
        ],
      },
      {
        title: "Inspect the real portal site and Resources page",
        action: [
          "Submit the prompt below. Use returned site and page IDs; stop and correct tenant selection if **liberty-mutual-agent-portal** is absent.",
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
          "Open **examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx** in **VS Code** and submit the prompt below.",
          "Compare the answer with the file and the native results. Keep this exercise at a proposed change; the component guide covers applying and testing it.",
        ],
        code: "Use the Sitecore results, sitecore-documentation and ResourceSearch.tsx in this workspace to explain which resource-search content is authored in Sitecore and which text lives in code. Compare the implementation with the current Content SDK guidance. Propose one small heading edit, with the file path and relevant documentation links. Do not edit files or Sitecore content.",
        expected: [
          "The answer distinguishes CMS fields from React text and cites the local implementation. Local file inspection is a **VS Code** capability; the remote servers do not themselves read your checkout.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Start a **New Chat**. Run **MCP: List Servers** → each server → **Stop Server**. Stopping a server does not revoke account authorization; use the client’s account controls when intentionally disconnecting.",
        "A read-only exercise needs no content reset. Local JSON resets cannot undo changes to shared **Sitecore** content. Treat retrieved text as evidence, and review tool arguments before authorizing any later write.",
      ],
    },
    related: ["component-development", "resource-taxonomy"],
    sourceSlides: [123, 124, 125, 126],
  },
  {
    slug: "release-and-recovery",
    audience: "development",
    category: "Understand the implementation",
    title: "Release paths: from local changes to shared experiences",
    summary:
      "Discuss how frontend code, CMS definitions and authored content reach their shared environments after local verification.",
    outcome:
      "Explain the release path for each change without requiring an attendee deployment or hosting account.",
    duration: "10–15 minutes",
    personas: [],
    prerequisites: [
      "Complete the local component exercise or observe the presenter’s example. No **Vercel** access, hosting transfer, branch push or deployment is required.",
      "The linked repository files are optional implementation references. The presenter can show existing release evidence if useful.",
      "This temporary evaluation is not a production handoff. Future operating standards are discussion points, not required attendee setup.",
    ],
    links: [
      {
        label: "Optional: inspect a historical release PR",
        href: `${repository}/pull/21`,
      },
      {
        label: "Release runbook",
        href: `${repositoryDocs}/developer-handoff.md#vercel-release-process`,
      },
    ],
    steps: [
      {
        title: "Follow a frontend change from GitHub to Vercel",
        action: [
          "Discuss the path for the heading you changed: local branch → reviewed pull request and checks → **Vercel** preview → approved merge → production deployment.",
          "Compare local verification with shared release verification. A local commit deploys nothing; a configured **Vercel** Git integration builds the selected branch after a push.",
        ],
        expected: [
          "**Portal validation** runs **Offline validation** and **Connected production build**. **Vercel** independently builds and hosts the frontend from **examples/liberty-mutual-agent-portal** using **Node** 24, npm ci and npm run build.",
          "A successful build and **Ready** deployment still need checks of the changed experience on that host. Review its source commit, environment and relevant native services.",
          "The **SitecoreAI Vercel Deploy App** is a separate integration. A working Git-connected deployment does not by itself establish that app connection. Attendees do not need either integration to develop locally.",
        ],
        links: [
          {
            label: "Optional: inspect Portal validation",
            href: `${repository}/blob/main/.github/workflows/portal-validation.yml`,
          },
        ],
      },
      {
        title: "Distinguish authored content from CMS model changes",
        action: [
          "For ordinary page text, layout or images, follow **SitecoreAI** authoring → editorial review → publication to **Experience Edge**. No frontend deployment is needed for an ordinary content edit.",
          "For templates, rendering definitions and placeholder rules, review the owned serialized CMS model and its separate authoring deployment through **SitecoreAI Deploy**. A frontend push does not automatically deploy authoring; that trigger must be configured separately.",
        ],
        expected: [
          "The authoring resource package includes **nextjs-starter**, **LibertyMutual.Model**, **LibertyMutual.SitePresentation** and **LibertyMutual.SupportForm**. renderingHosts is empty because **Vercel** hosts the frontend and shared editing alias.",
          "Initial **Content**, **Taxonomy** and **ResourcePageBranch** seeds stay outside **Items as Resources**, preserving editable content. The runbook also documents the current scoped CLI model-release procedure.",
          "Search indexing, personalization activation and CMS publication have distinct steps. Code deployment alone does not publish content, refresh the index or activate a rule.",
        ],
        links: [
          {
            label: "Optional: inspect authoring build configuration",
            href: `${repository}/blob/main/xmcloud.build.json`,
          },
        ],
      },
      {
        title: "Keep local editing separate from shared hosting",
        action: [
          "Recall how **Page Builder**’s **Local host** option rendered your code at **http://localhost:3000**. Each developer’s browser connects to that developer’s machine.",
          "Contrast this with the shared **Default** editing host, which uses the configured hosted frontend for normal authoring. Return to **Default editing host** after the local exercise.",
        ],
        expected: [
          "The local app needs Preview server content access and the matching editing secret, supplied automatically by setup:local for this POC. The browser uses its separate public-scoped context.",
          "Selecting **Local host** does not change the registered shared host, require a CMS publication or deploy code. Changing the shared **Default** host is a separate platform maintenance operation.",
          "Editing routes use safe preview data and suppress engagement tracking. Local code is individual; shared CMS field edits still affect the common authoring environment.",
        ],
        links: [
          {
            label: "Shared editing-host maintenance reference",
            href: `${repositoryDocs}/developer-handoff.md#dedicated-editing-host`,
          },
        ],
      },
      {
        title: "Choose recovery for the layer that changed",
        action: [
          "For an application regression, restore a compatible known hosting deployment and prepare a reviewed source-code correction. For an editorial regression, restore the intended native content version, review and republish it.",
          "For model changes, apply a compatible correction in the owned scope. Discuss future monitoring, dependency maintenance and support ownership separately from this temporary evaluation.",
        ],
        expected: [
          "An application rollback does not reset saved work, undo CMS publication or reverse experiment history. A workshop workspace reset does not restore authored content.",
          "No deployment or rollback is performed in this discussion. The local developer exercise is complete without sharing a **Vercel** account.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close optional reference tabs. This discussion changes no code, content, hosting or saved work.",
      ],
    },
    related: [
      "component-development",
      "architecture-and-ownership",
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
      "Use your own **Sitecore** account with the approved administrator/owner access for this installed Marketplace app.",
      "Inspect without editing by default. Coordinate any actual shared taxonomy or resource-version change with the content owner.",
      "Portal login and documentation access do not grant **Sitecore** editing permissions. Restricted-author access for this app requires separate acceptance.",
    ],
    links: [
      { label: "Open the Sitecore organization", href: sitecore },
      { label: "Open Page Builder", href: pageBuilder },
    ],
    steps: [
      {
        title: "Find the shared lists in Content Editor",
        action: [
          "From the organization’s **SitecoreAI** instance, open **Content Editor**. Navigate to **/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy**.",
          "Open **Risk states** → **TX**. Inspect its item name, **Display name** and **Description** without changing them.",
        ],
        expected: [
          "**TX** is the stable canonical value; **Texas** is the readable label. The **Description** explains when authors should choose it.",
          "These taxonomy items remain editable CMS content and are excluded from **Items as Resources**. Normal application/model releases preserve them.",
        ],
      },
      {
        title: "See the choices in the installed Page Builder panel",
        action: [
          "In **Page Builder**, select **Liberty Mutual Agent Portal** → **Learning & resources** → an existing resource article. Confirm its language and version.",
          "Open **Apps** → **Resource metadata**. Inspect **Risk state**, **Business family**, **Product**, **Distribution channel** and **Resource type**.",
          "Select the **Learning & resources** landing page to see the panel’s non-resource guard, then return to the article.",
        ],
        expected: [
          "The five dropdowns each permit one choice. They are supplied by the managed taxonomy; **Cross-state guidance** stores **All** and does not bypass licensed-state filtering.",
          "The panel targets **ResourcePage** articles. A non-resource page is ineligible, and **Approved** versions are read-only in this implementation.",
          "An existing **Draft** can be edited in place. A new **Draft** is needed when the selected **Approved** version is intentionally being revised, not for every metadata save.",
        ],
      },
      {
        title: "Understand the save and concurrency boundaries",
        action: [
          "Inspect **src/features/resource-metadata/metadata-service.ts** and the authoring guide.",
          "If demonstrating a label change is explicitly agreed, record its original **Display name** or **Description**, edit that text in **Content Editor** and **Save**. In the panel, discard unsaved selections if needed and select **Refresh**.",
        ],
        expected: [
          "The panel rereads labels/help text, while the stable item name and stored Search values remain unchanged. Ordinary label changes need no code deployment.",
          "**Save metadata** validates selected **Draft** fields and reads changes back. The panel does not autosave, create versions, approve, publish or reindex.",
          "**Discard changes** restores unsaved selections only. After an uncertain save, **Refresh** and inspect the actual native values before deciding what to do next.",
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
          "For a planned new option, inspect the **ResourceMetadataOption** insert type under the correct taxonomy list. Agree its stable item name, **Display name** and **Description** before creating it.",
          "Review application mappings, agent eligibility, existing resource values and Search validation with a developer. Do not add a temporary value simply for this inspection.",
        ],
        expected: [
          "Adding a state does not add a license or carrier appointment. Renaming an option’s item name does not update existing string values on articles.",
          "The managed labels serve the author panel. Visitor-facing facet labels currently come from the application and do not automatically adopt these display names.",
          "The five indexed fields remain versioned **Single-Line Text** because this tenant’s Search source rejected **Droplist** fields. The custom panel provides managed selection without changing that Search contract.",
        ],
      },
      {
        title: "Follow an approved resource change through delivery",
        action: [
          "For an actual content change, review the selected **Draft**, save the intended metadata, complete the native workflow and publish the intended page and changed local **Resource image** datasource.",
          "After indexed text or metadata changes, use **Content** → **Search Sources** → **Liberty Mutual Agent Resources** → **Reindex Content**, then check the article and its relevant licensed-state Search result.",
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
        "If an agreed label/description was changed, restore its recorded original text in **Content Editor**, **Save** and **Refresh** the panel to confirm. If actual published resource values changed, use the coordinated editorial recovery and Search refresh process; a portal workspace reset cannot undo them.",
      ],
    },
    related: ["architecture-and-ownership", "release-and-recovery"],
    sourceSlides: [117, 118, 119, 142],
  },
  {
    slug: "saved-work-reset",
    audience: "development",
    category: "Workspace controls",
    title: "Reset a reviewer number and repeat an exercise",
    summary:
      "Choose a reviewer number to restore starting work and create seven fresh native profiles in one action.",
    outcome:
      "Repeat the walkthrough with baseline operational records and new profiles that do not carry the previous browsing history.",
    duration: "Allow a few minutes for profile import verification",
    personas: [],
    prerequisites: [
      "**Sign in** to the workshop guide with an existing portal username and password. No separate operator account, secret, terminal command or approval is needed.",
      "Choose the hosted environment where you performed the exercise: live and transaction preview keep saved work separate. The connected profile-import service is required; the isolated local-development workshop does not need this reset.",
      "Select the reviewer number you want to reset. The page starts with your signed-in number; you can select any number from 01–15. Number 01 is the presenter example.",
      "A reset affects all seven personas and every agency with that suffix. Check the displayed number so you do not replace another attendee’s work by mistake.",
    ],
    links: [
      {
        label: "Live portal: reset a reviewer number",
        href: "https://liberty-mutual-agent-portal.vercel.app/workshops/reset",
      },
      {
        label: "Transaction preview: reset a reviewer number",
        href: "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset",
      },
    ],
    steps: [
      {
        title: "Open Reset a reviewer number on the right host",
        action: [
          "Open the live or transaction-preview reset link below. If asked, sign in to the workshop guide with your assigned portal username and password **Sitecore**.",
          "Check the host shown on **Reset a reviewer number**. In **Reviewer number**, select the number for the exercise; the default is your signed-in number.",
        ],
        expected: [
          "The page shows the selected group’s saved-work status and current **Agent identity** for each persona.",
          "Opening the page, selecting a number or clicking **Refresh status** does not reset it. Every reset applies only to the host shown in your browser, not both environments.",
        ],
        links: [
          {
            label: "Live portal: reset a reviewer number",
            href: "https://liberty-mutual-agent-portal.vercel.app/workshops/reset",
          },
          {
            label: "Transaction preview: reset a reviewer number",
            href: "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset",
          },
        ],
      },
      {
        title: "Check what the clean reset includes",
        action: [
          "Review the selected reviewer number and its seven usernames. The reset always restores starting operational work and creates seven fresh verified native profiles together.",
          "Keep any example references you want to retain in your session notes before resetting. If you only want to leave the portal and keep working later, **Sign out** instead.",
        ],
        expected: [
          "The selected number is the only setting to choose. All seven personas receive starting tasks, submissions, favorites and learning plans, plus new Agent identities.",
          "Earlier native profiles and their analytics remain historical; their browsing behavior is not carried into the new profiles. Native experiment history is not erased.",
          "Saved work has no automatic expiry. Signing out or returning later does not perform this reset.",
        ],
      },
      {
        title: "Start the reset and wait for completion",
        action: [
          "Click **Reset reviewer** for the selected number, for example **Reset reviewer {{pack}}**. This starts the clean reset immediately; there is no separate approval or confirmation dialog.",
          "Keep the page open while **Reset in progress** is shown. Wait for the success message, such as **Reviewer {{pack}} is ready**.",
        ],
        expected: [
          "Seven new profiles are imported and verified before activation. Pending progress does not mean the new set is active.",
          "When completed, the saved-work run changes, the profile generation increases by one and all seven Agent identities change.",
          "The other packs and the other host’s saved-work run stay unchanged. The workshop-guide login remains separate from the portal sessions being replaced.",
        ],
        note: "If the connection is interrupted, reopen the same page and click **Refresh status**. Use **Continue reset** if a pending operation is shown, rather than starting another profile set.",
      },
      {
        title: "Sign in again and inspect starting work",
        action: [
          "Return to the portal on that same host. **Sign in** again with the same persona username, reviewer suffix and password **Sitecore**.",
          "Open the areas used in your exercise. Compare the starting submissions, tasks and saved resources with the example references you recorded.",
          "Use the same reviewer suffix when switching among personas. Other browser tabs for that reviewer number must also sign in again.",
        ],
        expected: [
          "Previous portal sessions for all seven personas are invalidated. The new active workspace contains starting records; new examples, favorites and learning registrations from the earlier run have cleared.",
          "The browser links to the fresh **Agent identity**. Known role and agency attributes still personalize guidance, while the earlier profile’s browsing affinities are absent from the new profile.",
          "A stale action cannot overwrite the new saved-work run. Use **Verify a clean reset in SitecoreAI** if you want to inspect the native identity and score evidence.",
        ],
      },
      {
        title: "Keep platform content recovery separate",
        action: [
          "For a changed **Sitecore** page, restore the intended content version through its native workflow and republish it; refresh Search when indexed fields changed.",
          "Keep webhook receipts, **Brand Kit** edits, **Agentic Studio** artifacts and experiment history in their own native lifecycle controls.",
        ],
        expected: [
          "Resetting the reviewer number does not change CMS content, Search configuration, media, **Brand Kits**, Agentic artifacts, webhook receipts or native experiment history.",
          "Each clean reset provisions a fresh verified profile set. There is no artificial preloaded generation limit.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Continue to the next walkthrough after signing in again, or close the reset page. There is no need to reset a second time merely to finish this procedure.",
      ],
    },
    related: ["fresh-profile-restart", "release-and-recovery"],
    sourceSlides: [135, 136, 137, 138, 141],
  },
  {
    slug: "fresh-profile-restart",
    audience: "development",
    category: "Workspace controls",
    title: "Verify a clean reset in SitecoreAI",
    summary:
      "Inspect the new native identities and starting profile history after resetting a reviewer number.",
    outcome:
      "Connect one completed clean reset to its new saved-work run, verified UDL profiles and fresh browsing history.",
    duration: "5–10 minutes after reset completes",
    personas: [],
    prerequisites: [
      "Complete **Reset a reviewer number and repeat an exercise** first. This verification inspects that completed reset; it does not require a second reset.",
      "Use the same hosted environment and reviewer number. The reset affects all seven personas on the current host only.",
      "Keep any before-reset Agent identities if you want to compare them with the new set. Older native profiles are retained as history.",
      "Use your own authorized **Sitecore** account to inspect profiles. Portal and workshop credentials do not grant native **Sitecore** access.",
    ],
    links: [
      {
        label: "Live portal: reset a reviewer number",
        href: "https://liberty-mutual-agent-portal.vercel.app/workshops/reset",
      },
      {
        label: "Transaction preview: reset a reviewer number",
        href: "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset",
      },
    ],
    steps: [
      {
        title: "Read the completed reset status",
        action: [
          "Open **Reset a reviewer number** on the same host and select the same **Reviewer number**. Click **Refresh status**.",
          "Expand **Reset details** to inspect **Last reset status**, **Saved-work run** and **Profile generation**. Inspect the seven **Agent identity** values in the table above. Do not click **Reset reviewer** again just to inspect the result.",
        ],
        expected: [
          "The practical reset procedure always restores saved work and provisions fresh native profiles together. This guide explains that result; it is not a different reset option.",
          "A reviewer suffix identifies the group of seven logins. A saved-work run identifies its operational records; a profile generation identifies its active native profile set.",
          "The other host and other reviewer numbers are unchanged. Reading status does not make another change.",
        ],
        links: [
          {
            label: "Live portal: reset a reviewer number",
            href: "https://liberty-mutual-agent-portal.vercel.app/workshops/reset",
          },
          {
            label: "Transaction preview: reset a reviewer number",
            href: "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset",
          },
        ],
      },
      {
        title: "Match the same login to its new Agent identity",
        action: [
          "Find the intended persona in the page’s identity list and copy **Agent identity**. Compare it with that persona’s recorded identifier from before the reset, if available.",
          "**Sign in** again to the portal on the same host with the unchanged persona username, assigned suffix and password **Sitecore**.",
        ],
        expected: [
          "The username is unchanged: **daniel.01** remains **daniel.01**. Its new **Agent identity** belongs to the fresh native profile for this reviewer number and host.",
          "**Agent identity** is a search identifier, not the native profile UUID. The static historical fixture map does not describe newly created sets.",
          "Completed reset invalidates the old portal sessions. The browser integration clears its supported previous **Sitecore** identity before identifying the new profile.",
        ],
      },
      {
        title: "Open the current native profile",
        action: [
          "In **SitecoreAI**, choose **Performance** → **Profiles** → **Search filter** → **Liberty Mutual agent identity**.",
          "Paste the current **Agent identity** copied from the reset page, press Enter and open the matching person.",
          "Check the persona and its known attributes. Do not select a profile solely by display name when earlier sets have the same names.",
        ],
        expected: [
          "The native result matches the current persona, reviewer number and host. The new profile retains the known agent attributes needed for the scenarios.",
          "Earlier profiles remain historical. A saved direct link to an older profile does not prove that the portal is still using it.",
        ],
        links: [
          {
            label: "Open SitecoreAI Profiles",
            href: "https://app.sitecorecloud.io/performance/profiles?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df",
          },
        ],
      },
      {
        title: "Inspect the new browsing baseline",
        action: [
          "Open **Overview** → **Top affinities** and **Engagement** before visiting tagged articles. Record the starting scores and the **Products** banner on the same host.",
          "Continue the affinity walkthrough on production using that host’s current identifier and baseline. If you verified a transaction-preview reset, first open production **Reset a reviewer number**, select the same **Reviewer number** and copy the intended persona’s current production **Agent identity**. Viewing identities does not require another reset.",
          "Sign in to production and inspect that production profile’s starting scores and **Products** banner before following the affinity walkthrough. Compare the resulting page views, native score and content with this production baseline.",
        ],
        expected: [
          "The fresh profile on the host you reset does not carry the earlier set’s browsing history. If you switch from transaction preview to production, its current production profile retains its existing history. Inspect the actual starting scores before training a topic; normal visits after signing in add new engagement.",
          "Native experiment history remains historical; a clean reviewer reset does not reset experiment configuration or its aggregate report.",
          "CMS content, Search, media, **Brand Kits**, Agentic artifacts and webhook receipts were not changed by the reset.",
        ],
      },
      {
        title: "Recognize pending work and resume the same operation",
        action: [
          "If status still shows an import in progress, wait for completion before interpreting the new profile list. After a connection interruption, use **Refresh status** and **Continue reset** when offered.",
          "Do not start another reset while an existing operation is unresolved. If the page reports a failed or uncertain import, retain the displayed result so the implementation team can inspect that import.",
        ],
        expected: [
          "Resuming keeps the same operation identity. Unverified imports do not silently activate a new profile set.",
          "Each completed reset verifies all seven new profiles before activation. There is no artificial preloaded generation limit.",
          "Current status identifies the active set; an older completed receipt only describes its earlier operation.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close profile tabs you no longer need and continue the intended journey. This verification does not require another reset.",
        "Use the same reset page when you deliberately want another clean start. Every reset restores starting work and creates fresh profiles together; previous native history remains retained.",
      ],
    },
    related: [
      "saved-work-reset",
      "architecture-and-ownership",
      "affinity-personalization",
    ],
    sourceSlides: [135, 137, 139, 140, 141],
  },
];
