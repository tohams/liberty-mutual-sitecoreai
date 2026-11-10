import type { DemoChapter } from "./types";

const PUBLIC = "https://liberty-mutual-public-site.vercel.app";
const PORTAL = "https://liberty-mutual-agent-portal.vercel.app";
const ORG = "org_XqL3u1MSNVuubOTb";
const TENANT = "97eea84c-ac47-4d91-7e4f-08defdaaa7df";
const TENANT_NAME = "scaipocusem400b-sitecoreai950c-demo4418";
const CONTEXT = `organization=${ORG}&tenantId=${TENANT}`;
const SEARCH_SOURCE = `https://app.sitecorecloud.io/search/f527245d-98c7-4978-8802-237d7717ca43/preview?${CONTEXT}`;
const ANALYTICS = `https://app.sitecorecloud.io/optimization/dashboards/events?${CONTEXT}`;
const MARKETING_ELIGIBILITY = `https://app.sitecorecloud.io/optimization/personalization/af90f4c1-20ab-4ae3-871d-97e91f22431b?experienceType=INTERACTIVE_API_FLOW&section=configuration&operationalTimeWindow=15m&${CONTEXT}`;
const ARTICLE = `${PUBLIC}/insurance-resources/bundle-car-and-home`;
const RESOURCE_PAGE_ID = "ae109fc0-b508-5840-97eb-0b2c02ae1a9b";
const PUBLIC_HOME_ID = "6d600332-3e21-4c5f-83ec-aae04f83450f";
const PORTAL_HOME_ID = "ae9e45ca-f127-4abe-9ca7-2ff109981998";
const PRIORITIES_ID = "3127968e-4b21-50c3-ad79-b6bbbe5303b8";
const DISCLOSURE_ID = "c4fd68f7-7c79-5bb6-9919-fb6f82b84bca";

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

const resourcePageContent = pageBuilder("public", RESOURCE_PAGE_ID, "content");
const publicEditor = pageBuilder("public", PUBLIC_HOME_ID);
const portalEditor = pageBuilder("portal", PORTAL_HOME_ID);
const priorityContent = pageBuilder("portal", PRIORITIES_ID, "content");
const disclosureContent = pageBuilder("public", DISCLOSURE_ID, "content");

/** Explain AI's role in each customer journey without implying autonomous publication. */
export const customerDemoAiContext: Record<
  DemoChapter["id"],
  { demonstrated: string; nextStep: string; talkTrack: string }
> = {
  public: {
    demonstrated:
      "Search retrieves approved guidance, while structured answers provide the source and applicability information that supports discovery by search and AI consumers.",
    nextStep:
      "SitecoreAI assistants can help marketers draft and refine brand-aligned website copy for human review. The proposed Profound integration would bring external content proposals into the same Draft, approval, and publishing process.",
    talkTrack:
      "For this public-site journey, Search retrieves published guidance and structured answers support AI discovery. SitecoreAI assistants can help marketers draft and refine brand-aligned copy; Profound intake would be a proposed integration, with human review.",
  },
  portal: {
    demonstrated:
      "Known profile attributes and explicit native rules select relevant agent guidance and evaluate the recorded marketing choice.",
    nextStep:
      "SitecoreAI assistants and Agentic Studio can help prepare audience-specific campaign drafts. Liberty Mutual could adopt those drafts within the same human review, publication, and marketing-eligibility controls.",
    talkTrack:
      "Known attributes and explicit rules select the agent experience today. SitecoreAI’s available AI assistants and Agentic Studio can prepare audience-specific campaign drafts; Liberty Mutual could adopt those within the same review and eligibility controls.",
  },
};

/** Angela introduces the AI vision before the customer-prescribed live sequence. */
export const customerDemoOpening = {
  presenter: "Angela Gustafson",
  title: "AI assistance with business control",
  talkTrack: [
    "Some of your colleagues have already explored the Agent Portal with us and worked directly in SitecoreAI. We have expanded that foundation to the public website, so you can see how the same governed platform supports both experiences.",
    "We know your teams use Microsoft Copilot. Our vision is for AI assistance to become a natural part of the marketer’s working day: understanding signals, considering a business goal, and helping the team prepare its next action. Human judgment and publishing controls remain central to that process.",
    "We will follow your two requested journeys in order. First, a customer finds trusted guidance, and the content team keeps it current. Then, an independent agent receives relevant priorities, and a marketer changes that experience without a code release. Watch for the controls behind each result as well as the visitor experience. The separate roadmap discussion will expand on the product direction.",
  ],
  handoff:
    "Let’s begin with the public-site visitor and the first requirement in your guide: asking an insurance question in everyday language.",
};

/** Thirteen customer cards, retaining the original row and left-to-right order. */
export const customerDemoChapters: DemoChapter[] = [
  {
    id: "public",
    title: "Trusted Answers, Wherever the Journey Begins",
    summary:
      "Start with a customer’s question, then follow the approved answer through authoring, review, publication, measurement, and reuse. Business users manage one governed source across delivery channels.",
    sourceSlide: 10,
    steps: [
      {
        id: "public-question",
        title: "Search in the customer’s own words",
        label:
          "User can ask a question in conversational language in an AI-enabled search field",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 2,
        persona: "Prospective customer",
        scenario:
          "The visitor wants useful insurance guidance without already knowing Liberty Mutual’s terminology.",
        objective:
          "Help a visitor find relevant approved guidance from a conversational question, with an agent-assisted next step when the subject needs further help.",
        stopWhen:
          "The supported question shows the range of relevant published results and the approved answer excerpt, and the unsupported question ends with No results found and Contact an agent.",
        actions: [
          `Open the [**public Home page**](${PUBLIC}/). Choose **Privacy choices → Essential only**, then select **Search** in the header. Search remains available when optional collection is declined.`,
          "In **Search**, enter **Can I combine home and car coverage?**, and select **Search**. Wait for **Searching…** to finish. Briefly point out the bundling overview and two practical articles, then highlight the **Can I bundle my car and home insurance?** result and its answer excerpt on the results page. Keep every result unopened.",
          "In **keyword(s)**, replace the query with **Does car insurance cover cyberextortion?**, and select **Search**. Show **No results found** and **Contact an agent**. End this loop with that contact option; leave the link unopened.",
        ],
        expected: [
          "The conversational question returns five published results, including **Bundle home and auto insurance**, **How to bundle your insurance policies**, **3 tips for bundling your insurance policies**, and **Can I bundle my car and home insurance?**. The approved answer excerpt is visible in the results. The unsupported subject offers an agent-assisted next step.",
        ],
        talkTrack: [
          "One question brings back several kinds of published guidance: a bundling overview, practical articles, and the approved answer. The visitor can compare useful guidance in the results without having to phrase the question exactly as Liberty Mutual does. When published guidance does not address the subject, Contact an agent provides the next step.",
        ],
        controls: [
          "**SitecoreAI Search** retrieves and ranks published guidance. The application’s authored-evidence check confirms whether approved source material addresses the question before presenting a result.",
          "Published website pages join Search when their native **Include in site search** checkbox is selected. The articles and approved answers are managed and published in **SitecoreAI**.",
          "**Essential only** keeps website and Search functions available while respecting the visitor’s choice about optional collection.",
        ],
        links: [
          { label: "Public Home", href: `${PUBLIC}/` },
          { label: "Public Search", href: `${PUBLIC}/search` },
        ],
        transition:
          "The customer has found relevant guidance and a clear next step. Now inspect the content behind that result and how the content team keeps it consistent and discoverable.",
      },
      {
        id: "public-discovery",
        title: "Make approved answers easier to discover",
        label:
          "Search engines and AI answer engines can find and cite the right LM content",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 1,
        persona: "Public-site marketer",
        scenario:
          "The marketer needs the guidance to retain its meaning, source, and applicability when people discover it through search or an AI experience.",
        objective:
          "Make approved guidance easier to find and reuse, with its source, applicability, and review information kept explicit.",
        stopWhen:
          "The native page template, managed applicability values, canonical URL, and FAQPage metadata have been shown without changing content.",
        actions: [
          `Open [**the car-and-home resource page in Page Builder Content**](${resourcePageContent}). Confirm **Public Website**, **English**, and **Home → insurance-resources → bundle-car-and-home**. Expand **Resource content** to inspect **Question**, **Plain-language answer**, **Formal source wording**, **Detailed explanation**, **Content owner**, and the dates. Under **Content**, find **Canonical URL** and **Reference source**. Under **Quick Info**, identify the **PublicResourcePage** template.`,
          `In the same [**resource page in Page Builder Content**](${resourcePageContent}), locate **State applicability**, **Products**, and **Audience** under **Content**. Open each field’s selection control: the collapsed labels show **1 item selected** or **2 items selected**. Show **All states** under **State applicability**, **Auto** and **Homeowners** under **Products**, and **All consumers** under **Audience**. Close each list before opening the next, and leave this approved version unchanged.`,
          `On the [**public article**](${ARTICLE}), use **View page source → Find** to locate **application/ld+json**. Identify **FAQPage**, **Question**, and **acceptedAnswer**, then find the **canonical** link. Return to the rendered article.`,
        ],
        expected: [
          "The resource page owns its guidance, managed classifications, canonical metadata, and structured answer data.",
        ],
        talkTrack: [
          "The visitor found the car-and-home resource page. Here is that same page in Page Builder: its question, guidance, source, owner, applicability, and review dates.",
          customerDemoAiContext.public.talkTrack,
        ],
        controls: [
          "**Page Builder → Content → Quick Info** identifies the native page template. Native **Checklist** fields classify the resource page using choices maintained beneath **Data → Taxonomy**. The page’s content and classifications follow the same publication into Search and the content API.",
          "The public rendering supplies **FAQPage** metadata and a canonical URL: a structured foundation for discovery by permitted search and AI consumers.",
        ],
        links: [
          { label: "Resource page fields", href: `${resourcePageContent}` },
          { label: "Public article", href: `${ARTICLE}` },
        ],
        images: [
          {
            file: "native-public-taxonomy-checklist.png",
            afterAction: 2,
            title: "Open a native checklist to inspect its selections",
            alt: "Native Products checklist with Auto and Homeowners selected independently",
            caption:
              "Open **Products** using its **2 items selected** control to see the separate **Auto**, **Homeowners**, and **Condo** checkboxes. These are the resource page’s native classification fields. Leave the selected choices unchanged during this inspection.",
          },
        ],
        transition:
          "The page carries its content, meaning, and governance together. Next, publish a reviewed page change and see Search stay aligned.",
      },
      {
        id: "public-indexing",
        title: "Keep Search current as content changes",
        label:
          "Published content is automatically indexed by enterprise search platform",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 3,
        persona:
          "Public-site publisher, following marketer and approver review",
        scenario:
          "An approved guidance change must reach Search automatically, with its existing product, state, and audience classifications.",
        objective:
          "Keep approved wording and classifications aligned across publishing and Search, reducing duplicate maintenance through one controlled update.",
        stopWhen:
          "The native Search document contains the newly published sentence, with its state, product, and audience values preserved.",
        actions: [
          `Open [**SitecoreAI Search → Preview**](${SEARCH_SOURCE}). Enter **Can I bundle my car and home insurance?** in **Search by term**, open the matching row with **Toggle document details**, and confirm that **Review your options with your agent before choosing coverage.** is absent. If it is already visible, return to [**Before presenting**](#preparation) to restore the baseline before continuing; an existing sentence does not prove a fresh publication.`,
          `In the prepared **administrator acting as publisher** session, open [**the car-and-home resource page**](${resourcePageContent}). In the version selector, choose the prepared revision by the **Prepared page version** number recorded in [**Before presenting**](#preparation)—the new English page version created for this run. Wait for the version to finish loading, then read the selected version number again and confirm that it matches **Prepared page version**. Immediately before choosing **Publish**, expand **Resource content**, and confirm **Resource page review**, **Approved**, and **Review your options with your agent before choosing coverage.** in **Detailed explanation**. Use the recorded version number because older rehearsal versions can have the same name. Choose **Publish**. **Page** is already selected. Keep **Current language (English)** selected. Clear **Include related items** first, then clear **All references**; the related-items control disappears when **All references** is cleared. Leave **Subpages** unchecked, and select **Start publish**.`,
          `Wait for the publishing job to complete. Return to [**SitecoreAI Search → Preview**](${SEARCH_SOURCE}), refresh, repeat the exact title search, and expand the result. If the prior wording is still visible, allow content distribution and the automatic Search update to finish, then refresh again until the added sentence appears. Confirm that **body** contains the added sentence and that **state**, **product**, and **audience** remain correct. No manual reindex or second content edit is needed.`,
        ],
        expected: [
          "A single approved page publication updates the native Search record automatically, including the changed body and unchanged applicability metadata.",
        ],
        talkTrack: [
          "When that car-and-home guidance changes, the publisher releases the approved page revision once. Experience Edge distributes published content globally, while the configured publication flow keeps Search aligned with the approved wording and classifications. The team manages the page content once across these delivery channels.",
        ],
        controls: [
          "The **OnEnd** publication event calls the configured publication service, which reads published website content from **Live Experience Edge** and synchronizes it through the **Search Push API**. **Include in site search** selects the pages available to Search. This loop follows the resource page’s own guidance and applicability metadata.",
        ],
        links: [
          {
            label: "Publish the prepared resource page",
            href: `${resourcePageContent}`,
          },
          {
            label: "Verify the native Search document",
            href: `${SEARCH_SOURCE}`,
          },
        ],
        transition:
          "The published answer and Search now agree. Next, give a marketer the same control over a complete page.",
      },
      {
        id: "public-authoring",
        title: "Create and publish pages with confidence",
        label:
          "Marketing builds and publishes pages from a library of pre-approved components",
        phase: "Authoring & Content-Operation Flow",
        sourceSlide: 10,
        durationMinutes: 7,
        persona: "Public-site marketer, approver, and publisher",
        scenario:
          "A marketer needs a new coverage page using approved components, with review before customers can see it.",
        objective:
          "Create, preview, and publish pages without an engineering ticket, using approved components and a clear review process.",
        stopWhen:
          "The new coverage-guide-live page shows the authored headings and the shared Promotion on the public website.",
        actions: [
          `In the prepared **Author** browser profile, open [**public Home in Page Builder**](${publicEditor}). Confirm **Public Website**, **English**, and **Default editing host**. Choose **Home → Create a page → Landing page → Select**. In the sitemap’s editable **New page** name, type **coverage-guide-live**, press **Enter**, and wait for **Page created from branch template**.`,
          "Choose **Reload tree** if it appears. Wait for the refreshed sitemap to finish loading. Select **coverage-guide-live**, and wait until **coverage-guide-live** appears as the page heading before opening **Content**. Open **Content → coverage-guide-live → Data → Hero**, and set **Heading** to **Explore coverage with confidence**. Press **Tab**, and wait for **Saved** before opening **Data → Introduction**. Set its **Heading** to **Guidance for your next decision**, press **Tab**, and wait for **Saved**. Enter **Review approved information, compare your options, and speak with an agent about your needs.** in **Body**, click outside **Body**, and wait for **Saved**.",
          "Return to **Editor**, and confirm **coverage-guide-live** appears as the page heading. If necessary, select **coverage-guide-live** in **Sitemap**, and wait for its heading. Then open **Layers**. Expand **headless-public-content-1**, and choose its **Insert into** button immediately after **Article text**. Choose **Promotions → Promotion**, select the existing **Bundle and save** item, and choose **Assign** to reuse it, rather than **Duplicate and assign**. In the right-hand panel, choose **Design → Variant**, and change **Default** to **Compact**. Identify the allowed components offered for this placeholder.",
          "Click **Preview**, then **Preview** in its menu. Confirm the headings and reused Promotion while the page remains unpublished. Return to the editor. The **Hero** and **Introduction** are independent local content; the Promotion references its shared source.",
          "On **coverage-guide-live**, choose **Actions → Submit**, enter **Review coverage guidance page**, and select **Submit**. In **Page items**, check the page, **Hero**, and **Introduction**. For any local item still in **Draft**, open it in **Content**, choose **Actions → Submit**, enter **Review coverage guidance content**, and select **Submit**. Confirm all three are **Awaiting approval**.",
          "In the separate **Approver** browser profile, review **coverage-guide-live** and its **Hero** and **Introduction** content. On **coverage-guide-live**, choose **Actions → Approve**, enter **Approved coverage guidance**, and select **Submit**. Open **Page items**, and confirm the page, **Hero**, and **Introduction** are all **Approved**. If a local item is still **Awaiting approval**, open it, review it, and approve it. This restricted Approver cannot publish.",
          `In the **administrator acting as publisher** profile, open **coverage-guide-live**. Choose **Publish** with **Page**, **Current language (English)**, **All references**, and **Include related items** selected. Leave **Subpages** unchecked, and select **Start publish**. After completion, open the [**published coverage page**](${PUBLIC}/coverage-guide-live), and confirm both headings and the shared Promotion.`,
        ],
        expected: [
          "The new page is previewed and published without code changes, using approved components, independent local content, a reused Promotion, and separate workflow roles.",
        ],
        talkTrack: [
          "The same publishing controls also support a complete page. The marketer starts with an approved structure and permitted components. Local copy remains independently editable, while the shared Promotion is reused. The Author submits, the Approver reviews, and the publisher releases the approved page without a frontend deployment.",
        ],
        controls: [
          "**Landing page** creates local **Hero** and **Introduction** items. Placeholder settings restrict the available components. **Assign** reuses the existing Promotion; **Compact** changes only its presentation.",
          "The configured workflow is **Draft → Awaiting approval → Approved**. Each local content item completes its review, and a separate publishing action releases the approved page.",
        ],
        links: [
          { label: "Create a page under public Home", href: publicEditor },
          {
            label: "New page after publication",
            href: `${PUBLIC}/coverage-guide-live`,
          },
        ],
        transition:
          "The page is live through a familiar review process. That same governed process can also receive content from an upstream tool such as Profound.",
      },
      {
        id: "public-profound",
        title: "A governed path for Profound content",
        label:
          "Marketing can publish content from Profound directly into the CMS / DXP",
        phase: "Authoring & Content-Operation Flow",
        sourceSlide: 10,
        durationMinutes: 2,
        mode: "explain",
        persona: "Public-site marketer",
        scenario:
          "The marketer wants to act on an external content opportunity while keeping the resulting page change within SitecoreAI’s review process.",
        objective:
          "Bring proposed Profound content into the same governed publishing process, with human review before release.",
        stopWhen:
          "The scoped intake, native Draft, human approval, and downstream publication path have been explained.",
        actions: [
          "Trace **Profound output → scoped integration → SitecoreAI Draft → human review and approval → publication → website, Search, and API consumers**.",
          "Use the structured answer template and review workflow already shown to explain the mapping of proposed wording, source, owner, applicability, and dates. Present this as the proposed integration design, using the native review process already demonstrated.",
        ],
        expected: [
          "The audience understands where proposed upstream content enters and how native governance controls its publication.",
        ],
        talkTrack: [
          "That review process can also support content proposed by an upstream tool such as Profound. Liberty Mutual is exploring this option. A scoped integration could map proposed content into the appropriate template as a draft. The normal human review, approval, and publication controls would then apply.",
        ],
        controls: [
          "Profound intake uses a proposed integration design with scoped API permissions, template mapping, Draft creation, and human review.",
        ],
        transition:
          "The native review and publication flow is established. Next, show marketers how engagement signals inform their next improvement.",
      },
      {
        id: "public-analytics",
        title: "See how people engage with your content",
        label: "Quick-answer analytics for marketers",
        phase: "Measurement & Delivery Foundation",
        sourceSlide: 10,
        durationMinutes: 1,
        persona: "Public-site marketer",
        scenario:
          "The marketer needs timely evidence of visits, clicks, and reading depth to decide which guidance to improve.",
        objective:
          "Help marketers choose which guidance to improve using visits, clicks, and reading-depth signals.",
        stopWhen:
          "The site-filtered report shows the prepared page, CTA, and scroll events with their actual timestamps and reporting period.",
        actions: [
          `Open [**Optimization → Analytics → Events**](${ANALYTICS}). Set **Site** to **liberty-mutual-public-site** and **Time** to **1 hour**, matching the consented visitor interactions completed during preparation.`,
          "Inspect **Events over Time** and **Events Table**. Identify the actual **pageView**, **LM_PUBLIC_CTA_CLICK**, and **LM_PUBLIC_SCROLL_25** or other recorded scroll milestones. Match their timestamps to the prepared visitor journey.",
          "Explain one use of these signals: identify whether visitors reach and read the answer and select its next action. Use visits, reading depth, and selected actions to choose where to improve the content.",
        ],
        expected: [
          "A marketer can inspect genuine, consented engagement for the public site without a separate analytics request.",
        ],
        talkTrack: [
          "Once guidance is published, the marketer can see page visits, content clicks, and reading depth in one platform view. Those timely engagement signals help the marketing team identify useful content and opportunities to improve the customer journey.",
        ],
        controls: [
          "The **Site** filter separates this application’s events from the Agent Portal, and **Time → 1 hour** defines the reporting period. Use the events and timestamps actually present.",
          "The prepared journey used **Privacy choices → Allow personalization** for optional measurement. The earlier **Essential only** search is a separate consent example. Liberty Mutual’s Tealium architecture remains part of the integration discussion.",
        ],
        links: [{ label: "Native public-site Events", href: `${ANALYTICS}` }],
        images: [
          {
            file: "customer-demo-public-events.png",
            afterAction: 2,
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
          "Engagement shows how the website’s content is used. Next, give another application access to that same approved answer.",
      },
      {
        id: "public-api",
        title: "Reuse one approved answer in another experience",
        label: "Decoupled delivery with a stable content API",
        phase: "Measurement & Delivery Foundation",
        sourceSlide: 10,
        durationMinutes: 2,
        persona: "Content team supporting another digital experience",
        scenario:
          "Another application needs the same approved guidance without maintaining another copy.",
        objective:
          "Reuse one approved answer through a stable API, reducing duplicate content maintenance across applications.",
        stopWhen:
          "The second experience shows the newly published sentence, its source, stable item ID, and native content version.",
        actions: [
          "Show **Experience Edge content delivery** in [**the shared presentation**](https://sitecore1.sharepoint.com/:p:/s/Ops/cQoDg9wZPRa8Tb3nJmHAOX-TEgUCuSmQQA7MGbe1g6C_LnOG3A). Trace **SitecoreAI authoring → Publish → Experience Edge → API consumers**, then continue with the content-reuse example.",
          "Open [**One published page, two experiences**](/workshops/content-api). Under **Published insurance question**, select **Can I bundle my car and home insurance?**, and select **Load content**.",
          `Find **Review your options with your agent before choosing coverage.** Compare it with the [**public article**](${ARTICLE}). Under **The governance travels with the answer**, identify the source and applicability metadata.`,
          "Under **A stable contract for other applications**, identify **API contract version**, **Native content version**, and **Stable item ID**. The stable ID identifies the same resource page; the content version identifies that page’s published English revision.",
        ],
        expected: [
          "The separate API consumer and public article present the same approved page content without re-entering it.",
        ],
        talkTrack: [
          "Authors manage and approve content in SitecoreAI. Publishing sends that content to Experience Edge, Sitecore’s globally distributed content delivery service. Websites and other applications retrieve it through APIs. That lets Liberty Mutual reuse one approved source across experiences, while publishing content independently of application deployments.",
          "The same car-and-home page serves another application through a stable API. Its approved guidance, source, and applicability travel together. This is the kind of governed content feed LibertyAir could consume.",
        ],
        controls: [
          "The versioned **/api/content/v1/answers/** endpoint reads approved published content from **Live Experience Edge**. The API envelope and second application are implementation components around the native governed source.",
          "The API contract version describes the response format, while **Native content version** identifies the resource page’s published English revision. Draft and Preview content remain in authoring.",
        ],
        links: [
          {
            label: "Open the Experience Edge diagram in the shared deck",
            href: "https://sitecore1.sharepoint.com/:p:/s/Ops/cQoDg9wZPRa8Tb3nJmHAOX-TEgUCuSmQQA7MGbe1g6C_LnOG3A",
          },
          {
            label: "Open the second content experience",
            href: "/workshops/content-api",
          },
          { label: "Compare the public article", href: `${ARTICLE}` },
        ],
        images: [
          {
            file: "customer-demo-content-api.png",
            afterAction: 2,
            title: "Select the same published answer",
            alt: "One published page, two experiences page with the published insurance question selector and Load content button",
            caption:
              "Choose **Can I bundle my car and home insurance?** under **Published insurance question**, then select **Load content**. This page retrieves the actual published API response.",
            annotations: [
              {
                x: 46,
                y: 28,
                width: 39,
                height: 4,
                label: "Choose the published insurance question.",
              },
              {
                x: 85,
                y: 29,
                width: 12,
                height: 3,
                label: "Select **Load content**.",
              },
            ],
          },
        ],
        transition:
          "The same approved content can serve another application. Next, move to the second journey in your guide: a relevant Liberty Mutual experience for independent agents.",
      },
    ],
  },
  {
    id: "portal",
    title: "One Relevant Liberty Experience",
    summary:
      "Help independent agents find priorities relevant to their business. Give marketers control over that experience within a consistent design, and keep shared messages aligned through review, publication, and a clear history.",
    sourceSlide: 11,
    steps: [
      {
        id: "portal-relevance",
        title: "Personalize priorities for each agent",
        label:
          "Agent sees product content, and bundles based on their business, relationship and priorities",
        phase: "Agent Experience",
        sourceSlide: 11,
        durationMinutes: 5,
        persona:
          "Independent agents Avery and Daniel, followed by a portal marketer",
        scenario:
          "Agents with different roles and agency context need relevant priorities, while a recorded marketing opt-out must stop outreach.",
        objective:
          "Match guidance to each agent’s business, and honor a recorded marketing opt-out through a native eligibility decision.",
        stopWhen:
          "The native profile tests explain Avery and Daniel’s priorities, and Cameron’s outreach eligibility has changed from included to excluded, using the same Native profile ID. No outreach email preview remains.",
        actions: [
          "Open the prepared [**Communication preferences**](/workshops/preferences) tab. Show the **Run eligibility check** result prepared before presenting: **1 eligible recipient**, **Cameron Ellis - Allowed**. Both Cameron records share the same agency, producer role, and Texas context; their marketing choice differs. Record **Cameron Ellis - Allowed**’s **Native profile ID**, then select **Opt out Cameron**. Leave this tab open while SitecoreAI processes the updated choice, and continue with the following profile comparisons.",
          `In the prepared **avery.01** session, open the [**live Agent Portal Home**](${PORTAL}/). Confirm **Avery Brooks** and **Cedar Ridge Insurance**. Find **Priorities for your agency**: **Build a stronger small-business practice**, **Support workers’ compensation conversations in Texas**, and **Connect home and auto conversations**. Open **Your profile** to identify her principal role and **Licensed states: Texas, Illinois, and Florida**.`,
          `In the separate prepared **daniel.01** session, open [**Home**](${PORTAL}/). Confirm **Daniel Ortiz** and **Prairie Oak Insurance**, then compare his household-first priorities. Open **Your profile** to identify his producer role and **Licensed states: Illinois and Texas**.`,
          `In the administrator profile, open [**Agent Portal Home in Page Builder**](${portalEditor}), keep **Default editing host**, choose **Layers**, and select **Agency priorities**. In the right-hand component panel, choose **Edit personalization rules**, then confirm the **Liberty Mutual - Agency product priorities** Builder. If it is already open from preparation, continue there. Use **Select profile → Load profile**, and ensure **Profile ID** is selected; if the field shows **Client ID**, change it to **Profile ID**. Enter Avery’s current **Native profile ID** UUID copied during preparation from [**Current profile identities for 01**](/workshops/reset#current-profiles), press **Enter**, and wait for **Testing as: Avery Brooks - 01**. Select **Test**, and confirm a green **agency-growth** match. Enter Daniel’s current ID in the same **Profile ID** field, press **Enter**, and wait for **Testing as: Daniel Ortiz - 01**. Select **Test** again, and confirm a green **producer-priorities** match. Choose **Cancel** after these read-only tests.`,
          `Open the prepared [**Liberty Mutual marketing eligibility → Configuration**](${MARKETING_ELIGIBILITY}). Under **API response**, select **Open variant editor**. Point to **marketingEligible**: the native rule requires an identified profile and **marketingSuppressed === false**. Select **Close editor** without changing the Live rule.`,
          "Return to **Communication preferences**, and use **Check import status** until **SitecoreAI confirmed the imported records** appears. The first card keeps the name **Cameron Ellis - Allowed**, but now shows **marketingSuppressed = true**. Confirm its **Native profile ID** is unchanged. In **Marketing outreach preview**, select **Run eligibility check** again, and show **No eligible recipients** with no email preview. Under **Native decision receipts**, confirm **marketingEligible = false** and **Same profile as this session’s first check** for Cameron. Both comparison profiles are now excluded by the runtime decision. End this loop here; restore the starting choices through [**After the demonstration**](#reset).",
        ],
        expected: [
          "Native profile matches explain Avery and Daniel’s different guidance. A fresh native outreach decision excludes the same Cameron profile after opt-out, and the email preview is withheld.",
        ],
        talkTrack: [
          "The two Cameron records share the same agency, role, and Texas context. Their recorded choice determines outreach eligibility. We’ll record Cameron’s opt-out while we compare Avery’s principal priorities with Daniel’s producer priorities. SitecoreAI then evaluates the updated choice on the same native profile and excludes Cameron from the outreach. Liberty Mutual can keep Ping for sign-in and supply profile context from its existing systems.",
          customerDemoAiContext.portal.talkTrack,
        ],
        controls: [
          "The native guidance rules use imported UDL attributes, including role, specialization, and agency production. The application separately enforces licensed-state eligibility alongside the content personalization.",
          "**Load profile → Profile ID** evaluates actual native profiles. **Current profile identities → Refresh status** provides current IDs after a reset.",
          "**Communication preferences** supplies sample preference-center input and imports the choice into the native **Unified Data Layer**. The **Marketing outreach preview** calls **Liberty Mutual marketing eligibility**, a native runtime personalization that requires an explicit false value for the Boolean **marketingSuppressed**. True and missing values do not qualify.",
          "**Run eligibility check** evaluates the actual native profiles again. The application uses the returned native eligibility response to include or withhold the email preview before downstream campaign delivery.",
        ],
        links: [
          { label: "Live Agent Portal Home", href: `${PORTAL}/` },
          {
            label: "Open Home’s native personalization rules",
            href: `${portalEditor}`,
          },
          {
            label: "Current profile IDs for presenter accounts",
            href: "/workshops/reset#current-profiles",
          },
          {
            label: "Open Communication preferences and outreach preview",
            href: "/workshops/preferences",
          },
          {
            label: "Open native marketing eligibility Configuration",
            href: MARKETING_ELIGIBILITY,
          },
        ],
        images: [
          {
            file: "customer-demo-priorities.png",
            afterAction: 2,
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
            file: "customer-demo-outreach-suppressed.png",
            afterAction: 6,
            title: "Confirm the recorded opt-out stops outreach",
            alt: "Marketing outreach preview shows No eligible recipients and a native decision receipt with marketingEligible false for Cameron Ellis - Allowed using the same native profile ID",
            caption:
              "After the opt-out is confirmed, select **Run eligibility check**. **No eligible recipients** replaces the email preview. Under **Native decision receipts**, **Cameron Ellis - Allowed** has **marketingEligible = false** and **Same profile as this session’s first check**.",
          },
        ],
        transition:
          "The agents receive priorities that fit their business. Next, show how shared design keeps those relevant experiences consistently on brand.",
      },
      {
        id: "portal-design",
        title: "Keep the brand consistent as content grows",
        label: "Agent sees consistent brand and design across all portal pages",
        phase: "Agent Experience",
        sourceSlide: 11,
        durationMinutes: 1,
        persona: "Independent agent, followed by a portal marketer",
        scenario:
          "Agents need a consistent experience, and authors need approved components and clear places in which to use them.",
        objective:
          "Let business users manage content within a consistent portal design and approved component choices.",
        stopWhen:
          "Two representative portal pages share the same design, and the permitted component choices have been shown without changing a page.",
        actions: [
          `In Avery’s session, compare **My workspace** with [**Learning & resources**](${PORTAL}/resources). Identify their common navigation, typography, buttons, cards, and **Coverage and availability** disclosure.`,
          `Open [**Agent Portal Home in Page Builder**](${portalEditor}). Confirm **Agent Portal**, **English**, and **Default editing host**. Open **Layers**, and locate **Agency priorities** and the shared **Disclosure** component.`,
          "In **Layers**, find **headless-agency-priorities**, and choose its **Insert into** button before or after **Agency priorities**. The filtered **Components** picker shows **Business priorities → Agency priorities** for this placeholder. Close the picker without selecting a component or inserting content. Explain that the page design supplies shared structure and placeholder settings limit which components fit each area.",
        ],
        expected: [
          "The visitor experience is visually consistent, and the authoring library exposes governed component choices.",
        ],
        talkTrack: [
          "Shared design keeps these personalized experiences consistently on brand. The portal’s shared structure and placeholder settings give business users approved components and appropriate places for them.",
        ],
        controls: [
          "**Page designs**, **partial designs**, native renderings, and **placeholder settings** govern reusable structure and permitted composition. Content edits remain separate from component code.",
        ],
        links: [
          {
            label: "Agent Portal Home in Page Builder",
            href: `${portalEditor}`,
          },
          { label: "Learning & resources", href: `${PORTAL}/resources` },
        ],
        transition:
          "The design stays consistent while the business changes its emphasis. Next, prepare one priority update in the governed content collection.",
      },
      {
        id: "portal-priority-edit",
        title: "Change business priorities without code",
        label: "Marketing user changes a priority without development work",
        phase: "Liberty Business Experience",
        sourceSlide: 11,
        durationMinutes: 2,
        persona: "Portal marketer acting as Author",
        scenario:
          "The business wants Texas guidance to lead the principal audience’s priorities without requesting a code change.",
        objective:
          "Part 1 of the priority-change loop: save the new order as a Draft, ready for audience preview, approval, and publication in Part 2.",
        stopWhen:
          "Checkpoint: the Texas-first Draft is saved, the original approved version remains intact, and the live experience is unchanged. Continue with audience preview to complete this priority-change loop.",
        actions: [
          `As the **Author**, open [**Agency growth priorities in Page Builder Content**](${priorityContent}). Confirm **Agent Portal**, **English**, and **Data → Agency priorities → Agency growth priorities**.`,
          "Record the current approved version and its order: **Small business growth → Texas workers compensation → Home and auto conversations**. Open the version selector, choose **Create version**, name it **Texas guidance priority**, and click **Create**. Reopen the version selector, explicitly select the new **Texas guidance priority** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm the selected version number before changing **Ordered recommendations**.",
          "Find **Ordered recommendations**. Click **Remove all items** to clear only this draft’s selection, open the picker, and select **Texas workers compensation**, **Small business growth**, and **Home and auto conversations**, in that order. Click the item heading to close the picker, and wait for **Saved**. Record the version number currently shown as **Saved priority version**. Use that same saved version number for submission, the Approver’s review, and publication.",
          "With **Saved priority version** selected, confirm the order **Texas workers compensation → Small business growth → Home and auto conversations** and that the version remains **Draft**. Leave it unpublished. The next step previews both audience experiences before completing this same change’s approval and publication.",
        ],
        expected: [
          "The new Draft references the same approved cards in the new order. Avery’s live page retains the published order until the following preview and publication loop completes.",
        ],
        talkTrack: [
          "Within that governed design, the business user can change the order of approved conversations without an engineering ticket or frontend release. Here, the team prepares a Texas-first priority for Avery in Draft while agents continue to see the current approved experience.",
        ],
        controls: [
          "**Ordered recommendations** is an ordered native item selection. This collection supplies the **agency-growth** experience, while **Producer priorities** supplies a separate experience.",
          "The original approved version is retained. Saving the new **Draft** changes authoring content, with publication still governed by the configured workflow.",
        ],
        links: [
          { label: "Edit Agency growth priorities", href: priorityContent },
        ],
        transition:
          "Continue the same priority change by previewing both audiences. Confirm the intended effect before approving and publishing it.",
      },
      {
        id: "portal-preview",
        title: "Preview the impact, then release the change",
        label: "Marketing user previews the experience for each agent audience",
        phase: "Liberty Business Experience",
        sourceSlide: 11,
        durationMinutes: 4,
        persona: "Portal marketer, approver, and publisher",
        scenario:
          "The team needs to inspect each intended audience experience before releasing the reviewed priority change.",
        objective:
          "Part 2 of the same priority-change loop: preview both experiences, approve and publish the priority change, and verify that it reaches the intended agent without code changes.",
        stopWhen:
          "Both configured experiences have been previewed; Avery’s live order changes after publication, while Daniel’s producer order remains unchanged.",
        actions: [
          `Switch to the prepared **administrator acting as publisher** browser profile, and open [**Agent Portal Home in Page Builder Editor**](${portalEditor}). Use this profile to preview Home’s existing personalized component. Retain **Default editing host**, select **Layers**, and select **Agency priorities**. Open that component’s personalization experience selector.`,
          "Choose **agency-growth**. Click the header **Preview** button, then **Preview** in its menu. In the full preview, confirm Texas guidance appears first for the changed principal collection. Close the preview tab, return to **Editor**, and select **Agency priorities** in **Layers** again.",
          "Choose **producer-priorities** for the same component, and open **Preview** again. Confirm its separate order: household conversations, Illinois workers compensation, and small-business growth. Close that preview tab without changing the producer content.",
          `Switch back to the **Author** browser profile, and open [**Agency growth priorities**](${priorityContent}). Select **Saved priority version**, wait for its fields to load, and recheck **Draft** and the Texas-first order in **Ordered recommendations**. Choose **Actions → Submit**, enter **Prioritize Texas workers compensation guidance**, and click **Submit**. Confirm **Awaiting approval**.`,
          "In the separate **Approver** session, select the same **Saved priority version**, inspect its submitted order, and choose **Actions → Approve**. Enter **Approved agency priority update**, click **Submit**, and confirm **Approved**.",
          "In the **administrator acting as publisher** session, open that collection in **Content**, select the same **Saved priority version**, confirm **Approved** and its Texas-first order, and choose **Publish**, keep **Item** and **Current language (English)** selected, leave **Subitems** unchecked, and click **Start publish**. After completion, reload Avery’s actual live portal and confirm Texas guidance first. Reload Daniel’s separate producer session and confirm his household-first order remains unchanged.",
        ],
        expected: [
          "Native Preview shows the changed principal and unchanged producer collections. Publishing the reviewed collection updates Avery without publishing Home manually or deploying frontend code; Daniel remains unchanged.",
        ],
        talkTrack: [
          "Before publishing that Texas-first priority, the marketer previews both configured experiences. The principal preview shows Avery’s new emphasis, while the producer preview keeps Daniel’s guidance unchanged. Separate approval and publication then make the reviewed change visible to Avery.",
        ],
        controls: [
          "**agency-growth** and **producer-priorities** are the native experience names. Their datasource selections display each configured experience in Preview; **Load profile** tests the real profile, and signed-in agent browsers verify the live result.",
          "Native profile evaluation selects the live experience. The renderer’s **Related Items**, **Siblings**, and **Recursive Related Items** dependencies keep the peer collections and selected cards associated with the published page.",
          "The prepared administrator profile previews Home; the **Author** edits and submits the priority collection, the **Approver** reviews it, and the administrator publishes it. The **Draft → Awaiting approval → Approved** workflow remains unchanged. The experience selector appears when **Agency priorities** is selected.",
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
          "The right agent now receives the reviewed priority change. Next, keep approved wording consistent across both independent websites.",
      },
      {
        id: "portal-shared-content",
        title: "Publish one approved message across both sites",
        label:
          "Approved shared content is managed once and distributed to every website",
        phase: "Shared-Content Foundation",
        sourceSlide: 11,
        durationMinutes: 4,
        persona:
          "Content administrator working through Author, Approver, and publisher roles",
        scenario:
          "One disclosure update must remain consistent across the public website and Agent Portal.",
        objective:
          "Keep the public website and Agent Portal aligned by publishing one approved disclosure from a shared source.",
        stopWhen:
          "The added disclosure sentence is visible on both Home pages after one source publication.",
        actions: [
          `As the **Author**, open [**Product availability notice in Page Builder Content**](${disclosureContent}). Confirm **Public Website**, **English**, and **Data → Disclosures → Product availability notice**. Record the original approved English version and **Disclosure** text for the rollback in the next loop.`,
          "Choose **Create version**, name it **Shared disclosure review**, and select **Create**. Reopen the version selector, explicitly select the new **Shared disclosure review** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm the selected version number before editing **Disclosure**. Append **Review available options with your agent before making a coverage decision.** to **Disclosure**, click outside the field, and wait for **Saved**. Record the version number currently shown as **Saved disclosure version**. Use that same saved version number for submission, the Approver’s review, and publication.",
          "With **Saved disclosure version** selected, recheck **Draft** and the added sentence in **Disclosure**. Choose **Actions → Submit**, enter **Review shared disclosure wording**, and select **Submit**. Confirm **Awaiting approval**. In the separate **Approver** session, select the same **Saved disclosure version**, review its wording, and choose **Actions → Approve**, enter **Approved shared disclosure wording**, and select **Submit**.",
          "In the **administrator acting as publisher** session, open the disclosure in **Content**, select the same **Saved disclosure version**, and confirm **Approved** and the added sentence. Publish with **Item** and **Current language (English)** selected and **Subitems** unchecked. Select **Start publish**.",
          `After the job completes, reload [**public Home**](${PUBLIC}/) and, in Avery’s session, [**Agent Portal Home**](${PORTAL}/). Find the added sentence in **Coverage and availability** on both pages.`,
        ],
        expected: [
          "Both independent sites display the changed sentence from the same governed disclosure, without separate copy edits or frontend releases.",
        ],
        talkTrack: [
          "A single approved disclosure must stay consistent across the public website and Agent Portal. Both sites reference its shared source. The content team changes it once, follows the review process, and publishes the source. Each site keeps its own layout while displaying the same approved message.",
        ],
        controls: [
          "**Product availability notice** belongs to the public site’s **Data → Disclosures** library. Both sites reference that same native item, keeping the approved wording in one place.",
          "The public and Agent Portal Home pages show the shared message delivered through **Experience Edge**.",
        ],
        links: [
          { label: "Edit the shared disclosure", href: `${disclosureContent}` },
          { label: "Public Home", href: `${PUBLIC}/` },
          { label: "Agent Portal Home", href: `${PORTAL}/` },
        ],
        transition:
          "One reviewed update now reaches both sites. Finish by showing who approved it and how the team can restore the original wording with a complete history.",
      },
      {
        id: "portal-audit-rollback",
        title: "Review changes and restore with confidence",
        label: "Every change is approved, auditable, and reversible",
        phase: "Shared-Content Foundation",
        sourceSlide: 11,
        durationMinutes: 4,
        persona: "Content administrator and approver",
        scenario:
          "The team needs to identify who approved a shared change and restore the earlier wording while keeping its history.",
        objective:
          "Show clear approval accountability, then restore the original disclosure through a new reviewed version while preserving history.",
        stopWhen:
          "Both Home pages show the restored original wording, and the original, changed, and restored versions remain in history.",
        actions: [
          `Open [**public Home in Page Builder Editor**](${publicEditor}). In **Sitemap**, open the **Home** row’s **Content tree options**, choose **Page items**, and expand **Product availability notice**.`,
          "Select **Workflow history**. Under **History**, read the **Draft → Awaiting approval** and **Awaiting approval → Approved** transitions, their user and timestamp, and the review **Comment**. Match these to the separate Author and Approver actions just performed.",
          `As the **Author**, return to [**Product availability notice in Content**](${disclosureContent}). Select the original approved English version recorded in the prior loop, and wait for its fields to finish loading. Confirm the selected version number and original **Disclosure** wording before choosing **Create version**. Name it **Original disclosure restored**, and select **Create**. Reopen the version selector, explicitly select the new **Original disclosure restored** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm the selected version number and that **Disclosure** contains the preserved original wording without the added sentence. After the original wording is saved, record the version number currently shown as **Restored disclosure version**. Use that same saved version number for submission, the Approver’s review, and publication.`,
          "With **Restored disclosure version** selected, recheck **Draft** and the original **Disclosure** wording without the temporary sentence. Choose **Actions → Submit**, enter **Restore original disclosure wording**, and select **Submit**. In the separate **Approver** session, select the same **Restored disclosure version**, review the original wording, and choose **Actions → Approve**, enter **Approved restoration of shared disclosure wording**, and select **Submit**.",
          "In the **administrator acting as publisher** session, select the same **Restored disclosure version** in **Content**, confirm **Approved** and the original wording, and publish with **Item** and **Current language (English)** selected and **Subitems** unchecked. While publication completes, use the **Content version selector** to show the original, changed, and restored versions. Then open **Page items → Product availability notice → Workflow history** to inspect the selected restored version’s submission, approval, and review comments.",
          `After completion, reload [**public Home**](${PUBLIC}/) and Avery’s [**Agent Portal Home**](${PORTAL}/). Confirm that the temporary sentence is absent from both pages and retain all versions in history.`,
        ],
        expected: [
          "The native history records the real workflow users, timestamps, and comments. A newer reviewed version restores both sites while preserving the original and changed versions.",
        ],
        talkTrack: [
          "That shared disclosure also gives us a clear audit trail. The workflow records who submitted and approved the change and when those decisions occurred. Restoring the original wording is another reviewed change, preserving the audit trail while returning both sites to the approved message.",
        ],
        controls: [
          "**Editor → Sitemap → Home → Content tree options → Page items → Product availability notice → Workflow history** shows actual transitions and comments.",
          "Creating a new Draft from the original approved version preserves the original and changed versions. The same governed process reviews and publishes the restoration.",
          "Separate restricted Author and Approver identities demonstrate role separation; the administrator acts only as publisher in this sequence.",
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
            afterAction: 2,
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
          "Close on what this enables for Liberty Mutual: trusted guidance, more relevant agent experiences, and business-managed changes with clear accountability.",
      },
    ],
  },
];
