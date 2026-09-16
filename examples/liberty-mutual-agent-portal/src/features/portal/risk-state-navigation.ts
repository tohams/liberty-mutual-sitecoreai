import type { StateCode } from "@/contracts/portal";

const SUPPORTED_STATES: readonly StateCode[] = ["TX", "FL", "IL"];
const STATE_AWARE_ROUTES = new Set([
  "products",
  "quote",
  "submissions",
  "surety",
  "appetite",
  "resources",
  "learning",
  "growth",
]);

/** A browsing hint only. Transaction authority is evaluated separately. */
export function readRiskState(
  value: string | null,
  licensedStates: readonly StateCode[],
): StateCode | undefined {
  return SUPPORTED_STATES.includes(value as StateCode) &&
    licensedStates.includes(value as StateCode)
    ? (value as StateCode)
    : undefined;
}

/** Keep a saved risk intact, including when its actor is no longer eligible. */
export function initialRiskState({
  savedState,
  queryState,
  homeState,
  licensedStates,
}: {
  savedState?: StateCode;
  queryState?: string | null;
  homeState: StateCode;
  licensedStates: readonly StateCode[];
}): StateCode | "" {
  if (savedState) return savedState;
  if (queryState !== undefined && queryState !== null)
    return readRiskState(queryState, licensedStates) ?? "";
  return readRiskState(homeState, licensedStates) ?? licensedStates[0] ?? "";
}

/** Preserve context only on known relative portal links; never rewrite external/auth/API URLs. */
export function withRiskState(href: string, state?: StateCode): string {
  if (
    !state ||
    !SUPPORTED_STATES.includes(state) ||
    !href.startsWith("/") ||
    href.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(href)
  )
    return href;
  const url = new URL(href, "https://portal.invalid");
  if (!STATE_AWARE_ROUTES.has(url.pathname.split("/")[1])) return href;
  url.searchParams.set("state", state);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Include an unavailable current value so a select cannot silently replace it. */
export function riskStateOptions(
  eligibleStates: readonly StateCode[],
  selected: StateCode | "",
) {
  const states = [...new Set(eligibleStates)];
  if (selected && !states.includes(selected)) states.unshift(selected);
  return states.map((state) => ({
    state,
    available: eligibleStates.includes(state),
  }));
}
