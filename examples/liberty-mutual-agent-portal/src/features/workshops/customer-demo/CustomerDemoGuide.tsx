import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import {
  getWorkshopSession,
  requireWorkshopSession,
} from "@/server/workshops/auth";
import { DemoShell } from "./DemoShell";
import { CopyValue } from "./CopyValue";
import { LaunchUrls } from "./LaunchUrls";
import { demoLaunchUrls } from "./launch-urls";
import { DemoTabs } from "./DemoTabs";
import { presenterInputs } from "./demo-inputs.server";
import { getPresenterProfiles } from "./demo-profiles.server";
import { GRAPHQL_EXPLORER } from "./demo-destinations";
import type { DemoChapter } from "./types";
import { GuideText } from "@/features/workshops/GuideText";
import { GuideScreenshot } from "@/features/workshops/WorkshopControls";
import {
  customerDemoChapters,
  customerDemoClosing,
  customerDemoOpening,
} from "@/features/workshops/customer-demo/content";
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
  const session = chapterId
    ? await getWorkshopSession()
    : await requireWorkshopSession(returnTo);
  const presenterProfiles = session ? await getPresenterProfiles() : [];
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
            Use <strong>Start here</strong> once per loop, or reuse the open
            tab. Follow the numbered clicks; <strong>Copy</strong> supplies
            field text and queries. Expand screenshots when needed.
          </p>
        </header>

        <div className={styles.layout}>
          <aside className={styles.navigation}>
            <nav aria-label="Customer demonstration sequence">
              <a href="#demo-tabs">P0 · Open your demo tabs</a>
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
            <DemoTabs profiles={presenterProfiles} />
            <details id="preparation" className={styles.preparation}>
              <summary>
                Before presenting · preparation outside the 45 minutes
              </summary>
              <div>
                <h2>
                  Prepare the accounts and tools for the complete demonstration
                </h2>
                <p>
                  Complete preparation before the audience joins. Keep this
                  guide on the presenter display; show only the websites and
                  native SitecoreAI screens. Both site guides follow the same
                  45-minute sequence.
                </p>
                <Lines
                  lines={[
                    {
                      chapter: "public",
                      text: "Aaron leads the meeting introduction, product overview, and case studies in their separate agenda slots. Angela’s opening here is included in the 45-minute use-case block. Keep questions in chat for the separate five-minute Q&A after this block, and leave the full roadmap to its own agenda slot.",
                    },
                    {
                      chapter: "portal",
                      text: session
                        ? "Use presenter agent logins **avery.01** and **daniel.01** at the [**Agent Portal login**](https://liberty-mutual-agent-portal.vercel.app/login). Their shared synthetic portal password is **Sitecore1**. Use separate browser profiles for the two agents so their sessions remain independent."
                        : "Use presenter agent logins **avery.01** and **daniel.01** at the [**Agent Portal login**](https://liberty-mutual-agent-portal.vercel.app/login), with the agent password supplied by the presenter. Use separate browser profiles for the two agents so their sessions remain independent.",
                    },
                    {
                      chapter: "portal",
                      text: "Using the **P0 → Profiles** click path in the **SitecoreAI** tab, open the current native records for **avery.01** and **daniel.01**. In **SitecoreAI → Optimization → Profiles**, open **Avery Brooks - 01**, then choose **Toggle menu → Inspect → JSON view**. Copy the UUID under **clientIds**, without quotation marks, for the **A1** personalization preview. Close **Inspect**. Repeat for **Daniel Ortiz - 01** so both current Client IDs are ready for A1. The UUID in a profile’s URL is its **Profile ID**; it is different from the **Client ID**. Refresh this guide after a reset so P0 uses the current profile records.",
                    },
                    {
                      chapter: "all",
                      text: "Use one **SitecoreAI** presenter account with permission to edit, submit, approve, and publish. Open **Safeco Insurance Company of America POC → SitecoreAI / Demo**, and keep one **Page Builder** tab ready. For an efficient presentation, the same account performs the real **Draft → Awaiting approval → Approved** workflow. Explain that a normal team assigns separate Author, Approver, and Publisher permissions; this demonstration does not switch accounts.",
                    },
                    {
                      chapter: "all",
                      text: "In **Page Builder**, use **English** and **Default editing host**. **Public Website** owns the public pages, their resource guidance, and the shared copyright notice. **Agent Portal** owns the agent Home page and its priority collections. Both sites use one **SitecoreAI** environment and separate editing and delivery hosts.",
                    },
                    {
                      chapter: "all",
                      text: "Before each demonstration, show the corresponding customer-journey visual in the shared presentation, with the current requirement highlighted. Introduce the person, the business task, and the expected outcome before switching to the live site. Follow the original public-website and Agent Portal order.",
                    },
                    {
                      chapter: "public",
                      text: `Prepare the windows in **P0** once. Reuse the **SitecoreAI** tab for its tool menus, and keep the **Page Builder** tab that opens from **Channels**. Open [**GraphQL Explorer**](${GRAPHQL_EXPLORER}) in its own tab. Before presenting, configure **HTTP HEADERS** using the **sc_apikey** JSON template in **P7** and a **Live Delivery API token**. If the copy field contains **<Delivery API token>**, obtain a token through **Quick links → Deploy → project SitecoreAI → environment Demo → Details → Live GraphQL IDE (Experience Edge) → Generate Delivery API token → Launch IDE**. Replace the placeholder with that token; use **Live**, not **Preview**, for P7. Run the **P7 GraphQL query** once to verify access to Live Experience Edge, and leave the headers configured. Keep the presentation’s **Experience Edge content delivery** slide ready for P7.`,
                    },
                    {
                      chapter: "all",
                      text: "Record the version marked **Live** for **the car-and-home resource page** as **Live baseline version**, along with the current published versions of **Agency growth priorities** and **Copyright notice**. Keep those versions intact. Confirm that both site footers display the same full copyright notice with **2025**; that is the shared-content baseline. Confirm that the temporary page name **coverage-page** is available.",
                    },
                    {
                      chapter: "all",
                      text: "Before **A3–A4**, verify the actual published starting order in **Avery portal → My workspace → Priorities for your agency**: **Build a stronger small-business practice → Support workers’ compensation conversations in Texas → Connect home and auto conversations**. In **Daniel portal → My workspace**, confirm **Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice**. If Avery already shows Texas guidance first, or either order differs, restore the baseline through [**After the demonstration → restoration checklist**](#reset), then reload both portal sessions and verify these orders before presenting. In **Page Builder → Content → Data → Agency priorities → Agency growth priorities**, the matching order is **Small business growth → Texas workers compensation → Home and auto conversations**. Once the live portal matches, record the collection’s **Live** version number as **Priority baseline version**; keep it intact for restoration.",
                    },
                    {
                      chapter: "public",
                      text: "Verify the published baseline before preparing the indexing example: **Review your options with your agent before choosing coverage.** must be absent from the public article, the native **SitecoreAI Search** record, and the **explanation** returned by the **P7 GraphQL query**. If the sentence is present, use [**After the demonstration → restoration checklist**](#reset) to restore the preserved original page content through review and publication. Continue only after all three show the original wording.",
                    },
                    {
                      chapter: "public",
                      text: "Open [**the car-and-home resource page in Page Builder Content**](https://pages.sitecorecloud.io/content?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-public-site&organization=org_XqL3u1MSNVuubOTb&sc_itemid=ae109fc0-b508-5840-97eb-0b2c02ae1a9b&sc_lang=en). In the same **Page Builder** tab, select the preserved original version recorded as **Live baseline version**, and wait for its fields to finish loading. Read the selected version number again, expand **Resource content**, and confirm that **Detailed explanation** contains the original wording without the temporary sentence. Choose **Create version** to create an English page version from that verified original named **Resource page review**, and select **Create**. Reopen the version selector, explicitly select the new **Resource page review** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm that the selected version number is newer than **Live baseline version** and the original wording remains intact before editing. Add **Review your options with your agent before choosing coverage.** exactly once to **Detailed explanation**. Save, choose **Actions → Submit**, and confirm **Awaiting approval**. Review the same version, choose **Actions → Approve**, and confirm **Approved**. After approval, record this new English version number as **Prepared page version**. It must be newer than the recorded **Live baseline version**. Leave it unpublished; the sentence must still be absent from the live article, Search, and API. In the same **Page Builder** tab, open that exact recorded version number and confirm **Resource page review** and **Approved**. Earlier rehearsals can reuse the same version name, so the version number identifies the revision prepared for this run.",
                    },
                    {
                      chapter: "public",
                      text: "The Profound section starts with **Prospera recommendations** in a separate **Incognito** window for **Sales Engineers1 → agverticals → Prospera** as a read-only example. Open the **Home → Readability & Clarity** recommendation. Beside **Cards · Description**, select the **page-opening icon** to the right of **Select**; keep the **Prospera Page Builder → AEO opportunities** tab it opens. Do not apply or dismiss a recommendation, edit content, change workflow, or publish in that environment. Profound intake remains a proposed integration design. Keep this example in **Prospera Page Builder**, and explain editable copy and the configured human review process without applying or publishing anything.",
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
                      text: "Prepare the native **Search sources** page and **Analytics → Events**. In the same **SitecoreAI** window’s **Page Builder** tab, open [**Agent Portal Home in Page Builder**](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb&sc_itemid=ae9e45ca-f127-4abe-9ca7-2ff109981998&sc_lang=en), choose **Layers**, select **Agency priorities**, and choose **Edit personalization rules** in the right-hand component panel. Confirm **Liberty Mutual - Agency product priorities** and leave this Builder ready. Keep Avery’s and Daniel’s current **Client ID** UUIDs, copied from native **Inspect → JSON view → clientIds**, ready for the read-only tests. In the same **Page Builder** tab, return to **Editor → Pages → Home**, open **Apps → Audience Preview**, and confirm **Current page → Home**. The app attempts to connect the existing SitecoreAI session automatically. If **Connect to SitecoreAI** appears, select it with the same presenter account. The connection window closes after authentication, and the app verifies the session automatically. Complete this check before the audience joins. Open [**Prepare audiences**](https://liberty-mutual-agent-portal.vercel.app/apps/audience-preview/prepare), select **Prepare audiences**, and wait for **42 of 42 ready**. Close that preparation tab, and return to **Audience Preview** in **Page Builder**. Test **Role → Principal** with only **Texas** selected. Select **Preview audience → Open preview**, verify **Build a stronger small-business practice → Support workers’ compensation conversations in Texas → Connect home and auto conversations**, then close the preview tab. Repeat with **Role → Producer** and only **Illinois** selected; verify **Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice**, then close that preview tab. Leave all content, rules, and workflow states unchanged during this preparation. These read-only checks use the same **Home** page and require no agent login or human profile identifier. Keep the **Public website** and **GraphQL Explorer** tabs ready for their delivery checks. Refresh a slow page, then open one fresh tab before changing the running demonstration.",
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
                <h2>Opening · three outcomes for Liberty Mutual</h2>
                <p>{customerDemoOpening.presenter}</p>
                <Lines lines={customerDemoOpening.talkTrack} />
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
                  const inputs = presenterInputs(step, {
                    includeDeliveryToken: Boolean(session),
                  });
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
                      {step.id === "public-discovery" && (
                        <p className={styles.flowCue}>
                          <strong>
                            P2–P3 · One resource, from content to Search.
                          </strong>{" "}
                          Keep bundle-car-and-home selected across both steps.
                        </p>
                      )}
                      {step.id === "portal-relevance" && (
                        <p className={styles.flowCue}>
                          <strong>A1–A2 · Agent experience first.</strong>{" "}
                          Compare agent priorities and consistent pages before
                          opening the marketer’s controls.
                        </p>
                      )}
                      <p className={styles.roleTask}>
                        <strong>{step.persona}.</strong>{" "}
                        <GuideText text={step.scenario} />
                      </p>
                      {step.id === "public-api" && !session && (
                        <p>
                          Replace <code>&lt;Delivery API token&gt;</code> in the
                          HTTP headers template with your Live Delivery API
                          token.
                        </p>
                      )}
                      <LaunchUrls links={demoLaunchUrls(step)} />
                      <aside
                        className={styles.presenterPoints}
                        aria-label="Say / point out"
                      >
                        <h4>Say / point out</h4>
                        <Lines lines={step.presenterPoints} />
                      </aside>
                      <ol className={styles.clicks}>
                        {step.presenterActions.map((lines, actionIndex) => (
                          <li key={actionIndex}>
                            {lines.map((line, lineIndex) => (
                              <div className={styles.clickLine} key={lineIndex}>
                                <GuideText text={line} openLinksInNewTab />
                              </div>
                            ))}
                            {inputs.some(
                              (input) => input.action === actionIndex + 1,
                            ) ? (
                              <div className={styles.copyValues}>
                                {inputs
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
                                  <GuideScreenshot
                                    image={image}
                                    assetBasePath="/api/demo/assets"
                                  />
                                </details>
                              ))}
                          </li>
                        ))}
                      </ol>
                      <p className={styles.resultCheck}>
                        <strong>Result check:</strong>{" "}
                        <GuideText text={step.presenterResult} />
                        <span className={styles.slideReturn}>
                          Return to the presentation and advance to the next
                          slide.
                        </span>
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
                            <GuideScreenshot
                              image={image}
                              assetBasePath="/api/demo/assets"
                            />
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
                <Lines lines={customerDemoClosing} />
                <p>
                  Return to the deck, then take questions in the Q&amp;A slot.
                </p>
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
                      text: "For [**the car-and-home resource page in Page Builder Content**](https://pages.sitecorecloud.io/content?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-public-site&organization=org_XqL3u1MSNVuubOTb&sc_itemid=ae109fc0-b508-5840-97eb-0b2c02ae1a9b&sc_lang=en), open its preserved original English version, create a new page version from it, select that new **Draft**, and wait for its fields to finish loading. Using the same presenter account, confirm the original wording, choose **Actions → Submit** to reach **Awaiting approval**, choose **Actions → Approve** to reach **Approved**, and publish the page. Confirm the original wording in the **public article**, **Search**, and the **P7 GraphQL response**. Keep the intermediate versions as the review history.",
                    },
                    {
                      chapter: "portal",
                      text: "For **Agency growth priorities**, restore **Small business growth**, **Texas workers compensation**, then **Home and auto conversations**. Use a new version and the same review/publication process. Sign in as **avery.01** and confirm the original order on **Home**. The **Producer priorities** collection stays in its original order.",
                    },
                    {
                      chapter: "portal",
                      text: "The final shared-content step already restores **Copyright notice** through a new reviewed version. Reload the **Public website** and **Agent Portal**, scroll to both footers, and confirm that each displays the same full copyright notice with **2025**. Preserve all other wording, punctuation, the line break, and the **Equal Opportunity Employer** link.",
                    },
                    {
                      chapter: "public",
                      text: "Select the temporary **coverage-page** page in the public site. Use the top **Publish** button’s **More options** → **Unpublish**, complete the confirmation, and wait for the publishing job. Confirm its live URL returns **404**. Use the page’s **Content tree options** → **Delete** to remove that temporary page and its local content through the normal recoverable deletion flow.",
                    },
                    {
                      chapter: "all",
                      text: "Close native personalization previews without saving rule changes. Close temporary tabs, and keep the guide and the next presentation’s starting page available.",
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
              </div>
            </details>
          </article>
        </div>
      </main>
    </DemoShell>
  );
}
