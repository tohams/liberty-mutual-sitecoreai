import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getPack, packStateKey, type PackMetadata } from "../data/pack-state";
import { type ProfileImporter } from "../data/reviewer-restart";
import { LocalJsonStateStore, type StateStore } from "../state/store";
import {
  prepareProfileImport,
  restoreProfileImportPlan,
} from "../udl/profile-import";
import { PortalError } from "../errors";
import {
  getWorkshopResetStatus,
  parseWorkshopResetRequest,
  requestWorkshopReset,
} from "./reset";
import type { WorkshopResetRequest } from "@/features/workshops/reset.types";
import manifest from "../../../fixtures/manifest.json";

let directory: string;
let oldEnvironment: Record<string, string | undefined>;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "workshop-reset-test-"));
  const environment = {
    PORTAL_ENVIRONMENT: "workshop-reset-tests",
    SITECORE_PROFILE_IMPORT_URL: "",
    SITECORE_PROFILE_IMPORT_API_KEY: "",
  };
  oldEnvironment = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
});
after(async () => {
  for (const [key, value] of Object.entries(oldEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(directory, { recursive: true, force: true });
});
const storeFor = (name: string) =>
  new LocalJsonStateStore(join(directory, name));
const code = (expected: string) => (error: unknown) =>
  error instanceof PortalError && error.code === expected;
async function intent(
  store: StateStore,
  mode: WorkshopResetRequest["mode"] = "restart",
  reviewerPack = "15",
): Promise<WorkshopResetRequest> {
  return {
    reviewerPack,
    mode,
    requestId: randomUUID(),
    expectedRunId: (await getPack(store, reviewerPack)).value.runId,
  };
}
function fakeImporter() {
  const calls = { uploads: 0, inspections: 0, failVerification: false };
  const importer: ProfileImporter = {
    assertConfigured() {},
    prepareProfileImport,
    restoreProfileImportPlan,
    async submitProfileImport(plan) {
      calls.uploads++;
      return {
        batchId: randomUUID(),
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
      };
    },
    async inspectProfileImport(plan, submission) {
      calls.inspections++;
      if (calls.failVerification)
        return {
          status: "failed",
          code: "IMPORT_VERIFICATION_FAILED",
          message:
            "Never forward this upstream message or synthetic-private-key.",
        };
      return {
        status: "verified",
        receipt: {
          ...submission,
          counts: { CREATED: 7, UPDATED: 0, FAILED: 0 },
          verifiedAt: new Date().toISOString(),
          profiles: plan.profiles.map((profile) => ({
            ...profile,
            profileId: randomUUID(),
          })),
        },
      };
    },
  };
  return { importer, calls };
}

test("only bounded packs and explicit reset contracts are accepted", () => {
  const valid = {
    reviewerPack: "01",
    mode: "restart",
    requestId: randomUUID(),
    expectedRunId: randomUUID(),
  };
  for (const reviewerPack of manifest.reviewerPacks) {
    const selected = { ...valid, reviewerPack };
    assert.deepEqual(parseWorkshopResetRequest(selected), selected);
  }
  for (const invalid of [
    null,
    [],
    { ...valid, reviewerPack: "00" },
    { ...valid, reviewerPack: "21" },
    { ...valid, mode: "persist-workspace" },
    { ...valid, host: "https://elsewhere.example" },
    { ...valid, url: "/api/portal/operator/reset" },
    { ...valid, requestId: "anything" },
    { ...valid, expectedRunId: "" },
    { ...valid, mode: "saved-work" },
    { ...valid, mode: "restart", resumeVerification: "true" },
  ])
    assert.throws(
      () => parseWorkshopResetRequest(invalid),
      code("INVALID_INPUT"),
    );
});

test("GET exposes a resumable native operation without advancing it; another request cannot replace it", async () => {
  const store = storeFor("pending");
  const request = await intent(store, "restart");
  const { importer, calls } = fakeImporter();
  const pending = await requestWorkshopReset(request, { store, importer });
  assert.equal(pending.operation.status, "pending");
  assert.equal(pending.operation.retryAfterSeconds, 3);
  const before = await getPack(store, "15");
  const status = await getWorkshopResetStatus("15", undefined, {
    store,
    importer,
  });
  assert.equal(status.pendingOperation?.requestId, request.requestId);
  assert.equal(status.restartAvailable, true);
  assert.deepEqual(await getPack(store, "15"), before);
  assert.deepEqual(calls, {
    uploads: 1,
    inspections: 0,
    failVerification: false,
  });
  await assert.rejects(
    async () => requestWorkshopReset(await intent(store), { store }),
    code("RESTART_PENDING"),
  );
  assert.deepEqual(await getPack(store, "15"), before);
  await assert.rejects(
    () =>
      requestWorkshopReset(
        { ...request, expectedRunId: randomUUID() },
        { store, importer },
      ),
    code("VERSION_CONFLICT"),
  );
});

for (const reviewerPack of manifest.reviewerPacks.filter(
  (pack) => Number(pack) >= 15,
)) {
  test(`native completion resets only pack ${reviewerPack} and returns all seven verified identities idempotently`, async () => {
    const store = storeFor(`native-complete-${reviewerPack}`);
    const request = await intent(store, "restart", reviewerPack);
    const { importer, calls } = fakeImporter();
    const otherPacks = ["01", "14", "15", "16", "17", "18", "19", "20"].filter(
      (pack) => pack !== reviewerPack,
    );
    const untouched = await Promise.all(
      otherPacks.map((pack) => getPack(store, pack)),
    );
    const priorProfiles = (
      await getWorkshopResetStatus(reviewerPack, undefined, { store })
    ).profiles;
    await requestWorkshopReset(request, { store, importer });
    const completed = await requestWorkshopReset(request, { store, importer });
    assert.equal(completed.operation.status, "completed");
    assert.equal(completed.operation.requiresPortalSignIn, true);
    assert.equal(completed.profileGeneration, 1);
    assert.notEqual(completed.runId, request.expectedRunId);
    assert.deepEqual(
      await Promise.all(otherPacks.map((pack) => getPack(store, pack))),
      untouched,
    );
    assert.equal(completed.profiles.length, 7);
    assert.ok(
      completed.profiles.every(
        (profile) =>
          priorProfiles.find((prior) => prior.username === profile.username)
            ?.identifier !== profile.identifier,
      ),
    );
    assert.ok(
      completed.profiles.every(
        (profile) =>
          profile.profileId &&
          profile.identifier &&
          profile.username.endsWith(`.${reviewerPack}`),
      ),
    );
    assert.deepEqual(
      await requestWorkshopReset(request, { store, importer }),
      completed,
    );
    assert.equal(calls.uploads, 1);
    const active = await getPack(store, reviewerPack);
    await assert.rejects(
      () =>
        requestWorkshopReset(
          { ...request, requestId: randomUUID() },
          { store, importer },
        ),
      code("VERSION_CONFLICT"),
    );
    await assert.rejects(
      () =>
        requestWorkshopReset(
          { ...request, expectedRunId: randomUUID() },
          { store, importer },
        ),
      code("IDEMPOTENCY_CONFLICT"),
    );
    assert.deepEqual(await getPack(store, reviewerPack), active);
    for (const privateField of [
      "checksumMd5",
      "correlationId",
      "identityScope",
      "batchId",
      "plan",
      "synthetic-private-key",
    ]) {
      assert.equal(JSON.stringify(completed).includes(privateField), false);
    }
  });
}

test("failed native verification can resume the same import without uploading again", async () => {
  const store = storeFor("resume");
  const request = await intent(store, "restart");
  const { importer, calls } = fakeImporter();
  await requestWorkshopReset(request, { store, importer });
  calls.failVerification = true;
  const failed = await requestWorkshopReset(request, { store, importer });
  assert.equal(failed.operation.status, "failed");
  assert.equal(failed.operation.canResumeVerification, true);
  assert.equal(failed.runId, request.expectedRunId);
  assert.doesNotMatch(
    JSON.stringify(failed),
    /synthetic-private-key|upstream message/,
  );
  const before = await getPack(store, "15");
  assert.equal(
    (await getWorkshopResetStatus("15", undefined, { store, importer }))
      .operation?.requestId,
    request.requestId,
  );
  assert.deepEqual(await getPack(store, "15"), before);
  calls.failVerification = false;
  const complete = await requestWorkshopReset(
    { ...request, resumeVerification: true },
    { store, importer },
  );
  assert.equal(complete.operation.status, "completed");
  assert.equal(calls.uploads, 1);
});

test("native configuration is exposed only as a boolean and missing configuration leaves the run unchanged", async () => {
  const store = storeFor("unconfigured");
  const request = await intent(store, "restart");
  const before = await getPack(store, "15");
  assert.equal(
    (await getWorkshopResetStatus("15", undefined, { store })).restartAvailable,
    false,
  );
  await assert.rejects(
    () => requestWorkshopReset(request, { store }),
    code("CONFIGURATION_REQUIRED"),
  );
  assert.deepEqual(await getPack(store, "15"), before);
  assert.equal(
    (await store.read<PackMetadata>(packStateKey("15")))?.value.pendingRestart,
    undefined,
  );
});
