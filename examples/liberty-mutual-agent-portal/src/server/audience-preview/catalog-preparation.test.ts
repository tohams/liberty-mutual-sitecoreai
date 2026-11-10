import assert from "node:assert/strict";
import test, { before } from "node:test";
import type { StateStore, StoredValue } from "../state/store";
import { AUDIENCE_PREVIEW_SCENARIOS } from "@/features/audience-preview/scenarios";
import {
  audiencePreviewProfileKey,
  audienceSelectorHash,
  prepareAudienceProfileImport,
  prepareAudiencePreviewProfile,
  type AudienceProfileJob,
} from "./profiles";
import { PreviewImportQueueBusyError } from "./importer";
import { AudiencePreviewError } from "./contracts";
import type { CatalogImportPlan, CatalogImporter } from "./catalog-importer";

process.env.SITECORE_EDGE_CONTEXT_ID = "catalog-synthetic-context";
let advanceCatalogPreparation: typeof import("./catalog-preparation").advanceCatalogPreparation;
let readCatalogPreparation: typeof import("./catalog-preparation").readCatalogPreparation;
before(async () => {
  ({ advanceCatalogPreparation, readCatalogPreparation } =
    await import("./catalog-preparation"));
});
type Dependencies =
  import("./catalog-preparation").CatalogPreparationDependencies;
const uuid = (index: number) =>
  `11111111-1111-4111-8111-${index.toString().padStart(12, "0")}`;
const page = {
  id: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
  name: "Home",
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
  siteName: "liberty-mutual-agent-portal",
  language: "en",
  version: 1,
};
class MemoryStore implements StateStore {
  values = new Map<string, StoredValue<unknown>>();
  async read<T>(key: string) {
    return structuredClone(
      this.values.get(key) || null,
    ) as StoredValue<T> | null;
  }
  async compareAndSet<T>(key: string, expected: number | null, value: T) {
    const current = this.values.get(key);
    if ((current?.version ?? null) !== expected) return null;
    const next = {
      version: (current?.version ?? -1) + 1,
      value: structuredClone(value),
      expiresAt: null,
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
function harness() {
  const store = new MemoryStore();
  let time = 10_000,
    serial = 1_000,
    uploads = 0,
    verifications = 0;
  const submitted: CatalogImportPlan[] = [];
  const importer: CatalogImporter = {
    submit: async (plan) => {
      uploads++;
      submitted.push(structuredClone(plan));
      return {
        batchId: uuid(900),
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
      };
    },
    inspect: async (plan, submission) => ({
      status: "verified",
      submission,
      profileIds: plan.plans.map((_entry, index) => uuid(100 + index)),
    }),
    reconcile: async () => ({ status: "unconfirmed" }),
  };
  const deps: Dependencies = {
    profiles: {
      store,
      namespace: "catalog:test",
      siteName: page.siteName,
      edgeUrl: "https://edge-platform.sitecorecloud.io",
      contextId: "synthetic-context",
      now: () => time,
    },
    decisions: {
      siteName: page.siteName,
      edgeUrl: "https://edge-platform.sitecorecloud.io",
      contextId: "synthetic-context",
      discovery: { getPersonalizeInfo: async () => undefined },
    },
    importer,
    now: () => time,
    uuid: () => uuid(serial++),
    prepareProfile: async (input) => {
      const selectorHash = audienceSelectorHash(
        input,
        "catalog:test",
        page.siteName,
      );
      const key = audiencePreviewProfileKey(selectorHash, "catalog:test");
      const current = await store.read<AudienceProfileJob>(key);
      assert(current);
      assert.equal(current.value.phase, "binding");
      assert.equal(current.value.catalogProof?.batchId, uuid(900));
      const profileId = current.value.profileId!;
      const browserId = uuid(
        500 +
          AUDIENCE_PREVIEW_SCENARIOS.findIndex(
            (entry) =>
              audienceSelectorHash(entry, "catalog:test", page.siteName) ===
              selectorHash,
          ),
      );
      await store.compareAndSet(key, current.version, {
        ...current.value,
        phase: "ready",
        browserId,
      });
      return {
        status: "ready",
        profile: {
          selectorHash,
          identity: current.value.plan.identity,
          profileId,
          browserId,
        },
      };
    },
    verifyProfile: async () => {
      verifications++;
    },
  };
  return {
    store,
    deps,
    importer,
    submitted,
    advance: (milliseconds = 4_000) => {
      time += milliseconds;
    },
    uploads: () => uploads,
    verifications: () => verifications,
  };
}

test("a single exact bulk import warms all42 profiles and verifies every row without view URLs", async () => {
  const run = harness();
  assert.equal((await readCatalogPreparation(page, run.deps)).status, "idle");
  let result = await advanceCatalogPreparation(page, run.deps);
  for (let index = 0; index < 70 && result.status !== "ready"; index++) {
    run.advance();
    const simultaneous = await Promise.all([
      advanceCatalogPreparation(page, run.deps),
      advanceCatalogPreparation(page, run.deps),
    ]);
    result =
      simultaneous.find((entry) => entry.status === "ready") || simultaneous[0];
  }
  assert.equal(result.status, "ready");
  assert.equal(result.readyCount, 42);
  assert.equal(run.uploads(), 1);
  assert.equal(run.submitted[0].plans.length, 42);
  assert.equal(run.verifications(), 42);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("profileId"), false);
  assert.equal(serialized.includes("previewUrl"), false);
  assert.equal(
    [...run.store.values.keys()].some((key) => key.includes(":view:")),
    false,
  );
});

test("catalog reservations stop ordinary preparation from creating individual imports", async () => {
  const run = harness();
  await advanceCatalogPreparation(page, run.deps);
  let submitted = false;
  const result = await prepareAudiencePreviewProfile(
    AUDIENCE_PREVIEW_SCENARIOS[0],
    {
      ...run.deps.profiles,
      importer: {
        submit: async () => {
          submitted = true;
          throw new Error("Unexpected upload");
        },
        inspect: async () => ({ status: "pending" }),
      },
    },
  );
  assert.equal(result.status, "pending");
  assert.equal(submitted, false);
});

test("later reserved rows have no binding deadline before a first identity intent", async () => {
  const run = harness();
  for (let index = 0; index < 16; index++) {
    run.advance();
    await advanceCatalogPreparation(page, run.deps);
  }
  const lastInput = AUDIENCE_PREVIEW_SCENARIOS[41];
  const lastKey = audiencePreviewProfileKey(
    audienceSelectorHash(lastInput, "catalog:test", page.siteName),
    "catalog:test",
  );
  const waiting = await run.store.read<AudienceProfileJob>(lastKey);
  assert(waiting);
  assert.equal(waiting.value.phase, "catalog");
  assert.equal(waiting.value.bindingStartedAt, undefined);
  run.advance(600_000);
  const original = run.deps.prepareProfile!;
  run.deps.prepareProfile = async (...args) => {
    const hash = audienceSelectorHash(args[0], "catalog:test", page.siteName);
    const current = await run.store.read<AudienceProfileJob>(
      audiencePreviewProfileKey(hash, "catalog:test"),
    );
    assert(current);
    assert.equal(current.value.bindingStartedAt, undefined);
    return original(...args);
  };
  for (let index = 0; index < 14; index++) {
    run.advance();
    await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal((await readCatalogPreparation(page, run.deps)).status, "ready");
});

test("a duplicate final profile cannot report a ready catalog even after all native reads completed", async () => {
  const run = harness();
  const original = run.deps.prepareProfile!;
  run.deps.prepareProfile = async (...args) => {
    const result = await original(...args);
    if (result.status === "ready" && result.profile.profileId === uuid(141))
      result.profile.profileId = uuid(100);
    return result;
  };
  let result = await advanceCatalogPreparation(page, run.deps);
  for (let index = 0; index < 70 && result.status !== "failed"; index++) {
    run.advance();
    result = await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal(result.status, "failed");
  assert.equal(result.readyCount, 40);
  assert.equal(result.failedCount, 2);
});

test("a confirmed native queue rejection waits and reuses the same aggregate bytes", async () => {
  const run = harness();
  const plans: string[] = [];
  run.importer.submit = async (plan) => {
    plans.push(plan.payload);
    if (plans.length === 1) throw new PreviewImportQueueBusyError(30);
    return {
      batchId: uuid(900),
      checksumMd5: plan.checksumMd5,
      fileSizeBytes: plan.fileSizeBytes,
    };
  };
  for (let index = 0; index < 15; index++) {
    run.advance();
    await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal(plans.length, 1);
  for (let index = 0; index < 9; index++) {
    run.advance();
    await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal(plans.length, 2);
  assert.equal(plans[0], plans[1]);
});

test("existing ready profiles are preserved and verified without another native import", async () => {
  const run = harness();
  for (const [index, input] of AUDIENCE_PREVIEW_SCENARIOS.entries()) {
    const plan = prepareAudienceProfileImport(
      input,
      "catalog:test",
      page.siteName,
      uuid(2000 + index),
    );
    await run.store.compareAndSet(
      audiencePreviewProfileKey(plan.selectorHash, "catalog:test"),
      null,
      {
        schemaVersion: 1,
        phase: "ready",
        plan,
        createdAt: 100,
        profileId: uuid(100 + index),
        browserId: uuid(500 + index),
      },
    );
  }
  run.deps.prepareProfile = async (input) => {
    const hash = audienceSelectorHash(input, "catalog:test", page.siteName);
    const stored = await run.store.read<AudienceProfileJob>(
      audiencePreviewProfileKey(hash, "catalog:test"),
    );
    assert(stored);
    assert.equal(stored.value.phase, "ready");
    assert.equal(stored.version, 0);
    return {
      status: "ready",
      profile: {
        selectorHash: hash,
        identity: stored.value.plan.identity,
        profileId: stored.value.profileId!,
        browserId: stored.value.browserId!,
      },
    };
  };
  let result = await advanceCatalogPreparation(page, run.deps);
  for (let index = 0; index < 65 && result.status !== "ready"; index++) {
    run.advance();
    result = await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal(result.status, "ready");
  assert.equal(run.uploads(), 0);
  assert.equal(run.verifications(), 42);
});

test("unknown bulk receipts receive only one exact fallback while reconciliation remains read-only", async () => {
  const run = harness();
  const payloads: string[] = [];
  let reads = 0;
  run.importer.submit = async (plan) => {
    payloads.push(plan.payload);
    throw new Error("Unknown native acceptance");
  };
  run.importer.reconcile = async () => {
    reads++;
    return { status: "unconfirmed" };
  };
  let result = await advanceCatalogPreparation(page, run.deps);
  for (let index = 0; index < 30 && result.status !== "failed"; index++) {
    run.advance();
    result = await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal(result.status, "failed");
  for (let index = 0; index < 3; index++) {
    run.advance();
    await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0], payloads[1]);
  assert(reads >= 2);
});

test("native decision or layout verification failure cannot be counted ready", async () => {
  const run = harness();
  run.deps.verifyProfile = async () => {
    throw new Error("Unverified native layout");
  };
  let result = await advanceCatalogPreparation(page, run.deps);
  for (let index = 0; index < 25 && result.status !== "failed"; index++) {
    run.advance();
    result = await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal(result.status, "failed");
  assert.equal(result.readyCount, 0);
  assert(result.failedCount > 0);
});

test("GET diagnoses a legacy retained link failure from state alone and preserves verified progress", async () => {
  const run = harness();
  // Create all reservations, stopping before the aggregate upload.
  for (let index = 0; index < 14; index++) {
    run.advance();
    await advanceCatalogPreparation(page, run.deps);
  }
  const catalogKey = [...run.store.values.keys()].find((key) =>
    key.includes(":catalog:"),
  );
  assert(catalogKey);
  const manifest = await run.store.read<{
    phase: string;
    rows: {
      index: number;
      selectorHash: string;
      source: string;
      verifiedFor?: string;
      failureFor?: string;
      profileId?: string;
    }[];
  }>(catalogKey);
  assert(manifest);
  const targetPage = `${page.id}:${page.language}:${page.version}`;
  manifest.value.phase = "preparing";
  for (const row of manifest.value.rows.slice(0, 21)) {
    row.verifiedFor = targetPage;
    row.profileId = uuid(100 + row.index);
  }
  const failed = manifest.value.rows[22];
  assert.equal(AUDIENCE_PREVIEW_SCENARIOS[22].role, "account-executive");
  assert.deepEqual(AUDIENCE_PREVIEW_SCENARIOS[22].licensedStates, ["FL"]);
  failed.source = "existing";
  failed.failureFor = targetPage;
  await run.store.compareAndSet(catalogKey, manifest.version, manifest.value);
  const key = audiencePreviewProfileKey(failed.selectorHash, "catalog:test");
  const profile = await run.store.read<AudienceProfileJob>(key);
  assert(profile);
  await run.store.compareAndSet(key, profile.version, {
    ...profile.value,
    phase: "failed",
    code: "PROFILE_LINK_TIMEOUT",
    profileId: uuid(122),
    browserId: uuid(522),
    identitySent: true,
    submission: {
      batchId: uuid(900),
      checksumMd5: profile.value.plan.checksumMd5,
      fileSizeBytes: profile.value.plan.fileSizeBytes,
    },
  });
  run.deps.prepareProfile = async () => {
    throw new Error("GET must not prepare profiles");
  };
  run.deps.verifyProfile = async () => {
    throw new Error("GET must not read native decisions/layout");
  };
  const retainedState = structuredClone(run.store.values);
  const result = await readCatalogPreparation(page, run.deps);
  assert.equal(result.status, "failed");
  assert.equal(result.readyCount, 21);
  assert.equal(result.failedCount, 1);
  assert.equal(result.pendingCount, 20);
  assert.deepEqual(result.failedRows, [
    {
      index: 22,
      stage: "profile-preparation",
      code: "PROFILE_LINK_TIMEOUT",
      source: "existing",
      profilePhase: "failed",
      profileCode: "PROFILE_LINK_TIMEOUT",
      identitySent: true,
      hasCatalogProof: false,
      hasSubmissionProof: true,
    },
  ]);
  assert.deepEqual(run.store.values, retainedState);
  assert.equal(run.uploads(), 0);
  const serialized = JSON.stringify(result);
  for (const sensitive of [
    uuid(122),
    uuid(522),
    uuid(900),
    profile.value.plan.identity,
    profile.value.plan.payload,
  ]) {
    assert.equal(serialized.includes(sensitive), false);
  }
});

test("typed profile and native verification failures persist bounded row stage/code/status", async () => {
  for (const stage of ["profile-preparation", "native-decision"] as const) {
    const run = harness();
    const fail = async () => {
      throw Object.assign(
        new AudiencePreviewError(
          "PROFILE_LINK_TIMEOUT",
          "private-provider-details",
        ),
        { status: 503, profileId: "private-profile" },
      );
    };
    if (stage === "profile-preparation") run.deps.prepareProfile = fail;
    else run.deps.verifyProfile = fail;
    let result = await advanceCatalogPreparation(page, run.deps);
    for (let index = 0; index < 25 && result.status !== "failed"; index++) {
      run.advance();
      result = await advanceCatalogPreparation(page, run.deps);
    }
    assert.equal(result.status, "failed");
    assert.deepEqual(result.failedRows?.[0], {
      index: 0,
      stage,
      code: "PROFILE_LINK_TIMEOUT",
      status: 503,
      source: "bulk",
    });
    assert.equal(
      JSON.stringify(result).includes("private-provider-details"),
      false,
    );
    const stored = [...run.store.values.entries()].find(([key]) =>
      key.includes(":catalog:"),
    );
    assert(stored);
    const diagnostic = (stored[1].value as { rows: { failure?: unknown }[] })
      .rows[0].failure;
    assert.deepEqual(diagnostic, {
      index: 0,
      stage,
      code: "PROFILE_LINK_TIMEOUT",
      status: 503,
    });
  }
});

test("a retained bulk timeout revalidates the complete receipt through the catalog worker without changing the22 verified rows or importing again", async () => {
  const run = harness();
  let progress = await advanceCatalogPreparation(page, run.deps);
  for (let count = 0; count < 70 && progress.status !== "ready"; count++) {
    run.advance();
    progress = await advanceCatalogPreparation(page, run.deps);
  }
  assert.equal(progress.status, "ready");
  const catalogKey = [...run.store.values.keys()].find((key) =>
    key.includes(":catalog:"),
  );
  assert(catalogKey);
  const manifest = await run.store.read<{
    rows: {
      index: number;
      selectorHash: string;
      verifiedFor?: string;
      failureFor?: string;
    }[];
  }>(catalogKey);
  assert(manifest);
  const verifiedRows = structuredClone(manifest.value.rows.slice(0, 22));
  for (const row of manifest.value.rows.slice(22)) delete row.verifiedFor;
  const target = manifest.value.rows[23];
  target.failureFor = `${page.id}:${page.language}:${page.version}`;
  await run.store.compareAndSet(catalogKey, manifest.version, manifest.value);
  const key = audiencePreviewProfileKey(target.selectorHash, "catalog:test");
  const current = await run.store.read<AudienceProfileJob>(key);
  assert(current?.value.catalogProof);
  await run.store.compareAndSet(key, current.version, {
    ...current.value,
    phase: "failed",
    code: "PROFILE_LINK_TIMEOUT",
    identitySent: false,
    bindingStartedAt: 1,
  });
  let receiptReads = 0,
    browserReads = 0;
  const inspect = run.importer.inspect;
  run.importer.inspect = async (...args) => {
    receiptReads++;
    return inspect(...args);
  };
  run.deps.profiles.transport = async (url, init) => {
    assert.equal(init?.method, "GET");
    assert.equal(
      new URL(String(url)).pathname,
      `/v1/events/v1.2/browser/${current.value.browserId}/show.json`,
    );
    browserReads++;
    return Response.json({
      ref: current.value.browserId,
      customer: { ref: uuid(999) },
    });
  };
  run.deps.prepareProfile = async (input, dependencies) => {
    if (
      audienceSelectorHash(input, "catalog:test", page.siteName) !==
      target.selectorHash
    )
      return { status: "pending", retryAfterSeconds: 3 };
    return prepareAudiencePreviewProfile(input, dependencies);
  };
  run.advance(600_000);
  progress = await advanceCatalogPreparation(page, run.deps);
  assert.equal(progress.status, "pending");
  assert.equal(progress.readyCount, 22);
  assert.equal(progress.failedCount, 0);
  assert.equal(run.uploads(), 1);
  assert.equal(run.verifications(), 42);
  assert.equal(receiptReads, 1);
  assert.equal(browserReads, 1);
  const resumed = await run.store.read<AudienceProfileJob>(key);
  assert.equal(resumed?.value.phase, "binding");
  assert.equal(resumed?.value.bindingStartedAt, undefined);
  assert.equal(resumed?.value.identitySent, false);
  assert.equal(resumed?.value.browserId, current.value.browserId);
  assert.equal(resumed?.value.profileId, current.value.profileId);
  assert.deepEqual(resumed?.value.plan, current.value.plan);
  assert.deepEqual(resumed?.value.catalogProof, current.value.catalogProof);
  const after = await run.store.read<typeof manifest.value>(catalogKey);
  assert.deepEqual(after?.value.rows.slice(0, 22), verifiedRows);
});
