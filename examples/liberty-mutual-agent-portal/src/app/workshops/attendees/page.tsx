import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import {
  workshopAttendees,
  workshopUsernamesForPack,
} from "@/server/workshops/attendees";
import { WorkshopShell } from "@/features/workshops/WorkshopShell";

export const metadata: Metadata = {
  title:
    "Your workshop number and agent logins | Liberty Mutual workshop guide",
};

export default async function WorkshopAttendeesPage() {
  const session = await requireWorkshopSession("/workshops/attendees");
  const usernames = workshopUsernamesForPack(session.reviewerPack);
  return (
    <WorkshopShell session={session} active="attendees">
      <main id="workshop-main" className="workshop-attendees-page">
        <Link className="workshop-back" href="/workshops">
          <ArrowLeft size={15} /> All workshops
        </Link>
        <header className="workshop-attendees-heading">
          <span className="workshop-eyebrow">YOUR WORKSHOP ACCOUNTS</span>
          <h1>Your workshop number and agent logins</h1>
          <p>
            Each attendee receives seven fictional agent accounts, with
            different roles, licenses, and business histories. The guides call
            these agents <strong>personas</strong> and tell you which one to use
            for each exercise. Your workshop number is the part after the dot in
            every username; keeping it the same separates your activity from
            other attendees’ activity. Number <strong>01</strong> is reserved
            for the workshop presenters.
          </p>
        </header>
        <div className="workshop-attendees-layout">
          <section aria-labelledby="workshop-roster-heading">
            <h2 id="workshop-roster-heading">Find your workshop number</h2>
            <p className="workshop-attendees-caption">
              The highlighted row matches your current workshop sign-in. If your
              name is missing, ask the Sitecore workshop team to assign one of
              the unassigned numbers before beginning. This avoids two attendees
              changing the same portal workspace.
            </p>
            <table className="workshop-attendees-table">
              <caption className="sr-only">
                Workshop attendees and their assigned workshop numbers
              </caption>
              <thead>
                <tr>
                  <th scope="col">Number</th>
                  <th scope="col">Attendee</th>
                </tr>
              </thead>
              <tbody>
                {workshopAttendees.map(({ reviewerPack, displayName }) => {
                  const current = reviewerPack === session.reviewerPack;
                  return (
                    <tr
                      key={reviewerPack}
                      className={current ? "is-current" : undefined}
                    >
                      <th scope="row">
                        {reviewerPack}
                        {current && (
                          <span className="workshop-current-pack">
                            Signed in
                          </span>
                        )}
                      </th>
                      <td>
                        {displayName ?? (
                          <span className="workshop-unassigned">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <aside
            className="workshop-attendee-accounts"
            aria-labelledby="workshop-usernames-heading"
          >
            <div className="workshop-attendee-account-card">
              <Users size={24} />
              <span className="workshop-eyebrow">YOUR CURRENT SIGN-IN</span>
              <h2 id="workshop-usernames-heading">
                Workshop {session.reviewerPack}
              </h2>
              <p>
                When a walkthrough names an agent, use that agent’s username
                from this list. Every account assigned to you ends in{" "}
                <strong>.{session.reviewerPack}</strong>:
              </p>
              <ul className="workshop-persona-usernames">
                {usernames.map((username) => (
                  <li key={username}>
                    <code>{username}</code>
                  </li>
                ))}
              </ul>
              <p className="workshop-attendee-password">
                Portal and workshop password: <strong>Sitecore</strong>
              </p>
              <p>
                If your assigned number differs from the highlighted row, sign
                out of this guide and sign in with a full portal username ending
                in your assigned suffix. The examples will then use that number.
                For example, choose the Daniel username with your number when a
                guide asks you to inspect Daniel’s experience; changing personas
                does not change your workshop number.
              </p>
            </div>
            <section
              className="workshop-attendee-sitecore"
              aria-labelledby="workshop-sitecore-access-heading"
            >
              <h2 id="workshop-sitecore-access-heading">
                SitecoreAI authoring access is separate
              </h2>
              <p>
                <strong>SitecoreAI</strong> is the platform used to manage the
                portal’s content and personalized experiences. Editing content
                is called <strong>authoring</strong>; it uses your invited
                <strong> Sitecore Cloud</strong> account. Open the{" "}
                <a
                  className="workshop-inline-link"
                  href="https://portal.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sitecore Cloud Portal
                </a>
                , and select
                <strong> Safeco Insurance Company of America POC</strong>, then
                <strong> SitecoreAI / Demo</strong>. Open{" "}
                <a
                  className="workshop-inline-link"
                  href="https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <strong>Page Builder</strong>
                </a>
                , the visual page editor, and choose the site
                <strong> Liberty Mutual Agent Portal</strong> (site name:
                <strong> liberty-mutual-agent-portal</strong>). These names
                identify this shared customer sandbox. The persona usernames
                above do not sign into SitecoreAI or grant authoring
                permissions.
              </p>
              <p>
                Guides marked <strong>Presenter demonstration</strong> use
                shared content. The workshop team makes those changes while
                attendees observe. For{" "}
                <strong>Review and publish content</strong>, the presenters use
                separate <strong>Author</strong> and
                <strong> Approver</strong> accounts to show who can edit,
                submit, and approve a page. Attendees do not need a partner or
                two Sitecore accounts.
              </p>
              <p>
                Developer exercises run a copy of the portal’s frontend—the
                website’s display and interaction code—on your computer at
                <strong> http://localhost:3000</strong>. Those exercises use
                <strong> daniel.01</strong> because their saved portal work is
                stored locally. Code changes affect that local copy; content
                edits in <strong>Page Builder</strong> still change the shared
                content in SitecoreAI.
              </p>
              <Link href="/workshops/guide/author-approver-workflow">
                View the publishing workflow demonstration{" "}
                <ArrowRight size={16} />
              </Link>
            </section>
            <nav
              className="workshop-attendee-resources"
              aria-label="Your workshop resources"
            >
              <h2>Your workshop resources</h2>
              <Link href="/workshops/guide/start-and-switch-agents">
                Quick orientation <ArrowRight size={16} />
              </Link>
              <Link href="/workshops/guide/local-setup">
                Local development prerequisites <ArrowRight size={16} />
              </Link>
              <Link href="/workshops/reset">
                Reset your workshop number <ArrowRight size={16} />
              </Link>
            </nav>
          </aside>
        </div>
      </main>
    </WorkshopShell>
  );
}
