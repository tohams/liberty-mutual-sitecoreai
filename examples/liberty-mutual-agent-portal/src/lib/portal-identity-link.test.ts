import assert from "node:assert/strict";
import test from "node:test";
import { readPortalBrowserProfileRef, waitForPortalProfileLink } from "./portal-identity-link";

test("waits for profile-link change after an accepted identity without replaying it", async () => {
  let now = 0;
  let identities = 0;
  const order: string[] = [];
  const waits: number[] = [];
  const linked = await waitForPortalProfileLink({
    readProfileRef: async () => {
      order.push("read");
      now += 100;
      return now >= 1000 ? "imported-profile" : "fresh-anonymous-profile";
    },
    identify: async () => { order.push("identity"); identities++; return { accepted: true }; },
  }, {
    now: () => now,
    sleep: async (milliseconds) => { waits.push(milliseconds); now += milliseconds; },
  });
  assert.equal(linked, true);
  assert.equal(identities, 1);
  assert.deepEqual(order.slice(0, 3), ["read", "identity", "read"]);
  assert.deepEqual(waits, [200, 350, 500]);
  assert.ok(now <= 2000);
});

test("a receipt with an unchanged profile exhausts one deadline and stays unready", async () => {
  let now = 0;
  let identities = 0;
  const ready = await waitForPortalProfileLink({
    readProfileRef: async () => "same-profile",
    identify: async () => { identities++; return { accepted: true }; },
  }, { now: () => now, sleep: async (milliseconds) => { now += milliseconds; } });
  assert.equal(ready, false);
  assert.equal(now, 2000);
  assert.equal(identities, 1);
});

test("missing baseline and null identity receipts never report readiness", async () => {
  let calls = 0;
  assert.equal(await waitForPortalProfileLink({
    readProfileRef: async () => null,
    identify: async () => { calls++; return {}; },
  }), false);
  assert.equal(calls, 0);
  let reads = 0;
  assert.equal(await waitForPortalProfileLink({
    readProfileRef: async () => { reads++; return "baseline"; },
    identify: async () => null,
  }), false);
  assert.equal(reads, 1);
});

test("a late changed profile cannot turn an expired deadline into success", async () => {
  let now = 0;
  let reads = 0;
  assert.equal(await waitForPortalProfileLink({
    readProfileRef: async () => {
      if (++reads === 1) return "baseline";
      now = 2001;
      return "linked";
    },
    identify: async () => ({}),
  }, { now: () => now }), false);
});

test("a hung read is aborted and native errors fail softly", async () => {
  let readSignal: AbortSignal | undefined;
  const pending = waitForPortalProfileLink({
    readProfileRef: (signal) => { readSignal = signal; return new Promise(() => {}); },
    identify: async () => ({}),
  }, { timeoutMs: 20 });
  assert.equal(await pending, false);
  assert.equal(readSignal?.aborted, true);
  assert.equal(await waitForPortalProfileLink({
    readProfileRef: async () => { throw new Error("unavailable"); },
    identify: async () => ({}),
  }), false);
});

test("concurrent browser links keep their baselines and outcomes isolated", async () => {
  const observe = (prefix: string, changes: boolean) => {
    let reads = 0;
    let now = 0;
    return waitForPortalProfileLink({
      readProfileRef: async () => `${prefix}-${++reads > 1 && changes ? "linked" : "baseline"}`,
      identify: async () => ({}),
    }, { now: () => now, sleep: async (milliseconds) => { now += milliseconds; } });
  };
  assert.deepEqual(await Promise.all([observe("first", true), observe("second", false)]), [true, false]);
});

test("a stalled identity receipt also observes the shared abort deadline", async () => {
  let identitySignal: AbortSignal | undefined;
  assert.equal(await waitForPortalProfileLink({
    readProfileRef: async () => "baseline",
    identify: (signal) => { identitySignal = signal; return new Promise(() => {}); },
  }, { timeoutMs: 20 }), false);
  assert.equal(identitySignal?.aborted, true);
});

test("profile reader uses only the public browser endpoint and rejects invalid results", async () => {
  const controller = new AbortController();
  let requested: URL | undefined;
  let options: RequestInit | undefined;
  const transport = (async (input, init) => {
    requested = new URL(String(input));
    options = init;
    return Response.json({ customer: { ref: "linked-profile" } });
  }) satisfies typeof fetch;
  const browser = { edgeUrl: "https://edge.example.test/", contextId: "public-context", browserId: "browser/segment" };
  assert.equal(await readPortalBrowserProfileRef(browser, controller.signal, transport), "linked-profile");
  assert.equal(requested?.pathname, "/v1/events/v1.2/browser/browser%2Fsegment/show.json");
  assert.equal(requested?.search, "?client_key=&api_token=");
  assert.equal(options?.method, "GET");
  assert.equal(options?.credentials, "omit");
  assert.equal(options?.cache, "no-store");
  assert.equal(options?.signal, controller.signal);
  assert.equal(new Headers(options?.headers).get("x-sitecore-contextid"), "public-context");
  for (const body of [{}, { customer: {} }, { customer: { ref: 123 } }]) {
    assert.equal(await readPortalBrowserProfileRef(browser, controller.signal, async () => Response.json(body)), null);
  }
  assert.equal(await readPortalBrowserProfileRef(browser, controller.signal, async () => new Response(null, { status: 503 })), null);
});
