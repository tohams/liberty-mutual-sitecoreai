import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProfileIdentifier } from "../auth/profile-identity";
import { getPack, packStateKey } from "../data/pack-state";
import { getStateStore } from "../state/store";

let token: string | undefined;
let draftEnabled = false;
let catalogReads = 0;
let directory: string;
let previous: Record<string, string | undefined>;
const unavailableCatalog = new Error(
  "Synthetic CMS resource catalog is unavailable",
);

mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      get: (name: string) => {
        assert.equal(name, "lm_portal_session");
        return token ? { value: token } : undefined;
      },
    }),
    draftMode: async () => ({ isEnabled: draftEnabled }),
  },
});
mock.module(join(process.cwd(), "src/server/data/cms-resources.ts"), {
  namedExports: {
    getResourceCatalog: async () => {
      catalogReads++;
      throw unavailableCatalog;
    },
  },
});

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "portal-identity-route-"));
  const environment = {
    NODE_ENV: "test",
    PORTAL_ENVIRONMENT: "identity-route-tests",
    PORTAL_STATE_ADAPTER: "local-json",
    PORTAL_LOCAL_STATE_DIRECTORY: directory,
    VERCEL: "",
    PORTAL_REDIS_REST_URL: "",
    PORTAL_REDIS_REST_TOKEN: "",
    KV_REST_API_URL: "",
    KV_REST_API_TOKEN: "",
    PORTAL_SESSION_SECRET:
      "identity-route-test-key-with-more-than-32-characters",
    PORTAL_VERIFIED_PROFILE_GENERATIONS: "0",
    PORTAL_CONTENT_ADAPTER: "sitecore",
  };
  previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
});
after(async () => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(directory, { recursive: true, force: true });
});

async function authenticateRequest() {
  const { createSession } = await import("../auth/session");
  const signed = await createSession({
    agentId: "daniel",
    agencyId: "prairie-oak",
    reviewerPack: "01",
    username: "daniel.01",
  });
  token = signed.token;
  return signed.session;
}

test("authenticated identity stays available when workspace resource content fails", async () => {
  const session = await authenticateRequest();
  const { getPortalBootstrap } = await import("../data/portal");
  await assert.rejects(
    getPortalBootstrap(session),
    (error) => error === unavailableCatalog,
  );
  assert.equal(
    catalogReads,
    1,
    "The full workspace depends on the unavailable CMS catalog",
  );

  const { GET } = await import("../../app/api/portal/identity/route");
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    udlIdentity: {
      provider: "liberty-mutual-agent",
      id: getProfileIdentifier("01", "daniel", 0),
    },
  });
  assert.equal(
    catalogReads,
    1,
    "Identity readiness must not fetch resource content",
  );
  assert.match(
    response.headers.get("Cache-Control") ?? "",
    /private, no-store/,
  );
  assert.equal(response.headers.get("Vary"), "Cookie");
  assert.deepEqual(response.headers.getSetCookie(), []);
});

test("missing and invalid portal sessions cannot read identity, including in draft mode", async () => {
  const { GET } = await import("../../app/api/portal/identity/route");
  for (const draft of [false, true]) {
    draftEnabled = draft;
    for (const missingOrInvalid of [undefined, "invalid-synthetic-token"]) {
      token = missingOrInvalid;
      const response = await GET();
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error.code, "UNAUTHENTICATED");
    }
  }
  draftEnabled = false;
  assert.equal(catalogReads, 1);
});

test("authenticated editing stays neutral and unverified generations expose no identity", async () => {
  await authenticateRequest();
  const { GET } = await import("../../app/api/portal/identity/route");
  draftEnabled = true;
  const editing = await GET();
  assert.equal(editing.status, 200);
  assert.deepEqual(await editing.json(), { udlIdentity: null });
  draftEnabled = false;

  process.env.PORTAL_VERIFIED_PROFILE_GENERATIONS = "";
  try {
    const unverified = await GET();
    assert.equal(unverified.status, 200);
    assert.deepEqual(await unverified.json(), { udlIdentity: null });
  } finally {
    process.env.PORTAL_VERIFIED_PROFILE_GENERATIONS = "0";
  }
  assert.equal(catalogReads, 1);
});

test("a signed session from before a workspace restart cannot read the new identity", async () => {
  const session = await authenticateRequest();
  const store = getStateStore();
  const pack = await getPack(store, "01");
  await store.compareAndSet(
    packStateKey("01"),
    pack.version,
    {
      ...pack.value,
      restartedAt: Date.parse(session.issuedAt) + 1,
    },
    null,
  );
  const { GET } = await import("../../app/api/portal/identity/route");
  const response = await GET();
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "UNAUTHENTICATED");
  assert.equal(catalogReads, 1);
});
