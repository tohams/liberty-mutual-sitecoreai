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
    .map(({ slug, audience, category, title, summary, focus }) => ({
      slug,
      audience,
      category,
      title,
      summary,
      focus,
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
          <h1>{marketing ? "Marketing" : "Development & architecture"}</h1>
          <p>
            {marketing
              ? "First experience the portal as an agent. Then see how marketers create and manage that experience in SitecoreAI."
              : "First understand how the platform works. Then run the frontend on your computer and make a component change."}
          </p>
        </header>
        <p className="workshop-directory-intro">
          {marketing
            ? "These exercises address your marketing priorities: simpler content creation, controlled publishing, and relevant agent engagement."
            : "These exercises address your platform priorities: less maintenance, faster delivery, and a dependable agent experience."}{" "}
          If this is your first visit, read{" "}
          <Link className="workshop-inline-link" href="/workshops#your-tools">
            how the workshop guide, Agent Portal, and SitecoreAI relate
          </Link>
          . The sections follow the workshop sequence; their navigation links
          also let you return to a topic later. Open a walkthrough, read{" "}
          <strong>Before you start</strong>, and follow its numbered steps.{" "}
          <strong>What to observe and why</strong> explains the result to check.{" "}
          <strong>Presenter demonstration</strong> means the workshop team
          changes shared content while you watch, so participants do not
          overwrite each other’s edits.
        </p>
        <GuideDirectory guides={guides} audience={audience} />
      </main>
    </WorkshopShell>
  );
}
