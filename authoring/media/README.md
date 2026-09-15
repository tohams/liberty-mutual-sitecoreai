# Resource image inventory

[resource-images.json](resource-images.json) records the twelve resource images in the handed-over SitecoreAI sandbox. It contains public delivery URLs, native Media asset identifiers, alt text, dimensions, captions and the stored Image-field XML. There are no credentials or private authoring snapshots in this inventory. The application reads the current CMS fields; it does not use this JSON as a second runtime content source.

The native CMS is the source of truth for subsequent image and content changes. The image item IDs describe this environment. New local Data/image items receive their own native IDs, so a migration to another environment must bind renderings to the new local items rather than copying these IDs as datasource references.

## Existing sandbox handoff

All twelve resources already have their own editable `Data/Resource image` items. The resource branch remains blank for future articles. Handing over this same SitecoreAI environment retains its Media assets, public links, authored images and history; do not reseed existing pages during handoff.

## Fresh environment bootstrap

The regular **ContentCreateOnly** seed creates the original sample articles. The separate **ResourcePageBranch** seed supplies the blank local image structure for articles created from that branch. These seeds do not reconstruct the twelve later-authored image instances automatically.

For a new environment:

1. Deploy the resource model and placeholder restrictions, then seed the site and blank Resource page branch through the documented authoring release process.
2. Establish ownership of the required Media assets and active public links in the destination. Select each asset in the native image picker to obtain the destination's actual Image-field XML. Preserve its opaque `dam-id`; it is not the numeric Media asset ID.
3. Use this inventory to match each image to its resource slug. Add a local Data folder and Resource image item to each existing sample article that needs an image. New articles created from the branch already receive that structure.
4. Add ResourceImage in the article's restricted nested placeholder and bind it to that page's local image item. The parent ResourceArticle uses `DynamicPlaceholderId=1`, so its image placement is `/headless-resource-article/headless-resource-image-1`. Retain the existing page IDs, article rendering, metadata, content and workflow.
5. Verify image URLs, alt text and page-local datasource isolation, then publish each reviewed page with its local content. Publishing a Media asset's public link and publishing a resource page are separate actions.

Any future automated import should be a separate, additive content migration with an exact slug allowlist, a read-only plan, preservation checks and a persistent creation journal. It should consume reviewed destination Media values and create only missing local items. It must not replace existing pages with the branch, assume IDs from this environment, or make the CreateOnly seed overwrite authored content.

The two larger raster images use a documented `format=jpeg` delivery transformation in both `src` and `thumbnailsrc`, retaining their native dimensions, alt text and opaque DAM identifiers. All other image attributes remain unchanged. This is an explicit stored delivery configuration; the React component does not rewrite rendition URLs. See Sitecore's [Media transformations](https://doc.sitecore.com/ch/en/developers/cloud-dev/media-transformations.html).
