# Developer quickstart: change a component on your machine

Run the Liberty Mutual agent portal locally, change one React heading in VS Code, and see the result in your browser. This exercise reads published Sitecore content and uses native Search while keeping saved portal work on your machine. It does not require a CMS content change or a deployment.

For optional chat-assisted CMS and documentation inspection, see [Sitecore tools in VS Code](vscode-sitecore-mcp.md). That separate MCP exercise does not change the Node/npm prerequisites below.

## Before you begin

Install Git, **Node.js 24.19.0 with npm**, and VS Code or your preferred TypeScript editor. The application’s `.nvmrc` records the Node version; `package-lock.json` records the dependency versions. Use the existing lockfile rather than updating packages during this exercise.

A Node version manager such as `nvm` is optional, not an additional prerequisite. You can use the Node installer instead. After installing Node or changing its PATH, open a new VS Code terminal and confirm the version there; an older terminal may still use a previously installed Node version. TypeScript is installed with the application dependencies below; a separate global TypeScript installation is not needed.

You need approved read access to the **private** GitHub repository and an authenticated Git client. Local setup supplies the owner-approved POC contexts automatically:

| Environment variable | Value supplied by local setup |
| --- | --- |
| `SITECORE_EDGE_CONTEXT_ID` | The server-only scoped **Live** delivery context for this portal |
| `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID` | The separate public browser context for this portal |

The scoped defaults belong to this private POC and are held in setup-only tooling, which must not be imported into application or browser code. Session, editing and operator secrets are generated independently on each machine. For another environment, obtain the correct scoped contexts through the owner-approved restricted workshop deck or secret-sharing channel and replace the POC defaults. A master Live or Preview context must never be placed in a `NEXT_PUBLIC_` variable; keep server context values out of browser bundles and public materials.

GitHub write access is needed only if you later submit a pull request. Sitecore authoring and Vercel access are needed only for the corresponding content and release tasks. This frontend exercise does not require a Sitecore VM, Docker, a local Sitecore server, or a .NET installation.

## 1. Clone and open the repository

Run these commands in a terminal in your preferred projects directory:

```sh
git clone https://github.com/tohams/liberty-mutual-sitecoreai.git
cd liberty-mutual-sitecoreai
```

If Git asks you to authenticate, use your organization’s approved GitHub sign-in method. Alternatively, use VS Code’s **Git: Clone** command, sign in to GitHub, select `tohams/liberty-mutual-sitecoreai`, and open the cloned repository. The GitHub CLI is optional.

Create your own local workshop branch before editing. Replace `your-name` with a short, unique name using lowercase letters and hyphens:

```sh
git switch -c workshop/your-name-resource-search
```

Creating this local branch does not require GitHub write access and does not deploy anything.

Open the repository root, **`liberty-mutual-sitecoreai`**, in VS Code with **File → Open Folder**. If the VS Code command is on your PATH, run `code .` from the repository root. Explorer should show the root configuration files, `authoring`, `.github`, and the portal application under `examples`.

Keep that repository root open in VS Code. **npm uses the terminal’s current directory, not the folder shown in Explorer. The repository root has no `package.json`.** In the integrated terminal, change to the application directory before running any npm command:

```sh
cd examples/liberty-mutual-agent-portal
node --version
npm --version
```

`node --version` should report `v24.19.0`. If you use a Node version manager, select the version in the application directory’s `.nvmrc` before continuing. On macOS or Linux with `nvm` already installed, run `nvm install` and then `nvm use` from this directory. On Windows, select the same version using your installed version manager or Node installer.

The remaining terminal commands run from `examples/liberty-mutual-agent-portal`. Editor file paths below start at the repository root. The other starter examples are reference projects.

## 2. Create an isolated local configuration

**Terminal directory: `liberty-mutual-sitecoreai/examples/liberty-mutual-agent-portal`.** If your terminal is still at the repository root, first run `cd examples/liberty-mutual-agent-portal`.

If you cloned an earlier workshop version, first update that checkout with `git pull --ff-only origin main` from the application directory. Coordinate any outstanding branch changes if Git cannot fast-forward; keep your existing work. Then run setup:

```sh
npm run setup:local
```

Use a fresh checkout with no other local `.env` files and a clean terminal without inherited portal configuration. The setup helper creates an ignored `.env.local` file with both approved POC contexts, three independent local secrets, a unique state namespace, `PORTAL_STATE_ADAPTER=local-json`, and tracking disabled. It uses Node’s built-in modules and creates the environment file **before dependency installation**; `node_modules` is not required.

No manual context entry is needed for this POC. In VS Code, `examples/liberty-mutual-agent-portal/.env.local` is ready after setup reports **Created**. Rerunning setup reports **Filled missing or blank Sitecore contexts** when upgrading an earlier file, or **left unchanged** when both values already exist. It preserves nonempty custom contexts, generated secrets, comments and all other settings. Duplicate context assignments, unsupported blank formatting or identical server/browser contexts stop the update without changing the file.

Keep `PORTAL_CONTENT_ADAPTER=sitecore` and `NEXT_PUBLIC_PORTAL_TRACKING_ENABLED=false` for this exercise. Completing the two contexts does not reconfigure the other settings in an existing custom environment file.

Local saved work is stored in the application’s ignored `.portal-state` directory. Every developer can use the same fictional `daniel.01` login on their own machine because those files are separate. The published content and Search index remain shared, read-only services.

Do not copy production or preview environment files into this checkout. The state adapter selects Redis whenever it finds a Redis URL and token, even if `PORTAL_STATE_ADAPTER` says `local-json`. The helper checks for inherited Redis and hosted-runtime settings. Resolve its message before continuing; do not add shared Redis credentials to bypass it.

## 3. Install and start

Stay in the same application directory after setup completes:

```sh
npm ci
```

`npm ci` installs dependencies from the committed `package-lock.json`; it does not create `.env.local`. `npm install` also requires the application directory and does not replace the setup helper. Use `npm ci` for this workshop to preserve the locked dependency versions.

After installation, open `examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx` in VS Code. If asked to use the workspace TypeScript version, select **Allow**. Otherwise, open the Command Palette, run **TypeScript: Select TypeScript Version**, and select **Use Workspace Version**. Confirm **5.9.3**, the version installed by this lockfile. The repository's `.vscode/settings.json` points VS Code to that application dependency so editor diagnostics use the same TypeScript version as the build. It does not switch versions without your selection. See [VS Code's workspace TypeScript instructions](https://code.visualstudio.com/docs/typescript/typescript-transpiling#_using-the-workspace-version-of-typescript).

Then start the application in the integrated terminal:

```sh
npm run dev
```

The development command generates Sitecore component maps, metadata, and import maps, then starts Next.js and the component-map watcher. Leave this terminal running.

When the terminal says **Ready**, open [http://localhost:3000/login](http://localhost:3000/login). If Next.js selects another port because 3000 is occupied, set `NEXT_PUBLIC_SITE_URL` to that reported local origin in `.env.local` and restart the server before using it.

Sign in with:

| Field | Value |
| --- | --- |
| Username | `daniel.01` |
| Password | `Sitecore` |

Open **Learning & resources** in the left navigation. Find the search heading **What can we help you find?** and the search box beneath it. **My licensed states** is the default; Daniel has Illinois and Texas licenses, so the default includes those states and nationwide guidance.

## 4. Change one component and verify it

In VS Code, open:

```text
examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx
```

Find this JSX:

```tsx
<h2>What can we help you find?</h2>
```

Replace only that heading with:

```tsx
<h2>Find guidance for your next client conversation</h2>
```

Save the file and return to **Learning & resources** in the local browser. Next.js Fast Refresh should display the new heading. If the tab has been idle, reload once. Check the browser address still starts with `http://localhost`.

Enter `workers compensation` in the search box and click **Search**. Confirm that resource cards still load and the licensed-state selector still works. The component’s native `useSearch` integration, filters, and result rendering are unchanged; this exercise changes the heading only.

With the current published library, that query returns **4 results** for Daniel’s licensed default. Select **Illinois** under **Risk state** to see **3 results**, with the Texas-specific result removed. Approved content/index changes may change these counts. Return to **My licensed states**, erase the text in the search box, and click **Search** again. **Clear filters** resets the facets but does not clear the text query.

This heading belongs to React code. Resource titles, summaries, article bodies, and authored guidance belong to Sitecore content. Edit those fields in Sitecore and use the editorial publishing workflow; changing this JSX does not update them. Component registration is generated automatically by the development watcher when component files are added or removed. Do not hand-edit `.sitecore` generated files.

## 5. Review, check, and finish

Use VS Code **Source Control** or the following command to confirm that the intended heading is the only application change:

```sh
git diff -- src/components/resource-search/ResourceSearch.tsx
```

For a practice run, replace the heading with its original text and save. Confirm the original heading returns in the browser. This restores the exercise without discarding anyone else’s changes.

Run the normal application checks in a second terminal, from the same application directory. If that terminal starts at the repository root, first run `cd examples/liberty-mutual-agent-portal`:

```sh
npm run lint
npm test
npm run test:setup
npm run type-check
```

The development startup has already generated the SDK files needed for type checking. In a fresh checkout that has not been started, run `npm run sitecore-tools:generate-map` and `npm run sitecore-tools:build` before `npm run type-check`.

After verifying the browser, open **Daniel Ortiz** in the header and click **Sign out**. The heading exercise does not create saved portal work, so no portal reset is needed. If you later experiment with saved work, use the operator reset procedure in [the authentication and data guide](../examples/liberty-mutual-agent-portal/docs/auth-and-data.md#durable-work-and-resetting), targeting your local host with your local operator secret. Shared preview and production resets are separate actions.

To check a production compilation, stop the development server with **Ctrl+C**, then run:

```sh
npm run build
```

This command checks the two context settings, regenerates SDK files, builds Next.js, and scans browser bundles for private context or editing-secret exposure. It also returns Next’s generated `next-env.d.ts` reference from development types to build types. A successful build does not deploy the application or verify its production runtime services. Keep `.env.local`, `.portal-state`, `.sitecore`, and generated metadata out of your commit.

`npm start` serves an existing production build, but authenticated operation requires a separately configured Redis provider and runtime secrets. The application intentionally rejects `local-json` in production mode. Use `npm run dev` for this local exercise; use an isolated, correctly configured preview deployment for production-runtime acceptance.

## Optional: submit a reviewed change

The workshop already has its own local branch. Coordinate this extension with the current Vercel Hobby project owner: private-repository deployment commits must be authored by that owner, so GitHub write access alone does not grant preview deployment eligibility. See [Vercel’s Hobby collaboration rules](https://vercel.com/docs/deployments/troubleshoot-project-collaboration#hobby-teams). The owner can keep the intended heading change, review its diff, and pass the applicable checks before submitting it. If you restored the heading during practice, make the intended change again first.

```sh
git add src/components/resource-search/ResourceSearch.tsx
git commit -m "Clarify the resource search heading"
git push -u origin HEAD
```

Open a pull request targeting `main`. GitHub’s **Portal validation** workflow runs offline checks and a connected production build. Vercel’s Git integration independently creates a branch preview when configured for the project. Inspect the latest commit’s status indicator on the pull request’s **Conversation** tab, then follow the **Vercel → Details** link to the deployment. Confirm its source commit, environment, and **Ready** status before testing that preview URL.

An ordinary branch preview is not automatically the dedicated Sitecore editing host. Its environment and state namespace must be configured for its purpose. Merging into the configured production branch `main` triggers the Vercel production deployment. Only merge a change that is intended for that environment.

| Change | Release path |
| --- | --- |
| React components, styles, server code | Feature branch → pull request and checks → Vercel preview → approved merge → Vercel production |
| Page fields, layouts, resource copy, guidance | Sitecore authoring and editorial review → publish to Experience Edge; no frontend build for an ordinary content edit |
| Templates, rendering definitions, placeholders | Review the owned serialized model and follow the scoped authoring-release procedure in [the developer handoff](developer-handoff.md) |

The repository’s validation workflow does not deploy the Sitecore authoring environment. Sitecore Deploy’s branch automation is a separate, opt-in configuration. `xmcloud.build.json` explicitly packages only `nextjs-starter`, `LibertyMutual.Model` and `LibertyMutual.SitePresentation` as Items as Resources for authoring deployments. The editable `LibertyMutual.Content`, `LibertyMutual.Taxonomy` and `LibertyMutual.ResourcePageBranch` seed modules stay outside that package, as do unused Starter Kit modules. Ordinary frontend changes still use the Git-connected Vercel build. See [the release process](developer-handoff.md#vercel-release-process) for the scoped CLI model procedure, explicit seed flags and authoring-environment deployment.

## Configuration reference and troubleshooting

The application’s [.env.remote.example](../examples/liberty-mutual-agent-portal/.env.remote.example) documents the full connected-host contract. The local helper intentionally enables a smaller subset.

| Setting or symptom | What to check |
| --- | --- |
| `ENOENT` opening `liberty-mutual-sitecoreai/package.json` | npm is running from the repository root, which has no package manifest. Run `cd examples/liberty-mutual-agent-portal` from that root, then `npm run setup:local`, `npm ci` and `npm run dev`. Setup supplies the POC contexts automatically. Switching to `npm install` does not fix the directory or create the environment file. |
| `SITECORE_EDGE_CONTEXT_ID` / `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID` | Both must be present, distinct, and correctly scoped. Restart the dev server after changing environment values. |
| `PORTAL_SESSION_SECRET`, `PORTAL_OPERATOR_SECRET`, `SITECORE_EDITING_SECRET` | Local setup generates independent secrets. Keep deployed secrets in the hosting platform’s server-only configuration. A local editing secret does not register localhost as a Sitecore rendering host. |
| `PORTAL_ENVIRONMENT`, `PORTAL_STATE_ADAPTER`, `PORTAL_LOCAL_STATE_DIRECTORY` | Keep the generated local namespace, `local-json`, and `.portal-state` for this exercise. |
| “The portal workspace service is not configured.” | Confirm the local configuration is loaded, the state adapter is `local-json`, and you are running `npm run dev`. Production runtime requires Redis. |
| Setup refuses to continue | Read the named setting or ambiguity message. Inherited Redis/hosted settings, duplicate context assignments and server/browser context collisions require review. Existing configuration is preserved. |
| Missing generated SDK files or type errors on first install | Run the two `sitecore-tools` generation commands above, or start `npm run dev`, before type checking. |
| VS Code reports a `baseUrl` deprecation error while command-line type checking passes | Open a `.tsx` file, run **TypeScript: Select TypeScript Version** from the Command Palette, and select **Use Workspace Version** (5.9.3 for this lockfile). The editor's bundled TypeScript can be newer than the application's compiler. Do not change `tsconfig.json` just to suppress an error from the wrong editor version. |
| Native content or Search does not load | Check connectivity, the correct site name, the scoped contexts, and the shared published content/index. A local UI build does not create content or provision a Search index. |
| `PORTAL_CONTENT_ADAPTER=fixtures` | An engineering-test option for bootstrap resource metadata only. It does not provide a complete offline portal; routes still retrieve native Sitecore page composition. |
| `NEXT_PUBLIC_PORTAL_TRACKING_ENABLED=false` | Keeps portal engagement tracking and native personalization disabled for local development. Use the configured HTTPS hosts for the UDL, A/B, and affinity walkthroughs. |
| Preview content and Page Builder integration | Use the approved Preview server context, registered editing host, matching editing secret, and isolated runtime state. Follow [the developer handoff](developer-handoff.md), rather than changing this local workshop’s defaults. |
| Design Library client credentials | `SITECORE_AUTH_CLIENT_ID` and `SITECORE_AUTH_CLIENT_SECRET` are for that separate integration; they are not needed for the heading exercise. |

For the application structure, adapters, model ownership, and transfer process, continue with [the developer handoff](developer-handoff.md). For local and hosted saved-work handling, use [the authentication and data guide](../examples/liberty-mutual-agent-portal/docs/auth-and-data.md).
