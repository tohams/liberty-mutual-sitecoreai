import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { customerDemoAiContext, customerDemoChapters } from "./content";
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
    [2, 1, 4, 8, 1, 1, 2],
  );
  assert.deepEqual(
    customerDemoChapters[1].steps.map((entry) => entry.durationMinutes),
    [5, 2, 2, 4, 4, 4],
  );
  const schedule = customerDemoSchedule(customerDemoChapters);
  assert.equal(DEMO_OPENING_MINUTES, 1);
  assert.equal(DEMO_CLOSING_MINUTES, 1);
  assert.equal(DEMO_BUFFER_MINUTES, 3);
  assert.equal(DEMO_TOTAL_MINUTES, 45);
  assert.deepEqual(
    schedule.map(({ start, end }) => [start, end]),
    [
      [1, 3],
      [3, 4],
      [4, 8],
      [8, 16],
      [16, 17],
      [17, 18],
      [18, 20],
      [20, 25],
      [25, 27],
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
    /Briefly point out the bundling overview and two practical articles/i,
    /result and its answer excerpt on the results page/i,
    /Keep every result unopened/i,
    /keyword\(s\).*replace the query/i,
    /Contact an agent/i,
    /Essential only/i,
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
  assert.match(prose(entry.expected), /five published results/i);
  for (const title of [
    "Bundle home and auto insurance",
    "How to bundle your insurance policies",
    "3 tips for bundling your insurance policies",
    "Can I bundle my car and home insurance?",
  ])
    assert(prose(entry.expected).includes(title));
  assert.equal(entry.durationMinutes, 2);
  assert.doesNotMatch(
    live,
    /then open|Read the answer|Coverage and policy details|More information|source link|return to the article|Explore bundling|Explore a bundled quote|Allow personalization|scroll|Effective|Review date/i,
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
    /PublicApprovedAnswer/,
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
  assert.doesNotMatch(text, /Apps → Resource metadata|Content to classify/);
  const page = readFileSync(
    join(appRoot, "src/app/workshops/demo/page.tsx"),
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
    /Approved answers.*library/i,
  ])
    assert.match(text, required);
  assert.match(
    prose(entry.controls),
    /This mapping indexes the Approved answers library.*wording and applicability metadata/i,
  );
  const publish = actionIndex(
    entry.id,
    /prepared revision.*Approved.*Start publish/i,
  );
  const verify = actionIndex(
    entry.id,
    /job to complete.*body.*added sentence.*No manual reindex/i,
  );
  assert(publish < verify);
  assert.match(
    prose(entry.actions[publish]),
    /Wait for the version to finish loading.*read the selected version number again.*matches Prepared answer version.*Immediately before choosing Publish.*Approved.*Detailed explanation.*Start publish/i,
  );
  assert.match(entry.stopWhen, /Search document.*newly published sentence/);
  assert.doesNotMatch(
    prose(step("public-api").actions),
    /Search by term|Toggle document details|native Search/i,
  );
  assert.doesNotMatch(
    prose(step("public-analytics").actions),
    /coverage-guide-live|publishing job|new sentence|new coverage page/i,
  );
});

test("indexing preparation requires a clean published baseline and one unpublished revision", () => {
  const page = readFileSync(
    join(appRoot, "src/app/workshops/demo/page.tsx"),
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
    /select Create.*Reopen the version selector.*explicitly select the new.*Shared answer review.*Draft.*new version number.*wait for its fields to finish loading.*selected version number is newer.*original wording remains intact before editing.*Add.*exactly once/,
  );
  assert.match(
    preparation,
    /must be absent from the public article.*Search record.*published-answer API experience/,
  );
  assert.match(
    preparation,
    /sentence is already present.*Bundle car and home.*After the demonstration.*restoration checklist.*Continue only after all three/,
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

test("public authoring ends with the new page published through separate roles", () => {
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
    /separate Approver.*coverage-guide-live.*Hero.*Introduction.*Actions → Approve/i,
  );
  const publish = actionIndex(
    id,
    /administrator acting as publisher.*Start publish.*published coverage page/i,
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
  assert.match(
    step(id).stopWhen,
    /coverage-guide-live.*authored headings.*shared Promotion/,
  );
  assert.doesNotMatch(prose(step(id).actions), /Page not found|step 06/);
});

test("Profound is the customer-permitted governed integration explanation, not a claimed running connector", () => {
  const entry = step("public-profound");
  assert.equal(entry.mode, "explain");
  const text = prose(entry);
  assert.match(
    text,
    /Profound output.*Draft.*human review and approval.*publication/i,
  );
  assert.match(text, /proposed integration design/i);
  const page = readFileSync(
    join(appRoot, "src/app/workshops/demo/page.tsx"),
    "utf8",
  );
  const preparation = page.slice(
    page.indexOf('<details id="preparation"'),
    page.indexOf('<section id="opening"'),
  );
  assert.match(
    preparation,
    /Profound.*proposed integration design.*rather than a configured live connection or packaged connector/i,
  );
});

test("analytics is a report-only loop using genuine consented preparation", () => {
  const entry = step("public-analytics");
  const text = prose(entry);
  for (const required of [
    /Events Table/i,
    /Site.*liberty-mutual-public-site/,
    /Time.*1 hour/,
    /pageView/,
    /LM_PUBLIC_CTA_CLICK/,
    /LM_PUBLIC_SCROLL_25/,
    /timestamps/i,
    /Privacy choices/,
  ])
    assert.match(text, required);
  assert.match(
    text,
    /visits, reading depth, and selected actions.*improve the content/i,
  );
  assert.doesNotMatch(
    prose(entry.talkTrack),
    /completed quote|policy sale|conversion lift/i,
  );
  assert.match(text, /prepar.*consented|consented.*prepar/i);
  assert.doesNotMatch(
    prose(entry.actions),
    /Start publish|Create a page|Explore bundling|Load answer/,
  );
  const page = readFileSync(
    join(appRoot, "src/app/workshops/demo/page.tsx"),
    "utf8",
  );
  assert.match(
    page,
    /Prepare genuine public-site analytics before presenting.*Allow personalization/,
  );
  assert.match(page, /step\.stopWhen/);
});

test("API reuse stops after the second experience loads the same published answer", () => {
  const entry = step("public-api");
  const text = prose(entry);
  for (const required of [
    /One approved answer, two experiences/i,
    /Load answer/,
    /Native content version/,
    /Stable item ID/,
    /API contract version/,
    /implementation components/i,
    /Live Experience Edge/,
  ])
    assert.match(text, required);
  assert.match(text, /Draft and Preview content remain in authoring/i);
  assert.match(
    entry.stopWhen,
    /second experience.*newly published sentence.*stable item ID/i,
  );
  assert.doesNotMatch(
    prose(entry.actions),
    /ETag|304 Not Modified|Actual single-answer request|Search by term|Toggle document details/,
  );
  assert(linksIn(entry).some((link) => link.href === "/workshops/content-api"));
});

test("the relevance loop proves profile relevance and same-profile native marketing suppression", () => {
  const entry = step("portal-relevance");
  const text = prose(entry);
  for (const required of [
    /avery\.01/,
    /Cedar Ridge Insurance/,
    /daniel\.01/,
    /Prairie Oak Insurance/,
    /Licensed states/i,
    /role/i,
    /specialization/i,
    /production/i,
    /marketingSuppressed/,
    /explicit false/i,
  ])
    assert.match(text, required);
  assert.match(text, /Select profile → Load profile.*Client ID.*Profile ID/i);
  assert.match(
    text,
    /Testing as: Avery Brooks - 01.*agency-growth.*green|Testing as: Avery Brooks - 01.*green.*agency-growth/i,
  );
  assert.match(
    text,
    /Testing as: Daniel Ortiz - 01.*producer-priorities.*green|Testing as: Daniel Ortiz - 01.*green.*producer-priorities/i,
  );
  assert.match(text, /Refresh status.*current IDs after a reset/i);
  assert.match(text, /Cancel.*read-only tests/i);
  assert(
    linksIn(entry).some(
      (link) => link.href === "/workshops/reset#current-profiles",
    ),
  );
  for (const action of actions(entry.id).filter((line) =>
    /Native profile ID/.test(line),
  ))
    assert.doesNotMatch(
      action,
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
    );
  const baseline = actionIndex(
    entry.id,
    /Run eligibility check.*1 eligible recipient.*Cameron Ellis - Allowed/i,
  );
  const optout = actionIndex(
    entry.id,
    /Native profile ID.*Opt out Cameron.*while SitecoreAI processes/i,
  );
  const result = actionIndex(
    entry.id,
    /Check import status.*Native profile ID.*unchanged.*Run eligibility check.*No eligible recipients.*no email preview/i,
  );
  assert.equal(
    baseline,
    0,
    "Start from the prepared native recipient baseline",
  );
  assert.equal(optout, 0, "Start the import before the profile comparisons");
  const avery = actionIndex(entry.id, /avery\.01.*Avery Brooks/i);
  const daniel = actionIndex(entry.id, /daniel\.01.*Daniel Ortiz/i);
  const profiles = actionIndex(entry.id, /Testing as: Avery Brooks - 01/i);
  const policy = actionIndex(entry.id, /API response.*Open variant editor/i);
  assert(optout < avery && avery < daniel && daniel < profiles);
  assert(profiles < policy && policy < result);
  assert.match(
    prose(entry.controls),
    /Liberty Mutual marketing eligibility.*native runtime personalization/i,
  );
  assert.match(entry.stopWhen, /included to excluded/i);
  assert.doesNotMatch(entry.stopWhen, /back to included/i);
  assert.match(entry.stopWhen, /same Native profile ID/i);
  assert(linksIn(entry).some((link) => link.href === "/workshops/preferences"));
  assert(
    linksIn(entry).some(
      (link) =>
        link.href.includes(
          "/optimization/personalization/af90f4c1-20ab-4ae3-871d-97e91f22431b",
        ) && link.href.includes("section=configuration"),
    ),
    "Show the native enabling rule alongside the recorded choice and recipient outcome",
  );
  assert.match(
    prose(entry.actions),
    /API response.*Open variant editor.*marketingSuppressed === false.*Close editor/i,
  );
  assert.match(
    prose(entry.actions),
    /Native decision receipts.*marketingEligible = false.*Same profile as this session’s first check/i,
  );
  assert.doesNotMatch(
    prose(entry.actions),
    /Products & appetite|Load preference examples|Restore preferences|Audience size|Recalculate|Pause.*Audience|6 hours/,
  );
  const page = readFileSync(
    join(appRoot, "src/app/workshops/demo/page.tsx"),
    "utf8",
  );
  assert.match(
    prose(page),
    /Restore the Cameron comparison outside the 45-minute demonstration.*Restore preferences.*Check import status.*Run eligibility check.*1 eligible recipient.*Native profile IDs.*unchanged/i,
  );
  assert.match(
    text,
    /application separately enforces licensed-state eligibility/i,
  );
});

test("the priority edit remains a draft until both audience previews and approval are complete", () => {
  const edit = prose(step("portal-priority-edit").actions);
  assert.match(
    step("portal-priority-edit").objective,
    /Part 1 of the priority-change loop/,
  );
  assert.match(
    step("portal-preview").objective,
    /Part 2 of the same priority-change loop/,
  );
  assert.match(
    step("portal-priority-edit").stopWhen,
    /Checkpoint.*live experience is unchanged.*Continue/,
  );
  assert.match(edit, /Create version/);
  assert.match(edit, /Ordered recommendations/);
  assert.match(edit, /remains Draft.*Leave it unpublished/i);
  assert.doesNotMatch(
    edit,
    /(?:choose|select)\s+Actions → (?:Submit|Approve)|click Start publish/i,
  );
  const id = "portal-preview";
  const previewRole = actionIndex(
    id,
    /Switch to.*administrator acting as publisher.*browser profile.*Page Builder Editor/i,
  );
  const principal = actionIndex(id, /Choose agency-growth.*Preview/);
  const producer = actionIndex(id, /Choose producer-priorities.*Preview/);
  const submit = actionIndex(id, /Switch back.*Author.*Actions → Submit/);
  const approve = actionIndex(id, /separate Approver.*Actions → Approve/i);
  const publish = actionIndex(
    id,
    /administrator acting as publisher.*Start publish/i,
  );
  assert(
    previewRole < principal &&
      principal < producer &&
      producer < submit &&
      submit < approve &&
      approve < publish,
  );
  assert.match(
    prose(step(id).actions[principal]),
    /Close the preview tab.*Editor.*select Agency priorities in Layers again/i,
  );
  assert.match(
    prose(step(id).controls),
    /configured experience in Preview.*Load profile.*real profile.*signed-in agent browsers.*live result/i,
  );
  assert.match(
    prose(step(id).expected),
    /without publishing Home manually or deploying frontend code/i,
  );
});

test("shared disclosure and its reversal stop after the two-site proof", () => {
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
  for (const expected of [`${PUBLIC_HOST}/`, `${PORTAL_HOST}/`])
    assert(destinations.has(expected));
  assert.match(
    prose(shared.actions),
    /Record.*original.*Disclosure.*rollback/i,
  );
  assert.doesNotMatch(
    prose(shared),
    /public Bundling|Learning & resources|four configured|additional links|other two placements|Q&A/,
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
  assert.doesNotMatch(
    prose(step("portal-audit-rollback").actions),
    /Agency growth priorities|Bundle car and home|coverage-guide-live|public Bundling|Learning & resources/,
  );
  assert.match(
    step("portal-audit-rollback").stopWhen,
    /Both Home pages.*restored original wording.*history/,
  );
});

test("the presenter narrative leads with outcomes and keeps operational cautions in preparation", () => {
  const spoken = prose(
    steps.flatMap((entry) => [...entry.talkTrack, entry.transition]),
  );
  assert.doesNotMatch(
    spoken,
    /outcome is complete|complete search outcome|rehearsal receipt|still pending|not configured|not verified/i,
  );
  const page = readFileSync(
    join(appRoot, "src/app/workshops/demo/page.tsx"),
    "utf8",
  );
  assert.match(page, /<h3>\{step\.title\}<\/h3>/);
  assert.match(page, /Customer request:<\/strong> \{step\.label\}/);
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
