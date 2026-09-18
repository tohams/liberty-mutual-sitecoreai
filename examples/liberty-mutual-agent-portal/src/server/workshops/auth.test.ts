import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { POST as login } from "../../app/api/workshops/login/route";
import { POST as logout } from "../../app/api/workshops/logout/route";
import { GET as asset } from "../../app/api/workshops/assets/[filename]/route";
import { createSession, SESSION_COOKIE, verifySession } from "../auth/session";
import {
  createWorkshopSession,
  verifyWorkshopSession,
  WORKSHOP_SESSION_COOKIE,
  WORKSHOP_SESSION_DURATION_SECONDS,
  workshopReturnTo,
} from "./auth";
import { readWorkshopAsset } from "./auth-assets";

const origin = "https://portal.example";
const testSecret = "workshop-tests-only-signing-secret-not-a-real-secret";
const identity = { username: "daniel.01", reviewerPack: "01" };

async function withEnvironment(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "workshop-auth-"));
  const environment = {
    NODE_ENV: "test",
    PORTAL_ENVIRONMENT: "workshop-auth-test",
    PORTAL_STATE_ADAPTER: "local-json",
    PORTAL_LOCAL_STATE_DIRECTORY: directory,
    VERCEL: "",
    PORTAL_REDIS_REST_URL: "",
    KV_REST_API_URL: "",
    PORTAL_SESSION_SECRET: testSecret,
  };
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  try {
    await run(directory);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
}

function loginRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/workshops/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("workshop and portal tokens cannot authorize each other even with the shared signing key", async () => {
  await withEnvironment(async () => {
    const now = new Date("2026-09-18T12:00:00Z");
    const workshop = await createWorkshopSession(identity, now);
    const portal = await createSession(
      { ...identity, agentId: "agent-daniel", agencyId: "agency-daniel" },
      now,
    );
    assert.deepEqual(
      await verifyWorkshopSession(workshop.token, now),
      workshop.session,
    );
    assert.equal(await verifyWorkshopSession(portal.token, now), null);
    assert.equal(await verifySession(workshop.token, now), null);
    assert.equal(await verifyWorkshopSession("invalid-token", now), null);
    assert.equal(
      await verifyWorkshopSession(
        workshop.token,
        new Date(now.getTime() + WORKSHOP_SESSION_DURATION_SECONDS * 1000),
      ),
      null,
    );
    assert.equal(await verifyWorkshopSession(undefined, now), null);
  });
});

test("return destinations stay within canonical workshop paths", () => {
  assert.equal(
    workshopReturnTo("/workshops/marketing/personalization"),
    "/workshops/marketing/personalization",
  );
  assert.equal(
    workshopReturnTo("/workshops/developers/"),
    "/workshops/developers",
  );
  for (const value of [
    "https://other.example/workshops",
    "//other.example/workshops",
    "/workshops/../../operator",
    "/workshops/%2e%2e/operator",
    "/workshops\\other.example",
    "/workshops/login",
    "/workshops?returnTo=https://other.example",
    "/workshops/guide#section",
    "/workshops-other",
    "/operator",
    "/login",
    null,
    {},
    "/workshops/" + "a".repeat(241),
  ]) {
    assert.equal(workshopReturnTo(value), "/workshops", String(value));
  }
});

test("workshop login sets only its separate session and creates no workspace or CDP state", async () => {
  await withEnvironment(async (directory) => {
    const response = await login(
      loginRequest(
        {
          username: " Daniel.01 ",
          password: "Sitecore",
          returnTo: "/workshops/marketing/personalization",
        },
        {
          Cookie: `${SESSION_COOKIE}=existing-portal; __prerender_bypass=existing-editor; sc_cdp=existing-cdp`,
        },
      ),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      redirectTo: "/workshops/marketing/personalization",
      user: identity,
    });
    assert.equal(response.cookies.getAll().length, 1);
    assert.equal(response.cookies.getAll()[0].name, WORKSHOP_SESSION_COOKIE);
    assert.equal(
      (
        await verifyWorkshopSession(
          response.cookies.get(WORKSHOP_SESSION_COOKIE)?.value,
        )
      )?.username,
      "daniel.01",
    );
    assert.match(response.headers.get("Set-Cookie") ?? "", /HttpOnly/i);
    assert.match(response.headers.get("Cache-Control") ?? "", /no-store/);
    const files = await readdir(directory);
    assert.ok(
      files.length > 0,
      "The existing rate limiter records the authentication attempt",
    );
    for (const filename of files) {
      const record = JSON.parse(
        await readFile(join(directory, filename), "utf8"),
      );
      assert.deepEqual(
        record.value,
        { attempts: 1 },
        "Documentation login creates only a rate-limit counter",
      );
    }
  });
});

test("invalid credentials and bad origins never issue or clear session cookies", async () => {
  await withEnvironment(async () => {
    const invalid = await login(
      loginRequest({ username: "daniel.01", password: "wrong" }),
    );
    assert.equal(invalid.status, 401);
    assert.equal((await invalid.json()).error.code, "INVALID_CREDENTIALS");
    assert.deepEqual(invalid.headers.getSetCookie(), []);
    const rejectedHeaders: Record<string, string>[] = [
      { Origin: "https://attacker.example" },
      { Origin: "" },
      { Origin: "null" },
      { "Sec-Fetch-Site": "cross-site" },
    ];
    for (const headers of rejectedHeaders) {
      const rejected = await login(
        loginRequest({ username: "daniel.01", password: "Sitecore" }, headers),
      );
      assert.equal(rejected.status, 403);
      assert.deepEqual(rejected.headers.getSetCookie(), []);
    }
    const malformed = await login(
      loginRequest({ username: [], password: "Sitecore" }),
    );
    assert.equal(malformed.status, 400);
  });
});

test("workshop logout clears only the workshop cookie and rejects cross-origin requests", async () => {
  const response = await logout(
    new Request(`${origin}/api/workshops/logout`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: `${SESSION_COOKIE}=portal; ${WORKSHOP_SESSION_COOKIE}=workshop`,
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    redirectTo: "/workshops/login",
  });
  assert.equal(response.cookies.getAll().length, 1);
  assert.equal(response.cookies.getAll()[0].name, WORKSHOP_SESSION_COOKIE);
  assert.match(response.headers.get("Set-Cookie") ?? "", /Max-Age=0/);
  const rejected = await logout(
    new Request(`${origin}/api/workshops/logout`, {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
    }),
  );
  assert.equal(rejected.status, 403);
  assert.deepEqual(rejected.headers.getSetCookie(), []);
});

test("private screenshots require a workshop token before checking filenames or file existence", async () => {
  await withEnvironment(async () => {
    const portal = await createSession({
      ...identity,
      agentId: "agent-daniel",
      agencyId: "agency-daniel",
    });
    for (const cookie of [
      "",
      `${SESSION_COOKIE}=${portal.token}`,
      `${WORKSHOP_SESSION_COOKIE}=${portal.token}`,
    ]) {
      const response = await asset(
        new NextRequest(`${origin}/api/workshops/assets/missing.png`, {
          headers: { Cookie: cookie },
        }),
        { params: Promise.resolve({ filename: "missing.png" }) },
      );
      assert.equal(response.status, 401);
      assert.match(
        response.headers.get("Cache-Control") ?? "",
        /private, no-store/,
      );
    }
    const workshop = await createWorkshopSession(identity);
    const denied = await asset(
      new NextRequest(`${origin}/api/workshops/assets/invalid.png`, {
        headers: { Cookie: `${WORKSHOP_SESSION_COOKIE}=${workshop.token}` },
      }),
      {
        params: Promise.resolve({
          filename: "../../fixtures/portal-logins.json",
        }),
      },
    );
    assert.equal(denied.status, 404);
  });
});

test("screenshot reader accepts only PNG/WebP files and rejects traversal and symbolic links", async () => {
  const directory = await mkdtemp(join(tmpdir(), "workshop-assets-"));
  try {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    await writeFile(join(directory, "portal-home.png"), bytes);
    await symlink(
      join(directory, "portal-home.png"),
      join(directory, "linked.png"),
    );
    const result = await readWorkshopAsset("portal-home.png", directory);
    assert.deepEqual(result.bytes, bytes);
    assert.equal(result.contentType, "image/png");
    for (const filename of [
      "../portal-home.png",
      "%2e%2e.png",
      "portal.svg",
      "a/b.png",
      "linked.png",
      "missing.webp",
    ]) {
      await assert.rejects(
        () => readWorkshopAsset(filename, directory),
        (error: unknown) =>
          error instanceof Error && "status" in error && error.status === 404,
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
