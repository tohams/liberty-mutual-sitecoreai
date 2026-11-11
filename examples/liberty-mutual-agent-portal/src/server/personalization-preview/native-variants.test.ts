import assert from "node:assert/strict";
import test from "node:test";
import { CdpHelper } from "@sitecore-content-sdk/content/personalize";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";
import { nativePreviewExecutions } from "./native-variants";

const pageId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("native page and component variant groups retain SDK IDs, scope, and control choices", () => {
  assert.deepEqual(
    nativePreviewExecutions(
      {
        pageId,
        variantIds: [
          "componentA_rule1",
          "componentA_rule2",
          "pageVariant",
          "componentB_rule3",
        ],
      },
      "en",
      "portal",
    ),
    [
      {
        componentId: "componentA",
        friendlyId: CdpHelper.getComponentFriendlyId(
          pageId,
          "componentA",
          "en",
          "portal",
        ),
        variantIds: [
          "componentA_default",
          "componentA_rule1",
          "componentA_rule2",
        ],
      },
      {
        friendlyId: CdpHelper.getPageFriendlyId(pageId, "en", "portal"),
        variantIds: ["pageVariant"],
      },
      {
        componentId: "componentB",
        friendlyId: CdpHelper.getComponentFriendlyId(
          pageId,
          "componentB",
          "en",
          "portal",
        ),
        variantIds: ["componentB_default", "componentB_rule3"],
      },
    ],
  );
  assert.deepEqual(
    nativePreviewExecutions({ pageId, variantIds: [] }, "en"),
    [],
  );
});

test("malformed or duplicate native discovery cannot become selectable preview variants", () => {
  for (const info of [
    { pageId: "invalid", variantIds: [] },
    { pageId, variantIds: ["same", "same"] },
    { pageId, variantIds: ["_missing-component"] },
    { pageId, variantIds: ["invalid variant"] },
    {
      pageId,
      variantIds: Array.from({ length: 101 }, (_, index) => `variant${index}`),
    },
  ])
    assert.throws(
      () => nativePreviewExecutions(info, "en"),
      (error) =>
        error instanceof PersonalizationPreviewError &&
        error.code === "INVALID_NATIVE_DISCOVERY" &&
        error.status === 502,
    );
});
