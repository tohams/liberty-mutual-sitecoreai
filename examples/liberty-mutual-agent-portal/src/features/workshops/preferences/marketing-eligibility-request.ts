import type { MarketingEligibilityResult } from "./marketing-eligibility.types";

const IDENTIFIERS = ["limu-preferences-allowed", "limu-preferences-suppressed"];
const UUID =
  /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

export function isMarketingEligibilityResult(
  value: unknown,
): value is MarketingEligibilityResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<MarketingEligibilityResult>;
  return (
    typeof result.preferenceOperationId === "string" &&
    Boolean(result.preferenceOperationId) &&
    typeof result.checkedAt === "string" &&
    Number.isFinite(Date.parse(result.checkedAt)) &&
    typeof result.nativeFriendlyId === "string" &&
    Boolean(result.nativeFriendlyId) &&
    Array.isArray(result.profiles) &&
    result.profiles.length === 2 &&
    new Set(result.profiles.map((profile) => profile?.profileId)).size === 2 &&
    IDENTIFIERS.every((identifier) =>
      result.profiles!.some(
        (profile) =>
          profile?.identifier === identifier &&
          typeof profile.profileId === "string" &&
          UUID.test(profile.profileId) &&
          typeof profile.displayName === "string" &&
          typeof profile.agencyName === "string" &&
          typeof profile.eligible === "boolean" &&
          profile.nativeResponse?.marketingEligible === profile.eligible &&
          typeof profile.nativeResponse?.marketingSuppressed === "boolean" &&
          profile.nativeResponse?.preferenceKnown === true &&
          profile.nativeResponse?.profileId === profile.profileId,
      ),
    )
  );
}

export async function fetchMarketingEligibility(
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<MarketingEligibilityResult> {
  const response = await fetcher("/api/workshops/marketing-eligibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
  });
  const value: unknown = await response.json();
  if (!response.ok || !isMarketingEligibilityResult(value)) {
    throw new Error(
      response.status === 401
        ? "Your workshop sign-in has ended. Sign in again, then run the eligibility check."
        : "SitecoreAI could not confirm the current eligibility. Confirm the preference import, then run the eligibility check again.",
    );
  }
  return value;
}
