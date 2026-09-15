# Create and maintain resource pages

Use the **Resource page** page branch under **Learning & resources**. It creates a complete article structure with empty authoring fields and its own **Data → Resource image** item. Authors enter the content once: the page supplies the article, native Search metadata, and Resource metadata app.

## Create an article

1. Open Page builder and select **Liberty Mutual Agent Portal**.
2. In the site tree, select **Learning & resources**, then create a page using **Resource page**.
3. Enter a short URL name using lowercase words separated by hyphens, such as `texas-submission-guide`. The title starts with that name; edit the displayed title into readable text. The summary, body, reviewed date, source link, and five metadata selections start empty. No existing article's state, product, copy, or image is copied.
4. Enter the title, summary, body and reviewed date. Add a source link only when appropriate. Use **Apps → Resource metadata** to select **Risk state**, **Business family**, **Product**, **Distribution channel**, and **Resource type**, then click **Save metadata**. Use **All** only when the guidance applies across the supported states.
5. Select the image area between the summary and article body. Click **Add**, then choose **Media** in the picker for the modern Media Library. Select a suitable public image and click **Insert**. Use **Change** to replace it later. Review the image's alt text and add a caption when useful.
6. Preview the article. Confirm the correct title, state, image, alt text, body and source destination. Follow the page's approval workflow, then publish the page and its referenced content.
7. Open **Content → Search Sources → Liberty Mutual Agent Resources → Reindex Content**. After the job completes, verify the article in **Learning & resources**, including its state and business-family filters.

Publishing and Search ingestion are separate actions. An incomplete published article is omitted by the portal's resource catalog when required content, state, business-family, type or reviewed-date values are invalid. Finish those fields before approval instead of relying on this defensive behavior.

Modern Media Library assets require an active public link to be selected for the website. An asset upload is not the same as publishing a page. Alt text, tags and asset descriptions are managed in Media; the article's optional caption is local content. Follow the [image selection instructions](https://doc.sitecore.com/sai/en/users/sitecoreai/build-pages/adding-content-to-a-page/add-an-image-to-a-page.html) and [public-link instructions](https://doc.sitecore.com/sai/en/users/sitecoreai/manage-media/modern-media-library/add-a-public-link.html).

## What belongs where

| Item | Content and behavior |
| --- | --- |
| `Home/resources/<page>` — ResourcePage | Title, summary, body, reviewed date, source link, and the five Search metadata fields. This remains the Search document and Resource metadata app target. |
| `<page>/Data` — native SXA page Data folder | Holds only local supporting content. Insert options permit ResourceImage. |
| `<page>/Data/Resource image` — ResourceImage | One native Image field and an optional caption. It is independent from images on other resource pages. |
| `Presentation/Page Branches/Resource page/$name` | Blank starting structure. New pages copy this structure; later branch changes do not update existing articles. |
| `Data/Taxonomy` | The five managed metadata lists, shared by all articles. |

The image renders in **headless-resource-image-{*}**, a native SXA dynamic placeholder inside **ResourceArticle**. The branch sets the article's `DynamicPlaceholderId` to `1`, so its image placement is `/headless-resource-article/headless-resource-image-1`. The rendering property `IsRenderingsWithDynamicPlaceholders=true`, the existing `IDynamicPlaceholder` parameter base template, and both wildcard placeholder settings work together to resolve and restrict the image. Both global and site placeholder settings allow only **ResourceImage** there. **ResourceArticle** remains restricted to the article page's **headless-resource-article** placeholder. The current-page datasource option keeps article text bound to its own page. A page design is not required to create this structure: the page branch supplies the fixed starting layout and local content, while the application and placeholder settings maintain the article structure.

Keep the local **Data** and **Resource image** names intact. The datasource reference is page-relative; manually renaming the item requires reselecting its datasource. [Sitecore's datasource guidance](https://doc.sitecore.com/sai/en/developers/sitecoreai/data-sources.html) explains this relationship. The image's public delivery URL is retained as supplied by the modern Media Library; no legacy `mediaid` conversion or rendition-query rewriting is applied.

## Developer implementation and deployment

`ResourcePage` retains template ID `e9573e8d-00d6-5fd9-9015-2f0aec4a0b60` and its existing fields. The five indexed metadata fields remain versioned **Single-Line Text** because this tenant's native Search rejects Droplist fields. The Marketplace app provides the managed selections without changing the indexed contract.

`ResourceImage` uses template `57ee0749-a33c-50ff-b20b-0337974b7bd6`, image field `ca9a643a-07b6-5945-8fa5-af13e02af584`, caption field `a8d126c1-34ee-5679-9cf6-8d699a788cd8`, and rendering `2958922f-9832-5a46-b489-a4408eb363b1`. It has no additional independent author workflow; the page retains Basic Workflow. Publish the local image datasource with its page. The native Media asset's public-link lifecycle is separate.

The branch's root/prototype identities were created with the native Page builder: `8376af58-fc32-4894-a57d-fd5e6e966272` / `f88b4735-b33d-4ad4-a0b0-bfe60e657572`. The source-of-truth implementation is `authoring/scripts/resource-page-authoring-model.cjs`; `resource-page-authoring-manifest.json` records the graph. The branch sets the ResourceArticle datasource to the native `$id` token and the image datasource to `page:/Data/Resource image`. Native page creation must expand the former and resolve the latter to the new page's child, never to the branch prototype or another article.

The following release boundaries protect authored content:

- **LibertyMutual.Model** updates owned templates, renderings, global placeholders and layouts.
- **LibertyMutual.SitePresentation** updates five exact site placeholder settings. It includes no pages or editorial Data items.
- **LibertyMutual.ResourcePageBranch** is a separate **CreateOnly** module for the blank branch subtree. It stays outside `xmcloud.build.json` resource packages so the customer can edit it. The broader Content module excludes this subtree to prevent overlapping ownership.
- Existing articles retain their IDs, paths, versions, text, metadata, workflows and native personalization. Adding local images is a separate, scoped content operation; replacing a page with the branch would discard author history and is not a migration technique.

For a fresh target, create the site scaffold, deploy the model and exact site restrictions, then seed the CreateOnly branch and ResourceImage variant. For this existing target, review the authoring configurator's changes before applying them. It sets only the article rendering's datasource/placeholder settings, page insert options, the branch insert rule/layout, and the Available Renderings entry. Native definitions and branch configuration use the regular authoring release/CLI process; frontend components deploy through GitHub and Vercel.

```bash
python -m pip install -r authoring/scripts/requirements.txt
python authoring/scripts/build-resource-page-seed.py --check
python authoring/scripts/validate-content-seed.py
node --test authoring/scripts/configure-resource-page-authoring.test.cjs

# Native read-only capture; choose a private directory outside the checkout.
node authoring/scripts/configure-resource-page-authoring.cjs <environment> --snapshot /absolute/private/resource-page-before.json
node authoring/scripts/configure-resource-page-authoring.cjs <environment> --baseline /absolute/private/resource-page-before.json

# Apply only the reviewed configuration plan; keep the journal with the baseline.
node authoring/scripts/configure-resource-page-authoring.cjs <environment> --baseline /absolute/private/resource-page-before.json --apply --journal /absolute/private/resource-page-journal.json
```

Use an isolated Python environment if your system Python manages packages externally. The only Python dependency is the pinned PyYAML version in `authoring/scripts/requirements.txt`; the generator also uses Node.js to read the shared authoring contract. For native deployment, `deploy-content.sh <environment> --seed-branch --what-if` previews an explicit CreateOnly branch seed on an existing site; `--seed` includes it after creating a fresh site's content parent. Normal releases never reseed the editable branch.

The configurator checks all fields and versions before each write and reads them back afterward. It does not create items, upload media, approve pages, or publish content. It stops on unexpected edits or an uncertain response; rerun the read-only plan before considering another apply. Sitecore's authoring API does not offer an atomic revision precondition, so coordinate authoring during the short migration window. If materializing an item from a resource package changes creation metadata, investigate the recorded write before any repair; the configurator does not silently normalize that change.

## Acceptance and reset

Before handing over this creation flow, verify it in the native authoring environment:

1. Confirm **Resource page** is available beneath **Learning & resources**, and raw ResourcePage creation is not offered on unrelated portal pages.
2. Create two uniquely named resource pages. On each, inspect the blank metadata, native Draft state, local Data folder, editable title/body and empty image control.
3. Read each created layout. ResourceArticle must reference that created page's own ID; ResourceImage must resolve beneath that same page's Data folder. Each local image item must have a distinct ID. Neither page may reference the branch prototype or the other page's local content.
4. Add a different image/caption to each and confirm that editing one does not change the other. Check Page builder, preview and published delivery; verify alt text and that the Modern Media delivery URL is unmodified.
5. Confirm the nested image placeholder permits only ResourceImage, and article/text/Search components cannot be inserted there or on an unrelated page.
6. Complete one article, approve and publish it and its local content, then reindex **Liberty Mutual Agent Resources**. Verify both an applicable licensed-state result and a state that should exclude it. Confirm the Resource metadata app still edits the article page itself.
7. Restore any existing article fields or images changed during a rehearsal. Recycle only the temporary pages created for the test; if published, remove them from published delivery and reindex Search. Retain the permanent Resource page branch and all existing customer content.

An unpublished test page can be recycled without touching live resource content. The portal's **Reset workspace** control resets agent activity; it does not undo CMS authoring, Media assets, branch edits or Search ingestion.

Sitecore describes the independent-copy behavior and insert rules in [Create and configure a page branch](https://doc.sitecore.com/sai/en/users/sitecoreai/build-pages/building-page-templates-and-branches/create-and-configure-a-page-branch.html), and page-relative datasource behavior in [Use a prefix to set the data source context](https://doc.sitecore.com/sai/en/developers/sitecoreai/content-modeling-and-presentation/data-sources/use-a-prefix-to-set-the-data-source-context.html).

The configuration follows SitecoreAI's [dynamic placeholder component procedure](https://doc.sitecore.com/sai/en/developers/sitecoreai/content-modeling-and-presentation/sitecoreai-for-developers/content-editor-items/components/use-dynamic-placeholders-in-components.html). Native authoring QA verified that Layout Service includes the nested ResourceImage, resolves its datasource to the new page's own Data item, and exposes only ResourceImage as an allowed control.
