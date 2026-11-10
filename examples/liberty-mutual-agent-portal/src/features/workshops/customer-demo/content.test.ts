import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  customerDemoAiContext,
  customerDemoChapters,
  customerDemoOpening,
} from "./content";
import {
  customerDemoSchedule,
  DEMO_CLOSING_MINUTES,
  DEMO_BUFFER_MINUTES,
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
const RESOURCE_PAGE_ID = "ae109fc0-b508-5840-97eb-0b2c02ae1a9b";
const COPYRIGHT_ID = "9dc572ee-3d67-5909-922f-6482def1cdb0";
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

test("both customer journeys explain demonstrated behavior and a bounded AI-assisted next step", () => {
  assert.deepEqual(Object.keys(customerDemoAiContext), ["public", "portal"]);
  for (const chapter of customerDemoChapters) {
    const explanation = customerDemoAiContext[chapter.id];
    assert(explanation.demonstrated.trim());
    assert(explanation.nextStep.trim());
    assert(explanation.talkTrack.trim());
    assert(
      explanation.talkTrack.split(/\s+/).length <= 45,
      `${chapter.id}: keep the AI explanation brief enough for the existing journey`,
    );
  }
  assert.match(customerDemoAiContext.public.nextStep, /proposed Profound/i);
  assert.match(customerDemoAiContext.public.nextStep, /human review/i);
  assert.match(
    customerDemoAiContext.portal.demonstrated,
    /explicit native rules/i,
  );
  assert.match(customerDemoAiContext.portal.nextStep, /could adopt/i);
  assert.match(customerDemoAiContext.portal.nextStep, /human review/i);
  assert.doesNotMatch(
    prose(customerDemoAiContext),
    /automatically publishes|guaranteed citation|unannounced roadmap/i,
  );
});

test("the focused live plan leaves three minutes within the forty-five-minute limit", () => {
  assert.deepEqual(
    customerDemoChapters[0].steps.map((entry) => entry.durationMinutes),
    [2, 1, 3, 7, 2, 1, 2],
  );
  assert.deepEqual(
    customerDemoChapters[1].steps.map((entry) => entry.durationMinutes),
    [5, 1, 2, 4, 4, 4],
  );
  const schedule = customerDemoSchedule(customerDemoChapters);
  assert.equal(DEMO_OPENING_MINUTES, 3);
  assert.equal(DEMO_CLOSING_MINUTES, 1);
  assert.equal(DEMO_BUFFER_MINUTES, 3);
  assert.equal(DEMO_TOTAL_MINUTES, 45);
  assert.deepEqual(
    schedule.map(({ start, end }) => [start, end]),
    [
      [3, 5],
      [5, 6],
      [6, 9],
      [9, 16],
      [16, 18],
      [18, 19],
      [19, 21],
      [21, 26],
      [26, 27],
      [27, 29],
      [29, 33],
      [33, 37],
      [37, 41],
    ],
  );
  assert.deepEqual(
    schedule.map((entry) => entry.id),
    STABLE_ANCHORS,
  );
  const planned = schedule.at(-1)!.end + DEMO_CLOSING_MINUTES;
  assert.equal(planned, 42);
  assert.equal(planned + DEMO_BUFFER_MINUTES, DEMO_TOTAL_MINUTES);
  assert.deepEqual([0, 1, 21, 40, 45].map(elapsedTime), [
    "00:00",
    "01:00",
    "21:00",
    "40:00",
    "45:00",
  ]);
});

test("each stable card has an objective, actions, observations, controls, a spoken block, and a handoff", () => {
  assert.deepEqual(
    steps.map((entry) => entry.id),
    STABLE_ANCHORS,
  );
  assert(
    steps.every((entry) => entry.expected.length === 1),
    "Each card needs one observable outcome",
  );
  assert(
    steps.every(
      (entry) =>
        !/for Q&A|during rehearsal|during.*Q&A/i.test(prose(entry.actions)),
    ),
    "Live actions must not contain optional tours",
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
      entry.title.trim() &&
        entry.objective.trim() &&
        entry.stopWhen.trim() &&
        entry.transition.trim(),
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

test("the public Search loop proves both outcomes on the results page", () => {
  const entry = step("public-question");
  const live = prose(entry.actions);
  assert.match(
    live,
    /enter Can I combine home and car coverage\?.*Can I bundle my car and home insurance\?/i,
  );
  for (const required of [
    /Briefly point out How to bundle your insurance policies and 3 tips for bundling your insurance policies/i,
    /result and its answer excerpt on the results page/i,
    /Keep every result unopened/i,
    /keyword\(s\).*replace the query/i,
    /Contact an agent/i,
    /Searching…/,
  ])
    assert.match(live, required);
  assert.match(
    actions(entry.id).at(-1)!,
    /No results found.*Contact an agent.*End this loop/i,
  );
  assert.match(
    entry.stopWhen,
    /range of relevant published results.*approved answer excerpt.*unsupported question.*No results found.*Contact an agent/i,
  );
  assert.match(prose(entry.expected), /relevant published guidance/i);
  assert.doesNotMatch(
    prose(entry.expected),
    /(?:four|five|4|5) published results/i,
  );
  for (const title of [
    "How to bundle your insurance policies",
    "3 tips for bundling your insurance policies",
    "Can I bundle my car and home insurance?",
  ])
    assert(prose(entry.expected).includes(title));
  assert.equal(entry.durationMinutes, 2);
  assert.doesNotMatch(
    live,
    /then open|Read the answer|Coverage and policy details|More information|source link|return to the article|Explore bundling|Explore a bundled quote|Privacy choices|Essential only|Allow personalization|scroll|Effective|Review date/i,
  );
  assert.equal(entry.actions.length, 3);
  assert(
    entry.links?.every((link) => !link.href.includes("/insurance-resources/")),
  );
  assert.match(
    prose(entry.controls),
    /application.*authored-evidence.*approved source material.*question.*result/i,
  );
  assert.match(prose(entry.controls), /Include in site search.*checkbox/i);
});

test("discovery readiness identifies native structure while keeping external engine citation claims bounded", () => {
  const text = prose(step("public-discovery"));
  for (const required of [
    /PublicResourcePage/,
    /Quick Info/,
    /Checklist/,
    /State applicability/,
    /Products/,
    /Audience/,
    /FAQPage/,
    /acceptedAnswer/,
    /canonical/i,
  ])
    assert.match(text, required);
  assert.equal(step("public-discovery").durationMinutes, 1);
  assert.equal(step("public-discovery").actions.length, 3);
  assert.match(
    prose(step("public-discovery").actions),
    /Open each field’s selection control.*1 item selected.*2 items selected/,
  );
  assert.equal(
    step("public-discovery").images?.[0]?.file,
    "native-public-taxonomy-checklist.png",
  );
  const checklistImage = step("public-discovery").images?.[0];
  assert.equal(checklistImage?.crop, undefined);
  const checklistBytes = readFileSync(
    join(appRoot, "workshop-assets", checklistImage!.file),
  );
  assert.equal(checklistBytes.readUInt32BE(16), 310);
  assert.equal(checklistBytes.readUInt32BE(20), 315);
  assert.match(text, /Home → insurance-resources.*select bundle-car-and-home/i);
  assert.match(text, /Reference source/);
  assert.match(
    prose(step("public-discovery").actions),
    /Expand Resource content.*Detailed explanation.*Under Content.*Canonical URL.*Reference source/,
  );
  assert.doesNotMatch(
    text,
    /Apps → Resource metadata|Content to classify|PublicApprovedAnswer|Data → Approved answers/,
  );
  const page = readFileSync(
    join(appRoot, "src/features/workshops/customer-demo/CustomerDemoGuide.tsx"),
    "utf8",
  );
  const preparation = page.slice(
    page.indexOf('<details id="preparation"'),
    page.indexOf('<section id="opening"'),
  );
  assert.match(preparation, /excluded from external crawling/);
  assert.match(
    preparation,
    /discovery readiness rather than a live external-engine citation/,
  );
});

test("the indexing loop owns both publication and fresh Search-record verification", () => {
  const entry = step("public-indexing");
  const text = prose(entry);
  for (const required of [
    /OnEnd/,
    /publication service/i,
    /Search Push API/,
    /state/,
    /product/,
    /audience/,
    /published website content/i,
  ])
    assert.match(text, required);
  assert.match(
    prose(entry.controls),
    /reads published website content.*Search Push API.*Include in site search.*resource page’s own guidance and applicability metadata/i,
  );
  const publish = actionIndex(
    entry.id,
    /prepared revision.*Approved.*Start publish/i,
  );
  const verify = actionIndex(
    entry.id,
    /job to complete.*body.*added sentence.*No manual reindex/i,
  );
  assert.match(
    prose(entry.actions[verify]),
    /job to complete.*prior wording.*content distribution.*automatic Search update.*refresh again until the added sentence appears.*No manual reindex/i,
  );
  assert(publish < verify);
  assert.match(
    prose(entry.actions[publish]),
    /Wait for the version to finish loading.*read the selected version number again.*matches Prepared page version.*Immediately before choosing Publish.*Approved.*Detailed explanation.*Start publish/i,
  );
  assert.match(
    prose(entry.actions[publish]),
    /Page is already selected.*Current language \(English\).*Clear Include related items first, then clear All references.*control disappears.*Subpages unchecked.*Start publish/,
  );
  const reuseGuide = workshopGuides.find(
    (guide) => guide.slug === "publish-to-two-experiences",
  );
  const existingPagePublications = reuseGuide!.steps
    .flatMap((guideStep) => guideStep.action)
    .filter((action) => action.includes("**All references**"));
  assert(existingPagePublications.length > 0);
  for (const publication of existingPagePublications) {
    assert.match(
      prose(publication),
      /Clear Include related items first, then clear All references/,
    );
  }
  assert.match(entry.stopWhen, /Search document.*newly published sentence/);
  assert.doesNotMatch(
    prose(step("public-api").actions),
    /Search by term|Toggle document details|native Search/i,
  );
  assert.doesNotMatch(
    prose(step("public-analytics").actions),
    /coverage-page|publishing job|new sentence|new coverage page/i,
  );
});

test("indexing preparation requires a clean published baseline and one unpublished revision", () => {
  const page = readFileSync(
    join(appRoot, "src/features/workshops/customer-demo/CustomerDemoGuide.tsx"),
    "utf8",
  );
  const preparation = page.slice(
    page.indexOf('<details id="preparation"'),
    page.indexOf('<section id="opening"'),
  );
  const baseline = preparation.indexOf("Verify the published baseline");
  const revision = preparation.indexOf("from that verified original named");
  assert(baseline >= 0 && revision > baseline);
  const preparationText = plainGuideText(preparation);
  assert.match(
    preparationText,
    /select the preserved original version.*Live baseline version.*wait for its fields to finish loading.*Read the selected version number again.*original wording without the temporary sentence.*Create version/,
  );
  assert.match(
    preparationText,
    /select Create.*Reopen the version selector.*explicitly select the new.*Resource page review.*Draft.*new version number.*wait for its fields to finish loading.*selected version number is newer.*original wording remains intact before editing.*Add.*exactly once/,
  );
  assert.match(
    preparationText,
    /must be absent from the public article.*Search record.*explanation.*P7 GraphQL query/,
  );
  assert.match(
    preparation,
    /sentence is present.*After the demonstration.*restoration checklist.*Continue only after all three/,
  );
  assert.match(
    preparation,
    /exactly once.*Leave it unpublished.*sentence must still be absent/,
  );
  const firstIndexingAction = actions("public-indexing")[0];
  assert.match(
    firstIndexingAction,
    /Review your options with your agent before choosing coverage\. is absent/,
  );
  assert.match(
    firstIndexingAction,
    /already visible.*restore the baseline.*existing sentence does not prove a fresh publication/,
  );
});

test("public authoring uses one presenter account through review and publication", () => {
  const id = "public-authoring";
  const entry = step(id);
  const create = actionIndex(id, /Create a page.*Landing page.*New page name/i);
  assert.deepEqual(
    entry.inputs?.find((input) => input.label === "New page name"),
    {
      action: 1,
      label: "New page name",
      value: "coverage-page",
    },
  );
  const preview = actionIndex(id, /select Preview.*Keep the page unpublished/i);
  const submit = actionIndex(
    id,
    /Actions → Submit.*Awaiting approval.*local Hero and Article text follow the page/i,
  );
  const approve = actionIndex(
    id,
    /coverage-page.*Page Builder.*Actions → Approve/i,
  );
  const publish = actionIndex(
    id,
    /Page Builder.*Start publish.*published coverage page/i,
  );
  assert(
    create < preview &&
      preview < submit &&
      submit < approve &&
      approve < publish,
  );
  assert.match(
    prose(step(id).actions),
    /Assign.*rather than Duplicate and assign.*Image left.*Image right/i,
  );
  assert.match(
    prose(step(id).actions),
    /All references.*Include related items/i,
  );
  assert.match(
    prose(step(id).actions),
    /Reload tree.*Sitemap.*select coverage-page.*matching page heading.*Keep Editor open.*canvas.*Hero.*Heading/i,
  );
  assert.match(
    prose(step(id).actions),
    /Page Builder.*Layers.*headless-public-content-1.*Insert into.*Article text/i,
  );
  const resourceCreation = workshopGuides.find(
    (guide) => guide.slug === "create-resource-and-media",
  );
  assert.match(
    prose(resourceCreation!.steps[0].action),
    /Reload tree.*wait for the refreshed sitemap to finish loading.*Select your new page.*wait until its name appears as the page heading/i,
  );
  assert.match(
    actions(id)[submit],
    /local Hero and Article text follow the page through review/i,
  );
  assert.doesNotMatch(
    actions(id)[submit],
    /each local item|local item.*Draft/i,
  );
  assert.match(
    step(id).stopWhen,
    /coverage-page.*authored headings.*shared Promotion/,
  );
  assert.doesNotMatch(prose(step(id).actions), /Page not found|step 06/);
  assert.doesNotMatch(
    prose(entry.actions),
    /Author Page Builder|Approver Page Builder|Publisher Page Builder|separate.*profile|switch.*account/i,
  );
  assert.match(
    prose(entry.talkTrack),
    /one SitecoreAI administrator account.*production teams normally.*separate roles/i,
  );
});

test("Profound is the customer-permitted governed integration explanation, not a claimed running connector", () => {
  const entry = step("public-profound");
  assert.equal(entry.mode, "explain");
  const text = prose(entry);
  assert.match(
    text,
    /Profound.*authoring.API.*Draft.*human review.*approval.*publication/i,
  );
  assert.match(text, /proposed integration design/i);
  assert.match(text, /existing wording.*proposed wording/);
  assert.match(text, /Show live content.*Scroll to content/);
  assert.match(text, /AEO opportunities.*Powered by Scrunch/);
  assert.match(text, /read-only/);
  assert.match(text, /workflow evidence comes from Liberty Mutual/);
  const page = readFileSync(
    join(appRoot, "src/features/workshops/customer-demo/CustomerDemoGuide.tsx"),
    "utf8",
  );
  const preparation = page.slice(
    page.indexOf('<details id="preparation"'),
    page.indexOf('<section id="opening"'),
  );
  assert.match(
    preparation,
    /Profound.*read-only example.*Do not apply or dismiss.*Profound intake remains a proposed integration design/i,
  );
});

test("analytics uses the monthly report without generating new events", () => {
  const entry = step("public-analytics");
  const text = prose(entry);
  for (const required of [
    /Events Table/i,
    /Site.*liberty-mutual-public-site/,
    /Time.*1 month/,
    /Event Type.*pageView.*LM_PUBLIC_CTA_CLICK.*checked/i,
    /pageView/,
    /LM_PUBLIC_CTA_CLICK/,
    /custom event.*next-step button or link/i,
  ])
    assert.match(text, required);
  assert.doesNotMatch(
    text,
    /LM_PUBLIC_SCROLL|reading depth|1 hour|prepared journey|generate events/i,
  );
  assert.doesNotMatch(
    prose(entry.talkTrack),
    /completed quote|policy sale|conversion lift/i,
  );
  assert.doesNotMatch(
    prose(entry.actions),
    /Start publish|Create a page|Explore bundling|Load content/,
  );
  const page = readFileSync(
    join(appRoot, "src/features/workshops/customer-demo/CustomerDemoGuide.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    page,
    /Prepare genuine public-site analytics before presenting/,
  );
  assert.match(page, /step\.presenterResult/);
});

test("API reuse uses native Live GraphQL with a copyable query for the same published page", () => {
  const entry = step("public-api");
  const text = prose(entry);
  assert.equal(entry.durationMinutes, 2);
  assert.equal(entry.presenterActions.length, 4);
  assert.equal(entry.actions.length, 4);
  for (const required of [
    /GraphQL Explorer/,
    /Live Experience Edge/,
    /HTTP HEADERS/,
    /Delivery API token/,
    /sc_apikey/,
    /Draft and Preview content remain in authoring/i,
    /same published fields/i,
  ])
    assert.match(text, required);
  const query = entry.inputs?.find((input) => input.label === "GraphQL query");
  assert(query);
  assert.equal(query.action, 2);
  assert.equal(
    query.value,
    `query PublishedCoverageGuidance {
  item(path: "{AE109FC0-B508-5840-97EB-0B2C02AE1A9B}", language: "en") {
    id
    name
    version
    question: field(name: "question") { value }
    answer: field(name: "answer") { value }
    explanation: field(name: "explanation") { value }
    source: field(name: "sourceLink") { jsonValue }
  }
}`,
  );
  assert.doesNotMatch(query.value, /sc_apikey|token|secret/i);
  const headers = entry.inputs?.find((input) => input.label === "HTTP headers");
  assert(headers);
  assert.equal(headers.action, 2);
  assert.deepEqual(JSON.parse(headers.value), {
    sc_apikey: "<Delivery API token>",
  });
  assert.doesNotMatch(headers.value, /x-gql-token/i);
  assert.match(
    entry.stopWhen,
    /native GraphQL response.*page ID.*published version.*sentence published in P3/i,
  );
  assert.match(
    prose(entry.actions[1]),
    /HTTP HEADERS.*Live Delivery API token.*not Preview.*Copy GraphQL query.*left Query editor.*Run/,
  );
  assert.match(
    prose(entry.actions[2]),
    /id.*version.*question.*answer.*explanation.*source.*Review your options with your agent before choosing coverage.*public article/i,
  );
  assert(
    linksIn(entry).some(
      (link) => link.href === "https://edge.sitecorecloud.io/api/graphql/ide",
    ),
  );
  assert(
    linksIn(entry).every(
      (link) => !/sc_apikey|token|secret|[?&]api/i.test(link.href),
    ),
  );
  assert.doesNotMatch(
    text,
    /workshops\/content-api|One published page, two experiences|API contract version|Load content|customer-demo-content-api\.png|implementation components/,
  );
  assert.match(
    prose(entry.actions[0]),
    /Show Experience Edge content delivery.*SitecoreAI authoring → Publish → Experience Edge → API consumers/,
  );
  assert.match(
    entry.talkTrack[0],
    /Content teams manage and approve content.*Publishing sends.*Experience Edge.*globally distributed.*APIs.*publishing content independently of application deployments/,
  );
  assert.match(entry.transition, /Next.*independent agents/);
  const page = readFileSync(
    join(appRoot, "src/features/workshops/customer-demo/CustomerDemoGuide.tsx"),
    "utf8",
  );
  assert.match(page, /Experience Edge content delivery.*ready for P7/);
});

test("the relevance loop uses native profile and priority tests without presenter helper pages", () => {
  const entry = step("portal-relevance");
  const text = prose(entry);
  assert.equal(entry.durationMinutes, 5);
  assert.equal(entry.actions.length, 5);
  assert.equal(entry.presenterActions.length, entry.actions.length);
  for (const required of [
    /avery\.01/,
    /Cedar Ridge Insurance/,
    /daniel\.01/,
    /Prairie Oak Insurance/,
    /Licensed states/i,
    /specialization/i,
    /production/i,
  ])
    assert.match(text, required);
  assert.match(
    prose(entry.actions[2]),
    /Page Builder.*Layers → Agency priorities.*Edit personalization rules → Liberty Mutual - Agency product priorities.*Leave the rule Builder open/i,
  );
  const profileRules = prose(entry.actions[3]);
  assert.match(
    profileRules,
    /Optimization → Profiles.*Avery Brooks - 01.*Toggle menu → Inspect → JSON view.*first UUID in clientIds.*without quotation marks.*close Inspect profile/i,
  );
  assert.match(
    profileRules,
    /Return to Page Builder.*Select profile → Load profile → Client ID.*Avery.*Client ID.*Enter.*Testing as: Avery Brooks - 01.*Test.*green agency-growth/i,
  );
  assert.match(
    profileRules,
    /Daniel.*Testing as: Daniel Ortiz - 01.*Test.*green producer-priorities.*Cancel.*read-only tests/i,
  );
  const stateRule = prose(entry.actions[4]);
  assert.match(
    stateRule,
    /Optimization → Custom values.*Liberty Mutual - Agency product priorities.*published rule without editing/i,
  );
  assert.match(
    stateRule,
    /agency-growth.*principal.*licensedInTexas === true.*small-commercial share below 20%/,
  );
  assert.match(
    stateRule,
    /producer-priorities.*producer.*licensedInIllinois === true.*small-commercial specialization.*positive agent small-commercial production/,
  );
  assert.match(stateRule, /Leave the published rule unchanged/);
  assert.match(
    entry.stopWhen,
    /Avery and Daniel.*native priority rule.*own Client ID/,
  );
  assert.match(entry.stopWhen, /published Texas and Illinois conditions/);
  assert.equal(entry.inputs, undefined);
  for (const link of linksIn(entry))
    assert.doesNotMatch(link.href, /\/(?:workshops?|demo)(?:[/?#]|$)/);
  assert(
    linksIn(entry).some((link) =>
      link.href.includes("/optimization/profiles?"),
    ),
  );
  assert(
    linksIn(entry).some((link) =>
      link.href.includes(
        "/optimization/custom-values/ad7b493b-f768-404c-adc6-9841c2fe1a6e?",
      ),
    ),
  );
  assert.doesNotMatch(
    text,
    /Communication preferences|Cameron|marketingSuppressed|marketingEligible|marketing eligibility|Preview API|Opt out Cameron|Run eligibility check|Check import status|Native decision receipts|No eligible recipients|customer-demo-outreach-suppressed/i,
  );
  assert.match(
    prose(entry.controls),
    /read-only tests.*do not publish or change a rule/i,
  );
  assert.match(
    text,
    /application separately enforces licensed-state eligibility/i,
  );
  assert.match(prose(entry.controls), /Unmatched profiles receive neutral/);
});

test("the design loop connects the Brand Kit to field-level AI and governed composition", () => {
  const entry = step("portal-design");
  const actions = entry.actions.map((action) => prose([action]));
  assert.match(
    actions[0],
    /Design → Brand kits.*Published.*Liberty Mutual — Independent Agents.*Sections → Tone of Voice/,
  );
  assert.match(
    actions[1],
    /Page Builder.*Site switcher → Agent Portal → Editor → Pages → Home.*Layers → Agency priorities → Introduction.*Priorities for your agency.*Introduction in the right panel.*Optimize with AI.*Adhere to brand kit.*AI writing prompt.*Ask AI for content improvements.*Generate content.*Ready!.*Revert to original.*original wording returns/,
  );
  assert.match(actions[1], /Keep optimized.*A\/B\/n test.*Publish.*untouched/);
  assert.match(
    actions[2],
    /Layers.*headless-agency-priorities.*Insert into.*before or after Agency priorities.*filtered Components picker.*Business priorities → Agency priorities.*Close the picker without selecting a component or inserting content/i,
  );
  assert.match(actions[3], /Avery portal.*My workspace.*Learning & resources/);
  assert(entry.links?.some((link) => link.href.includes("/design/brandkits?")));
  assert.match(prose(entry.talkTrack), /sample Liberty Mutual Brand Kit/);
  assert.match(
    prose(entry.talkTrack),
    /Content and design remain separate.*authors manage words and images.*content templates define the fields.*reusable components.*page designs.*Placeholder settings/i,
  );
  assert(
    entry.inputs?.some(
      (input) => input.action === 2 && input.label === "AI writing prompt",
    ),
  );
  assert.equal(
    entry.images?.find((image) => image.file === "demo-brand-kit-voice.png")
      ?.afterAction,
    1,
  );
  assert.equal(
    entry.images?.find((image) => image.file === "demo-ai-field-copilot.png")
      ?.afterAction,
    2,
  );
  assert.doesNotMatch(
    prose(entry.actions),
    /Content → Optimize content|Original and Optimized|X → Cancel|Create A\/B test/,
  );
  assert.equal(entry.durationMinutes, 1);
});

test("the same Home draft is previewed with audience attributes before approval and publication", () => {
  const editEntry = step("portal-priority-edit");
  const edit = prose(editEntry.actions);
  assert.match(editEntry.objective, /Part 1 of the priority-change loop/);
  assert.match(step("portal-preview").objective, /Part 2 of the priority-change loop/);
  assert.match(editEntry.stopWhen, /Checkpoint.*live experience is unchanged.*Continue/);
  assert.match(
    edit,
    /explicitly select Priority baseline version recorded in P0.*wait for its fields to finish loading.*original version number.*Small business growth → Texas workers compensation → Home and auto conversations.*Choose Create version/,
  );
  assert.match(edit, /Ordered recommendations/);
  assert.match(edit, /remains Draft.*Leave it unpublished/i);
  assert.doesNotMatch(edit, /(?:choose|select)\s+Actions → (?:Submit|Approve)|click Start publish/i);
  const id = "portal-preview";
  const entry = step(id);
  const open = actionIndex(
    id,
    /Page Builder.*Site switcher → Agent Portal → Editor → Pages → Home.*Apps → Audience Preview.*Current page → Home/i,
  );
  const principal = actionIndex(
    id,
    /Role → Principal.*Licensed states.*only Texas.*Business context.*Agency small-commercial share → 15.*Agency written premium → 1000000.*Preview audience.*Open preview.*Home.*Texas → Build a stronger small-business practice → Connect home and auto conversations/,
  );
  const producer = actionIndex(
    id,
    /Role → Producer.*Licensed states.*only Illinois.*Specializes in small commercial.*Agent small-commercial written premium → 100000.*Preview audience.*Open preview.*Home.*Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice/,
  );
  const submit = actionIndex(id, /Saved priority version.*Actions → Submit/);
  const approve = actionIndex(id, /same Saved priority version.*Actions → Approve/i);
  const publish = actionIndex(id, /same Saved priority version.*Approved.*Start publish/i);
  assert(open < principal && principal < producer && producer < submit && submit < approve && approve < publish);
  assert.match(
    prose(entry.actions[principal]),
    /Close the preview tab.*same Audience Preview panel in Page Builder/i,
  );
  assert.match(
    prose(entry.actions[producer]),
    /Neither preview requires an agent login or a human profile identifier/,
  );
  assert.match(
    prose(entry.controls),
    /private Marketplace extension.*existing published SitecoreAI personalization rules.*current authoring content for Home/,
  );
  assert.match(prose(entry.controls), /isolated synthetic audience records.*without changing human agent accounts/);
  assert.match(
    prose(entry.expected),
    /same Home page.*without publishing Home manually or deploying frontend code/i,
  );
  assert.doesNotMatch(
    prose([editEntry, entry]),
    /Agent audience preview|Home → growth|prepared growth page|Avery agency principal|Daniel producer|authored Hero and Callout|native page-level audience previews/,
  );
  assert(linksIn(entry).some((link) => link.href.includes("sc_itemid=ae9e45ca-f127-4abe-9ca7-2ff109981998")));
  assert.equal(editEntry.durationMinutes, 2);
  assert.equal(entry.durationMinutes, 4);
  const page = readFileSync(
    join(appRoot, "src/features/workshops/customer-demo/CustomerDemoGuide.tsx"),
    "utf8",
  );
  assert.match(page, /Editor → Pages → Home.*Apps → Audience Preview.*Current page → Home/);
  assert.match(page, /same presenter account.*Role → Principal.*Texas.*Agency small-commercial share → 15.*Agency written premium → 1000000.*Role → Producer.*Illinois.*Agent small-commercial written premium → 100000/);
  assert.match(page, /attempts to connect the existing SitecoreAI session automatically.*Connect to SitecoreAI.*same presenter account.*connection window closes after authentication.*verifies the session automatically/);
  assert.doesNotMatch(page, /complete \*\*Sign in\*\* with the same presenter account|return to the app, and select \*\*Continue\*\*/);
  assert.doesNotMatch(page, /Agent audience preview|Avery agency principal|Daniel producer|growth page|cfe0e86f-dd93-4b8e-84cd-a2a46e8c1947/);
  for (const source of [page, prose(step("portal-relevance")), prose(entry)]) {
    assert.match(
      source,
      /Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice/,
    );
    assert.doesNotMatch(
      source,
      /Connect home and auto conversations → Build a stronger small-business practice/,
      "The real producer experience has three cards; the neutral fallback has two",
    );
  }
});

test("workflow review and publication use the version number shown after saving", () => {
  const priority = prose(step("portal-priority-edit").actions);
  assert.match(
    priority,
    /wait for Saved.*Record the version number currently shown as Saved priority version.*same saved version number.*With Saved priority version selected.*Texas workers compensation → Small business growth → Home and auto conversations.*remains Draft/i,
  );
  for (const id of [
    "portal-preview",
    "portal-shared-content",
    "portal-audit-rollback",
  ]) {
    const text = prose(step(id).actions);
    const label =
      id === "portal-preview"
        ? "Saved priority version"
        : id === "portal-shared-content"
          ? "Saved copyright version"
          : "Restored copyright version";
    assert.match(text, new RegExp(`${label}.*Draft.*Actions → Submit`, "i"));
    assert.match(
      text,
      new RegExp(`same ${label}.*Page Builder.*Actions → Approve`, "i"),
    );
    assert.match(
      text,
      new RegExp(
        `same ${label}.*Page Builder.*Approved.*Start publish|same ${label}.*Page Builder.*Approved.*publish`,
        "i",
      ),
    );
  }
  assert.match(
    prose(step("portal-shared-content").actions),
    /wait for Saved.*Record the version number currently shown as Saved copyright version/i,
  );
  assert.match(
    prose(step("portal-audit-rollback").actions),
    /original wording is saved.*record the version number currently shown as Restored copyright version/i,
  );
});

test("each named content Draft is explicitly selected before its fields change", () => {
  for (const [id, name, field] of [
    [
      "portal-priority-edit",
      "Texas guidance priority",
      "Ordered recommendations",
    ],
    ["portal-shared-content", "Copyright year update", "Disclosure"],
    ["portal-audit-rollback", "Copyright year restored", "Disclosure"],
  ]) {
    const text = actions(id).find(
      (action) =>
        action.includes(`name it ${name}`) ||
        action.includes(`Name it ${name}`),
    );
    assert(text, `${id}: missing named Draft creation`);
    const selected = text.indexOf(
      `explicitly select the new ${name} Draft row by its new version number`,
    );
    const loaded = text.indexOf(
      "wait for its fields to finish loading",
      selected,
    );
    const confirmed = text.indexOf(
      "Confirm the selected version number",
      loaded,
    );
    assert(
      selected >= 0 && loaded > selected && confirmed > loaded,
      `${id}: select and load the new numbered Draft before confirming its fields`,
    );
    assert(text.slice(confirmed).includes(field));
  }
  assert.match(
    prose(step("portal-audit-rollback").actions),
    /Select the original approved English version.*wait for its fields to finish loading.*Confirm the selected version number and original Disclosure wording with copyright year 2025 before choosing Create version/,
  );
});

test("one full copyright notice updates both footers and restores only its year", () => {
  const shared = step("portal-shared-content");
  assert(
    linksIn(shared).some((link) =>
      link.href.includes(`sc_itemid=${COPYRIGHT_ID}`),
    ),
  );
  const destinations = new Set(
    linksIn(shared).map((link) => {
      const url = new URL(link.href, `https://${PORTAL_HOST}`);
      return `${url.hostname}${url.pathname}`;
    }),
  );
  for (const expected of [`${PUBLIC_HOST}/`, `${PORTAL_HOST}/`])
    assert(destinations.has(expected));
  assert.match(
    prose(shared.actions),
    /Record.*original.*full Disclosure.*rollback.*copyright year is 2025/i,
  );
  assert.match(
    prose(shared.actions),
    /Replace only 2025 with 2026.*preserving every other word and punctuation mark in the full copyright notice.*line break.*Equal Opportunity Employer.*link/i,
  );
  assert.match(
    prose(shared.actions),
    /Publish the shared item once.*both footers show the same full copyright notice with 2026/i,
  );
  assert.match(
    prose(shared.expected),
    /© 2026 Liberty Mutual Insurance, 175 Berkeley Street, Boston, MA 02116.*Liberty Mutual is an Equal Opportunity Employer and an Equal Housing Insurer\./,
  );
  assert(
    !linksIn(shared).some((link) =>
      link.href.includes("sc_itemid=c4fd68f7-7c79-5bb6-9919-fb6f82b84bca"),
    ),
    "The copyright exercise must not repurpose the product-availability legal notice",
  );
  for (const entry of [shared, step("portal-audit-rollback")]) {
    assert.equal(entry.durationMinutes, 4);
    assert.doesNotMatch(
      prose(entry),
      /Coverage and availability|added sentence|temporary sentence|append|Content owner|Public website content team|Content Editor/i,
    );
    assert((entry.images ?? []).every((image) =>
      !/shared-disclosure|workflow-history/.test(image.file),
    ));
  }
  assert.doesNotMatch(
    prose(shared),
    /public Bundling|Learning & resources|four configured|additional links|other two placements|Q&A/,
  );
  const rollback = prose(step("portal-audit-rollback"));
  for (const required of [
    /Compare versions/,
    /version selector/,
    /comparison updates automatically/,
    /year changing from 2025 to 2026/,
    /original approved English version/,
    /Create version/,
    /same governed process|newer reviewed version/i,
    /history/,
  ])
    assert.match(rollback, required);
  assert.doesNotMatch(
    prose(step("portal-audit-rollback").actions),
    /Agency growth priorities|Bundle car and home|coverage-page|public Bundling|Learning & resources/,
  );
  assert.doesNotMatch(
    rollback,
    /Workflow history|acting account|timestamps|read the user|who submitted|Page items/,
  );
  assert.match(
    rollback,
    /Compare.*recorded original version.*With.*Saved copyright version.*Content → Disclosure/,
  );
  assert.match(
    step("portal-audit-rollback").stopWhen,
    /Both site footers.*full copyright notice.*restored year 2025.*history/,
  );
  assert.match(
    prose(step("portal-audit-rollback").actions),
    /preserved full copyright notice with 2025, without changing any other wording or punctuation/i,
  );
  assert.match(
    prose(step("portal-audit-rollback").actions),
    /both footers show the full copyright notice with 2025 again/i,
  );
  const page = readFileSync(
    join(appRoot, "src/features/workshops/customer-demo/CustomerDemoGuide.tsx"),
    "utf8",
  );
  assert.match(page, /both site footers display the same full copyright notice with \*\*2025\*\*/);
  assert.match(page, /scroll to both footers.*full copyright notice with \*\*2025\*\*/);
  assert.doesNotMatch(page, /shared-disclosure|Product availability notice|both public placements/);
});

test("the presenter guide displays concise clicks and result checks, with preparation kept separate", () => {
  const spoken = prose(
    steps.flatMap((entry) => [...entry.talkTrack, entry.transition]),
  );
  assert.doesNotMatch(
    spoken,
    /outcome is complete|complete search outcome|rehearsal receipt|still pending|not configured|not verified/i,
  );
  const page = readFileSync(
    join(appRoot, "src/features/workshops/customer-demo/CustomerDemoGuide.tsx"),
    "utf8",
  );
  assert.match(page, /<h3>\{step\.title\}<\/h3>/);
  assert.match(page, /step\.presenterActions\.map/);
  assert.match(page, /Result check:/);
  assert.match(page, /className=\{styles\.screenshot\}/);
  assert.doesNotMatch(
    page,
    /How it works|Talk track|Who is acting:|Business task:|Customer request:|step\.talkTrack|step\.controls/,
  );
  for (const entry of steps) {
    assert.equal(entry.presenterActions.length, entry.actions.length);
    assert(entry.presenterActions.every((lines) => lines.length > 0));
    assert(entry.presenterResult.trim());
    for (const input of entry.inputs ?? [])
      assert(entry.presenterActions[input.action - 1]?.length);
  }
  assert.equal(customerDemoOpening.presenter, "Angela Gustafson");
  assert.match(prose(customerDemoOpening.talkTrack), /Microsoft Copilot/);
  assert.match(
    prose(customerDemoOpening.talkTrack),
    /two requested journeys in order/,
  );
  const preparation = page.slice(
    page.indexOf('<details id="preparation"'),
    page.indexOf('<section id="opening"'),
  );
  assert.match(
    preparation,
    /current publication before marking its loop complete/,
  );
  assert.match(
    preparation,
    /Allow publication, Search updates, and delivery to complete/,
  );
});

test("every launch or inline link has a safe destination and the correct site and native item context", () => {
  const nativeSites: Record<string, string> = {
    "6d600332-3e21-4c5f-83ec-aae04f83450f": "liberty-mutual-public-site",
    [RESOURCE_PAGE_ID]: "liberty-mutual-public-site",
    [COPYRIGHT_ID]: "liberty-mutual-public-site",
    "ae9e45ca-f127-4abe-9ca7-2ff109981998": "liberty-mutual-agent-portal",
    "3127968e-4b21-50c3-ad79-b6bbbe5303b8": "liberty-mutual-agent-portal",
    "69fc0a48-3e75-426e-9b2b-296d7a3bf8a4": "prospera",
    "cfe0e86f-dd93-4b8e-84cd-a2a46e8c1947": "liberty-mutual-agent-portal",
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
      const recommendationExample =
        url.searchParams.get("sc_site") === "prospera";
      assert.equal(
        url.searchParams.get("organization"),
        recommendationExample ? "org_vDtrEzJHxeuuB9cD" : ORG,
      );
      assert.equal(
        url.searchParams.get("tenantName"),
        recommendationExample
          ? "sitecoresaa7acd-agverticals97fd-agvertsc3b5"
          : TENANT_NAME,
      );
      assert.equal(url.searchParams.get("sc_lang"), "en");
      assert.equal(
        url.searchParams.get("sc_site"),
        nativeSites[url.searchParams.get("sc_itemid")?.toLowerCase() || ""],
      );
    }
    if (url.hostname === "app.sitecorecloud.io") {
      const recommendationExample = url.pathname.startsWith(
        "/channels/collection/45177ac3175042dc9bc748d76ba0858a/sites/d4c417d9-0acf-44f9-aec8-c94730b872bb/aeo-opportunities/",
      );
      assert.equal(
        url.searchParams.get("organization"),
        recommendationExample ? "org_vDtrEzJHxeuuB9cD" : ORG,
      );
      if (recommendationExample)
        assert.equal(
          url.searchParams.get("tenantName"),
          "sitecoresaa7acd-agverticals97fd-agvertsc3b5",
        );
    }
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
      assert.equal(url.pathname, `/api/content/v1/answers/${RESOURCE_PAGE_ID}`);
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
      if (image.afterAction !== undefined) {
        assert(Number.isInteger(image.afterAction));
        assert(
          image.afterAction >= 1 && image.afterAction <= entry.actions.length,
        );
      }
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
