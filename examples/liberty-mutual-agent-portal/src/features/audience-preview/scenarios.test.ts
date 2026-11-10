import assert from "node:assert/strict";
import test from "node:test";
import {
  AUDIENCE_PREVIEW_SCENARIOS,
  AUDIENCE_PREVIEW_BUSINESS_DEFAULTS,
  createAudiencePreviewInput,
  ROLE_OPTIONS,
  STATE_OPTIONS,
} from "./scenarios";
import { validateAudiencePreviewInput } from "../../server/audience-preview/contracts";
import {
  audienceSelectorHash,
  prepareAudienceProfileImport,
} from "../../server/audience-preview/profiles";

test("every selectable role/state combination has one canonical native profile with fixed business attributes", () => {
  const hashes = new Set<string>();
  assert.equal(AUDIENCE_PREVIEW_SCENARIOS.length, 42);
  for (const role of ROLE_OPTIONS) {
    const scenarios = AUDIENCE_PREVIEW_SCENARIOS.filter(
      (input) => input.role === role.value,
    );
    assert.equal(scenarios.length, 7);
    assert.equal(
      new Set(scenarios.map((input) => input.licensedStates.join(","))).size,
      7,
    );
  }
  for (const input of AUDIENCE_PREVIEW_SCENARIOS) {
    assert(input.licensedStates.length > 0);
    const validated = validateAudiencePreviewInput(input);
    assert.deepEqual(validated, input);
    assert.deepEqual(
      {
        specializesInSmallCommercial: input.specializesInSmallCommercial,
        agencySmallCommercialSharePercent:
          input.agencySmallCommercialSharePercent,
        agencyTotalWrittenPremiumUsd: input.agencyTotalWrittenPremiumUsd,
        agentSmallCommercialWrittenPremiumUsd:
          input.agentSmallCommercialWrittenPremiumUsd,
      },
      AUDIENCE_PREVIEW_BUSINESS_DEFAULTS,
    );
    const hash = audienceSelectorHash(
      input,
      "preview:test",
      "liberty-mutual-agent-portal",
    );
    hashes.add(hash);
    const imported = JSON.parse(
      prepareAudienceProfileImport(
        input,
        "preview:test",
        "liberty-mutual-agent-portal",
      ).payload,
    );
    assert.equal(imported.extensions.previewSelectorHash, hash);
    assert.equal(
      imported.extensions.licensedInTexas,
      input.licensedStates.includes("TX"),
    );
    assert.equal(
      imported.extensions.licensedInFlorida,
      input.licensedStates.includes("FL"),
    );
    assert.equal(
      imported.extensions.licensedInIllinois,
      input.licensedStates.includes("IL"),
    );
    assert.equal(
      imported.extensions.agentSmallCommercialWrittenPremiumCents,
      6_000_000,
    );
  }
  assert.equal(hashes.size, 42);
  assert.deepEqual(
    STATE_OPTIONS.map((option) => option.value),
    ["TX", "FL", "IL"],
  );
});

test("role/state selection produces the same native identity regardless of checkbox order", () => {
  const ordered = createAudiencePreviewInput("principal", ["TX", "FL", "IL"]);
  const reversed = createAudiencePreviewInput("principal", ["IL", "FL", "TX"]);
  assert.deepEqual(ordered, reversed);
  assert.equal(
    audienceSelectorHash(
      ordered,
      "preview:test",
      "liberty-mutual-agent-portal",
    ),
    audienceSelectorHash(
      reversed,
      "preview:test",
      "liberty-mutual-agent-portal",
    ),
  );
  assert.throws(
    () => createAudiencePreviewInput("principal", []),
    /at least one licensed state/,
  );
  assert.throws(() => createAudiencePreviewInput("principal", ["TX", "TX"]));
});
