import type { WorkshopGuide } from "../types";

const portal = "https://liberty-mutual-agent-portal.vercel.app";
const previewPortal =
  "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app";
const sitecore =
  "https://portal.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb";
const pageBuilder =
  "https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb";

export const developmentGuides: WorkshopGuide[] = [
  {
    slug: "architecture-and-ownership",
    audience: "development",
    category: "Understand the architecture",
    title: "Understand the architecture",
    summary:
      "See how SitecoreAI content, a separately hosted React website, and connected services work together to deliver the Agent Portal.",
    outcome:
      "Identify what marketers can change in SitecoreAI, what developers change in code, and how each reaches an agent’s browser.",
    personas: ["daniel"],
    prerequisites: [
      "The **Agent Portal** is the website agents use. **SitecoreAI** is the platform your team uses to manage its content and experiences. This walkthrough moves from the portal to **Page Builder**, SitecoreAI’s visual page editor, and then to the implementation on **GitHub**. You will inspect the existing solution without changing it.",
      `Use **daniel.01** with password **Sitecore** on the [**live portal**](${portal}/login). The username displayed in this guide uses the workshop number with which you signed into the workshop website; confirm your number on [**Attendee assignments**](/workshops/attendees).`,
      "Open the **Liberty Mutual GitHub repository** supplied by your workshop team, using the GitHub account authorized by Liberty Mutual. If you do not have its address or cannot view its files, ask your Liberty Mutual workshop contact. All source paths in this guide start at the repository’s top-level file list, called the **repository root**; the repository can have any name.",
      `For authoring inspection, use the email that received your **Sitecore Cloud** invitation. Open the [**Sitecore organization**](${sitecore}), sign in with that account, and confirm **Safeco Insurance Company of America POC**. [**Page Builder**](${pageBuilder}) targets this organization’s portal environment; select **Liberty Mutual Agent Portal**. If either is missing, ask the workshop team to check your access; the fictional Daniel login cannot open SitecoreAI.`,
      "This is an inspection exercise. Do not change content, configuration, targeting, or saved records.",
    ],
    links: [
      { label: "Open the agent portal", href: `${portal}/login` },
      { label: "Open Page Builder", href: pageBuilder },
      { label: "Open the Sitecore organization", href: sitecore },
      {
        label: "Check attendee assignments",
        href: `${portal}/workshops/attendees`,
      },
    ],
    steps: [
      {
        title: "Start with three visible experiences",
        action: [
          "Start as an agent so the architecture has a visible purpose. You will locate three components: guidance selected from known agent attributes, a tested call to action, and a banner selected from browsing interests. A **component** is a reusable part of a page, such as a card, search panel, or banner.",
          `Open the [**agent portal**](${portal}/login) and **Sign in** as **daniel.01** with password **Sitecore**. Select **My workspace** in the left navigation. Scroll below **Your priorities** to the white card labeled **Agency Growth**, immediately above **Recent activity**. Read its heading and yellow button; the first close-up below shows this card.`,
          "Select **Learning & resources** in the left navigation. Scroll below the search-result cards and page-number controls to **Useful guidance, easier to find**, immediately above **Your next learning opportunity**. Its yellow button is the A/B test comparison; the second close-up shows the location and an example button label.",
          "Select **Products & appetite** in the left navigation. Look directly below the page title and **Risk state**, above the **All solutions** filter. This wide illustrated banner is the **Spotlight** component, shown in the third close-up. Record its heading before browsing resources; your current interests may already have changed the text.",
        ],
        expected: [
          "**My workspace** is the portal’s home page. In **Page Builder**, select **Home** to inspect its content and components.",
          "The **Unified Data Layer (UDL)** is SitecoreAI’s profile and engagement data layer. **Agency Growth** uses known agent attributes from that profile. **Learning & resources** compares call-to-action variations in an **A/B test**, and **Spotlight** adapts to recorded browsing interests. You are locating these examples here; the marketing walkthroughs demonstrate their behavior and measurement.",
        ],
        links: [{ label: "Open the agent portal", href: `${portal}/login` }],
      },
      {
        title: "Find the authored content and its React implementation",
        action: [
          "Now switch from viewing the portal to inspecting its composition. **Page Builder** shows the page tree and an editable page preview, called the **canvas**. Its **editing host** is the frontend that renders that canvas; **Default editing host** uses the shared hosted version.",
          `Open [**Page Builder**](${pageBuilder}) with your invited Sitecore account. Confirm **Liberty Mutual Agent Portal** in the site selector. Leave the editing-host selector on **Default editing host**; if a previous local exercise left **Local host** selected, choose **Default editing host**, then click **Save**.`,
          "Select **Pages**, expand **Home**, and select **Home**, then **Learning & resources**. Inspect the canvas without changing fields or clicking **Publish**.",
          "Expand **Learning & resources** and select **Workers compensation: a Texas starting point**. Select **Editor** in the top navigation, then click the stacked-layers **Layers** icon above the left tree. Find **Article** and expand its image placeholder to see **Image**, matching the screenshot below. The **Resources** section of the component library groups **Article**, **Image**, and **Search**. Their React implementations are named **ResourceArticle**, **ResourceImage**, and **ResourceSearch**, respectively.",
          `In Liberty Mutual’s GitHub repository, open **examples/liberty-mutual-agent-portal/src/components**; a local clone is not required. Inspect **agent-guidance/AgentGuidance.tsx**, **resource-search/ResourceSearch.tsx**, **resource-article/ResourceArticle.tsx**, **resource-image/ResourceImage.tsx**, and **product-spotlight/ProductSpotlight.tsx**, and compare their rendered elements with the portal.`,
        ],
        expected: [
          "**Sitecore** stores page fields, component placement, and **datasources**—content items that supply a component’s fields. The **Sitecore Content SDK** is the developer library that renders those fields through React and connects them to visual editing tools.",
          "A component can expose rendering variants through named React exports such as **Default** and **Highlight**. The **Content SDK** generates the component maps and metadata that make these implementations available to Sitecore.",
          "**Article** (implemented by **ResourceArticle**) reads its text from the resource page itself. Each article also has a **Data/Resource image** child item that supplies its photograph. The article’s image **placeholder** is a named slot for another component, and its settings permit only **Image** (implemented by **ResourceImage**). This keeps authors from inserting an unrelated component into that slot.",
        ],
        links: [{ label: "Open Page Builder", href: pageBuilder }],
        repositoryFiles: [
          {
            label: "Content and component placement model",
            path: "docs/content-model.md",
          },
          {
            label: "Component implementations",
            path: "examples/liberty-mutual-agent-portal/src/components",
          },
          {
            label: "Resource page branch and local image contract",
            path: "docs/resource-page-authoring.md",
          },
        ],
      },
      {
        title: "Trace content delivery separately from application hosting",
        action: [
          "Read the delivery sequence: an author publishes a **SitecoreAI** page; **Experience Edge**, Sitecore’s globally distributed content delivery service, makes that published content available; the **Next.js** frontend hosted on **Vercel** renders the website for the agent. Separating authoring from delivery helps explain performance, scalability, and resilience. Do not publish or deploy anything in this step.",
          `Compare the two environments. [**Live portal**](${portal}/login) uses liberty-mutual-agent-portal.vercel.app and reads published content. [**Shared preview portal**](${previewPortal}/login) uses the longer git-c8199e hostname and can read unpublished content. Use the live portal for this walkthrough; the preview link identifies the separate host used for normal editing and saved-work exercises.`,
        ],
        expected: [
          "**Experience Edge** distributes published content separately from authoring. An authoring-only interruption need not prevent the website from reading previously published content.",
          "**Sitecore** operates its platform, and **Vercel** operates hosting infrastructure. The application connects those services with its code, configuration, identity, Search, and personalization.",
          "The portal’s business components use sample data. In a production implementation, they would connect to **Salesforce** and other middleware services.",
          "Managed services reduce infrastructure and platform upgrade work. For a future operational site, your team would own application dependencies, access, and integrations, and confirm each service’s SLA as part of the overall availability design.",
        ],
        note: "**What to notice:** Managed **SitecoreAI** authoring and delivery reduce the platform infrastructure and core upgrade work your team operates. Your frontend dependencies, integrations, access configuration, and compatibility checks still need ownership.",
        links: [
          { label: "Live portal", href: `${portal}/login` },
          { label: "Shared preview portal", href: `${previewPortal}/login` },
        ],
      },
      {
        title: "Understand identity, Search, and personalization",
        action: [
          "The portal login identifies a fictional agent; its linked **UDL profile** stores the agent’s known attributes and observed engagement. An **affinity** is a browsing-interest score. These profile values select authored content variants, while server-side application checks continue to control access to protected data.",
          `Open **Identity and saved-work contract** (**examples/liberty-mutual-agent-portal/docs/auth-and-data.md**) and **Native affinity implementation** (**docs/affinity-personalization.md**). Read how portal sign-in identifies a native **UDL** profile and how **Top Affinity** selects an authored variant. For an actual profile lookup, use [**Check fresh profiles in SitecoreAI**](/workshops/guide/fresh-profile-restart); this architecture step does not reset or train a profile.`,
          `Open **ResourceSearch implementation** (**examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx**), find **useSearch**, and inspect the licensed-state filters. Compare the documented Search source refresh with the publication step: saving or publishing an article and refreshing the Search index are separate operations.`,
        ],
        expected: [
          "Portal sign-in sends an **IDENTITY** event to link the agent to a native **UDL** profile. Inspect that profile and the resulting portal content to follow the complete personalization flow.",
          "The application sends page-view events with the CMS route name. **SitecoreAI** uses its tagged-page mappings to build affinity scores and select a matching **Products** treatment.",
          "**Top Affinity String** is the configured value used to find the profile’s strongest browsing interest across affinity groups. Its result selects a **Products** content variant. Inspect the actual scores when explaining that selection, especially when interests are tied.",
          "**SitecoreAI Search** retrieves an indexed copy of published resources. **Reindexing** refreshes that searchable copy after relevant content changes. Publication, a code build, and a workshop reset do not themselves refresh the Search index.",
          "A/B test events follow actual page navigation. Reported visits and goals let you inspect the measurement flow; deciding which variation performs better requires sufficient traffic and an appropriate analysis period.",
        ],
        links: [
          {
            label: "Check fresh profiles in SitecoreAI",
            href: `${portal}/workshops/guide/fresh-profile-restart`,
          },
        ],
        repositoryFiles: [
          {
            label: "Identity and saved-work contract",
            path: "examples/liberty-mutual-agent-portal/docs/auth-and-data.md",
          },
          {
            label: "Native affinity implementation",
            path: "docs/affinity-personalization.md",
          },
          {
            label: "ResourceSearch implementation",
            path: "examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx",
          },
        ],
      },
      {
        title: "Match a proposed change to its release path",
        action: [
          "Classify a proposed change: editorial copy or an image; React behavior; the **CMS model**, which defines fields and allowed page structure; or SitecoreAI personalization or Search configuration. This identifies the team and release process responsible for the change.",
          "Open [**Understand deployment and recovery**](/workshops/guide/release-and-recovery) and compare your example with its frontend, content, and CMS model sections. Keep private server contexts, session secrets, editing secrets, operator credentials, and Redis credentials outside browser code.",
        ],
        links: [
          {
            label: "Understand deployment and recovery",
            href: `${portal}/workshops/guide/release-and-recovery`,
          },
        ],
        expected: [
          "Content authors review and publish ordinary content. Developers release frontend code through **GitHub** and **Vercel**. CMS definitions have their own scoped authoring release. Native configuration has its own publication or activation and runtime verification.",
          "The browser uses a public context ID with access limited to the services it needs; server configuration holds broader content access. Developers use **Page Builder**’s **Local host** option to preview their own running frontend, while **Default editing host** opens the shared hosted frontend.",
        ],
      },
    ],
    cleanup: {
      body: [
        "**Sign out** of the portal and close temporary inspection tabs. No reset, publication, or redeployment is needed for this read-only exercise.",
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
    category: "Develop locally",
    title: "Run the portal locally",
    summary:
      "Run the Agent Portal’s frontend on your own computer, then use it to render shared SitecoreAI content inside Page Builder.",
    outcome:
      "Connect a local Next.js application to hosted SitecoreAI without installing a local Sitecore instance, and prepare for the component-editing exercise.",
    personas: ["daniel"],
    prerequisites: [
      "You will run only the portal’s **frontend** on your computer. The content-management system and Search remain hosted in **SitecoreAI**. **Page Builder** is the visual page editor: its **Local host** option embeds your running frontend so you can inspect local code with shared content.",
      "Install **Git**, **VS Code**, and **Node.js** 24.19.0 with its included npm. **examples/liberty-mutual-agent-portal/.nvmrc** records that version; a **Node** version manager is optional.",
      "Use the **Liberty Mutual GitHub repository** supplied by your workshop team. Sign in with the GitHub account authorized by Liberty Mutual and confirm that you can see its files. Ask your Liberty Mutual workshop contact for the address or access if needed. Use that same identity for Git or VS Code authentication; **GitHub CLI** and repository write access are not required. File paths in these guides start at the repository’s top-level file list, called the **repository root**.",
      `Use **Chrome** for Page Builder. Accept your **Sitecore Cloud** invitation and sign in with the email that received it. Open the [**Sitecore organization**](${sitecore}), confirm **Safeco Insurance Company of America POC**, then open [**Page Builder**](${pageBuilder}) and select **Liberty Mutual Agent Portal**. If that organization or site is unavailable, ask the workshop team to check your access before starting; **daniel.01** is only a portal login.`,
      "Allow Internet access to **GitHub**, npm, and the hosted **Sitecore** services. This exercise runs the frontend on your machine and reads shared hosted content. It requires no **Vercel** account, Sitecore installation, Docker environment, or deployment.",
      "Use a new checkout for the exercise. Preserve any existing checkout containing your work; do not delete it to make room.",
    ],
    links: [
      { label: "Open Page Builder", href: pageBuilder },
      { label: "Open the Sitecore organization", href: sitecore },
    ],
    repositoryFiles: [
      {
        label: "Portal application folder",
        path: "examples/liberty-mutual-agent-portal",
      },
      {
        label: "Developer quickstart",
        path: "docs/developer-quickstart.md",
      },
    ],
    steps: [
      {
        title: "Check the tools in a new terminal",
        action: [
          "After installing or selecting **Node**, open a new terminal so it receives the updated PATH. Run these version checks separately before cloning; this confirms that later npm commands will use the runtime for which the portal was tested.",
          "If **Node** is a different version, select 24.19.0 with your installer or existing version manager before continuing.",
        ],
        code: "node --version\nnpm --version\ngit --version",
        expected: [
          "**Node** reports v24.19.0. npm and **Git** each report an installed version. **TypeScript** will be installed with the application; no global **TypeScript** installation is needed.",
        ],
        note: "**What to notice:** For this workshop, you run **Next.js** locally and connect to hosted **SitecoreAI**. No local **Sitecore CM**, **SQL Server**, **Solr**, **IIS**, **Docker**, or VM is needed.",
      },
      {
        title: "Clone into your projects directory and make a personal branch",
        action: [
          "In **Liberty Mutual’s GitHub repository**, select **Code** → **Local** → **HTTPS**, then copy the clone URL. Replace **YOUR_LIBERTY_MUTUAL_REPOSITORY_URL** in the first command with that copied URL; it is a placeholder, not a working address. If your organization requires SSH, select **SSH** instead and use its copied URL with your configured SSH identity.",
          "Choose a parent folder, such as **Documents/dev**, and open a terminal there. The final **liberty-mutual-sitecoreai** argument in the clone command names the folder on your computer, regardless of the name of Liberty Mutual’s repository. If that folder already contains your work, choose a different parent folder. Replace **your-name** with a unique lowercase name, such as **chris-babcock**, then run all three commands in order.",
          "Alternatively, use **VS Code** → **View** → **Command Palette** → **Git: Clone**, paste the URL you copied from Liberty Mutual’s repository, and choose a parent folder. VS Code uses the repository’s name for its local folder. Open that cloned folder, create a terminal there, and run only the **git switch** command below. Later references to the local **liberty-mutual-sitecoreai** root mean this cloned folder, whatever its name.",
        ],
        code: "git clone YOUR_LIBERTY_MUTUAL_REPOSITORY_URL liberty-mutual-sitecoreai\ncd liberty-mutual-sitecoreai\ngit switch -c workshop/your-name-resource-search",
        expected: [
          "The repository root contains **examples**, **authoring**, **docs**, and **.github**. The git switch command reports your new **workshop/your-name-resource-search** branch. This branch belongs to your checkout; creating it deploys nothing and does not affect another attendee.",
        ],
      },
      {
        title: "Open the root in VS Code; move the terminal into the app",
        action: [
          "In **VS Code**, select **File** → **Open Folder** and choose the cloned repository root: **liberty-mutual-sitecoreai** when you used the terminal commands, or the repository-named folder created by **Git: Clone**. Its children should include **authoring**, **docs**, and **examples**. Do not choose the nested application folder for this window.",
          "Select **Terminal** → **New Terminal**. The new terminal should start at the repository root. If reusing a terminal already in **examples/liberty-mutual-agent-portal**, skip the cd command; otherwise run it once. Keep the root open in **Explorer** while the terminal works in the application folder.",
          "Check **Node** again after changing into the application directory. If it is not v24.19.0, select that version with your installer or existing version manager, then repeat the check in this terminal before continuing.",
        ],
        code: "cd examples/liberty-mutual-agent-portal\nnode --version",
        expected: [
          "**Explorer** still shows the whole repository, while the terminal is inside its **examples/liberty-mutual-agent-portal** application folder.",
          "**Node** reports v24.19.0 in the application terminal, ready to run the remaining npm commands.",
          "The application directory contains **package.json** and **package-lock.json**. Run all npm commands from this directory so npm can find the app’s scripts and dependencies.",
        ],
      },
      {
        title: "Let the setup helper prepare local configuration",
        action: [
          "From the application terminal, run npm run setup:local. This helper writes **.env.local**, the configuration Next.js reads on your machine to connect to the shared SitecoreAI environment. It uses **Node** built-ins and can run before dependencies are installed.",
          "Open **examples/liberty-mutual-agent-portal/.env.local** in **VS Code** to inspect the variable names and settings. Keep the file and its values private.",
          "Check these settings in the generated file: **PORTAL_STATE_ADAPTER=local-json**, **PORTAL_CONTENT_ADAPTER=sitecore**, **NEXT_PUBLIC_SITE_URL=http://localhost:3000**, and **NEXT_PUBLIC_PORTAL_TRACKING_ENABLED=false**. They keep saved work on your machine while reading the hosted content and Search services.",
          "Leave Redis URL/token settings absent from local environment files and the terminal environment. You do not need a deployed environment file, a new context ID, or a Redis account. If setup reports conflicting settings, use the named variable and file in its error message to resolve the conflict; ask the workshop team before changing a custom configuration you need for other work.",
        ],
        code: "npm run setup:local",
        expected: [
          "Fresh setup reports **Created**. **examples/liberty-mutual-agent-portal/scripts/setup-local.mjs** supplies the **Preview context ID** for server-side access to published and unpublished content, a separate public browser context, the **liberty-mutual-agent-portal** site name, and the **editing secret** used for Page Builder editing requests. No manual copy/paste of Deploy App values is needed for this workshop.",
          "The editing secret matches this **SitecoreAI** environment. Session and operator secrets are generated for your machine, along with a unique **PORTAL_ENVIRONMENT**. **local-json** stores workshop work in your own **.portal-state** folder; disabled tracking prevents this code exercise from adding browsing behavior to shared SitecoreAI profiles.",
          "You can rerun setup to fill missing workshop settings while preserving custom values and saved work. A repeat run reports **Updated** or that the existing file was left unchanged. Review any configuration warning before continuing.",
          "Saved work stays in your ignored **.portal-state** directory without automatic expiry. Preview content and the published Search index remain shared services. Do not copy a deployed **.env** file or shared Redis credentials into this checkout.",
        ],
        note: "Redis settings take precedence over local JSON. Resolve any setup warning rather than bypassing it. Setup configures your local app; selecting **Local host** in **Page Builder** connects your canvas to it.",
      },
      {
        title: "Install the locked dependencies and align VS Code",
        action: [
          "Run npm ci in the same application directory to install the dependency versions recorded in the repository’s lockfile.",
          "Open **examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx**. If prompted to use workspace **TypeScript**, select **Allow**.",
          "Otherwise select **View** → **Command Palette** → **TypeScript: Select TypeScript Version** → **Use Workspace Version**. Confirm 5.9.3 for this lockfile.",
        ],
        code: "npm ci",
        expected: [
          "The editor and command-line checks use the application’s **TypeScript** version. You now have both the local configuration created by setup:local and the dependencies installed by npm ci.",
        ],
      },
      {
        title: "Start the frontend and sign in locally",
        action: [
          "Run npm run dev in the application terminal and leave it running. Wait for **Ready** and confirm its **Local** address uses port 3000 before opening the [**local portal login**](http://localhost:3000/login).",
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
          "The **Sitecore Content SDK** connects React components to Sitecore’s content and editing tools. The dev command generates its component maps, site metadata, and import maps, then starts **Next.js** and a watcher that keeps component registration current as files change.",
          "The local portal reads Preview content and the native published Search index. Daniel’s resource scope includes Illinois, Texas, and nationwide guidance. Preview content can include unpublished pages; use the hosted production portal to verify publication.",
          "Native tracking and personalization are disabled for this isolated local exercise. The live HTTPS portal in the marketing guides is used to inspect SitecoreAI profiles, browsing-interest personalization, and A/B tests; localhost is used for this code exercise.",
        ],
        note: "Use HTTP, not HTTPS. If port 3000 belongs to another process, stop only a server you recognize, or use the port that **Next.js** reports. For another port, stop dev, set **NEXT_PUBLIC_SITE_URL** in **.env.local** to that HTTP origin, restart dev, and use that same port in the browser and Page Builder instead of 3000.",
      },
      {
        title: "Connect Page Builder to your running local frontend",
        action: [
          "An **editing host** is the frontend used to draw Page Builder’s page preview, called the **canvas**. Selecting **Local host** makes that preview use your code at localhost, while the content remains in the shared SitecoreAI environment.",
          `In **Chrome** on the machine running npm run dev, open [**Page Builder**](${pageBuilder}). Sign in with your invited Sitecore Cloud email, confirm **Safeco Insurance Company of America POC**, and select **Liberty Mutual Agent Portal**. Your GitHub and Daniel logins are not authoring accounts.`,
          "Open **Default editing host**, select **Local host**, enter **http://localhost:3000** in **Enter the editing host url**, and click **Save**. Keep npm run dev running on this same machine.",
          "Select **Pages**, expand **Home**, and select **Learning & resources**. Find **What can we help you find?**, the heading of the **Search** component, on the canvas. This confirms that the editor can reach the local frontend before you change its code.",
        ],
        links: [{ label: "Open Page Builder", href: pageBuilder }],
        expected: [
          "The canvas now uses your local React components with shared **SitecoreAI** Preview content. This local selection does not replace the shared **Default** editing host or deploy your branch.",
          "The editor uses safe preview data without requiring a fictional agent login inside the canvas. Search controls are intentionally disabled there so authors can select and edit the component. Use the separate signed-in localhost tab to test interactive Search behavior.",
        ],
        note: "Use **Chrome** if an embedded-browser canvas stays loading. Do not edit or publish shared CMS fields during this code exercise: local code and saved work are individual, but **SitecoreAI** content is shared.",
      },
    ],
    cleanup: {
      body: [
        "Continue to [**Change a React component**](/workshops/guide/component-development) with the terminal, **Page Builder**, and localhost tabs open. If stopping here, select **Default editing host** in the editing-host selector and click **Save**, sign out of the localhost portal with **Daniel Ortiz** → **Sign out**, then press Ctrl+C in the terminal.",
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
    category: "Develop locally",
    title: "Change a React component",
    summary:
      "Change one **ResourceSearch** heading in **VS Code**, see it in **Page Builder**, and verify Search in the local portal.",
    outcome:
      "See a code change appear in the visual editor, confirm that native Search still works, and restore the original code without affecting other attendees.",
    personas: ["daniel"],
    prerequisites: [
      "**Search** is the Page Builder component containing the search heading, filters, and results on **Learning & resources**. Its React implementation is **ResourceSearch**. You will change one heading that lives in code while leaving its SitecoreAI Search integration intact. This shows the development loop on a functional component, not just a static page.",
      "Complete [**Run the portal locally**](/workshops/guide/local-setup). Keep your **cloned repository root** open in **VS Code** and its integrated terminal in **examples/liberty-mutual-agent-portal**. All commands in this guide run from that application folder.",
      "Check the branch name in VS Code’s lower-left status bar: use the **workshop/your-name-resource-search** branch created during setup. Open **Source Control** and confirm **ResourceSearch.tsx** has no existing edits. If it does, preserve that work in a different checkout before starting this one-file exercise.",
      `Keep two **Chrome** tabs: [**Page Builder**](${pageBuilder}) for **Liberty Mutual Agent Portal**, connected to **Local host** at **http://localhost:3000**, and the [**local portal**](http://localhost:3000/login), signed in as **daniel.01** with password **Sitecore**. Page Builder shows how an author sees your component; the portal shows how an agent uses it. Your invited Sitecore account opens Page Builder; Daniel supplies only the portal session.`,
      "Keep npm run dev running. This exercise needs no Sitecore content publication, personalization-profile activity, **Vercel** access, or deployment.",
    ],
    links: [
      {
        label: "Run the portal locally",
        href: `${portal}/workshops/guide/local-setup`,
      },
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
          "Open the [**local portal login**](http://localhost:3000/login), sign in as **daniel.01** with password **Sitecore**, and select **Learning & resources** in the left navigation. Record a baseline so you can distinguish your text change from any unintended change to Search behavior.",
          "Confirm the heading **What can we help you find?** Enter workers compensation and click **Search**.",
          "Keep **My licensed states** selected in **Risk state** and record the Illinois, Texas, and nationwide result titles you see. In the separate Page Builder tab, select **Pages** → **Home** → **Learning & resources**, keep **Local host** selected, and confirm the same starting heading.",
        ],
        expected: [
          "Native Search returns the currently published, indexed resources within Daniel’s licensed scope. Record actual titles rather than relying on a fixed result count, because the shared catalog can change.",
        ],
      },
      {
        title: "Find the code-owned heading",
        action: [
          "In the root **Explorer**, expand **examples** → **liberty-mutual-agent-portal** → **src** → **components** → **resource-search**, then open **ResourceSearch.tsx**.",
          "Use the editor’s **Find** command to search for **What can we help you find?** The matching h2 should match the example below. Inspect the surrounding **useSearch** integration without changing hooks, filters, fields, or registration.",
        ],
        code: "<h2>What can we help you find?</h2>",
        expected: [
          "The heading is literal React text, so a developer changes it in this file. Resource article titles, summaries, and bodies are content fields maintained by authors in **SitecoreAI**. Recognizing that ownership tells you whether a change requires a code release or content publication.",
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
          "The canvas displays **Find guidance for your next client conversation** from your local React code. If the original heading remains, confirm the file is saved, check the dev terminal for compile errors, and confirm **Local host** is selected; then click **Reload canvas**.",
        ],
        note: "**What to notice:** Your **React** edit appears in **Page Builder** through **Local host**, with content still hosted in **SitecoreAI**. Your code change stays local; CMS content remains shared, so leave content fields unchanged during this exercise.",
      },
      {
        title: "Verify the integrated behavior still works",
        action: [
          "Return to [**local Learning & resources**](http://localhost:3000/resources). Confirm the changed heading, then click **Search** with the same workers compensation query. Under **Risk state**, select **Illinois** to check that narrowing the result scope still works.",
          "Compare the results to the baseline. Return to **My licensed states** after the comparison.",
        ],
        expected: [
          "Illinois and nationwide guidance remain; the Texas-specific result drops out when Illinois is selected. The one-line copy edit has not changed native retrieval or licensing filters. These functional controls are tested in the portal, not the read-only editor canvas.",
        ],
      },
      {
        title: "Review the diff and run the application checks",
        action: [
          "Click the integrated terminal running dev and press Ctrl+C to stop it. Keep the terminal in **examples/liberty-mutual-agent-portal**. Run each command below separately, wait for it to finish, and review errors before continuing; do not run a build while dev is using the same generated files.",
          "Use **VS Code** **Source Control** as well as the component diff. Do not stage environment files, **.portal-state**, generated **.sitecore** files, or generated metadata.",
        ],
        code: "git diff -- src/components/resource-search/ResourceSearch.tsx\nnpm test\nnpm run test:setup\nnpm run lint\nnpm run type-check\nnpm run build",
        expected: [
          "The component diff removes the original h2 text and adds your replacement. Test summaries report no failures; lint and **TypeScript** finish without errors; the build finishes successfully. If any command fails, keep its error output and ask the workshop team for help rather than treating later successful commands as a pass for the failed check.",
          "npm test checks application behavior; npm run test:setup checks the local setup helper; lint and type checking catch code issues; npm run build regenerates **Content SDK** artifacts and compiles the app. Its final check looks for configured private values in browser bundles. Together with your browser checks, these establish evidence for a future code review.",
          "Authenticated npm start requires a properly configured durable store. The app deliberately rejects local-json in production mode; use npm run dev for this local workshop.",
        ],
        note: "If type checking runs before any development start or build in a fresh checkout, first run npm run sitecore-tools:generate-map and npm run sitecore-tools:build. The local setup guide already starts the development server.",
      },
      {
        title: "Restore only your exercise edit",
        action: [
          "Review the diff. If this file contains only the uncommitted workshop edit, run the following restore command. If it also contains other work, manually restore only this heading instead.",
          "Restart npm run dev. In **Learning & resources**, click **Clear filters** if it is shown, erase the query text, then click **Search**.",
          "Confirm the original heading and default licensed-state resource view. In **Page Builder**, confirm the original heading on **Local host**, then select **Default editing host** and click **Save**. Use **Daniel Ortiz** → **Sign out** in the localhost portal, then stop dev with Ctrl+C.",
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
        "The workshop ends with local verification. The release-path discussion explains how reviewed code would reach a shared environment; attendees do not need to push a branch, open a PR, or access **Vercel**.",
      ],
    },
    related: ["local-setup", "vscode-mcp", "release-and-recovery"],
    sourceSlides: [51, 52, 53, 54, 127],
  },
  {
    slug: "vscode-mcp",
    audience: "development",
    accountScope: "local",
    category: "Develop locally",
    title: "Connect VS Code to SitecoreAI",
    summary:
      "Connect your VS Code coding assistant to SitecoreAI and Sitecore documentation so it can explain this implementation using retrieved evidence.",
    outcome:
      "Inspect real **Sitecore** results beside the local **ResourceSearch** component and propose a change without making it.",
    personas: [],
    prerequisites: [
      "**Model Context Protocol (MCP)** lets a coding assistant call external tools. In this optional exercise, one connection reads this sandbox’s SitecoreAI content, and a second retrieves product documentation. Your assistant combines those results with local source files to explain the implementation; it will not change them.",
      "Complete the clone and **Open Folder** steps in [**Run the portal locally**](/workshops/guide/local-setup) first. In VS Code’s **Explorer**, confirm the **cloned repository root** is open and **authoring**, **docs**, and **examples** are its children. This exercise reads that checkout but does not require a running frontend.",
      "Open **Copilot Chat** in your current **VS Code** and confirm that **Agent** mode is available. Sign in with the GitHub account that has your organization’s Copilot access. If Agent mode or MCP tools are unavailable, ask your organization’s development support team to confirm the extension, license, and policy before continuing.",
      "The content connection requires your own **Sitecore Cloud** account with a **SitecoreAI** application **Admin** role in **Safeco Insurance Company of America POC**. Ask Angela, Allen, or Thomas to confirm that access before this optional exercise; a scoped workshop **Author** or **Approver** role is not the required application Admin role.",
      "The documentation connection has a separate **Google** sign-in. Use a Google account permitted by your organization for that service. If company policy does not allow either connection, skip this optional guide; the local component exercise still works.",
      "The names **liberty-mutual-sitecoreai** and **sitecore-documentation** identify the two connections in VS Code. They are not portal usernames or separate deployments. You can leave the local development server stopped because the assistant is inspecting files and remote services.",
    ],
    links: [
      {
        label: "Run the portal locally",
        href: `${portal}/workshops/guide/local-setup`,
      },
      { label: "Open the Sitecore organization", href: sitecore },
      {
        label: "Official Sitecore Marketer MCP setup",
        href: "https://doc.sitecore.com/sai/en/users/sitecoreai/sitecore-marketer-mcp-server.html",
      },
      {
        label: "Open Sitecore Documentation",
        href: "https://doc.sitecore.com",
      },
    ],
    repositoryFiles: [
      {
        label: "MCP configuration example",
        path: "docs/examples/mcp.vscode.json",
      },
    ],
    steps: [
      {
        title: "Create or merge the root workspace configuration",
        action: [
          "Select **View** → **Command Palette** → **MCP: Open Workspace Folder MCP Configuration**. The workspace file tells VS Code which remote tools to offer for this repository.",
          "If the file is new, paste the complete JSON below. If it already contains connections, add only these two entries to its existing **servers** object and preserve the other entries. Save **.vscode/mcp.json** at the **repository root**; this configures VS Code, while the app’s **.env.local** configures the running portal.",
        ],
        code: '{\n  "servers": {\n    "liberty-mutual-sitecoreai": {\n      "type": "http",\n      "url": "https://marketer.sitecorecloud.io/mcp/marketer-mcp-prod"\n    },\n    "sitecore-documentation": {\n      "type": "http",\n      "url": "https://sitecore.mcp.kapa.ai"\n    }\n  }\n}',
        expected: [
          `**VS Code** loads the connections from **.vscode/mcp.json** at the repository root. **docs/examples/mcp.vscode.json** provides a reference copy of this configuration.`,
          "The file contains each connection’s type and URL. **VS Code** manages account authorization separately from this configuration. Continue to [**Authorize the Sitecore connection for the Liberty Mutual environment**](#step-2).",
        ],
      },
      {
        title:
          "Authorize the Sitecore connection for the Liberty Mutual environment",
        action: [
          "Run **MCP: List Servers** → **liberty-mutual-sitecoreai** → **Start Server**. Review any trust prompt and the browser authorization request.",
          "In the browser, **Sign in** with the invited Sitecore Cloud email that has the application Admin role. Review the authorization request before choosing **Allow Access**; this connection has requested openid, email, profile, and offline_access. This account authorization gives the connection access to your selected Sitecore environment; it is separate from the fictional agent portal login.",
          "Choose **Safeco Insurance Company of America POC**, then the SitecoreAI environment for **Liberty Mutual Agent Portal**. The configured environment is **scaipocusem400b-sitecoreai950c-demo4418**, recorded as **SitecoreAI / Demo** in the repository. Display labels can differ; the native site lookup later in this guide confirms the selection. If you cannot identify that environment, ask the workshop team before authorizing a different one.",
          "Select **Open Visual Studio Code** to return to the editor. Do not copy a token, portal password, or editing secret into the MCP file.",
        ],
        expected: [
          "The browser authorization connects **liberty-mutual-sitecoreai** in VS Code to the organization and environment you selected.",
          "The connection uses your Sitecore account permissions. In the next step, select the read tools needed to inspect the site and explain its implementation.",
        ],
      },
      {
        title: "Start the documentation connection and select read tools",
        action: [
          "Open **View** → **Command Palette**, then run **MCP: List Servers** → **sitecore-documentation** → **Start Server**. Complete the separate **Google** sign-in when prompted and return to **VS Code**. This connection supplies documentation rather than customer content.",
          "Open **Chat** → **Agent** → **Configure Tools**, or **Configure Chat** → **Tools** where that label is shown.",
          "Expand the two server groups in the tool picker. Enable the documentation query tools and Sitecore read tools such as **list_sites**, **get_all_pages_by_site**, **get_components_on_page**, **get_allowed_comps_by_ph**, and **get_content_item_by_path**. Keep tools that create, update, delete, or publish content disabled; none is needed to explain the implementation.",
        ],
        expected: [
          "The two connections are ready for different tasks: **sitecore-documentation** retrieves product guidance, and **liberty-mutual-sitecoreai** reads the customer sandbox using your Sitecore account.",
        ],
        note: "If startup fails, use **MCP: List Servers** → the server → **Show Output**. Check configuration syntax, account access, network, and company policy. Avoid adding a duplicate connection through **Ask AI** → MCP if this configuration already defines it.",
      },
      {
        title: "Ask for documentation evidence",
        action: [
          "Start a new **Agent** chat and paste the prompt below. The **Content SDK** is Sitecore’s React/Next.js integration; a **datasource** supplies a component’s content fields, and a **placeholder** is a named slot with rules for allowed components. The prompt asks the assistant to retrieve documentation explaining these implementation concepts.",
          "Expand the resulting tool call to confirm that **sitecore-documentation** ran, then open the cited official links. Compare their SDK guidance with **@sitecore-content-sdk/nextjs** in the app’s **package.json** and the installed version recorded in **package-lock.json**. This checks that the answer is based on retrieved documentation appropriate to this project.",
        ],
        code: "Use sitecore-documentation to explain how Sitecore Content SDK components render datasource fields and how placeholder restrictions work. Link the current official documentation. Do not change files or Sitecore content.",
        expected: [
          "The expanded documentation tool call shows the information retrieved, and the official links let you check the answer against its sources.",
        ],
      },
      {
        title: "Inspect the native site and Learning & resources page",
        action: [
          "In the same Agent chat, paste the prompt below. Expand the Sitecore tool result and confirm that **liberty-mutual-agent-portal** is actually returned. Its content root must be **/sitecore/content/LibertyMutual/liberty-mutual-agent-portal**; **Home/resources** is the **Learning & resources** page.",
          "If the site is missing or its path differs, do not substitute another site. Use **MCP: List Servers** → **liberty-mutual-sitecoreai** → **Show Output** to capture the connection error, and ask the workshop team to check your authorized organization, tenant, and access.",
        ],
        code: "Use liberty-mutual-sitecoreai to list the available sites. Find liberty-mutual-agent-portal and show its site ID and content root. Find Home/resources, displayed as Learning & resources, and show its component names, datasource paths, and allowed components for each placeholder. Use returned IDs and read tools only. Do not change or publish content.",
        expected: [
          "Returned Sitecore results identify the intended site, its component arrangement, and the content items those components read. This is the evidence that the assistant reached this environment, rather than supplying a generic explanation. Relevant tools include **list_sites**, **get_all_pages_by_site**, **get_components_on_page**, **get_allowed_comps_by_ph**, and **get_content_item_by_path**.",
          "Use the returned site and page IDs to connect the answer to this environment. The **search_site** tool finds pages by name; **get_content_item_by_path** retrieves the content item you want to inspect.",
        ],
      },
      {
        title: "Connect the results to the checked-out component",
        action: [
          "Open **examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx** in **VS Code** and submit the following prompt.",
          "Compare the proposed heading and file path with the open file, and compare its CMS claims with the native results from the preceding step. Do not apply the proposal in this guide; [**Change a React component**](/workshops/guide/component-development) provides the separate edit, verification, and restoration sequence.",
        ],
        code: "Use the Sitecore results, sitecore-documentation, and ResourceSearch.tsx in this workspace to explain which resource-search content is authored in Sitecore and which text lives in code. Compare the implementation with the current Content SDK guidance. Propose one small heading edit, with the file path and relevant documentation links. Do not edit files or Sitecore content.",
        expected: [
          "The answer distinguishes CMS fields from React text and cites the local implementation. Local file inspection is a **VS Code** capability; the remote servers do not themselves read your checkout.",
        ],
        links: [
          {
            label: "Change a React component",
            href: `${portal}/workshops/guide/component-development`,
          },
        ],
      },
    ],
    cleanup: {
      body: [
        "Start a **New Chat**. Open **View** → **Command Palette** and run **MCP: List Servers** → **liberty-mutual-sitecoreai** → **Stop Server**; repeat for **sitecore-documentation**. Keep **.vscode/mcp.json** only if you want to reuse these connections. This file is ignored by the repository and should not be added to your exercise commit.",
        "Stopping a server ends its current connection but does not revoke its account authorization. Account disconnection is separate from this read-only exercise; no authorization change is needed to finish.",
        "The assistant’s inspection leaves application source files and Sitecore content unchanged. For later tasks that make changes, review the proposed files, content items, and actions before allowing the assistant to proceed.",
      ],
    },
    related: ["component-development", "resource-taxonomy"],
    sourceSlides: [123, 124, 125, 126],
  },
  {
    slug: "release-and-recovery",
    audience: "development",
    category: "Understand the architecture",
    title: "Understand deployment and recovery",
    summary:
      "Follow three different kinds of change—React code, page content, and the CMS content model—to understand how each is released and recovered.",
    outcome:
      "Explain the release path for each change without requiring an attendee deployment or hosting account.",
    personas: [],
    prerequisites: [
      "**Frontend code** defines how the website renders and behaves. **Authored content** contains the words, images, and component choices marketers manage. The **CMS model** defines the available fields and components. Keeping their release paths separate allows an ordinary content update to reach agents without a frontend code deployment.",
      "This read-only guide uses a simple example: changing a search heading in React code. You will make that local edit later in [**Change a React component**](/workshops/guide/component-development); no earlier code exercise is required here. No **Vercel** access, hosting transfer, branch push, or deployment is required.",
      "Use the **Liberty Mutual GitHub repository** supplied by your workshop team. Every file path starts at that repository’s top-level file list. Browse the folders on GitHub or use your local checkout in VS Code. Ask your Liberty Mutual workshop contact if you need the address or access. Reading these files does not require configuring or running a deployment.",
      "Use this discussion to understand release responsibilities for a future operational site. Your workshop environment is available for the agreed evaluation period.",
    ],
    links: [
      {
        label: "Change a React component",
        href: `${portal}/workshops/guide/component-development`,
      },
    ],
    repositoryFiles: [
      {
        label: "Release runbook",
        path: "docs/developer-handoff.md",
        section: "Vercel release process",
      },
    ],
    steps: [
      {
        title: "Follow a frontend change from GitHub to Vercel",
        action: [
          "Read the release sequence for the heading change: create a local branch and verify the edit → push for a reviewed pull request and checks → inspect its **Vercel** preview → merge reviewed code into **main** → verify the live deployment. The preview provides a hosted copy for review before the live site changes. These are explanatory stages; do not push or merge during this workshop.",
          `Open **Portal validation** (**.github/workflows/portal-validation.yml**). Find its **pull_request** and **push** triggers and the **Offline validation** and **Connected production build** jobs. These explain which checks are automated; a local commit alone does not trigger them or deploy the app.`,
        ],
        expected: [
          "The checked-in **Portal validation** workflow defines **Offline validation** and **Connected production build**. Running it in Liberty Mutual’s repository requires that repository’s GitHub Actions configuration and Sitecore connection settings. **Vercel** independently builds and hosts the frontend from **examples/liberty-mutual-agent-portal** using **Node** 24, npm ci, and npm run build.",
          "A successful build and **Ready** deployment still need checks of the changed experience on that host. Review its source commit, environment, and relevant native services.",
          "The **SitecoreAI Vercel Deploy App** can provide a deployment entry point inside SitecoreAI when that integration is configured. This portal deploys frontend changes through its existing **GitHub-to-Vercel** connection.",
        ],
        repositoryFiles: [
          {
            label: "Portal validation",
            path: ".github/workflows/portal-validation.yml",
          },
        ],
      },
      {
        title: "Distinguish authored content from CMS model changes",
        action: [
          "For ordinary page text, layout, or images, follow **SitecoreAI** authoring → editorial review → publication to **Experience Edge**, Sitecore’s globally distributed content delivery service. The existing frontend reads that published content; an ordinary content edit does not require a new frontend deployment.",
          `Open the **authoring build configuration** (**xmcloud.build.json**) and find **deployItems.modules**. These are the CMS definitions included in an authoring deployment through **SitecoreAI Deploy**: templates, rendering definitions, and placeholder rules. A frontend push does not automatically deploy authoring; that trigger must be configured separately. Do not run a Deploy App release for this discussion.`,
        ],
        expected: [
          "The CMS model includes **templates** that define fields, **rendering definitions** that register components, and **placeholder settings** that limit their placement. These definitions are **serialized** into source-controlled files so developers can review and deploy them together. The authoring resource package includes **nextjs-starter**, **LibertyMutual.Model**, **LibertyMutual.SitePresentation**, and **LibertyMutual.SupportForm**; **renderingHosts** is empty because Vercel hosts the frontend.",
          "**Items as Resources** supplies CMS definitions as part of the deployed solution. Initial pages, classification choices, and **page branches**—starting structures for new pages—are provisioned separately as editable content. That separation lets normal code and model releases preserve marketers’ later edits. The runbook documents both procedures.",
          "Search indexing, personalization activation, and CMS publication have distinct steps. Code deployment alone does not publish content, refresh the index, or activate a rule.",
        ],
        repositoryFiles: [
          {
            label: "Authoring build configuration",
            path: "xmcloud.build.json",
          },
        ],
      },
      {
        title: "Keep local editing separate from shared hosting",
        action: [
          "**Page Builder** is SitecoreAI’s visual editor. Its **editing host** is the frontend used to render the page preview, called the **canvas**. **Local host** renders code at **http://localhost:3000**, with each developer’s browser connecting to that developer’s machine.",
          "The shared **Default editing host** uses the hosted preview frontend for normal authoring. If Page Builder remains open from the component exercise, open its editing-host selector, select **Default editing host**, then click **Save**. This returns your canvas to the shared frontend before you stop your local server.",
        ],
        expected: [
          "The local app needs Preview server content access and the matching editing secret, supplied automatically by setup:local for this POC. The browser uses its separate public-scoped context.",
          "Selecting **Local host** does not change the registered shared host, require a CMS publication, or deploy code. Changing the shared **Default** host is a separate platform maintenance operation.",
          "Editing routes use safe preview data and suppress engagement tracking. Local code is individual; shared CMS field edits still affect the common authoring environment.",
        ],
        repositoryFiles: [
          {
            label: "Shared editing-host maintenance reference",
            path: "docs/developer-handoff.md",
            section: "Dedicated editing host",
          },
        ],
      },
      {
        title: "Choose recovery for the layer that changed",
        action: [
          "Compare two recovery examples without performing either: a broken React component calls for a developer to restore a compatible hosting deployment and review a source correction; incorrect article text calls for an author to restore a content version, complete review, and republish it.",
          "A broken field definition or component-placement rule belongs to the CMS model release path and needs a compatible model correction. Match recovery to the layer that changed so you do not expect a hosting rollback to undo a content edit. Discuss who would own monitoring, dependency maintenance, and recovery for each layer in a future operational site.",
        ],
        expected: [
          "An application rollback does not reset saved work, undo CMS publication, or reverse experiment history. A workshop workspace reset does not restore authored content.",
          "No deployment or rollback is performed in this discussion. The local developer exercise is complete without sharing a **Vercel** account.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close optional reference tabs. This discussion changes no code, content, hosting, or saved work.",
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
    category: "Understand the architecture",
    title: "Inspect resource metadata",
    summary:
      "Inspect the Resource metadata panel in Page Builder and trace its author-friendly classification choices to the values used by Search.",
    outcome:
      "Explain how a custom Sitecore Marketplace app gives authors managed dropdown choices while preserving Search-compatible fields and licensing filters.",
    personas: [],
    prerequisites: [
      "A **resource** is an article listed in **Learning & resources**. Its **metadata** classifies the article by state, product, and other attributes used by Search. **Taxonomy** means the managed list of choices for those classifications. This walkthrough inspects how authors choose those values without typing inconsistent text.",
      "The **Resource metadata** panel is a custom **Marketplace app**, an extension installed inside SitecoreAI and opened from Page Builder. It provides controlled dropdowns while saving text values that this environment’s native Search can index. It is part of this implementation, rather than a built-in dropdown editor.",
      "Use your invited **Sitecore Cloud** account in **Safeco Insurance Company of America POC**. This optional inspection requires organization administrator/owner access to the installed **Resource metadata** Marketplace app. Ask Angela, Allen, or Thomas to confirm that access; a presenter **Author** or **Approver** account does not imply access to this app.",
      `Open the [**Sitecore organization**](${sitecore}) and [**Page Builder**](${pageBuilder}) before starting. Confirm **Liberty Mutual Agent Portal** and **Default editing host** in Page Builder. If the app is unavailable to your account, observe a presenter with that access instead of changing your workshop role.`,
      "The first step reads a taxonomy definition in **Liberty Mutual’s GitHub repository**, supplied by your workshop team. Use your authorized GitHub account and browse from its top-level file list using the paths shown here. Ask your Liberty Mutual workshop contact for the address or access if needed. No clone or source edit is required.",
      "This guide inspects shared configuration without editing it. Do not create taxonomy options, change article metadata, publish content, or reindex Search during the inspection. Separate authoring guides cover deliberate resource changes and their cleanup.",
    ],
    links: [
      { label: "Open the Sitecore organization", href: sitecore },
      { label: "Open Page Builder", href: pageBuilder },
    ],
    steps: [
      {
        title: "Trace the Texas choice to its managed taxonomy definition",
        action: [
          `Open the **Texas taxonomy definition** (**authoring/items/liberty-mutual/items/taxonomy/Taxonomy/Risk states/TX.yml**). In this read-only GitHub file, find **Path**: **/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy/Risk states/TX**. This locates the managed choice in the site-level **Data** folder, outside **Home**.`,
          "Find **Hint: __Display name** with **Value: Texas**, then **Hint: description** with **Value: Resource guidance specific to a Texas risk.** The final item name in the path is **TX**. Comparing these values explains how authors see a readable label while Search keeps a stable state value.",
        ],
        expected: [
          "**TX** is the stable value stored on articles and used by Search; **Texas** is the label shown to authors. **Description** supplies help text. Separating the label from the stored value lets the interface remain readable without changing the underlying filter value.",
          "The YAML file is a **serialized** representation of a Sitecore content item. These choices are seeded as editable CMS content and excluded from **Items as Resources**, the package used to deploy CMS definitions. Normal application and model releases preserve subsequent author edits to the choices.",
          "The file records the initial taxonomy definition, not a live read of the tenant. The next step inspects the installed panel’s current values. Opening the file does not change Sitecore content.",
        ],
        repositoryFiles: [
          {
            label: "Texas taxonomy definition",
            path: "authoring/items/liberty-mutual/items/taxonomy/Taxonomy/Risk states/TX.yml",
          },
        ],
      },
      {
        title: "See the choices in the installed Page Builder panel",
        action: [
          `Open [**Page Builder**](${pageBuilder}), select **Liberty Mutual Agent Portal**, and keep **Default editing host** selected. Under **Pages** → **Home** → **Learning & resources**, open **Workers compensation: a Texas starting point**. Its item path ends in **/Home/resources/texas-workers-compensation**. Use this article so its state metadata can be compared with the **TX** definition from the first step.`,
          "Select **English** and note the displayed version and workflow status. Use that same Texas article and version throughout this inspection; do not create a new version.",
          "Open **Apps** → **Resource metadata**. Inspect **Risk state**, **Business family**, **Product**, **Distribution channel**, and **Resource type**. This panel edits classification fields on the selected article; it does not replace the article’s visible text or image.",
          "Select the **Learning & resources** landing page and read the panel’s explanation. This checks what happens when an author opens the app on a page that is not a resource article. Return to **Workers compensation: a Texas starting point** and the version you recorded.",
        ],
        expected: [
          "The five dropdowns each permit one choice. They are supplied by the managed taxonomy; **Cross-state guidance** stores **All** and does not bypass licensed-state filtering.",
          "The panel appears for **ResourcePage** articles. On an **Approved** version, its fields are read-only so you can inspect the selected version’s classification. The landing page displays an explanation that resource metadata applies to article pages.",
          "To revise an approved article, an author creates a **Draft**, then edits and saves that draft’s fields throughout the review process.",
        ],
        links: [{ label: "Open Page Builder", href: pageBuilder }],
      },
      {
        title: "Understand the save and concurrency boundaries",
        action: [
          `Open **Metadata validation and save service** (**examples/liberty-mutual-agent-portal/src/features/resource-metadata/metadata-service.ts**) and **Resource metadata authoring and access scope** (**docs/resource-metadata-authoring.md**). Both paths start at the **repository root**. Read the save validation and native readback behavior; do not call the save operation.`,
          "Return to the Texas article’s panel and select **Refresh** to reload the selected version and managed choices. If you accidentally changed a dropdown, choose **Discard changes** before refreshing. Compare **Risk state: Texas** and its help text with the **TX** definition from the first step. If another workshop edit has changed the current value, record the difference without saving over it.",
        ],
        expected: [
          "The panel rereads labels and help text from the managed lists. No change is expected during this read-only check. An author can maintain a label without a code deployment while preserving the stable item name and stored Search value.",
          "**Save metadata** validates selected **Draft** fields and reads changes back. The panel does not autosave, create versions, approve, publish, or reindex.",
          "**Discard changes** restores unsaved selections only. After an uncertain save, **Refresh** and inspect the actual native values before deciding what to do next.",
          "This custom app uses an API with administrator privileges, so app access is restricted. Its underlying GraphQL save cannot reject a competing update atomically. Have one person edit a given article version at a time to avoid overwriting another person’s change.",
        ],
        repositoryFiles: [
          {
            label: "Resource metadata authoring and access scope",
            path: "docs/resource-metadata-authoring.md",
          },
          {
            label: "Metadata validation and save service",
            path: "examples/liberty-mutual-agent-portal/src/features/resource-metadata/metadata-service.ts",
          },
        ],
      },
      {
        title: "Review dependencies before adding or renaming a value",
        action: [
          `Open the **managed taxonomy folders** (**authoring/items/liberty-mutual/items/taxonomy/Taxonomy**) to see **Risk states**, **Business families**, **Products**, **Distribution channels**, and **Resource types**. Then open the **taxonomy preservation rule** (**authoring/items/liberty-mutual/LibertyMutual.Taxonomy.module.json**) and find **allowedPushOperations: CreateOnly**. These source references explain where the choices originate and why the seed does not overwrite later author changes; do not edit or deploy these files.`,
          "Consider adding a new state as a design example: compare its stable item name, readable label, application mappings, agent eligibility, existing resource values, and Search validation. This explains why editing a label and adding a new supported state have different consequences.",
        ],
        expected: [
          "Adding a state does not add a license or carrier appointment. Renaming an option’s item name does not update existing string values on articles.",
          "The managed labels serve the author panel. Visitor-facing facet labels currently come from the application and do not automatically adopt these display names.",
          "The **Resource metadata** app presents managed dropdown choices and stores Search-compatible text values on the article. This gives authors controlled choices while keeping the indexed fields compatible with native Search.",
        ],
        repositoryFiles: [
          {
            label: "Managed taxonomy folders",
            path: "authoring/items/liberty-mutual/items/taxonomy/Taxonomy",
          },
          {
            label: "Taxonomy preservation rule",
            path: "authoring/items/liberty-mutual/LibertyMutual.Taxonomy.module.json",
          },
        ],
      },
      {
        title: "Follow an approved resource change through delivery",
        action: [
          "Read the release sequence without executing it: an authorized author saves metadata on a **Draft**, completes the review workflow, and publishes the article and any changed local **Resource image** datasource. **Save metadata** alone does not make the change visible on the live portal.",
          "For indexed text or metadata, the separate refresh is **Content** → **Search Sources** → **Liberty Mutual Agent Resources** → **Reindex Content**. **Reindexing** refreshes the copy Search retrieves; the author then checks the published article and Search result with a licensed agent. Do not click **Reindex Content** for this unchanged inspection.",
        ],
        expected: [
          "Saving, publication, and reindexing are three different operations. An existing bookmark continues to use the resource’s stable item ID.",
          "An image-only change requires publication of the page and its changed image datasource, plus delivery of the selected media asset, but no Search reindex. New page branches affect new pages; they do not overwrite existing articles.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Use **Discard changes** if you made any unsaved panel selections, and close temporary authoring tabs. This inspection saves no changes, so it needs no publication, Search refresh, or portal reset.",
        "If you accidentally saved a CMS change, stop and tell the workshop team which item and version changed. A portal workshop reset cannot restore taxonomy or article content; recovery must use the recorded native content and its workflow.",
      ],
    },
    related: ["architecture-and-ownership", "release-and-recovery"],
    sourceSlides: [117, 118, 119, 142],
  },
  {
    slug: "saved-work-reset",
    audience: "development",
    category: "Reset and repeat",
    title: "Reset your workshop number",
    summary:
      "Give your seven agent logins a clean starting point by restoring sample saved work and linking each login to a fresh SitecoreAI profile.",
    outcome:
      "Repeat portal and personalization exercises with starting records and fresh browsing histories, while keeping the same usernames and password.",
    personas: [],
    prerequisites: [
      "Your **workshop number** is the suffix shared by your seven fictional agent logins, such as **daniel.01** and **maya.01**. Each agent has a different scenario and known attributes. A reset restores the group’s sample saved work and creates fresh **SitecoreAI profiles**, the records used to connect those attributes with browsing behavior.",
      "Use a portal username such as **daniel.01** with password **Sitecore** to sign into the workshop website. This is separate from the Sitecore Cloud account used for Page Builder. No separate operator account, secret, terminal command, or approval is needed.",
      `Identify the website where you performed the exercise by its browser address: **liberty-mutual-agent-portal.vercel.app** is live; **liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app** is the shared transaction preview. Their saved work is separate. Open [**Live portal: reset a workshop number**](${portal}/workshops/reset) or [**Transaction preview: reset a workshop number**](${previewPortal}/workshops/reset) to match that hostname; do not use either link to reset the isolated localhost exercise.`,
      "Check [**Attendee assignments**](/workshops/attendees) if you need your portal workshop number. Use your assigned number from 01–20. Number 01 belongs to the presenters. This number identifies portal logins; it does not grant Sitecore authoring access. The reset page initially selects the number from your workshop website sign-in, but it also allows you to choose another number.",
      "A reset affects all seven personas and every agency with that suffix. Check the displayed number so you do not replace another attendee’s work by mistake.",
    ],
    links: [
      {
        label: "Check attendee assignments",
        href: `${portal}/workshops/attendees`,
      },
      {
        label: "Live portal: reset a workshop number",
        href: "https://liberty-mutual-agent-portal.vercel.app/workshops/reset",
      },
      {
        label: "Transaction preview: reset a workshop number",
        href: "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset",
      },
    ],
    steps: [
      {
        title: "Open the reset page for the website you used",
        action: [
          `Use [**Live portal: reset a workshop number**](${portal}/workshops/reset) if your exercise used the shorter liberty-mutual-agent-portal hostname. Use [**Transaction preview: reset a workshop number**](${previewPortal}/workshops/reset) if it used the longer git-c8199e hostname. If prompted, sign into the workshop website with **daniel.01** and password **Sitecore**.`,
          "Check the browser hostname and the environment label above **Workshop number**. Select your portal workshop number from [**Attendee assignments**](/workshops/attendees), and check that every username listed below has that suffix. For example, resetting 02 includes all seven .02 accounts. The reset does not change Sitecore authoring accounts or practice-page content.",
        ],
        expected: [
          "The page shows the selected group’s saved-work status and one **Agent identity** per persona. An Agent identity is the identifier linking a portal login to its current SitecoreAI profile; it changes when the number is reset, even though the username does not.",
          "Opening the page, selecting a number, or clicking **Refresh status** does not reset it. Every reset applies only to the host shown in your browser, not both environments.",
        ],
        links: [
          {
            label: "Live portal: reset a workshop number",
            href: "https://liberty-mutual-agent-portal.vercel.app/workshops/reset",
          },
          {
            label: "Transaction preview: reset a workshop number",
            href: "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset",
          },
        ],
      },
      {
        title: "Check what the clean reset includes",
        action: [
          "Review the selected workshop number and its seven usernames. The reset always restores starting operational work and creates seven fresh verified native profiles together.",
          "Record any submission references, saved resource names, or learning registrations you want to discuss later; these will be replaced by starting records. If you only want to leave and return to the same saved work later, **Sign out** instead of resetting.",
        ],
        expected: [
          "The selected number is the only setting to choose. All seven personas receive starting tasks, submissions, favorites, and learning plans, plus new Agent identities.",
          "Earlier native profiles and their analytics remain historical; their browsing behavior is not carried into the new profiles. Native experiment history is not erased.",
          "Saved work has no automatic expiry. Signing out or returning later does not perform this reset.",
        ],
      },
      {
        title: "Start the reset and wait for completion",
        action: [
          "Click **Reset workshop {{pack}}** for the selected number. This starts the clean reset immediately; there is no separate approval or confirmation dialog.",
          "Keep the page open while **Reset in progress** is shown. Wait for the success message, such as **Workshop {{pack}} is ready**, before signing into the portal again. A pending import is not a completed reset.",
        ],
        expected: [
          "Seven new profiles are imported and verified before activation. Pending progress does not mean the new set is active.",
          "When completed, the **Saved-work run** identifies the restored set of operational records, the **Profile generation** counts the new set of profiles, and all seven **Agent identities** change. These are status details; your chosen workshop number and usernames stay the same.",
          "The other workshop numbers and the other host’s saved-work run stay unchanged. The workshop-guide login remains separate from the portal sessions being replaced.",
        ],
        note: "If the connection is interrupted, reopen the same page and click **Refresh status**. Use **Continue reset** if a pending operation is shown, rather than starting another profile set.",
      },
      {
        title: "Sign in again and inspect starting work",
        action: [
          "Click **Open this Agent Portal** on the reset page to stay on the same host. **Sign in** again with the persona you used, the workshop number you just reset, and password **Sitecore**.",
          "Open the areas used in your exercise. Compare the starting submissions, tasks, and saved resources with the example references you recorded.",
          "Use the same workshop number when switching among personas. Other browser tabs for that workshop number must also sign in again.",
        ],
        expected: [
          "Previous portal sessions for all seven personas are invalidated. The new active workspace contains starting records; new examples, favorites, and learning registrations from the earlier run have cleared.",
          "The browser links to the fresh **Agent identity**. Known role and agency attributes still personalize guidance, while the earlier profile’s browsing affinities are absent from the new profile.",
          "Use [**Check fresh profiles in SitecoreAI**](/workshops/guide/fresh-profile-restart) to find the newly linked profile and inspect its starting browsing interests.",
        ],
      },
      {
        title: "Keep platform content recovery separate",
        action: [
          "If you also changed a **Sitecore** page, return to the authoring walkthrough’s **Cleanup** section. It explains how to restore that content through its native review and publication process; a workshop reset does not restore it.",
          "[**Explore Agentic Studio**](/workshops/guide/agentic-studio-workflow) is read-only, so following it requires no content restoration. If you separately changed a **Brand Kit**, space, or saved output, note its name and what changed, and ask Angela, Allen, or Thomas to help restore it. The workshop reset does not restore these items. Webhook receipts and experiment history remain available for reviewing earlier activity.",
        ],
        expected: [
          "Resetting the workshop number does not change CMS content, Search configuration, media, **Brand Kits**, Agentic artifacts, webhook receipts, or native experiment history.",
          "You can repeat the reset whenever you need another clean starting point; each completed reset creates a fresh profile set.",
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
    category: "Reset and repeat",
    title: "Check fresh profiles in SitecoreAI",
    summary:
      "Find the SitecoreAI profile currently linked to one portal login, then inspect its known attributes and browsing-interest history after a reset.",
    outcome:
      "Match a portal username to the correct SitecoreAI profile and confirm the clean starting point for a personalization exercise.",
    personas: [],
    prerequisites: [
      "The **Unified Data Layer (UDL)** is SitecoreAI’s profile and engagement data layer. A **profile** combines known agent attributes, such as licensed states and production history, with recorded activity; **affinities** are interest scores derived from browsing. The portal’s reset page supplies the **Agent identity** needed to find the profile currently linked to a particular login.",
      "Complete [**Reset your workshop number**](/workshops/guide/saved-work-reset). Keep its reset page open after success, and note the browser hostname and **Workshop number**. This guide inspects that completed reset; it does not require a second reset.",
      "Use that same hostname and workshop number. The completed reset affected all seven personas with that suffix on that host. The live site uses **liberty-mutual-agent-portal.vercel.app**; transaction preview uses the longer **liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app** hostname. Resetting one does not reset the other or your localhost checkout.",
      "Keep any before-reset Agent identities if you want to compare them with the new set. Older native profiles are retained as history.",
      "Open [**SitecoreAI Profiles**](https://app.sitecorecloud.io/performance/profiles?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df) with the email that received your Sitecore Cloud invitation. Confirm **Safeco Insurance Company of America POC** and that **Performance** → **Profiles** is available. If access is missing, ask Angela, Allen, or Thomas to check your application permissions; the fictional portal credentials cannot open native profiles.",
    ],
    links: [
      {
        label: "Reset your workshop number",
        href: `${portal}/workshops/guide/saved-work-reset`,
      },
      {
        label: "SitecoreAI Profiles",
        href: "https://app.sitecorecloud.io/performance/profiles?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df",
      },
      {
        label: "Live portal: reset a workshop number",
        href: "https://liberty-mutual-agent-portal.vercel.app/workshops/reset",
      },
      {
        label: "Transaction preview: reset a workshop number",
        href: "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset",
      },
    ],
    steps: [
      {
        title: "Read the completed reset status",
        action: [
          `Return to the reset page left open after your completed reset. If it is closed, open [**Live portal: reset a workshop number**](${portal}/workshops/reset) or [**Transaction preview: reset a workshop number**](${previewPortal}/workshops/reset) to match your recorded hostname, and select the workshop number you recorded. Click **Refresh status**; this reads the status without resetting anything.`,
          "Expand **Reset details** to inspect **Last reset status**, **Saved-work run**, and **Profile generation**. Inspect the seven **Agent identity** values in the preceding table. Do not click **Reset workshop {{pack}}** again just to inspect the result.",
        ],
        expected: [
          "Your completed reset restored the starting saved work and created fresh profiles. This walkthrough shows where to inspect those profiles and their browsing interests in SitecoreAI.",
          "A workshop number identifies the group of seven logins. A saved-work run identifies its operational records; a profile generation identifies its active native profile set.",
          "The other host and other workshop numbers are unchanged. Reading status does not make another change.",
        ],
        links: [
          {
            label: "Live portal: reset a workshop number",
            href: "https://liberty-mutual-agent-portal.vercel.app/workshops/reset",
          },
          {
            label: "Transaction preview: reset a workshop number",
            href: "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset",
          },
        ],
      },
      {
        title: "Match the same login to its new Agent identity",
        action: [
          "In **Current profile identities**, find the row for the username you will inspect, such as **daniel.01**. Copy that row’s **Agent identity** exactly. The profile name includes your workshop number, such as **Daniel Ortiz - 01**. Its current **Agent identity** distinguishes it from profiles retained after an earlier reset. Compare it with the same username’s before-reset identifier if you recorded one.",
          "Click **Open this Agent Portal**, then **Sign in** again with that exact username and password **Sitecore**. The unchanged username now identifies the newly created native profile.",
        ],
        expected: [
          "The username is unchanged: **daniel.01** remains **daniel.01**. Its new **Agent identity** belongs to the fresh native profile for this workshop number and host.",
          "Use the current **Agent identity** from this table to find the profile. The table is refreshed after each reset, so it identifies the profile now linked to that portal username.",
          "Sign in to the portal again after reset to link your browser session to the new profile.",
        ],
      },
      {
        title: "Open the current native profile",
        action: [
          "Open [**SitecoreAI Profiles**](https://app.sitecorecloud.io/performance/profiles?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df). In **Performance** → **Profiles**, open the **Search filter** selector and choose **Liberty Mutual agent identity**.",
          "Paste the **Agent identity** copied from the reset-page row, press Enter, and open the matching person. Use **Liberty Mutual agent identity**, not **Client ID**: they are different identifiers, and the Client ID field expects a UUID. Paste the supplied value unchanged.",
          "Check the persona and its known attributes. Do not select a profile solely by display name when earlier sets have the same names.",
        ],
        expected: [
          "The native result matches the current persona, workshop number, and host. The new profile retains the known agent attributes needed for the scenarios.",
          "Earlier profiles remain available as history. The identity you copied from the reset page leads to the agent’s currently active profile.",
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
          "In the matched profile, inspect **Overview** → **Top affinities** for interest scores and **Engagement** for recorded activity. Do this before browsing resource articles so you have a starting point. In the portal tab for the same host and username, open **Products & appetite** and record the illustrated banner beneath **Risk state**; its content can change when SitecoreAI selects a browsing-interest variant.",
          `Continue [**Personalize by browsing interest**](/workshops/guide/affinity-personalization) on production using that host’s current identifier and baseline. If you verified a transaction-preview reset, first open the production [**Reset a workshop number**](${portal}/workshops/reset) page, select the same **Workshop number**, and copy the intended persona’s current production **Agent identity**. Viewing identities does not require another reset.`,
          "Sign in to production and inspect that production profile’s starting scores and **Products** banner before following the affinity walkthrough. Compare the resulting page views, native score, and content with this production baseline.",
        ],
        expected: [
          "The fresh profile on the host you reset does not carry the earlier set’s browsing history. If you switch from transaction preview to production, its current production profile retains its existing history. Inspect the actual starting scores before training a topic; normal visits after signing in add new engagement.",
          "Native experiment history remains historical; a clean workshop reset does not reset experiment configuration or its aggregate report.",
          "CMS content, Search, media, **Brand Kits**, Agentic artifacts, and webhook receipts were not changed by the reset.",
        ],
        links: [
          {
            label: "Affinity personalization walkthrough",
            href: `${portal}/workshops/guide/affinity-personalization`,
          },
        ],
      },
      {
        title: "If a reset is incomplete, resume the same operation",
        action: [
          "If the reset already succeeded and you found the expected profile, this step requires no action. It explains how to recover an interrupted reset without creating unnecessary extra profiles.",
          "If status still shows an import in progress, wait for completion before interpreting the new profile list. After a connection interruption, use **Refresh status** and **Continue reset** when offered.",
          "Do not start another reset while the current operation is unresolved. If it reports a failed or uncertain import, record the browser hostname, workshop number, and displayed error, and give those details to Angela, Allen, or Thomas. These identify the operation to investigate without creating another profile set.",
        ],
        expected: [
          "**Continue reset** resumes the same request. The success message appears after the new profiles have been verified and activated.",
          "Each completed reset verifies all seven new profiles before activation, giving all seven personas with your workshop number a clean starting point.",
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
