import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { customerDemoChapters } from "./content";
import {
  customerDemoSchedule,
  DEMO_CLOSING_MINUTES,
  DEMO_OPENING_MINUTES,
  DEMO_TOTAL_MINUTES,
  elapsedTime,
} from "./timing";
import type { DemoStep } from "./types";
import { isGuideHref, plainGuideText } from "../guide-text";
import { validImageAnnotation, validImageCrop } from "../guide-images";
import { workshopGuides } from "../content";

// Independent customer contract: original demo-guide slides 10 and 11,
// interpreted in their visual row/left-to-right order, not generated from content.ts.
const PUBLIC_CARDS = [
  "User can ask a question in conversational language in an AI-enabled search field",
  "Search engines and AI answer engines can find and cite the right LM content",
  "Published content is automatically indexed by enterprise search platform",
  "Marketing builds and publishes pages from a library of pre-approved components",
  "Marketing can publish content from Profound directly into the CMS / DXP",
  "Quick-answer analytics for marketers",
  "Decoupled delivery with a stable content API",
];
const PORTAL_CARDS = [
  "Agent sees product content, and bundles based on their business, relationship and priorities",
  "Agent sees consistent brand and design across all portal pages",
  "Marketing user changes a priority without development work",
  "Marketing user previews the experience for each agent audience",
  "Approved shared content is managed once and distributed to every website",
  "Every change is approved, auditable, and reversible",
];
const STABLE_ANCHORS = [
  "public-question",
  "public-discovery",
  "public-indexing",
  "public-authoring",
  "public-profound",
  "public-analytics",
  "public-api",
  "portal-relevance",
  "portal-design",
  "portal-priority-edit",
  "portal-preview",
  "portal-shared-content",
  "portal-audit-rollback",
];
const PUBLIC_HOST = "liberty-mutual-public-site.vercel.app";
const PORTAL_HOST = "liberty-mutual-agent-portal.vercel.app";
const ORG = "org_XqL3u1MSNVuubOTb";
const TENANT_NAME = "scaipocusem400b-sitecoreai950c-demo4418";
const ANSWER_ID = "70144ef3-4be0-597a-9b22-81e8ee1cc9f6";
const DISCLOSURE_ID = "c4fd68f7-7c79-5bb6-9919-fb6f82b84bca";
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const steps = customerDemoChapters.flatMap((chapter) => chapter.steps);
const step = (id: string): DemoStep => {
  const found = steps.find((entry) => entry.id === id);
  assert(found, `Missing prescribed demonstration card: ${id}`);
  return found;
};
const prose = (value: unknown): string => plainGuideText(JSON.stringify(value));
const actions = (id: string): string[] => step(id).actions.map(plainGuideText);

function actionIndex(id: string, expression: RegExp): number {
  const index = actions(id).findIndex((action) => expression.test(action));
  assert(index >= 0, `${id}: missing action ${expression}`);
  return index;
}
function linksIn(value: unknown): Array<{ label: string; href: string }> {
  if (typeof value === "string")
    return [...value.matchAll(/\[([^\]\r\n]+)\]\(([^)\r\n]+)\)/g)].map(
      (match) => ({ label: plainGuideText(match[1]), href: match[2] }),
    );
  if (Array.isArray(value)) return value.flatMap(linksIn);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const own =
      typeof object.href === "string" && typeof object.label === "string"
        ? [{ href: object.href, label: object.label }]
        : [];
    return [...own, ...Object.values(object).flatMap(linksIn)];
  }
  return [];
}

test("all thirteen customer cards retain the prescribed chapters, rows, and reading order", () => {
  assert.deepEqual(
    customerDemoChapters.map((chapter) => [
      chapter.id,
      chapter.title,
      chapter.sourceSlide,
    ]),
    [
      ["public", "Trusted Answers, Wherever the Journey Begins", 10],
      ["portal", "One Relevant Liberty Experience", 11],
    ],
  );
  const [publicChapter, portalChapter] = customerDemoChapters;
  assert.deepEqual(
    publicChapter.steps.map((entry) => entry.label.trim()),
    PUBLIC_CARDS,
  );
  assert.deepEqual(
    portalChapter.steps.map((entry) => entry.label.trim()),
    PORTAL_CARDS,
  );
  assert(publicChapter.steps.every((entry) => entry.sourceSlide === 10));
  assert(portalChapter.steps.every((entry) => entry.sourceSlide === 11));
  assert.deepEqual(
    publicChapter.steps.map((entry) => entry.phase),
    [
      ...Array(3).fill("Core Demonstration Flow"),
      ...Array(2).fill("Authoring & Content-Operation Flow"),
      ...Array(2).fill("Measurement & Delivery Foundation"),
    ],
  );
  assert.deepEqual(
    portalChapter.steps.map((entry) => entry.phase),
    [
      ...Array(2).fill("Agent Experience"),
      ...Array(2).fill("Liberty Business Experience"),
      ...Array(2).fill("Shared-Content Foundation"),
    ],
  );
});

test("the live sequence fits exactly forty-five minutes without borrowing preparation or reset time", () => {
  assert.deepEqual(
    customerDemoChapters[0].steps.map((entry) => entry.durationMinutes),
    [3, 2, 2, 7, 1, 3, 3],
  );
  assert.deepEqual(
    customerDemoChapters[1].steps.map((entry) => entry.durationMinutes),
    [4, 2, 4, 4, 4, 4],
  );
  assert.equal(DEMO_OPENING_MINUTES, 1);
  assert.equal(DEMO_CLOSING_MINUTES, 1);
  assert.equal(DEMO_TOTAL_MINUTES, 45);
  const schedule = customerDemoSchedule(customerDemoChapters);
  assert.deepEqual(
    schedule.map(({ start, end }) => [start, end]),
    [
      [1, 4],
      [4, 6],
      [6, 8],
      [8, 15],
      [15, 16],
      [16, 19],
      [19, 22],
      [22, 26],
      [26, 28],
      [28, 32],
      [32, 36],
      [36, 40],
      [40, 44],
    ],
  );
  assert.deepEqual(
    schedule.map((entry) => entry.id),
    STABLE_ANCHORS,
  );
  assert.equal(schedule.at(-1)!.end + DEMO_CLOSING_MINUTES, DEMO_TOTAL_MINUTES);
  assert.deepEqual([0, 1, 22, 44, 45].map(elapsedTime), [
    "00:00",
    "01:00",
    "22:00",
    "44:00",
    "45:00",
  ]);
});

test("each stable card has an objective, actions, observations, controls, a spoken block, and a handoff", () => {
  assert.deepEqual(
    steps.map((entry) => entry.id),
    STABLE_ANCHORS,
  );
  const reserved = new Set([
    "preparation",
    "opening",
    "public",
    "portal",
    "closing",
    "reset",
    "workshop-main",
  ]);
  for (const entry of steps) {
    assert.match(entry.id, /^[a-z]+(?:-[a-z]+)+$/);
    assert(
      !reserved.has(entry.id),
      `${entry.id}: anchor collides with the page structure`,
    );
    assert(
      entry.title.trim() && entry.objective.trim() && entry.transition.trim(),
    );
    for (const block of [
      "actions",
      "expected",
      "controls",
      "talkTrack",
    ] as const) {
      assert(entry[block].length > 0, `${entry.id}: ${block} is required`);
      assert(
        entry[block].every((line) => plainGuideText(line).trim()),
        `${entry.id}: empty ${block}`,
      );
    }
    if (entry.mode !== "explain")
      assert(
        entry.links?.length,
        `${entry.id}: a live demonstration needs a launch link`,
      );
  }
  assert.deepEqual(
    steps.filter((entry) => entry.mode === "explain").map((entry) => entry.id),
    ["public-profound"],
  );
});

test("the first public card includes source evidence, a useful next action, and an unsupported-question fallback", () => {
  const text = prose(step("public-question"));
  for (const required of [
    /Can I bundle my car and home insurance\?/i,
    /More information/i,
    /source link/i,
    /Explore a bundled quote/i,
    /Contact an agent/i,
    /Essential only/i,
  ])
    assert.match(text, required);
  const unsupported = actions("public-question").find((action) =>
    /Contact an agent/i.test(action),
  );
  assert(
    unsupported,
    "The uncertain-answer case needs a concrete agent-assisted fallback",
  );
  assert.match(unsupported, /Enter [^?]+\?/i);
  assert.match(unsupported, /Search/);
  assert.match(
    prose(step("public-question").controls),
    /application.*authored-evidence.*separate.*ML confidence/i,
  );
});

test("discovery readiness identifies native structure while keeping external engine citation claims bounded", () => {
  const text = prose(step("public-discovery"));
  for (const required of [
    /PublicApprovedAnswer/,
    /Quick Info/,
    /Resource metadata/,
    /State applicability/,
    /Product/,
    /Audience/,
    /FAQPage/,
    /acceptedAnswer/,
    /canonical/i,
  ])
    assert.match(text, required);
  assert.match(
    text,
    /excluded from external crawling|crawl policy.*rather than proof/i,
  );
});

test("Search delivery uses the approved-answer source and verifies a fresh change after authoring", () => {
  const indexing = prose(step("public-indexing"));
  for (const required of [
    /OnEnd/,
    /publication service/i,
    /Search Push API/,
    /state/,
    /product/,
    /audience/,
    /Approved answers.*library/i,
  ])
    assert.match(indexing, required);
  assert.match(
    indexing,
    /ordinary Landing page does not.*approved-answer Search document/i,
  );
  const indexedFollowUp = actions("public-api").find((action) =>
    /body.*added sentence/i.test(action),
  );
  assert(
    indexedFollowUp,
    "The fresh authored change must be checked in its indexed body",
  );
  assert.match(indexedFollowUp, /source|Approved Answers/i);
  assert.match(indexedFollowUp, /no manual reindex/i);
  assert.match(
    prose(step("public-api").expected),
    /public article.*Search document.*API consumer.*same approved source change/i,
  );
});

test("public page creation previews before publication and reviews every local datasource with separate roles", () => {
  const id = "public-authoring";
  const create = actionIndex(
    id,
    /Create a page.*Landing page.*coverage-guide-live/i,
  );
  const preview = actionIndex(id, /Click Preview.*remains unpublished/i);
  const submit = actionIndex(
    id,
    /Actions → Submit.*Hero.*Introduction.*Awaiting approval/i,
  );
  const approve = actionIndex(
    id,
    /separate Approver.*coverage-guide-live.*Hero.*Introduction.*Bundle car and home.*Actions → Approve/i,
  );
  const publish = actionIndex(
    id,
    /administrator acting as publisher.*Start publish/i,
  );
  assert(
    create < preview &&
      preview < submit &&
      submit < approve &&
      approve < publish,
  );
  assert.match(
    prose(step(id).actions),
    /Assign.*rather than Duplicate and assign.*Compact/i,
  );
  assert.match(
    prose(step(id).actions),
    /All references.*Include related items/i,
  );
  assert.match(actions(id)[submit], /local item.*Draft/i);
  assert.match(actions(id)[submit], /Actions → Submit/);
  assert.match(
    prose(step(id).expected),
    /reused.*Promotion.*previewed.*without code changes/i,
  );
});

test("Profound is the customer-permitted governed integration explanation, not a claimed running connector", () => {
  const entry = step("public-profound");
  assert.equal(entry.mode, "explain");
  const text = prose(entry);
  assert.match(
    text,
    /Profound output.*Draft.*human review and approval.*publication/i,
  );
  assert.match(text, /live Profound connection is not configured/i);
  assert.match(text, /does not represent a packaged Profound connector/i);
});

test("analytics follows genuine consented interactions and does not promise fabricated or sales evidence", () => {
  const text = prose(step("public-analytics"));
  for (const required of [
    /Events table/i,
    /Site.*liberty-mutual-public-site/,
    /Time.*1 hour/,
    /pageView/,
    /LM_PUBLIC_CTA_CLICK/,
    /LM_PUBLIC_SCROLL_25/,
    /timestamps/i,
    /Privacy choices/,
  ])
    assert.match(text, required);
  assert.match(text, /do not establish a completed quote or policy sale/i);
  assert.match(
    prose(step("public-question").actions),
    /Allow personalization.*Scroll.*Explore bundling/i,
  );
});

test("API reuse demonstrates a separate real consumer and a versioned contract with an actual conditional request", () => {
  const text = prose(step("public-api"));
  for (const required of [
    /One approved answer, two experiences/i,
    /Actual single-answer request/i,
    /schemaVersion/,
    /data\.sourceLink/,
    /Native content version/,
    /Response ETag/,
    /304 Not Modified/,
    /implementation components/i,
  ])
    assert.match(text, required);
  assert.match(text, /Draft and Preview content remain in authoring/i);
  assert(
    linksIn(step("public-api")).some(
      (link) => link.href === "/workshops/content-api",
    ),
  );
});

test("the agent comparison uses two real persona contexts and the prepared suppression baseline without timed mutations", () => {
  const entry = step("portal-relevance");
  const text = prose(entry);
  for (const required of [
    /avery\.01/,
    /Cedar Ridge Insurance/,
    /daniel\.01/,
    /Prairie Oak Insurance/,
    /licensed states/i,
    /role/i,
    /specialization/i,
    /production/i,
    /marketingSuppressed/,
    /explicit false/i,
  ])
    assert.match(text, required);
  assert.match(text, /prepared baseline records/i);
  assert.match(text, /without pausing.*starting another import/i);
  assert.doesNotMatch(
    prose(entry.actions),
    /(?:click|select|choose)\s+(?:Load preference examples|Opt out Cameron|Restore preferences|Recalculate|Pause)\b/i,
  );
  assert.match(
    text,
    /application separately enforces licensed-state eligibility/i,
  );
});

test("the priority edit remains a draft until both audience previews and approval are complete", () => {
  const edit = prose(step("portal-priority-edit").actions);
  assert.match(edit, /Create version/);
  assert.match(edit, /Ordered recommendations/);
  assert.match(edit, /remains Draft.*Leave it unpublished/i);
  assert.doesNotMatch(
    edit,
    /(?:choose|select)\s+Actions → (?:Submit|Approve)|click Start publish/i,
  );
  const id = "portal-preview";
  const principal = actionIndex(id, /Choose agency-growth.*Preview/);
  const producer = actionIndex(id, /Choose producer-priorities.*Preview/);
  const submit = actionIndex(id, /Actions → Submit/);
  const approve = actionIndex(id, /separate Approver.*Actions → Approve/i);
  const publish = actionIndex(
    id,
    /administrator acting as publisher.*Start publish/i,
  );
  assert(
    principal < producer &&
      producer < submit &&
      submit < approve &&
      approve < publish,
  );
  assert.match(
    prose(step(id).controls),
    /not full CDP identity impersonation/i,
  );
  assert.match(
    prose(step(id).expected),
    /without publishing Home manually or deploying frontend code/i,
  );
});

test("the same governed disclosure reaches both sites and reversal preserves history", () => {
  const shared = step("portal-shared-content");
  assert(
    linksIn(shared).some((link) =>
      link.href.includes(`sc_itemid=${DISCLOSURE_ID}`),
    ),
  );
  const destinations = new Set(
    linksIn(shared).map((link) => {
      const url = new URL(link.href, `https://${PORTAL_HOST}`);
      return `${url.hostname}${url.pathname}`;
    }),
  );
  for (const expected of [
    `${PUBLIC_HOST}/`,
    `${PUBLIC_HOST}/bundling`,
    `${PORTAL_HOST}/`,
    `${PORTAL_HOST}/resources`,
  ])
    assert(
      destinations.has(expected),
      `Missing shared-disclosure observation: ${expected}`,
    );
  assert.match(
    prose(shared.actions),
    /record.*original.*Disclosure.*rollback/i,
  );
  const rollback = prose(step("portal-audit-rollback"));
  for (const required of [
    /Workflow history/,
    /Draft → Awaiting approval/,
    /Awaiting approval → Approved/,
    /Comment/,
    /original approved English version/,
    /Create version/,
    /same governed process|newer reviewed version/i,
    /history/,
  ])
    assert.match(rollback, required);
  assert.match(
    rollback,
    /portal-number reset does not restore authored CMS content/i,
  );
});

test("every launch or inline link has a safe destination and the correct site and native item context", () => {
  const nativeSites: Record<string, string> = {
    "6d600332-3e21-4c5f-83ec-aae04f83450f": "liberty-mutual-public-site",
    [ANSWER_ID]: "liberty-mutual-public-site",
    "ae109fc0-b508-5840-97eb-0b2c02ae1a9b": "liberty-mutual-public-site",
    [DISCLOSURE_ID]: "liberty-mutual-public-site",
    "ae9e45ca-f127-4abe-9ca7-2ff109981998": "liberty-mutual-agent-portal",
    "3127968e-4b21-50c3-ad79-b6bbbe5303b8": "liberty-mutual-agent-portal",
  };
  const knownAnchors = new Set([
    ...STABLE_ANCHORS,
    "public",
    "portal",
    "opening",
    "closing",
    "preparation",
    "reset",
  ]);
  for (const link of linksIn(customerDemoChapters)) {
    assert(link.label.trim(), `Unlabeled link ${link.href}`);
    assert(isGuideHref(link.href), `Unsafe guide link ${link.href}`);
    const url = new URL(link.href, `https://${PORTAL_HOST}/workshops/demo`);
    assert.equal(url.protocol, "https:");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
    assert(
      ![...url.searchParams.keys()].some((name) =>
        /secret|token|api.?key|authorization/i.test(name),
      ),
    );
    assert.doesNotMatch(
      url.href,
      /Content(?:%20|\s)+Editor|\/sitecore\/shell/i,
    );
    if (url.hostname === "pages.sitecorecloud.io") {
      assert(["/content", "/editor"].includes(url.pathname));
      assert.equal(url.searchParams.get("organization"), ORG);
      assert.equal(url.searchParams.get("tenantName"), TENANT_NAME);
      assert.equal(url.searchParams.get("sc_lang"), "en");
      assert.equal(
        url.searchParams.get("sc_site"),
        nativeSites[url.searchParams.get("sc_itemid")?.toLowerCase() || ""],
      );
    }
    if (url.hostname === "app.sitecorecloud.io")
      assert.equal(url.searchParams.get("organization"), ORG);
    if (
      url.hostname === PORTAL_HOST &&
      url.pathname.startsWith("/workshops/")
    ) {
      if (url.pathname.startsWith("/workshops/guide/"))
        assert(
          workshopGuides.some(
            (guide) => url.pathname === `/workshops/guide/${guide.slug}`,
          ),
          `Missing supporting guide ${url.pathname}`,
        );
      else
        assert(
          existsSync(join(appRoot, "src/app", url.pathname, "page.tsx")),
          `Missing workshop route ${url.pathname}`,
        );
    }
    if (url.pathname === "/workshops/demo" && url.hash)
      assert(knownAnchors.has(url.hash.slice(1)));
    if (
      url.hostname === PUBLIC_HOST &&
      url.pathname.startsWith("/api/content/v1/answers/")
    )
      assert.equal(url.pathname, `/api/content/v1/answers/${ANSWER_ID}`);
  }
});

test("customer instructions contain no real credentials, legacy editing surface, or another attendee's persona number", () => {
  const text = prose(customerDemoChapters);
  assert.doesNotMatch(text, /Content\s+Editor|\/sitecore\/shell/i);
  assert.doesNotMatch(
    text,
    /[a-z0-9._%+-]+@(?:gmail|sitecore|libertymutual)\.(?:com|net)/i,
  );
  assert.doesNotMatch(
    text,
    /(?:SECRET|TOKEN|API_KEY|AUTHORIZATION)\s*[=:]\s*["']?[a-z\d+/_=-]{16,}/i,
  );
  assert.doesNotMatch(
    text,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----|\beyJ[a-z\d_-]{20,}\.[a-z\d_-]{20,}\./i,
  );
  const usernames: string[] =
    text.match(
      /\b(?:avery|maya|jordan|daniel|priya|marcus|elena)\.\d{2}\b/gi,
    ) ?? [];
  assert(usernames.every((username) => username.endsWith(".01")));
});

test("screenshot guidance has real protected assets and crops or callouts stay inside their source", () => {
  for (const entry of steps) {
    for (const image of entry.images ?? []) {
      assert.match(image.file, /^[a-z0-9][a-z0-9-]{0,79}\.(png|webp)$/);
      assert(image.alt.trim() && image.caption.trim());
      const file = join(appRoot, "workshop-assets", image.file);
      assert(existsSync(file), `${entry.id}: missing screenshot ${image.file}`);
      assert(!existsSync(join(appRoot, "public", image.file)));
      assert(!existsSync(join(appRoot, "public/workshop-assets", image.file)));
      const bytes = readFileSync(file);
      if (image.file.endsWith(".png"))
        assert.equal(
          bytes.subarray(0, 8).toString("hex"),
          "89504e470d0a1a0a",
          `${entry.id}: .png assets must contain PNG bytes`,
        );
      if (image.crop) {
        assert(validImageCrop(image.crop), `${entry.id}: crop exceeds bounds`);
        if (image.file.endsWith(".png")) {
          assert.equal(image.crop.sourceWidth, bytes.readUInt32BE(16));
          assert.equal(image.crop.sourceHeight, bytes.readUInt32BE(20));
        }
      }
      for (const annotation of image.annotations ?? [])
        assert(
          validImageAnnotation(annotation),
          `${entry.id}: invalid image callout`,
        );
    }
  }
});
