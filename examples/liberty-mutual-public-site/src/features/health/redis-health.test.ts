import { test } from "node:test";
import assert from "node:assert/strict";
import { HEALTH_KEY, HEALTH_TTL_SECONDS, redisHealthGet } from "./redis-health";

const environment = {
  CRON_SECRET: "synthetic-cron-test-only",
  KV_REST_API_URL: "https://synthetic-health.upstash.io",
  KV_REST_API_TOKEN: "synthetic-redis-test-only",
};
const request = (authorization = `Bearer ${environment.CRON_SECRET}`) =>
  new Request("https://public.example/api/sitecore/health", {
    headers: { authorization },
  });

test("missing or incorrect authorization never contacts Redis", async () => {
  let called = false;
  const transport: typeof fetch = async () => {
    called = true;
    throw new Error("Unexpected request");
  };
  for (const header of [
    "",
    "Bearer incorrect",
    "bearer synthetic-cron-test-only",
  ]) {
    const response = await redisHealthGet(request(header), environment, {
      transport,
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(called, false);
});

test("missing configuration and non-Upstash or unsafe URLs fail closed", async () => {
  let called = false;
  const transport: typeof fetch = async () => {
    called = true;
    throw new Error("Unexpected request");
  };
  for (const config of [
    { ...environment, CRON_SECRET: "" },
    { ...environment, KV_REST_API_TOKEN: "" },
    { ...environment, KV_REST_API_URL: "" },
    { ...environment, KV_REST_API_URL: "https://upstash.io.evil.example" },
    { ...environment, KV_REST_API_URL: "http://synthetic-health.upstash.io" },
    {
      ...environment,
      KV_REST_API_URL: "https://user:pass@synthetic-health.upstash.io",
    },
    {
      ...environment,
      KV_REST_API_URL: "https://synthetic-health.upstash.io/private?token=test",
    },
  ])
    assert.equal(
      (await redisHealthGet(request(), config, { transport })).status,
      503,
    );
  assert.equal(called, false);
});

test("an unavailable, mismatched, redirected, or oversized Redis response is a generic 503", async () => {
  const failureBodies = [
    () => Response.redirect("https://redirect.example", 302),
    () => Response.json({ error: "Private backend details" }),
    () => Response.json({ result: "Private backend details" }, { status: 500 }),
    () => Response.json({ result: "OK", unused: "x".repeat(5000) }),
    () => {
      throw new Error("Private network details");
    },
  ];
  for (const failure of failureBodies) {
    const response = await redisHealthGet(request(), environment, {
      transport: async () => failure(),
    });
    assert.equal(response.status, 503);
    assert.equal(await response.text(), '{"ok":false}');
  }
  let reads = 0;
  const response = await redisHealthGet(request(), environment, {
    transport: async () =>
      Response.json({ result: reads++ === 0 ? "OK" : "different-value" }),
  });
  assert.equal(response.status, 503);
});

test("a healthy authenticated round trip uses only the isolated expiring health key", async () => {
  const commands: unknown[][] = [];
  let stored = "";
  const transport: typeof fetch = async (input, init) => {
    assert.equal(String(input), environment.KV_REST_API_URL);
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      `Bearer ${environment.KV_REST_API_TOKEN}`,
    );
    const command = JSON.parse(String(init?.body));
    commands.push(command);
    if (command[0] === "SET") {
      stored = command[2];
      return Response.json({ result: "OK" });
    }
    return Response.json({ result: stored });
  };
  const response = await redisHealthGet(request(), environment, {
    transport,
    now: () => new Date("2026-10-31T12:00:00.000Z"),
    nonce: () => "test-run",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    checkedAt: "2026-10-31T12:00:00.000Z",
  });
  assert.deepEqual(commands, [
    [
      "SET",
      HEALTH_KEY,
      JSON.stringify({
        checkedAt: "2026-10-31T12:00:00.000Z",
        nonce: "test-run",
      }),
      "EX",
      HEALTH_TTL_SECONDS,
    ],
    ["GET", HEALTH_KEY],
  ]);
  assert.equal(HEALTH_TTL_SECONDS, 172800);
  assert.equal(HEALTH_KEY.startsWith("lm-public:health:"), true);
  assert.equal(HEALTH_KEY.includes("publication"), false);
  assert.equal(HEALTH_KEY.includes("workspace"), false);
});
