import assert from "node:assert/strict";
import test from "node:test";
import { guideTextParts, isGuideHref, plainGuideText } from "./guide-text";

test("inline links preserve emphasized labels and readable search text", () => {
  const text =
    "Open [**SitecoreAI**](https://app.sitecorecloud.io/?organization=example&tenantId=test), then select **Content**.";
  const parts = guideTextParts(text);
  const link = parts.find((part) => part.kind === "link");
  assert.equal(
    link?.href,
    "https://app.sitecorecloud.io/?organization=example&tenantId=test",
  );
  assert.ok(
    link?.children.some(
      (part) => part.kind === "strong" && part.text === "SitecoreAI",
    ),
  );
  assert.equal(plainGuideText(text), "Open SitecoreAI, then select Content.");
});

test("workshop routes, section anchors, and local development links are supported", () => {
  for (const href of [
    "/workshops/guide/local-development#step-2",
    "#step-4",
    "http://localhost:3000/login",
    "https://webhook.site/#!/view/example",
  ]) {
    assert.ok(isGuideHref(href), href);
    assert.equal(
      guideTextParts(`[Open](${href})`).find((part) => part.kind === "link")
        ?.href,
      href,
    );
  }
});

test("executable links, credentials, ambiguous URLs, and insecure remote links are not clickable", () => {
  for (const href of [
    "javascript:alert",
    "data:text/html,test",
    "file:///tmp/example",
    "//example.com",
    "/\\example.com",
    "https://user:password@example.com",
    "http://example.com",
    "java\nscript:alert",
    "https://example.com/has space",
  ]) {
    assert.equal(isGuideHref(href), false, href);
    assert.ok(
      guideTextParts(`[Open](${href})`).every((part) => part.kind !== "link"),
      href,
    );
  }
});

test("malformed markup and HTML stay readable without being interpreted", () => {
  const text = "<img src=x onerror=alert(1)> [unfinished]( **Page Builder**";
  assert.equal(
    plainGuideText(text),
    "<img src=x onerror=alert(1)> [unfinished]( Page Builder",
  );
  assert.ok(guideTextParts(text).every((part) => part.kind !== "link"));
});

test("multiple links retain surrounding text and independent targets", () => {
  const text =
    "Use [live reset](/workshops/reset) or [preview reset](https://preview.example.com/workshops/reset).";
  assert.equal(plainGuideText(text), "Use live reset or preview reset.");
  assert.deepEqual(
    guideTextParts(text)
      .filter((part) => part.kind === "link")
      .map((part) => part.href),
    ["/workshops/reset", "https://preview.example.com/workshops/reset"],
  );
});
