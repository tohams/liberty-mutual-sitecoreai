import type { Metadata } from "next";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { WorkshopShell } from "@/features/workshops/WorkshopShell";
import { WorkshopReset } from "@/features/workshops/WorkshopReset";
import manifest from "../../../../fixtures/manifest.json";

export const metadata: Metadata = {
  title: "Reset users | Liberty Mutual workshop guide",
};

export default async function WorkshopResetPage() {
  const session = await requireWorkshopSession("/workshops/reset");
  const environment =
    process.env.VERCEL_ENV === "production"
      ? "Live portal"
      : process.env.VERCEL_ENV === "preview"
        ? "Preview portal"
        : "Local portal";
  return (
    <WorkshopShell session={session} active="reset">
      <main id="workshop-main" className="workshop-reset-page">
        <header className="workshop-reset-heading">
          <span className="workshop-eyebrow">
            READY FOR ANOTHER WALKTHROUGH
          </span>
          <h1>Reset a reviewer number</h1>
          <p>
            Choose a number to reset all seven personas in that reviewer pack.
            Anyone signed in to this guide can run a reset directly.
          </p>
        </header>
        <WorkshopReset
          defaultPack={session.reviewerPack}
          packs={manifest.reviewerPacks}
          environment={environment}
        />
      </main>
    </WorkshopShell>
  );
}
