import type { DemoChapter } from "./types";

const PUBLIC = "https://liberty-mutual-public-site.vercel.app";
const PORTAL = "https://liberty-mutual-agent-portal.vercel.app";
const ORG = "org_XqL3u1MSNVuubOTb";
const TENANT = "97eea84c-ac47-4d91-7e4f-08defdaaa7df";
const TENANT_NAME = "scaipocusem400b-sitecoreai950c-demo4418";
const CONTEXT = `organization=${ORG}&tenantId=${TENANT}`;
const SEARCH_SOURCE = `https://app.sitecorecloud.io/search/f527245d-98c7-4978-8802-237d7717ca43/preview?${CONTEXT}`;
const ANALYTICS = `https://app.sitecorecloud.io/optimization/dashboards/events?${CONTEXT}`;
const AUDIENCE = `https://app.sitecorecloud.io/optimization/audience/fc7ce3e0-c300-4f2f-9b21-a22058065db8?${CONTEXT}`;
const ARTICLE = `${PUBLIC}/insurance-resources/bundle-car-and-home`;
const ANSWER_ID = "70144ef3-4be0-597a-9b22-81e8ee1cc9f6";
const PUBLIC_HOME_ID = "6d600332-3e21-4c5f-83ec-aae04f83450f";
const ARTICLE_ID = "ae109fc0-b508-5840-97eb-0b2c02ae1a9b";
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
        durationMinutes: 2,
        objective:
          "A visitor finds a relevant approved answer using conversational language and receives an agent contact option when the subject is unsupported.",
        stopWhen:
          "The supported answer and its source have been shown, and the unsupported question ends with No results found and Contact an agent.",
        actions: [
          `Open the [**public Home page**](${PUBLIC}/). Choose **Privacy choices → Essential only**, then select **Search** in the header. Search remains available when optional collection is declined.`,
          "In **Search**, enter **Can I combine home and car coverage?**, and select **Search**. Wait for **Searching…** to finish, then open **Can I bundle my car and home insurance?**.",
          "Read the answer, expand **Coverage and policy details**, and select the Liberty Mutual source link under **More information**. Confirm the linked source, then return to the article and close the source tab.",
          `Open [**public Search**](${PUBLIC}/search), enter **Does car insurance cover cyberextortion?**, and select **Search**. Show **No results found** and **Contact an agent**. End this loop with that contact option; leave the link unopened.`,
        ],
        expected: [
          "The conversational question retrieves relevant Liberty Mutual guidance with a source. The unsupported subject offers an agent-assisted next step instead of unrelated answers.",
        ],
        talkTrack: [
          "A customer can ask a question in their own words and reach Liberty Mutual’s approved guidance and source. When the content does not address the subject, the experience offers help from an agent. That is the complete search outcome.",
        ],
        controls: [
          "**SitecoreAI Search** retrieves and ranks the published content. The application’s authored-evidence check withholds unsupported question results; it is separate from an ML confidence score.",
          "**Essential only** preserves necessary website and Search behavior. The public answer shows its source and coverage details; governance metadata is inspected in the next loop.",
        ],
        links: [
          { label: "Public Home", href: `${PUBLIC}/` },
          { label: "Public Search", href: `${PUBLIC}/search` },
          { label: "Car and home article", href: ARTICLE },
        ],
        transition:
          "The search loop ends at the agent contact option. Next, open the saved answer in Page Builder to show the structure behind discovery.",
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
          "Show that the approved answer has a native content model, managed classifications, and structured page metadata for discovery.",
        stopWhen:
          "The answer template, managed applicability values, canonical URL, and FAQPage metadata have been shown without changing content.",
        actions: [
          `Open [**Bundle car and home in Page Builder Content**](${answerContent}). Confirm **Public Website**, **English**, and **Data → Approved answers → Bundle car and home**. Inspect **Question**, **Plain-language answer**, **Formal source wording**, **Detailed explanation**, **Authoritative source**, **Content owner**, and the dates. Under **Quick Info**, identify the **PublicApprovedAnswer** template.`,
          `Open [**the article in Page Builder Editor**](${articleEditor}), retain **Default editing host**, and choose **Apps → Resource metadata**. Under **Content to classify**, select **Approved answer: Can I bundle my car and home insurance?**. Show **State applicability: All states**, **Product: Auto and home**, and **Audience: All consumers**. Leave the approved item unchanged.`,
          `On the [**public article**](${ARTICLE}), use **View page source → Find** to locate **application/ld+json**. Identify **FAQPage**, **Question**, and **acceptedAnswer**, then find the **canonical** link. Return to the rendered article.`,
        ],
        expected: [
          "The same governed answer supplies its native fields, managed taxonomy, canonical metadata, and structured answer data.",
        ],
        talkTrack: [
          "The answer is structured content with a source, owner, applicability, and review dates. Authors use managed choices for consistent classifications. Canonical metadata and structured answer data make that meaning available to search and AI consumers.",
        ],
        controls: [
          "**Page Builder → Content → Quick Info** identifies the native template. **Resource metadata** classifies the referenced **Approved answer** using lists maintained beneath **Data → Taxonomy**.",
          "The public rendering emits **FAQPage** metadata and a canonical URL. External discovery also depends on crawl permissions and each engine’s policies; this replica is excluded from external crawling.",
        ],
        links: [
          { label: "Approved answer fields", href: `${answerContent}` },
          { label: "Article and Resource metadata", href: `${articleEditor}` },
          { label: "Public article", href: `${ARTICLE}` },
        ],
        transition:
          "The answer has an identifiable structure. Now publish its prepared revision and verify that Search receives the same change.",
      },
      {
        id: "public-indexing",
        title: "Show automatic Search indexing",
        label:
          "Published content is automatically indexed by enterprise search platform",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 4,
        objective:
          "Publish one approved answer revision and verify that the native Search document receives the new wording automatically.",
        stopWhen:
          "The native Search document contains the newly published sentence, with its state, product, and audience values preserved.",
        actions: [
          `Open [**Liberty Mutual Approved Answers → Preview**](${SEARCH_SOURCE}). Enter **Can I bundle my car and home insurance?** in **Search by term**, open the matching row with **Toggle document details**, and confirm that the original wording is visible in Search.`,
          `In the prepared **administrator acting as publisher** session, open [**Bundle car and home**](${answerContent}). Select the prepared revision named **Shared answer review**, confirm **Approved**, and find **Review your options with your agent before choosing coverage.** in **Detailed explanation**. Choose **Publish** with **Item** and **Current language (English)** selected and **Subitems** unchecked, then select **Start publish**.`,
          `Wait for the publishing job to complete. Return to [**Liberty Mutual Approved Answers → Preview**](${SEARCH_SOURCE}), refresh, repeat the exact title search, and expand the result. Confirm that **body** contains the added sentence and that **state**, **product**, and **audience** remain correct. No manual reindex or second content edit is needed.`,
        ],
        expected: [
          "A single approved source publication updates the native Search record automatically, including the changed body and unchanged applicability metadata.",
        ],
        talkTrack: [
          "The publisher releases the approved answer once. The configured publication event updates Search with the same wording and classifications. The marketer does not retype the answer or request a manual reindex.",
        ],
        controls: [
          "The **OnEnd** publication event calls the configured publication service, which reconciles approved Live content through the **Search Push API**. The **Approved answers** library is the indexed content source; an ordinary Landing page does not become an approved-answer Search document automatically.",
          "Publication and indexing finish asynchronously. If the new row is still pending, keep this outcome pending and return to this same loop after the next demonstration. A completed rehearsal receipt may explain the configured path, but it must not be presented as completion of the current publication.",
        ],
        links: [
          {
            label: "Publish the prepared approved answer",
            href: `${answerContent}`,
          },
          {
            label: "Verify the native Search document",
            href: `${SEARCH_SOURCE}`,
          },
        ],
        transition:
          "Once the updated Search record is visible, move to creating a new page from the governed component library.",
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
          "A marketer creates a page from approved components, previews it, and publishes it through separate Author, Approver, and publisher actions.",
        stopWhen:
          "The new coverage-guide-live page shows the authored headings and the shared Promotion on the public website.",
        actions: [
          `In the prepared **Author** browser profile, open [**public Home in Page Builder**](${publicEditor}). Confirm **Public Website**, **English**, and **Default editing host**. Select **Home → Create a page**, choose **Landing page**, name it **coverage-guide-live**, and select **Create**.`,
          "Select **Content → coverage-guide-live → Data → Hero**, and set **Heading** to **Explore coverage with confidence**. Open **Data → Introduction**, set **Heading** to **Guidance for your next decision**, and enter **Review approved information, compare your options, and speak with an agent about your needs.** in **Body**. Click outside each field, and wait for **Saved**.",
          "Return to **Editor**. Open the main content area’s insertion control, choose **Promotion**, and select the existing **Bundle and save** item. Choose **Assign**, rather than **Duplicate and assign**, and select **Compact**. Identify the allowed components offered for this placeholder.",
          "Click **Preview**, then **Preview** in its menu. Confirm the headings and reused Promotion while the page remains unpublished. Return to the editor. The **Hero** and **Introduction** are independent local content; the Promotion references its shared source.",
          "On **coverage-guide-live**, choose **Actions → Submit**, enter **Review coverage guidance page**, and select **Submit**. In **Page items**, check the page, **Hero**, and **Introduction**. For any local item still in **Draft**, open it in **Content**, choose **Actions → Submit**, enter **Review coverage guidance content**, and select **Submit**. Confirm all three are **Awaiting approval**.",
          "In the separate **Approver** browser profile, review **coverage-guide-live**, **Hero**, and **Introduction**. For each submitted item, choose **Actions → Approve**, enter **Approved coverage guidance**, and select **Submit**. Confirm **Approved**. This restricted Approver cannot publish.",
          `In the **administrator acting as publisher** profile, open **coverage-guide-live**. Choose **Publish** with **Page**, **Current language (English)**, **All references**, and **Include related items** selected. Leave **Subpages** unchecked, and select **Start publish**. After completion, open the [**published coverage page**](${PUBLIC}/coverage-guide-live), and confirm both headings and the shared Promotion.`,
        ],
        expected: [
          "The new page is previewed and published without code changes, using approved components, independent local content, a reused Promotion, and separate workflow roles.",
        ],
        talkTrack: [
          "The marketer starts with an approved structure and permitted components. Local copy remains independently editable, while the shared Promotion is reused. The Author submits, the Approver reviews, and the publisher releases the approved page without a frontend deployment.",
        ],
        controls: [
          "**Landing page** creates local **Hero** and **Introduction** items. Placeholder settings restrict the available components. **Assign** reuses the existing Promotion; **Compact** changes only its presentation.",
          "The configured workflow is **Draft → Awaiting approval → Approved**. Approval does not automatically publish, and each local content item must complete its review.",
        ],
        links: [
          { label: "Create a page under public Home", href: publicEditor },
          {
            label: "New page after publication",
            href: `${PUBLIC}/coverage-guide-live`,
          },
        ],
        transition:
          "The created page is now live. Next, explain where Profound output could enter that same governed authoring process.",
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
          "Explain how Profound output could enter a governed SitecoreAI draft and follow normal human review before publication.",
        stopWhen:
          "The scoped intake, native Draft, human approval, and downstream publication path have been explained.",
        actions: [
          "Trace **Profound output → scoped integration → SitecoreAI Draft → human review and approval → publication → website, Search, and API consumers**.",
          "Use the structured answer template and review workflow already shown to explain the mapping of proposed wording, source, owner, applicability, and dates. Identify this as an integration explanation; a live Profound connection is not configured.",
        ],
        expected: [
          "The audience understands where proposed upstream content enters and how native governance controls its publication.",
        ],
        talkTrack: [
          "Profound publishing is an option Liberty Mutual is exploring. A scoped integration could map proposed content into the appropriate template as a draft. The normal human review, approval, and publication controls would then apply.",
        ],
        controls: [
          "The integration uses scoped API permissions and the selected template’s fields. This explanation does not represent a packaged Profound connector or a configured live Profound connection.",
        ],
        transition:
          "Now use the marketer’s native analytics view to inspect genuine content engagement.",
      },
      {
        id: "public-analytics",
        title: "Read content-performance signals",
        label: "Quick-answer analytics for marketers",
        phase: "Measurement & Delivery Foundation",
        sourceSlide: 10,
        durationMinutes: 2,
        objective:
          "A marketer reads genuine public-site engagement signals directly in the native Events report.",
        stopWhen:
          "The site-filtered report shows the prepared page, CTA, and scroll events with their actual timestamps and reporting period.",
        actions: [
          `Open [**Optimization → Analytics → Events**](${ANALYTICS}). Set **Site** to **liberty-mutual-public-site** and **Time** to **1 hour**, matching the consented visitor interactions completed during preparation.`,
          "Inspect **Events over Time** and **Events Table**. Identify the actual **pageView**, **LM_PUBLIC_CTA_CLICK**, and **LM_PUBLIC_SCROLL_25** or other recorded scroll milestones. Match their timestamps to the prepared visitor journey.",
          "Explain one use of these signals: identify whether visitors reach and read the answer and select its next action. These engagement events do not establish a completed quote or policy sale.",
        ],
        expected: [
          "A marketer can inspect genuine, consented engagement for the public site without a separate analytics request.",
        ],
        talkTrack: [
          "The marketer can see page visits, content clicks, and reading depth in one platform view. These are timely engagement signals for improving content; they do not measure completed insurance sales.",
        ],
        controls: [
          "The **Site** filter separates this application’s events from the Agent Portal, and **Time → 1 hour** defines the reporting period. Use the events and timestamps actually present.",
          "The prepared journey used **Privacy choices → Allow personalization** for optional measurement. The earlier **Essential only** search is a separate consent example. Liberty Mutual’s Tealium architecture remains part of the integration discussion.",
        ],
        links: [{ label: "Native public-site Events", href: `${ANALYTICS}` }],
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
          "The reporting outcome is complete. Next, retrieve the published answer in a separate application.",
      },
      {
        id: "public-api",
        title: "Retrieve the answer in another experience",
        label: "Decoupled delivery with a stable content API",
        phase: "Measurement & Delivery Foundation",
        sourceSlide: 10,
        durationMinutes: 2,
        objective:
          "A separate application retrieves and presents the same published answer through a stable content API.",
        stopWhen:
          "The second experience shows the newly published sentence, its source, stable item ID, and native content version.",
        actions: [
          "Open [**One approved answer, two experiences**](/workshops/content-api). Under **Published insurance question**, select **Can I bundle my car and home insurance?**, and select **Load answer**.",
          `Find **Review your options with your agent before choosing coverage.** Compare it with the [**public article**](${ARTICLE}). Under **The governance travels with the answer**, identify the source and applicability metadata.`,
          "Under **A stable contract for other applications**, identify **API contract version**, **Native content version**, and **Stable item ID**. The stable ID identifies the same governed answer; the content version identifies its published revision.",
        ],
        expected: [
          "The separate rendered API consumer and public article present the same approved source change without re-entering content.",
        ],
        talkTrack: [
          "This application retrieves the same published answer through a stable API and presents it in its own layout. The wording and governance information travel together. This is the kind of approved content feed LibertyAir could consume.",
        ],
        controls: [
          "The versioned **/api/content/v1/answers/** endpoint reads approved published content from **Live Experience Edge**. The API envelope and second application are implementation components around the native governed source.",
          "The API contract version describes the response format, while **Native content version** identifies the editorial revision. Draft and Preview content remain in authoring.",
        ],
        links: [
          {
            label: "Open the second content experience",
            href: "/workshops/content-api",
          },
          { label: "Compare the public article", href: `${ARTICLE}` },
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
          "The same governed content foundation can support known independent agents with different roles, agencies, and business priorities.",
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
        durationMinutes: 3,
        objective:
          "Two known agents receive priorities appropriate to their role, licensed states, and agency production.",
        stopWhen:
          "Avery and Daniel’s different Home priorities match their native profile tests, and the saved marketing-eligibility condition has been shown.",
        actions: [
          `In the prepared **avery.01** session, open the [**live Agent Portal Home**](${PORTAL}/). Confirm **Avery Brooks** and **Cedar Ridge Insurance**. Find **Priorities for your agency**: **Build a stronger small-business practice**, **Support workers’ compensation conversations in Texas**, and **Connect home and auto conversations**. Open **Your profile** to identify her principal role and **Licensed states: Texas, Illinois, and Florida**.`,
          `In the separate prepared **daniel.01** session, open [**Home**](${PORTAL}/). Confirm **Daniel Ortiz** and **Prairie Oak Insurance**, then compare his household-first priorities. Open **Your profile** to identify his producer role and **Licensed states: Illinois and Texas**.`,
          "Open the prepared native **Liberty Mutual - Agency product priorities** rule Builder. Use **Select profile → Load profile**, change **Client ID** to **Profile ID**, and load Avery’s current **Native profile ID** from [**Current profile identities for 01**](/workshops/reset#current-profiles). Confirm **Testing as: Avery Brooks - 01** and a green **agency-growth** match. Load Daniel’s current ID the same way; confirm **Testing as: Daniel Ortiz - 01** and a green **producer-priorities** match. Choose **Cancel** after these read-only tests.",
          `Open the prepared [**Agents eligible for marketing**](${AUDIENCE}) Audience. Show its **Live** rule, **Marketing Suppressed → is false**. This requires an explicit false value; true and missing values do not qualify. Leave the rule unchanged, without pausing it or starting another import.`,
        ],
        expected: [
          "The two native profile matches explain the different signed-in priority experiences, while the saved Audience rule respects a known communication choice.",
        ],
        talkTrack: [
          "The known agent’s role, licenses, specialization, and agency production inform relevant priorities. Avery and Daniel match different native experiences. A stored communication choice can also govern marketing eligibility. Liberty Mutual can keep Ping for sign-in and supply this context from its existing systems.",
        ],
        controls: [
          "The native rule uses imported UDL attributes. The application separately enforces licensed-state eligibility; a content decision does not grant access.",
          "**Load profile → Profile ID** evaluates actual native profiles. **Current profile identities → Refresh status** provides current IDs after a reset. The optional Boolean **marketingSuppressed** must be explicitly false for the saved marketing Audience.",
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
          { label: "Marketing eligibility Audience", href: `${AUDIENCE}` },
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
          "The relevance outcome is visible. Now show the shared design and authoring guardrails that keep the portal consistent.",
      },
      {
        id: "portal-design",
        title: "Show consistent, governed design",
        label: "Agent sees consistent brand and design across all portal pages",
        phase: "Agent Experience",
        sourceSlide: 11,
        durationMinutes: 2,
        objective:
          "Show consistent portal branding and the native composition rules that restrict authors to appropriate components.",
        stopWhen:
          "Two representative portal pages share the same design, and the permitted component choices have been shown without changing a page.",
        actions: [
          `In Avery’s session, compare **My workspace** with [**Learning & resources**](${PORTAL}/resources). Identify their common navigation, typography, buttons, cards, and **Coverage and availability** disclosure.`,
          `Open [**Agent Portal Home in Page Builder**](${portalEditor}). Confirm **Agent Portal**, **English**, and **Default editing host**. Open **Layers**, and locate **Agency priorities** and the shared **Disclosure** component.`,
          "Select the area containing **Agency priorities**, and open **Components** to show the permitted insertion choices. Leave the page unchanged. Explain that the page design supplies shared structure and placeholder settings limit which components fit each area.",
        ],
        expected: [
          "The visitor experience is visually consistent, and the authoring library exposes governed component choices.",
        ],
        talkTrack: [
          "The portal keeps a consistent design while business users manage its content. Shared structure and placeholder settings give authors approved building blocks and appropriate places for them.",
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
          "Keep the governed structure and change one business priority in its native content collection.",
      },
      {
        id: "portal-priority-edit",
        title: "Change a business priority",
        label: "Marketing user changes a priority without development work",
        phase: "Liberty Business Experience",
        sourceSlide: 11,
        durationMinutes: 4,
        objective:
          "Part 1 of the priority-change loop: save the new order as a Draft, ready for audience preview, approval, and publication in Part 2.",
        stopWhen:
          "Checkpoint: the Texas-first Draft is saved, the original approved version remains intact, and the live experience is unchanged. Continue with audience preview to complete this priority-change loop.",
        actions: [
          `As the **Author**, open [**Agency growth priorities in Page Builder Content**](${priorityContent}). Confirm **Agent Portal**, **English**, and **Data → Agency priorities → Agency growth priorities**.`,
          "Record the current approved version and its order: **Small business growth → Texas workers compensation → Home and auto conversations**. Open the version selector, choose **Create version**, name it **Texas guidance priority**, and click **Create**.",
          "Find **Ordered recommendations**. Click **Remove all items** to clear only this draft’s selection, open the picker, and select **Texas workers compensation**, **Small business growth**, and **Home and auto conversations**, in that order. Click the item heading to close the picker, and wait for **Saved**.",
          "Confirm the selected cards are in the new order and that the version remains **Draft**. Leave it unpublished. The next step previews both audience experiences before completing this same change’s approval and publication.",
        ],
        expected: [
          "The new Draft references the same approved cards in the new order. Avery’s live page retains the published order until the following preview and publication loop completes.",
        ],
        talkTrack: [
          "The business user changes the ordered selection of approved conversations without an engineering ticket or frontend release. This step ends with a saved draft; the next step previews and releases that same change.",
        ],
        controls: [
          "**Ordered recommendations** is an ordered native item selection. This collection supplies the **agency-growth** experience, while **Producer priorities** supplies a separate experience.",
          "The original approved version is retained. Saving the new **Draft** changes authoring content, with publication still governed by the configured workflow.",
        ],
        links: [
          { label: "Edit Agency growth priorities", href: priorityContent },
        ],
        transition:
          "Continue this priority-change loop with audience preview. Inspect the changed principal and unchanged producer experiences before approval and publication.",
      },
      {
        id: "portal-preview",
        title: "Preview audiences, then publish",
        label: "Marketing user previews the experience for each agent audience",
        phase: "Liberty Business Experience",
        sourceSlide: 11,
        durationMinutes: 2,
        objective:
          "Part 2 of the same priority-change loop: preview both experiences, approve and publish the priority change, and verify that it reaches the intended agent without code changes.",
        stopWhen:
          "Both configured experiences have been previewed; Avery’s live order changes after publication, while Daniel’s producer order remains unchanged.",
        actions: [
          `Open [**Agent Portal Home in Page Builder Editor**](${portalEditor}), retain **Default editing host**, select **Layers**, and select **Agency priorities**. Open that component’s personalization experience selector.`,
          "Choose **agency-growth**. Click the header **Preview** button, then **Preview** in its menu. In the full preview, confirm Texas guidance appears first for the changed principal collection. Close the preview tab when finished.",
          "Choose **producer-priorities** for the same component, and open **Preview** again. Confirm its separate order: household conversations, Illinois workers compensation, and small-business growth. Close that preview tab without changing the producer content.",
          `Return to [**Agency growth priorities**](${priorityContent}). Select the draft just edited, choose **Actions → Submit**, enter **Prioritize Texas workers compensation guidance**, and click **Submit**. Confirm **Awaiting approval**.`,
          "In the separate **Approver** session, open that submitted collection version, inspect its order, and choose **Actions → Approve**. Enter **Approved agency priority update**, click **Submit**, and confirm **Approved**.",
          "In the **administrator acting as publisher** session, open that collection in **Content**, choose **Publish**, keep **Item** and **Current language (English)** selected, leave **Subitems** unchecked, and click **Start publish**. After completion, reload Avery’s actual live portal and confirm Texas guidance first. Reload Daniel’s separate producer session and confirm his household-first order remains unchanged.",
        ],
        expected: [
          "Native Preview shows the changed principal and unchanged producer collections. Publishing the reviewed collection updates Avery without publishing Home manually or deploying frontend code; Daniel remains unchanged.",
        ],
        talkTrack: [
          "The marketer previews both configured experiences before release. The principal receives the new emphasis, while the producer keeps the appropriate producer guidance. Separate approval and publication then make the intended change visible to the actual agent.",
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
          "Publish one approved disclosure change and observe it on the public and Agent Portal Home pages.",
        stopWhen:
          "The added disclosure sentence is visible on both Home pages after one source publication.",
        actions: [
          `As the **Author**, open [**Product availability notice in Page Builder Content**](${disclosureContent}). Confirm **Public Website**, **English**, and **Data → Disclosures → Product availability notice**. Record the original approved English version and **Disclosure** text for the rollback in the next loop.`,
          "Choose **Create version**, name it **Shared disclosure review**, and select **Create**. Append **Review available options with your agent before making a coverage decision.** to **Disclosure**, click outside the field, and wait for **Saved**.",
          "Choose **Actions → Submit**, enter **Review shared disclosure wording**, and select **Submit**. Confirm **Awaiting approval**. In the separate **Approver** session, review the version, choose **Actions → Approve**, enter **Approved shared disclosure wording**, and select **Submit**.",
          "In the **administrator acting as publisher** session, publish the approved disclosure from **Content** with **Item** and **Current language (English)** selected and **Subitems** unchecked. Select **Start publish**.",
          `After the job completes, reload [**public Home**](${PUBLIC}/) and, in Avery’s session, [**Agent Portal Home**](${PORTAL}/). Find the added sentence in **Coverage and availability** on both pages.`,
        ],
        expected: [
          "Both independent sites display the changed sentence from the same governed disclosure, without separate copy edits or frontend releases.",
        ],
        talkTrack: [
          "Both sites reference one governed disclosure. The content team changes it once, follows the review process, and publishes the source. Each site keeps its own layout while displaying the same approved message.",
        ],
        controls: [
          "**Product availability notice** belongs to the public site’s **Data → Disclosures** library. The Portal references that native item; it does not maintain its own copy of the wording.",
          "The public and Agent Portal Home pages provide the complete cross-site verification for this loop.",
          "Publication delivers the approved shared item through **Experience Edge**. If the job or delivery is pending, show its actual status and return to the live pages once the new wording is available.",
        ],
        links: [
          { label: "Edit the shared disclosure", href: `${disclosureContent}` },
          { label: "Public Home", href: `${PUBLIC}/` },
          { label: "Agent Portal Home", href: `${PORTAL}/` },
        ],
        transition:
          "The two Home pages show the shared update. Use that same change to inspect accountability and demonstrate a controlled reversal.",
      },
      {
        id: "portal-audit-rollback",
        title: "Show history and reverse the change",
        label: "Every change is approved, auditable, and reversible",
        phase: "Shared-Content Foundation",
        sourceSlide: 11,
        durationMinutes: 4,
        objective:
          "Inspect the actual approval history and restore the original disclosure through a new approved version.",
        stopWhen:
          "Both Home pages show the restored original wording, and the original, changed, and restored versions remain in history.",
        actions: [
          `Open [**public Home in Page Builder Editor**](${publicEditor}). In **Sitemap**, open the **Home** row’s **Content tree options**, choose **Page items**, and expand **Product availability notice**.`,
          "Select **Workflow history**. Under **History**, read the **Draft → Awaiting approval** and **Awaiting approval → Approved** transitions, their user and timestamp, and the review **Comment**. Match these to the separate Author and Approver actions just performed.",
          `As the **Author**, return to [**Product availability notice in Content**](${disclosureContent}). Select the original approved English version recorded in the prior loop, then choose **Create version**. Name it **Original disclosure restored**, select **Create**, and confirm that **Disclosure** contains the preserved original wording without the added sentence.`,
          "Choose **Actions → Submit**, enter **Restore original disclosure wording**, and select **Submit**. In the separate **Approver** session, review the restored wording, choose **Actions → Approve**, enter **Approved restoration of shared disclosure wording**, and select **Submit**.",
          "In the **administrator acting as publisher** session, publish the approved disclosure from **Content** with **Item** and **Current language (English)** selected and **Subitems** unchecked. While publication completes, show the original, changed, and restored versions in **Page items → Product availability notice → Workflow history**.",
          `After completion, reload [**public Home**](${PUBLIC}/) and Avery’s [**Agent Portal Home**](${PORTAL}/). Confirm that the temporary sentence is absent from both pages and retain all versions in history.`,
        ],
        expected: [
          "The native history records the real workflow users, timestamps, and comments. A newer reviewed version restores both sites while preserving the original and changed versions.",
        ],
        talkTrack: [
          "The workflow records who submitted and approved the change and when those decisions occurred. Restoring the original wording is another reviewed change, preserving the audit trail while returning both sites to the approved message.",
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
