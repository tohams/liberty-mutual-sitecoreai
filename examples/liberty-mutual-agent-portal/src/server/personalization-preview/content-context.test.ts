import assert from "node:assert/strict";
import test from "node:test";
import { personalizationPreviewContentContextId } from "./content-context";

test("discovery and rendering choose the dedicated context, draft preview fallback, then live fallback", () => {
  const environment = {
    PERSONALIZATION_PREVIEW_EDGE_CONTEXT_ID: " app-context ",
    SITECORE_PREVIEW_CONTEXT_ID: " draft-context ",
    SITECORE_EDGE_CONTEXT_ID: "live-context",
  };
  assert.equal(
    personalizationPreviewContentContextId(environment),
    "app-context",
  );
  assert.equal(
    personalizationPreviewContentContextId({
      ...environment,
      PERSONALIZATION_PREVIEW_EDGE_CONTEXT_ID: " ",
    }),
    "draft-context",
  );
  assert.equal(
    personalizationPreviewContentContextId({
      SITECORE_EDGE_CONTEXT_ID: "live-context",
    }),
    "live-context",
  );
  assert.throws(() => personalizationPreviewContentContextId({}), {
    code: "CONFIGURATION_REQUIRED",
  });
});
