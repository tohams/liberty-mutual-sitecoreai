import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { LocalJsonStateStore } from "../state/store";
import { prepareMarketingPreferences } from "./marketing-preference-plan";
import {
  getMarketingPreferenceStatus,
  parseMarketingPreferenceAction,
  parseMarketingPreferenceBatch,
  recoverMarketingPreferenceImport,
  requestMarketingPreferenceImport,
} from "./marketing-preferences";
import {
  marketingPreferenceTransport,
  PreferenceImportError,
  type PreferenceTransport,
} from "./marketing-preference-import";

let directory: string;
let environment: string | undefined;
before(async () => {
  environment = process.env.PORTAL_ENVIRONMENT;
  process.env.PORTAL_ENVIRONMENT = "preference-tests";
  directory = await mkdtemp(join(tmpdir(), "preference-governance-"));
});
after(async () => {
  if (environment === undefined) delete process.env.PORTAL_ENVIRONMENT;
  else process.env.PORTAL_ENVIRONMENT = environment;
  await rm(directory, { recursive: true, force: true });
});
const ids = [
  "40000000-1111-4111-8111-111111111111",
  "50000000-1111-4111-8111-111111111111",
];
function fakeTransport() {
  let posts = 0,
    reads = 0;
  const transport: PreferenceTransport = {
    assertConfigured() {},
    async submit(plan) {
      posts++;
      return {
        batchId: randomUUID(),
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
      };
    },
    async inspect(plan) {
      reads++;
      return {
        status: "verified",
        verification: {
          counts: { CREATED: 0, UPDATED: plan.profiles.length, FAILED: 0 },
          profiles: plan.profiles.map((profile) => ({
            identifier: profile.identifier,
            profileId: ids[profile.identifier.endsWith("allowed") ? 0 : 1],
          })),
        },
      };
    },
  };
  return { transport, counts: () => ({ posts, reads }) };
}
test("fixtures are matched synthetic profiles, and the opt-out changes only the allowed profile's preference", () => {
  const baseline = prepareMarketingPreferences("baseline"),
    optout = prepareMarketingPreferences("optout");
  const rows = baseline.payload
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(rows.length, 2);
  assert.equal(optout.profiles.length, 1);
  assert.deepEqual(
    { ...rows[0].extensions, marketingSuppressed: true },
    rows[1].extensions,
  );
  const expected = structuredClone(rows[0]);
  expected.extensions.marketingSuppressed = true;
  assert.deepEqual(JSON.parse(optout.payload), expected);
  assert(!baseline.payload.includes("reviewerPack"));
  assert(!baseline.payload.includes("password"));
  for (const invalid of [
    { action: "baseline", identifiers: [] },
    { action: "delete" },
    { action: ["baseline"] },
    null,
  ])
    assert.throws(() => parseMarketingPreferenceAction(invalid));
});
test("one baseline, one opt-out, and restoration preserve native identities and never treat queued uploads as completion", async () => {
  const store = new LocalJsonStateStore(join(directory, "cycle")),
    fake = fakeTransport();
  const dependencies = { store, transport: fake.transport };
  await assert.rejects(
    () => requestMarketingPreferenceImport("optout", dependencies),
    /Load the preference examples/,
  );
  const queued = await requestMarketingPreferenceImport(
    "baseline",
    dependencies,
  );
  assert.equal(queued.status, "queued");
  assert.equal(queued.canSubmit, false);
  assert(!queued.profiles[0].profileId);
  const repeated = await requestMarketingPreferenceImport(
    "baseline",
    dependencies,
  );
  assert.equal(repeated.operationId, queued.operationId);
  assert.equal(fake.counts().posts, 1);
  assert.equal(
    (await getMarketingPreferenceStatus(false, dependencies)).status,
    "queued",
  );
  assert.equal(fake.counts().reads, 0);
  const baseline = await getMarketingPreferenceStatus(true, dependencies);
  assert.equal(baseline.status, "verified");
  assert.deepEqual(
    baseline.profiles.map((profile) => profile.profileId),
    ids,
  );
  const optout = await requestMarketingPreferenceImport("optout", dependencies);
  assert.deepEqual(
    optout.profiles.map((profile) => profile.marketingSuppressed),
    [true, true],
  );
  assert.equal(
    (await getMarketingPreferenceStatus(true, dependencies)).counts?.UPDATED,
    1,
  );
  await requestMarketingPreferenceImport("baseline", dependencies);
  const restored = await getMarketingPreferenceStatus(true, dependencies);
  assert.deepEqual(
    restored.profiles.map((profile) => profile.marketingSuppressed),
    [false, true],
  );
  assert.deepEqual(
    restored.profiles.map((profile) => profile.profileId),
    ids,
  );
  const checkpoint = await store.read(
    "lm-portal:v1:preference-tests:workshop:marketing-preferences",
  );
  assert.equal(checkpoint?.expiresAt, null);
  assert.equal(fake.counts().posts, 3);
});
test("concurrent requests make one native POST, and uncertain uploads remain checkpointed without retry", async () => {
  const store = new LocalJsonStateStore(join(directory, "concurrent")),
    fake = fakeTransport();
  await Promise.all(
    Array.from({ length: 8 }, () =>
      requestMarketingPreferenceImport("baseline", {
        store,
        transport: fake.transport,
      }),
    ),
  );
  assert.equal(fake.counts().posts, 1);
  let posts = 0;
  const uncertain: PreferenceTransport = {
    ...fake.transport,
    async submit() {
      posts++;
      throw new PreferenceImportError("UPLOAD_UNCERTAIN");
    },
  };
  const dependencies = {
    store: new LocalJsonStateStore(join(directory, "uncertain")),
    transport: uncertain,
  };
  assert.equal(
    (await requestMarketingPreferenceImport("baseline", dependencies)).status,
    "upload-uncertain",
  );
  assert.equal(
    (await requestMarketingPreferenceImport("baseline", dependencies))
      .canSubmit,
    false,
  );
  assert.equal(
    (await getMarketingPreferenceStatus(true, dependencies)).canInspect,
    false,
  );
  assert.equal(posts, 1);
});
test("verification cannot silently change the native profile identity during an opt-out", async () => {
  const store = new LocalJsonStateStore(join(directory, "identity")),
    fake = fakeTransport();
  await requestMarketingPreferenceImport("baseline", {
    store,
    transport: fake.transport,
  });
  await getMarketingPreferenceStatus(true, {
    store,
    transport: fake.transport,
  });
  await requestMarketingPreferenceImport("optout", {
    store,
    transport: fake.transport,
  });
  const changed: PreferenceTransport = {
    ...fake.transport,
    async inspect(plan) {
      return {
        status: "verified",
        verification: {
          counts: { CREATED: 1, UPDATED: 0, FAILED: 0 },
          profiles: plan.profiles.map((profile) => ({
            identifier: profile.identifier,
            profileId: randomUUID(),
          })),
        },
      };
    },
  };
  assert.equal(
    (await getMarketingPreferenceStatus(true, { store, transport: changed }))
      .status,
    "failed",
  );
});
test("recovery accepts only a UUID, an unconfirmed checkpoint, and a fully verified native batch without another POST", async () => {
  const store = new LocalJsonStateStore(join(directory, "recover")),
    fake = fakeTransport();
  const batchId = randomUUID();
  let clock = Date.parse("2026-11-01T12:00:00.000Z"),
    posts = 0,
    inspections = 0,
    pending = true,
    wrongBatch = false;
  const dependencies = {
    store,
    now: () => clock,
    transport: {
      ...fake.transport,
      async submit() {
        posts++;
        throw new PreferenceImportError("UPLOAD_UNCERTAIN");
      },
      async inspect(plan, submission, window) {
        inspections++;
        assert.equal(submission.batchId, batchId);
        assert.equal(submission.checksumMd5, plan.checksumMd5);
        assert.equal(submission.fileSizeBytes, plan.fileSizeBytes);
        assert.deepEqual(window, {
          uploadedAfter: Date.parse("2026-11-01T12:00:00.000Z"),
          uploadedBefore: clock,
        });
        if (wrongBatch) throw new PreferenceImportError("VERIFICATION_FAILED");
        return pending
          ? { status: "pending" as const }
          : fake.transport.inspect(plan, submission);
      },
    } satisfies PreferenceTransport,
  };
  for (const invalid of [
    null,
    {},
    [],
    { batchId: "wrong" },
    { batchId, action: "baseline" },
  ])
    assert.throws(() => parseMarketingPreferenceBatch(invalid));
  assert.equal(
    parseMarketingPreferenceBatch({ batchId: batchId.toUpperCase() }),
    batchId,
  );
  await assert.rejects(
    () => recoverMarketingPreferenceImport(batchId, dependencies),
    /no unconfirmed upload/,
  );
  assert.equal(inspections, 0);
  const uncertain = await requestMarketingPreferenceImport(
    "baseline",
    dependencies,
  );
  clock += 120000;
  const waiting = await recoverMarketingPreferenceImport(batchId, dependencies);
  assert.equal(waiting.status, "upload-uncertain");
  assert.equal(waiting.batchId, undefined);
  assert.equal(waiting.canSubmit, false);
  assert.equal(waiting.canInspect, false);
  assert.match(
    waiting.message,
    /Wait until its native import status is Completed/,
  );
  assert.equal(
    (await getMarketingPreferenceStatus(false, dependencies)).batchId,
    undefined,
  );
  wrongBatch = true;
  await assert.rejects(
    () => recoverMarketingPreferenceImport(batchId, dependencies),
    /does not match/,
  );
  assert.equal(
    (await getMarketingPreferenceStatus(false, dependencies)).status,
    "upload-uncertain",
  );
  wrongBatch = false;
  pending = false;
  const verified = await recoverMarketingPreferenceImport(
    batchId,
    dependencies,
  );
  assert.equal(verified.operationId, uncertain.operationId);
  assert.equal(verified.status, "verified");
  assert.equal(verified.batchId, batchId);
  assert.deepEqual(
    verified.profiles.map((profile) => profile.profileId),
    ids,
  );
  assert.equal(verified.canSubmit, true);
  assert.equal(posts, 1);
  assert.equal(inspections, 3);
  await assert.rejects(
    () => recoverMarketingPreferenceImport(batchId, dependencies),
    /no unconfirmed upload/,
  );
  assert.equal(inspections, 3);
});
test("recovery rejects changed native identities and leaves the uncertain checkpoint locked", async () => {
  const store = new LocalJsonStateStore(join(directory, "recover-identity")),
    fake = fakeTransport();
  await requestMarketingPreferenceImport("baseline", {
    store,
    transport: fake.transport,
  });
  await getMarketingPreferenceStatus(true, {
    store,
    transport: fake.transport,
  });
  let posts = 0;
  const changed: PreferenceTransport = {
    ...fake.transport,
    async submit() {
      posts++;
      throw new PreferenceImportError("UPLOAD_UNCERTAIN");
    },
    async inspect(plan) {
      return {
        status: "verified",
        verification: {
          counts: { CREATED: 0, UPDATED: plan.profiles.length, FAILED: 0 },
          profiles: plan.profiles.map((profile) => ({
            identifier: profile.identifier,
            profileId: randomUUID(),
          })),
        },
      };
    },
  };
  const dependencies = { store, transport: changed };
  await requestMarketingPreferenceImport("optout", dependencies);
  await assert.rejects(
    () => recoverMarketingPreferenceImport(randomUUID(), dependencies),
    /does not match/,
  );
  const state = await getMarketingPreferenceStatus(false, dependencies);
  assert.equal(state.status, "upload-uncertain");
  assert.equal(state.batchId, undefined);
  assert.equal(state.canSubmit, false);
  assert.deepEqual(
    state.profiles.map((profile) => profile.profileId),
    ids,
  );
  assert.equal(posts, 1);
});
test("recovery can resolve a timed-out persistent uploading checkpoint and uses CAS before attaching the result", async () => {
  const store = new LocalJsonStateStore(join(directory, "recover-stale")),
    fake = fakeTransport();
  let clock = 1000000;
  const dependencies = { store, transport: fake.transport, now: () => clock };
  await requestMarketingPreferenceImport("baseline", dependencies);
  const stateKey =
    "lm-portal:v1:preference-tests:workshop:marketing-preferences";
  const current = await store.read<{
    job: { status: string; submission?: unknown };
  }>(stateKey);
  assert(current);
  current.value.job.status = "uploading";
  delete current.value.job.submission;
  await store.compareAndSet(stateKey, current.version, current.value, null);
  await assert.rejects(
    () => recoverMarketingPreferenceImport(randomUUID(), dependencies),
    /no unconfirmed upload/,
  );
  clock += 60001;
  const checkpoint = await store.read(stateKey);
  assert(checkpoint);
  const conflicting: PreferenceTransport = {
    ...fake.transport,
    async inspect(plan, submission) {
      const next = await store.read(stateKey);
      assert(next);
      await store.compareAndSet(stateKey, next.version, next.value, null);
      return fake.transport.inspect(plan, submission);
    },
  };
  await assert.rejects(
    () =>
      recoverMarketingPreferenceImport(randomUUID(), {
        ...dependencies,
        transport: conflicting,
      }),
    /checkpoint changed/,
  );
  assert.equal(
    (await getMarketingPreferenceStatus(false, dependencies)).canSubmit,
    false,
  );
  const recovered = await recoverMarketingPreferenceImport(
    randomUUID(),
    dependencies,
  );
  assert.equal(recovered.status, "verified");
  assert.equal(fake.counts().posts, 1);
});
test("native transport checks the exact upload, checksum, counts, correlations, and documented outcomes", async () => {
  const previous = {
    fetch: globalThis.fetch,
    url: process.env.SITECORE_PROFILE_IMPORT_URL,
    key: process.env.SITECORE_PROFILE_IMPORT_API_KEY,
  };
  process.env.SITECORE_PROFILE_IMPORT_URL =
    "https://profile-import.sitecorecloud.io/test";
  process.env.SITECORE_PROFILE_IMPORT_API_KEY = "test-only-never-returned";
  const plan = prepareMarketingPreferences("baseline"),
    batchId = randomUUID();
  const metadata = {
    batchId,
    checksumMd5: plan.checksumMd5,
    fileSizeBytes: plan.fileSizeBytes,
  };
  const status = {
    batchId,
    status: "COMPLETED",
    totalRecords: 2,
    succeededRecords: 2,
    failedRecords: 0,
  };
  let posts = 0,
    invalidOutcome = false;
  let createdAt: unknown = "2026-11-01T12:00:01.000Z";
  globalThis.fetch = async (input, init) => {
    if (init?.method === "POST") {
      posts++;
      const form = init.body as FormData;
      assert.equal(form.get("operationType"), "UPSERT");
      assert.equal(form.get("md5"), plan.checksumMd5);
      assert.equal(await (form.get("file") as Blob).text(), plan.payload);
      return Response.json({ ...metadata, status: "QUEUED" }, { status: 202 });
    }
    if (String(input).endsWith("/status")) return Response.json(status);
    if (String(input).endsWith("/stats"))
      return Response.json({
        ...status,
        ...metadata,
        createdAt,
        createdRecords: 1,
        updatedRecords: 1,
      });
    if (String(input).endsWith("/results"))
      return new Response(
        plan.profiles
          .map((profile, index) =>
            JSON.stringify({
              recordIndex: index,
              id: profile.correlationId,
              recordType: "PROFILE",
              outcome: invalidOutcome
                ? "NO_CHANGE"
                : index
                  ? "UPDATED"
                  : "CREATED",
              profileId: ids[index],
            }),
          )
          .join("\n") + "\n",
      );
    throw new Error("Unexpected request");
  };
  try {
    const submission = await marketingPreferenceTransport.submit(
      plan,
      randomUUID(),
    );
    assert.equal(posts, 1);
    const result = await marketingPreferenceTransport.inspect(plan, submission);
    assert.equal(result.status, "verified");
    const recoveryWindow = {
      uploadedAfter: Date.parse("2026-11-01T12:00:00.000Z"),
      uploadedBefore: Date.parse("2026-11-01T12:01:00.000Z"),
    };
    assert.equal(
      (
        await marketingPreferenceTransport.inspect(
          plan,
          submission,
          recoveryWindow,
        )
      ).status,
      "verified",
    );
    for (const window of [
      {
        ...recoveryWindow,
        uploadedAfter: Date.parse("2026-11-01T12:00:02.000Z"),
      },
      {
        ...recoveryWindow,
        uploadedBefore: Date.parse("2026-11-01T12:00:00.000Z"),
      },
    ])
      await assert.rejects(
        () => marketingPreferenceTransport.inspect(plan, submission, window),
        (error: unknown) =>
          error instanceof PreferenceImportError &&
          error.code === "VERIFICATION_FAILED",
      );
    for (const invalid of [undefined, "not a timestamp"]) {
      createdAt = invalid;
      await assert.rejects(
        () =>
          marketingPreferenceTransport.inspect(
            plan,
            submission,
            recoveryWindow,
          ),
        (error: unknown) =>
          error instanceof PreferenceImportError &&
          error.code === "VERIFICATION_FAILED",
      );
    }
    createdAt = "2026-11-01T12:00:01.000Z";
    invalidOutcome = true;
    await assert.rejects(
      () => marketingPreferenceTransport.inspect(plan, submission),
      (error: unknown) =>
        error instanceof PreferenceImportError &&
        error.code === "VERIFICATION_FAILED",
    );
    assert.equal(posts, 1);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const [name, value] of [
      ["SITECORE_PROFILE_IMPORT_URL", previous.url],
      ["SITECORE_PROFILE_IMPORT_API_KEY", previous.key],
    ]) {
      if (value === undefined) delete process.env[name!];
      else process.env[name!] = value;
    }
  }
});
