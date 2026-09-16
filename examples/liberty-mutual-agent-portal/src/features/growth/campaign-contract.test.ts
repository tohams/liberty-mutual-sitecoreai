import assert from "node:assert/strict";
import test from "node:test";
import type {
  ComponentRendering,
  RouteData,
} from "@sitecore-content-sdk/nextjs";
import {
  campaignDate,
  campaignWindow,
  campaignPlaceholder,
} from "./campaign-contract";
import { getPortalPlaceholders } from "../portal/portal-placeholders";

const delivery = { isEditing: false, isPreview: false };
test("campaign dates are explicit UTC, with inclusive start and exclusive end", () => {
  const start = "20260916T120000Z";
  const end = "2026-09-17T12:00:00Z";
  const time = Date.parse("2026-09-16T12:00:00Z");
  assert.equal(campaignDate(start), time);
  assert.equal(campaignWindow(start, end, time - 1), "scheduled");
  assert.equal(campaignWindow(start, end, time), "active");
  assert.equal(campaignWindow(start, end, Date.parse(end)), "expired");
  assert.equal(campaignWindow(undefined, undefined, time), "active");
  for (const sentinel of [
    "0001-01-01T00:00:00Z",
    "0001-01-01T00:00:00.000Z",
    "00010101T000000Z",
  ]) {
    assert.equal(
      campaignDate(sentinel),
      undefined,
      "Empty SDK DateTime is unbounded",
    );
    assert.equal(campaignWindow(sentinel, sentinel, time), "active");
    assert.equal(campaignWindow(start, sentinel, time), "active");
    assert.equal(campaignWindow(sentinel, end, Date.parse(end)), "expired");
  }
  for (const invalid of [
    "tomorrow",
    "2026-09-16",
    "2026-09-16T12:00:00",
    "2026-02-30T12:00:00Z",
    "20261316T120000Z",
  ])
    assert.equal(campaignWindow(invalid, undefined, time), "invalid", invalid);
  assert.equal(campaignWindow(end, start, time), "invalid");
  assert.equal(campaignWindow(start, start, time), "invalid");
  assert.equal(campaignWindow(start, end, NaN), "invalid");
});

test("campaign routes cannot fall back to unrestricted slots or an operational growth screen", () => {
  const campaign = {
    componentName: "CampaignPage",
    uid: "native-campaign",
    params: { DynamicPlaceholderId: "3" },
  };
  const route: RouteData = {
    name: "small-business",
    placeholders: {
      "headless-campaign-page": [
        campaign,
        { componentName: "AgentGuidance", uid: "wrong" },
      ],
    },
  };
  const placement = getPortalPlaceholders(
    "/growth/small-business",
    route,
    delivery,
  );
  assert.deepEqual(Object.keys(placement), ["campaignPage"]);
  assert.equal(
    placement.campaignPage?.rendering.placeholders["headless-campaign-page"][0],
    campaign,
  );
  assert.equal(
    placement.campaignPage?.rendering.placeholders["headless-campaign-page"]
      .length,
    1,
  );
  assert.deepEqual(
    getPortalPlaceholders(
      "/growth/other-campaign",
      { ...route, placeholders: { "headless-main": [campaign] } },
      delivery,
    ).campaignPage?.rendering.placeholders,
    { "headless-campaign-page": [] },
  );
  assert.deepEqual(
    Object.keys(getPortalPlaceholders("/growth", route, delivery)),
    ["guidance"],
  );
});

test("nested campaign placeholders enforce component placement without flattening native variants", () => {
  const personalized = {
    componentName: "CampaignCallout",
    uid: "personalized-instance",
    dataSource: "selected-native-variant",
    fields: { title: { value: "Growth for your agency" } },
  };
  const contact = { componentName: "CampaignContact", uid: "contact" };
  const hidden = {
    componentName: "Hidden Rendering",
    uid: "hidden-rule-instance",
  };
  const rendering: ComponentRendering = {
    componentName: "CampaignPage",
    params: { DynamicPlaceholderId: "3" },
    placeholders: {
      "headless-campaign-main-{*}": [personalized, contact, hidden],
      "headless-campaign-sidebar-3": [contact, personalized],
    },
  };
  const before = structuredClone(rendering);
  const main = campaignPlaceholder(rendering, "main", false)!;
  assert.equal(main.name, "headless-campaign-main-3");
  assert.equal(
    main.rendering.placeholders["headless-campaign-main-{*}"][0],
    personalized,
  );
  assert.equal(
    main.rendering.placeholders["headless-campaign-main-{*}"].length,
    1,
  );
  assert.deepEqual(
    campaignPlaceholder(rendering, "sidebar", false)?.rendering.placeholders,
    { "headless-campaign-sidebar-3": [contact] },
  );
  assert.deepEqual(
    campaignPlaceholder(rendering, "main", true)?.rendering.placeholders[
      "headless-campaign-main-{*}"
    ],
    [personalized, hidden],
  );
  assert.deepEqual(
    campaignPlaceholder(rendering, "hero", true)?.rendering.placeholders,
    { "headless-campaign-hero-{*}": [] },
  );
  assert.equal(
    campaignPlaceholder({ ...rendering, params: {} }, "main", false),
    undefined,
  );
  assert.deepEqual(rendering, before);
});
