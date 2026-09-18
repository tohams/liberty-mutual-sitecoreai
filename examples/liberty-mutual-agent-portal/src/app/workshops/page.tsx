import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Code2,
  MousePointer2,
  CircleCheck,
  Users,
} from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { WorkshopShell } from "@/features/workshops/WorkshopShell";
import { workshopGuides } from "@/features/workshops/content";
export default async function WorkshopHome() {
  const session = await requireWorkshopSession();
  return (
    <WorkshopShell session={session}>
      <main id="workshop-main">
        <section className="workshop-home-hero">
          <div>
            <span className="workshop-eyebrow">
              LIBERTY MUTUAL + SITECOREAI
            </span>
            <h1>
              Your workshop.
              <br />
              <em>Your pace.</em>
            </h1>
            <p>
              Experience the agent portal, explore the marketing tools, and
              understand how the implementation fits together.
            </p>
            <div className="workshop-hero-meta">
              <span className="workshop-tag">
                <Users size={15} />
                Reviewer pack {session.reviewerPack}
              </span>
              <span>Guided steps. Clear results. Room to explore.</span>
            </div>
          </div>
          <div className="workshop-hero-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/workshops/assets/agent-workspace.png"
              alt="Liberty Mutual Agent Portal workspace with navigation, agency metrics and priorities"
              width="1304"
              height="998"
            />
            <span>THE EXPERIENCE YOU WILL EXPLORE</span>
          </div>
        </section>
        <section className="workshop-home-content">
          <div className="workshop-section-intro">
            <span className="workshop-eyebrow">CHOOSE YOUR PATH</span>
            <h2>
              Start with the experience.
              <br />
              Then see how it is built.
            </h2>
            <p>
              Both sections are available to everyone. Begin with the workshop
              for your role, or go directly to the capability you want to
              explore.
            </p>
          </div>
          <div className="workshop-paths">
            <Link href="/workshops/marketing" className="workshop-path">
              <span className="workshop-path-icon">
                <BookOpen size={25} />
              </span>
              <span className="workshop-eyebrow">
                AGENT EXPERIENCE & MARKETING
              </span>
              <h3>
                Make every interaction
                <br />
                more relevant.
              </h3>
              <p>
                Explore personalization, Search, content authoring, Forms,
                experimentation and Agentic Studio.
              </p>
              <div>
                <span>
                  {
                    workshopGuides.filter((g) => g.audience === "marketing")
                      .length
                  }{" "}
                  walkthroughs
                </span>
                <strong>
                  Explore marketing <ArrowRight size={19} />
                </strong>
              </div>
            </Link>
            <Link
              href="/workshops/development"
              className="workshop-path workshop-path-dev"
            >
              <span className="workshop-path-icon">
                <Code2 size={25} />
              </span>
              <span className="workshop-eyebrow">
                DEVELOPMENT & ARCHITECTURE
              </span>
              <h3>
                See the structure.
                <br />
                Make a change.
              </h3>
              <p>
                Trace the architecture, run the project locally, edit a
                component and follow the release paths.
              </p>
              <div>
                <span>
                  {
                    workshopGuides.filter((g) => g.audience === "development")
                      .length
                  }{" "}
                  walkthroughs
                </span>
                <strong>
                  Explore development <ArrowRight size={19} />
                </strong>
              </div>
            </Link>
          </div>
          <section className="workshop-before">
            <div>
              <span className="workshop-eyebrow">BEFORE YOU BEGIN</span>
              <h2>A few things to keep close.</h2>
            </div>
            <div>
              <MousePointer2 size={22} />
              <h3>Keep two tabs open</h3>
              <p>
                Read the guide here and follow the steps in the portal or
                SitecoreAI in another tab.
              </p>
              <a
                href="https://liberty-mutual-agent-portal.vercel.app/login"
                target="_blank"
                rel="noreferrer"
              >
                Open Agent Portal <ArrowUpRight size={15} />
              </a>
            </div>
            <div>
              <Users size={22} />
              <h3>Use your assigned pack</h3>
              <p>
                Your examples use suffix{" "}
                <strong>.{session.reviewerPack}</strong>. Switch personas as
                directed. Local development uses an isolated .01 account.
              </p>
            </div>
            <div>
              <CircleCheck size={22} />
              <h3>Finish with cleanup</h3>
              <p>
                Each walkthrough explains what to restore. Sign-out keeps saved
                work. Resets require coordination with the workshop team.
              </p>
            </div>
          </section>
          <div className="workshop-evaluation-note">
            <strong>An environment for exploration</strong>
            <p>
              Insurance and agency data are synthetic. This sandbox is available
              for the agreed evaluation period and will then be deleted.
              SitecoreAI administration requires your separately assigned
              Sitecore access.
            </p>
          </div>
        </section>
      </main>
    </WorkshopShell>
  );
}
