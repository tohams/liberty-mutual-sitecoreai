import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { GET, POST } from "../../app/api/workshops/reset/route";
import {
  createWorkshopSession,
  WORKSHOP_SESSION_COOKIE,
  verifyWorkshopSession,
} from "./auth";
import { createSession, SESSION_COOKIE } from "../auth/session";
import { getPack } from "../data/pack-state";
import { getStateStore } from "../state/store";
import type { ProfileImportPlan } from "../udl/profile-import";

let directory: string;
let previous: Record<string, string | undefined>;
let docsCookie: string;
let docsToken: string;
let portalCookie: string;
const origin = "https://workshop.example";
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "workshop-reset-route-"));
  const environment = {
    NODE_ENV: "test",
    PORTAL_ENVIRONMENT: "workshop-reset-routes",
    PORTAL_STATE_ADAPTER: "local-json",
    PORTAL_LOCAL_STATE_DIRECTORY: directory,
    VERCEL: "",
    PORTAL_REDIS_REST_URL: "",
    PORTAL_REDIS_REST_TOKEN: "",
    KV_REST_API_URL: "",
    KV_REST_API_TOKEN: "",
    PORTAL_OPERATOR_SECRET: "",
    PORTAL_SESSION_SECRET:
      "test-only-workshop-reset-signing-key-more-than-32-characters",
    SITECORE_PROFILE_IMPORT_URL: "",
    SITECORE_PROFILE_IMPORT_API_KEY: "",
  };
  previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  docsToken = (
    await createWorkshopSession({ username: "daniel.02", reviewerPack: "02" })
  ).token;
  docsCookie = WORKSHOP_SESSION_COOKIE + "=" + docsToken;
  const portal = await createSession({
    username: "daniel.02",
    reviewerPack: "02",
    agentId: "daniel",
    agencyId: "cedar-ridge",
  });
  portalCookie = SESSION_COOKIE + "=" + portal.token;
});
after(async () => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(directory, { recursive: true, force: true });
});
function get(query = "reviewerPack=15", headers: Record<string, string> = {}) {
  return new NextRequest(origin + "/api/workshops/reset?" + query, {
    headers: { Cookie: docsCookie, ...headers },
  });
}
function post(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(origin + "/api/workshops/reset", {
    method: "POST",
    headers: {
      Cookie: docsCookie,
      Origin: origin,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test("reset status and mutation require documentation authentication, never just portal or bearer auth", async () => {
  const deniedHeaders: Record<string, string>[] = [
    { Cookie: "" },
    { Cookie: portalCookie },
    { Cookie: "", Authorization: "Bearer arbitrary" },
  ];
  for (const headers of deniedHeaders) {
    assert.equal((await GET(get("reviewerPack=15", headers))).status, 401);
    assert.equal((await POST(post({}, headers))).status, 401);
  }
  const swappedPortal = portalCookie.replace(
    SESSION_COOKIE,
    WORKSHOP_SESSION_COOKIE,
  );
  assert.equal(
    (await GET(get("reviewerPack=15", { Cookie: swappedPortal }))).status,
    401,
  );
});

test("GET rejects foreign Origin and POST requires a verified same origin", async () => {
  assert.equal(
    (await GET(get("reviewerPack=15", { Origin: "https://foreign.example" })))
      .status,
    403,
  );
  const headers: Record<string, string>[] = [
    { Origin: "" },
    { Origin: "null" },
    { Origin: "https://foreign.example" },
    { "Sec-Fetch-Site": "cross-site" },
  ];
  for (const rejected of headers)
    assert.equal((await POST(post({}, rejected))).status, 403);
});

test("GET accepts any allowed pack for an attendee, does not advance work and exposes only safe profile lookup fields", async () => {
  const response = await GET(get());
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("Cache-Control") ?? "",
    /private, no-store/,
  );
  const status = await response.json();
  assert.equal(
    status.reviewerPack,
    "15",
    "A pack02 attendee may select pack15 by the explicit sandbox authorization",
  );
  assert.equal(status.restartAvailable, false);
  assert.equal(status.profiles.length, 7);
  assert.ok(
    status.profiles.every(
      (profile: { username: string; identifier: string }) =>
        profile.username.endsWith(".15") &&
        /^[a-f0-9]{32}$/.test(profile.identifier),
    ),
  );
  assert.equal(status.pendingOperation, null);
  assert.deepEqual(await (await GET(get())).json(), status);
  assert.deepEqual(response.headers.getSetCookie(), []);
  assert.equal((await verifyWorkshopSession(docsToken))?.username, "daniel.02");
  for (const key of [
    "operator",
    "secret",
    "checksum",
    "payload",
    "correlationId",
    "identityScope",
  ])
    assert.equal(JSON.stringify(status).includes(key), false);
});

test("route rejects out-of-bounds packs, duplicate selectors, arbitrary hosts and unsupported operations", async () => {
  for (const query of [
    "reviewerPack=00",
    "reviewerPack=16",
    "reviewerPack=1",
    "reviewerPack=15&reviewerPack=01",
    "reviewerPack=15&host=https://foreign.example",
    "reviewerPack=15&requestId=invalid",
  ]) {
    assert.equal((await GET(get(query))).status, 400);
  }
  const status = await (await GET(get())).json();
  const valid = {
    reviewerPack: "15",
    mode: "restart",
    requestId: randomUUID(),
    expectedRunId: status.runId,
  };
  for (const body of [
    { ...valid, mode: "persist-workspace" },
    { ...valid, mode: "saved-work" },
    { ...valid, reviewerPack: "16" },
    { ...valid, host: origin },
    { ...valid, requestId: "" },
  ]) {
    assert.equal((await POST(post(body))).status, 400);
  }
  assert.deepEqual(await (await GET(get())).json(), status);
});

test("authenticated clean reset advances a native import once, preserves docs session and rejects stale attempts", async (context) => {
  const oldUrl = process.env.SITECORE_PROFILE_IMPORT_URL;
  const oldKey = process.env.SITECORE_PROFILE_IMPORT_API_KEY;
  process.env.SITECORE_PROFILE_IMPORT_URL =
    "https://profile-import.sitecorecloud.io/v1/batches";
  process.env.SITECORE_PROFILE_IMPORT_API_KEY =
    "synthetic-test-only-import-key";
  let plan: ProfileImportPlan;
  let uploads = 0;
  let reads = 0;
  const batchId = randomUUID();
  context.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        uploads++;
        plan = (await getPack(getStateStore(), "15")).value.pendingRestart!
          .plan;
        return Response.json(
          {
            batchId,
            status: "QUEUED",
            checksumMd5: plan.checksumMd5,
            fileSizeBytes: plan.fileSizeBytes,
          },
          { status: 202 },
        );
      }
      reads++;
      const path = String(input);
      if (path.endsWith("/status"))
        return Response.json({
          batchId,
          status: "COMPLETED",
          totalRecords: 7,
          succeededRecords: 7,
          failedRecords: 0,
        });
      if (path.endsWith("/stats"))
        return Response.json({
          batchId,
          status: "COMPLETED",
          checksumMd5: plan.checksumMd5,
          fileSizeBytes: plan.fileSizeBytes,
          totalRecords: 7,
          succeededRecords: 7,
          createdRecords: 7,
          updatedRecords: 0,
          failedRecords: 0,
        });
      assert.ok(path.endsWith("/results"));
      return new Response(
        plan.profiles
          .map((profile, recordIndex) =>
            JSON.stringify({
              recordIndex,
              id: profile.correlationId,
              recordType: "PROFILE",
              outcome: "CREATED",
              profileId: randomUUID(),
            }),
          )
          .join("\n"),
      );
    },
  );
  try {
    const before = await (await GET(get())).json();
    const request = {
      reviewerPack: "15",
      mode: "restart",
      requestId: randomUUID(),
      expectedRunId: before.runId,
    };
    const pendingResponse = await POST(post(request));
    assert.equal(pendingResponse.status, 202);
    assert.equal(pendingResponse.headers.get("Retry-After"), "3");
    assert.equal((await pendingResponse.json()).operation.status, "pending");
    assert.deepEqual(pendingResponse.headers.getSetCookie(), []);
    const inspect = await (await GET(get())).json();
    assert.equal(inspect.pendingOperation.requestId, request.requestId);
    assert.equal(uploads, 1);
    assert.equal(
      reads,
      0,
      "GET must not automatically poll or complete the native operation",
    );
    const response = await POST(post(request));
    assert.equal(response.status, 200);
    assert.deepEqual(response.headers.getSetCookie(), []);
    const completed = await response.json();
    assert.equal(completed.operation.status, "completed");
    assert.equal(completed.operation.requiresPortalSignIn, true);
    assert.notEqual(completed.runId, before.runId);
    assert.equal(completed.profileGeneration, before.profileGeneration + 1);
    assert.equal(completed.profiles.length, 7);
    assert.deepEqual(await (await POST(post(request))).json(), completed);
    assert.equal(uploads, 1);
    assert.equal(reads, 3);
    const stale = await POST(post({ ...request, requestId: randomUUID() }));
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).error.code, "VERSION_CONFLICT");
    assert.equal((await verifyWorkshopSession(docsToken))?.reviewerPack, "02");
    assert.equal((await (await GET(get())).json()).runId, completed.runId);
    assert.doesNotMatch(
      JSON.stringify(completed),
      /synthetic-test-only-import-key|checksumMd5|correlationId|identityScope/,
    );
  } finally {
    if (oldUrl === undefined) delete process.env.SITECORE_PROFILE_IMPORT_URL;
    else process.env.SITECORE_PROFILE_IMPORT_URL = oldUrl;
    if (oldKey === undefined)
      delete process.env.SITECORE_PROFILE_IMPORT_API_KEY;
    else process.env.SITECORE_PROFILE_IMPORT_API_KEY = oldKey;
  }
});

test("a restart lacking native configuration fails without rotating the selected run or clearing cookies", async () => {
  const before = await (await GET(get())).json();
  const response = await POST(
    post({
      reviewerPack: "15",
      mode: "restart",
      requestId: randomUUID(),
      expectedRunId: before.runId,
    }),
  );
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "CONFIGURATION_REQUIRED");
  assert.doesNotMatch(body.error.message, /operator|secret|approval/i);
  assert.deepEqual(response.headers.getSetCookie(), []);
  assert.deepEqual(await (await GET(get())).json(), before);
});
