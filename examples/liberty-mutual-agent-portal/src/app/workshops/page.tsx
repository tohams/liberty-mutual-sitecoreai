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
              Explore the Liberty Mutual Agent Portal built for this workshop.
              See how SitecoreAI helps your teams manage content, tailor an
              agent’s experience, and deliver changes with less platform
              maintenance. These guides explain each action and its result.
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
          <section
            className="workshop-orientation"
            id="your-tools"
            aria-labelledby="workshop-tools-title"
          >
            <span className="workshop-eyebrow">START HERE</span>
            <h2 id="workshop-tools-title">Know which website you are using</h2>
            <p>
              You will move between three websites. Keep this guide open, and
              use each step’s link to open the tool you need in another tab.
            </p>
            <div className="workshop-orientation-cards">
              <div>
                <h3>Workshop guide</h3>
                <p>
                  You are here. This website contains the instructions,
                  screenshots, and account assignments. Sign in with the
                  fictional agent username provided by the workshop team. Its
                  number selects your examples throughout the guides.
                </p>
                <Link
                  className="workshop-inline-link"
                  href="/workshops/attendees"
                >
                  Find your workshop number and logins
                </Link>
              </div>
              <div>
                <h3>Agent Portal</h3>
                <p>
                  This is the website an independent agent would use. You will
                  sign in as fictional agents to see their guidance, resources,
                  and agency work. The portal requires its own sign-in, using
                  the same usernames and password as this guide.
                </p>
                <a
                  className="workshop-inline-link"
                  href="/login"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the Agent Portal login
                </a>
              </div>
              <div>
                <h3>SitecoreAI</h3>
                <p>
                  This is the platform behind the portal. Marketers use it to
                  manage pages, images, forms, personalization, and results. Its
                  visual page editor is called <strong>Page Builder</strong>.
                  Use your separately invited <strong>Sitecore Cloud</strong>{" "}
                  account when a guide opens these tools.
                </p>
                <a
                  className="workshop-inline-link"
                  href="https://app.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the SitecoreAI workshop environment
                </a>
              </div>
            </div>
          </section>
          <div className="workshop-section-intro">
            <span className="workshop-eyebrow">CHOOSE YOUR PATH</span>
            <h2>
              Start with the experience.
              <br />
              Then see how it is built.
            </h2>
            <p>
              Begin with <strong>Marketing</strong> to see what an agent
              experiences and how a marketer manages it. Continue to{" "}
              <strong>Development &amp; architecture</strong> to understand the
              services and change the website’s code on your computer. Follow
              the session’s selected exercises, then explore the others during
              the evaluation.
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
              <h3>Follow one step at a time</h3>
              <p>
                Read <strong>Before you start</strong> to identify the account
                and website for an exercise. Follow its numbered steps in order.
                After each action, compare your screen with{" "}
                <strong>What to observe and why</strong> before continuing.
                Enlarge screenshots when you need help finding a control; the
                fuchsia outlines and numbered notes identify the important
                parts.
              </p>
              <a href="/login" target="_blank" rel="noreferrer">
                Open Agent Portal <ArrowUpRight size={15} />
              </a>
            </div>
            <div>
              <Users size={22} />
              <h3>Find your workshop number</h3>
              <p>
                Find your name in{" "}
                <Link
                  className="workshop-inline-link"
                  href="/workshops/attendees"
                >
                  Attendee assignments
                </Link>
                . Your guide currently shows suffix{" "}
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
                section to leave the exercise ready for another visit. Signing
                out keeps saved work. A reset restores the starting portal data
                and gives your seven agents new profiles with no browsing
                history. Content changes in SitecoreAI have their own
                restoration steps.
              </p>
            </div>
            <Link href="/workshops/reset" className="workshop-home-reset-link">
              Reset a workshop number <ArrowRight size={16} />
            </Link>
          </section>
          <p className="workshop-directory-intro">
            <strong>Presenter demonstration</strong> means Angela, Allen, or
            Thomas makes changes to shared content while you watch. This keeps
            everyone from editing the same page. Other exercises specify what
            you can do with your assigned portal accounts or on your computer.{" "}
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
