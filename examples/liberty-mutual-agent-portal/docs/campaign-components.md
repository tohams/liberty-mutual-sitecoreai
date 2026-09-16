# Authored growth campaigns

`/growth/small-business` is composed in Sitecore Page Builder. Its title, introduction, alerts, callout, questions, resource links and conversation card are authored fields. The existing `/growth` page remains the agency production overview. Both are available under **Agency growth**; the disclosure button opens **Overview** and **Small business growth**.

## Composition and authoring boundaries

The campaign layout exposes `headless-campaign-page`, which accepts only `CampaignPage`. The container owns three dynamic placeholders. They preserve native rendering UIDs, datasource references and selected personalization variants.

| Placeholder | Allowed components | Purpose |
| --- | --- | --- |
| `headless-campaign-hero-{*}` | `CampaignHero` | Page title, icon, introduction and section navigation |
| `headless-campaign-main-{*}` | `CampaignAlert`, `CampaignCallout`, `CampaignAccordion` | Campaign updates, opportunity and expandable questions |
| `headless-campaign-sidebar-{*}` | `CampaignLinkList`, `CampaignContact` | Related guidance and a conversation request |

The parent rendering must retain its native `DynamicPlaceholderId`. All components export the `Default` view; they do not require a `FieldNames` parameter. The Sitecore placeholder settings are the authoring controls, and the application applies the same allowlist when rendering. This prevents a component assigned to the wrong slot from rendering there. Empty editor placeholders remain insertable.

The hero's **Opportunity**, **Your questions** and **Your next step** links target `growth-opportunity`, `growth-questions` and `growth-contact`. Keep those rendering identifiers on the corresponding callout, first accordion and contact component. An accordion is one independently editable component, so authors can duplicate or reorder questions without changing code. Accordions stay expanded while editing so their rich text remains accessible.

## Field contracts

| Component | Fields |
| --- | --- |
| `CampaignHero` | `eyebrow`, `title`, `summary`, `icon` |
| `CampaignAlert` | `title`, rich-text `body`, DateTime `startsAt` and `endsAt` |
| `CampaignCallout` | `eyebrow`, `title`, rich-text `body`, general-link `actionLink` |
| `CampaignAccordion` | `title`, rich-text `body` |
| `CampaignLinkList` | `title`, `icon`, general links `link1`, `link2`, `link3` |
| `CampaignContact` | `title`, `summary`, `buttonLabel` |

The icon field accepts `growth`, `briefcase`, `shield`, `book`, `headset` or `info`; an unknown value uses `growth`. Authors edit text and links through Content SDK field controls, preserving Page Builder metadata. No variant text is selected or hardcoded by the React application.

## Alert display dates

Alert dates control **visibility of the published component**, not a CMS publish/unpublish job. Blank start or end dates are unbounded. Dates are UTC: start is inclusive and end is exclusive. Malformed or reversed windows fail closed in delivery. Page Builder continues to show the component and explains its display window so it can be corrected.

Unscheduled alerts render on the server. A scheduled alert waits until the browser clock is available before displaying, avoiding a flash outside its window. It reevaluates at the next date boundary while the page remains open. Content must already have been approved and published. This mechanism is not an authorization boundary or guaranteed retention control.

## Conversation request

The card opens an accessible native dialog named **Plan your next growth conversation**. **Save conversation request** uses the existing authenticated `request-contact` action, which saves an agency-scoped service task in the configured state adapter. The task appears in **Support** and **My workspace** priorities. It uses the same version, idempotency, agency isolation and reset controls as the portal's other saved work.

This is a custom integrated portal form, not the Sitecore Forms designer and not an outbound email integration. No email is sent. The text limit is 1,000 characters, matching server validation. The contact is selected from the authorized contacts already returned in the agent bootstrap. If no appropriate contact is available, the card links to **Support**. Submission is disabled in the authoring experience. A **saved-work** reviewer-pack reset removes the request and retains the current CDP identity and native experiment history.

## Personalization and state relevance

The native Content SDK personalization rewrite and decision path remain unchanged. The application preserves the selected native variant while rendering the campaign's nested components. Known attributes, custom conditions and audience configuration belong in SitecoreAI.

General campaign guidance is an exploration experience, not a grant of authority to quote or bind. Authored resource and product links carry the same validated licensed-state hint as the product catalog. A forged state value is not propagated. Existing server authorization continues to enforce access to state-specific resources and transactions. Editorial rich-text links should not hardcode a state-specific URL when the content is intended for all agents.

## Validation

`npm test` covers UTC boundaries, invalid windows, slot allowlists, CMS route composition, native variant UIDs, empty editor chrome, licensed-state links, form persistence, idempotency, agency isolation and saved-work reset. Browser acceptance should also check the navigation disclosure, section anchors, accordion keyboard behavior, dialog focus and close behavior, saved request and reload, mobile layout, and native Page Builder personalization.
