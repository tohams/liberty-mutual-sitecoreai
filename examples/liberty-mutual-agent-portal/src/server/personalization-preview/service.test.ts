import assert from "node:assert/strict";
import test from "node:test";
process.env.SITECORE_EDGE_CONTEXT_ID ||= "unit-test-personalization-preview";

const page = {
  pageId: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
  language: "en",
  version: 1,
};
test("accepts bounded Page Builder page selections and rejects unrecognized sites or query parameters", async () => {
  const { parsePersonalizationPageRequest } = await import("./service");
  assert.deepEqual(parsePersonalizationPageRequest(page), page);
  for (const extra of [
    { siteName: "other-site" },
    { path: "https://attacker.invalid" },
    { version: 0 },
    { language: "../en" },
    { pageId: "not-a-page" },
  ])
    assert.throws(
      () => parsePersonalizationPageRequest({ ...page, ...extra }),
      { code: "INVALID_PAGE_SELECTION" },
    );
});
test("preview requests accept selectors only, with no profiles, custom expressions, or target URLs", async () => {
  const { parsePersonalizationPreviewRequest } = await import("./service");
  const input = {
    ...page,
    revision: "a".repeat(64),
    selections: [{ flowId: "flow-one", optionId: "native-variant" }],
  };
  assert.deepEqual(parsePersonalizationPreviewRequest(input), input);
  for (const extra of [
    { profileId: "any" },
    { previewUrl: "https://attacker.invalid" },
    {
      selections: [
        { flowId: "flow-one", optionId: "native-variant", code: "return true" },
      ],
    },
    { revision: "old" },
  ])
    assert.throws(() =>
      parsePersonalizationPreviewRequest({ ...input, ...extra }),
    );
});
