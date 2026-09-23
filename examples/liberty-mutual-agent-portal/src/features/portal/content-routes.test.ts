import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Resource } from "@/contracts/portal";
import { resourceHref, portalContentPath, isPortalNavigationActive } from "./content-routes";
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

test("Home keeps the native root path and SDK personalization selection", () => {
  const plainPath: string[] = [];
  assert.equal(portalContentPath("/", plainPath), plainPath);
  const rewritten = getPersonalizedRewrite("/", ["home-campaign", "component_principal"]);
  const path = rewritten.split("/").filter(Boolean);
  const contentPath = portalContentPath(normalizePersonalizedRewrite(rewritten), path);
  assert.equal(contentPath, path);
  assert.deepEqual(getPersonalizedRewriteData(contentPath.join("/")), {
    variantId: "home-campaign",
    componentVariantIds: ["component_principal"],
  });
});

test("My workspace navigation matches only Home while sections include their child routes", () => {
  assert.equal(isPortalNavigationActive("/", "/"), true);
  for (const route of ["/resources", "/resources/texas-guide", "/products", "/quote"])
    assert.equal(isPortalNavigationActive(route, "/"), false);
  assert.equal(isPortalNavigationActive("/resources", "/resources"), true);
  assert.equal(isPortalNavigationActive("/resources/texas-guide", "/resources"), true);
  assert.equal(isPortalNavigationActive("/resources-other", "/resources"), false);
});


test("growth campaigns retain the native page and component personalization rewrite", () => {
  const rewritten = getPersonalizedRewrite("/growth/small-business", ["campaign-page-variant", "component_growth-opportunity"]);
  const path = rewritten.split("/").filter(Boolean);
  const contentPath = portalContentPath(normalizePersonalizedRewrite(rewritten), path);
  assert.equal(contentPath, path);
  assert.deepEqual(getPersonalizedRewriteData(contentPath.join("/")), {
    variantId: "campaign-page-variant",
    componentVariantIds: ["component_growth-opportunity"],
  });
});
