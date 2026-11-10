import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3 } from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { DemoShell } from "./DemoShell";
import { CopyValue } from "./CopyValue";
import type { DemoChapter } from "./types";
import { GuideText } from "@/features/workshops/GuideText";
import { GuideScreenshot } from "@/features/workshops/WorkshopControls";
import { customerDemoChapters } from "@/features/workshops/customer-demo/content";
import {
  customerDemoSchedule,
  DEMO_CLOSING_MINUTES,
  DEMO_OPENING_MINUTES,
  DEMO_TOTAL_MINUTES,
  elapsedTime,
} from "@/features/workshops/customer-demo/timing";
import styles from "@/features/workshops/customer-demo/CustomerDemo.module.css";

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

export async function CustomerDemoGuide({
  chapterId,
}: {
  chapterId?: DemoChapter["id"];
}) {
  const returnTo =
    chapterId === "public"
      ? "/demo/public"
      : chapterId === "portal"
        ? "/demo"
        : "/workshops/demo";
  const session = await requireWorkshopSession(returnTo);
  const chapters = chapterId
    ? customerDemoChapters.filter((chapter) => chapter.id === chapterId)
    : customerDemoChapters;
  const schedule = customerDemoSchedule(customerDemoChapters);
  const publicEnd = schedule.find(
    (entry) => entry.id === customerDemoChapters[0].steps.at(-1)!.id,
  )!.end;
  const closeStart = schedule.at(-1)!.end;
  const closeEnd = closeStart + DEMO_CLOSING_MINUTES;
  return (
    <DemoShell session={session} chapterId={chapterId}>
      <main id="workshop-main" className={styles.page}>
        <header className={styles.heading}>
          <h1>
            {chapterId === "public"
              ? "Public Website demonstration"
              : chapterId === "portal"
                ? "Agent Portal demonstration"
                : "Liberty Mutual demonstration walkthrough"}
          </h1>
          <div className={styles.introLinks}>
            <span className={styles.timeBudget}>
              <Clock3 size={18} aria-hidden="true" />
              {DEMO_TOTAL_MINUTES}-minute limit
            </span>
            <a
              href={chapterId === "portal" ? "#portal-relevance" : "#opening"}
              className={styles.startLink}
            >
              Begin the demonstration{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
          <p className={styles.copyHint}>
            <strong>Copy</strong> the supplied text. Expand screenshots when
            needed.
          </p>
        </header>

        <div className={styles.layout}>
          <aside className={styles.navigation}>
            <nav aria-label="Customer demonstration sequence">
              <a href="#preparation">Before presenting</a>
              {chapterId !== "portal" && (
                <a href="#opening">00:00 · AI introduction</a>
              )}
              {chapters.map((chapter) => (
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
                    const number = `${chapter.id === "public" ? "P" : "A"}${chapter.steps.findIndex((entry) => entry.id === step.id) + 1}`;
                    return (
                      <a href={`#${step.id}`} key={step.id}>
                        <span>{number}</span>
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
              <a href="#closing">
                {chapterId === "public"
                  ? "Continue to Agent Portal"
                  : `${elapsedTime(closeStart)} · Close`}
              </a>
              <a href="#reset">After the demonstration</a>
            </nav>
          </aside>

          <article className={styles.article}>
            <details id="preparation" className={styles.preparation}>
              <summary>
                Before presenting · preparation outside the 45 minutes
              </summary>
              <div>
                <h2>
                  Prepare the accounts and tools for the complete demonstration
                </h2>
                <p>
                  Complete this guide’s preparation before presenting. Both
                  guides use the same 45-minute run of show and the existing
                  documentation login. The{" "}
                  <Link href="/workshops/demo#preparation">
                    full-sequence checklist
                  </Link>{" "}
                  combines preparation for both sites.
                </p>
                <Lines
                  lines={[
                    {
                      chapter: "public",
                      text: "Aaron leads the meeting introduction, product overview, and case studies in their separate agenda slots. Angela’s opening here is included in the 45-minute use-case block. Keep questions in chat for the separate five-minute Q&A after this block, and leave the full roadmap to its own agenda slot.",
                    },
                    {
                      chapter: "portal",
                      text: "Keep this guide signed in. Use presenter agent logins **avery.01** and **daniel.01** at the [**Agent Portal login**](https://liberty-mutual-agent-portal.vercel.app/login). Their shared synthetic portal password is **Sitecore1**. Use separate browser profiles for the two agents so their sessions remain independent.",
                    },
                    {
                      chapter: "portal",
                      text: "Open [**Current profile identities**](/workshops/reset#current-profiles), select **Workshop number 01**, and choose **Refresh status**. Copy the **Native profile ID** for **avery.01** and **daniel.01** for the native rule tests in **A1**. Refresh this table after a reset so the tests use the current profiles. If an ID is unavailable, open [**SitecoreAI Profiles**](https://app.sitecorecloud.io/optimization/profiles?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df), choose **Search filter → Liberty Mutual agent identity**, and paste that row’s **Agent identity**. Open the matching profile, and copy the UUID from its URL. Reading status does not start a reset.",
                    },
                    {
                      chapter: "all",
                      text: "Prepare three separate **Sitecore Cloud** browser profiles: **Author** can edit and submit, **Approver** can approve, and an **administrator acting as publisher** performs publication. Open **Safeco Insurance Company of America POC** → **SitecoreAI / Demo**. Keeping these profiles ready demonstrates the actual permission boundaries without spending the live slot signing in.",
                    },
                    {
                      chapter: "all",
                      text: "In **Page Builder**, use **English** and **Default editing host**. **Public Website** owns the public pages, their resource guidance, and the shared disclosure. **Agent Portal** owns the agent Home page and its priority collections. Both sites use one **SitecoreAI** environment and separate editing and delivery hosts.",
                    },
                    {
                      chapter: "all",
                      text: "Before each demonstration, show the corresponding customer-journey visual in the shared presentation, with the current requirement highlighted. Introduce the person, the business task, and the expected outcome before switching to the live site. Follow the original public-website and Agent Portal order.",
                    },
                    {
                      chapter: "public",
                      text: "Open the [**public website**](https://liberty-mutual-public-site.vercel.app/), [**published-page API experience**](/workshops/content-api), and **SitecoreAI** in the prepared browser profiles. Keep the presentation’s **Experience Edge content delivery** slide ready for the architecture introduction before the API example.",
                    },
                    {
                      chapter: "portal",
                      text: "Prepare [**Communication preferences**](/workshops/preferences) before the audience joins. Select **Load preference examples** once, and use **Check import status** until **SitecoreAI confirmed the imported records** appears. Confirm **Cameron Ellis - Allowed** has **marketingSuppressed = false** and **Cameron Ellis - Suppressed** has **marketingSuppressed = true**. Record both **Native profile IDs**. These two records share the same agency, producer role, and Texas context, so the communication choice isolates the reason for their different marketing eligibility. They are separate from the numbered portal logins.",
                    },
                    {
                      chapter: "portal",
                      text: "In **Marketing outreach preview**, select **Run eligibility check**, and confirm **1 eligible recipient**: only **Cameron Ellis - Allowed** is included. Keep this tab open with the baseline result ready for **A1**. The preview must display an actual native eligibility decision; a submitted preference badge or an Audience size estimate is not the completion check. **A1** starts the opt-out before comparing Avery and Daniel, so the native import can process while those profiles are shown. Restore the starting choices after the demonstration, outside the 45 minutes. Keep both **Native profile IDs** and the native rule unchanged.",
                    },
                    {
                      chapter: "public",
                      text: "Prepare genuine public-site analytics before presenting. In a visitor browser, choose **Privacy choices → Allow personalization**, use **Search** to find the car-and-home answer, read it while scrolling, and open its Liberty Mutual source link. Confirm the resulting **pageView**, **LM_PUBLIC_CTA_CLICK**, and recorded scroll events in **Analytics → Events** for **liberty-mutual-public-site** within **1 hour**. Record their timestamps. Close the source tab; the live search loop will demonstrate **Essential only** separately.",
                    },
                    {
                      chapter: "all",
                      text: "Record the version marked **Live** for **the car-and-home resource page** as **Live baseline version**, along with the current published versions of **Agency growth priorities** and **Product availability notice**. Keep those versions intact. Confirm that the temporary page name **coverage-guide-live** is available.",
                    },
                    {
                      chapter: "public",
                      text: "Verify the published baseline before preparing the indexing example: **Review your options with your agent before choosing coverage.** must be absent from the public article, the native **SitecoreAI Search** record, and the [**published-page API experience**](/workshops/content-api). If the sentence is already present, follow **the car-and-home resource page** in [**After the demonstration → restoration checklist**](#reset) to restore the preserved original page content through review and publication. Continue only after all three show the original wording.",
                    },
                    {
                      chapter: "public",
                      text: "Open [**the car-and-home resource page in Page Builder Content**](https://pages.sitecorecloud.io/content?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-public-site&organization=org_XqL3u1MSNVuubOTb&sc_itemid=ae109fc0-b508-5840-97eb-0b2c02ae1a9b&sc_lang=en). As **Author**, select the preserved original version recorded as **Live baseline version**, and wait for its fields to finish loading. Read the selected version number again, expand **Resource content**, and confirm that **Detailed explanation** contains the original wording without the temporary sentence. Choose **Create version** to create an English page version from that verified original named **Resource page review**, and select **Create**. Reopen the version selector, explicitly select the new **Resource page review** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm that the selected version number is newer than **Live baseline version** and the original wording remains intact before editing. Add **Review your options with your agent before choosing coverage.** exactly once to **Detailed explanation**. Save, choose **Actions → Submit**, and have the **Approver** review and approve the new version. After approval, record this new English version number as **Prepared page version**. It must be newer than the recorded **Live baseline version**. Leave it unpublished; the sentence must still be absent from the live article, Search, and API. In the publisher profile, open that exact recorded version number and confirm **Resource page review** and **Approved**. Earlier rehearsals can reuse the same version name, so the version number identifies the revision prepared for this run.",
                    },
                    {
                      chapter: "public",
                      text: "The Profound section uses the prepared **Sales Engineers1 → agverticals → Prospera** recommendation tabs as a read-only example. Open the **Home → Readability & Clarity** recommendation and its **Page Builder → AEO opportunities** panel before presenting. Do not apply or dismiss a recommendation, edit content, change workflow, or publish in that environment. Profound intake remains a proposed integration design. Return to the already-demonstrated Liberty Mutual Draft, review, and publication process when explaining governance.",
                    },
                    {
                      chapter: "public",
                      text: "External discovery uses the structured metadata shown in **P2**, together with crawl permissions and each engine’s policies. This replica is excluded from external crawling; demonstrate discovery readiness rather than a live external-engine citation.",
                    },
                    {
                      chapter: "all",
                      text: "Allow publication, Search updates, and delivery to complete. Confirm the new wording from the current publication before marking its loop complete. Use the reserve for delivery waits, and return to that same loop if necessary. Keep Analytics and API focused on their own outcomes.",
                    },
                    {
                      chapter: "portal",
                      text: "Prepare the native **Search sources** page and **Analytics → Events**. In the administrator profile, open [**Agent Portal Home in Page Builder**](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb&sc_itemid=ae9e45ca-f127-4abe-9ca7-2ff109981998&sc_lang=en), choose **Layers**, select **Agency priorities**, and choose **Edit personalization rules** in the right-hand component panel. Confirm **Liberty Mutual - Agency product priorities** and leave this Builder ready. Keep Avery’s and Daniel’s current **Native profile ID** UUIDs, copied earlier in preparation, ready for the two read-only tests. Open [**Agent audience preview in Page Builder**](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb&sc_itemid=cfe0e86f-dd93-4b8e-84cd-a2a46e8c1947&sc_lang=en), choose **Personalize**, and confirm the native **Avery agency principal** and **Daniel producer** page variants. Check **Preview → Preview** for each variant, then close its preview tab. Leave this growth page unpublished. It demonstrates whole-page audience preview separately from the later Home priority-collection change. Keep the public article/API tabs ready for their own delivery checks. Refresh a slow page, then open one fresh tab before changing the running demonstration.",
                    },
                  ]
                    .filter(
                      (entry) =>
                        !chapterId ||
                        entry.chapter === "all" ||
                        entry.chapter === chapterId,
                    )
                    .map((entry) => entry.text)}
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

            {chapterId !== "portal" && (
              <section id="opening" className={styles.opening}>
                <span className={styles.timing}>
                  00:00–{elapsedTime(DEMO_OPENING_MINUTES)} · AI introduction
                </span>
                <h2>Opening</h2>
                <p>Angela: AI introduction. Then begin P1.</p>
              </section>
            )}

            {chapters.map((chapter) => (
              <section
                id={chapter.id}
                key={chapter.id}
                className={styles.chapter}
              >
                <header className={styles.chapterHeading}>
                  <h2>
                    {chapter.id === "public"
                      ? "Public Website"
                      : "Agent Portal"}
                  </h2>
                </header>
                {chapter.steps.map((step, index) => {
                  const number = `${chapter.id === "public" ? "P" : "A"}${index + 1}`;
                  const timing = schedule.find(
                    (entry) => entry.id === step.id,
                  )!;
                  return (
                    <section id={step.id} key={step.id} className={styles.step}>
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
                      <ol className={styles.clicks}>
                        {step.presenterActions.map((lines, actionIndex) => (
                          <li key={actionIndex}>
                            {lines.map((line, lineIndex) => (
                              <div className={styles.clickLine} key={lineIndex}>
                                <GuideText text={line} openLinksInNewTab />
                              </div>
                            ))}
                            {step.inputs?.some(
                              (input) => input.action === actionIndex + 1,
                            ) ? (
                              <div className={styles.copyValues}>
                                {step.inputs
                                  .filter(
                                    (input) => input.action === actionIndex + 1,
                                  )
                                  .map((input) => (
                                    <CopyValue
                                      key={`${input.label}-${input.value}`}
                                      label={input.label}
                                      value={input.value}
                                    />
                                  ))}
                              </div>
                            ) : null}
                            {step.images
                              ?.filter(
                                (image) =>
                                  image.afterAction === actionIndex + 1,
                              )
                              .map((image) => (
                                <details
                                  className={styles.screenshot}
                                  key={`${image.file}-${image.title ?? ""}`}
                                >
                                  <summary>
                                    Screenshot ·{" "}
                                    {image.title ?? "View this step"}
                                  </summary>
                                  <GuideScreenshot image={image} />
                                </details>
                              ))}
                          </li>
                        ))}
                      </ol>
                      <p className={styles.resultCheck}>
                        <strong>Result check:</strong>{" "}
                        <GuideText text={step.presenterResult} />
                      </p>
                      {step.images
                        ?.filter((image) => !image.afterAction)
                        .map((image) => (
                          <details
                            className={styles.screenshot}
                            key={`${image.file}-${image.title ?? ""}`}
                          >
                            <summary>
                              Screenshot · {image.title ?? "View this step"}
                            </summary>
                            <GuideScreenshot image={image} />
                          </details>
                        ))}
                    </section>
                  );
                })}
              </section>
            ))}

            {chapterId === "public" ? (
              <section id="closing" className={styles.opening}>
                <span className={styles.timing}>
                  {elapsedTime(publicEnd)} · Agent Portal handoff
                </span>
                <h2>Next: Agent Portal</h2>
                <Link href="/demo" className={styles.startLink}>
                  Continue to the Agent Portal guide{" "}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </section>
            ) : (
              <section id="closing" className={styles.opening}>
                <span className={styles.timing}>
                  {elapsedTime(closeStart)}–{elapsedTime(closeEnd)} · Close
                </span>
                <h2>Close</h2>
                <p>Return to the deck for the closing and Q&amp;A.</p>
              </section>
            )}

            <details id="reset" className={styles.preparation}>
              <summary>
                After the demonstration · restoration outside the 45 minutes
              </summary>
              <div>
                <h2>Leave the sites ready for the next presentation</h2>
                <Lines
                  ordered
                  lines={[
                    {
                      chapter: "public",
                      text: "For [**the car-and-home resource page in Page Builder Content**](https://pages.sitecorecloud.io/content?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-public-site&organization=org_XqL3u1MSNVuubOTb&sc_itemid=ae109fc0-b508-5840-97eb-0b2c02ae1a9b&sc_lang=en), open its preserved original English version, create a new page version from it, select that new **Draft**, and wait for its fields to finish loading. Confirm the original wording, submit the page, approve it, and publish it. Confirm the page’s original wording in the **public article**, **Search**, and [**published-page API experience**](/workshops/content-api). Keep the intermediate versions as the review history.",
                    },
                    {
                      chapter: "portal",
                      text: "For **Agency growth priorities**, restore **Small business growth**, **Texas workers compensation**, then **Home and auto conversations**. Use a new version and the same review/publication process. Sign in as **avery.01** and confirm the original order on **Home**. The **Producer priorities** collection stays in its original order.",
                    },
                    {
                      chapter: "portal",
                      text: "The final shared-disclosure step already restores **Product availability notice** through a new reviewed version. Recheck the original wording on both public placements and Portal **Home** and **Learning & resources**.",
                    },
                    {
                      chapter: "public",
                      text: "Select the temporary **coverage-guide-live** page in the public site. Use the top **Publish** button’s **More options** → **Unpublish**, complete the confirmation, and wait for the publishing job. Confirm its live URL returns **404**. Use the page’s **Content tree options** → **Delete** to remove that temporary page and its local content through the normal recoverable deletion flow.",
                    },
                    {
                      chapter: "portal",
                      text: "Restore the Cameron comparison outside the 45-minute demonstration. Return to the same [**Communication preferences**](/workshops/preferences) tab, select **Restore preferences**, and use **Check import status** until **SitecoreAI confirmed the imported records** appears. Select **Run eligibility check**, and confirm **1 eligible recipient**: **Cameron Ellis - Allowed** is included again, while **Cameron Ellis - Suppressed** remains excluded. Confirm that both **Native profile IDs** are unchanged and the receipt shows **Same profile as this session’s first check**. Keep the native eligibility rule unchanged. Return the public visitor’s **Privacy choices** to **Allow personalization** for the next measured journey. Close temporary tabs, and keep the guide and the next presentation’s starting page available.",
                    },
                  ]
                    .filter(
                      (entry) =>
                        !chapterId ||
                        entry.chapter === "all" ||
                        entry.chapter === chapterId,
                    )
                    .map((entry) => entry.text)}
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
    </DemoShell>
  );
}
