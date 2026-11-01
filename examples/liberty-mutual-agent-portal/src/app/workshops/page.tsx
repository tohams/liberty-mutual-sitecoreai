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
              The customer demo.
              <br />
              <em>Step by step.</em>
            </h1>
            <p>
              Follow Liberty Mutual’s prescribed public-website and Agent Portal
              demonstration in 45 minutes. The presenter walkthrough combines
              exact actions, expected results, and a talk track. The reference
              exercises provide additional detail when needed.
            </p>
            <div className="workshop-hero-meta">
              <span className="workshop-tag">
                <Users size={15} />
                Workshop number {session.reviewerPack}
              </span>
              <span>Two use cases. One prescribed sequence.</span>
            </div>
            <Link
              className="workshop-customer-demo-link"
              href="/workshops/demo"
            >
              Open the 45-minute customer demonstration <ArrowRight size={18} />
            </Link>
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
              You will move between four websites. Keep this guide open, and use
              each step’s link to open the tool you need in another tab.
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
                <h3>Public website</h3>
                <p>
                  This is the customer experience for the first use case. A
                  visitor finds an approved insurance answer, reviews its
                  source, and takes a useful next step. It uses its own Sitecore
                  site and rendering host in the same environment as the Agent
                  Portal.
                </p>
                <a
                  className="workshop-inline-link"
                  href="https://liberty-mutual-public-site.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the Liberty Mutual public website
                </a>
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
            <span className="workshop-eyebrow">REFERENCE EXERCISES</span>
            <h2>
              Explore the experience.
              <br />
              Then see how it is built.
            </h2>
            <p>
              These supporting exercises add depth after the{" "}
              <Link href="/workshops/demo">Customer demo</Link>.{" "}
              <strong>Marketing</strong> explains the agent experience and its
              content tools. <strong>Development &amp; architecture</strong>{" "}
              explains the services and local component development. Open the
              topics relevant to your role when you want to explore further.
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
                Open{" "}
                <Link
                  className="workshop-inline-link"
                  href="/workshops/attendees"
                >
                  Demo account numbers
                </Link>
                . Your guide currently shows suffix{" "}
                <strong>.{session.reviewerPack}</strong>; use{" "}
                <strong>01</strong> for Sitecore demonstrations. Numbers
                <strong> 02–20</strong> are unassigned and available for
                parallel testing. Agree on separate numbers before testing, and
                keep the same suffix when switching personas. A number separates
                portal work and profile histories; CMS content and settings
                remain shared.
              </p>
              <Link href="/workshops/attendees">
                Find your demo account numbers <ArrowRight size={15} />
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
            <strong>Presenter demonstration</strong> means a presenter makes
            changes to shared content while you watch. Record starting values
            before editing shared CMS content, and complete the guide’s cleanup.
            Other exercises use fictional portal accounts or a local frontend on
            your computer. First visit? Start with{" "}
            <Link href="/workshops/guide/start-and-switch-agents">
              Sign in and find your workshop number
            </Link>{" "}
            to distinguish agent browsing, content authoring, and local
            development before making changes.
          </p>
          <div className="workshop-evaluation-note">
            <strong>An environment for Sitecore demonstrations</strong>
            <p>
              Insurance and agency data are synthetic. Use fictional agent
              accounts to explore the portal and your authorized Sitecore
              account to manage its content and experiences. Portal logins do
              not grant SitecoreAI authoring or administration access. Complete
              the cleanup steps so the next demonstration starts cleanly.
            </p>
          </div>
        </section>
      </main>
    </WorkshopShell>
  );
}
