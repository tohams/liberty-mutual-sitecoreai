import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type {
  ComponentRendering,
  RouteData,
} from "@sitecore-content-sdk/nextjs";
import { getPortalPlaceholders } from "./portal-placeholders";

const delivery = { isEditing: false, isPreview: false };
const editing = { isEditing: true, isPreview: false };
const guidance: ComponentRendering = {
  componentName: "AgentGuidance",
  uid: "guidance-instance",
  dataSource: "personalized-guidance-datasource",
  params: { FieldNames: "Highlight" },
};
const search: ComponentRendering = {
  componentName: "ResourceSearch",
  uid: "search-instance",
};
const article: ComponentRendering = {
  componentName: "ResourceArticle",
  uid: "article-instance",
};
const spotlight: ComponentRendering = {
  componentName: "ProductSpotlight",
  uid: "spotlight-instance",
};
const allComponents = [guidance, search, article, spotlight];
const allSlots: RouteData = {
  name: "authored-page",
  placeholders: {
    "headless-agent-guidance": allComponents,
    "headless-resource-search": allComponents,
    "headless-resource-article": allComponents,
    "headless-products-spotlight": allComponents,
  },
};

test("only the appropriate named slots are exposed for each page and operational alias", () => {
  for (const route of [
    "/",
    "/quote",
    "/submissions/sub-001",
    "/clients/client-001",
    "/renewals/pol-001",
    "/growth",
    "/products/personal",
  ]) {
    assert.deepEqual(
      Object.keys(getPortalPlaceholders(route, allSlots, editing)),
      ["guidance"],
      route,
    );
  }
  for (const route of [
    "/resources",
    "/resources/",
    "/learning",
    "/learning/household-review",
  ]) {
    assert.deepEqual(
      Object.keys(getPortalPlaceholders(route, allSlots, editing)),
      ["resourceSearch", "guidance"],
      route,
    );
  }
  assert.deepEqual(
    Object.keys(getPortalPlaceholders("/products", allSlots, editing)),
    ["guidance", "productSpotlight"],
  );
  assert.deepEqual(
    Object.keys(
      getPortalPlaceholders("/resources/illinois-guide", allSlots, editing),
    ),
    ["resourceArticle"],
  );
});

test("misplaced components cannot render in another component's placeholder", () => {
  for (const mode of [delivery, editing]) {
    const resources = getPortalPlaceholders("/resources", allSlots, mode);
    assert.deepEqual(resources.guidance?.rendering.placeholders, {
      "headless-agent-guidance": [guidance],
    });
    assert.deepEqual(resources.resourceSearch?.rendering.placeholders, {
      "headless-resource-search": [search],
    });
    const products = getPortalPlaceholders("/products", allSlots, mode);
    assert.deepEqual(products.productSpotlight?.rendering.placeholders, {
      "headless-products-spotlight": [spotlight],
    });
    const resource = getPortalPlaceholders("/resources/guide", allSlots, mode);
    assert.deepEqual(resource.resourceArticle?.rendering.placeholders, {
      "headless-resource-article": [article],
    });
  }
});

test("previously published headless-main supports only the owning component in delivery", () => {
  const legacy: RouteData = {
    name: "legacy-page",
    placeholders: { "headless-main": allComponents },
  };
  const original = structuredClone(legacy);
  const resources = getPortalPlaceholders("/resources", legacy, delivery);
  assert.deepEqual(resources.resourceSearch?.rendering.placeholders, {
    "headless-main": [search],
  });
  assert.deepEqual(resources.guidance?.rendering.placeholders, {
    "headless-main": [guidance],
  });
  assert.equal(
    resources.guidance?.rendering.placeholders["headless-main"][0],
    guidance,
    "Native instance identity and selected variant are preserved",
  );
  assert.deepEqual(
    getPortalPlaceholders("/resources/guide", legacy, delivery).resourceArticle
      ?.rendering.placeholders,
    { "headless-main": [article] },
  );
  assert.equal(
    getPortalPlaceholders("/products", legacy, delivery).productSpotlight,
    undefined,
    "Spotlight is never recovered from an unrestricted legacy slot",
  );
  assert.deepEqual(legacy, original, "Layout Service data is not mutated");
  for (const mode of [editing, { isEditing: false, isPreview: true }]) {
    const slots = getPortalPlaceholders("/resources", legacy, mode);
    assert.deepEqual(slots.resourceSearch?.rendering.placeholders, {
      "headless-resource-search": [],
    });
    assert.deepEqual(slots.guidance?.rendering.placeholders, {
      "headless-agent-guidance": [],
    });
  }
});

test("an intentionally empty canonical slot does not resurrect earlier published content", () => {
  const page: RouteData = {
    name: "resources",
    placeholders: {
      "headless-agent-guidance": [],
      "headless-resource-search": [],
      "headless-main": [search, guidance],
    },
  };
  const slots = getPortalPlaceholders("/resources", page, delivery);
  assert.deepEqual(slots.resourceSearch?.rendering.placeholders, {
    "headless-resource-search": [],
  });
  assert.deepEqual(slots.guidance?.rendering.placeholders, {
    "headless-agent-guidance": [],
  });
});

test("empty editing slots remain discoverable and native hidden variants retain their editing identity", () => {
  const empty: RouteData = { name: "products", placeholders: {} };
  const slots = getPortalPlaceholders("/products", empty, editing);
  assert.deepEqual(slots.guidance?.rendering.placeholders, {
    "headless-agent-guidance": [],
  });
  assert.deepEqual(slots.productSpotlight?.rendering.placeholders, {
    "headless-products-spotlight": [],
  });
  const hidden = {
    componentName: "Hidden Rendering",
    uid: "hidden-native-variant",
  };
  const hiddenPage: RouteData = {
    name: "products",
    placeholders: { "headless-products-spotlight": [hidden] },
  };
  assert.equal(
    getPortalPlaceholders("/products", hiddenPage, editing).productSpotlight
      ?.rendering.placeholders["headless-products-spotlight"][0],
    hidden,
  );
});

test("SDK emits canonical editing chrome IDs and preserves component placement in rendered HTML", async () => {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      join(
        process.cwd(),
        "src/features/portal/portal-placeholders-render.fixture.ts",
      ),
    ],
    { env: environment, timeout: 15000 },
  );
  assert.match(stdout, /pass 2/);
});

const nativeForm: ComponentRendering = {
  componentName: "Form",
  uid: "native-contact-form",
  params: { FormId: "980983421c624d078ccf2fd29e4ae665-use" },
};

test("native Forms are restricted to the Support slot and retain native parameters", () => {
  const layout: RouteData = {
    name: "Support",
    placeholders: {
      "headless-agent-guidance": [guidance, nativeForm],
      "headless-support-form": [nativeForm, guidance],
    },
  };
  for (const mode of [delivery, editing]) {
    const support = getPortalPlaceholders("/support", layout, mode);
    assert.deepEqual(Object.keys(support), ["guidance", "supportForm"]);
    assert.deepEqual(support.supportForm?.rendering.placeholders, {
      "headless-support-form": [nativeForm],
    });
    assert.equal(
      support.supportForm?.rendering.placeholders["headless-support-form"][0],
      nativeForm,
    );
    assert.deepEqual(support.guidance?.rendering.placeholders, {
      "headless-agent-guidance": [guidance],
    });
    for (const route of [
      "/",
      "/growth/small-business",
      "/resources",
      "/support/other",
      "/products",
    ])
      assert.equal(
        getPortalPlaceholders(route, layout, mode).supportForm,
        undefined,
        route,
      );
  }
});

test("unconfigured Forms remain addable in Page Builder without exposing an empty live section", () => {
  const layout: RouteData = {
    name: "Support",
    placeholders: { "headless-main": [nativeForm] },
  };
  assert.equal(
    getPortalPlaceholders("/support", layout, delivery).supportForm,
    undefined,
  );
  const slot = getPortalPlaceholders("/support", layout, editing).supportForm;
  assert.equal(slot?.name, "headless-support-form");
  assert.deepEqual(slot?.rendering.placeholders, {
    "headless-support-form": [],
  });
});
