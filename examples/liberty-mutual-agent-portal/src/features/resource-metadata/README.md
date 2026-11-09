# Metadata authoring

## Public website: native content fields

Public website pages and approved answers use native **Checklist** fields for **State applicability**, **Products**, and **Audience**. Authors edit a page through **Page content**. To edit a reused answer, select its visible **Approved answer** component and use its **Content** fields, or open the answer in **Page Builder Content**. No custom selector or editing-only component is required.

The content owns its classification: a page's fields classify that page, while the approved-answer datasource's fields classify the reused answer in Search and the content API. Managed options live under the public website's **Data/Taxonomy/States**, **Products**, and **Audiences** folders. Products are individual choices such as **Auto**, **Homeowners**, and **Condo**. Authors can choose several applicable products. An **All** choice is used on its own rather than alongside specific choices.

Checklist fields store native item references. The public publication service resolves the selected taxonomy items into stable values for Search and the content API. It also accepts the previous text values during the rollout. Normal permissions, versions, review, and publication remain native Sitecore behavior. Ordinary taxonomy seeding is additive and preserves author edits.

## Agent Portal: Resource metadata app

The **Resource metadata** Marketplace app serves the Agent Portal's existing resource articles and native Search source. It provides controlled choices for risk state, business family, product, distribution channel, and resource type while preserving that source's text-field contract.

The app reads current choices from native **Data/Taxonomy** content, validates the exact page, language, version, draft state, and allowed fields, and verifies a minimal save. It does not autosave, create versions, approve, publish, reindex, or change presentation. The standalone URL is inert. The Marketplace host supplies the authorized environment context, and the app checks the configured organization and tenant.

If the app is opened on the public website, it displays native-authoring guidance and a link to the current page in **Page Builder Content**. It makes no public metadata query or write and shows no page-versus-answer dropdown.
