import Link from "next/link";
import { ArrowLeft, BookOpen, Code2 } from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { WorkshopShell } from "./WorkshopShell";
import { GuideDirectory } from "./GuideDirectory";
import { workshopGuides } from "./content";
import type { WorkshopAudience } from "./types";
export async function AudiencePage({
  audience,
}: {
  audience: WorkshopAudience;
}) {
  const session = await requireWorkshopSession(`/workshops/${audience}`);
  const marketing = audience === "marketing";
  const guides = workshopGuides
    .filter((guide) => guide.audience === audience)
    .map(({ slug, audience, category, title, summary, duration, steps }) => ({
      slug,
      audience,
      category,
      title,
      summary,
      duration,
      stepCount: steps.length,
    }));
  return (
    <WorkshopShell session={session} active={audience}>
      <main className="workshop-directory-page" id="workshop-main">
        <Link className="workshop-back" href="/workshops">
          <ArrowLeft size={15} />
          All workshops
        </Link>
        <header className="workshop-directory-header">
          <span className="workshop-large-icon">
            {marketing ? <BookOpen size={28} /> : <Code2 size={28} />}
          </span>
          <span className="workshop-eyebrow">
            {marketing
              ? "RELEVANT EXPERIENCES. EASIER DAILY WORK."
              : "STABLE SERVICES. CLEAR OWNERSHIP. FAST FEEDBACK."}
          </span>
          <h1>
            {marketing
              ? "Agent experience & marketing"
              : "Development & architecture"}
          </h1>
          <p>
            {marketing
              ? "Follow the agent journey, then explore the tools that help marketing create, personalize and improve it."
              : "Connect the experience to its implementation. Start locally, inspect the contracts and follow changes into delivery."}
          </p>
        </header>
        <GuideDirectory guides={guides} audience={audience} />
      </main>
    </WorkshopShell>
  );
}
