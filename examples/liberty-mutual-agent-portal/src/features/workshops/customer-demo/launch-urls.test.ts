import assert from "node:assert/strict";
import test from "node:test";
import { customerDemoChapters } from "./content";
import {
  ARTICLE,
  GRAPHQL_EXPLORER,
  PORTAL,
  PUBLIC,
  SCRUNCH_REVIEW,
  SITECORE_AI,
} from "./demo-destinations";
import { demoLaunchUrls } from "./launch-urls";

const steps = customerDemoChapters.flatMap((chapter) => chapter.steps);

test("starting URLs are explicit, deduplicated, and never inferred from numbered clicks", () => {
  const native =
    "https://pages.sitecorecloud.io/content?sc_itemid=abc&sc_lang=en#fields";
  const source = {
    links: [
      { label: "**Resource fields**", href: native, action: 2, afterLine: 1 },
      { label: "Duplicate fields", href: native, action: 3, afterLine: 0 },
    ],
    presenterActions: [[`Use [**Live article**](${PUBLIC}/article).`]],
    actions: [`Return to [**Public Home**](${PUBLIC}/).`],
  };
  assert.deepEqual(demoLaunchUrls(source), [
    { label: "Resource fields", href: native, action: 2, afterLine: 1 },
  ]);
  assert.deepEqual(demoLaunchUrls({ ...source, links: [] }), []);
  assert.deepEqual(demoLaunchUrls({}), []);
});

test("starting URLs omit unsafe, private helper, and credential-bearing destinations", () => {
  const blocked = [
    "javascript:alert(1)",
    "http://example.com/",
    "https://user:password@example.com/",
    "https://example.com/?api_key=example",
    "https://example.com/?authorization=example",
    "https://example.com/?TOKEN=example",
    "https://example.com/?editingSecret=example",
    `${PORTAL}/demo`,
    `${PORTAL}/demo/public`,
    `${PORTAL}/workshops/guide/example`,
    "/relative",
    "#reset",
  ];
  assert.deepEqual(
    demoLaunchUrls({
      links: blocked.map((href) => ({
        label: "Not a starting target",
        href,
        action: 1,
        afterLine: 0,
      })),
    }),
    [],
  );
});

test("all thirteen loops have one starting destination, or two for genuinely different sites", () => {
  const expected: Record<string, string[]> = {
    "public-question": [`${PUBLIC}/`],
    "public-discovery": [SITECORE_AI, ARTICLE],
    "public-indexing": [SITECORE_AI],
    "public-authoring": [SITECORE_AI, `${PUBLIC}/coverage-page`],
    "public-profound": [SCRUNCH_REVIEW],
    "public-analytics": [SITECORE_AI],
    "public-api": [GRAPHQL_EXPLORER, ARTICLE],
    "portal-relevance": [`${PORTAL}/`, SITECORE_AI],
    "portal-design": [SITECORE_AI],
    "portal-priority-edit": [SITECORE_AI],
    "portal-preview": [SITECORE_AI],
    "portal-shared-content": [SITECORE_AI, `${PUBLIC}/`],
    "portal-audit-rollback": [SITECORE_AI],
  };
  assert.equal(steps.length, 13);
  assert.deepEqual(
    new Set(steps.map((step) => step.id)),
    new Set(Object.keys(expected)),
  );
  for (const step of steps) {
    const actual = demoLaunchUrls(step);
    assert.deepEqual(
      actual.map((link) => link.href),
      expected[step.id],
      step.id,
    );
    assert(actual.length >= 1 && actual.length <= 2, step.id);
    assert.equal(new Set(actual.map((link) => link.href)).size, actual.length);
    if (actual.length === 2)
      assert.equal(
        new Set(actual.map((link) => new URL(link.href).hostname)).size,
        2,
        `${step.id}: a second starting URL must belong to a different site`,
      );
    assert(
      actual.every((link) => link.label.trim().length > 0),
      step.id,
    );
  }
});
