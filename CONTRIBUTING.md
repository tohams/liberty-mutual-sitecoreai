# Contributing to the Liberty Mutual agent portal

Start a focused feature branch from `main`, make the smallest coherent change, and open a pull request back to `main`. Keep the application and serialized model together when their contracts change. Do not use the upstream starter's archived DMZ workflow.

## Before opening a pull request

From `examples/liberty-mutual-agent-portal`:

```sh
npm ci
npm run test:setup
npm run sitecore-tools:generate-map
npm run sitecore-tools:build
npm run type-check
npm run lint
npm test
npm run build
```

SDK generation and production builds require a valid Sitecore delivery context. Lint and domain tests can run without tenant credentials. From the repository root, validate the owned content model without pushing or publishing:

```sh
python3 -m pip install -r authoring/scripts/requirements.txt
python3 authoring/scripts/validate-content-seed.py
dotnet tool restore
dotnet sitecore ser validate -i LibertyMutual.Model -i LibertyMutual.Content -i LibertyMutual.SitePresentation -i LibertyMutual.Taxonomy -i LibertyMutual.ResourcePageBranch
```

Record the actual results and any remaining configuration gaps in the pull request. For a visible change, inspect desktop and mobile layouts and the keyboard path. For authentication, state, profile or CMS changes, verify the relevant persona, reviewer-pack isolation and native platform behavior. Add tests when they protect a meaningful boundary or business transition.

## Review and merge

Require the `Offline validation` and `Connected production build` checks on `main`, with one approving reviewer and resolved conversations. Require approval of the latest reviewable push. Restrict direct pushes and force pushes. Configure these rules in GitHub; the workflow file cannot enforce branch protection by itself.

Use a squash merge for a coherent feature. Vercel previews are for review; merging to `main` is the code release boundary. A successful preview does not approve a separate CMS publication, UDL import or outbound campaign.

Keep editorial text in native CMS fields. Do not replace Sitecore Search or personalization with a visual simulation. Keep private business data in server adapters and protect every API independently of the UI. New state mutations must authorize the agency and reviewer pack, validate input, and preserve optimistic concurrency and idempotency.

## Content changes

Normal scoped releases push `LibertyMutual.Model` and `LibertyMutual.SitePresentation` with `CreateAndUpdate` within their exact owned scopes. The three editable seed modules—`LibertyMutual.Content`, `LibertyMutual.Taxonomy` and `LibertyMutual.ResourcePageBranch`—are `CreateOnly` and run only with an explicit seed request. They stay outside authoring Items as Resources. Do not widen module scopes or add deletion rules. Changing a seed file does not update an already-authored item; intentional editorial updates use the native review and publication workflow. Follow the [release procedure](docs/developer-handoff.md#vercel-release-process) for the reviewed model push, optional seed flags and separate authoring-environment deployment.

Never commit real credentials, tokens, `.env.local`, local state or deployment caches. The disposable fictional login fixture is intentional, private handoff material requested for this sandbox; it must never be copied to `public/`, returned by an API or reused for real identities. See the [handoff guide](docs/developer-handoff.md) for release and transfer responsibilities.
