import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  ListFilter,
  UserCheck,
} from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { WorkshopShell } from "@/features/workshops/WorkshopShell";
import { MarketingPreferences } from "@/features/workshops/preferences/MarketingPreferences";
import styles from "@/features/workshops/preferences/Preferences.module.css";

export const metadata: Metadata = {
  title: "Honor communication preferences | Liberty Mutual workshop guide",
};

const CONTEXT =
  "organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df";
const SCHEMA = `https://app.sitecorecloud.io/optimization/settings/profile-schema?${CONTEXT}`;
const AUDIENCES = `https://app.sitecorecloud.io/optimization/audience/fc7ce3e0-c300-4f2f-9b21-a22058065db8?${CONTEXT}`;
const PERSONALIZATION = `https://app.sitecorecloud.io/optimization/personalization/af90f4c1-20ab-4ae3-871d-97e91f22431b?experienceType=INTERACTIVE_API_FLOW&section=configuration&${CONTEXT}`;
const IMPORTS = `https://app.sitecorecloud.io/optimization/settings/profile-import?${CONTEXT}`;

export default async function MarketingPreferencesPage() {
  const session = await requireWorkshopSession("/workshops/preferences");
  return (
    <WorkshopShell session={session} active="marketing">
      <main id="workshop-main" className={styles.page}>
        <Link className="workshop-back" href="/workshops/marketing">
          <ArrowLeft size={15} /> Marketing walkthroughs
        </Link>
        <header className={styles.heading}>
          <span className="workshop-eyebrow">
            KNOWN CHOICE, GOVERNED ACTIVATION
          </span>
          <h1>Honor communication preferences</h1>
          <p>
            An agent’s communication choice can come from a preference center or
            another business system. Send a known preference to
            <strong> SitecoreAI’s Unified Data Layer</strong>, inspect the
            native profiles, and let a live native personalization decide who
            receives a <strong>Marketing outreach preview</strong>. Observe the
            same agent become eligible, opt out, and become eligible again after
            restoration.
          </p>
          <Link
            className="workshop-inline-link"
            href="/workshops/guide/honor-communication-preferences"
          >
            Follow the preference walkthrough <ArrowRight size={15} />
          </Link>
        </header>

        <ol
          className={styles.flow}
          aria-label="How a known preference controls marketing outreach"
        >
          <li>
            <UserCheck size={23} />
            <div>
              <strong>Record a known choice</strong>
              <span>
                The buttons below supply sample preference-center input.
              </span>
            </div>
          </li>
          <li>
            <Database size={23} />
            <div>
              <strong>Import it into SitecoreAI</strong>
              <span>
                The real profile import updates native Unified Data Layer
                records.
              </span>
            </div>
          </li>
          <li>
            <ListFilter size={23} />
            <div>
              <strong>Withhold the marketing outreach</strong>
              <span>
                A live native decision reads the stored choice. An opted-out
                profile receives no outreach preview.
              </span>
            </div>
          </li>
        </ol>

        <MarketingPreferences />

        <section
          className={styles.explanation}
          aria-labelledby="inspect-native-preferences"
        >
          <span className="workshop-eyebrow">INSPECT THE NATIVE CONTROLS</span>
          <h2 id="inspect-native-preferences">
            Inspect the stored choice and the live decision
          </h2>
          <p>
            In <strong>Profile schema</strong>, find the published extension
            fields that describe the imported preference. Open each comparison
            profile from its card to inspect its stored attributes. Open
            <strong> Liberty Mutual marketing eligibility</strong> to inspect
            the native personalization: it reads the profile’s stored{" "}
            <strong>marketingSuppressed</strong>
            value and returns <strong>marketingEligible = true</strong> only for
            an explicit false suppression choice. A true or unspecified choice
            is ineligible. The page displays a recipient only after receiving a
            valid native response for the same profile ID as the completed
            import.
          </p>
          <div className={styles.links}>
            <a href={PERSONALIZATION} target="_blank" rel="noopener noreferrer">
              Open Liberty Mutual marketing eligibility <ArrowRight size={15} />
            </a>
            <a href={SCHEMA} target="_blank" rel="noopener noreferrer">
              Open Profile schema <ArrowRight size={15} />
            </a>
            <a href={AUDIENCES} target="_blank" rel="noopener noreferrer">
              Open Agents eligible for marketing <ArrowRight size={15} />
            </a>
            <a href={IMPORTS} target="_blank" rel="noopener noreferrer">
              Open Profile import history <ArrowRight size={15} />
            </a>
            <Link href="/workshops/guide/honor-communication-preferences">
              Follow the native checks <ArrowRight size={15} />
            </Link>
          </div>
          <p>
            The preference input and email preview are part of this
            implementation. Profile storage, the schema, profile import, and the
            live personalization are native <strong>SitecoreAI</strong>{" "}
            capabilities. No email is sent. Operational services and licensing
            guidance are not marketing messages; this choice does not remove an
            agent’s access to those services.
          </p>
          <p>
            The saved <strong>Agents eligible for marketing</strong> Audience is
            an additional example of a marketer-managed rule using
            <strong> Marketing Suppressed is false</strong>. Its membership
            follows its own schedule. The outreach preview uses a fresh native
            decision for every check, so this walkthrough does not wait for an
            Audience calculation.
          </p>
        </section>

        <section
          className={styles.explanation}
          aria-labelledby="different-privacy-choices"
        >
          <span className="workshop-eyebrow">
            TWO CHOICES WITH DIFFERENT PURPOSES
          </span>
          <h2 id="different-privacy-choices">
            Communication preference and website collection
          </h2>
          <p>
            <strong>Marketing suppression</strong> is a known profile attribute
            used to exclude someone from a marketing audience. A website’s
            <strong> Privacy choices</strong> controls whether that browser
            sends optional analytics and personalization events. Both choices
            matter; a preference-center integration supplies the first, while
            the public website’s consent controls govern the second.
          </p>
          <div className={styles.links}>
            <a
              href="https://liberty-mutual-public-site.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the public website’s Privacy choices <ArrowRight size={15} />
            </a>
          </div>
        </section>
      </main>
    </WorkshopShell>
  );
}
