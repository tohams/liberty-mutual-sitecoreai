# Developer quickstart: see your component change in Page Builder

Clone the repository, run the frontend on your machine, and connect **SitecoreAI Page Builder** to **http://localhost:3000**. Change a React heading in VS Code and see your code on the Page Builder canvas. Verify the component’s functional Search behavior in a separate localhost portal tab.

SitecoreAI supplies the hosted authoring environment and content. Only the Next.js frontend runs locally. No local Sitecore server, VM, Docker or .NET installation is required for this exercise. Each developer has separate code and local saved work; CMS content remains shared.

## Before you begin

- Install **Git**, **VS Code** and **Node.js 24.19.0 with npm**. The application’s `.nvmrc` records the runtime and `package-lock.json` records dependencies. A Node version manager is optional; the Node installer works too.
- Authenticate Git or VS Code with approved read access to the private repository. GitHub CLI and GitHub write access are not required.
- Use **Chrome** for the local Page Builder exercise, with your own **SitecoreAI** account that has access to **Liberty Mutual Agent Portal**. Fictional portal logins do not grant CMS access.
- Allow Internet access to GitHub, npm and the hosted Sitecore services. **Vercel access and deployment are not required.**
- Use a new checkout without other local `.env` files or inherited portal configuration. Preserve any existing checkout containing your work.

TypeScript comes with the application dependencies; do not install it globally. Open a new terminal after installing Node or changing its PATH, and check the version again after moving into the application directory.

## 1. Clone, branch and open VS Code

In your preferred projects directory, run:

```sh
git clone https://github.com/tohams/liberty-mutual-sitecoreai.git
cd liberty-mutual-sitecoreai
git switch -c workshop/your-name-resource-search
```

Replace `your-name` with your own lowercase identifier. Authenticate with your approved GitHub account if prompted. Alternatively, use **VS Code → View → Command Palette → Git: Clone**, select the same repository and open it. Creating the local branch does not deploy anything.

Open the repository root, **liberty-mutual-sitecoreai**, with **File → Open Folder**. If the `code` command is available, run `code .` from that root. Explorer should show `examples`, `authoring`, `docs` and `.github`.

Select **Terminal → New Terminal**. Keep the repository root open in Explorer, but move the terminal into the application:

```sh
cd examples/liberty-mutual-agent-portal
node --version
npm --version
```

**npm uses the terminal’s current directory, not the folder open in Explorer. The repository root has no `package.json`.** Every npm command below runs in **examples/liberty-mutual-agent-portal**.

Node must report **v24.19.0** in this terminal. Select it using your installer or existing version manager if necessary. On macOS/Linux with `nvm` already installed, run `nvm install` and `nvm use` from this directory. No new version manager is required.

## 2. Configure the POC automatically

From the application directory, run:

```sh
npm run setup:local
```

This command uses Node’s built-in modules, so it runs before dependency installation. It creates the ignored **.env.local** with the POC values required for local Page Builder:

| Setting | What setup supplies |
| --- | --- |
| `SITECORE_EDGE_CONTEXT_ID` | This POC’s **Preview** server content context |
| `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID` | The separate public-scoped browser context |
| `SITECORE_EDITING_SECRET` | The matching editing secret from this SitecoreAI environment |
| `NEXT_PUBLIC_DEFAULT_SITE_NAME` | `liberty-mutual-agent-portal` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| Session/operator settings | Independent local secrets and a unique local namespace |
| State and tracking | `local-json`, `.portal-state`, and portal tracking disabled |

**No manual key copy/paste is needed for this POC.** The Preview context and matching editing secret correspond to the environment’s developer settings in **SitecoreAI Deploy**. The separate browser context preserves the portal’s existing browser access scope. These automatic defaults are specific to this temporary POC; configure another environment with its own values.

Rerunning setup upgrades recognized earlier workshop defaults and fills missing settings while preserving custom configuration and local saved work. Read and resolve any reported configuration conflict. Restart the development server after an environment change.

Open **examples/liberty-mutual-agent-portal/.env.local** in VS Code to inspect the settings; keep that file untracked. Do not copy an entire hosted environment file or add Redis credentials. Redis takes precedence over local JSON whenever a URL and token are present.

Your ignored **.portal-state** directory stores local saved work without automatic expiry. Every developer can use `daniel.01` on their own machine because these files are separate. Preview content and the published Search index are shared services; authoring changes remain shared too.

## 3. Install and start the frontend

Run from the same application directory:

```sh
npm ci
```

This installs the locked dependencies. `npm install` also needs the application directory and does not replace the setup helper.

Open **examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx**. If VS Code asks to use the workspace TypeScript version, select **Allow**. Otherwise use **View → Command Palette → TypeScript: Select TypeScript Version → Use Workspace Version**. Confirm **5.9.3**, supplied by this lockfile. The editor’s bundled compiler may be a different version.

Start the frontend:

```sh
npm run dev
```

The command generates Content SDK component maps, metadata and import maps, then starts Next.js and the component-map watcher. Leave the terminal running and wait for **Ready**.

Open [http://localhost:3000/login](http://localhost:3000/login). Sign in as **daniel.01** with password **Sitecore** and select **Learning & resources**. Find **What can we help you find?** and the **My licensed states** default.

Use HTTP, not HTTPS. If Next.js selects another port, update `NEXT_PUBLIC_SITE_URL` to that origin, restart, and use the same address in Page Builder.

## 4. Open your local frontend in Page Builder

1. In **Chrome**, open [Page Builder](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb) with your SitecoreAI account. Select **Liberty Mutual Agent Portal**.
2. Open **Default editing host** and select **Local host**.
3. Enter **http://localhost:3000** in **Enter the editing host url**, then click **Save**.
4. Select **Learning & resources** in the page tree. Confirm **What can we help you find?** appears on the canvas.

The canvas uses the React code running on **your machine** and the shared Preview content. Selecting Local host does not replace the shared Default editing host, change site grouping, publish content or deploy your branch. Keep the dev server running while the canvas is connected.

The editor uses safe preview data without an agent login. Search controls are deliberately disabled in editing mode. Use the separate signed-in localhost tab for functional Search checks; do not edit or publish shared CMS fields during this code exercise.

## 5. Change the component and verify both views

In the ordinary localhost portal tab, enter **workers compensation** and click **Search**. Keep **My licensed states** selected and record the Illinois, Texas and nationwide titles. The shared index can change, so compare actual titles rather than assuming a fixed count.

In VS Code, find this JSX in **ResourceSearch.tsx**:

```tsx
<h2>What can we help you find?</h2>
```

Replace only the heading text:

```tsx
<h2>Find guidance for your next client conversation</h2>
```

Save and return to **Page Builder → Learning & resources** with **Local host** selected. The canvas should show the new heading. If needed, click **Reload canvas**. No CMS publication or deployment is involved.

Return to [http://localhost:3000/resources](http://localhost:3000/resources). Confirm the new heading, repeat **workers compensation**, and select **Illinois** under **Risk state**. Illinois and nationwide guidance remain; the Texas-specific result drops out. The one-line heading change preserves the native Search integration and licensed-state filtering.

The heading is React code. Resource titles, summaries and article bodies are Sitecore content. Component maps are generated by the development watcher; do not edit `.sitecore` files by hand.

## 6. Review, check and restore

Use **VS Code → Source Control** to confirm the heading is the only application change. Stop the dev server with **Ctrl+C**, then run each command separately from the application directory:

```sh
git diff -- src/components/resource-search/ResourceSearch.tsx
npm test
npm run test:setup
npm run lint
npm run type-check
npm run build
```

Development startup already generated the SDK files required by type checking. If you have not started the app in a fresh checkout, first run `npm run sitecore-tools:generate-map` and `npm run sitecore-tools:build`.

A build checks compilation and configured private-value exposure in browser assets; it does not deploy or prove hosted runtime behavior. Use `npm run dev` for local operation. Authenticated `npm start` requires a separately configured durable store because production mode rejects the local JSON adapter.

If the file contains only your uncommitted workshop edit, restore it and restart:

```sh
git restore -- src/components/resource-search/ResourceSearch.tsx
npm run dev
```

If it also contains other work, manually restore only the heading instead.

- In the localhost portal, click **Clear filters** if shown, erase the query and click **Search**. Confirm the original heading and default resource view. Clear filters alone does not erase query text.
- In Page Builder, confirm the original heading on **Local host**, then select **Default editing host** in the editing-host selector.
- In the localhost portal, use **Daniel Ortiz → Sign out**. Stop dev with **Ctrl+C** and run **npm run build** once more to return generated metadata to its build state.
- Keep `.env.local`, `.portal-state`, `.sitecore` and generated metadata out of commits. No shared reset or CMS restoration is needed for this exercise.

## How the reviewed change would be released

Deployment is an explanation, not an attendee task. The local workshop needs no Vercel account, transfer, branch push or PR.

| Change | Shared release path |
| --- | --- |
| React components, styles, server code | GitHub branch → reviewed PR and checks → Vercel preview → approved merge → production deployment |
| Page copy, images and layout | SitecoreAI authoring → editorial review → publish to Experience Edge |
| Templates, rendering definitions, placeholders | Reviewed owned CMS model → separate SitecoreAI authoring deployment and validation |

The repository’s **Portal validation** workflow checks source and performs a connected build. Vercel’s configured Git integration hosts the frontend; it does not automatically deploy Sitecore authoring. The SitecoreAI Vercel Deploy App is a separate integration. See the [release runbook](developer-handoff.md#vercel-release-process) for implementation details and recovery procedures.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `ENOENT` for root `package.json` | Move the terminal into `examples/liberty-mutual-agent-portal`. Run setup, install and dev there. |
| Wrong Node version | Check `node --version` after entering the app directory in the same terminal that runs npm. Select 24.19.0. |
| Setup reports a configuration conflict | Preserve custom work and resolve the named setting. Do not bypass Redis or context-scope checks. |
| Page Builder cannot connect | Confirm dev says Ready, the local address/port matches, Local host is selected, and setup supplied the correct Preview context and matching editing secret. Restart dev after environment changes. |
| Embedded-browser canvas stays blank or loading | Open Page Builder in **Chrome** and select Local host there; this is the browser verified for the local exercise. |
| Canvas still shows old React text | Save the correct component file, confirm Local host, and click Reload canvas. |
| Search is disabled on the canvas | Expected editor behavior. Test in the separate signed-in localhost portal tab. |
| Local page content differs from production | Local Page Builder setup reads Preview content, which can include unpublished pages. Production is the publication check; Search uses the published index. |
| VS Code compiler diagnostics disagree with CLI | Select workspace TypeScript 5.9.3 instead of the editor’s bundled compiler. |
| “The portal workspace service is not configured.” | Use `npm run dev`, local JSON state, and no Redis settings. Production runtime has a different persistence requirement. |
| UDL, affinity or A/B behavior stays neutral locally | Tracking and personalization are intentionally disabled for this local exercise. Use the configured HTTPS workshop hosts for those loops. |

For optional chat-assisted inspection, continue to [Sitecore tools in VS Code](vscode-sitecore-mcp.md). For component ownership and hosting details, see the [developer handoff](developer-handoff.md).
