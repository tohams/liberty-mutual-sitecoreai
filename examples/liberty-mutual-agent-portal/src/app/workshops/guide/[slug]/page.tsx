import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Info,
  RotateCcw,
  Users,
} from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { WorkshopShell } from "@/features/workshops/WorkshopShell";
import {
  CopyCode,
  GuideScreenshot,
} from "@/features/workshops/WorkshopControls";
import {
  findWorkshopGuide,
  workshopGuides,
} from "@/features/workshops/content";
import { GuideText } from "@/features/workshops/GuideText";
import type { GuideLink } from "@/features/workshops/types";
function ExternalLinks({ links }: { links?: GuideLink[] }) {
  return links?.length ? (
    <div className="workshop-resource-links">
      {links.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noreferrer"
        >
          {link.label}
          <ArrowUpRight size={15} />
        </a>
      ))}
    </div>
  ) : null;
}
export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireWorkshopSession(`/workshops/guide/${slug}`);
  const guide = findWorkshopGuide(slug);
  if (!guide) notFound();
  const pack = guide.accountScope === "local" ? "01" : session.reviewerPack;
  function contextual(text: string) {
    return text
      .replace(
        /\b(avery|maya|jordan|daniel|priya|marcus|elena)\.01\b/gi,
        `$1.${pack}`,
      )
      .replaceAll("{{pack}}", pack);
  }
  const related = (guide.related ?? [])
    .map(findWorkshopGuide)
    .filter((item) => !!item);
  const siblings = workshopGuides.filter((g) => g.audience === guide.audience);
  const next = siblings[siblings.findIndex((g) => g.slug === slug) + 1];
  return (
    <WorkshopShell session={session} active={guide.audience}>
      <main className="workshop-guide-page" id="workshop-main">
        <div className="workshop-guide-top">
          <Link className="workshop-back" href={`/workshops/${guide.audience}`}>
            <ArrowLeft size={15} />
            {guide.audience === "marketing"
              ? "Marketing walkthroughs"
              : "Development & architecture"}
          </Link>
          <span>{guide.category}</span>
        </div>
        <div className="workshop-reading-layout">
          <aside className="workshop-guide-toc">
            <span className="workshop-eyebrow">IN THIS WALKTHROUGH</span>
            <nav aria-label="Walkthrough steps">
              <a href="#before-you-start">Before you start</a>
              {guide.steps.map((step, index) => (
                <a key={index} href={`#step-${index + 1}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {contextual(step.title)}
                </a>
              ))}
              <a href="#cleanup">Finish & cleanup</a>
            </nav>
          </aside>
          <article>
            <header className="workshop-guide-heading">
              <span className="workshop-eyebrow">
                {guide.audience === "marketing"
                  ? "MARKETING WALKTHROUGH"
                  : "DEVELOPER & ARCHITECT WALKTHROUGH"}
              </span>
              <h1>{guide.title}</h1>
              <p>
                <GuideText text={contextual(guide.summary)} />
              </p>
              <div className="workshop-guide-meta">
                <span>
                  <Clock3 size={16} />
                  {guide.duration}
                </span>
                <span>{guide.steps.length} steps</span>
                {guide.personas.length > 0 && (
                  <span>
                    <Users size={16} />
                    {guide.personas
                      .map((persona) =>
                        /^(avery|maya|jordan|daniel|priya|marcus|elena)$/.test(
                          persona,
                        )
                          ? `${persona}.${pack}`
                          : contextual(persona),
                      )
                      .join(" · ")}
                  </span>
                )}
              </div>
            </header>
            <section className="workshop-outcome">
              <Check size={21} />
              <div>
                <h2>What you will see</h2>
                <p>
                  <GuideText text={contextual(guide.outcome)} />
                </p>
              </div>
            </section>
            <section className="workshop-preparation" id="before-you-start">
              <h2>Before you start</h2>
              <ul>
                {guide.prerequisites.map((line, index) => (
                  <li key={index}>
                    <GuideText text={contextual(line)} />
                  </li>
                ))}
              </ul>
              {guide.accountScope === "local" && (
                <p className="workshop-callout">
                  <Info size={17} />
                  This exercise runs on your own machine. Its .01 account is
                  isolated from the shared workshop packs.
                </p>
              )}
              <ExternalLinks links={guide.links} />
            </section>
            <div className="workshop-steps">
              {guide.steps.map((step, index) => (
                <section
                  className="workshop-step"
                  id={`step-${index + 1}`}
                  key={index}
                >
                  <div className="workshop-step-heading">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h2>{contextual(step.title)}</h2>
                  </div>
                  <div className="workshop-step-body">
                    <div className="workshop-actions">
                      {step.action.map((line, i) => (
                        <p key={i}>
                          <GuideText text={contextual(line)} />
                        </p>
                      ))}
                    </div>
                    {step.code && <CopyCode code={contextual(step.code)} />}
                    <ExternalLinks links={step.links} />
                    {step.expected.length > 0 && (
                      <div className="workshop-expected">
                        <span>
                          <Check size={16} />
                          WHAT TO OBSERVE
                        </span>
                        {step.expected.map((line, i) => (
                          <p key={i}>
                            <GuideText text={contextual(line)} />
                          </p>
                        ))}
                      </div>
                    )}
                    {step.note && (
                      <div className="workshop-note">
                        <Info size={17} />
                        <p>
                          <GuideText text={contextual(step.note)} />
                        </p>
                      </div>
                    )}
                    {step.image && <GuideScreenshot image={step.image} />}
                  </div>
                </section>
              ))}
            </div>
            <section className="workshop-cleanup" id="cleanup">
              <span className="workshop-cleanup-icon">
                <RotateCcw size={21} />
              </span>
              <h2>{guide.cleanup.title ?? "Finish & cleanup"}</h2>
              {guide.cleanup.body.map((line, index) => (
                <p key={index}>
                  <GuideText text={contextual(line)} />
                </p>
              ))}
              {guide.cleanup.code && (
                <CopyCode code={contextual(guide.cleanup.code)} />
              )}
              <ExternalLinks links={guide.cleanup.links} />
            </section>
            {(related.length > 0 || next) && (
              <section className="workshop-next">
                <h2>Keep exploring</h2>
                {(related.length ? related : [next!]).map((item) => (
                  <Link href={`/workshops/guide/${item.slug}`} key={item.slug}>
                    <span>{item.title}</span>
                    <ArrowRight size={18} />
                  </Link>
                ))}
              </section>
            )}
          </article>
        </div>
      </main>
    </WorkshopShell>
  );
}
