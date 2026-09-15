export type PortalDialogKind = "submission" | "bond" | "policy" | "course";

const DIALOG_ROUTES: Record<PortalDialogKind, readonly string[]> = {
  submission: ["quote", "submissions", "appetite"],
  bond: ["quote", "surety"],
  policy: ["clients", "policies", "renewals"],
  course: ["resources", "learning"],
};

/** Remove a closed dialog's deep link without changing the surrounding context. */
export function portalDialogClosedHref(
  href: string,
  kind: PortalDialogKind,
): string | null {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(href)
  )
    return null;

  const url = new URL(href, "https://portal.invalid");
  const segments = url.pathname.split("/").filter(Boolean);
  const section = segments[0];
  if (!DIALOG_ROUTES[kind].includes(section) || segments.length > 2)
    return null;

  let changed = false;
  // Quote paths identify submissions; resource paths identify articles.
  const hasDetailPath =
    kind === "bond"
      ? section === "surety"
      : kind === "course"
        ? section === "learning"
        : true;
  if (segments.length === 2 && hasDetailPath) {
    url.pathname = `/${section}`;
    changed = true;
  }

  if (kind === "submission") {
    if (url.searchParams.has("submission")) {
      url.searchParams.delete("submission");
      changed = true;
    }
    // A form opened from ?new=1 can show the saved detail before its first close.
    if (url.searchParams.get("new") === "1") {
      url.searchParams.delete("new");
      changed = true;
    }
  } else if (kind === "bond" && url.searchParams.get("bond") === "1") {
    url.searchParams.delete("bond");
    changed = true;
  } else if (kind === "course" && url.searchParams.has("course")) {
    url.searchParams.delete("course");
    changed = true;
  }

  return changed ? `${url.pathname}${url.search}${url.hash}` : null;
}
