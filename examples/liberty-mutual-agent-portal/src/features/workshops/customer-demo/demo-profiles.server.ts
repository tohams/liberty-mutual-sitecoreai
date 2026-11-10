import "server-only";
import { getWorkshopResetStatus } from "@/server/workshops/reset";
import { CONTEXT } from "./demo-destinations";

export interface PresenterProfileRef {
  username: string;
  label: string;
  profileId: string;
  identifier: string;
  href: string;
}

/** Read the active number 01 profile set's verified receipt without requesting a reset. */
export async function getPresenterProfiles(): Promise<PresenterProfileRef[]> {
  try {
    const status = await getWorkshopResetStatus("01");
    return ["avery.01", "daniel.01"].flatMap((username) => {
      const profile = status.profiles.find(
        (entry) => entry.username === username,
      );
      if (!profile?.profileId?.trim()) return [];
      return [
        {
          username,
          label: profile.name || username,
          profileId: profile.profileId,
          identifier: profile.identifier,
          href: `https://app.sitecorecloud.io/optimization/profiles/${encodeURIComponent(profile.profileId)}?${CONTEXT}`,
        },
      ];
    });
  } catch {
    return [];
  }
}
