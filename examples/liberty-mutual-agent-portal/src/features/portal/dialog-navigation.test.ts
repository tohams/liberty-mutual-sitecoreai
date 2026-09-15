import assert from "node:assert/strict";
import test from "node:test";
import { portalDialogClosedHref } from "./dialog-navigation";

test("closing a saved submission clears the reload trigger and retains risk state, filters and anchor", () => {
  const closed = portalDialogClosedHref(
    "/quote?submission=sub-saved&state=TX&filter=Draft#submissions",
    "submission",
  );
  assert.equal(closed, "/quote?state=TX&filter=Draft#submissions");
  assert.equal(
    new URL(closed!, "https://portal.invalid").searchParams.get("submission"),
    null,
  );
  assert.equal(portalDialogClosedHref(closed!, "submission"), null);
});

test("submission path aliases and new-form triggers return to their list", () => {
  for (const section of ["quote", "submissions", "appetite"]) {
    assert.equal(
      portalDialogClosedHref(`/${section}/sub-saved?state=IL`, "submission"),
      `/${section}?state=IL`,
    );
  }
  assert.equal(
    portalDialogClosedHref("/submissions/new?state=TX", "submission"),
    "/submissions?state=TX",
  );
  assert.equal(
    portalDialogClosedHref("/quote?new=1&state=TX", "submission"),
    "/quote?state=TX",
  );
});

test("closing a saved result also clears its earlier new-submission trigger", () => {
  assert.equal(
    portalDialogClosedHref(
      "/quote?new=1&submission=sub-saved&submission=sub-old&state=TX",
      "submission",
    ),
    "/quote?state=TX",
  );
});

test("policy, client and renewal detail paths preserve their list context", () => {
  for (const section of ["clients", "policies", "renewals"]) {
    const closed = portalDialogClosedHref(
      `/${section}/pol-001?filter=renewal&state=FL#policies`,
      "policy",
    );
    assert.equal(closed, `/${section}?filter=renewal&state=FL#policies`);
    assert.equal(portalDialogClosedHref(closed!, "policy"), null);
  }
});

test("bond details retain the surety list route and new-bond forms clear only their trigger", () => {
  assert.equal(
    portalDialogClosedHref("/surety/bond-001?state=FL#bonds", "bond"),
    "/surety?state=FL#bonds",
  );
  assert.equal(
    portalDialogClosedHref("/quote?bond=1&state=TX&source=guidance", "bond"),
    "/quote?state=TX&source=guidance",
  );
});

test("closing a newly saved bond returns to its bond list while form cancellation and row closes preserve context", () => {
  const openedForm = "/quote?bond=1&state=TX&source=guidance#bonds";
  const closedSavedBond = portalDialogClosedHref(openedForm, "bond", {
    returnToBondList: true,
  });
  assert.equal(closedSavedBond, "/surety?state=TX&source=guidance#bonds");
  assert.equal(portalDialogClosedHref(closedSavedBond!, "bond"), null);
  assert.equal(
    portalDialogClosedHref(openedForm, "bond"),
    "/quote?state=TX&source=guidance#bonds",
  );
  assert.equal(
    portalDialogClosedHref("/quote?state=TX", "bond", {
      returnToBondList: true,
    }),
    null,
  );
});

test("unrelated query values, duplicates and encoded text survive closing", () => {
  const closed = portalDialogClosedHref(
    "/quote?submission=sub-001&state=TX&source=one&source=two&q=A%26B#saved",
    "submission",
  );
  const url = new URL(closed!, "https://portal.invalid");
  assert.deepEqual(url.searchParams.getAll("source"), ["one", "two"]);
  assert.equal(url.searchParams.get("q"), "A&B");
  assert.equal(url.searchParams.get("state"), "TX");
  assert.equal(url.hash, "#saved");
});

test("course details clear query or learning paths without removing a resource article path", () => {
  for (const [href, expected] of [
    ["/learning/course-001?state=TX#learning", "/learning?state=TX#learning"],
    [
      "/resources?course=course-001&q=training#learning",
      "/resources?q=training#learning",
    ],
    ["/resources/texas-guide?course=course-001", "/resources/texas-guide"],
  ]) {
    const closed = portalDialogClosedHref(href, "course");
    assert.equal(closed, expected);
    assert.equal(portalDialogClosedHref(closed!, "course"), null);
  }
});

test("row-opened dialogs and another dialog family's URL do not navigate", () => {
  for (const [href, kind] of [
    ["/quote?state=TX#submissions", "submission"],
    ["/clients?filter=renewal", "policy"],
    ["/surety?state=FL", "bond"],
    ["/quote?bond=1&state=FL", "submission"],
    ["/quote?submission=sub-001&state=TX", "bond"],
    ["/policies/pol-001", "submission"],
    ["/quote?new=0&bond=0", "submission"],
    ["/resources?q=training#learning", "course"],
    ["/resources/texas-guide", "course"],
  ] as const) {
    assert.equal(portalDialogClosedHref(href, kind), null);
  }
});

test("unknown, nested, external and unsafe paths never produce a navigation target", () => {
  for (const href of [
    "/resources/guide?submission=sub-001",
    "/quote/one/two?submission=sub-001",
    "https://example.com/quote?submission=sub-001",
    "//example.com/quote?submission=sub-001",
    "javascript:alert(1)",
    "/\\example.com/quote?submission=sub-001",
    "/quote\n?submission=sub-001",
  ]) {
    assert.equal(portalDialogClosedHref(href, "submission"), null);
  }
});
