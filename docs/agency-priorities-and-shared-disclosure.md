# Agency recommendations and shared disclosures

The portal keeps two different kinds of priorities separate. **Your priorities** is operational work such as renewals and submissions. **AgencyPriorities** is a native Sitecore component for marketer-managed product and bundle recommendations. It does not determine an agent's permissions or replace the operational task list.

## Authoring contract

| Component | Native datasource fields | Placement |
| --- | --- | --- |
| AgencyPriorities | Heading, Intro, and an ordered Recommendations selection | Portal Home, `headless-agency-priorities` |
| SharedDisclosure | title, body, sourceLink, owner, effectiveDate, and reviewDate | Portal Home and Resources, `headless-shared-disclosure`, plus public-site placements |

Each selected **AgencyPriority** item contains Heading, Body, Image, Link, and Eyebrow. The Recommendations field is a native Treelist. Its selected item order is the displayed card order. The component uses the actual referenced SDK fields, including their editing metadata; no fixture supplies missing cards or copy.

Native personalization changes the AgencyPriorities datasource. Keep the message, card selection, order, imagery, and calls to action together in that datasource. Rules belong in SitecoreAI, where marketers can change the targeted experience. The component contains no agency, role, or state targeting logic. Server-side eligibility continues to enforce access to protected pages and transactions.

For the two-agent demonstration, Avery Brooks represents Cedar Ridge Insurance, an agency principal with TX, FL, and IL licenses. Daniel Ortiz represents Prairie Oak Insurance, a producer with IL and TX licenses. Their native profile attributes and rules should select the relevant recommendation collection. The operational Home greeting and task data are separate from that native content decision.

## One public-owned disclosure

The canonical item is:

`/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Disclosures/Product availability notice`

Its stable ID is `c4fd68f7-7c79-5bb6-9919-fb6f82b84bca`. Every SharedDisclosure placement uses that same item as its native datasource. The portal has no editable duplicate. Each head renders the shared wording in its own visual design. The public site's reusable promotion also references the same item.

The public content owner maintains the disclosure. Portal authors require read access to assign and preview that item; permission to edit its wording should follow the shared content owner's workflow. Public sharing is intentional. Agency records, customer information, and protected portal resources must not enter this library.

Native definition IDs and initial content are recorded in `authoring/items/liberty-mutual-public/public-contract.json`. Developer-owned model changes and CreateOnly initial content remain separate; ordinary frontend deployments do not overwrite authored wording.

## Publication and preview verification

Publish the selected recommendation items, collection datasource, disclosure, and their owning pages through the configured native workflow and publishing mode. When testing a referenced card change, check the containing page after the applicable publication or layout refresh. Publishing only a React app does not publish CMS content.

Before presenting, verify these actions in Page Builder and on the intended hosts:

1. Change and reorder a collection's native Recommendations selection, save it, and reload the page.
2. Edit a selected card's heading, body, image, and link. Confirm the SDK field controls act on the selected item.
3. Test the native rules against Avery's and Daniel's profiles, then preview each unpublished native variant. Confirm both the selected cards and their order. A rule match and a visual preview are separate checks.
4. Confirm the two-agent preview's operational context matches the selected agent. The ordinary editor snapshot is synthetic and does not establish that a full visitor profile has been impersonated.
5. Edit the one public-owned disclosure, preview its placements, and publish the approved change. Confirm the same wording on both public placements and the portal's Home and Resources pages.
6. Confirm the new placeholder settings permit only their intended components, and recheck existing portal guidance, affinity personalization, and the original A/B test.

The frontend test suite checks ordered SDK field preservation, instance and datasource preservation, page-specific placement, and empty-slot spacing. Native authoring, decisions, publication, and browser behavior require the verification above.

## Read-only operational context in Page Builder preview

The recommendation content in preview is the actual unpublished native variant selected by SitecoreAI. The surrounding portal greeting, agency metrics, and operational task list use a synthetic, read-only editor snapshot. To compare a complete Avery and Daniel Home experience, a small server adapter aligns that snapshot with the native selected AgencyPriorities datasource: the principal collection uses Avery, and the producer collection uses Daniel.

This adapter requires verified SDK Draft Mode, the existing Portal Home item, the owned recommendation component UID, and one of the allowlisted native datasource IDs. It ignores unselected experiences and leaves the neutral editor snapshot unchanged. It does not select a native variant, reinterpret audience rules, override an agent's login, or write operational or CDP state. Actual profile rule testing and normal authenticated-visitor verification remain separate acceptance checks.
