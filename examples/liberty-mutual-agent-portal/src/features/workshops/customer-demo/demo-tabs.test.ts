import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { plainGuideText } from "../guide-text";
import { customerDemoTabGroups, demoTabNames } from "./demo-tabs";
import {
  GRAPHQL_EXPLORER,
  PORTAL,
  PUBLIC,
  SCRUNCH_REVIEW,
  SITECORE_AI,
} from "./demo-destinations";

const tabs = customerDemoTabGroups.flatMap((group) => group.tabs);

test("P0 reuses thirteen tools and copies only five starting addresses", () => {
  assert.equal(tabs.length, 13);
  assert.equal(new Set(tabs.map((tab) => tab.id)).size, 13);
  assert.deepEqual(
    tabs.filter((tab) => tab.href).map((tab) => [tab.id, tab.href]),
    [
      ["publicWebsite", `${PUBLIC}/`],
      ["danielPortal", `${PORTAL}/login`],
      ["sitecoreAI", SITECORE_AI],
      ["graphqlExplorer", GRAPHQL_EXPLORER],
      ["prosperaRecommendations", SCRUNCH_REVIEW],
    ],
  );
  for (const tab of tabs) {
    assert(demoTabNames[tab.id].trim());
    assert.notEqual(Boolean(tab.href), Boolean(tab.navigation), tab.id);
    if (!tab.href) continue;
    const url = new URL(tab.href);
    assert.equal(url.protocol, "https:");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
    assert.doesNotMatch(url.pathname, /^\/(?:demo|workshops?)(?:\/|$)/);
    for (const key of url.searchParams.keys())
      assert.doesNotMatch(key, /secret|token|api.?key|authorization/i);
  }
});

test("native tools use their verified menus instead of more deep-link copy targets", () => {
  const paths: Record<string, RegExp> = {
    pageBuilder: /Channels → Public Website → Page builder/,
    personalizationPreview:
      /Page Builder → Site switcher → Agent Portal → Editor → Pages → Home → Apps → Personalization Preview/,
    searchPreview:
      /Content → Search Sources → Liberty Mutual Approved Answers → Preview/,
    events:
      /Expand the navigation if collapsed.*Optimization → Analytics → Events/,
    profiles: /Optimization → Profiles/,
    brandKit: /Design → Brand kits/,
    prosperaPageBuilder:
      /Prospera recommendations.*Home → Readability & Clarity → Cards · Description.*page-opening icon.*right of Select/,
  };
  for (const [id, path] of Object.entries(paths)) {
    const tab = tabs.find((entry) => entry.id === id);
    assert(tab, id);
    assert.equal(tab.href, undefined, id);
    assert.match(plainGuideText(tab.navigation ?? ""), path, id);
  }
  const source = readFileSync(
    new URL("./DemoTabs.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /GuideText text={tab\.navigation/);
  assert.doesNotMatch(
    JSON.stringify(customerDemoTabGroups),
    /State business rule/,
  );
  assert.match(
    tabs.find((tab) => tab.id === "pageBuilder")?.cue ?? "",
    /A1.*Agency priorities’ native rule Builder.*this tab/,
  );
  assert.match(
    tabs.find((tab) => tab.id === "profiles")?.cue ?? "",
    /reuse this SitecoreAI tab for Optimization → Custom values → Agent priority/,
  );
});

test("P0 follows Daniel then Avery in separate windows with one login address", () => {
  const avery = customerDemoTabGroups.find((group) => group.id === "avery");
  const daniel = customerDemoTabGroups.find((group) => group.id === "daniel");
  assert(avery && daniel);
  assert.match(
    daniel.note,
    /separate browser profile.*producer baseline.*first in A1/,
  );
  assert.match(
    avery.note,
    /another browser profile.*principal contrast.*second in A1/,
  );
  assert(
    customerDemoTabGroups.indexOf(daniel) <
      customerDemoTabGroups.indexOf(avery),
  );
  assert.equal(daniel.tabs[0].href, `${PORTAL}/login`);
  assert.equal(avery.tabs[0].href, undefined);
  assert.match(
    plainGuideText(avery.tabs[0].navigation ?? ""),
    /Daniel portal.*Daniel window.*another browser profile/,
  );
  assert.match(
    avery.tabs[0].cue,
    /Stay with Avery for Profiles and the native personalization test/,
  );
  const profiles = tabs.find((tab) => tab.id === "profiles");
  assert.match(
    profiles?.cue ?? "",
    /Daniel’s portal baseline and Avery’s contrast.*Avery Brooks - 01.*her Client ID/,
  );
  assert.doesNotMatch(
    JSON.stringify(customerDemoTabGroups),
    /Sitecore1|tnl,scp|password["']?\s*:/i,
  );
});

test("Personalization Preview uses live page choices, restores defaults, and needs no preparation tab", () => {
  const preview = tabs.find((tab) => tab.id === "personalizationPreview");
  assert(preview);
  assert.equal(preview.href, undefined);
  assert.match(
    preview.cue,
    /Agency growth priorities and Producer priorities.*Preview page opens each result directly.*Allow pop-ups.*return all selectors to Default/,
  );
  assert.doesNotMatch(
    JSON.stringify(customerDemoTabGroups),
    /audience-preview|Prepare audiences|42 of 42|Apps → Audience Preview/,
  );
  const source = readFileSync(
    new URL("./DemoTabs.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /profile\.href|copy its native profile URL/);
  assert.match(source, /<strong>{profile\.label}<\/strong>/);
  assert.match(source, /value={profile\.identifier}/);
  assert.match(source, /value={profile\.profileId}/);
});
