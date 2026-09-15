import type { StateCode } from "@/contracts/portal";

export const RESOURCE_STATES: readonly StateCode[] = ["TX", "FL", "IL"];

/** Read the CMS scalar state contract without silently discarding unknown values. */
export function parseResourceStates(value: unknown): StateCode[] {
  if (typeof value !== "string" || !value.trim()) return [];
  if (value.trim().toLowerCase() === "all") return [...RESOURCE_STATES];
  const states = value.trim().split(/[,;|\s]+/);
  return states.every((state) => RESOURCE_STATES.includes(state as StateCode))
    ? ([...new Set(states)] as StateCode[])
    : [];
}

export function isNationwideResource(states: readonly StateCode[]): boolean {
  return RESOURCE_STATES.every((state) => states.includes(state));
}

/** Nationwide guidance is shared; state-specific guidance requires a current license. */
export function canAccessResourceStates(
  resourceStates: readonly StateCode[],
  licensedStates: readonly StateCode[],
): boolean {
  if (
    !resourceStates.length ||
    !resourceStates.every((state) => RESOURCE_STATES.includes(state))
  )
    return false;
  return (
    isNationwideResource(resourceStates) ||
    resourceStates.some((state) => licensedStates.includes(state))
  );
}
