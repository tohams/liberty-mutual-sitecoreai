import assert from "node:assert/strict";
import test from "node:test";
import { MetadataError, type MetadataSnapshot } from "./metadata-contract";
import { createMetadataService } from "./metadata-service";
import {
  isPublicMetadataContext,
  publicPageContentUrl,
} from "./native-public-metadata";

const publicContext = () => ({
  siteInfo: { name: "liberty-mutual-public-site" },
  pageInfo: {
    id: "ae109fc0-b508-5840-97eb-0b2c02ae1a9b",
    path: "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Home/insurance-resources/bundle-car-and-home",
    language: "en",
    version: 6,
  },
});

test("public pages open their exact native Content item without a custom metadata selector", () => {
  const context = publicContext();
  assert.equal(isPublicMetadataContext(context), true);
  const url = new URL(publicPageContentUrl(context)!);
  assert.equal(
    url.origin + url.pathname,
    "https://pages.sitecorecloud.io/content",
  );
  assert.equal(url.searchParams.get("sc_itemid"), context.pageInfo.id);
  assert.equal(url.searchParams.get("sc_version"), "6");
  assert.equal(url.searchParams.get("sc_site"), context.siteInfo.name);
  assert.equal(url.searchParams.get("sc_lang"), "en");
});

test("malformed and out-of-scope selections cannot generate a native content link", () => {
  for (const context of [
    undefined,
    { ...publicContext(), siteInfo: { name: "other-site" } },
    {
      ...publicContext(),
      pageInfo: { ...publicContext().pageInfo, id: "bad-id" },
    },
    {
      ...publicContext(),
      pageInfo: {
        ...publicContext().pageInfo,
        path: "/sitecore/content/another-site/Home",
      },
    },
    {
      ...publicContext(),
      pageInfo: {
        ...publicContext().pageInfo,
        path: publicContext().pageInfo.path + "/../other",
      },
    },
    {
      ...publicContext(),
      pageInfo: { ...publicContext().pageInfo, version: 0 },
    },
    {
      ...publicContext(),
      pageInfo: { ...publicContext().pageInfo, language: "en&redirect=other" },
    },
  ])
    assert.equal(publicPageContentUrl(context), null);
});

test("the Marketplace service never reads or writes public website metadata", async () => {
  let queries = 0;
  const service = createMetadataService({
    getContext: async () => publicContext(),
    query: async () => {
      queries++;
      throw new Error("Public metadata must use native fields");
    },
  });
  await assert.rejects(
    service.load(),
    (error: unknown) =>
      error instanceof MetadataError && error.code === "CONTEXT",
  );
  await assert.rejects(
    service.save({} as MetadataSnapshot, {}),
    (error: unknown) =>
      error instanceof MetadataError && error.code === "STALE",
  );
  assert.equal(queries, 0);
});
