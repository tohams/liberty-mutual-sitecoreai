import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";
import { GET, PATCH, POST } from "../../app/api/workshops/preferences/route";
import { prepareMarketingPreferences } from "./marketing-preference-plan";
import {
  createWorkshopSession,
  WORKSHOP_SESSION_COOKIE,
} from "../workshops/auth";

let previous: Record<string, string | undefined>,
  directory: string,
  cookie: string;
const origin = "https://workshop.example";
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "marketing-preference-route-"));
  const environment = {
    NODE_ENV: "test",
    VERCEL: "",
    PORTAL_ENVIRONMENT: "preference-route-tests",
    PORTAL_STATE_ADAPTER: "local-json",
    PORTAL_LOCAL_STATE_DIRECTORY: directory,
    PORTAL_REDIS_REST_URL: "",
    PORTAL_REDIS_REST_TOKEN: "",
    KV_REST_API_URL: "",
    KV_REST_API_TOKEN: "",
    PORTAL_SESSION_SECRET: "unit-test-workshop-secret-more-than-32-characters",
    SITECORE_PROFILE_IMPORT_URL: "",
    SITECORE_PROFILE_IMPORT_API_KEY: "",
  };
  previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  const session = await createWorkshopSession({
    username: "daniel.01",
    reviewerPack: "01",
  });
  cookie = `${WORKSHOP_SESSION_COOKIE}=${session.token}`;
});
after(async () => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(directory, { recursive: true, force: true });
});
const get = (query = "", headers: Record<string, string> = {}) =>
  new NextRequest(`${origin}/api/workshops/preferences${query}`, {
    headers: { Cookie: cookie, ...headers },
  });
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`${origin}/api/workshops/preferences`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const patch = (
  body: unknown,
  headers: Record<string, string> = {},
  query = "",
) =>
  new NextRequest(`${origin}/api/workshops/preferences${query}`, {
    method: "PATCH",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
test("preference endpoints require the separate workshop session", async () => {
  assert.equal((await GET(get("", { Cookie: "" }))).status, 401);
  assert.equal(
    (await POST(post({ action: "baseline" }, { Cookie: "" }))).status,
    401,
  );
  assert.equal(
    (
      await PATCH(
        patch(
          { batchId: "40000000-1111-4111-8111-111111111111" },
          { Cookie: "" },
        ),
      )
    ).status,
    401,
  );
});
test("recovery is private, same-origin, strictly UUID-scoped, and cannot create a new checkpoint", async () => {
  const batchId = "40000000-1111-4111-8111-111111111111";
  assert.equal(
    (await PATCH(patch({ batchId }, { Origin: "https://another.example" })))
      .status,
    403,
  );
  assert.equal(
    (await PATCH(patch({ batchId }, {}, "?inspect=true"))).status,
    400,
  );
  for (const body of [
    null,
    {},
    { batchId: "bad" },
    { batchId, action: "baseline" },
    { batchId, identifier: "daniel.01" },
  ])
    assert.equal((await PATCH(patch(body))).status, 400);
  assert.equal(
    (await PATCH(patch({ batchId }, { "Content-Type": "text/plain" }))).status,
    415,
  );
  assert.equal((await PATCH(patch({ batchId: "x".repeat(2048) }))).status, 413);
  const response = await PATCH(patch({ batchId }));
  assert.equal(response.status, 409);
  assert.equal(
    (await response.json()).error.code,
    "IMPORT_RECOVERY_UNAVAILABLE",
  );
  assert.match(
    response.headers.get("Cache-Control") || "",
    /private, no-store/,
  );
  assert.equal((await (await GET(get())).json()).status, "idle");
});
test("preference mutations reject cross-origin requests and arbitrary profile identifiers", async () => {
  assert.equal(
    (
      await POST(
        post({ action: "baseline" }, { Origin: "https://another.example" }),
      )
    ).status,
    403,
  );
  assert.equal(
    (await POST(post({ action: "baseline", identifier: "daniel.01" }))).status,
    400,
  );
  assert.equal((await POST(post({ action: "DELETE" }))).status, 400);
});
test("status stays private and rejects unsupported query switches", async () => {
  const result = await GET(get());
  assert.equal(result.status, 200);
  assert.match(result.headers.get("Cache-Control") || "", /private, no-store/);
  assert.match(result.headers.get("X-Robots-Tag") || "", /noindex/);
  const body = await result.json();
  assert.equal(body.status, "idle");
  assert.equal(body.profiles.length, 2);
  assert.equal((await GET(get("?inspect=false"))).status, 400);
  assert.equal((await GET(get("?inspect=true&inspect=true"))).status, 400);
});
test("missing native configuration fails before recording an upload checkpoint", async () => {
  const result = await POST(post({ action: "baseline" }));
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error.code, "CONFIGURATION_REQUIRED");
  assert.equal((await (await GET(get())).json()).status, "idle");
});
test("PATCH waits for completion and then attaches only verified native outcomes without another upload", async () => {
  const previousFetch = globalThis.fetch;
  process.env.SITECORE_PROFILE_IMPORT_URL =
    "https://profile-import.sitecorecloud.io/test";
  process.env.SITECORE_PROFILE_IMPORT_API_KEY = "test-only-key-never-returned";
  const batchId = "40000000-1111-4111-8111-111111111111";
  const plan = prepareMarketingPreferences("baseline");
  let posts = 0,
    pending = true,
    createdAt = "";
  globalThis.fetch = async (input, init) => {
    if (init?.method === "POST") {
      posts++;
      createdAt = new Date().toISOString();
      throw new Error("The native acknowledgement was lost");
    }
    assert.equal(init?.method, "GET");
    const status = {
      batchId,
      status: pending ? "RUNNING" : "COMPLETED",
      totalRecords: 2,
      succeededRecords: 2,
      failedRecords: 0,
    };
    if (String(input).endsWith("/status")) return Response.json(status);
    if (String(input).endsWith("/stats"))
      return Response.json({
        ...status,
        createdAt,
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
        createdRecords: 0,
        updatedRecords: 2,
      });
    if (String(input).endsWith("/results"))
      return new Response(
        plan.profiles
          .map((profile, index) =>
            JSON.stringify({
              recordIndex: index,
              id: profile.correlationId,
              recordType: "PROFILE",
              outcome: "UPDATED",
              profileId: `${index + 5}0000000-1111-4111-8111-111111111111`,
            }),
          )
          .join("\n") + "\n",
      );
    throw new Error("Unexpected native endpoint");
  };
  try {
    assert.equal((await POST(post({ action: "baseline" }))).status, 409);
    const waiting = await PATCH(patch({ batchId }));
    assert.equal(waiting.status, 202);
    assert.equal(waiting.headers.get("Retry-After"), "3");
    assert.equal((await waiting.json()).status, "upload-uncertain");
    assert.equal((await (await GET(get())).json()).batchId, undefined);
    pending = false;
    const result = await PATCH(patch({ batchId }));
    assert.equal(result.status, 200);
    const recovered = await result.json();
    assert.equal(recovered.status, "verified");
    assert.equal(recovered.batchId, batchId);
    assert.equal(recovered.profiles.length, 2);
    assert(
      recovered.profiles.every(
        (profile: { profileId?: string }) => !!profile.profileId,
      ),
    );
    assert(!JSON.stringify(recovered).includes("test-only-key"));
    assert.equal(posts, 1);
  } finally {
    globalThis.fetch = previousFetch;
    process.env.SITECORE_PROFILE_IMPORT_URL = "";
    process.env.SITECORE_PROFILE_IMPORT_API_KEY = "";
  }
});
