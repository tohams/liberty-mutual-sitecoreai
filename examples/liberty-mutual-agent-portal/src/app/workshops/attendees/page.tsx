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
  title: "Attendees and reviewer numbers | Liberty Mutual workshop guide",
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
          <h1>Attendees and reviewer numbers</h1>
          <p>
            A reviewer number groups seven fictional agent logins for one
            attendee. Find your name below, then keep that number when switching
            personas so your portal work and profile history remain separate
            from other attendees’ work. Number <strong>01</strong> is reserved
            for the workshop presenters.
          </p>
        </header>
        <div className="workshop-attendees-layout">
          <section aria-labelledby="workshop-roster-heading">
            <h2 id="workshop-roster-heading">Reviewer assignments</h2>
            <p className="workshop-attendees-caption">
              The highlighted row matches your current workshop sign-in. If your
              name is missing, ask the Sitecore workshop team to assign one of
              the unassigned numbers before beginning. This avoids two attendees
              changing the same portal workspace.
            </p>
            <table className="workshop-attendees-table">
              <caption className="sr-only">
                Workshop attendees and their assigned reviewer numbers
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
                Reviewer {session.reviewerPack}
              </h2>
              <p>
                Use the persona named in each walkthrough with suffix{" "}
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
                For example, choose the Daniel username in your pack when a
                guide asks you to inspect Daniel’s experience; changing personas
                does not change your reviewer number.
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
                Use your invited <strong>Sitecore Cloud</strong> account for
                authoring. In <strong>Sitecore Cloud Portal</strong>, select
                <strong> Safeco Insurance Company of America POC</strong>, then
                <strong> SitecoreAI / Demo</strong>. Open{" "}
                <strong>Page Builder</strong>, and choose the site
                <strong> Liberty Mutual Agent Portal</strong> (site name:
                <strong> liberty-mutual-agent-portal</strong>). These names
                identify this shared customer sandbox. The persona usernames
                above do not sign into SitecoreAI or grant authoring
                permissions.
              </p>
              <p>
                Attendee <strong>Author</strong> and <strong>Approver</strong>{" "}
                roles and practice pairs are pending assignment. The Sitecore
                workshop team—Angela Gustafson, Allen Blanton, and Thomas
                Lin—will provide your role, partner, and practice-page number.
                Follow the presenter until those are confirmed. A practice pair
                identifies a shared CMS page; it is not inferred from your
                portal reviewer number.
              </p>
              <p>
                The scoped roles support the assigned practice-page exercise.
                Resource-page creation, image editing, and the{" "}
                <strong>Resource metadata</strong> app require additional
                access. Follow the presenter for those guides unless the
                required access has been assigned to your Sitecore account.
              </p>
              <p>
                Local development guides use <strong>daniel.01</strong> at
                <strong> http://localhost:3000</strong> because the default
                local setup stores portal work on your computer. Local
                source-code edits stay on that computer; edits to content in
                <strong> Page Builder</strong> still affect the shared CMS.
              </p>
              <Link href="/workshops/guide/author-approver-workflow">
                View the author and approver exercise <ArrowRight size={16} />
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
                Reset your reviewer number <ArrowRight size={16} />
              </Link>
            </nav>
          </aside>
        </div>
      </main>
    </WorkshopShell>
  );
}
