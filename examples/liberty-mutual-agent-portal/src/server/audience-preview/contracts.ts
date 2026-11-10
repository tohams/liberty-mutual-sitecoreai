import "server-only";
import type { AudiencePreviewInput } from "@/features/audience-preview/types";
import {
  ROLE_OPTIONS,
  STATE_OPTIONS,
} from "@/features/audience-preview/scenarios";

export const PREVIEW_SCHEMA_VERSION = 1;
export const PREVIEW_IDENTITY_PREFIX = "audience-preview:v1:";
export const PREVIEW_PROVIDER = "liberty-mutual-agent";
export const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const HASH = /^[a-f0-9]{64}$/;
export const MAX_RESPONSE_BYTES = 65_536;

export class AudiencePreviewError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly uncertain = false,
  ) {
    super(message);
    this.name = "AudiencePreviewError";
  }
}

const fields = [
  "role",
  "licensedStates",
  "specializesInSmallCommercial",
  "agencySmallCommercialSharePercent",
  "agencyTotalWrittenPremiumUsd",
  "agentSmallCommercialWrittenPremiumUsd",
] as const;
const roles: readonly string[] = ROLE_OPTIONS.map((option) => option.value);
const states = STATE_OPTIONS.map((option) => option.value);

/** Exact selector-only input: callers cannot inject an identity, profile ID, or arbitrary extensions. */
export function validateAudiencePreviewInput(
  value: unknown,
): AudiencePreviewInput {
  const invalid = () => {
    throw new AudiencePreviewError(
      "INVALID_AUDIENCE",
      "Choose a valid audience.",
    );
  };
  if (
    !isObject(value) ||
    Object.keys(value).length !== fields.length ||
    fields.some((key) => !Object.hasOwn(value, key)) ||
    typeof value.role !== "string" ||
    !roles.includes(value.role) ||
    !Array.isArray(value.licensedStates) ||
    value.licensedStates.length > states.length ||
    value.licensedStates.some(
      (state) => !states.includes(state as (typeof states)[number]),
    ) ||
    new Set(value.licensedStates).size !== value.licensedStates.length ||
    typeof value.specializesInSmallCommercial !== "boolean"
  )
    return invalid();
  const number = (raw: unknown, maximum: number) =>
    typeof raw === "number" &&
    Number.isFinite(raw) &&
    raw >= 0 &&
    raw <= maximum &&
    Math.abs(raw * 100 - Math.round(raw * 100)) < 0.00001;
  if (
    !number(value.agencySmallCommercialSharePercent, 100) ||
    !number(value.agencyTotalWrittenPremiumUsd, 1_000_000_000) ||
    !number(value.agentSmallCommercialWrittenPremiumUsd, 1_000_000_000)
  )
    return invalid();
  return Object.freeze({
    role: value.role as AudiencePreviewInput["role"],
    licensedStates: states.filter((state) =>
      (value.licensedStates as unknown[]).includes(state),
    ),
    specializesInSmallCommercial: value.specializesInSmallCommercial,
    agencySmallCommercialSharePercent:
      value.agencySmallCommercialSharePercent as number,
    agencyTotalWrittenPremiumUsd: value.agencyTotalWrittenPremiumUsd as number,
    agentSmallCommercialWrittenPremiumUsd:
      value.agentSmallCommercialWrittenPremiumUsd as number,
  });
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export interface NativePreviewConfiguration {
  edgeUrl: string;
  contextId: string;
  siteName: string;
  scope?: string;
}

/** The Content SDK represents its default, unscoped configuration as an empty string. */
export function normalizeNativePreviewConfiguration(
  config: NativePreviewConfiguration,
): NativePreviewConfiguration {
  const { scope, ...configuration } = config;
  const normalized = {
    ...configuration,
    ...(scope?.trim() ? { scope: scope.trim() } : {}),
  };
  validateNativePreviewConfiguration(normalized);
  return normalized;
}

export function validateNativePreviewConfiguration(
  config: NativePreviewConfiguration,
): void {
  let edge: URL;
  try {
    edge = new URL(config.edgeUrl);
  } catch {
    return invalidConfiguration();
  }
  if (
    edge.protocol !== "https:" ||
    !edge.hostname.endsWith(".sitecorecloud.io") ||
    edge.username ||
    edge.password ||
    edge.search ||
    edge.hash ||
    edge.pathname !== "/" ||
    (edge.port && edge.port !== "443") ||
    !/^[a-zA-Z0-9_-]{1,200}$/.test(config.contextId) ||
    !/^[a-z0-9][a-z0-9-]{0,99}$/.test(config.siteName) ||
    (config.scope !== undefined && !/^[a-zA-Z0-9_-]{1,100}$/.test(config.scope))
  )
    invalidConfiguration();
}

export function invalidConfiguration(): never {
  throw new AudiencePreviewError(
    "PREVIEW_NOT_CONFIGURED",
    "Audience Preview is not configured.",
  );
}

export async function responseText(response: Response): Promise<string> {
  const declared = response.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/.test(declared) || Number(declared) > MAX_RESPONSE_BYTES)
  ) {
    void response.body?.cancel().catch(() => undefined);
    throw new AudiencePreviewError(
      "INVALID_NATIVE_RESPONSE",
      "SitecoreAI returned an invalid preview response.",
    );
  }
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new AudiencePreviewError(
          "INVALID_NATIVE_RESPONSE",
          "SitecoreAI returned an invalid preview response.",
        );
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
  } finally {
    reader.releaseLock();
  }
}

export async function responseObject(
  response: Response,
): Promise<Record<string, unknown>> {
  let result: unknown;
  try {
    result = JSON.parse(await responseText(response));
  } catch {
    throw new AudiencePreviewError(
      "INVALID_NATIVE_RESPONSE",
      "SitecoreAI returned an invalid preview response.",
    );
  }
  if (!isObject(result))
    throw new AudiencePreviewError(
      "INVALID_NATIVE_RESPONSE",
      "SitecoreAI returned an invalid preview response.",
    );
  return result;
}
