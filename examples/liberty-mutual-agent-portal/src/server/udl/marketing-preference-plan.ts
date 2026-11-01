import "server-only";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  MarketingPreferenceAction,
  MarketingPreferenceProfile,
} from "@/features/workshops/preferences/preferences.types";

export const PREFERENCE_IDENTIFIERS = [
  "limu-preferences-allowed",
  "limu-preferences-suppressed",
] as const;
const IDENTITIES = {
  "limu-preferences-allowed": {
    id: "e925db1f-a514-4345-8c1d-bf2081964bf6",
    lastName: "Ellis - Allowed",
  },
  "limu-preferences-suppressed": {
    id: "4d3a3124-6492-4a5d-a817-8d4c10250b85",
    lastName: "Ellis - Suppressed",
  },
};
const CONTEXT = {
  agentId: "cameron",
  agencyId: "preference-governance-agency",
  agencyName: "Lakeside Independent Insurance",
  role: "producer",
  state: "TX",
  channel: "independent",
  licensedInTexas: true,
  licensedInFlorida: false,
  licensedInIllinois: false,
};
export interface PreferencePlan {
  action: MarketingPreferenceAction;
  payload: string;
  checksumMd5: string;
  fileSizeBytes: number;
  profiles: Array<MarketingPreferenceProfile & { correlationId: string }>;
}

/** These two source files represent a synthetic external preference source. */
export function prepareMarketingPreferences(
  action: MarketingPreferenceAction,
): PreferencePlan {
  const payload = readFileSync(
    action === "baseline"
      ? join(process.cwd(), "fixtures/preference-governance/baseline.jsonl")
      : join(process.cwd(), "fixtures/preference-governance/opt-out.jsonl"),
    "utf8",
  );
  const identifiers =
    action === "baseline"
      ? [...PREFERENCE_IDENTIFIERS]
      : [PREFERENCE_IDENTIFIERS[0]];
  const records: unknown[] = payload
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  assert.equal(records.length, identifiers.length);
  const profiles = identifiers.map((identifier, index) => {
    const identity = IDENTITIES[identifier];
    const marketingSuppressed =
      action === "optout" || identifier === PREFERENCE_IDENTIFIERS[1];
    assert.deepEqual(
      records[index],
      {
        id: identity.id,
        recordType: "profile",
        identifiers: [{ provider: "liberty-mutual-agent", id: identifier }],
        contact: { firstName: "Cameron", lastName: identity.lastName },
        extensions: { ...CONTEXT, marketingSuppressed },
      },
      "The preference fixture differs from its exact two-profile synthetic scope.",
    );
    return {
      identifier,
      correlationId: identity.id,
      displayName: `Cameron ${identity.lastName}`,
      agencyName: CONTEXT.agencyName,
      state: "TX" as const,
      role: "producer" as const,
      marketingSuppressed,
    };
  });
  return {
    action,
    payload,
    checksumMd5: createHash("md5").update(payload).digest("hex"),
    fileSizeBytes: Buffer.byteLength(payload),
    profiles,
  };
}

export function assertMarketingPreferencePlan(plan: PreferencePlan): void {
  assert.deepEqual(
    plan,
    prepareMarketingPreferences(plan.action),
    "The persisted preference operation differs from the fixed fixture.",
  );
}
