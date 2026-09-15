import assert from "node:assert/strict";
import test from "node:test";
import type {
  RouteData,
  ComponentRendering,
} from "@sitecore-content-sdk/nextjs";
import nativeArticle from "@/components/resource-image/resource-article-native.fixture.json";
import { canAccessResourcePage } from "./resource-page-access";
import nativeStates from "./resource-page-native-state.fixture.json";

function resourcePage(state: unknown, articleState = state): RouteData {
  const article = structuredClone(
    nativeArticle.rendering,
  ) as unknown as ComponentRendering;
  article.fields = {
    ...article.fields,
    state: { value: articleState },
  } as ComponentRendering["fields"];
  return {
    name: "state-guidance",
    templateId: "{E9573E8D-00D6-5FD9-9015-2F0AEC4A0B60}",
    fields: { state: { value: state } },
    placeholders: { "headless-resource-article": [article] },
  } as RouteData;
}
const daniel = ["IL", "TX"] as const;

test("the observed native editing and published Edge state envelopes enforce the same visitor rule", () => {
  for (const fixture of nativeStates.results) {
    for (const mode of ["native", "liveEdge"] as const) {
      const observed = fixture[mode];
      const route: RouteData = {
        name: fixture.slug,
        itemId: observed.pageId,
        templateId: observed.routeTemplateId,
        fields: { state: observed.routeStateField },
        placeholders: {
          "headless-resource-article": [
            {
              componentName: "ResourceArticle",
              uid: observed.articleUid,
              fields: { state: observed.articleStateField },
            },
          ],
        },
      };
      const path = `/resources/${fixture.slug}`;
      assert.equal(
        canAccessResourcePage(path, route, daniel, false),
        fixture.slug !== "florida-workers-compensation",
        `${mode} ${fixture.slug}`,
      );
      assert.equal(
        canAccessResourcePage(path, route, [], true),
        true,
        "Verified Page Builder access remains independent of visitor licenses",
      );
    }
  }
});

test("Daniel cannot render Florida article data, while Illinois, Texas and nationwide remain available", () => {
  for (const state of ["FL", "IL", "TX", "All"]) {
    assert.equal(
      canAccessResourcePage(
        `/resources/${state.toLowerCase()}-guide`,
        resourcePage(state),
        daniel,
        false,
      ),
      state !== "FL",
    );
  }
  assert.equal(
    canAccessResourcePage(
      "/resources/florida-workers-compensation?state=TX",
      resourcePage("FL"),
      daniel,
      false,
    ),
    false,
  );
  assert.equal(
    canAccessResourcePage(
      "/renamed-florida-guide",
      resourcePage("FL"),
      daniel,
      false,
    ),
    false,
    "Native ResourcePage remains protected after relocation",
  );
  assert.equal(
    canAccessResourcePage(
      "/resources/florida-workers-compensation",
      resourcePage("FL"),
      ["FL"],
      false,
    ),
    true,
  );
});

test("unknown, missing, conflicting or unlicensed article metadata fails closed", () => {
  for (const state of [
    undefined,
    null,
    "",
    " ",
    "CA",
    "TX CA",
    "All FL",
    {},
    ["TX"],
  ]) {
    assert.equal(
      canAccessResourcePage(
        "/resources/guide",
        resourcePage(state),
        daniel,
        false,
      ),
      false,
      String(state),
    );
  }
  assert.equal(
    canAccessResourcePage(
      "/resources/guide",
      resourcePage("TX", "FL"),
      daniel,
      false,
    ),
    false,
    "A substituted article datasource cannot bypass page state",
  );
  assert.equal(
    canAccessResourcePage(
      "/resources/guide",
      resourcePage("All", ""),
      daniel,
      false,
    ),
    false,
  );
  const empty = resourcePage("TX");
  empty.placeholders = { "headless-resource-article": [] };
  assert.equal(
    canAccessResourcePage("/resources/guide", empty, daniel, false),
    false,
  );
});

test("no active licenses permits only nationwide; current licensed states are used on every request", () => {
  assert.equal(
    canAccessResourcePage("/resources/guide", resourcePage("TX"), [], false),
    false,
  );
  assert.equal(
    canAccessResourcePage("/resources/guide", resourcePage("All"), [], false),
    true,
  );
  assert.equal(
    canAccessResourcePage(
      "/resources/guide",
      resourcePage("TX"),
      ["IL"],
      false,
    ),
    false,
  );
});

test("only verified authoring bypasses the visitor guard, including blank branch-created content", () => {
  for (const state of ["FL", "", undefined]) {
    assert.equal(
      canAccessResourcePage("/resources/guide", resourcePage(state), [], true),
      true,
    );
    assert.equal(
      canAccessResourcePage(
        "/resources/guide?sc_mode=edit",
        resourcePage(state),
        daniel,
        false,
      ),
      false,
    );
  }
  assert.equal(
    canAccessResourcePage(
      "/resources",
      { name: "resources", placeholders: {} },
      daniel,
      false,
    ),
    true,
  );
});

test("legacy delivery is checked without admitting a legacy datasource beside a canonical placeholder", () => {
  const legacy = resourcePage("TX");
  legacy.placeholders["headless-main"] =
    legacy.placeholders["headless-resource-article"];
  delete legacy.placeholders["headless-resource-article"];
  assert.equal(
    canAccessResourcePage("/resources/guide", legacy, daniel, false),
    true,
  );
  legacy.placeholders["headless-resource-article"] = [];
  assert.equal(
    canAccessResourcePage("/resources/guide", legacy, daniel, false),
    false,
  );
});
