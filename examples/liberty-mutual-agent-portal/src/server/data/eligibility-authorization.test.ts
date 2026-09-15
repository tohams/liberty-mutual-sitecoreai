import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, test } from "node:test";
import type { PortalBootstrap } from "../../contracts/portal";
import type { PortalSession } from "../auth/session";
import type { StateStore, StoredValue } from "../state/store";
import { fixtures, validateFixtures } from "./fixtures";
import { applyPortalAction, getPortalBootstrap } from "./portal";
import { canAccessResourcePage } from "./resource-page-access";
import type { RouteData } from "@sitecore-content-sdk/nextjs";

class MemoryStore implements StateStore {
  records = new Map<string, StoredValue<unknown>>();
  writes = 0;
  async read<T>(key: string): Promise<StoredValue<T> | null> {
    return structuredClone(
      this.records.get(key) ?? null,
    ) as StoredValue<T> | null;
  }
  async compareAndSet<T>(
    key: string,
    version: number | null,
    value: T,
    ttl: number,
  ): Promise<StoredValue<T> | null> {
    if ((this.records.get(key)?.version ?? null) !== version) return null;
    const next = {
      version: (version ?? -1) + 1,
      value: structuredClone(value),
      expiresAt: Date.now() + ttl * 1000,
    };
    this.records.set(key, next);
    this.writes++;
    return structuredClone(next);
  }
}
before(() => {
  process.env.PORTAL_ENVIRONMENT = "eligibility-tests";
  process.env.PORTAL_CONTENT_ADAPTER = "fixtures";
});
function session(agentId: string): PortalSession {
  return {
    agentId,
    agencyId: fixtures.agents.find((entry) => entry.id === agentId)!.agencyId,
    reviewerPack: "01",
    username: `${agentId}.01`,
    sessionId: randomUUID(),
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
}
function metadata(value: PortalBootstrap) {
  return {
    expectedVersion: value.session.stateVersion,
    runId: value.session.runId,
    idempotencyKey: randomUUID(),
  };
}
async function act(
  actor: PortalSession,
  input: Record<string, unknown>,
  store: MemoryStore,
) {
  return applyPortalAction(
    actor,
    { ...input, ...metadata(await getPortalBootstrap(actor, store)) },
    store,
  );
}
async function deniedWithoutWrite(
  actor: PortalSession,
  input: Record<string, unknown>,
  store: MemoryStore,
  code = "FORBIDDEN",
) {
  const bootstrap = await getPortalBootstrap(actor, store);
  const writes = store.writes;
  const records = structuredClone(store.records);
  await assert.rejects(
    applyPortalAction(actor, { ...input, ...metadata(bootstrap) }, store),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === code,
  );
  assert.equal(store.writes, writes);
  assert.deepEqual(store.records, records);
}
const floridaDraft = {
  type: "save-submission",
  productId: "bop",
  state: "FL",
  industry: "Retail",
  effectiveDate: "2026-10-01",
  accountName: "Florida eligibility test",
  employeeCount: 4,
  annualRevenueCents: 1000000,
};

test("Jordan cannot create, complete, submit or move Avery’s Florida draft into a licensed state to bypass eligibility", async () => {
  const store = new MemoryStore();
  const jordan = session("jordan");
  const avery = session("avery");
  await deniedWithoutWrite(jordan, floridaDraft, store);
  const created = await act(avery, floridaDraft, store);
  const draft = created.submissions.find(
    (entry) => entry.accountName === floridaDraft.accountName,
  )!;
  const visible = await getPortalBootstrap(jordan, store);
  assert.ok(
    visible.submissions.some((entry) => entry.id === draft.id),
    "Agency read visibility stays available",
  );
  assert.equal(visible.actionEligibility.submissions[draft.id].allowed, false);
  await deniedWithoutWrite(
    jordan,
    {
      type: "complete-requirement",
      submissionId: draft.id,
      requirement: draft.requirements[0],
    },
    store,
  );
  await deniedWithoutWrite(
    jordan,
    { type: "submit-submission", submissionId: draft.id },
    store,
  );
  await deniedWithoutWrite(
    jordan,
    { ...floridaDraft, submissionId: draft.id, state: "TX" },
    store,
  );
});

test("principal edits cannot leave the assigned producer ineligible and permitted state changes reset preparation", async () => {
  const store = new MemoryStore();
  const avery = session("avery");
  await deniedWithoutWrite(
    avery,
    { ...floridaDraft, submissionId: "sub-001" },
    store,
  );
  let workspace = await getPortalBootstrap(avery, store);
  assert.equal(
    workspace.submissions.find((entry) => entry.id === "sub-001")
      ?.assignedAgentId,
    "jordan",
  );
  assert.equal(
    workspace.submissions.find((entry) => entry.id === "sub-001")?.state,
    "TX",
  );
  workspace = await act(
    avery,
    { ...floridaDraft, submissionId: "sub-001", state: "IL" },
    store,
  );
  const changed = workspace.submissions.find(
    (entry) => entry.id === "sub-001",
  )!;
  assert.equal(changed.assignedAgentId, "jordan");
  assert.deepEqual(changed.completedRequirements, []);
});

test("authority revocation and product withdrawal block existing record actions without removing read access", async () => {
  const original = structuredClone(fixtures.eligibility);
  const store = new MemoryStore();
  const jordan = session("jordan");
  try {
    for (const mode of [
      "license",
      "producer-appointment",
      "product",
    ] as const) {
      fixtures.eligibility = structuredClone(original);
      if (mode === "license")
        fixtures.eligibility.agentAuthorities.find(
          (entry) => entry.agentId === "jordan" && entry.state === "TX",
        )!.status = "revoked";
      if (mode === "producer-appointment")
        fixtures.eligibility.carrierAppointments.find(
          (entry) => entry.agentId === "jordan" && entry.state === "TX",
        )!.status = "revoked";
      if (mode === "product")
        fixtures.eligibility.productRules.find(
          (entry) => entry.productId === "bop" && entry.state === "TX",
        )!.status = "suspended";
      const workspace = await getPortalBootstrap(jordan, store);
      assert.ok(workspace.submissions.some((entry) => entry.id === "sub-001"));
      assert.equal(
        workspace.actionEligibility.submissions["sub-001"].allowed,
        false,
      );
      await deniedWithoutWrite(
        jordan,
        {
          type: "complete-requirement",
          submissionId: "sub-001",
          requirement: "Three-year loss history",
        },
        store,
      );
      await deniedWithoutWrite(
        jordan,
        { type: "submit-submission", submissionId: "sub-001" },
        store,
      );
    }
  } finally {
    fixtures.eligibility = original;
  }
});

test("current state requirements and industries replace stale saved eligibility during checklist and submit actions", async () => {
  const original = structuredClone(fixtures.eligibility);
  const store = new MemoryStore();
  const jordan = session("jordan");
  try {
    await act(
      jordan,
      {
        type: "complete-requirement",
        submissionId: "sub-001",
        requirement: "Three-year loss history",
      },
      store,
    );
    const rule = fixtures.eligibility.productRules.find(
      (entry) => entry.productId === "bop" && entry.state === "TX",
    )!;
    rule.requirements.push("Updated Texas location review");
    let workspace = await getPortalBootstrap(jordan, store);
    assert.ok(
      workspace.submissions
        .find((entry) => entry.id === "sub-001")!
        .requirements.includes("Updated Texas location review"),
    );
    await deniedWithoutWrite(
      jordan,
      { type: "submit-submission", submissionId: "sub-001" },
      store,
      "MISSING_REQUIREMENTS",
    );
    workspace = await act(
      jordan,
      {
        type: "complete-requirement",
        submissionId: "sub-001",
        requirement: "Updated Texas location review",
      },
      store,
    );
    assert.ok(
      workspace.submissions
        .find((entry) => entry.id === "sub-001")!
        .completedRequirements.includes("Updated Texas location review"),
    );
    const industry = workspace.submissions.find(
      (entry) => entry.id === "sub-001",
    )!.industry;
    rule.industries = rule.industries.filter((entry) => entry !== industry);
    await deniedWithoutWrite(
      jordan,
      { type: "submit-submission", submissionId: "sub-001" },
      store,
    );
    await deniedWithoutWrite(
      jordan,
      {
        type: "complete-requirement",
        submissionId: "sub-001",
        requirement: "Updated Texas location review",
      },
      store,
    );
  } finally {
    fixtures.eligibility = original;
  }
});

test("bond save and submit enforce current actor authority, availability and explicit legacy type mapping", async () => {
  const original = structuredClone(fixtures.eligibility);
  const store = new MemoryStore();
  const marcus = session("marcus");
  try {
    const workspace = await getPortalBootstrap(marcus, store);
    assert.equal(
      workspace.actionEligibility.bondRequests["bond-001"].allowed,
      true,
      "Legacy performance and payment type maps to contract surety",
    );
    fixtures.eligibility.agentAuthorities.find(
      (entry) => entry.agentId === "marcus" && entry.state === "FL",
    )!.validThrough = "2026-09-09";
    await deniedWithoutWrite(
      marcus,
      { type: "submit-bond-request", bondRequestId: "bond-002" },
      store,
    );
    await deniedWithoutWrite(
      marcus,
      {
        type: "submit-bond-request",
        bondRequestId: "bond-002",
        at: "2026-09-08",
      },
      store,
    );
    await deniedWithoutWrite(
      marcus,
      {
        type: "save-bond-request",
        principal: "Test",
        obligee: "Test",
        state: "FL",
        bondType: "License and permit",
        amountCents: 10000,
      },
      store,
    );
    await deniedWithoutWrite(
      marcus,
      {
        type: "save-bond-request",
        bondRequestId: "bond-002",
        principal: "Test",
        obligee: "Test",
        state: "IL",
        bondType: "License and permit",
        amountCents: 10000,
      },
      store,
    );
    fixtures.eligibility = structuredClone(original);
    await deniedWithoutWrite(
      marcus,
      {
        type: "save-bond-request",
        principal: "Test",
        obligee: "Test",
        state: "FL",
        bondType: "Unconfigured",
        amountCents: 10000,
      },
      store,
    );
    fixtures.eligibility.productRules.find(
      (entry) =>
        entry.productId === "commercial-surety" && entry.state === "FL",
    )!.status = "suspended";
    await deniedWithoutWrite(
      marcus,
      { type: "submit-bond-request", bondRequestId: "bond-002" },
      store,
    );
  } finally {
    fixtures.eligibility = original;
  }
});

test("bootstrap exposes only current actor authority and licensed or nationwide guidance", async () => {
  const original = structuredClone(fixtures.eligibility);
  try {
    fixtures.eligibility.agentAuthorities.find(
      (entry) => entry.agentId === "jordan" && entry.state === "TX",
    )!.status = "revoked";
    const workspace = await getPortalBootstrap(
      session("jordan"),
      new MemoryStore(),
    );
    assert.deepEqual(workspace.agent.licensedStates, ["IL"]);
    assert.ok(
      workspace.eligibility.agentAuthorities.every(
        (entry) => entry.agentId === "jordan",
      ),
    );
    assert.ok(
      workspace.eligibility.carrierAppointments.every(
        (entry) =>
          entry.agencyId === "cedar-ridge" &&
          (!entry.agentId || entry.agentId === "jordan"),
      ),
    );
    assert.ok(
      !workspace.resources.some(
        (entry) => entry.states.length === 1 && entry.states[0] === "FL",
      ),
    );
  } finally {
    fixtures.eligibility = original;
  }
});

test("authenticated Daniel bootstrap and direct native pages exclude Florida guidance and forged favorites", async () => {
  const store = new MemoryStore();
  const daniel = session("daniel");
  const workspace = await getPortalBootstrap(daniel, store);
  assert.deepEqual(workspace.agent.licensedStates, ["IL", "TX"]);
  for (const state of ["FL", "IL", "TX", "All"]) {
    const route: RouteData = {
      name: "state-guidance",
      fields: { state: { value: state } },
      placeholders: {
        "headless-resource-article": [
          {
            componentName: "ResourceArticle",
            fields: { state: { value: state } },
          },
        ],
      },
    };
    assert.equal(
      canAccessResourcePage(
        "/resources/state-guidance",
        route,
        workspace.agent.licensedStates,
        false,
      ),
      state !== "FL",
    );
  }
  assert.ok(
    !workspace.resources.some((resource) => resource.id === "state-wc-fl"),
  );
  assert.ok(
    workspace.resources.some((resource) => resource.id === "state-wc-il"),
  );
  assert.ok(
    workspace.resources.some((resource) => resource.id === "state-wc-tx"),
  );
  assert.ok(
    workspace.resources.some(
      (resource) => resource.id === "small-business-checklist",
    ),
  );
  await deniedWithoutWrite(
    daniel,
    { type: "toggle-favorite", resourceId: "state-wc-fl" },
    store,
    "NOT_FOUND",
  );
});

test("a saved article disappears when its required license is revoked without rewriting saved work", async () => {
  const store = new MemoryStore();
  const daniel = session("daniel");
  const saved = await act(
    daniel,
    { type: "toggle-favorite", resourceId: "state-wc-tx" },
    store,
  );
  assert.ok(saved.favorites.includes("state-wc-tx"));
  const original = structuredClone(fixtures.eligibility);
  const before = structuredClone(store.records);
  try {
    fixtures.eligibility.agentAuthorities.find(
      (entry) => entry.agentId === "daniel" && entry.state === "TX",
    )!.status = "revoked";
    const workspace = await getPortalBootstrap(daniel, store);
    assert.deepEqual(workspace.agent.licensedStates, ["IL"]);
    assert.ok(
      !workspace.resources.some((resource) => resource.id === "state-wc-tx"),
    );
    assert.ok(!workspace.favorites.includes("state-wc-tx"));
    assert.deepEqual(
      store.records,
      before,
      "Filtering must not delete the saved favorite",
    );
  } finally {
    fixtures.eligibility = original;
  }
});

test("fixture validation rejects invalid seed owner authority, product-state availability and missing rules", () => {
  const owner = structuredClone(fixtures);
  owner.submissions.find((entry) => entry.id === "sub-001")!.state = "FL";
  assert.throws(() => validateFixtures(owner), /authority or availability/);
  const unavailable = structuredClone(fixtures);
  unavailable.eligibility.productRules.find(
    (entry) => entry.productId === "bop" && entry.state === "TX",
  )!.status = "suspended";
  assert.throws(
    () => validateFixtures(unavailable),
    /authority or availability/,
  );
  const missing = structuredClone(fixtures);
  missing.eligibility.productRules = missing.eligibility.productRules.filter(
    (entry) => entry.productId !== "bop" || entry.state !== "TX",
  );
  assert.throws(() => validateFixtures(missing), /Missing product eligibility/);
});
