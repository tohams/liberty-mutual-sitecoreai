import assert from "node:assert/strict";
import test from "node:test";
import options from "@/data/resource-taxonomy-options.json";
import {
  resolveResourceMetadataField,
  resourceMetadataLabels,
  RESOURCE_TAXONOMY_ROOT,
  type ResourceMetadataField,
} from "./resource-metadata";

const folders = {
  state: "Risk states",
  businessFamily: "Business families",
  product: "Products",
  channel: "Distribution channels",
  resourceType: "Resource types",
};
export function referenceField(name: ResourceMetadataField, values: string[]) {
  const targetItems = values.map((value) => {
    const choice = options[name].find((option) => option.value === value)!;
    return {
      id: choice.id,
      name: value,
      path: `${RESOURCE_TAXONOMY_ROOT}/${folders[name]}/${value}`,
      template: { id: "9dc18d3c-9944-507a-aeab-9787c8fc4d9c" },
    };
  });
  return {
    value: targetItems.map((item) => `{${item.id.toUpperCase()}}`).join("|"),
    targetIds: targetItems.map((item) => item.id),
    targetItems,
  };
}

test("Edge and SDK checklist values resolve the same independent products and labels", () => {
  const edge = referenceField("product", ["home", "auto"]);
  const layout = edge.targetItems.map(({ id, name }) => ({
    id,
    name,
    fields: { description: { value: "Managed choice" } },
  }));
  assert.deepEqual(resolveResourceMetadataField("product", edge), [
    "auto",
    "home",
  ]);
  assert.deepEqual(resolveResourceMetadataField("product", layout), [
    "auto",
    "home",
  ]);
  assert.deepEqual(resourceMetadataLabels("product", layout), [
    "Auto",
    "Homeowners",
  ]);
  assert.deepEqual(
    resolveResourceMetadataField("product", {
      jsonValue: { value: "auto-home" },
    }),
    ["auto", "home"],
  );
  assert.deepEqual(
    resolveResourceMetadataField("resourceType", {
      value: "State guidance,Checklist",
    }),
    ["Checklist", "State guidance"],
  );
});

test("All is explicit and distinct from selecting every supported state", () => {
  assert.deepEqual(
    resolveResourceMetadataField(
      "state",
      referenceField("state", ["IL", "FL", "TX"]),
    ),
    ["FL", "IL", "TX"],
  );
  assert.deepEqual(
    resolveResourceMetadataField("state", referenceField("state", ["All"])),
    ["All"],
  );
  assert.throws(
    () =>
      resolveResourceMetadataField(
        "state",
        referenceField("state", ["All", "TX"]),
      ),
    /INVALID_RESOURCE_METADATA/,
  );
  assert.deepEqual(
    resolveResourceMetadataField("state", { jsonValue: { value: "IL,TX" } }),
    ["IL", "TX"],
  );
});

test("a new managed resource type uses its native label without broadening state or Edge validation", () => {
  const addedType = [
    {
      id: "f1f1f1f1-2222-4333-8444-555555555555",
      name: "Quick guide",
      displayName: "Quick reference guide",
      fields: {
        description: { value: "A new author-managed kind of guidance." },
      },
    },
  ];
  assert.deepEqual(resourceMetadataLabels("resourceType", addedType), [
    "Quick reference guide",
  ]);
  assert.deepEqual(
    resourceMetadataLabels("resourceType", [
      { ...addedType[0], displayName: "" },
    ]),
    ["Quick guide"],
  );
  assert.throws(
    () => resolveResourceMetadataField("resourceType", addedType),
    /INVALID_RESOURCE_METADATA/,
  );
  assert.throws(
    () => resourceMetadataLabels("state", [{ ...addedType[0], name: "TX" }]),
    /INVALID_RESOURCE_METADATA/,
  );
  assert.throws(
    () =>
      resourceMetadataLabels("resourceType", [
        { ...addedType[0], path: "/another-site/Quick guide" },
      ]),
    /INVALID_RESOURCE_METADATA/,
  );
  assert.throws(
    () =>
      resourceMetadataLabels("resourceType", [
        { ...addedType[0], displayName: "<script>bad</script>" },
      ]),
    /INVALID_RESOURCE_METADATA/,
  );
});

test("missing, foreign, unresolved, or inconsistent references cannot become values", () => {
  for (const mutate of [
    (field: ReturnType<typeof referenceField>) => {
      field.targetItems.pop();
    },
    (field: ReturnType<typeof referenceField>) => {
      field.targetItems[0].path = "/another-site/auto";
    },
    (field: ReturnType<typeof referenceField>) => {
      field.targetItems[0].template.id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    },
    (field: ReturnType<typeof referenceField>) => {
      field.value = "{AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA}";
    },
  ]) {
    const field = referenceField("product", ["auto"]);
    mutate(field);
    assert.throws(
      () => resolveResourceMetadataField("product", field),
      /INVALID_RESOURCE_METADATA/,
    );
  }
  assert.throws(
    () =>
      resolveResourceMetadataField("state", [
        { id: options.product[0].id, name: "TX" },
      ]),
    /INVALID_RESOURCE_METADATA/,
  );
  assert.throws(
    () => resolveResourceMetadataField("state", { value: "TX,CA" }),
    /INVALID_RESOURCE_METADATA/,
  );
  assert.throws(
    () => resolveResourceMetadataField("product", { value: "auto|home" }),
    /INVALID_RESOURCE_METADATA/,
  );
  assert.deepEqual(resolveResourceMetadataField("state", undefined), []);
  assert.deepEqual(resolveResourceMetadataField("state", []), []);
});
