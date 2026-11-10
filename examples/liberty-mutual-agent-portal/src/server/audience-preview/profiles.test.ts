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
  type PreviewProfileImporter,
} from "./importer";
import {
  audienceSelectorHash,
  prepareAudiencePreviewProfile,
  prepareAudienceProfileImport,
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
    /not been submitted again/,
  );
  await assert.rejects(
    prepareAudiencePreviewProfile(input, dependencies),
    /not been submitted again/,
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
    /not been submitted again/,
  );
  await assert.rejects(
    prepareAudiencePreviewProfile(input, dependencies),
    /not been submitted again/,
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
