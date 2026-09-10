import type { Agent, Resource, StateCode } from "@/contracts/portal";

export const DEFAULT_RESOURCE_STATE_SCOPE = "licensed";
export type ResourceStateScope = "licensed" | "all" | StateCode | "All";

const SUPPORTED_STATES: readonly StateCode[] = ["TX", "FL", "IL"];

function isNationwide(resourceStates: readonly StateCode[]) {
  // The public resource contract expands the CMS's `All` value to these states.
  return SUPPORTED_STATES.every((state) => resourceStates.includes(state));
}

/** Content relevance only: browsing guidance never changes an agent's licensing. */
export function matchesResourceStateScope(
  resourceStates: readonly StateCode[],
  licensedStates: readonly StateCode[],
  scope: ResourceStateScope,
): boolean {
  if (scope === "all") return true;
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
