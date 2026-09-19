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
            Find your name, then keep the same number across all seven agent
            personas. Reviewer number <strong>01</strong> is reserved for the
            workshop presenters.
          </p>
        </header>
        <div className="workshop-attendees-layout">
          <section aria-labelledby="workshop-roster-heading">
            <h2 id="workshop-roster-heading">Reviewer assignments</h2>
            <p className="workshop-attendees-caption">
              The highlighted row matches your current workshop sign-in.
              Unassigned numbers are available for additional attendees.
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
                out of this guide and sign in with your assigned suffix. The
                examples will then use that number.
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
                authoring. The persona usernames above do not sign into
                SitecoreAI or grant authoring permissions.
              </p>
              <p>
                Attendee <strong>Author</strong> and <strong>Approver</strong>{" "}
                roles and practice pairs are pending assignment. Confirm your
                role and pair before beginning the paired exercise. A practice
                pair number is different from your reviewer number.
              </p>
              <p>
                The scoped roles support the assigned practice-page exercise.
                Resource-page creation, image editing, and the{" "}
                <strong>Resource metadata</strong> app require additional
                access. Follow the presenter for those guides unless the
                required access has been assigned to your Sitecore account.
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
