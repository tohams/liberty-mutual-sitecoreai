# Agency priorities and shared disclosure

**Agency priorities** is a marketer-managed collection of product conversations and guidance. Its ordered `Recommendations` field selects native **AgencyPriority** items. Authors can change a recommendation's heading, copy, image, and action, or change the order without a frontend release.

The initial collections live beneath the Agent Portal's **Data → Agency priorities**:

| Collection | Intended native audience variant | Initial emphasis |
| --- | --- | --- |
| For all agencies | Neutral default | Home/auto conversations, followed by small-business growth |
| Agency growth priorities | Principal, including Avery | Small-business growth, Texas guidance, and home/auto conversations |
| Producer priorities | Producer, including Daniel | Home/auto conversations, Illinois guidance, and small-business growth |

The collections share their recommendation items deliberately. No username, fixture, or browser query selects a collection in the visitor component. Native personalization on the Home component selects a datasource. Existing licensing and authorization remain independent of this marketing emphasis. The seeded state-specific links are limited to Texas and Illinois, for which both selected agents are licensed.

The **Agency priorities** JSON rendering has **Content Dependencies → Related Items** enabled because its ordered selection renders linked native cards. The native rendering inherits the platform Content Dependency template; no platform template patch or frontend replacement of the CMS fields is needed. The setting is owned by `LibertyMutual.PublicModel` and its source generator. After an initial dependency change, publish the rendering and republish the containing Home page once to register the dependency graph. Subsequent editorial changes still follow the native review and publication process.

`configure-agency-priority-dependencies.cjs` applies that one rendering-field change to an existing environment through snapshot, dry-run, and explicit apply modes. It checks the complete rendering before writing, journals native provenance outside the repository, and preserves all unrelated business fields, item identities, versions, layouts, and audience configuration. It does not publish. This is a developer setup action, rather than a step that workshop participants repeat.

See [Sitecore's publishing dependencies documentation](https://doc.sitecore.com/sai/en/developers/sitecoreai/experience-edge/publishing-to-experience-edge/dependencies-and-publishing.html) and the [supported rendering dependency configuration](https://support.sitecore.com/kb?id=kb_article_view&sysparm_article=KB1003056).

**SharedDisclosure** is a separate component on Home and Learning & resources. Both placements reference the single public-owned **Product availability notice** by its native ID. Its copy is not duplicated into the portal.

`portal-relevance-contract.json` records all native IDs, including the three audience datasources, component instances, variants, and placeholder contracts.

## Separate definitions, content, and placements

- `LibertyMutual.PublicModel` owns the shared component templates/renderings and two global placeholder definitions.
- `LibertyMutual.PortalRelevancePresentation` owns exactly two portal placeholder settings, two Component Library sections, and two variant folders with Defaults. Include this developer model in ordinary definition deployments.
- `LibertyMutual.PortalRelevanceSeed` creates initial editorial items only. It uses **CreateOnly** and belongs outside ordinary Deploy releases. Items start in **Liberty Mutual Public Review → Draft**.
- `public-configure-portal-relevance.cjs` adds three native component instances and references their slots from the two existing layout definitions. It captures fresh before-images, guards all languages/versions, preserves native final layouts and their personalization/test UIDs, and verifies readback. It does not publish or configure native audiences.

After the guarded placement action, reconcile only the two existing layout definitions' `Placeholders` fields from the private journal's `sourceReconciliation` entries. Their original serialized definitions remain owned by `LibertyMutual.Model`. Do not serialize the portal's current final layouts into a developer deployment: they contain marketer-managed native personalization and tests.

## Verification

```sh
python authoring/scripts/public-build-portal-relevance.py --check
node --test authoring/scripts/public-portal-relevance.test.cjs
dotnet sitecore ser push -n demo -i LibertyMutual.PortalRelevancePresentation --what-if
dotnet sitecore ser push -n demo -i LibertyMutual.PortalRelevanceSeed --what-if
```

After definitions and the explicit seed are installed, use the placement helper's read-only snapshot and baseline modes before an explicit apply. Keep before-images and journals outside source control. Observe the resulting native components in Preview and Page Builder, configure the intended native audiences, and then approve/publish the dependencies. Confirm the two agents' live results and the single disclosure's propagation to both portal pages and the public site.
