import assert from "node:assert/strict";
import test from "node:test";
import type {
  ComponentRendering,
  RouteData,
} from "@sitecore-content-sdk/nextjs";
import { getPortalPlaceholders } from "../portal/portal-placeholders";

const mode = { isEditing: false, isPreview: false };
const priorities: ComponentRendering = {
  componentName: "AgencyPriorities",
  uid: "native-personalized-priorities",
  dataSource: "native-audience-datasource",
  fields: { Heading: { value: "For your agency" } },
};
const disclosure: ComponentRendering = {
  componentName: "SharedDisclosure",
  uid: "portal-disclosure-placement",
  dataSource: "same-public-owned-disclosure-id",
};
const route: RouteData = {
  name: "Home",
  placeholders: {
    "headless-agency-priorities": [priorities, disclosure],
    "headless-shared-disclosure": [disclosure, priorities],
  },
};

test("Home preserves native selected priority and disclosure instances in their governed slots", () => {
  const slots = getPortalPlaceholders("/", route, mode);
  assert.deepEqual(slots.agencyPriorities?.rendering.placeholders, {
    "headless-agency-priorities": [priorities],
  });
  assert.equal(
    slots.agencyPriorities?.rendering.placeholders[
      "headless-agency-priorities"
    ][0],
    priorities,
  );
  assert.deepEqual(slots.sharedDisclosure?.rendering.placeholders, {
    "headless-shared-disclosure": [disclosure],
  });
  assert.equal(
    slots.sharedDisclosure?.rendering.placeholders[
      "headless-shared-disclosure"
    ][0],
    disclosure,
  );
});

test("only Resources shares the Home disclosure; recommendations cannot leak to other page families", () => {
  const resources = getPortalPlaceholders("/resources", route, mode);
  assert.equal(resources.agencyPriorities, undefined);
  assert.equal(
    resources.sharedDisclosure?.rendering.placeholders[
      "headless-shared-disclosure"
    ][0],
    disclosure,
  );
  for (const path of [
    "/resources/article",
    "/learning",
    "/products",
    "/support",
    "/growth",
    "/quote",
  ]) {
    const slots = getPortalPlaceholders(path, route, mode);
    assert.equal(slots.agencyPriorities, undefined, path);
    assert.equal(slots.sharedDisclosure, undefined, path);
  }
});

test("new slots never reuse legacy content and empty live slots do not allocate spacing", () => {
  const legacy: RouteData = {
    name: "Home",
    placeholders: { "headless-main": [priorities, disclosure] },
  };
  assert.equal(
    getPortalPlaceholders("/", legacy, mode).agencyPriorities,
    undefined,
  );
  assert.equal(
    getPortalPlaceholders("/", legacy, mode).sharedDisclosure,
    undefined,
  );
  const empty: RouteData = {
    name: "Home",
    placeholders: {
      "headless-agency-priorities": [],
      "headless-shared-disclosure": [],
    },
  };
  assert.equal(
    getPortalPlaceholders("/", empty, mode).agencyPriorities,
    undefined,
  );
  assert.equal(
    getPortalPlaceholders("/", empty, mode).sharedDisclosure,
    undefined,
  );
  assert.ok(
    getPortalPlaceholders("/", empty, { isEditing: true, isPreview: false })
      .agencyPriorities,
  );
  assert.ok(
    getPortalPlaceholders("/", empty, { isEditing: true, isPreview: false })
      .sharedDisclosure,
  );
});
