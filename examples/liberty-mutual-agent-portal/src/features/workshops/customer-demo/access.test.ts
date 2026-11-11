import assert from "node:assert/strict";
import test from "node:test";
import { isDemoGuidePath } from "./access";
import { presenterInputs } from "./demo-inputs.server";
import { customerDemoChapters } from "./content";

test("anonymous access is confined to the two read-only demo guides", () => {
  for (const path of ["/demo", "/demo/", "/demo/public", "/demo/public/"])
    assert.equal(isDemoGuidePath(path), true, path);
  for (const path of [
    "/",
    "/demography",
    "/demo/reset",
    "/demo/public/reset",
    "/demo//public",
    "/workshops",
    "/workshops/demo",
    "/workshops/reset",
    "/operator/reset",
    "/api/workshops/reset",
    "/api/workshops/assets/example.png",
    "/apps/personalization-preview",
    "/api/personalization-preview/context",
  ])
    assert.equal(isDemoGuidePath(path), false, path);
});

test("anonymous copy fields never include the configured Delivery API credential", () => {
  const previous = process.env.DEMO_GRAPHQL_DELIVERY_API_KEY;
  process.env.DEMO_GRAPHQL_DELIVERY_API_KEY = "private-test-token-never-public";
  try {
    const steps = customerDemoChapters.flatMap((chapter) => chapter.steps);
    for (const step of steps) {
      assert(
        !JSON.stringify(presenterInputs(step)).includes(
          "private-test-token-never-public",
        ),
      );
      assert(
        !JSON.stringify(
          presenterInputs(step, { includeDeliveryToken: false }),
        ).includes("private-test-token-never-public"),
      );
    }
    const api = steps.find((step) => step.id === "public-api")!;
    assert.equal(
      JSON.parse(
        presenterInputs(api).find((input) => input.label === "HTTP headers")!
          .value,
      ).sc_apikey,
      "<Delivery API token>",
    );
    assert.equal(
      JSON.parse(
        presenterInputs(api, { includeDeliveryToken: true }).find(
          (input) => input.label === "HTTP headers",
        )!.value,
      ).sc_apikey,
      "private-test-token-never-public",
    );
  } finally {
    if (previous === undefined)
      delete process.env.DEMO_GRAPHQL_DELIVERY_API_KEY;
    else process.env.DEMO_GRAPHQL_DELIVERY_API_KEY = previous;
  }
});
