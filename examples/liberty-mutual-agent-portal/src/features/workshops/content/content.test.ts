import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { workshopGuides } from "./index";
import { guidePriorities } from "./priorities";
import { plainGuideText } from "../guide-text";
import { guideStepImages } from "../guide-images";

import type { GuideLink, WorkshopGuide } from "../types";

const readableContent = (value: unknown) =>
  plainGuideText(JSON.stringify(value));

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const repositoryRoot = resolve(appRoot, "../..");
const range = (first: number, last: number) =>
  Array.from({ length: last - first + 1 }, (_, index) => first + index);

function linksFor(guide: WorkshopGuide): GuideLink[] {
  return [
    ...(guide.links ?? []),
    ...guide.steps.flatMap((step) => step.links ?? []),
    ...(guide.cleanup.links ?? []),
  ];
}

test("every workshop has a unique routable slug, meaningful steps, prerequisites, and cleanup", () => {
  const slugs = new Set<string>();
  for (const guide of workshopGuides) {
    assert.match(
      guide.slug,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${guide.slug}: canonical route`,
    );
    assert.ok(!slugs.has(guide.slug), `${guide.slug}: duplicate route`);
    slugs.add(guide.slug);
    assert.ok(
      ["marketing", "development"].includes(guide.audience),
      `${guide.slug}: known audience`,
    );
    for (const value of [
      guide.title,
      guide.summary,
      guide.outcome,
      guide.category,
    ]) {
      assert.ok(
        value.trim().length > 0,
        `${guide.slug}: empty introductory field`,
      );
    }
    assert.ok(
      guide.prerequisites.length > 0,
      `${guide.slug}: preparation must be explicit`,
    );
    assert.ok(guide.steps.length > 0, `${guide.slug}: no steps`);
    for (const [index, step] of guide.steps.entries()) {
      assert.ok(step.title.trim(), `${guide.slug} step ${index + 1}: title`);
      assert.ok(
        step.action.length > 0 && step.action.every((value) => value.trim()),
        `${guide.slug} step ${index + 1}: actions`,
      );
      assert.ok(
        step.expected.length > 0 &&
          step.expected.every((value) => value.trim()),
        `${guide.slug} step ${index + 1}: observations`,
      );
    }
    assert.ok(
      guide.cleanup.body.length > 0 &&
        guide.cleanup.body.every((value) => value.trim()),
      `${guide.slug}: cleanup`,
    );
  }
  for (const guide of workshopGuides) {
    for (const related of guide.related ?? []) {
      assert.ok(
        slugs.has(related),
        `${guide.slug}: related route ${related} does not exist`,
      );
      assert.notEqual(
        related,
        guide.slug,
        `${guide.slug}: related route should not link to itself`,
      );
    }
  }
});

test("every guide has a customer priority and optional material follows the main walkthroughs", () => {
  assert.deepEqual(
    Object.keys(guidePriorities).sort(),
    workshopGuides.map((guide) => guide.slug).sort(),
    "priority mapping must cover the live routes without stale entries",
  );
  const kindOrder = { core: 0, optional: 1, support: 2 };
  for (const audience of ["marketing", "development"] as const) {
    let previousKind = 0;
    for (const guide of workshopGuides.filter(
      (item) => item.audience === audience,
    )) {
      assert.ok([3, 4, 5].includes(guide.focus.priority.slide));
      assert.ok(guide.focus.priority.label.trim());
      assert.ok(guide.focus.relevance.trim());
      assert.ok(guide.focus.section.description.trim());
      const kind = kindOrder[guide.focus.section.kind];
      assert.ok(
        kind >= previousKind,
        `${guide.slug}: supporting material must follow the main path`,
      );
      previousKind = kind;
    }
  }
});

test("the extracted SharePoint clickthrough coverage is retained without hidden presenter content", () => {
  // Coverage was reconciled against the read-only September 18 SharePoint copy.
  // These ranges cover the retained workshop procedures, not dividers or indexes.
  // The custom authorization exercise (43–45) and transaction loops (77–86)
  // were intentionally retired; the campaign retains one custom integration example.
  // Bulk maintenance (93) and the standalone capability review (108) were
  // retired when the workshop was simplified; their slides are historical references.
  const expected = {
    marketing: [
      ...range(17, 27),
      ...range(58, 65),
      ...range(68, 76),
      ...range(87, 92),
      ...range(94, 107),
    ],
    development: [...range(46, 54), ...range(123, 133), ...range(135, 142)],
  };
  for (const [audience, slides] of Object.entries(expected)) {
    const covered = new Set(
      workshopGuides
        .filter((guide) => guide.audience === audience)
        .flatMap((guide) => guide.sourceSlides),
    );
    assert.deepEqual(
      slides.filter((slide) => !covered.has(slide)),
      [],
      `${audience}: missing procedures from source deck`,
    );
  }
  for (const guide of workshopGuides) {
    // This presenter-led workflow was added directly to HTML after the deck migration.
    assert.ok(
      guide.sourceSlides.length > 0 ||
        guide.slug === "author-approver-workflow",
      `${guide.slug}: source coverage`,
    );
    assert.ok(
      guide.sourceSlides.every(
        (slide) => Number.isInteger(slide) && slide >= 1 && slide <= 147,
      ),
      `${guide.slug}: do not include hidden presenter slides`,
    );
  }
});

test("guide links use safe destinations and repository file links resolve in the checkout", () => {
  for (const guide of workshopGuides) {
    for (const link of linksFor(guide)) {
      assert.ok(
        link.label.trim(),
        `${guide.slug}: every link needs a useful label`,
      );
      const url = new URL(link.href);
      assert.ok(
        url.protocol === "https:" ||
          (url.protocol === "http:" && url.hostname === "localhost"),
        `${guide.slug}: insecure or executable link`,
      );
      assert.equal(
        url.username,
        "",
        `${guide.slug}: credentials must not appear in a URL`,
      );
      assert.equal(
        url.password,
        "",
        `${guide.slug}: credentials must not appear in a URL`,
      );
      if (url.hostname === "localhost")
        assert.equal(
          guide.accountScope,
          "local",
          `${guide.slug}: localhost requires the local account scope`,
        );
      const repositoryPath = url.pathname.match(
        /^\/tohams\/liberty-mutual-sitecoreai\/(blob|tree)\/main\/(.+)$/,
      );
      if (url.hostname === "github.com" && repositoryPath) {
        const path = resolve(
          repositoryRoot,
          decodeURIComponent(repositoryPath[2]),
        );
        assert.ok(
          path.startsWith(repositoryRoot + "/"),
          `${guide.slug}: repository path escape`,
        );
        assert.ok(
          existsSync(path),
          `${guide.slug}: linked repository path missing: ${repositoryPath[2]}`,
        );
        if (repositoryPath[1] === "blob")
          assert.ok(
            statSync(path).isFile(),
            `${guide.slug}: blob link must name a file`,
          );
        if (repositoryPath[1] === "tree")
          assert.ok(
            statSync(path).isDirectory(),
            `${guide.slug}: tree link must name a directory`,
          );
      }
    }
  }
});

test("screenshots are present in protected assets and have useful alternative text", () => {
  for (const guide of workshopGuides) {
    for (const [stepIndex, step] of guide.steps.entries()) {
      for (const image of guideStepImages(step)) {
        const context = `${guide.slug}, step ${stepIndex + 1}, ${image.file}`;
        assert.match(
          image.file,
          /^[a-z0-9][a-z0-9-]{0,79}\.(png|webp)$/,
          `${context}: screenshot name`,
        );
        assert.ok(
          image.alt.trim() && image.caption.trim(),
          `${context}: screenshot context`,
        );
        assert.ok(
          existsSync(join(appRoot, "workshop-assets", image.file)),
          `${context}: screenshot file missing`,
        );
        assert.ok(
          !existsSync(join(appRoot, "public", image.file)) &&
            !existsSync(join(appRoot, "public/workshop-assets", image.file)),
          `${context}: private screenshot must not be copied into public assets`,
        );
      }
    }
  }
});

test("customer instructions omit attendee details and embedded infrastructure credentials", () => {
  const privateAssignment =
    /\b(?:PORTAL_OPERATOR_SECRET|PORTAL_SESSION_SECRET|SITECORE_EDITING_SECRET|UPSTASH_REDIS_REST_TOKEN|SITECORE_EDGE_CONTEXT_ID)\s*[=:]\s*["']?[a-zA-Z0-9+/_=-]{16,}/;
  for (const guide of workshopGuides) {
    const text = `${JSON.stringify(guide)}\n${readableContent(guide)}`;
    assert.doesNotMatch(
      text,
      privateAssignment,
      `${guide.slug}: private credential literal`,
    );
    assert.doesNotMatch(
      text,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      `${guide.slug}: private key`,
    );
    assert.doesNotMatch(
      text,
      /[a-zA-Z0-9._%+-]+@(?:libertymutual\.com|sitecore\.com|sitecore\.net)\b/i,
      `${guide.slug}: attendee/staff contact information`,
    );
    const personas: string[] =
      text.match(
        /\b(?:avery|maya|jordan|daniel|priya|marcus|elena)\.\d{2}\b/gi,
      ) ?? [];
    assert.ok(
      personas.every((persona) => persona.endsWith(".01")),
      `${guide.slug}: examples must use the contextual .01 token, never another attendee's workshop number`,
    );
    assert.doesNotMatch(
      text,
      /\b(?:rm\s+-rf|git\s+reset\s+--hard)\b/,
      `${guide.slug}: workshop instructions must preserve unrelated local work`,
    );
  }
});

test("the local component and setup instructions still target the actual repository contract", () => {
  const local = workshopGuides.find((guide) => guide.slug === "local-setup");
  const component = workshopGuides.find(
    (guide) => guide.slug === "component-development",
  );
  assert.ok(local && component);
  assert.equal(local.accountScope, "local");
  assert.equal(component.accountScope, "local");
  const nodeVersion = readFileSync(join(appRoot, ".nvmrc"), "utf8").trim();
  assert.ok(
    readableContent(local).includes(nodeVersion),
    "Node prerequisite must match the checked-in runtime",
  );
  assert.ok(
    !existsSync(join(repositoryRoot, "package.json")),
    "If root npm support is introduced, update the folder/setup instructions",
  );
  const pkg = JSON.parse(
    readFileSync(join(appRoot, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  for (const command of [
    "setup:local",
    "dev",
    "build",
    "type-check",
    "test:setup",
    "lint",
  ]) {
    assert.ok(
      pkg.scripts[command],
      `documented npm command exists: ${command}`,
    );
  }
  const source = readFileSync(
    join(appRoot, "src/components/resource-search/ResourceSearch.tsx"),
    "utf8",
  );
  const documentedHeadings = component.steps
    .map((step) => step.code)
    .filter((code): code is string =>
      Boolean(code?.startsWith("<h2>") && code.endsWith("</h2>")),
    );
  // The workshop deliberately runs npm test after applying its documented edit.
  // Accept either documented state so this check cannot break that exercise.
  assert.ok(
    documentedHeadings.length >= 2 &&
      documentedHeadings.some((heading) => source.includes(heading)),
    "the component must contain its documented starting heading or the exercise edit",
  );
  const setupText = readableContent(local);
  const componentText = readableContent(component);
  const setupCommands = local.steps.map((step) => step.code ?? "").join("\n");
  assert.match(setupCommands, /^cd examples\/liberty-mutual-agent-portal$/m);
  for (const command of ["npm run setup:local", "npm ci", "npm run dev"]) {
    assert.ok(
      setupCommands.split("\n").includes(command),
      `local setup must include the actual command: ${command}`,
    );
  }
  assert.ok(
    linksFor(local).some((link) => link.href === "http://localhost:3000/login"),
    "local setup must link to the local portal login",
  );
  assert.ok(
    linksFor(component).some(
      (link) => link.href === "http://localhost:3000/resources",
    ),
    "component exercise must link to functional Search outside the editor",
  );
  // Pin controls and configuration entry points, not their explanatory sentences.
  // The setup helper's behavior is covered by scripts/setup-local.test.mjs.
  assert.match(setupText, /\.env\.local/);
  assert.match(setupText, /Chrome/);
  assert.match(setupText, /Local host/);
  assert.match(setupText, /Enter the editing host url/);
  assert.match(componentText, /Page Builder/);
  assert.match(componentText, /Local host/);
  assert.match(readableContent(component.cleanup), /Default editing host/);
  assert.match(readableContent(local.cleanup), /Default editing host/);
});

test("release teaching does not make hosting access an attendee prerequisite", () => {
  const guide = workshopGuides.find(
    (candidate) => candidate.slug === "release-and-recovery",
  );
  assert.ok(guide);
  assert.ok(
    linksFor(guide).every(
      (link) => new URL(link.href).hostname !== "vercel.com",
    ),
    "release references must be readable without entering the Vercel console",
  );
  assert.ok(
    guide.steps.every((step) => !step.code) && !guide.cleanup.code,
    "release teaching must not add executable deployment or rollback steps",
  );
});

test("reset walkthroughs use the authenticated page and preserve the host, workshop-number, and history boundaries", () => {
  const resetGuides = ["saved-work-reset", "fresh-profile-restart"].map(
    (slug) => {
      const guide = workshopGuides.find((candidate) => candidate.slug === slug);
      assert.ok(guide, `missing ${slug}`);
      return guide;
    },
  );
  const expectedHosts = [
    "liberty-mutual-agent-portal.vercel.app",
    "liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app",
  ];
  for (const guide of resetGuides) {
    const text = readableContent(guide);
    const resetLinks = linksFor(guide)
      .map((link) => new URL(link.href))
      .filter((url) => url.pathname === "/workshops/reset");
    for (const host of expectedHosts) {
      assert.ok(
        resetLinks.some((url) => url.hostname === host),
        `${guide.slug}: reset must be reachable on the host used for the exercise`,
      );
    }
    assert.match(
      text,
      /Workshop number/,
      `${guide.slug}: identify the selector`,
    );
    assert.match(
      text,
      /Reset workshop/,
      `${guide.slug}: identify the actual action button`,
    );
    assert.match(
      text,
      /\b(?:seven|7)\s+(?:personas|logins|usernames|accounts)\b/i,
      `${guide.slug}: explain the effect on all seven accounts`,
    );
    assert.match(
      text,
      /\b(?:same|selected|current|other)\s+(?:host|website|environment)\b|\bhost shown\b/i,
      `${guide.slug}: distinguish host scope`,
    );
    for (const control of [
      "Agent identity",
      "Refresh status",
      "Continue reset",
      "Sign in",
    ]) {
      assert.ok(
        text.includes(control),
        `${guide.slug}: identify the reset page control or field ${control}`,
      );
    }
    assert.doesNotMatch(
      text,
      /Operator-only|PORTAL_OPERATOR_SECRET|reset-reviewer-pack\.mjs|DEMO_PORTAL|coordinator.{0,80}approv/i,
      `${guide.slug}: self-service reset must not require an operator or secret command`,
    );
    assert.ok(
      guide.steps.every((step) => step.code === undefined),
      `${guide.slug}: reset walkthrough must be usable through the page`,
    );
    for (const [concept, terms] of [
      ["authored content", /\b(?:CMS|(?:Sitecore|authored|page)\s+content)\b/i],
      ["Search", /\bSearch\b/i],
      ["webhook receipts", /\bwebhooks?\b/i],
      ["history", /\b(?:history|historical)\b/i],
    ] as const) {
      assert.match(
        text,
        terms,
        `${guide.slug}: explain the separate ${concept} lifecycle`,
      );
    }
    assert.match(
      text,
      /(?:earlier|older|previous|historical)[^."\n]*(?:profiles|history)[^."\n]*(?:remain|retain|available|keep)|(?:profiles|history)[^."\n]*(?:remain|retain|preserv|kept)/i,
      `${guide.slug}: explain that existing profile history is retained`,
    );
  }
  const saved = readableContent(resetGuides[0]);
  // Check the reset concepts without pinning a complete customer-facing sentence.
  assert.match(
    saved,
    /\b(?:starting|baseline|original)\s+(?:(?:operational|saved)\s+)?(?:work|records|tasks)\b/i,
    "the reset guide must explain restoration of starting work",
  );
  assert.match(
    saved,
    /\b(?:new|fresh)(?:\s+\w+){0,3}\s+profiles\b/i,
    "the reset guide must explain creation of fresh profiles",
  );
  const fresh = readableContent(resetGuides[1]);
  for (const field of ["Saved-work run", "Profile generation"]) {
    assert.ok(
      fresh.includes(field),
      `profile verification must identify the reset status field ${field}`,
    );
  }
  assert.ok(
    linksFor(resetGuides[1]).some(
      (link) =>
        new URL(link.href).pathname === "/workshops/guide/saved-work-reset",
    ),
    "profile verification must link to the reset procedure it follows",
  );
  assert.doesNotMatch(
    readableContent(workshopGuides),
    /Reset saved work|Start fresh with new profiles/,
    "the reset page has one clean action, not a choice between reset modes",
  );
});

test("native profile lookup uses the selected host's current Agent identity without operator intervention", () => {
  const guide = workshopGuides.find(
    (candidate) => candidate.slug === "find-an-agent-profile",
  );
  assert.ok(guide);
  const text = readableContent(guide);
  assert.match(text, /Agent identity/);
  assert.match(text, /Liberty Mutual agent identity/);
  assert.ok(
    linksFor(guide).some(
      (link) => new URL(link.href).pathname === "/workshops/reset",
    ),
    "profile lookup must link to the current-identity page",
  );
  assert.doesNotMatch(
    text,
    /ask the operator|operator:|\/api\/portal\/bootstrap/i,
  );
  const allContent = readableContent(workshopGuides);
  assert.doesNotMatch(
    allContent,
    /portal has no reset button|ask the operator before any pack reset|operator must complete a verified restart/i,
    "marketing and development instructions must not retain the retired reset procedure",
  );
});
