# Product catalog authoring

**Products & appetite** lists published Product pages created directly beneath **Home → Products & appetite** in SitecoreAI. Authors control each card’s title, summary, image, and destination page. Once the product-page capability is installed, adding or updating these pages requires content approval and publication, with no application deployment or Search reindex.

## Create and publish a page

1. Open **Page Builder**, select **Liberty Mutual Agent Portal**, and use **Default editing host**. Under **Home → Products & appetite**, create a direct child using the **Product page** branch. Give the page a unique, readable name. It starts in **Draft**, with its own **Data** folder and **Product details** component.
2. Open the new page’s **Content** fields and complete the fields below. The page itself supplies both the catalog card and its detail content; there is no separate card to maintain.
3. Preview the page and review its copy and product selections. This branch uses the installed **Basic Workflow**: from **Draft**, choose **Approve** and confirm **Approved**. Approval and publication are separate checks; do not assume that approving has published the page.
4. Publish the approved page in the intended language. Use existing published product references and an available media asset; a new image also needs to be available through its media delivery service.
5. After publication completes, refresh **Products & appetite** on the live portal. Choose a licensed **Risk state** and, if relevant, a business-line filter. Check the card’s title, summary, image, and product list, then follow **Explore coverage** to verify the page. Editor preview can display drafts, so it does not establish live publication.

| Page field | What to enter |
| --- | --- |
| **Title** | The readable page heading and catalog card title. |
| **Catalog summary** | A short introduction for the card and detail page. |
| **Catalog image** | An optional image with meaningful alternative text. A card without an image uses its business-line icon. |
| **Product details** | The rich-text guidance displayed on the new page. |
| **Related products** | One or more existing operational products described by the page. Select the managed references rather than entering product IDs. |
| **Distribution channel** | Choose `all`, `independent`, or `wholesale` from the managed Sitecore list. New pages default to `all`. |

The branch is available beneath the Products parent, and the catalog reads its direct children. A different page type or a page nested beneath another product page does not become a catalog card automatically. Existing product guidance pages retain their current authored guidance, links, and composition; their catalog fields control their cards.

## What determines visibility and actions

A card needs a published title, summary, recognized distribution channel, and valid related-product references. Incomplete pages and pages with invalid product references are omitted. An image is optional. The selected references must be published and resolve to existing operational product IDs.

The portal also checks the agency’s channel, the agent’s active licensed states, the chosen business line, and current product availability. A card appears when at least one of its selected products is available in that context; its list shows only those available products. Changing **Distribution channel** to `all` does not expand product availability or grant a license.

**Prepare account** uses the existing operational eligibility checks, including authority and appointments. When a card offers several eligible products, choose one under **Product to prepare** before continuing. Publishing a product page cannot create a new operational product or authorize a transaction. See [State eligibility and risk context](state-eligibility.md).

If a new card is absent, confirm the page’s parent, template, published language, title, summary, product references, and channel, then check the viewer’s selected state and business line. Refresh after the published content reaches the live delivery service. There is no need to trigger a code pipeline to refresh editorial content.

## Maintain and restore content

For a later update, create a new **Draft** version, edit and review the page fields, and choose **Approve**. Confirm **Approved**, publish, and verify the live card and destination again. Follow the same sequence to restore earlier wording. A workshop-number reset changes saved portal work and profile identities; it does not restore product pages, media, or CMS publication.

The managed references live under **Data → ProductCatalog → Products**. Their readable labels help authors select the 18 existing operational products; their IDs connect to the application’s availability rules. Introducing a new operational product requires an integration change and its own review. The [content model](content-model.md#product-catalog-authoring) documents the separate model and initial-content ownership.

The distribution channel choices live under **Data → ProductCatalog → Channels**. Select one when editing a page. The managed list keeps the same three values and `all` default; product availability and eligibility checks remain unchanged.
