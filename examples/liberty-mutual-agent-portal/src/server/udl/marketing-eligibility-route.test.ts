import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/workshops/marketing-eligibility/route";
import {
  createWorkshopSession,
  WORKSHOP_SESSION_COOKIE,
} from "../workshops/auth";

let previous: Record<string, string | undefined>,
  directory: string,
  cookie: string;
const origin = "https://workshop.example";
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "marketing-eligibility-route-"));
  const environment = {
    NODE_ENV: "test",
    VERCEL: "",
    PORTAL_ENVIRONMENT: "eligibility-route-tests",
    PORTAL_STATE_ADAPTER: "local-json",
    PORTAL_LOCAL_STATE_DIRECTORY: directory,
    PORTAL_REDIS_REST_URL: "",
    PORTAL_REDIS_REST_TOKEN: "",
    KV_REST_API_URL: "",
    KV_REST_API_TOKEN: "",
    PORTAL_SESSION_SECRET: "unit-test-workshop-secret-more-than-32-characters",
  };
  previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  cookie = `${WORKSHOP_SESSION_COOKIE}=${(await createWorkshopSession({ username: "daniel.01", reviewerPack: "01" })).token}`;
});
after(async () => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(directory, { recursive: true, force: true });
});
function post(body: unknown, headers: Record<string, string> = {}, query = "") {
  return new NextRequest(
    `${origin}/api/workshops/marketing-eligibility${query}`,
    {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: origin,
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    },
  );
}
test("native eligibility is workshop-authenticated, same-origin, and restricted to the prepared comparison", async () => {
  assert.equal((await POST(post({}, { Cookie: "" }))).status, 401);
  assert.equal(
    (await POST(post({}, { Origin: "https://another.example" }))).status,
    403,
  );
  assert.equal(
    (await POST(post({}, { "Content-Type": "text/plain" }))).status,
    415,
  );
  for (const input of [
    null,
    [],
    { identifier: "daniel.01" },
    { marketingSuppressed: false },
    { profiles: [] },
  ]) {
    assert.equal((await POST(post(input))).status, 400);
  }
  assert.equal((await POST(post({}, {}, "?profile=another"))).status, 400);
  const response = await POST(post({}));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, "PREFERENCES_NOT_VERIFIED");
  assert.match(response.headers.get("Cache-Control") ?? "", /no-store/);
});
