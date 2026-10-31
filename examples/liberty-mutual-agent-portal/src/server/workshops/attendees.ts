import "server-only";
import logins from "../../../fixtures/portal-logins.json";

// Display demonstration account numbers without customer attendee assignments.
// Keep contact details, native account credentials, and role assignments out.
export const workshopAttendees: ReadonlyArray<{
  reviewerPack: string;
  displayName: string | null;
}> = [
  { reviewerPack: "01", displayName: "Sitecore presenters" },
  { reviewerPack: "02", displayName: null },
  { reviewerPack: "03", displayName: null },
  { reviewerPack: "04", displayName: null },
  { reviewerPack: "05", displayName: null },
  { reviewerPack: "06", displayName: null },
  { reviewerPack: "07", displayName: null },
  { reviewerPack: "08", displayName: null },
  { reviewerPack: "09", displayName: null },
  { reviewerPack: "10", displayName: null },
  { reviewerPack: "11", displayName: null },
  { reviewerPack: "12", displayName: null },
  { reviewerPack: "13", displayName: null },
  { reviewerPack: "14", displayName: null },
  { reviewerPack: "15", displayName: null },
  { reviewerPack: "16", displayName: null },
  { reviewerPack: "17", displayName: null },
  { reviewerPack: "18", displayName: null },
  { reviewerPack: "19", displayName: null },
  { reviewerPack: "20", displayName: null },
];

export function workshopUsernamesForPack(reviewerPack: string): string[] {
  return logins.logins
    .filter((login) => login.enabled && login.reviewerPack === reviewerPack)
    .map((login) => login.username);
}
