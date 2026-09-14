import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppPlaceholder,
  LayoutServicePageState,
  type ComponentMap,
  type Page,
  type RouteData,
} from "@sitecore-content-sdk/nextjs";
import { getPortalPlaceholders } from "./portal-placeholders";

function pageFor(route: RouteData, editing: boolean): Page {
  return {
    locale: "en",
    layout: { sitecore: { context: {}, route } },
    mode: {
      name: editing
        ? LayoutServicePageState.Edit
        : LayoutServicePageState.Normal,
      isEditing: editing,
      isPreview: false,
      isNormal: !editing,
      isDesignLibrary: false,
      designLibrary: { isVariantGeneration: false },
    },
  };
}

test("an empty page has only correctly named, nonempty placeholder chrome IDs", () => {
  const route: RouteData = { name: "resources", placeholders: {} };
  const page = pageFor(route, true);
  const slots = getPortalPlaceholders("/resources", route, page.mode);
  const html = Object.values(slots)
    .map((slot) =>
      renderToStaticMarkup(
        createElement(AppPlaceholder, {
          ...slot,
          page,
          componentMap: new Map(),
        }),
      ),
    )
    .join("");
  assert.match(html, /sc-jss-empty-placeholder/);
  assert.match(html, /id="headless-resource-search_[^"]+"/);
  assert.match(html, /id="headless-agent-guidance_[^"]+"/);
  assert.doesNotMatch(
    html,
    /id=""|headless-main|headless-resource-article|headless-products-spotlight/,
  );
});

test("rendered article content excludes wrong components and keeps the native UID", () => {
  const route: RouteData = {
    name: "resource-guide",
    placeholders: {
      "headless-resource-article": [
        {
          componentName: "ResourceArticle",
          uid: "native-article-instance",
          fields: { title: { value: "Agent reference guide" } },
        },
        { componentName: "ProductSpotlight", uid: "misplaced-spotlight" },
      ],
    },
  };
  const page = pageFor(route, true);
  const map: ComponentMap = new Map([
    [
      "ResourceArticle",
      {
        Default: () => createElement("article", null, "Agent reference guide"),
      },
    ],
    [
      "ProductSpotlight",
      { Default: () => createElement("section", null, "Should not appear") },
    ],
  ]);
  const slot = getPortalPlaceholders(
    "/resources/guide",
    route,
    page.mode,
  ).resourceArticle!;
  const html = renderToStaticMarkup(
    createElement(AppPlaceholder, { ...slot, page, componentMap: map }),
  );
  assert.match(html, /<article>Agent reference guide<\/article>/);
  assert.match(html, /id="native-article-instance"/);
  assert.doesNotMatch(html, /Should not appear|misplaced-spotlight/);
});
