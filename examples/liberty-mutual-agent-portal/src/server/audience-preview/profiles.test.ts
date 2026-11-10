import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import type { AudiencePreviewInput } from "../../features/audience-preview/types";
import type { StateStore, StoredValue } from "../state/store";
import {
  validateAudiencePreviewInput,
  AudiencePreviewError,
} from "./contracts";
import {
  createPreviewProfileImporter,
  PreviewImportQueueBusyError,
  type PreviewProfileImporter,
} from "./importer";
import {
  audienceSelectorHash,
  prepareAudiencePreviewProfile,
  prepareAudienceProfileImport,
  type AudienceProfileDependencies,
  type AudienceProfileJob,
} from "./profiles";

const input: AudiencePreviewInput = {
  role: "principal",
  licensedStates: ["TX", "IL"],
  specializesInSmallCommercial: true,
  agencySmallCommercialSharePercent: 15,
  agencyTotalWrittenPremiumUsd: 1_000_000,
  agentSmallCommercialWrittenPremiumUsd: 60_000,
};
const profileId = "11111111-1111-4111-8111-111111111111";
const browserId = "22222222-2222-4222-8222-222222222222";
const batchId = "33333333-3333-4333-8333-333333333333";
const correlationId = "44444444-4444-4444-8444-444444444444";

class MemoryStore implements StateStore {
  values = new Map<string, StoredValue<unknown>>();
  async read<T>(key: string) {
    return structuredClone(
      this.values.get(key) || null,
    ) as StoredValue<T> | null;
  }
  async compareAndSet<T>(key: string, expected: number | null, value: T) {
    const old = this.values.get(key);
    if ((old?.version ?? null) !== expected) return null;
    const next = {
      version: (old?.version ?? -1) + 1,
      expiresAt: null,
      value: structuredClone(value),
    };
    this.values.set(key, next);
    return structuredClone(next);
  }
  async persist<T>(): Promise<
    import("../state/store").PersistenceResult<T> | null
  > {
    return null;
  }
}

test("selector validation rejects IDs, invalid states, roles, duplicates, and unbounded numeric values", () => {
  for (const invalid of [
    null,
    { ...input, profileId },
    { ...input, role: "admin" },
    { ...input, licensedStates: ["OR"] },
    { ...input, licensedStates: ["TX", "TX"] },
    { ...input, agencySmallCommercialSharePercent: 101 },
    { ...input, agencyTotalWrittenPremiumUsd: Number.MAX_SAFE_INTEGER },
    { ...input, agentSmallCommercialWrittenPremiumUsd: NaN },
    { ...input, specializesInSmallCommercial: "true" },
    { ...input, agencyTotalWrittenPremiumUsd: 0.001 },
  ]) {
    assert.throws(
      () => validateAudiencePreviewInput(invalid),
      (e: unknown) =>
        e instanceof AudiencePreviewError && e.code === "INVALID_AUDIENCE",
    );
  }
});

test("synthetic profile bytes preserve production inputs and namespace the identity without evaluating targeting", () => {
  const plan = prepareAudienceProfileImport(
    input,
    "preview:test",
    "liberty-mutual-agent-portal",
    correlationId,
  );
  const record = JSON.parse(plan.payload);
  assert.equal(record.contact.firstName, "Audience");
  assert.equal(record.contact.lastName, "Preview");
  assert.equal(record.extensions.previewOnly, true);
  assert.equal(record.extensions.licensedInTexas, true);
  assert.equal(record.extensions.licensedInFlorida, false);
  assert.equal(record.extensions.licensedInIllinois, true);
  assert.equal(
    record.extensions.agencySmallCommercialWrittenPremiumCents,
    15_000_000,
  );
  assert.equal(record.extensions.agencyPersonalWrittenPremiumCents, 85_000_000);
  assert.equal(
    record.extensions.agentSmallCommercialWrittenPremiumCents,
    6_000_000,
  );
  assert.match(record.identifiers[0].id, /^audience-preview:v1:[a-f0-9]{64}$/);
  assert.equal(record.identifiers[0].provider, "liberty-mutual-agent");
  assert.equal(
    plan.checksumMd5,
    createHash("md5").update(plan.payload).digest("hex"),
  );
  assert.equal(plan.fileSizeBytes, Buffer.byteLength(plan.payload));
  assert.equal(
    audienceSelectorHash(input, "preview:test", "liberty-mutual-agent-portal"),
    audienceSelectorHash(
      { ...input, licensedStates: ["IL", "TX"] },
      "preview:test",
      "liberty-mutual-agent-portal",
    ),
  );
  assert.notEqual(
    audienceSelectorHash(input, "preview:test", "liberty-mutual-agent-portal"),
    audienceSelectorHash(input, "preview:other", "liberty-mutual-agent-portal"),
  );
  assert.equal("variantId" in record.extensions, false);
});

test("zero licensed states remains a valid all-false native licensing context", () => {
  const audience = validateAudiencePreviewInput({
    ...input,
    licensedStates: [],
  });
  assert.deepEqual(audience.licensedStates, []);
  const record = JSON.parse(
    prepareAudienceProfileImport(
      audience,
      "preview:test",
      "liberty-mutual-agent-portal",
      correlationId,
    ).payload,
  );
  assert.equal(record.extensions.licensedInTexas, false);
  assert.equal(record.extensions.licensedInFlorida, false);
  assert.equal(record.extensions.licensedInIllinois, false);
  assert.equal(record.extensions.state, "TX");
});

test("concurrent starts submit once, resumed polls bind once, and the completed profile is reused", async () => {
  const store = new MemoryStore();
  let time = 10_000,
    uploads = 0,
    inspections = 0,
    creations = 0,
    identities = 0,
    linked = false;
  const importer: PreviewProfileImporter = {
    submit: async (plan) => {
      uploads++;
      return {
        batchId,
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
      };
    },
    inspect: async () => {
      inspections++;
      return { status: "verified", profileId };
    },
  };
  const transport = (async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/browser/create.json")) {
      creations++;
      return Response.json({ ref: browserId });
    }
    assert.equal(path, "/v1/events/v1.2/events");
    const event = JSON.parse(String(init?.body));
    assert.equal(event.type, "IDENTITY");
    assert.equal(event.browser_id, browserId);
    assert.match(event.identifiers[0].id, /^audience-preview:v1:/);
    assert.equal(event.page, "Audience Preview");
    identities++;
    linked = true;
    return Response.json({ status: "OK" });
  }) as typeof fetch;
  const dependencies = {
    store,
    namespace: "preview:test",
    siteName: "liberty-mutual-agent-portal",
    edgeUrl: "https://edge-platform.sitecorecloud.io",
    contextId: "test-context",
    importer,
    transport,
    now: () => time,
    readProfileRef: async () =>
      linked ? profileId : "55555555-5555-4555-8555-555555555555",
  };
  const start = await Promise.all([
    prepareAudiencePreviewProfile(input, dependencies),
    prepareAudiencePreviewProfile(input, dependencies),
  ]);
  assert(start.every((result) => result.status === "pending"));
  assert.equal(uploads, 1);
  let result = start[0];
  for (let attempt = 0; attempt < 6 && result.status !== "ready"; attempt++) {
    time += 4_000;
    result = await prepareAudiencePreviewProfile(input, dependencies);
  }
  assert.equal(result.status, "ready");
  if (result.status !== "ready") throw new Error("Expected ready");
  assert.equal(result.profile.profileId, profileId);
  assert.equal(result.profile.browserId, browserId);
  assert.equal(uploads, 1);
  assert.equal(inspections, 1);
  assert.equal(creations, 1);
  assert.equal(identities, 1);
  assert.deepEqual(
    await prepareAudiencePreviewProfile(input, dependencies),
    result,
  );
  assert.equal(uploads, 1);
});

test("an uncertain upload cannot be replayed by repeated preview requests", async () => {
  let uploads = 0;
  const importer: PreviewProfileImporter = {
    submit: async () => {
      uploads++;
      throw new Error("lost response");
    },
    inspect: async () => ({ status: "pending" }),
  };
  const dependencies = {
    store: new MemoryStore(),
    namespace: "preview:test",
    siteName: "liberty-mutual-agent-portal",
    edgeUrl: "https://edge-platform.sitecorecloud.io",
    contextId: "test-context",
    importer,
  };
  await assert.rejects(
    prepareAudiencePreviewProfile(input, dependencies),
    (error: unknown) =>
      error instanceof AudiencePreviewError &&
      error.code === "IMPORT_UPLOAD_UNCONFIRMED",
  );
  await assert.rejects(
    prepareAudiencePreviewProfile(input, dependencies),
    (error: unknown) =>
      error instanceof AudiencePreviewError &&
      error.code === "IMPORT_UPLOAD_UNCONFIRMED",
  );
  assert.equal(uploads, 1);
});

test("a worker disappearing during upload leaves an unreplayed retained job after its lease expires", async () => {
  const store = new MemoryStore();
  let time = 10_000,
    uploads = 0;
  const dependencies = {
    store,
    namespace: "preview:test",
    siteName: "liberty-mutual-agent-portal",
    edgeUrl: "https://edge-platform.sitecorecloud.io",
    contextId: "test-context",
    now: () => time,
    importer: {
      submit: async () => {
        uploads++;
        return new Promise<never>(() => undefined);
      },
      inspect: async () => ({ status: "pending" as const }),
    },
  };
  // Keep the upload unresolved to represent a worker that never persisted an acknowledgement.
  void prepareAudiencePreviewProfile(input, dependencies);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(uploads, 1);
  time += 46_000;
  await assert.rejects(
    prepareAudiencePreviewProfile(input, dependencies),
    (error: unknown) =>
      error instanceof AudiencePreviewError &&
      error.code === "IMPORT_UPLOAD_UNCONFIRMED",
  );
  await assert.rejects(
    prepareAudiencePreviewProfile(input, dependencies),
    (error: unknown) =>
      error instanceof AudiencePreviewError &&
      error.code === "IMPORT_UPLOAD_UNCONFIRMED",
  );
  assert.equal(uploads, 1);
});

test("a lost identity receipt is resolved by checking the same binding without replaying IDENTITY", async () => {
  let time = 10_000,
    identityCount = 0,
    readCount = 0;
  const importer: PreviewProfileImporter = {
    submit: async (plan) => ({
      batchId,
      checksumMd5: plan.checksumMd5,
      fileSizeBytes: plan.fileSizeBytes,
    }),
    inspect: async () => ({ status: "verified", profileId }),
  };
  const dependencies = {
    store: new MemoryStore(),
    namespace: "preview:test",
    siteName: "liberty-mutual-agent-portal",
    edgeUrl: "https://edge-platform.sitecorecloud.io",
    contextId: "test-context",
    importer,
    now: () => time,
    transport: (async (url) => {
      if (String(url).includes("browser/create"))
        return Response.json({ ref: browserId });
      identityCount++;
      throw new Error("receipt lost");
    }) as typeof fetch,
    readProfileRef: async () => (++readCount >= 3 ? profileId : null),
  };
  let result = await prepareAudiencePreviewProfile(input, dependencies);
  for (let n = 0; n < 8 && result.status !== "ready"; n++) {
    time += 4_000;
    result = await prepareAudiencePreviewProfile(input, dependencies);
  }
  assert.equal(result.status, "ready");
  assert.equal(identityCount, 1);
});

test("one-record import verifies checksum, correlation, counts, and CREATED or UPDATED outcomes", async () => {
  const plan = prepareAudienceProfileImport(
    input,
    "preview:test",
    "liberty-mutual-agent-portal",
    correlationId,
  );
  for (const outcome of ["CREATED", "UPDATED"] as const) {
    let uploads = 0;
    const transport = (async (url, init) => {
      const path = new URL(String(url)).pathname;
      const metadata = {
        batchId,
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
      };
      if (init?.method === "POST") {
        uploads++;
        assert.equal(path, "/v1/batches");
        assert.equal((init.body as FormData).get("md5"), plan.checksumMd5);
        return Response.json(
          { ...metadata, status: "QUEUED" },
          { status: 202 },
        );
      }
      if (path.endsWith("/status"))
        return Response.json({
          batchId,
          status: "COMPLETED",
          totalRecords: 1,
          succeededRecords: 1,
          failedRecords: 0,
        });
      if (path.endsWith("/stats"))
        return Response.json({
          ...metadata,
          status: "COMPLETED",
          totalRecords: 1,
          succeededRecords: 1,
          failedRecords: 0,
          createdRecords: outcome === "CREATED" ? 1 : 0,
          updatedRecords: outcome === "UPDATED" ? 1 : 0,
        });
      return new Response(
        JSON.stringify({
          id: correlationId,
          recordIndex: 0,
          recordType: "PROFILE",
          outcome,
          profileId,
        }) + "\n",
      );
    }) as typeof fetch;
    const importer = createPreviewProfileImporter(
      { url: "https://profiles.sitecorecloud.io", apiKey: "synthetic-key" },
      transport,
    );
    const submission = await importer.submit(plan);
    assert.deepEqual(await importer.inspect(plan, submission), {
      status: "verified",
      profileId,
    });
    assert.equal(uploads, 1);
    const bad = createPreviewProfileImporter(
      { url: "https://profiles.sitecorecloud.io", apiKey: "synthetic-key" },
      (async (url, init) => {
        const response = await transport(url, init);
        return String(url).endsWith("/results")
          ? new Response(
              JSON.stringify({
                id: browserId,
                recordIndex: 0,
                recordType: "PROFILE",
                outcome,
                profileId,
              }),
            )
          : response;
      }) as typeof fetch,
    );
    assert.deepEqual(await bad.inspect(plan, submission), { status: "failed" });
  }
});

async function retainedBinding(phase: "binding" | "failed", code?: string) {
  const store = new MemoryStore();
  const namespace = "preview:test";
  const siteName = "liberty-mutual-agent-portal";
  const plan = prepareAudienceProfileImport(
    input,
    namespace,
    siteName,
    correlationId,
  );
  const key = `${namespace}:audience-preview:v1:${plan.selectorHash}`;
  await store.compareAndSet(key, null, {
    schemaVersion: 1,
    phase,
    plan,
    createdAt: 10_000,
    bindingStartedAt: 15_000,
    profileId,
    browserId,
    identitySent: true,
    ...(code ? { code } : {}),
  });
  const dependencies: AudienceProfileDependencies = {
    store,
    namespace,
    siteName,
    edgeUrl: "https://edge-platform.sitecorecloud.io",
    contextId: "test-context",
    now: () => 200_000,
    importer: {
      submit: async () => {
        throw new Error("A retained binding must never import again.");
      },
      inspect: async () => {
        throw new Error("A verified import must not be repeated.");
      },
    },
    transport: async () => {
      throw new Error("Recovery must never create a browser or send an event.");
    },
    readProfileRef: async (browser) => {
      assert.equal(browser.browserId, browserId);
      return profileId;
    },
  };
  return { dependencies, store, key };
}

test("an elapsed binding window checks the exact existing binding before recording a timeout", async () => {
  const { dependencies, store, key } = await retainedBinding("binding");
  const result = await prepareAudiencePreviewProfile(input, dependencies);
  assert.equal(result.status, "ready");
  const saved = await store.read<{ phase: string }>(key);
  assert.equal(saved?.value.phase, "ready");
});

test("a retained link timeout can recover only by reading the original exact profile binding", async () => {
  const { dependencies, store, key } = await retainedBinding(
    "failed",
    "PROFILE_LINK_TIMEOUT",
  );
  let reads = 0;
  dependencies.readProfileRef = async (browser) => {
    reads++;
    assert.equal(browser.browserId, browserId);
    return profileId;
  };
  const result = await prepareAudiencePreviewProfile(input, dependencies);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") throw new Error("Expected verified recovery.");
  assert.equal(result.profile.profileId, profileId);
  assert.equal(result.profile.browserId, browserId);
  assert.equal(reads, 1);
  const saved = await store.read<{
    phase: string;
    code?: string;
    lease?: unknown;
  }>(key);
  assert.equal(saved?.value.phase, "ready");
  assert.equal(saved?.value.code, undefined);
  assert.equal(saved?.value.lease, undefined);
});

test("a retained timeout stays closed on mismatch, missing data, or failed native read", async () => {
  for (const read of [
    async () => "55555555-5555-4555-8555-555555555555",
    async () => null,
    async (): Promise<string | null> => {
      throw new Error("native read unavailable");
    },
  ]) {
    const { dependencies, store, key } = await retainedBinding(
      "failed",
      "PROFILE_LINK_TIMEOUT",
    );
    dependencies.readProfileRef = read;
    await assert.rejects(
      prepareAudiencePreviewProfile(input, dependencies),
      (error: unknown) =>
        error instanceof AudiencePreviewError &&
        error.code === "PROFILE_LINK_TIMEOUT",
    );
    const saved = await store.read<{
      phase: string;
      code: string;
      lease?: unknown;
    }>(key);
    assert.equal(saved?.value.phase, "failed");
    assert.equal(saved?.value.code, "PROFILE_LINK_TIMEOUT");
    assert.equal(saved?.value.lease, undefined);
  }
});

test("retained timeout diagnostics classify the same single browser read without exposing native references", async (t) => {
  const log = t.mock.method(console, "info", () => undefined);
  for (const [status, category] of [
    [404, "not-found"],
    [403, "http-failure"],
    [200, "mismatched"],
  ] as const) {
    const { dependencies, store, key } = await retainedBinding(
      "failed",
      "PROFILE_LINK_TIMEOUT",
    );
    let reads = 0;
    dependencies.readProfileRef = undefined;
    dependencies.transport = async (url, init) => {
      reads++;
      assert.equal(init?.method, "GET");
      assert.equal(
        new URL(String(url)).pathname,
        `/v1/events/v1.2/browser/${browserId}/show.json`,
      );
      return status === 200
        ? Response.json({ ref: browserId, customer: { ref: batchId } })
        : new Response("private-native-error", { status });
    };
    await assert.rejects(
      prepareAudiencePreviewProfile(input, dependencies),
      (error: unknown) =>
        error instanceof AudiencePreviewError &&
        error.code === "PROFILE_LINK_TIMEOUT",
    );
    assert.equal(reads, 1);
    const saved = await store.read<{
      phase: string;
      profileId: string;
      browserId: string;
    }>(key);
    assert.equal(saved?.value.phase, "failed");
    assert.equal(saved?.value.profileId, profileId);
    assert.equal(saved?.value.browserId, browserId);
    const diagnostic = log.mock.calls.findLast(
      (call) =>
        call.arguments[0] === "Audience Preview retained binding recovery",
    );
    assert.deepEqual(diagnostic?.arguments[1], { category, status });
    const serialized = JSON.stringify(diagnostic?.arguments);
    for (const sensitive of [
      profileId,
      browserId,
      batchId,
      "private-native-error",
      "test-context",
    ])
      assert.equal(serialized.includes(sensitive), false);
  }
});

async function retainedUnsentIdentity(omitIdentityFlag = false) {
  const run = await retainedBinding("failed", "PROFILE_LINK_TIMEOUT");
  const existing = await run.store.read<AudienceProfileJob>(run.key);
  assert(existing);
  const submission = {
    batchId,
    checksumMd5: existing.value.plan.checksumMd5,
    fileSizeBytes: existing.value.plan.fileSizeBytes,
  };
  const retained: AudienceProfileJob = {
    ...existing.value,
    identitySent: false,
    submission,
  };
  if (omitIdentityFlag) delete retained.identitySent;
  await run.store.compareAndSet(run.key, existing.version, retained);
  let time = 200_000,
    inspections = 0,
    reads = 0,
    events = 0;
  let linked = false,
    loseEventReceipt = false;
  run.dependencies.now = () => time;
  run.dependencies.importer = {
    submit: async () => {
      throw new Error("A first identity resume must never import.");
    },
    inspect: async (plan, receipt) => {
      inspections++;
      assert.deepEqual(plan, existing.value.plan);
      assert.deepEqual(receipt, submission);
      return { status: "verified", profileId };
    },
  };
  run.dependencies.readProfileRef = undefined;
  run.dependencies.transport = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === `/v1/events/v1.2/browser/${browserId}/show.json`) {
      assert.equal(init?.method, "GET");
      reads++;
      return Response.json({
        ref: browserId,
        customer: { ref: linked ? profileId : batchId },
      });
    }
    assert.equal(path, "/v1/events/v1.2/events");
    assert.equal(init?.method, "POST");
    const saved = await run.store.read<AudienceProfileJob>(run.key);
    assert.equal(
      saved?.value.identitySent,
      true,
      "The first event intent must already be durable.",
    );
    assert.equal(saved?.value.identityResumeUsed, true);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.browser_id, browserId);
    assert.deepEqual(body.identifiers, [
      { provider: "liberty-mutual-agent", id: existing.value.plan.identity },
    ]);
    events++;
    if (loseEventReceipt) throw new Error("private-lost-event-receipt");
    return new Response(null, { status: 201 });
  };
  return {
    ...run,
    original: existing.value,
    advance: (milliseconds = 4_000) => {
      time += milliseconds;
    },
    match: () => {
      linked = true;
    },
    loseReceipt: () => {
      loseEventReceipt = true;
    },
    counts: () => ({ inspections, reads, events }),
  };
}

test("an expired pre-IDENTITY interruption resumes the same proven browser once and sends its first event only after durable intent", async () => {
  for (const loseReceipt of [false, true]) {
    const run = await retainedUnsentIdentity(loseReceipt);
    if (loseReceipt) run.loseReceipt();
    assert.equal(
      (await prepareAudiencePreviewProfile(input, run.dependencies)).status,
      "pending",
    );
    const resumed = await run.store.read<AudienceProfileJob>(run.key);
    assert(resumed);
    assert.equal(resumed.value.phase, "binding");
    assert.equal(resumed.value.identityResumeUsed, true);
    assert.equal(resumed.value.identitySent, loseReceipt ? undefined : false);
    assert.equal(resumed.value.bindingStartedAt, 200_000);
    assert.equal(resumed.value.browserId, browserId);
    assert.equal(resumed.value.profileId, profileId);
    assert.deepEqual(resumed.value.plan, run.original.plan);
    assert.deepEqual(run.counts(), { inspections: 1, reads: 1, events: 0 });
    run.advance();
    assert.equal(
      (await prepareAudiencePreviewProfile(input, run.dependencies)).status,
      "pending",
    );
    run.advance();
    assert.equal(
      (await prepareAudiencePreviewProfile(input, run.dependencies)).status,
      "pending",
    );
    assert.equal(run.counts().events, 1);
    run.match();
    run.advance();
    assert.equal(
      (await prepareAudiencePreviewProfile(input, run.dependencies)).status,
      "ready",
    );
    const ready = await run.store.read<AudienceProfileJob>(run.key);
    assert.equal(ready?.value.identityResumeUsed, true);
    assert.equal(ready?.value.identitySent, true);
    assert.equal(run.counts().events, 1);
    assert.equal(run.counts().inspections, 1);
  }
});

test("a resumed clock cannot be reset again even if the process stops before the first identity event", async () => {
  const run = await retainedUnsentIdentity();
  await prepareAudiencePreviewProfile(input, run.dependencies);
  run.advance(121_000);
  for (let attempt = 0; attempt < 2; attempt++) {
    await assert.rejects(
      prepareAudiencePreviewProfile(input, run.dependencies),
      (error: unknown) =>
        error instanceof AudiencePreviewError &&
        error.code === "PROFILE_LINK_TIMEOUT",
    );
  }
  const saved = await run.store.read<AudienceProfileJob>(run.key);
  assert.equal(saved?.value.phase, "failed");
  assert.equal(saved?.value.bindingStartedAt, 200_000);
  assert.equal(saved?.value.identityResumeUsed, true);
  assert.equal(saved?.value.identitySent, false);
  assert.equal(run.counts().events, 0);
  assert.equal(run.counts().inspections, 1);
});

test("first-identity resume stays closed on missing, unreadable, wrong-target or nonindividual proof and altered canonical plans", async () => {
  for (const failure of [
    "missing",
    "unreadable",
    "wrong-target",
    "pending",
    "failed",
    "bulk",
    "altered-plan",
    "already-sent",
    "malformed-sent",
  ] as const) {
    const run = await retainedUnsentIdentity();
    const current = await run.store.read<AudienceProfileJob>(run.key);
    assert(current);
    const changed = { ...current.value };
    if (failure === "missing") delete changed.submission;
    if (failure === "bulk")
      changed.catalogProof = { ...changed.submission!, recordIndex: 0 };
    if (failure === "already-sent") changed.identitySent = true;
    if (failure === "malformed-sent")
      changed.identitySent = "false" as unknown as boolean;
    if (failure === "altered-plan")
      changed.plan = {
        ...changed.plan,
        payload: changed.plan.payload.replace('"Audience"', '"Altered"'),
      };
    await run.store.compareAndSet(run.key, current.version, changed);
    if (failure === "unreadable")
      run.dependencies.importer!.inspect = async () => {
        throw new AudiencePreviewError(
          "IMPORT_READ_UNAVAILABLE",
          "private-native-error",
          true,
        );
      };
    if (failure === "wrong-target")
      run.dependencies.importer!.inspect = async () => ({
        status: "verified",
        profileId: batchId,
      });
    if (failure === "pending" || failure === "failed")
      run.dependencies.importer!.inspect = async () => ({ status: failure });
    await assert.rejects(
      prepareAudiencePreviewProfile(input, run.dependencies),
      (error: unknown) =>
        error instanceof AudiencePreviewError &&
        error.code === "PROFILE_LINK_TIMEOUT",
    );
    const saved = await run.store.read<AudienceProfileJob>(run.key);
    assert.equal(saved?.value.phase, "failed");
    assert.equal(saved?.value.identityResumeUsed, undefined);
    assert.equal(saved?.value.bindingStartedAt, 15_000);
    assert.equal(saved?.value.browserId, browserId);
    assert.equal(saved?.value.profileId, profileId);
    assert.equal(run.counts().events, 0);
    if (
      [
        "missing",
        "bulk",
        "altered-plan",
        "already-sent",
        "malformed-sent",
      ].includes(failure)
    )
      assert.equal(run.counts().inspections, 0);
  }
});

test("only a strict readable mismatch can resume; a late exact match recovers without sending", async () => {
  for (const state of [
    "matched",
    "not-found",
    "http-failure",
    "invalid-response",
    "transport-failure",
  ] as const) {
    const run = await retainedUnsentIdentity();
    run.dependencies.transport = async (url, init) => {
      assert.equal(
        new URL(String(url)).pathname,
        `/v1/events/v1.2/browser/${browserId}/show.json`,
      );
      assert.equal(init?.method, "GET");
      if (state === "transport-failure")
        throw new Error("private-transport-error");
      if (state === "matched")
        return Response.json({ ref: browserId, customer: { ref: profileId } });
      return new Response("private-response", {
        status:
          state === "not-found" ? 404 : state === "http-failure" ? 503 : 200,
      });
    };
    if (state === "matched")
      assert.equal(
        (await prepareAudiencePreviewProfile(input, run.dependencies)).status,
        "ready",
      );
    else
      await assert.rejects(
        prepareAudiencePreviewProfile(input, run.dependencies),
        (error: unknown) =>
          error instanceof AudiencePreviewError &&
          error.code === "PROFILE_LINK_TIMEOUT",
      );
    const saved = await run.store.read<AudienceProfileJob>(run.key);
    assert.equal(saved?.value.identityResumeUsed, undefined);
    assert.equal(saved?.value.bindingStartedAt, 15_000);
    assert.equal(saved?.value.identitySent, false);
    assert.equal(run.counts().events, 0);
  }
});

test("concurrent pre-identity resume has one proof/read winner and cannot overwrite a concurrent ready result", async () => {
  for (const concurrentReady of [false, true]) {
    const run = await retainedUnsentIdentity();
    let release!: () => void, inspecting!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      inspecting = resolve;
    });
    const inspect = run.dependencies.importer!.inspect;
    run.dependencies.importer!.inspect = async (...args) => {
      inspecting();
      await waiting;
      return inspect(...args);
    };
    const first = prepareAudiencePreviewProfile(input, run.dependencies);
    await started;
    const second = await prepareAudiencePreviewProfile(input, run.dependencies);
    assert.equal(second.status, "pending");
    if (concurrentReady) {
      run.advance(46_000);
      const current = await run.store.read<AudienceProfileJob>(run.key);
      assert(current);
      await run.store.compareAndSet(run.key, current.version, {
        ...current.value,
        phase: "ready",
        identitySent: true,
      });
    }
    release();
    assert.equal((await first).status, concurrentReady ? "ready" : "pending");
    const saved = await run.store.read<AudienceProfileJob>(run.key);
    assert.equal(saved?.value.phase, concurrentReady ? "ready" : "binding");
    assert.equal(
      saved?.value.identityResumeUsed,
      concurrentReady ? undefined : true,
    );
    assert.equal(
      saved?.value.bindingStartedAt,
      concurrentReady ? 15_000 : 200_000,
    );
    assert.equal(run.counts().inspections, 1);
    assert.equal(run.counts().reads, 1);
    assert.equal(run.counts().events, 0);
  }
});

test("uncertain uploads and rejected import receipts remain terminal and never enter binding recovery", async () => {
  for (const code of [
    "IMPORT_UPLOAD_UNCONFIRMED",
    "IMPORT_VERIFICATION_FAILED",
  ]) {
    const { dependencies } = await retainedBinding("failed", code);
    dependencies.readProfileRef = async () => {
      throw new Error("Unverified imports must not read a binding.");
    };
    await assert.rejects(
      prepareAudiencePreviewProfile(input, dependencies),
      (error: unknown) =>
        error instanceof AudiencePreviewError && error.code === code,
    );
  }
});

test("an explicitly rejected IDENTITY receipt is recorded without replaying the event", async () => {
  const { dependencies, store, key } = await retainedBinding("binding");
  const existing = await store.read<Record<string, unknown>>(key);
  assert(existing);
  await store.compareAndSet(key, existing.version, {
    ...existing.value,
    identitySent: false,
    bindingStartedAt: 195_000,
  });
  let events = 0;
  dependencies.readProfileRef = async () => null;
  dependencies.transport = async (_url, init) => {
    assert.equal(init?.method, "POST");
    events++;
    return new Response(null, { status: 503 });
  };
  assert.equal(
    (await prepareAudiencePreviewProfile(input, dependencies)).status,
    "pending",
  );
  dependencies.now = () => 205_000;
  assert.equal(
    (await prepareAudiencePreviewProfile(input, dependencies)).status,
    "pending",
  );
  assert.equal(events, 1);
  const saved = await store.read<{ identitySent: boolean }>(key);
  assert.equal(saved?.value.identitySent, true);
});

test("concurrent timeout recovery returns pending to the CAS loser and promotes only an exact native match", async () => {
  const { dependencies, store, key } = await retainedBinding(
    "failed",
    "PROFILE_LINK_TIMEOUT",
  );
  const originalRead = store.read.bind(store);
  let initialReads = 0;
  let releaseBothReads!: () => void;
  const bothReads = new Promise<void>((resolve) => {
    releaseBothReads = resolve;
  });
  store.read = async <T>(
    requestedKey: string,
  ): Promise<StoredValue<T> | null> => {
    const value = await originalRead<T>(requestedKey);
    if (++initialReads <= 2) {
      if (initialReads === 2) releaseBothReads();
      await bothReads;
    }
    return value;
  };
  let releaseNativeRead!: () => void;
  const nativeRead = new Promise<void>((resolve) => {
    releaseNativeRead = resolve;
  });
  let nativeReads = 0;
  dependencies.readProfileRef = async () => {
    nativeReads++;
    await nativeRead;
    return profileId;
  };
  const first = prepareAudiencePreviewProfile(input, dependencies);
  const second = prepareAudiencePreviewProfile(input, dependencies);
  const early = await Promise.race([first, second]);
  assert.equal(early.status, "pending");
  assert.equal(nativeReads, 1);
  releaseNativeRead();
  const results = await Promise.all([first, second]);
  assert.equal(results.filter((result) => result.status === "ready").length, 1);
  assert.equal(
    results.filter((result) => result.status === "pending").length,
    1,
  );
  const saved = await originalRead<{ phase: string }>(key);
  assert.equal(saved?.value.phase, "ready");
});

test("native queue rejection defers the identical plan until Retry-After and CAS permits only one resumed upload", async () => {
  let time = 10_000;
  const uploads: unknown[] = [];
  const dependencies: AudienceProfileDependencies = {
    store: new MemoryStore(),
    namespace: "preview:test",
    siteName: "liberty-mutual-agent-portal",
    edgeUrl: "https://edge-platform.sitecorecloud.io",
    contextId: "test-context",
    now: () => time,
    importer: {
      submit: async (plan) => {
        uploads.push(structuredClone(plan));
        if (uploads.length === 1) throw new PreviewImportQueueBusyError(35);
        return {
          batchId,
          checksumMd5: plan.checksumMd5,
          fileSizeBytes: plan.fileSizeBytes,
        };
      },
      inspect: async () => ({ status: "pending" }),
    },
  };
  const first = await prepareAudiencePreviewProfile(input, dependencies);
  assert.equal(first.status, "pending");
  if (first.status !== "pending")
    throw new Error("Expected queued preparation.");
  assert.equal(first.waitingForAnotherAudience, true);
  assert.equal(first.retryAfterSeconds, 35);
  time += 34_000;
  assert.equal(
    (await prepareAudiencePreviewProfile(input, dependencies)).status,
    "pending",
  );
  assert.equal(uploads.length, 1);
  time += 1_000;
  const resumed = await Promise.all([
    prepareAudiencePreviewProfile(input, dependencies),
    prepareAudiencePreviewProfile(input, dependencies),
  ]);
  assert(resumed.every((result) => result.status === "pending"));
  assert.equal(uploads.length, 2);
  assert.deepEqual(uploads[0], uploads[1]);
});

test("a legacy uncertain upload reuses an exact recovered receipt without another upload", async () => {
  const { dependencies, store, key } = await retainedBinding(
    "failed",
    "IMPORT_UPLOAD_UNCONFIRMED",
  );
  let submitted = false;
  dependencies.importer = {
    submit: async () => {
      submitted = true;
      throw new Error("Reconciliation must be read-only.");
    },
    inspect: async () => {
      throw new Error("Exact completed receipts already passed validation.");
    },
    reconcile: async (plan) => ({
      status: "verified",
      profileId,
      submission: {
        batchId,
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
      },
    }),
  };
  assert.equal(
    (await prepareAudiencePreviewProfile(input, dependencies)).status,
    "pending",
  );
  assert.equal(submitted, false);
  const saved = await store.read<{
    phase: string;
    profileId: string;
    code?: string;
  }>(key);
  assert.equal(saved?.value.phase, "binding");
  assert.equal(saved?.value.profileId, profileId);
  assert.equal(saved?.value.code, undefined);
});

test("a bounded unconfirmed lookup allows one identical UPSERT with a fresh persisted lease and attempt time", async () => {
  const { dependencies, store, key } = await retainedBinding(
    "failed",
    "IMPORT_UPLOAD_UNCONFIRMED",
  );
  const original = await store.read<{ plan: unknown }>(key);
  let time = 200_000;
  let uploads = 0;
  dependencies.now = () => time;
  dependencies.importer = {
    reconcile: async () => {
      time += 50_000;
      return { status: "unconfirmed" };
    },
    submit: async (plan) => {
      uploads++;
      assert.deepEqual(plan, original?.value.plan);
      const recorded = await store.read<{
        uncertainRetryUsed: boolean;
        lease: { expiresAt: number };
        lastUploadAttemptAt: number;
      }>(key);
      assert.equal(recorded?.value.uncertainRetryUsed, true);
      assert.equal(recorded?.value.lastUploadAttemptAt, time);
      assert(recorded && recorded.value.lease.expiresAt > time);
      return {
        batchId,
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
      };
    },
    inspect: async () => ({ status: "pending" }),
  };
  assert.equal(
    (await prepareAudiencePreviewProfile(input, dependencies)).status,
    "pending",
  );
  assert.equal(uploads, 1);
  const saved = await store.read<{ phase: string; plan: unknown }>(key);
  assert.equal(saved?.value.phase, "verifying");
  assert.deepEqual(saved?.value.plan, original?.value.plan);
});

test("a second unknown receipt can reconcile again but cannot spend another upload retry", async () => {
  const { dependencies } = await retainedBinding(
    "failed",
    "IMPORT_UPLOAD_UNCONFIRMED",
  );
  let uploads = 0,
    reads = 0;
  dependencies.importer = {
    reconcile: async () => {
      reads++;
      return { status: "unconfirmed" };
    },
    submit: async () => {
      uploads++;
      throw new Error("unknown second receipt");
    },
    inspect: async () => ({ status: "pending" }),
  };
  for (let attempt = 0; attempt < 2; attempt++)
    await assert.rejects(
      prepareAudiencePreviewProfile(input, dependencies),
      (error: unknown) =>
        error instanceof AudiencePreviewError &&
        error.code === "IMPORT_UPLOAD_UNCONFIRMED",
    );
  assert.equal(uploads, 1);
  assert.equal(reads, 2);
});

test("an unavailable reconciliation stays pending without risking another native upload", async () => {
  const { dependencies } = await retainedBinding(
    "failed",
    "IMPORT_UPLOAD_UNCONFIRMED",
  );
  dependencies.importer = {
    reconcile: async () => {
      throw new AudiencePreviewError(
        "IMPORT_READ_UNAVAILABLE",
        "private response",
        true,
      );
    },
    submit: async () => {
      throw new Error("An unreadable native list must not trigger upload.");
    },
    inspect: async () => ({ status: "pending" }),
  };
  assert.equal(
    (await prepareAudiencePreviewProfile(input, dependencies)).status,
    "pending",
  );
});
