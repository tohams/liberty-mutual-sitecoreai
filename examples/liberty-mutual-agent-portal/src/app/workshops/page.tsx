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
              Explore the priorities you shared: simpler daily work, a stable
              platform, and relevant experiences that help Liberty Mutual earn
              independent agents’ business.
            </p>
            <div className="workshop-hero-meta">
              <span className="workshop-tag">
                <Users size={15} />
                Workshop number {session.reviewerPack}
              </span>
              <span>Guided steps. Clear results. Room to explore.</span>
            </div>
          </div>
          <div className="workshop-hero-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/workshops/assets/agent-workspace.png"
              alt="Liberty Mutual Agent Portal workspace with navigation, agency metrics, and priorities"
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
              Marketing separates the agent-facing portal from content authoring
              in SitecoreAI. Development separates the architecture from
              hands-on local development. Each guide names the account, website,
              and result for its exercise.
            </p>
          </div>
          <div className="workshop-paths">
            <Link href="/workshops/marketing" className="workshop-path">
              <span className="workshop-path-icon">
                <BookOpen size={25} />
              </span>
              <span className="workshop-eyebrow">MARKETING</span>
              <h3>
                Make every interaction
                <br />
                more relevant.
              </h3>
              <p>
                Explore the Agent Portal, then create and manage content in
                SitecoreAI. See personalization, Search, Forms, and A/B testing.
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
                Understand managed services and platform stability. Run the
                frontend locally, edit a component, and see it in Page Builder.
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
              <h2>Prepare for the workshop.</h2>
            </div>
            <div>
              <MousePointer2 size={22} />
              <h3>Keep two tabs open</h3>
              <p>
                Keep these instructions open while you work in the second tab.
                Portal steps use a fictional agent login; authoring steps use a
                separate <strong>Sitecore Cloud</strong> account. Watch the
                workshop team perform guides marked{" "}
                <strong>Presenter demonstration</strong>.
              </p>
              <a href="/login" target="_blank" rel="noreferrer">
                Open Agent Portal <ArrowUpRight size={15} />
              </a>
            </div>
            <div>
              <Users size={22} />
              <h3>Find your workshop number</h3>
              <p>
                Find your name in <strong>Attendee assignments</strong>. Your
                guide currently shows suffix{" "}
                <strong>.{session.reviewerPack}</strong>; if that number differs
                from your assignment, sign out of the guide and sign in with a
                portal username ending in your assigned number. The assignment
                page lists the full usernames. Keeping one number separates your
                portal work from other attendees’ work.
              </p>
              <Link href="/workshops/attendees">
                Find your attendee assignment <ArrowRight size={15} />
              </Link>
            </div>
            <div>
              <CircleCheck size={22} />
              <h3>Finish with cleanup</h3>
              <p>
                Follow the walkthrough’s <strong>Finish &amp; cleanup</strong>{" "}
                section so the next exercise begins from a known state. Signing
                out preserves saved work. A workshop-number reset restores
                portal work and creates fresh profiles; it does not undo shared
                Sitecore content edits.
              </p>
            </div>
            <Link href="/workshops/reset" className="workshop-home-reset-link">
              Reset a workshop number <ArrowRight size={16} />
            </Link>
          </section>
          <p className="workshop-directory-intro">
            First visit? Start with{" "}
            <Link href="/workshops/guide/start-and-switch-agents">
              Sign in and find your workshop number
            </Link>{" "}
            to distinguish agent browsing, content authoring, and local
            development before making changes.
          </p>
          <div className="workshop-evaluation-note">
            <strong>An environment for exploration</strong>
            <p>
              Insurance and agency data are synthetic. This sandbox is available
              for the agreed evaluation period and will then be deleted. Portal
              logins do not grant SitecoreAI authoring or administration access.
              The Sitecore workshop team—Angela Gustafson, Allen Blanton, and
              Thomas Lin—provides sign-in help, demonstrates authoring, and
              shares the schedule for Tuesday and Thursday office hours during
              the two-week evaluation.
            </p>
          </div>
        </section>
      </main>
    </WorkshopShell>
  );
}
