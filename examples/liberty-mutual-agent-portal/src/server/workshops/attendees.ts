import "server-only";
import logins from "../../../fixtures/portal-logins.json";

// The user authorized this minimal workshop roster in the private repository.
// Keep contact details, native account credentials, and role assignments out.
export const workshopAttendees: ReadonlyArray<{
  reviewerPack: string;
  displayName: string | null;
}> = [
  { reviewerPack: "01", displayName: "Workshop presenters" },
  { reviewerPack: "02", displayName: "Chris Babcock" },
  { reviewerPack: "03", displayName: "Yogeshwaran Balasubramaniam" },
  { reviewerPack: "04", displayName: "Usha Bommasamudram" },
  { reviewerPack: "05", displayName: "Jessie Dahlquist" },
  { reviewerPack: "06", displayName: "Matthew Duvall" },
  { reviewerPack: "07", displayName: "Paul Gaddy" },
  { reviewerPack: "08", displayName: "Jared Greenblatt" },
  { reviewerPack: "09", displayName: "Bruno Koppel" },
  { reviewerPack: "10", displayName: "Jack Meyers" },
  { reviewerPack: "11", displayName: "Jeff Swanso" },
  { reviewerPack: "12", displayName: null },
  { reviewerPack: "13", displayName: null },
  { reviewerPack: "14", displayName: null },
  { reviewerPack: "15", displayName: null },
];

export function workshopUsernamesForPack(reviewerPack: string): string[] {
  return logins.logins
    .filter((login) => login.enabled && login.reviewerPack === reviewerPack)
    .map((login) => login.username);
}
