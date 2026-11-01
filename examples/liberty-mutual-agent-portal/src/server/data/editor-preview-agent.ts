import "server-only";
import type { Page } from "@sitecore-content-sdk/nextjs";

export type EditorPreviewAgent = "avery" | "daniel";

// Matches the owned native placements in portal-relevance-contract.json. These IDs
// only align the synthetic, read-only operational shell with a signed CMS preview.
// Native Sitecore rules still choose content for every normal visitor.
const HOME = "ae9e45caf1274abe9ca72ff109981998";
const PRIORITIES_UID = "c293373f7f755cfea495f62ed2a70920";
const DATASOURCE_AGENT: Readonly<Record<string, EditorPreviewAgent>> = {
  "3127968e4b2150c3ad79b6bbbe5303b8": "avery",
  "077bbcf9ce805f76ae6a8a8b5580f1c0": "daniel",
};
const normalize = (value: unknown) =>
  typeof value === "string" ? value.replace(/[{}-]/g, "").toLowerCase() : "";

/** The caller must pass only the verified SDK Draft Mode state, never a URL switch. */
export function editorPreviewAgent(
  page: Page,
  verifiedDraft: boolean,
): EditorPreviewAgent | undefined {
  if (
    !verifiedDraft ||
    (!page.mode.isEditing && !page.mode.isPreview) ||
    page.mode.isDesignLibrary
  )
    return undefined;
  const route = page.layout.sitecore.route;
  if (normalize(route?.itemId) !== HOME) return undefined;
  // The route contains the native SDK-selected component instance. Do not inspect
  // `experiences`, force a variant, or reinterpret the visitor's profile here.
  const candidates = route?.placeholders?.["headless-agency-priorities"] ?? [];
  const selected = candidates.filter(
    (component) =>
      component.componentName === "AgencyPriorities" &&
      normalize(component.uid) === PRIORITIES_UID,
  );
  if (selected.length !== 1) return undefined;
  return DATASOURCE_AGENT[normalize(selected[0].dataSource)];
}
