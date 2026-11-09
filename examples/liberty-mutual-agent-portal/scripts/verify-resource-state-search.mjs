/** Read-only acceptance against the current published native Push Search index. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { SearchService } from "@sitecore-content-sdk/search";
import { buildResourceSearchFacet } from "../src/components/resource-search/resource-search-facets.ts";
const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../../../authoring/items/liberty-mutual/content-manifest.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const configuration = manifest.resourceSearch.configuration;
const { values } = parseArgs({
  options: { "public-context": { type: "string" }, index: { type: "string" } },
});
assert.ok(
  values["public-context"],
  "Use node --import tsx scripts/verify-resource-state-search.mjs --public-context PUBLIC_CONTEXT [--index NATIVE_INDEX]",
);
const index = values.index || configuration.searchIndex;
assert.ok(
  index && configuration.facetMapping,
  "The current Search binding must include its index and facet mapping",
);
const service = new SearchService({ contextId: values["public-context"] });
const stateField = configuration.fieldsMapping.state;
const identity = (item) => {
  const raw = item.sc_item_id || item.id;
  assert.equal(
    typeof raw,
    "string",
    "Search must retain the CMS item identity",
  );
  const id = raw.replace(/[{}-]/g, "").toLowerCase();
  assert.match(
    id,
    /^[a-f\d]{32}$/,
    "Search identity must be a native CMS item ID",
  );
  return id;
};
const ids = (items) => items.map(identity).sort();
const tags = (item, field) => {
  const values = item[field];
  assert.ok(
    Array.isArray(values) &&
      values.length > 0 &&
      values.every((value) => typeof value === "string" && value.trim()),
    `Every indexed resource must retain native ${field} tag values`,
  );
  assert.equal(new Set(values).size, values.length, `Duplicate ${field} tag`);
  return values;
};
const stateTags = (item) => {
  const states = tags(item, stateField);
  assert.ok(states.every((value) => ["All", "FL", "IL", "TX"].includes(value)));
  assert.ok(
    !states.includes("All") || states.length === 1,
    "Cross-state guidance must be explicit and exclusive",
  );
  return states;
};
const eligible = (item, licenses) =>
  stateTags(item).includes("All") ||
  stateTags(item).some((state) => licenses.includes(state));
async function search(scope, licenses, selection = {}, keyphrase = "") {
  const results = [];
  let total;
  for (let offset = 0; offset < (total ?? 1); offset += 6) {
    assert.ok(
      offset < 600,
      "Acceptance catalog exceeded its bounded page limit",
    );
    const page = await service.search({
      searchIndexId: index,
      keyphrase,
      locale: "en",
      limit: 6,
      offset,
      facet: buildResourceSearchFacet(
        scope,
        licenses,
        selection,
        configuration.facetMapping,
      ),
    });
    total ??= page.total;
    assert.equal(page.total, total, "Native total changed during pagination");
    assert.equal(page.results.length, Math.min(6, total - offset));
    results.push(...page.results);
  }
  assert.equal(results.length, total);
  assert.equal(
    new Set(results.map(identity)).size,
    total,
    "Duplicate result across native pages",
  );
  return results;
}
const allLicenses = ["TX", "FL", "IL"];
const all = await search("licensed", allLicenses);
assert.ok(all.length > 0);
assert.deepEqual(
  new Set(all.flatMap(stateTags)),
  new Set(["TX", "FL", "IL", "All"]),
);
const daniel = await search("licensed", ["IL", "TX"]);
assert.deepEqual(
  ids(daniel),
  ids(all.filter((item) => eligible(item, ["IL", "TX"]))),
);
const maya = await search("licensed", allLicenses);
assert.deepEqual(ids(maya), ids(all));
assert.deepEqual(
  ids(await search("all", ["IL", "TX"])),
  ids(daniel),
  "Legacy All states cannot broaden licenses",
);
assert.deepEqual(
  ids(await search("FL", ["IL", "TX"])),
  ids(daniel),
  "A forged Florida filter cannot broaden licenses",
);
const florida = await search("FL", ["FL"]);
assert.deepEqual(
  ids(florida),
  ids(all.filter((item) => eligible(item, ["FL"]))),
);
const nationwide = await search("All", ["IL", "TX"]);
assert.deepEqual(
  ids(nationwide),
  ids(all.filter((item) => stateTags(item).includes("All"))),
);
assert.deepEqual(ids(await search("licensed", [])), ids(nationwide));
const typeField = configuration.fieldsMapping.type;
const guidance = await search("licensed", ["IL", "TX"], {
  "Resource type": "State guidance",
});
assert.deepEqual(
  ids(guidance),
  ids(
    daniel.filter((item) => tags(item, typeField).includes("State guidance")),
  ),
);
const metadataFacets = [
  ["Product", configuration.facetMapping.Product],
  ["Business family", configuration.fieldsMapping.family],
  ["Distribution channel", configuration.facetMapping["Distribution channel"]],
  ["Resource type", typeField],
];
const metadataChecks = {};
for (const [facetName, fieldName] of metadataFacets) {
  assert.ok(fieldName, "The native binding must name each metadata field");
  const terms = [
    ...new Set(all.flatMap((item) => tags(item, fieldName))),
  ].sort();
  assert.ok(
    terms.length > 1,
    `${facetName} needs distinct values to verify exclusion`,
  );
  for (const term of terms) {
    const selection = { [facetName]: term };
    assert.deepEqual(
      ids(await search("licensed", allLicenses, selection)),
      ids(all.filter((item) => tags(item, fieldName).includes(term))),
      `${facetName} must return exactly the resources containing ${term}`,
    );
    assert.deepEqual(
      ids(await search("licensed", ["IL", "TX"], selection)),
      ids(daniel.filter((item) => tags(item, fieldName).includes(term))),
      `${facetName} must intersect licensed-state filtering for ${term}`,
    );
  }
  const absentTerm = "__unmatched_resource_metadata__";
  assert.ok(!terms.includes(absentTerm));
  assert.equal(
    (await search("licensed", allLicenses, { [facetName]: absentTerm })).length,
    0,
    `${facetName} must exclude resources for an unknown value`,
  );
  metadataChecks[facetName] = {
    valuesVerified: terms.length,
    exactAndLicensedFilters: terms.length * 2,
  };
}
// AND between different facets; membership within each native Tags field.
function combinationsFor(item) {
  let combinations = [[]];
  for (const [, fieldName] of metadataFacets) {
    combinations = combinations.flatMap((combination) =>
      tags(item, fieldName).map((term) => [...combination, term]),
    );
    assert.ok(
      combinations.length <= 600,
      "Acceptance combinations exceeded their bounded limit",
    );
  }
  return combinations.map((combination) => JSON.stringify(combination));
}
const combinations = [...new Set(all.flatMap(combinationsFor))];
assert.ok(combinations.length <= 600);
for (const combination of combinations) {
  const terms = JSON.parse(combination);
  const selection = Object.fromEntries(
    metadataFacets.map(([facetName], index) => [facetName, terms[index]]),
  );
  const matches = (item) =>
    metadataFacets.every(([, fieldName], index) =>
      tags(item, fieldName).includes(terms[index]),
    );
  assert.deepEqual(
    ids(await search("licensed", allLicenses, selection)),
    ids(all.filter(matches)),
    "Combined metadata facets must intersect all selected values",
  );
  assert.deepEqual(
    ids(await search("licensed", ["IL", "TX"], selection)),
    ids(daniel.filter(matches)),
    "Combined metadata facets must preserve licensed-state eligibility",
  );
}
const workers = await search(
  "licensed",
  ["IL", "TX"],
  {},
  "Workers compensation",
);
assert.ok(workers.length > 0);
assert.ok(workers.every((item) => eligible(item, ["IL", "TX"])));
assert.ok(workers.some((item) => stateTags(item).includes("All")));
assert.equal(
  (await search("licensed", ["IL", "TX"], {}, "noresultsxqz9472")).length,
  0,
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      sourceId: index,
      nativeTotals: {
        all: all.length,
        daniel: daniel.length,
        maya: maya.length,
        floridaAndNationwide: florida.length,
        nationwide: nationwide.length,
        danielStateGuidance: guidance.length,
        danielWorkersQuery: workers.length,
      },
      metadataFacets: metadataChecks,
      metadataCombinationsVerified: combinations.length,
      checks:
        "Licensed state OR filters, explicit cross-state guidance, forged-filter restrictions, every native metadata tag, exact facet intersections, unknown facet values, query, native six-item pagination, empty results",
    },
    null,
    2,
  ),
);
