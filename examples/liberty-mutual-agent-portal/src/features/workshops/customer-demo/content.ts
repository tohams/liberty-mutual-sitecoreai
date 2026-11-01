import type { DemoChapter } from "./types";

const PUBLIC = "https://liberty-mutual-public-site.vercel.app";
const PORTAL = "https://liberty-mutual-agent-portal.vercel.app";
const ORG = "org_XqL3u1MSNVuubOTb";
const TENANT = "97eea84c-ac47-4d91-7e4f-08defdaaa7df";
const TENANT_NAME = "scaipocusem400b-sitecoreai950c-demo4418";
const CONTEXT = `organization=${ORG}&tenantId=${TENANT}`;
const SITECORE = `https://app.sitecorecloud.io/?${CONTEXT}`;
const SEARCH_SOURCE = `https://app.sitecorecloud.io/search/f527245d-98c7-4978-8802-237d7717ca43/preview?${CONTEXT}`;
const ANALYTICS = `https://app.sitecorecloud.io/optimization/dashboards/events?${CONTEXT}`;
const PROFILE_SCHEMA = `https://app.sitecorecloud.io/optimization/settings/profile-schema?${CONTEXT}`;
const AUDIENCE = `https://app.sitecorecloud.io/optimization/audience/fc7ce3e0-c300-4f2f-9b21-a22058065db8?${CONTEXT}`;
const PRIORITY_VALUE = `https://app.sitecorecloud.io/optimization/custom-values/ad7b493b-f768-404c-adc6-9841c2fe1a6e?organization=${ORG}&tenantName=${TENANT_NAME}`;
const ARTICLE = `${PUBLIC}/insurance-resources/bundle-car-and-home`;
const ANSWER_ID = "70144ef3-4be0-597a-9b22-81e8ee1cc9f6";
const PUBLIC_HOME_ID = "6d600332-3e21-4c5f-83ec-aae04f83450f";
const ARTICLE_ID = "ae109fc0-b508-5840-97eb-0b2c02ae1a9b";
const PORTAL_HOME_ID = "ae9e45ca-f127-4abe-9ca7-2ff109981998";
const PRIORITIES_ID = "3127968e-4b21-50c3-ad79-b6bbbe5303b8";
const DISCLOSURE_ID = "c4fd68f7-7c79-5bb6-9919-fb6f82b84bca";
const API_ANSWER = `${PUBLIC}/api/content/v1/answers/${ANSWER_ID}`;

function pageBuilder(
  site: "public" | "portal",
  itemId: string,
  mode: "editor" | "content" = "editor",
) {
  const siteName =
    site === "public"
      ? "liberty-mutual-public-site"
      : "liberty-mutual-agent-portal";
  return `https://pages.sitecorecloud.io/${mode}?tenantName=${TENANT_NAME}&sc_site=${siteName}&organization=${ORG}&sc_itemid=${itemId}&sc_lang=en`;
}

const answerContent = pageBuilder("public", ANSWER_ID, "content");
const publicEditor = pageBuilder("public", PUBLIC_HOME_ID);
const articleEditor = pageBuilder("public", ARTICLE_ID);
const portalEditor = pageBuilder("portal", PORTAL_HOME_ID);
const priorityContent = pageBuilder("portal", PRIORITIES_ID, "content");
const disclosureContent = pageBuilder("public", DISCLOSURE_ID, "content");

/** Thirteen customer cards, retaining the original row and left-to-right order. */
export const customerDemoChapters: DemoChapter[] = [
  {
    id: "public",
    title: "Trusted Answers, Wherever the Journey Begins",
    summary:
      "A prospective customer asks an insurance question, finds approved guidance and its source, and takes a useful next step. Then follow the publishing team as it creates, governs, publishes, measures, and reuses that content.",
    sourceSlide: 10,
    steps: [
      {
        id: "public-question",
        title: "Ask an insurance question",
        label:
          "User can ask a question in conversational language in an AI-enabled search field",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 3,
        objective:
          "Show a useful, sourced answer and a clear next action, including the experience when approved sources do not address the question.",
        actions: [
          `Open the [**public Home page**](${PUBLIC}/). Select **Privacy choices**, then **Essential only**. Select **Search** in the header; this demonstrates that finding guidance remains available when optional collection is declined.`,
          "In **What would you like to know?**, enter **Can I bundle my car and home insurance?**, and click **Search**. Wait for **Finding helpful information…** to finish, then select the result titled **Can I bundle my car and home insurance?**.",
          "Read the answer beneath the question. Expand **Coverage and policy details** to reveal the formal wording. Under **More information**, point to the Liberty Mutual source link, **Liberty Mutual** ownership, **Effective** date, and **Review date**. Open the source, then return to the article.",
          "Click **Explore a bundled quote**. Confirm **Auto** and **Home** are selected and that the quote journey retains the bundling context. Return to the article; a useful next action is the observation, so no quote submission is needed.",
          `Return to [**Search**](${PUBLIC}/search). Enter **Does car insurance cover cyberextortion?**, and click **Search**. Point to **Let’s find the right information** and **Contact an agent**, rather than unrelated insurance result cards.`,
          `Return to [**Home**](${PUBLIC}/), open **Privacy choices**, and select **Allow personalization**. Scroll down the page in stages, then click **Explore bundling**. These genuine page, scroll, and click interactions supply the analytics example later in this flow.`,
        ],
        expected: [
          "The approved car-and-home answer appears first, its authoritative source is visible, and its next action carries the selected products into the quote journey.",
          "The unsupported question offers an agent-assisted next step. Search also worked while **Essential only** was selected.",
        ],
        talkTrack: [
          "A prospective customer can ask in everyday language. SitecoreAI Search finds published guidance, and this experience keeps Liberty Mutual’s approved answer, authoritative source, and useful next step together.",
          "When the approved sources do not address the subject, the experience offers help from an agent instead of presenting unrelated insurance information as an answer. We are not asking a model to decide whether a particular loss is covered.",
        ],
        controls: [
          "**SitecoreAI Search** retrieves and ranks the published sources. The application’s conservative authored-evidence check withholds unsupported question results; it is separate from an ML confidence score.",
          "**Privacy choices** governs this browser’s optional analytics and personalization collection. **Essential only** keeps necessary website and Search behavior available.",
          "The answer’s question, wording, source, ownership, applicability, and next action are separate governed content fields.",
        ],
        links: [
          { label: "Public Home", href: `${PUBLIC}/` },
          { label: "Public Search", href: `${PUBLIC}/search` },
          { label: "Car and home article", href: ARTICLE },
        ],
        transition:
          "Keep the car-and-home answer in view. Next, reveal the structure that makes this approved guidance understandable to other systems.",
      },
      {
        id: "public-discovery",
        title: "Show structured, authoritative content",
        label:
          "Search engines and AI answer engines can find and cite the right LM content",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 2,
        objective:
          "Connect the visible answer to its native structured fields, managed classification choices, and search-friendly page metadata.",
        actions: [
          `Open [**Bundle car and home in Page Builder Content**](${answerContent}). Confirm **Liberty Mutual Public Website**, **English**, and **Data → Approved answers → Bundle car and home**. Inspect **Question**, **Plain-language answer**, **Formal source wording**, **Detailed explanation**, **Authoritative source**, **Content owner**, and the dates.`,
          "Expand **Quick Info** and point to the **PublicApprovedAnswer** template. Explain that the template defines the structured fields used by every approved answer; the page’s layout is a separate concern.",
          `Open [**the article in Page Builder Editor**](${articleEditor}), retain **Default editing host**, and choose **Apps → Resource metadata**. Under **Content to classify**, select **Approved answer: Can I bundle my car and home insurance?**. Inspect **State applicability: All states**, **Product: Auto and home**, and **Audience: All consumers**. This approved version is read only; authors choose from the managed lists when editing a draft. Leave this version unchanged.`,
          `On the [**public article**](${ARTICLE}), use the browser’s **View page source**, then **Find**, to locate **application/ld+json**. Point to **FAQPage**, **Question**, and **acceptedAnswer**, and find the page’s **canonical** link. Return to the rendered article.`,
        ],
        expected: [
          "The answer has an identifiable template, source, accountable owner, applicability, and review dates. Authors select consistent state, product, and audience values from managed choices.",
          "The public page exposes canonical metadata and structured answer data. The replica’s crawl policy remains in place; this is discovery readiness, rather than proof of an external engine citing this host.",
        ],
        talkTrack: [
          "Liberty Mutual remains the authoritative source. This answer is structured content, with its source, owner, applicability, and dates, rather than copy trapped in a page layout. Managed choices keep state, product, and audience classifications consistent.",
          "Canonical metadata and structured data make that meaning available to other consumers. External engines also depend on crawl permissions and their own indexing policies; this replica is deliberately excluded from external crawling.",
        ],
        controls: [
          "**Page Builder → Content → Quick Info** identifies the native template. The fields retain the answer’s content and governance metadata independently of its presentation.",
          "**Resource metadata** deliberately distinguishes the current **Page** from its referenced **Approved answer**. Choices are maintained beneath the public site’s **Data → Taxonomy**; this view does not change their source lists.",
          "The public rendering emits **FAQPage** structured data and the canonical URL from the governed content. External indexing still follows the public domain’s crawl permissions and each engine’s policy.",
        ],
        links: [
          { label: "Approved answer fields", href: answerContent },
          { label: "Article and Resource metadata app", href: articleEditor },
          { label: "Published structured answer", href: API_ANSWER },
        ],
        transition:
          "The content is structured and governed. Now show how its approved published version reaches the Search index automatically.",
      },
      {
        id: "public-indexing",
        title: "Show automatic Search indexing",
        label:
          "Published content is automatically indexed by enterprise search platform",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 2,
        objective:
          "Show the active native Search source, its indexed answer metadata, and the configured publication handoff before making a new governed change.",
        actions: [
          `Open [**Liberty Mutual Approved Answers**](${SEARCH_SOURCE}). From the SitecoreAI navigation, the same source is under **Content → Search Sources → Liberty Mutual Approved Answers**. Select **Preview**, and leave its settings unchanged.`,
          "In **Search by term**, enter **Can I bundle my car and home insurance?**. Click the matching document row’s chevron, **Toggle document details**, to expand its **14/14 fields**. Point to **question**, **body**, **state**, **product**, **audience**, **canonicalurl**, and **sourceurl**; these values accompany the searchable copy.",
          "Follow the delivery path in **Show the data and controls**: approved publication completes in **Experience Edge**, its **OnEnd** webhook calls the publication service, and that service synchronizes the native Search source. Keep this source tab open for the changed-answer check after authoring.",
          "Record the current answer wording. The next step changes that existing **Approved answer**, as well as creating a new Landing page. Check the answer’s indexed wording after publication; the new Landing page is a separate page-creation proof.",
        ],
        expected: [
          "The active source contains the published answer and its state, product, audience, and authoritative-source metadata.",
          "The configured handoff explains why the publisher does not maintain or manually reindex a second copy. The next authoring step supplies a fresh publication to verify this path.",
        ],
        talkTrack: [
          "The publishing team approves content once. Here is the configured publication-to-Search path, and here is the corresponding approved answer in the Liberty Mutual Approved Answers source, carrying its state, product, and audience metadata.",
          "This configured integration updates the native Search index after publication. Marketers do not retype the answer or maintain a separate Search copy. Approval makes the content eligible; publication is a separate action, and delivery completes asynchronously.",
        ],
        controls: [
          "**Experience Edge OnEnd → /api/sitecore/publication → SitecoreAI Search Push API → Liberty Mutual Approved Answers** is the configured publication path. The publication service reads only approved content delivered through **Live Experience Edge**.",
          "The source’s **Preview** tab shows the actual indexed document, while **Configuration → Fields** lists its 14 native fields. Stable item IDs and classifications travel with each answer. The scoped integration updates changed published answers and removes retired answers from its complete library.",
          "This source indexes the public **Approved answers** library. Publishing an ordinary Landing page does not turn that page into an approved-answer Search document.",
        ],
        links: [
          {
            label: "Native approved-answer Search source",
            href: SEARCH_SOURCE,
          },
          { label: "Open SitecoreAI", href: SITECORE },
          {
            label: "Published answer collection",
            href: `${PUBLIC}/api/content/v1/answers`,
          },
        ],
        transition:
          "With the delivery path established, create a page and make one approved-answer change through the marketer’s normal tools.",
      },
      {
        id: "public-authoring",
        title: "Create, review, and publish content",
        label:
          "Marketing builds and publishes pages from a library of pre-approved components",
        phase: "Authoring & Content-Operation Flow",
        sourceSlide: 10,
        durationMinutes: 7,
        objective:
          "Create and preview a governed page, reuse approved content, and show separate Author, Approver, and publisher actions without a frontend release.",
        actions: [
          `In the designated **Author** browser profile, open [**public Home in Page Builder**](${publicEditor}). Confirm **Liberty Mutual Public Website**, **English**, and **Default editing host**. Select **Home → Create a page**, choose **Landing page**, name it **coverage-guide-live**, and click **Create**.`,
          "Select **Content**, then the new page’s **Data → Hero**. Set **Heading** to **Explore coverage with confidence**. Open **Data → Introduction**, set **Heading** to **Guidance for your next decision**, and enter **Review approved information, compare your options, and speak with an agent about your needs.** in **Body**. Click outside each field, and wait for **Saved**.",
          "Return to **Editor**. In the page’s main content area, open the insertion control, choose **Promotion**, and select the existing **Bundle and save** content item. Choose **Assign**, rather than **Duplicate and assign**, and select the **Compact** presentation variant. Point to the allowed choices in this placeholder.",
          "Click **Preview**, then **Preview** in its menu. Confirm the new headings and shared Promotion. The page remains unpublished. Return to the editor and note that **Hero** and **Introduction** belong to this page’s local **Data** folder.",
          `As the **Author**, open [**Bundle car and home**](${answerContent}), select its current approved English version, and choose **Create version**. Name it **Shared answer review**, and click **Create**. In **Detailed explanation**, preserve the existing wording and append **Review your options with your agent before choosing coverage.** Wait for **Saved**.`,
          "On the answer, choose **Actions → Submit**, enter **Review approved bundling guidance**, and click **Submit**. Return to **coverage-guide-live**, choose **Actions → Submit**, enter **Review coverage guidance page**, and click **Submit**. Check the page and its local items in **Page items**. For any local item still in **Draft**, select **Content → coverage-guide-live → Data → Hero** or **Introduction**, choose **Actions → Submit**, enter **Review coverage guidance content**, and click **Submit**. Confirm all four items are **Awaiting approval**.",
          "In the separate **Approver** browser profile, open each submitted English item: **coverage-guide-live**, its **Hero** and **Introduction**, and **Bundle car and home**. Review the changes, choose **Actions → Approve**, enter **Approved coverage guidance**, and click **Submit**. Confirm **Approved**. Point out that this restricted Approver cannot publish.",
          "In the **administrator acting as publisher** browser profile, open **coverage-guide-live**. Choose **Publish** with **Page**, **Current language (English)**, **All references**, and **Include related items** selected; leave **Subpages** unchecked, and click **Start publish**. Then open **Bundle car and home** in **Content**, choose **Publish**, leave **Subitems** unchecked, and click **Start publish**. Continue to the Profound explanation while publication completes.",
        ],
        expected: [
          "The Author created a page from the approved structure, edited independent local content, reused the existing Promotion, and previewed the result without code changes.",
          "Separate restricted Author and Approver identities performed editing and approval. The administrator performed the publisher action. The new page and changed answer are eligible for their downstream delivery checks after the publishing jobs complete.",
        ],
        talkTrack: [
          "The marketer starts with an approved structure and useful building blocks. The template and placeholder rules provide guardrails, while the page’s local content remains independently editable. Preview and approval happen in the platform, without an engineering ticket.",
          "The Author edits and submits. The Approver approves. Publication is a separate permission; today’s publisher uses an administrator account. Once approved content is published, the existing delivery process makes it available without a frontend release.",
        ],
        controls: [
          "**Landing page** supplies the page structure and independent local **Hero** and **Introduction** items. The main placeholder offers only compatible components.",
          "**Assign** reuses **Bundle and save**. The **Compact** variant changes its presentation while retaining the same governed source item.",
          "The configured workflow is **Draft → Awaiting approval → Approved**. Approval does not automatically publish. The selected roles separate editing, approval, and publication.",
          "The new Landing page proves governed composition. The changed **Bundle car and home** answer proves the approved-answer Search and API publishing path.",
        ],
        links: [
          { label: "Create a page under public Home", href: publicEditor },
          { label: "Shared answer to edit", href: answerContent },
          {
            label: "New page after publication",
            href: `${PUBLIC}/coverage-guide-live`,
          },
        ],
        transition:
          "The reviewed changes are publishing. While delivery completes, explain how content from an upstream AI optimization tool enters the same governed process.",
      },
      {
        id: "public-profound",
        title: "Explain governed Profound intake",
        label:
          "Marketing can publish content from Profound directly into the CMS / DXP",
        phase: "Authoring & Content-Operation Flow",
        sourceSlide: 10,
        durationMinutes: 1,
        mode: "explain",
        objective:
          "Explain the integration pattern expressly permitted by the customer, using the same structured template and review controls just demonstrated.",
        actions: [
          "Trace the proposed intake: **Profound output → scoped integration → SitecoreAI Draft → human review and approval → publication → website, Search, and API consumers**.",
          "Point back to **Bundle car and home** and the page just created. Explain that an integration maps proposed wording, source, owner, applicability, and dates into the appropriate native template, then creates or updates a **Draft** for review.",
          "Identify this as an integration explanation. The running environment has the governed CMS and delivery path; a live Profound connection is not configured.",
        ],
        expected: [
          "The audience understands where upstream content enters, how its meaning maps to governed fields, and why human approval still precedes publication.",
        ],
        talkTrack: [
          "Profound can improve the upstream content. SitecoreAI is where that proposed content becomes governed, approved guidance that your channels can reuse.",
          "An integration maps the output into the appropriate template and carries its source, owner, and applicability into Draft. The normal review and publishing controls still apply. This is the integration pattern; a live Profound connection is not configured in this environment.",
        ],
        controls: [
          "A scoped API integration supplies the selected template’s structured fields. CMS permissions, workflow, and publication remain the governing controls.",
          "Upstream AI assistance, the current running implementation, and approved future product direction are separate subjects. This explanation does not represent a packaged Profound connector.",
        ],
        transition:
          "Return to the marketer’s view of results: first see whether people engage with the content, then show how another application retrieves the published answer.",
      },
      {
        id: "public-analytics",
        title: "Read content-performance signals",
        label: "Quick-answer analytics for marketers",
        phase: "Measurement & Delivery Foundation",
        sourceSlide: 10,
        durationMinutes: 3,
        objective:
          "Use real visits, clicks, and scroll events to give the marketer timely directional insight without a separate analytics request.",
        actions: [
          `After the publishing jobs complete, open the [**new coverage page**](${PUBLIC}/coverage-guide-live). Confirm **Explore coverage with confidence**, **Guidance for your next decision**, and the shared **Bundle and save** Promotion. Open the [**car-and-home article**](${ARTICLE}), and find the added review sentence.`,
          `Open [**Optimization → Analytics → Events**](${ANALYTICS}). Set **Site** to **liberty-mutual-public-site** and **Time** to **1 hour**, so the report includes the genuine public-site interactions performed at the start.`,
          "Inspect **Events over Time** and the **Events Table**. Identify **pageView**, **LM_PUBLIC_CTA_CLICK**, and the **LM_PUBLIC_SCROLL_25**, **LM_PUBLIC_SCROLL_50**, **LM_PUBLIC_SCROLL_75**, and **LM_PUBLIC_SCROLL_100** events that are present. Match the event types and times to the actual visitor journey.",
          "Point back to **Privacy choices**: the initial **Essential only** choice left Search available; later **Allow personalization** enabled optional measurement for the interaction used here. Keep content engagement separate from a completed quote or policy sale.",
        ],
        expected: [
          "The new page is live with the authored headings and shared Promotion. The approved answer contains the new sentence, independently of any frontend release.",
          "The native report shows genuine engagement events for the public site in the selected time window. A marketer can inspect these directional signals directly.",
        ],
        talkTrack: [
          "The publishing team can see directional evidence of whether people find and use the content: page visits, the next-step click, and how far visitors read. It is a quick platform view, without a separate analytics request.",
          "The website’s Privacy choices control optional analytics and personalization collection. Essential only keeps useful guidance and Search available while withholding that optional collection. These events measure engagement; they do not establish a completed quote or policy sale.",
        ],
        controls: [
          "The **Site** filter separates the public application’s events from the Agent Portal. The current time window helps correlate reporting with the actual actions just performed.",
          "The website emits actual page, CTA, and scroll interactions through its configured SitecoreAI measurement integration, subject to optional-collection choices.",
          "Use the events actually present and their timestamps. A saved report image or an application call alone is not proof that a newly performed interaction reached native reporting.",
        ],
        links: [
          { label: "Native public-site Events", href: ANALYTICS },
          {
            label: "Published coverage page",
            href: `${PUBLIC}/coverage-guide-live`,
          },
          { label: "Updated car-and-home article", href: ARTICLE },
        ],
        images: [
          {
            file: "customer-demo-public-events.png",
            title: "Read actual visitor events",
            alt: "Native SitecoreAI Events table showing public-site CTA clicks, scroll-depth events, and page views",
            caption:
              "In **Events Table**, compare the actual **LM_PUBLIC_CTA_CLICK**, **LM_PUBLIC_SCROLL** milestones, and **pageView** rows. Counts vary with the selected reporting window and the interactions performed; these are engagement signals.",
            crop: {
              x: 72,
              y: 370,
              width: 1180,
              height: 350,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
          },
        ],
        transition:
          "The website is using the new content and recording consented engagement. Now show the same published answer in another application.",
      },
      {
        id: "public-api",
        title: "Retrieve the answer in another experience",
        label: "Decoupled delivery with a stable content API",
        phase: "Measurement & Delivery Foundation",
        sourceSlide: 10,
        durationMinutes: 3,
        objective:
          "Prove that a separate application retrieves the same newly published answer, source, and governance metadata through a versioned API.",
        actions: [
          "Open [**One approved answer, two experiences**](/workshops/content-api). Under **Published insurance question**, select **Can I bundle my car and home insurance?**, and click **Load answer**.",
          "Find the added sentence **Review your options with your agent before choosing coverage.** Compare it with the public article. Under **The governance travels with the answer**, inspect **Content owner**, **State**, **Product**, **Audience**, **Effective**, and **Review date**.",
          "Under **A stable contract for other applications**, point to **API contract version**, **Native content version**, **Stable item ID**, **Published content fingerprint**, and **Response ETag**. The stable ID remains the same, while the native version identifies the newly published editorial version.",
          "Open the **Actual single-answer request** URL. Show **schemaVersion**, **data.answer**, **data.explanation**, **data.sourceLink**, and **data.revision** in the actual JSON response, then return to the rendered experience.",
          "Click **Check whether the response is unchanged**. Show **304 Not Modified** for an unchanged response. If publication is still converging, wait for that job to complete and reload; the API can reuse its response for up to **15 seconds** after delivery.",
          `Return to [**Liberty Mutual Approved Answers → Preview**](${SEARCH_SOURCE}). Enter **Can I bundle my car and home insurance?** in **Search by term**, and expand the matching row with **Toggle document details**. Verify that **body** contains the added sentence and that **state**, **product**, and **audience** remain correct. No manual reindex or second content edit is needed.`,
        ],
        expected: [
          "The public article, native Search document, and separate rendered API consumer contain the same approved source change.",
          "The real request exposes a stable, versioned contract and the content’s governance metadata. Its conditional request confirms whether the delivered response is unchanged.",
        ],
        talkTrack: [
          "This separate application retrieves the same published answer through a stable API. It receives the wording and governance information together, while presenting them in its own layout. The content team maintains one approved source, and each channel controls its experience.",
          "The API contract version describes the response format; the native content version identifies the editorial version. The real ETag check confirms whether the response is unchanged. Draft and Preview content remain in authoring.",
        ],
        controls: [
          "The read endpoint is **/api/content/v1/answers/** followed by the stable Sitecore item ID. It reads approved published content from **Live Experience Edge**.",
          "The API envelope and this second application are implementation components. Native content ownership, workflow, versioning, and publication supply the governed source.",
          "The content fingerprint describes the delivered payload. Restoring the original wording later creates a newer reviewed native version, so the fingerprint can change even when the words return to their starting values.",
        ],
        links: [
          {
            label: "Open the second content experience",
            href: "/workshops/content-api",
          },
          { label: "Open the real single-answer API", href: API_ANSWER },
          { label: "Verify the native Search document", href: SEARCH_SOURCE },
          { label: "Compare the public article", href: ARTICLE },
        ],
        images: [
          {
            file: "customer-demo-content-api.png",
            title: "Select the same published answer",
            alt: "One approved answer, two experiences page with the published insurance question selector and Load answer button",
            caption:
              "Choose **Can I bundle my car and home insurance?** under **Published insurance question**, then select **Load answer**. This page retrieves the actual published API response.",
            annotations: [
              {
                x: 46,
                y: 80,
                width: 39,
                height: 9,
                label: "Choose the published insurance question.",
              },
              {
                x: 85,
                y: 80,
                width: 12,
                height: 9,
                label: "Select **Load answer**.",
              },
            ],
          },
        ],
        transition:
          "That same governed-content foundation also supports a different relationship: an independent agent with a known role, agency, and business context.",
      },
    ],
  },
  {
    id: "portal",
    title: "One Relevant Liberty Experience",
    summary:
      "An independent agent sees relevant priorities and consistent design. A marketer changes the emphasis, previews both audiences, and publishes without development work. One shared disclosure then demonstrates cross-site reuse, approval, history, and reversal.",
    sourceSlide: 11,
    steps: [
      {
        id: "portal-relevance",
        title: "Compare two known agents",
        label:
          "Agent sees product content, and bundles based on their business, relationship and priorities",
        phase: "Agent Experience",
        sourceSlide: 11,
        durationMinutes: 4,
        objective:
          "Show how known agent context supports relevant guidance, licensed-state eligibility, and respect for a stored communication choice.",
        actions: [
          `Open the [**live Agent Portal**](${PORTAL}/login) in the prepared Avery browser session. Sign in as **avery.01** with the supplied portal password. Confirm **Avery Brooks** and **Cedar Ridge Insurance** in the profile menu, then find **Priorities for your agency** beneath the agency overview.`,
          "Point to Avery’s starting order: **Build a stronger small-business practice**, **Support workers’ compensation conversations in Texas**, and **Connect home and auto conversations**. Click Avery’s name or avatar in the upper right to open **Your profile**. Inspect her principal role and **Licensed states**: **Texas**, **Illinois**, and **Florida**.",
          `In the separate Daniel session, open the [**live portal login**](${PORTAL}/login), and sign in as **daniel.01**. Confirm **Daniel Ortiz** and **Prairie Oak Insurance**. Compare his household-first priorities, then inspect **Illinois** and **Texas** licenses and the available state choices in **Products & appetite**.`,
          `Open the prepared [**Liberty Mutual - Agency product priorities** custom value](${PRIORITY_VALUE}) and its description. Show the combined inputs: role, state license, specialization, and imported production. Avery’s principal/Texas/growth criterion returns **agency-growth**; Daniel’s producer/Illinois/specialization criterion returns **producer-priorities**. Leave the published expression unchanged.`,
          "Open [**Honor communication preferences**](/workshops/preferences). Use the prepared baseline records, **Cameron Ellis - Allowed** and **Cameron Ellis - Suppressed**. Follow each **Open native profile in SitecoreAI** link, and inspect **marketingSuppressed** under **Additional data**: false for the first record and true for the second.",
          `Open [**Agents eligible for marketing**](${AUDIENCE}). Point to **Marketing Suppressed → is false**, its **Live** status, and its current **Audience size**. The prepared comparison includes the explicit false record and excludes the true record. Inspect the rule without pausing it or starting another import.`,
        ],
        expected: [
          "Avery and Daniel see different product priorities through the native content experiences. Daniel’s regulated-content choices remain limited to his licensed states.",
          "Native profile data and the saved suppression rule show how a known communication choice can govern marketing eligibility. The full preference-change exercise remains available separately.",
        ],
        talkTrack: [
          "After sign-in, the portal knows the agent’s role, agency, and licensed states. Avery’s agency-growth emphasis differs from Daniel’s producer emphasis. Each agent gets a useful starting point for the next business conversation.",
          "The profile supplies known context, and native personalization selects the content experience. Here the decision combines licenses, role, specialization, and imported production. The application separately enforces licensed-state eligibility. Native profiles can also carry the person’s communication preference for an exclusion rule.",
        ],
        controls: [
          "The published **Liberty Mutual - Agency product priorities** custom value evaluates an identified Liberty agent’s UDL attributes. A Texas-licensed principal with less than 20% agency small-commercial share returns **agency-growth**. An Illinois-licensed producer specializing in small commercial with positive individual small-commercial production returns **producer-priorities**.",
          "The base **state** is an office location, while separate license attributes determine the full licensed-state set. The portal enforces eligibility on its server as well as in its visible filters.",
          "**Profile schema → extensions → marketingSuppressed** is an optional native Boolean. **Agents eligible for marketing** requires an explicit **false**; true and missing values do not qualify. Activations can use that stored preference and Audience rule.",
          "The business records and preference-center input are sample data. The native UDL profiles, schema, import processing, personalization decision, and Audience rule are real platform controls.",
        ],
        links: [
          { label: "Live Agent Portal login", href: `${PORTAL}/login` },
          { label: "Native priority calculation", href: PRIORITY_VALUE },
          {
            label: "Native preference comparison",
            href: "/workshops/preferences",
          },
          { label: "Marketing eligibility Audience", href: AUDIENCE },
          { label: "Native Profile schema", href: PROFILE_SCHEMA },
        ],
        images: [
          {
            file: "customer-demo-priorities.png",
            title: "Find Priorities for your agency",
            alt: "Avery's portal dashboard with Priorities for your agency below the agency overview and the small-business and Texas guidance cards",
            caption:
              "On **My workspace**, find **Priorities for your agency** below the agency overview. The starting principal experience leads with **Build a stronger small-business practice**; Daniel’s producer experience leads with household guidance.",
            annotations: [
              {
                x: 22,
                y: 47,
                width: 75,
                height: 39,
                label:
                  "Compare the ordered cards in **Priorities for your agency**.",
              },
            ],
          },
          {
            file: "customer-demo-suppression.png",
            title: "Inspect the native exclusion rule",
            alt: "Agents eligible for marketing Audience with Marketing Suppressed is false and an Audience size of one",
            caption:
              "**Marketing Suppressed → is false** requires a known eligible choice. The prepared matched profiles differ in this preference, and the native Audience includes the eligible record.",
            annotations: [
              {
                x: 7,
                y: 52,
                width: 57,
                height: 10,
                label:
                  "Read the native **Marketing Suppressed → is false** rule.",
              },
              {
                x: 71,
                y: 27,
                width: 25,
                height: 8,
                label: "Inspect the calculated **Audience size**.",
              },
            ],
          },
        ],
        transition:
          "The content is relevant to each agent. Next, show why the experience still feels like one consistent Liberty Mutual portal.",
      },
      {
        id: "portal-design",
        title: "Show consistent, governed design",
        label: "Agent sees consistent brand and design across all portal pages",
        phase: "Agent Experience",
        sourceSlide: 11,
        durationMinutes: 2,
        objective:
          "Connect the consistent visitor experience to reusable components, page structure, and the controls that keep author choices appropriate.",
        actions: [
          "In Avery’s live session, navigate from **My workspace** to **Products & appetite**, then **Learning & resources**. Point to the common navigation, typography, buttons, and cards. On **My workspace** and **Learning & resources**, find the shared **Coverage and availability** disclosure.",
          `Open [**Agent Portal Home in Page Builder**](${portalEditor}). Confirm **Liberty Mutual Agent Portal**, **English**, and **Default editing host**. Open **Layers** to locate **Agency priorities** and the shared **Disclosure** component.`,
          "Open **Components** and inspect the component choices for the selected area without inserting or removing anything. Explain that the page design provides shared structure and the placeholder settings limit which components fit each governed area.",
          "Return to the visitor view. Identify the shared disclosure that will be changed in the final part of this flow; that change will provide the visible propagation proof across placements.",
        ],
        expected: [
          "The portal’s normal pages retain consistent Liberty branding and interaction patterns while their content changes by purpose.",
          "Page structure and allowed component choices provide authoring guardrails. The later shared-source edit will demonstrate actual content propagation.",
        ],
        talkTrack: [
          "These pages share an intentional design system and reusable components, so each part of the portal feels like the same Liberty Mutual relationship. Authors assemble approved patterns in the places where they belong.",
          "The templates and placeholder settings provide the guardrails. In the shared-content section, we will show an actual update reaching multiple placements from one governed source.",
        ],
        controls: [
          "**Page designs**, **partial designs**, native renderings, and **placeholder settings** provide reusable structure and permitted composition. Their code and definitions are maintained separately from authored content.",
          "The **Agency priorities** slot accepts its intended component; the **Disclosure** slot accepts its shared disclosure component. No layout or component-code change is needed for the upcoming copy and priority edits.",
        ],
        links: [
          { label: "Agent Portal Home in Page Builder", href: portalEditor },
          { label: "Products & appetite", href: `${PORTAL}/products` },
          { label: "Learning & resources", href: `${PORTAL}/resources` },
        ],
        transition:
          "Keep the governed structure. Change only the business emphasis in the marketer-managed priority collection.",
      },
      {
        id: "portal-priority-edit",
        title: "Change a business priority",
        label: "Marketing user changes a priority without development work",
        phase: "Liberty Business Experience",
        sourceSlide: 11,
        durationMinutes: 4,
        objective:
          "Change the ordered selection of approved product conversations as a draft, keeping the live experience stable until audience preview and approval.",
        actions: [
          `As the **Author**, open [**Agency growth priorities in Page Builder Content**](${priorityContent}). Confirm **Liberty Mutual Agent Portal**, **English**, and **Data → Agency priorities → Agency growth priorities**.`,
          "Record the current approved version and its order: **Small business growth → Texas workers compensation → Home and auto conversations**. Open the version selector, choose **Create version**, name it **Texas guidance priority**, and click **Create**.",
          "Find **Ordered recommendations**. Click **Remove all items** to clear only this draft’s selection, open the picker, and select **Texas workers compensation**, **Small business growth**, and **Home and auto conversations**, in that order. Click the item heading to close the picker, and wait for **Saved**.",
          "Confirm the selected cards are in the new order and that the version remains **Draft**. Leave it unpublished. The next step previews both audience experiences before completing this same change’s approval and publication.",
        ],
        expected: [
          "The new draft leads with Texas guidance and retains the small-business and household conversations. The collection still references native content items with their own editable fields.",
          "Avery’s live page retains the original published order until the reviewed change is published. No React change, engineering ticket, or frontend release is involved.",
        ],
        talkTrack: [
          "The business team decides which approved conversations deserve emphasis. I can change the ordered selection of these native content items here, without a React change, engineering ticket, or frontend release.",
          "These cards are selected content items with their own editable fields. The original published version stays available while we prepare the draft. Next, we will review the audience experiences before approving this change.",
        ],
        controls: [
          "**Ordered recommendations** is an ordered native item selection. This collection supplies the **agency-growth** experience, while **Producer priorities** supplies a separate experience.",
          "The original approved version is retained. Saving the new **Draft** changes authoring content, with publication still governed by the configured workflow.",
        ],
        links: [
          { label: "Edit Agency growth priorities", href: priorityContent },
        ],
        transition:
          "Before publishing, inspect the changed principal experience and the unchanged producer experience in native Preview.",
      },
      {
        id: "portal-preview",
        title: "Preview audiences, then publish",
        label: "Marketing user previews the experience for each agent audience",
        phase: "Liberty Business Experience",
        sourceSlide: 11,
        durationMinutes: 4,
        objective:
          "Preview the two configured content experiences before publication, then verify that ordinary publication updates the actual principal’s live view.",
        actions: [
          `Open [**Agent Portal Home in Page Builder Editor**](${portalEditor}), retain **Default editing host**, select **Layers**, and select **Agency priorities**. Open that component’s personalization experience selector.`,
          "Choose **agency-growth**. Click the header **Preview** button, then **Preview** in its menu. In the full preview, confirm Texas guidance appears first for the changed principal collection. Close the preview tab when finished.",
          "Choose **producer-priorities** for the same component, and open **Preview** again. Confirm its separate order: household conversations, Illinois workers compensation, and small-business growth. Close that preview tab without changing the producer content.",
          `Return to [**Agency growth priorities**](${priorityContent}). Select the draft just edited, choose **Actions → Submit**, enter **Prioritize Texas workers compensation guidance**, and click **Submit**. Confirm **Awaiting approval**.`,
          "In the separate **Approver** session, open that submitted collection version, inspect its order, and choose **Actions → Approve**. Enter **Approved agency priority update**, click **Submit**, and confirm **Approved**.",
          "In the **administrator acting as publisher** session, open that collection in **Content**, choose **Publish**, keep **Item** and **Current language (English)** selected, leave **Subitems** unchecked, and click **Start publish**. After completion, reload Avery’s actual live portal and confirm Texas guidance first. Keep Daniel’s separate producer view available for comparison.",
        ],
        expected: [
          "Native Preview showed the intended principal and producer content experiences before publication. The two collections remain independent.",
          "Publishing only the reviewed collection updates Avery’s personalized page without publishing Home manually or deploying frontend code. Daniel’s producer collection remains unchanged.",
        ],
        talkTrack: [
          "The marketer can preview this component’s two configured audience experiences before publication. The principal sees the new emphasis, while the producer keeps the appropriate producer guidance. After approval and publication, the changed collection reaches the actual agent experience.",
          "The preview selects the configured native content experience. We keep that visual check distinct from impersonating an entire CDP profile, then verify the decision’s outcome in the actual signed-in agent session.",
        ],
        controls: [
          "**agency-growth** and **producer-priorities** are the actual native experience names. Their datasource selections drive the component’s preview; this is not full CDP identity impersonation.",
          "Native profile evaluation selects the live experience. The renderer’s **Related Items**, **Siblings**, and **Recursive Related Items** dependencies keep the peer collections and selected cards associated with the published page.",
          "The same **Draft → Awaiting approval → Approved** workflow and separate publisher permission govern this business-priority change.",
        ],
        links: [
          { label: "Preview Home experiences", href: portalEditor },
          {
            label: "Review and publish the priority collection",
            href: priorityContent,
          },
          { label: "Verify Avery’s live portal", href: `${PORTAL}/` },
        ],
        transition:
          "A marketer changed the agent’s emphasis without development work. Next, make one approved disclosure change reach both independent websites.",
      },
      {
        id: "portal-shared-content",
        title: "Update one disclosure across sites",
        label:
          "Approved shared content is managed once and distributed to every website",
        phase: "Shared-Content Foundation",
        sourceSlide: 11,
        durationMinutes: 4,
        objective:
          "Update one governed disclosure item and observe its wording on the configured public-site and Agent Portal placements.",
        actions: [
          `As the **Author**, open [**Product availability notice in Page Builder Content**](${disclosureContent}). Confirm **Liberty Mutual Public Website**, **English**, and **Data → Disclosures → Product availability notice**. Record the current approved version and original **Disclosure** text for the rollback in the next step.`,
          "Open the version selector, choose **Create version**, name it **Shared disclosure review**, and click **Create**. Append **Review available options with your agent before making a coverage decision.** to **Disclosure**. Click outside the field, and wait for **Saved**.",
          "Choose **Actions → Submit**, enter **Review shared disclosure wording**, and click **Submit**. Confirm **Awaiting approval**. In the separate **Approver** session, inspect this version, choose **Actions → Approve**, enter **Approved shared disclosure wording**, and click **Submit**.",
          "In the **administrator acting as publisher** session, open this approved disclosure in **Content**, click **Publish**, keep **Item** and **Current language (English)** selected, leave **Subitems** unchecked, and select **Start publish**. While the job completes, identify the single source and the four configured page views in the links.",
          `After completion, open [**public Home**](${PUBLIC}/) and [**public Bundling**](${PUBLIC}/bundling), and find the new sentence in **Coverage and availability**. In Avery’s session, check [**My workspace**](${PORTAL}/) and [**Learning & resources**](${PORTAL}/resources) for the same published wording. Reload a page after publication if it was already open.`,
        ],
        expected: [
          "The new sentence is present in all four configured page views after one approved disclosure publication. The public site and Agent Portal remain separate sites with separate frontends.",
          "Each placement presents the same governed disclosure source within its own page layout. No separate copy edit or frontend release is needed for either site.",
        ],
        talkTrack: [
          "The disclosure has one governed owner and one source. Both sites reference that same item, so the content team changes it once and publishes it through the normal controls.",
          "The Portal and public website remain separate sites and applications. Each keeps its own layout while sharing the approved message. We will verify the changed wording in both, then restore it through the same governed process.",
        ],
        controls: [
          "**Product availability notice** belongs to the public site’s **Data → Disclosures** library. The Portal references that native item; it does not maintain its own copy of the wording.",
          "The four page views demonstrate cross-site distribution. A native reference count can include multiple layout references to one page, so it should not be described as a distinct-page count.",
          "Publication delivers the approved shared item through **Experience Edge**. Its configured content dependencies and the public site’s delivery invalidation keep the referencing page views current.",
        ],
        links: [
          { label: "Edit the shared disclosure", href: disclosureContent },
          { label: "Public Home disclosure", href: `${PUBLIC}/` },
          { label: "Public Bundling disclosure", href: `${PUBLIC}/bundling` },
          { label: "Portal Home disclosure", href: `${PORTAL}/` },
          {
            label: "Portal Learning & resources disclosure",
            href: `${PORTAL}/resources`,
          },
        ],
        transition:
          "Keep the changed disclosure visible. Finish by inspecting its real approval history and restoring the original wording through a new reviewed version.",
      },
      {
        id: "portal-audit-rollback",
        title: "Show history and reverse the change",
        label: "Every change is approved, auditable, and reversible",
        phase: "Shared-Content Foundation",
        sourceSlide: 11,
        durationMinutes: 4,
        objective:
          "Inspect actual workflow decisions in Page Builder and restore the shared disclosure through a new approved version, retaining its history.",
        actions: [
          `Open [**public Home in Page Builder Editor**](${publicEditor}). In **Sitemap**, open the **Home** row’s **Content tree options** menu, choose **Page items**, and expand **Product availability notice**.`,
          "Select **Workflow history**. Under **History**, read the **Draft → Awaiting approval** and **Awaiting approval → Approved** transitions, their user and timestamp, and the review **Comment**. Match them to the separate Author and Approver actions just demonstrated.",
          `As the **Author**, return to [**Product availability notice in Content**](${disclosureContent}). In the version selector, select the original approved English version recorded in the prior step, then choose **Create version**. Name it **Original disclosure restored**, click **Create**, and confirm that **Disclosure** contains the preserved original wording without the added sentence.`,
          "Choose **Actions → Submit**, enter **Restore original disclosure wording**, and click **Submit**. In the separate **Approver** session, review the restored wording and choose **Actions → Approve**, enter **Approved restoration of shared disclosure wording**, and click **Submit**.",
          "In the **administrator acting as publisher** session, publish the approved disclosure from **Content** with **Item** and **Current language (English)** selected and **Subitems** unchecked. While publication completes, return to **Page items → Product availability notice → Workflow history** to show that the reversal has its own recorded workflow decisions.",
          `After publication completes, verify the original wording on [**public Home**](${PUBLIC}/), [**public Bundling**](${PUBLIC}/bundling), [**Portal Home**](${PORTAL}/), and [**Learning & resources**](${PORTAL}/resources). The temporary sentence must be absent. Leave the earlier approved versions available in history.`,
        ],
        expected: [
          "The modern Page Builder history identifies actual workflow transitions, users, times, and review comments.",
          "A newer reviewed version restores the original disclosure across both sites. The original, changed, and restored versions remain available; restoration does not erase the audit trail.",
        ],
        talkTrack: [
          "The change has an owner, a review decision, and a version history. The Author and Approver have separate restricted permissions; today’s administrator performs the publisher action.",
          "Reversal is another governed change. We restore the original wording into a new version and publish that version, preserving the history of what happened. Both sites then return to the approved original message.",
        ],
        controls: [
          "**Editor → Sitemap → Home → Content tree options → Page items → Product availability notice → Workflow history** is the actual Page Builder history route.",
          "The history records workflow state changes and comments. The version selector retains editorial versions; selecting an earlier version and creating a new draft preserves that history during reversal.",
          "The Author and Approver remain restricted identities. The administrator is explicitly acting as publisher; three actions performed by an administrator alone would not demonstrate role separation.",
          "After the presentation, use the separate reset checklist to restore the priority order and approved-answer wording and remove only the owned **coverage-guide-live** page. A portal-number reset does not restore authored CMS content.",
        ],
        links: [
          {
            label: "Page Builder Page items and workflow history",
            href: publicEditor,
          },
          { label: "Restore the shared disclosure", href: disclosureContent },
        ],
        images: [
          {
            file: "customer-demo-workflow-history.png",
            title: "Read the actual Workflow history",
            alt: "Page Builder Page items panel with Product availability notice expanded and Workflow history showing approval transitions and comments",
            caption:
              "In **Page items**, expand **Product availability notice**, then select **Workflow history**. The entries show the state change, user, time, and review comment.",
            crop: {
              x: 315,
              y: 444,
              width: 475,
              height: 276,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
          },
        ],
        transition:
          "Close on the customer’s outcomes: trusted and relevant guidance, simpler business-managed changes, and governance that remains visible through publication and reversal.",
      },
    ],
  },
];
