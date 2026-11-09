import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3, Mic2 } from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { WorkshopShell } from "@/features/workshops/WorkshopShell";
import { GuideText } from "@/features/workshops/GuideText";
import { GuideScreenshot } from "@/features/workshops/WorkshopControls";
import {
  customerDemoAiContext,
  customerDemoChapters,
} from "@/features/workshops/customer-demo/content";
import {
  customerDemoSchedule,
  DEMO_BUFFER_MINUTES,
  DEMO_CLOSING_MINUTES,
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
  const publicEnd = schedule.find(
    (entry) => entry.id === customerDemoChapters[0].steps.at(-1)!.id,
  )!.end;
  const closeStart = schedule.at(-1)!.end;
  const closeEnd = closeStart + DEMO_CLOSING_MINUTES;
  return (
    <WorkshopShell session={session} active="demo">
      <main id="workshop-main" className={styles.page}>
        <header className={styles.heading}>
          <span className="workshop-eyebrow">
            FROM CUSTOMER NEED TO BUSINESS VALUE
          </span>
          <h1>Liberty Mutual demonstration walkthrough</h1>
          <p>
            Show how trusted content helps customers and independent agents,
            then how business users keep those experiences relevant and current.
            Follow Liberty Mutual’s requested order, with one clear business
            outcome and a focused set of actions for each demonstration.
          </p>
          <div className={styles.introLinks}>
            <span className={styles.timeBudget}>
              <Clock3 size={18} aria-hidden="true" />
              {DEMO_TOTAL_MINUTES}-minute limit
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
              <a href="#closing">{elapsedTime(closeStart)} · Close</a>
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
                    "Open [**Current profile identities**](/workshops/reset#current-profiles), select **Workshop number 01**, and choose **Refresh status**. Copy the **Native profile ID** for **avery.01** and **daniel.01** for the native rule tests in step 08. Refresh this table after a reset so the tests use the current profiles. If an ID is unavailable, open [**SitecoreAI Profiles**](https://app.sitecorecloud.io/optimization/profiles?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df), choose **Search filter → Liberty Mutual agent identity**, and paste that row’s **Agent identity**. Open the matching profile, and copy the UUID from its URL. Reading status does not start a reset.",
                    "Prepare three separate **Sitecore Cloud** browser profiles: **Author** can edit and submit, **Approver** can approve, and an **administrator acting as publisher** performs publication. Open **Safeco Insurance Company of America POC** → **SitecoreAI / Demo**. Keeping these profiles ready demonstrates the actual permission boundaries without spending the live slot signing in.",
                    "In **Page Builder**, use **English** and **Default editing host**. **Public Website** owns the public pages, approved answers, and shared disclosure. **Agent Portal** owns the agent Home page and its priority collections. Both sites use one **SitecoreAI** environment and separate editing and delivery hosts.",
                    "Open the [**public website**](https://liberty-mutual-public-site.vercel.app/), [**published-answer API experience**](/workshops/content-api), and **SitecoreAI** in the prepared browser profiles. Keep the presentation’s **slide 19: Experience Edge content delivery** ready for the short architecture bridge after the API example.",
                    "Prepare [**Communication preferences**](/workshops/preferences) before the audience joins. Select **Load preference examples** once, and use **Check import status** until **SitecoreAI confirmed the imported records** appears. Confirm **Cameron Ellis - Allowed** has **marketingSuppressed = false** and **Cameron Ellis - Suppressed** has **marketingSuppressed = true**. Record both **Native profile IDs**. These two records share the same agency, producer role, and Texas context, so the communication choice isolates the reason for their different marketing eligibility. They are separate from the numbered portal logins.",
                    "In **Marketing outreach preview**, select **Run eligibility check**, and confirm **1 eligible recipient**: only **Cameron Ellis - Allowed** is included. Keep this tab open with the baseline result ready for step 08. The preview must display an actual native eligibility decision; a submitted preference badge or an Audience size estimate is not the completion check. Step 08 starts the opt-out before comparing Avery and Daniel, so the native import can process while those profiles are shown. Restore the starting choices after the demonstration, outside the 45 minutes. Keep both **Native profile IDs** and the native rule unchanged.",
                    "Prepare genuine public-site analytics before presenting. In a visitor browser, choose **Privacy choices → Allow personalization**, use **Search** to find the car-and-home answer, read it while scrolling, and open its Liberty Mutual source link. Confirm the resulting **pageView**, **LM_PUBLIC_CTA_CLICK**, and recorded scroll events in **Analytics → Events** for **liberty-mutual-public-site** within **1 hour**. Record their timestamps. Close the source tab; the live search loop will demonstrate **Essential only** separately.",
                    "Record the version marked **Live** for **Bundle car and home** as **Live baseline version**, along with the current published versions of **Agency growth priorities** and **Product availability notice**. Keep those versions intact. Confirm that the temporary page name **coverage-guide-live** is available.",
                    "Verify the published baseline before preparing the indexing example: **Review your options with your agent before choosing coverage.** must be absent from the public article, the native **Liberty Mutual Approved Answers** Search record, and the [**published-answer API experience**](/workshops/content-api). If the sentence is already present, follow **Bundle car and home** in [**After the demonstration → restoration checklist**](#reset) to restore the preserved original answer through review and publication. Continue only after all three show the original wording.",
                    "Open [**Bundle car and home in Page Builder Content**](https://pages.sitecorecloud.io/content?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-public-site&organization=org_XqL3u1MSNVuubOTb&sc_itemid=70144ef3-4be0-597a-9b22-81e8ee1cc9f6&sc_lang=en). As **Author**, create an English version from that verified original named **Shared answer review**. Add **Review your options with your agent before choosing coverage.** exactly once to **Detailed explanation**. Save, choose **Actions → Submit**, and have the **Approver** review and approve the new version. After approval, record this new English version number as **Prepared answer version**. It must be newer than the recorded **Live baseline version**. Leave it unpublished; the sentence must still be absent from the live article, Search, and API. In the publisher profile, open that exact recorded version number and confirm **Shared answer review** and **Approved**. Earlier rehearsals can reuse the same version name, so the version number identifies the revision prepared for this run.",
                    "The Profound section explains a proposed integration design, rather than a configured live connection or packaged connector. Trace the proposed API, Draft, and review path using the native content model and workflow already shown.",
                    "External discovery uses the structured metadata shown in step 02, together with crawl permissions and each engine’s policies. This replica is excluded from external crawling; demonstrate discovery readiness rather than a live external-engine citation.",
                    "Allow publication, Search updates, and delivery to complete. Confirm the new wording from the current publication before marking its loop complete. Use the reserve for delivery waits, and return to that same loop if necessary. Keep Analytics and API focused on their own outcomes.",
                    "Prepare the native **Search sources** page and **Analytics → Events**. In the administrator profile, open [**Agent Portal Home in Page Builder**](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb&sc_itemid=ae9e45ca-f127-4abe-9ca7-2ff109981998&sc_lang=en), choose **Layers**, select **Agency priorities**, and choose **Edit personalization rules** in the right-hand component panel. Confirm **Liberty Mutual - Agency product priorities** and leave this Builder ready. Keep Avery’s and Daniel’s current **Native profile ID** UUIDs, copied earlier in preparation, ready for the two read-only tests. Prepare the saved **agency-growth** and **producer-priorities** content previews for the later priority-change loop. Keep the public article/API tabs ready for their own delivery checks. Refresh a slow page, then open one fresh tab before changing the running demonstration.",
                  ]}
                />
                <p className={styles.prepNote}>
                  Liberty Mutual plans to keep operating its frontends. Vercel
                  hosts the demonstration applications and is an optional
                  hosting approach. Keep Coveo, Ping, and Tealium in the
                  architecture conversation. Demonstrate the live content paths
                  here, and discuss external integration patterns in context.
                </p>
              </div>
            </details>

            <section id="opening" className={styles.opening}>
              <span className={styles.timing}>00:00–01:00 · Opening</span>
              <h2>Trusted content, relevant experiences, and simpler change</h2>
              <p>
                Start with a customer finding approved guidance on the public
                website. Then show how that same governed foundation helps
                independent agents and gives business users control over the
                content that serves them.
              </p>
              <div className={styles.talkTrack}>
                <h3>
                  <Mic2 size={17} aria-hidden="true" /> Talk track
                </h3>
                <p>
                  “We’ll start where you plan to start: your public website
                  content. A customer finds trusted guidance, and a marketer
                  manages the content through review and publication. We’ll then
                  apply that same foundation to your existing agent portal, so
                  business users can promote relevant products and keep approved
                  wording consistent across channels.”
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
                    <td>01:00–{elapsedTime(publicEnd)}</td>
                    <td>{publicEnd - 1} minutes</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <a href="#portal">One Relevant Liberty Experience</a>
                    </th>
                    <td>
                      {elapsedTime(publicEnd)}–{elapsedTime(closeStart)}
                    </td>
                    <td>{closeStart - publicEnd} minutes</td>
                  </tr>
                  <tr>
                    <th scope="row">Close</th>
                    <td>
                      {elapsedTime(closeStart)}–{elapsedTime(closeEnd)}
                    </td>
                    <td>1 minute</td>
                  </tr>
                  <tr>
                    <th scope="row">Publication and navigation reserve</th>
                    <td>Use only when needed</td>
                    <td>{DEMO_BUFFER_MINUTES} minutes</td>
                  </tr>
                </tbody>
              </table>
              <p className={styles.pacing}>
                <strong>Pacing:</strong> the {closeEnd}-minute plan leaves{" "}
                {DEMO_BUFFER_MINUTES} minutes within the {DEMO_TOTAL_MINUTES}
                -minute limit. Stop each loop when its stated outcome is
                visible, and use the reserve for publication or navigation.
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
                  <div className={styles.talkTrack}>
                    <h3>AI in this journey</h3>
                    <p>
                      <strong>Demonstrated:</strong>{" "}
                      {customerDemoAiContext[chapter.id].demonstrated}
                    </p>
                    <p>
                      <strong>AI-assisted next step:</strong>{" "}
                      {customerDemoAiContext[chapter.id].nextStep}
                    </p>
                  </div>
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
                      <h3>{step.title}</h3>
                      <p>
                        <strong>Customer request:</strong> {step.label}
                      </p>
                      <p className={styles.objective}>
                        <strong>Outcome:</strong> {step.objective}
                      </p>
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
                      <div className={styles.observations}>
                        <h4>Stop when</h4>
                        <p>
                          <GuideText text={step.stopWhen} />
                        </p>
                      </div>
                      <h4>How it works</h4>
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
              <span className={styles.timing}>
                {elapsedTime(closeStart)}–{elapsedTime(closeEnd)} · Close
              </span>
              <h2>More relevant experiences, with business control</h2>
              <div className={styles.talkTrack}>
                <h3>
                  <Mic2 size={17} aria-hidden="true" /> Talk track
                </h3>
                <p>
                  “You’ve seen business users create and release changes, agents
                  receive relevant priorities, and one approved update reach
                  both sites. Those capabilities support the measures you
                  identified: time to publish, the share of changes managed by
                  business users, and content reuse.”
                </p>
                <p>
                  “That gives your team a simpler way to keep trusted
                  information current and help independent agents find what
                  matters to their business. We can now discuss your questions
                  and the platform’s product direction.”
                </p>
              </div>
              <p>
                Return to the agreed meeting agenda for the separate roadmap and
                Q&amp;A discussion. Use the two-year roadmap horizon requested
                by Liberty Mutual.
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
                    "Restore the Cameron comparison outside the 45-minute demonstration. Return to the same [**Communication preferences**](/workshops/preferences) tab, select **Restore preferences**, and use **Check import status** until **SitecoreAI confirmed the imported records** appears. Select **Run eligibility check**, and confirm **1 eligible recipient**: **Cameron Ellis - Allowed** is included again, while **Cameron Ellis - Suppressed** remains excluded. Confirm that both **Native profile IDs** are unchanged and the receipt shows **Same profile as this session’s first check**. Keep the native eligibility rule unchanged. Return the public visitor’s **Privacy choices** to **Allow personalization** for the next measured journey. Close temporary tabs, and keep the guide and the next presentation’s starting page available.",
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
