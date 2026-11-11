import "server-only";
import {
  PORTAL_PLACEHOLDERS,
  portalPlaceholderOrderForRoute,
} from "@/features/portal/portal-placeholders";
import { CAMPAIGN_SLOTS } from "@/features/growth/campaign-contract";
import type { PersonalizationPreviewPage } from "./types";

type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const normalize = (value: string) => value.replace(/[{}-]/g, "").toLowerCase();
interface NativeRendering {
  id: string;
  path: string[];
  dynamicId?: string;
  index: number;
}
interface PlaceholderGroup {
  path: string[];
  renderings: NativeRendering[];
  index: number;
}

/** Native layout is already authorized and version-specific; sorting needs no API request. */
function readRenderings(page: PersonalizationPreviewPage): NativeRendering[] {
  let layout: unknown = page.nativeFinalLayout || page.nativeSharedLayout;
  if (typeof layout === "string") {
    if (layout.length > 1_048_576) return [];
    try {
      layout = JSON.parse(layout);
    } catch {
      return [];
    }
  }
  if (!object(layout) || !Array.isArray(layout.devices)) return [];
  const device = layout.devices[0];
  if (
    !object(device) ||
    !Array.isArray(device.renderings) ||
    device.renderings.length > 300
  )
    return [];
  return device.renderings.flatMap((rendering, index) => {
    if (
      !object(rendering) ||
      typeof rendering.instanceId !== "string" ||
      typeof rendering.placeholderKey !== "string"
    )
      return [];
    const id = normalize(rendering.instanceId);
    const path = rendering.placeholderKey.split("/").filter(Boolean);
    if (
      !/^[a-f0-9]{32}$/.test(id) ||
      !path.length ||
      path.length > 20 ||
      path.some((part) => part.length > 300)
    )
      return [];
    const dynamicId =
      object(rendering.parameters) &&
      typeof rendering.parameters.DynamicPlaceholderId === "string"
        ? rendering.parameters.DynamicPlaceholderId
        : undefined;
    return [
      {
        id,
        path,
        index,
        ...(dynamicId && /^\d+$/.test(dynamicId) ? { dynamicId } : {}),
      },
    ];
  });
}

/**
 * Order instances by their actual portal slots, then walk nested placeholders
 * depth-first. Unknown slots and layouts retain deterministic native occurrence
 * order. Component names, flow names, and variant labels never determine order.
 */
export function personalizationPreviewComponentOrder(
  page: PersonalizationPreviewPage,
): string[] {
  const renderings = readRenderings(page);
  const groups = new Map<string, PlaceholderGroup>();
  for (const rendering of renderings) {
    const key = rendering.path.join("/");
    const group = groups.get(key);
    if (group) group.renderings.push(rendering);
    else
      groups.set(key, {
        path: rendering.path,
        renderings: [rendering],
        index: rendering.index,
      });
  }
  const slots = portalPlaceholderOrderForRoute(page.path);
  const slotOrder: readonly string[] | undefined = slots?.map(
    (slot) => PORTAL_PLACEHOLDERS[slot].name,
  );
  const nestedOrder: readonly string[] = Object.values(CAMPAIGN_SLOTS).map(
    (slot) => slot.name,
  );
  const visited = new Set<string>();
  const seenIds = new Set<string>();
  const ordered: string[] = [];
  const visit = (group: PlaceholderGroup) => {
    const key = group.path.join("/");
    if (visited.has(key)) return;
    visited.add(key);
    for (const rendering of group.renderings) {
      if (!seenIds.has(rendering.id)) {
        seenIds.add(rendering.id);
        ordered.push(rendering.id);
      }
      const children = [...groups.values()].filter(
        (candidate) =>
          candidate.path.length === group.path.length + 1 &&
          group.path.every((part, index) => candidate.path[index] === part) &&
          rendering.dynamicId &&
          candidate.path.at(-1)!.endsWith(`-${rendering.dynamicId}`),
      );
      const childOrder = children.every((child) =>
        nestedOrder.includes(child.path.at(-1)!.replace(/-\d+$/, "")),
      )
        ? nestedOrder
        : [];
      children.sort((left, right) => {
        const rank = (child: PlaceholderGroup) => {
          const name = child.path.at(-1)!.replace(/-\d+$/, "");
          const index = childOrder.indexOf(name);
          return index < 0 ? Number.MAX_SAFE_INTEGER : index;
        };
        return rank(left) - rank(right) || left.index - right.index;
      });
      for (const child of children) visit(child);
    }
  };
  const roots = [...groups.values()].filter((group) => group.path.length === 1);
  const rootOrder = roots.every((group) => slotOrder?.includes(group.path[0]))
    ? slotOrder
    : undefined;
  roots.sort((left, right) => {
    const rank = (group: PlaceholderGroup) => {
      const index = rootOrder?.indexOf(group.path[0]) ?? -1;
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return rank(left) - rank(right) || left.index - right.index;
  });
  for (const root of roots) visit(root);
  // Preserve unresolved native instances rather than guessing their parentage.
  for (const rendering of renderings)
    if (!seenIds.has(rendering.id)) {
      seenIds.add(rendering.id);
      ordered.push(rendering.id);
    }
  return ordered;
}
