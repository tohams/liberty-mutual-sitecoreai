# Liberty Mutual Agent Portal

This is the active customer application. It uses the Sitecore Content SDK, Next.js App Router and native Sitecore pages. Agency operations and login are supplied by typed, synthetic server adapters. The other examples in this repository retain upstream starter material for reference.

## Run locally

Follow the [developer quickstart](../../docs/developer-quickstart.md) for private-repository access, VS Code setup, and the complete heading-edit workshop. Open the repository root, `liberty-mutual-sitecoreai`, in VS Code. Use Node.js **24.19.0** and the checked-in package lock. The root has no `package.json`. In a terminal starting at that root, run:

```bash
cd examples/liberty-mutual-agent-portal
npm run setup:local
npm ci
npm run dev
```

The setup helper creates `.env.local` with this POC’s Preview server context, separate public browser context and matching editing secret before dependency installation. Rerunning it upgrades recognized earlier workshop defaults while preserving custom configuration and local saved work. `npm ci` installs the locked dependencies; neither it nor `npm install` creates the environment file. If npm reports `ENOENT` for the repository-root `package.json`, change into the application directory first.

In **Chrome**, open **Page Builder**, select **Local host**, enter `http://localhost:3000` and click **Save**. The canvas renders shared Preview content with your local code. Keep Redis credentials absent from all local environment files and the terminal. The helper generates independent session/operator secrets, a unique namespace and local JSON state, with portal tracking disabled. In a separate ordinary browser tab, open http://localhost:3000/login and sign in as `daniel.01` with password `Sitecore` to test Search; its controls are intentionally disabled in the editor. Return Page Builder to **Default editing host** when finished. No attendee Vercel access or deployment is needed. The [authentication and data guide](docs/auth-and-data.md) covers operational state and resets; a production runtime requires Redis and cannot use the local JSON adapter.

## Verify changes

```bash
npm run lint
npm test
npm run test:setup
npm run type-check
# Stop npm run dev before building.
npm run build
```

Development startup generates the Sitecore SDK files required by type checking. If you have not started the app, run `npm run sitecore-tools:generate-map` and `npm run sitecore-tools:build` before `npm run type-check`. A successful build checks compilation and private-value exposure in browser assets; it does not deploy or validate production runtime services.

From the repository root, validate scoped content with `dotnet sitecore ser validate -i LibertyMutual.Model -i LibertyMutual.Content` and native delivery with `node authoring/scripts/verify-edge-content.cjs`. These checks serve different purposes: application tests validate behavior; the connected checker proves that Sitecore returns the expected authored content.

The [authored campaign component guide](docs/campaign-components.md) covers the small-business campaign, nested placeholders, alert visibility dates and the integrated conversation request.

The [author and approver workshop setup](docs/workshop-authoring-workflow.md) explains the **Page Builder** review-and-approval exercise, its native workflow, paired practice pages and role-provisioning tools. The presenter cycle has been verified with real non-admin accounts. Attendee role assignments and the listed per-account permission checks remain part of workshop preparation.

## Where work belongs

- `src/features`: agent-facing workflows and portal shell.
- `src/components`: CMS components with sidecar props, editable SDK field controls and generated registration.
- `src/server`: authorization, state and typed integration adapters.
- `fixtures`: fictional integration records and isolated reviewer packs.
- `public/brand`: runtime logo assets and licensed Roboto font; source provenance is in `../../docs/brand`.
- `../../authoring/items/liberty-mutual`: scoped Sitecore model and initial editorial content.

The SDK generates `.sitecore` maps and metadata. Do not edit them manually. `Providers`, editing route handlers and `PartialDesignDynamicPlaceholder` remain because they support native Sitecore authoring. The old starter layout, bootstrap tracking, empty BYOC bundle and unused CSS frameworks have been removed. The portal's analytics integration has one owner in `src/features/analytics` and `src/lib/portal-analytics.ts`.

Read [the developer handoff](../../docs/developer-handoff.md), [native content model](../../docs/content-model.md), [branding sources](../../docs/brand/README.md), and [repository contribution guidance](../../CONTRIBUTING.md) before changing these boundaries. Deployment and customer transfer are covered in the [repository README](../../README.md). Native UI editing, identity matching and Search should also be checked in the customer's tenant before accepting a release.

This application derives from Sitecore's official starter. Preserve the included Apache-2.0 license and upstream attribution.
