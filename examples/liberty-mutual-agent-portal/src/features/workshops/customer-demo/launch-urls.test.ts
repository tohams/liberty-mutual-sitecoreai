import assert from "node:assert/strict";
import test from "node:test";
import { customerDemoChapters } from "./content";
import { customerDemoTabGroups } from "./demo-tabs";
import { demoLaunchUrls } from "./launch-urls";

const PUBLIC = "https://liberty-mutual-public-site.vercel.app";
const PORTAL = "https://liberty-mutual-agent-portal.vercel.app";
const steps = customerDemoChapters.flatMap((chapter) => chapter.steps);
const urls = (id: string) => {
  const step = steps.find((entry) => entry.id === id);
  assert(step, `Missing demo loop ${id}`);
  return demoLaunchUrls(step).map((link) => new URL(link.href));
};

test("launch URLs include inline destinations once and preserve exact pasteable addresses", () => {
  const native =
    "https://pages.sitecorecloud.io/content?sc_itemid=abc&sc_lang=en#fields";
  assert.deepEqual(
    demoLaunchUrls({
      links: [{ label: "**Resource fields**", href: native }],
      presenterActions: [
        [
          `Use [**the same fields**](${native}) and [**Live article**](${PUBLIC}/article).`,
        ],
      ],
      actions: [`Return to [**Public Home**](${PUBLIC}/).`],
    }),
    [
      { label: "Resource fields", href: native },
      { label: "Live article", href: `${PUBLIC}/article` },
      { label: "Public Home", href: `${PUBLIC}/` },
    ],
  );
});

test("launch URLs omit unsafe, private helper, and credential-bearing destinations", () => {
  const blocked = [
    "javascript:alert(1)",
    "https://user:password@example.com/",
    "https://example.com/?api_key=example",
    "https://example.com/?authorization=example",
    `${PORTAL}/demo`,
    `${PORTAL}/demo/public`,
    `${PORTAL}/workshops/guide/example`,
    "/relative",
    "#reset",
  ];
  assert.deepEqual(
    demoLaunchUrls({
      links: blocked.map((href) => ({ label: "Not a launch target", href })),
      presenterActions: [],
      actions: [],
    }),
    [],
  );
});

test("all thirteen loops expose the required public, portal, and native destinations", () => {
  const requirements: Record<string, Array<[string, string, string?]>> = {
    "public-question": [
      [new URL(PUBLIC).hostname, "/"],
      [new URL(PUBLIC).hostname, "/search"],
    ],
    "public-discovery": [
      [
        "pages.sitecorecloud.io",
        "/content",
        "ae109fc0-b508-5840-97eb-0b2c02ae1a9b",
      ],
      [new URL(PUBLIC).hostname, "/insurance-resources/bundle-car-and-home"],
    ],
    "public-indexing": [
      [
        "pages.sitecorecloud.io",
        "/content",
        "ae109fc0-b508-5840-97eb-0b2c02ae1a9b",
      ],
      [
        "app.sitecorecloud.io",
        "/search/f527245d-98c7-4978-8802-237d7717ca43/preview",
      ],
    ],
    "public-authoring": [
      [
        "pages.sitecorecloud.io",
        "/editor",
        "6d600332-3e21-4c5f-83ec-aae04f83450f",
      ],
      [new URL(PUBLIC).hostname, "/coverage-page"],
    ],
    "public-profound": [
      [
        "pages.sitecorecloud.io",
        "/editor",
        "69fc0a48-3e75-426e-9b2b-296d7a3bf8a4",
      ],
      [
        "app.sitecorecloud.io",
        "/channels/collection/45177ac3175042dc9bc748d76ba0858a/sites/d4c417d9-0acf-44f9-aec8-c94730b872bb/aeo-opportunities/readability/review",
      ],
    ],
    "public-analytics": [
      ["app.sitecorecloud.io", "/optimization/dashboards/events"],
    ],
    "public-api": [
      ["edge.sitecorecloud.io", "/api/graphql/ide"],
      [
        "sitecore1.sharepoint.com",
        "/:p:/s/Ops/cQoDg9wZPRa8Tb3nJmHAOX-TEgUCuSmQQA7MGbe1g6C_LnOG3A",
      ],
      [new URL(PUBLIC).hostname, "/insurance-resources/bundle-car-and-home"],
    ],
    "portal-relevance": [
      [new URL(PORTAL).hostname, "/"],
      [
        "pages.sitecorecloud.io",
        "/editor",
        "ae9e45ca-f127-4abe-9ca7-2ff109981998",
      ],
      ["app.sitecorecloud.io", "/optimization/profiles"],
      [
        "app.sitecorecloud.io",
        "/optimization/custom-values/ad7b493b-f768-404c-adc6-9841c2fe1a6e",
      ],
    ],
    "portal-design": [
      [new URL(PORTAL).hostname, "/"],
      [new URL(PORTAL).hostname, "/resources"],
      [
        "pages.sitecorecloud.io",
        "/editor",
        "ae9e45ca-f127-4abe-9ca7-2ff109981998",
      ],
      ["app.sitecorecloud.io", "/design/brandkits"],
    ],
    "portal-priority-edit": [
      [
        "pages.sitecorecloud.io",
        "/content",
        "3127968e-4b21-50c3-ad79-b6bbbe5303b8",
      ],
    ],
    "portal-preview": [
      [new URL(PORTAL).hostname, "/"],
      [
        "pages.sitecorecloud.io",
        "/editor",
        "ae9e45ca-f127-4abe-9ca7-2ff109981998",
      ],
      [
        "pages.sitecorecloud.io",
        "/content",
        "3127968e-4b21-50c3-ad79-b6bbbe5303b8",
      ],
    ],
    "portal-shared-content": [
      [new URL(PUBLIC).hostname, "/"],
      [new URL(PORTAL).hostname, "/"],
      [
        "pages.sitecorecloud.io",
        "/content",
        "9dc572ee-3d67-5909-922f-6482def1cdb0",
      ],
    ],
    "portal-audit-rollback": [
      [new URL(PUBLIC).hostname, "/"],
      [new URL(PORTAL).hostname, "/"],
      [
        "pages.sitecorecloud.io",
        "/content",
        "9dc572ee-3d67-5909-922f-6482def1cdb0",
      ],
    ],
  };
  assert.equal(Object.keys(requirements).length, 13);
  for (const [id, targets] of Object.entries(requirements)) {
    const actual = urls(id);
    assert.equal(new Set(actual.map((url) => url.href)).size, actual.length);
    for (const [hostname, pathname, itemId] of targets)
      assert(
        actual.some(
          (url) =>
            url.hostname === hostname &&
            url.pathname === pathname &&
            (!itemId || url.searchParams.get("sc_itemid") === itemId),
        ),
        `${id} needs a copyable URL for ${hostname}${pathname}${itemId ? ` (${itemId})` : ""}`,
      );
  }
});

test("P0 keeps all twelve real tab URLs, with agent sessions separated by browser context", () => {
  const tabs = customerDemoTabGroups.flatMap((group) => group.tabs);
  assert.equal(tabs.length, 12);
  for (const tab of tabs) {
    const url = new URL(tab.href);
    assert.equal(url.protocol, "https:");
    assert.doesNotMatch(url.pathname, /^\/(?:demo|workshops?)(?:\/|$)/);
  }
  const avery = customerDemoTabGroups.find((group) => group.id === "avery");
  const daniel = customerDemoTabGroups.find((group) => group.id === "daniel");
  assert(avery && daniel);
  assert.equal(avery.tabs[0].href, `${PORTAL}/login`);
  assert.equal(daniel.tabs[0].href, `${PORTAL}/login`);
  assert.match(avery.note, /separate browser profile/);
  assert.match(daniel.note, /another browser profile/);
});
