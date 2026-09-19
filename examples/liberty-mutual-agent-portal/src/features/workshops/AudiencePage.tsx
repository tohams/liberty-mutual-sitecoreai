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
    .map(
      ({
        slug,
        audience,
        category,
        title,
        summary,
        duration,
        steps,
        focus,
      }) => ({
        slug,
        audience,
        category,
        title,
        summary,
        duration,
        focus,
        stepCount: steps.length,
      }),
    );
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
              ? "Explore your marketing priorities: easier content creation, controlled publishing, and relevant engagement that helps Liberty Mutual earn independent agents’ business."
              : "Explore your platform priorities: less maintenance, faster delivery, and a dependable agent experience. Begin with the architecture, then make a local component change."}
          </p>
        </header>
        <p className="workshop-directory-intro">
          {marketing
            ? "The main walkthroughs address the Marketing priorities on presentation slides 3–4."
            : "The main walkthroughs address the Platform priorities on presentation slide 5."}{" "}
          {marketing
            ? "One campaign example shows how authored content and a custom portal component connect to saved business data."
            : "The architecture guide traces custom portal components to server APIs and replaceable business-data adapters."}{" "}
          Supporting tools and reference guides appear after the main
          capabilities. Begin with each guide’s{" "}
          <strong>Before you start</strong> section: it identifies the login,
          access, and starting state that produce the expected result. If you do
          not yet have the listed Sitecore access, follow the presenter for that
          exercise.
        </p>
        <GuideDirectory guides={guides} audience={audience} />
      </main>
    </WorkshopShell>
  );
}
