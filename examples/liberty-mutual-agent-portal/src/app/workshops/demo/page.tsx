import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3, Mic2 } from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { WorkshopShell } from "@/features/workshops/WorkshopShell";
import { GuideText } from "@/features/workshops/GuideText";
import { GuideScreenshot } from "@/features/workshops/WorkshopControls";
import { customerDemoChapters } from "@/features/workshops/customer-demo/content";
import {
  customerDemoSchedule,
  DEMO_TOTAL_MINUTES,
  elapsedTime,
} from "@/features/workshops/customer-demo/timing";
import styles from "@/features/workshops/customer-demo/CustomerDemo.module.css";

export const metadata: Metadata = {
  title: "45-minute customer demonstration | Liberty Mutual + SitecoreAI",
  description:
    "Liberty Mutual’s prescribed public-website and Independent Agent Portal demonstration, with clicks, expected results, and presenter talk tracks.",
};

function Lines({
  lines,
  ordered = false,
}: {
  lines: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List>
      {lines.map((line, index) => (
        <li key={index}>
          <GuideText text={line} openLinksInNewTab />
        </li>
      ))}
    </List>
  );
}

export default async function CustomerDemoPage() {
  const session = await requireWorkshopSession("/workshops/demo");
  const schedule = customerDemoSchedule(customerDemoChapters);
  return (
    <WorkshopShell session={session} active="demo">
      <main id="workshop-main" className={styles.page}>
        <header className={styles.heading}>
          <span className="workshop-eyebrow">
            THE CUSTOMER’S PRESCRIBED FLOW
          </span>
          <h1>Liberty Mutual demonstration walkthrough</h1>
          <p>
            Follow the public-website story, then the Independent Agent Portal
            story, in the order requested by Liberty Mutual. Each numbered step
            pairs the on-screen actions with what to observe and what to say.
          </p>
          <div className={styles.introLinks}>
            <span className={styles.timeBudget}>
              <Clock3 size={18} aria-hidden="true" />
              {DEMO_TOTAL_MINUTES} minutes total
            </span>
            <a href="#opening" className={styles.startLink}>
              Begin the demonstration{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </header>

        <div className={styles.layout}>
          <aside className={styles.navigation}>
            <nav aria-label="Customer demonstration sequence">
              <a href="#preparation">Before presenting</a>
              <a href="#opening">00:00 · Opening</a>
              {customerDemoChapters.map((chapter) => (
                <div key={chapter.id} className={styles.navChapter}>
                  <a href={`#${chapter.id}`} className={styles.navChapterTitle}>
                    {chapter.id === "public"
                      ? "Public website"
                      : "Agent Portal"}
                  </a>
                  {chapter.steps.map((step) => {
                    const timing = schedule.find(
                      (entry) => entry.id === step.id,
                    )!;
                    const number =
                      schedule.findIndex((entry) => entry.id === step.id) + 1;
                    return (
                      <a href={`#${step.id}`} key={step.id}>
                        <span>{String(number).padStart(2, "0")}</span>
                        <span>
                          {step.title}
                          <small>
                            {elapsedTime(timing.start)}–
                            {elapsedTime(timing.end)}
                          </small>
                        </span>
                      </a>
                    );
                  })}
                </div>
              ))}
              <a href="#closing">44:00 · Close</a>
              <a href="#reset">After the demonstration</a>
            </nav>
          </aside>

          <article className={styles.article}>
            <details id="preparation" className={styles.preparation}>
              <summary>
                Before presenting · preparation outside the 45 minutes
              </summary>
              <div>
                <h2>Open the accounts and tools before the audience joins</h2>
                <Lines
                  lines={[
                    "Keep this guide signed in. Use presenter agent logins **avery.01** and **daniel.01** at the [**Agent Portal login**](https://liberty-mutual-agent-portal.vercel.app/login). Their shared synthetic portal password is **Sitecore1**. Use separate browser profiles for the two agents so their sessions remain independent.",
                    "Prepare three separate **Sitecore Cloud** browser profiles: **Author** can edit and submit, **Approver** can approve, and an **administrator acting as publisher** performs publication. Open **Safeco Insurance Company of America POC** → **SitecoreAI / Demo**. Keeping these profiles ready demonstrates the actual permission boundaries without spending the live slot signing in.",
                    "In **Page Builder**, use **English** and **Default editing host**. **Liberty Mutual Public Website** owns the public pages, approved answers, and shared disclosure. **Liberty Mutual Agent Portal** owns the agent Home page and its priority collections. The two sites have separate editing and delivery hosts.",
                    "Open the [**public website**](https://liberty-mutual-public-site.vercel.app/), [**published-answer API experience**](/workshops/content-api), [**communication preferences**](/workshops/preferences), and **SitecoreAI** in the prepared browser profiles. Check that the native comparison profiles and **Agents eligible for marketing** Audience have their restored starting values. The full import/reset exercise is available from [**Honor communication preferences**](/workshops/guide/honor-communication-preferences).",
                    "Record the current approved versions of **Bundle car and home**, **Agency growth priorities**, and **Product availability notice** before editing. Keep their original versions intact. Confirm that the temporary page name **coverage-guide-live** is available. Set the public visitor’s **Privacy choices** to **Allow personalization** before the analytics journey; demonstrate the choice explicitly in the first step.",
                    "Prepare the native **Search sources** page, **Analytics → Events**, and the saved **agency-growth** and **producer-priorities** experiences. Keep the two public article/API tabs open for publication verification. Confirm these links during preflight; refresh a slow page, then open one fresh tab before changing the running demonstration.",
                  ]}
                />
                <p className={styles.prepNote}>
                  The timed flow uses the existing preference records and rule.
                  Running asynchronous preference imports or rebuilding an index
                  belongs in preparation or the supporting walkthroughs.
                </p>
              </div>
            </details>

            <section id="opening" className={styles.opening}>
              <span className={styles.timing}>00:00–01:00 · Opening</span>
              <h2>The story and the time budget</h2>
              <p>
                Two experiences use governed content: a prospective customer
                finds a trustworthy answer, and an independent agent receives
                relevant guidance. Follow all 13 steps; use the reference guides
                for extra depth after the demonstration.
              </p>
              <div className={styles.talkTrack}>
                <h3>
                  <Mic2 size={17} aria-hidden="true" /> Talk track
                </h3>
                <p>
                  “We’ll follow your two use cases: first, a customer looking
                  for an insurance answer; then, an independent agent deciding
                  where to focus. We’ll show the experience and the controls
                  behind it, including how marketing makes an approved change
                  without a code release.”
                </p>
              </div>
              <table className={styles.runOfShow}>
                <caption>
                  Elapsed time from the start of the demonstration
                </caption>
                <tbody>
                  <tr>
                    <th scope="row">Opening</th>
                    <td>00:00–01:00</td>
                    <td>1 minute</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <a href="#public">
                        Trusted Answers, Wherever the Journey Begins
                      </a>
                    </th>
                    <td>01:00–22:00</td>
                    <td>21 minutes</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <a href="#portal">One Relevant Liberty Experience</a>
                    </th>
                    <td>22:00–44:00</td>
                    <td>22 minutes</td>
                  </tr>
                  <tr>
                    <th scope="row">Close</th>
                    <td>44:00–45:00</td>
                    <td>1 minute</td>
                  </tr>
                </tbody>
              </table>
              <p className={styles.pacing}>
                <strong>Pacing:</strong> begin public publication during step
                04, explain the Profound intake pattern during step 05, then
                inspect analytics and published delivery. Keep the Agent Portal
                priority change in draft until both audience previews in step 11
                are complete.
              </p>
            </section>

            {customerDemoChapters.map((chapter) => (
              <section
                id={chapter.id}
                key={chapter.id}
                className={styles.chapter}
              >
                <header className={styles.chapterHeading}>
                  <span className="workshop-eyebrow">
                    {chapter.id === "public"
                      ? "PUBLIC WEBSITE · CUSTOMER GUIDE SLIDE 10"
                      : "INDEPENDENT AGENT PORTAL · CUSTOMER GUIDE SLIDE 11"}
                  </span>
                  <h2>{chapter.title}</h2>
                  <p>{chapter.summary}</p>
                </header>
                {chapter.steps.map((step, index) => {
                  const number = String(
                    schedule.findIndex((entry) => entry.id === step.id) + 1,
                  ).padStart(2, "0");
                  const timing = schedule.find(
                    (entry) => entry.id === step.id,
                  )!;
                  const showPhase =
                    index === 0 ||
                    chapter.steps[index - 1].phase !== step.phase;
                  return (
                    <section id={step.id} key={step.id} className={styles.step}>
                      {showPhase && (
                        <p className={styles.phase}>{step.phase}</p>
                      )}
                      <div className={styles.stepTop}>
                        <span className={styles.number}>{number}</span>
                        <span className={styles.timing}>
                          {elapsedTime(timing.start)}–{elapsedTime(timing.end)}{" "}
                          · {step.durationMinutes}{" "}
                          {step.durationMinutes === 1 ? "minute" : "minutes"}
                        </span>
                        {step.mode === "explain" && (
                          <span className={styles.explanation}>
                            Integration explanation
                          </span>
                        )}
                      </div>
                      <h3>{step.label}</h3>
                      <p className={styles.objective}>{step.objective}</p>
                      <div className={styles.talkTrack}>
                        <h4>
                          <Mic2 size={17} aria-hidden="true" /> Talk track
                        </h4>
                        {step.talkTrack.map((paragraph, i) => (
                          <p key={i}>
                            <GuideText text={paragraph} />
                          </p>
                        ))}
                      </div>
                      {step.links?.length ? (
                        <div className={styles.launchLinks}>
                          {step.links.map((link) => (
                            <a
                              href={link.href}
                              key={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {link.label}
                              <ArrowUpRight size={15} aria-hidden="true" />
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <h4>On screen</h4>
                      <Lines lines={step.actions} ordered />
                      <div className={styles.observations}>
                        <h4>What to observe</h4>
                        <Lines lines={step.expected} />
                      </div>
                      <h4>Show the data and controls</h4>
                      <Lines lines={step.controls} />
                      {step.images?.map((image) => (
                        <GuideScreenshot image={image} key={image.file} />
                      ))}
                      <p className={styles.transition}>
                        <strong>Transition:</strong>{" "}
                        <GuideText text={step.transition} />
                      </p>
                    </section>
                  );
                })}
              </section>
            ))}

            <section id="closing" className={styles.opening}>
              <span className={styles.timing}>44:00–45:00 · Close</span>
              <h2>Trusted content with clear ownership</h2>
              <div className={styles.talkTrack}>
                <h3>
                  <Mic2 size={17} aria-hidden="true" /> Talk track
                </h3>
                <p>
                  “You’ve seen a customer find sourced guidance, a marketer
                  create and publish content, and an agent receive a relevant
                  experience. The same governed content reaches separate sites
                  and applications, while your team retains approval and version
                  history.”
                </p>
                <p>
                  “That supports the outcomes you described: simpler routine
                  changes, consistent information, and more useful conversations
                  with customers and independent agents. We can now discuss your
                  questions and the platform’s product direction.”
                </p>
              </div>
              <p>
                Return to the agreed meeting agenda for the separate roadmap and
                Q&amp;A discussion.
              </p>
            </section>

            <details id="reset" className={styles.preparation}>
              <summary>
                After the demonstration · restoration outside the 45 minutes
              </summary>
              <div>
                <h2>Leave the sites ready for the next presentation</h2>
                <Lines
                  ordered
                  lines={[
                    "For **Bundle car and home**, open its preserved original version in **Page Builder Content**, create a new version from it, submit it, approve it, and publish it. Confirm the original wording in the **public article**, **Search**, and [**published-answer API experience**](/workshops/content-api). Keep the intermediate versions as the review history.",
                    "For **Agency growth priorities**, restore **Small business growth**, **Texas workers compensation**, then **Home and auto conversations**. Use a new version and the same review/publication process. Sign in as **avery.01** and confirm the original order on **Home**. The **Producer priorities** collection stays in its original order.",
                    "The final shared-disclosure step already restores **Product availability notice** through a new reviewed version. Recheck the original wording on both public placements and Portal **Home** and **Learning & resources**.",
                    "Select the temporary **coverage-guide-live** page in the public site. Use the top **Publish** button’s **More options** → **Unpublish**, complete the confirmation, and wait for the publishing job. Confirm its live URL returns **404**. Use the page’s **Content tree options** → **Delete** to remove that temporary page and its local content through the normal recoverable deletion flow.",
                    "Leave **Agents eligible for marketing** **Live**, with its six-hour schedule and original comparison preferences. Return the public visitor’s **Privacy choices** to **Allow personalization** for the next measured journey. Close temporary tabs, and keep the guide and the next presentation’s starting page available.",
                  ]}
                />
                <p>
                  <Link href="/workshops/marketing">
                    Marketing reference walkthroughs
                  </Link>
                  {" · "}
                  <Link href="/workshops/development">
                    Development and architecture references
                  </Link>
                </p>
              </div>
            </details>
          </article>
        </div>
      </main>
    </WorkshopShell>
  );
}
