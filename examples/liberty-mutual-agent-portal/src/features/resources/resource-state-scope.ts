import type { Agent, Resource, StateCode } from "@/contracts/portal";
import {
  canAccessResourceStates,
  isNationwideResource as isNationwide,
} from "@/domain/resource-access";

export const DEFAULT_RESOURCE_STATE_SCOPE = "licensed";
export type ResourceStateScope = "licensed" | "all" | StateCode | "All";

/** Old All-states values and unlicensed selections never widen access. */
export function normalizeResourceStateScope(
  scope: unknown,
  licensedStates: readonly StateCode[],
): Exclude<ResourceStateScope, "all"> {
  if (scope === "All") return "All";
  return licensedStates.includes(scope as StateCode)
    ? (scope as StateCode)
    : DEFAULT_RESOURCE_STATE_SCOPE;
}

/** Narrow the already licensed resource set; a filter never grants access. */
export function matchesResourceStateScope(
  resourceStates: readonly StateCode[],
  licensedStates: readonly StateCode[],
  scope: ResourceStateScope,
): boolean {
  if (!canAccessResourceStates(resourceStates, licensedStates)) return false;
  scope = normalizeResourceStateScope(scope, licensedStates);
  const nationwide = isNationwide(resourceStates);
  if (scope === "All") return nationwide;
  if (nationwide) return true;
  return scope === DEFAULT_RESOURCE_STATE_SCOPE
    ? resourceStates.some((state) => licensedStates.includes(state))
    : resourceStates.includes(scope);
}

/** Preserve specialization and relevance, spreading tied local picks across licenses. */
export function selectRecommendedResources(
  resources: readonly Resource[],
  agent: Pick<Agent, "licensedStates" | "specializations">,
  limit = 2,
): Resource[] {
  const relevance = (resource: Resource) =>
    (resource.states.length === 1 ? 2 : 0) + (resource.line !== "all" ? 3 : 0);
  const remaining = resources
    .filter(
      (resource) =>
        matchesResourceStateScope(
          resource.states,
          agent.licensedStates,
          DEFAULT_RESOURCE_STATE_SCOPE,
        ) &&
        (resource.line === "all" ||
          agent.specializations.includes(resource.line)),
    )
    .sort((left, right) => relevance(right) - relevance(left));
  const selected: Resource[] = [];
  const representedStates = new Set<StateCode>();

  while (remaining.length && selected.length < limit) {
    const bestScore = relevance(remaining[0]);
    const newStateIndex = remaining.findIndex(
      (resource) =>
        relevance(resource) === bestScore &&
        !isNationwide(resource.states) &&
        resource.states.some(
          (state) =>
            agent.licensedStates.includes(state) &&
            !representedStates.has(state),
        ),
    );
    const [resource] = remaining.splice(Math.max(newStateIndex, 0), 1);
    selected.push(resource);
    if (!isNationwide(resource.states)) {
      resource.states.forEach((state) => representedStates.add(state));
    }
  }
  return selected;
}
