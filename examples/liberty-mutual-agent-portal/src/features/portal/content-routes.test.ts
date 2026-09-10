import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Product, Resource } from "@/contracts/portal";
import { productHref, resourceHref, portalContentPath } from "./content-routes";
import { getPersonalizedRewrite, getPersonalizedRewriteData, normalizePersonalizedRewrite } from '@sitecore-content-sdk/content/personalize';

const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../../../../../authoring/items/liberty-mutual/content-manifest.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  resourcePages: { route: string }[];
  generatedFiles: string[];
};
const resources = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/resources.json", import.meta.url),
    "utf8",
  ),
) as Resource[];
const products = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/products.json", import.meta.url),
    "utf8",
  ),
) as Product[];

test('operational aliases preserve native page and component variant selections in explicit page options', () => {
  for (const [route, content] of [['/learning/household-review', 'resources'], ['/submissions/sub-001', 'quote'], ['/renewals/pol-001', 'clients']]) {
    const rewritten = getPersonalizedRewrite(route, ['page-campaign', 'component_principal']);
    const path = rewritten.split('/').filter(Boolean);
    const contentPath = portalContentPath(normalizePersonalizedRewrite(rewritten), path);
    const personalize = getPersonalizedRewriteData(path.join('/'));
    assert.deepEqual(contentPath, [content]);
    assert.deepEqual(personalize, { variantId: 'page-campaign', componentVariantIds: ['component_principal'] });
    assert.notDeepEqual(getPersonalizedRewriteData(contentPath.join('/')), personalize, 'The remapped CMS path alone loses the native selection');
  }
  const clients = ['clients', '_variantId_component_principal'];
  assert.equal(portalContentPath('/clients', clients), clients, 'SDK rewrite segments are not mistaken for an operational record');
});

test("Every resource card points to a serialized CMS page", () => {
  const authoredRoutes = new Set(
    manifest.resourcePages.map((page) => page.route),
  );
  for (const resource of resources)
    assert.ok(
      authoredRoutes.has(resourceHref(resource)),
      `Missing native CMS route for resource ${resource.id}`,
    );
});

test("Every operational product has an authored hub in both distribution channels", () => {
  for (const product of products) {
    for (const channel of ["independent", "wholesale"] as const) {
      const path = productHref(product, channel);
      assert.ok(
        manifest.generatedFiles.some((file) =>
          file.endsWith(`/Home${path}.yml`),
        ),
        `Missing native CMS hub for ${product.id} in ${channel}`,
      );
    }
  }
});
