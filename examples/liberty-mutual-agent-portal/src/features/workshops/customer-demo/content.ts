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
const SCRUNCH_CONTEXT =
  "organization=org_vDtrEzJHxeuuB9cD&tenantName=sitecoresaa7acd-agverticals97fd-agvertsc3b5";
const SCRUNCH_REVIEW = `https://app.sitecorecloud.io/channels/collection/45177ac3175042dc9bc748d76ba0858a/sites/d4c417d9-0acf-44f9-aec8-c94730b872bb/aeo-opportunities/readability/review?url=https%3A%2F%2Fprospera-bank.vercel.app%2F&${SCRUNCH_CONTEXT}`;
const SCRUNCH_EDITOR = `https://pages.sitecorecloud.io/editor?${SCRUNCH_CONTEXT}&sc_site=prospera&sc_lang=en&sc_itemid=69fc0a48-3e75-426e-9b2b-296d7a3bf8a4&sc_aeo=1&sc_aeo_item=ca10c042-247a-4836-9d07-92a9e2224a7f&sc_aeo_field=Cards+%C2%B7+Description`;

const RESOURCE_PAGE_ID = "ae109fc0-b508-5840-97eb-0b2c02ae1a9b";
const PUBLIC_HOME_ID = "6d600332-3e21-4c5f-83ec-aae04f83450f";
const PORTAL_HOME_ID = "ae9e45ca-f127-4abe-9ca7-2ff109981998";
const AUDIENCE_PREVIEW_ID = "cfe0e86f-dd93-4b8e-84cd-a2a46e8c1947";
const BRAND_KITS = `https://app.sitecorecloud.io/design/brandkits?organization=${ORG}&tenantName=${TENANT_NAME}`;
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
const audiencePreviewEditor = pageBuilder("portal", AUDIENCE_PREVIEW_ID);
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
        inputs: [
          {
            action: 2,
            label: "Supported search question",
            value: "Can I combine home and car coverage?",
          },
          {
            action: 3,
            label: "Unsupported search question",
            value: "Does car insurance cover cyberextortion?",
          },
        ],
        presenterActions: [
          [
            `Open [**public Home**](${PUBLIC}/).`,
            "Choose **Privacy choices → Essential only**, then **Search** in the header.",
          ],
          [
            "Paste **Supported search question** below into **Search**, then select **Search**.",
            "Wait until **Searching…** finishes.",
            "Show **How to bundle your insurance policies** and **3 tips for bundling your insurance policies**.",
            "Highlight **Can I bundle my car and home insurance?** and its answer excerpt. Keep all results unopened.",
          ],
          [
            "Replace **keyword(s)** with **Unsupported search question** below, then select **Search**.",
            "Show **No results found** and **Contact an agent**. Leave the contact link unopened.",
          ],
        ],
        presenterResult:
          "The supported question returns relevant guidance; the unsupported question shows **No results found** and **Contact an agent**.",
        actions: [
          `Open the [**public Home page**](${PUBLIC}/). Choose **Privacy choices → Essential only**, then select **Search** in the header. Search remains available when optional collection is declined.`,
          "In **Search**, enter **Can I combine home and car coverage?**, and select **Search**. Wait for **Searching…** to finish. Briefly point out **How to bundle your insurance policies** and **3 tips for bundling your insurance policies**, then highlight the **Can I bundle my car and home insurance?** result and its answer excerpt on the results page. Keep every result unopened.",
          "In **keyword(s)**, replace the query with **Does car insurance cover cyberextortion?**, and select **Search**. Show **No results found** and **Contact an agent**. End this loop with that contact option; leave the link unopened.",
        ],
        expected: [
          "The conversational question returns relevant published guidance, including **How to bundle your insurance policies**, **3 tips for bundling your insurance policies**, and **Can I bundle my car and home insurance?**. The approved answer excerpt is visible in the results. The unsupported subject offers an agent-assisted next step.",
        ],
        talkTrack: [
          "One question brings back relevant published guidance, practical articles, and the approved answer. The visitor can compare useful guidance in the results without having to phrase the question exactly as Liberty Mutual does. When published guidance does not address the subject, Contact an agent provides the next step.",
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
        images: [
          {
            file: "demo-public-search-panel.png",
            title: "Search opens below the header",
            alt: "Select Search in the header, enter the customer’s question in the panel, and select the teal Search button.",
            caption:
              "**Select** **Search** in the header, enter the customer’s question in the panel, and select the teal **Search** button.",
            afterAction: 1,
            crop: {
              x: 360,
              y: 12,
              width: 1200,
              height: 270,
              sourceWidth: 1920,
              sourceHeight: 900,
            },
            annotations: [
              {
                x: 80.0,
                y: 13.7,
                width: 7.5,
                height: 14.81,
                label: "Open the **Search** panel",
              },
              {
                x: 4.58,
                y: 66.3,
                width: 78.67,
                height: 19.26,
                label: "Enter the customer’s question",
              },
              {
                x: 84.17,
                y: 66.3,
                width: 11.25,
                height: 19.26,
                label: "Run the search",
              },
            ],
          },
          {
            file: "demo-public-search-results.png",
            title: "Relevant results and the answer excerpt",
            alt: "Find Can I bundle my car and home insurance? and read its approved answer excerpt directly in the results. Keep the results unopened.",
            caption:
              "Find **Can I bundle my car and home insurance?** and read its approved answer excerpt directly in the results. Keep the results unopened.",
            afterAction: 2,
            crop: {
              x: 44,
              y: 151,
              width: 1190,
              height: 535,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
            annotations: [
              {
                x: 1.68,
                y: 44.3,
                width: 96.64,
                height: 10.6,
                label: "Related bundling guidance",
              },
              {
                x: 1.68,
                y: 59.6,
                width: 96.64,
                height: 14.39,
                label:
                  "Read the **Can I bundle my car and home insurance?** answer excerpt here.",
              },
            ],
          },
          {
            file: "demo-public-search-no-results.png",
            title: "A clear next step when guidance is unavailable",
            alt: "The unsupported question ends with No results found and Contact an agent. Leave the contact link unopened.",
            caption:
              "The unsupported question ends with **No results found** and **Contact an agent**. Leave the contact link unopened.",
            afterAction: 3,
            crop: {
              x: 44,
              y: 151,
              width: 1190,
              height: 440,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
            annotations: [
              {
                x: 1.68,
                y: 55,
                width: 23,
                height: 8,
                label: "Show **No results found**.",
              },
              {
                x: 1.68,
                y: 80.7,
                width: 14.37,
                height: 11.36,
                label: "End with **Contact an agent**.",
              },
            ],
          },
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
        inputs: [
          {
            action: 3,
            label: "Find structured data in page source",
            value: "application/ld+json",
          },
          {
            action: 3,
            label: "Find the canonical link in page source",
            value: "canonical",
          },
        ],
        presenterActions: [
          [
            `Open [**the resource page in Page Builder Content**](${resourcePageContent}).`,
            "Confirm **Public Website**, **English**, and **Home → insurance-resources → bundle-car-and-home**.",
            "Expand **Resource content**: show **Question**, **Plain-language answer**, **Formal source wording**, **Detailed explanation**, **Content owner**, and dates.",
            "Under **Content**, show **Canonical URL** and **Reference source**.",
            "Open **Quick Info**, and show the **PublicResourcePage** template.",
          ],
          [
            "Under **Content**, open **State applicability** using its **1 item selected** control; show **All states**, then close.",
            "Open **Products** using **2 items selected**; show **Auto** and **Homeowners**, then close.",
            "Open **Audience**; show **All consumers**, then close. Leave all selections unchanged.",
          ],
          [
            `Open [**the public article**](${ARTICLE}), then **View page source → Find**.`,
            "Paste **Find structured data in page source** below into **Find**.",
            "Show **FAQPage**, **Question**, and **acceptedAnswer**.",
            "Find **canonical** using the Copy field below, then return to the rendered article.",
          ],
        ],
        presenterResult:
          "Show the native template, managed classifications, **FAQPage** data, and canonical URL without editing content.",
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
        inputs: [
          {
            action: 1,
            label: "Search by term",
            value: "Can I bundle my car and home insurance?",
          },
          {
            action: 2,
            label: "Detailed explanation — review sentence",
            value:
              "Review your options with your agent before choosing coverage.",
          },
          {
            action: 3,
            label: "Repeat Search by term",
            value: "Can I bundle my car and home insurance?",
          },
        ],
        presenterActions: [
          [
            `Open [**SitecoreAI Search → Preview**](${SEARCH_SOURCE}).`,
            "Paste **Search by term** below into **Search by term**, then expand the matching row using **Toggle document details**.",
            "Confirm **body** does not contain **Review your options with your agent before choosing coverage.**",
            "If the sentence is present, restore the baseline through [**Before presenting**](#preparation) before continuing.",
          ],
          [
            `In the **administrator acting as publisher** session, open [**the resource page**](${resourcePageContent}).`,
            "Select the recorded **Prepared page version** by number. Wait for loading, then recheck the selected number.",
            "Expand **Resource content**; confirm **Resource page review**, **Approved**, and the sentence from the Copy field below in **Detailed explanation**.",
            "Choose **Publish**: keep **Page** and **Current language (English)** selected; clear **Include related items** before **All references**.",
            "Leave **Subpages** unchecked, select **Start publish**, and wait for completion.",
          ],
          [
            `Return to [**SitecoreAI Search → Preview**](${SEARCH_SOURCE}), and refresh.`,
            "Repeat **Search by term** using the Copy field below; expand the matching row.",
            "If needed, wait and refresh until **body** contains **Review your options with your agent before choosing coverage.**",
            "Confirm **state**, **product**, and **audience** are preserved.",
          ],
        ],
        presenterResult:
          "The native Search document contains the newly published sentence, with its **state**, **product**, and **audience** unchanged.",
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
        images: [
          {
            file: "demo-public-publish-approved.png",
            title: "Publish the approved page revision",
            alt: "The page is Approved. Its Detailed explanation contains the new review sentence, and the publishing status provides a link to the job.",
            caption:
              "The page is **Approved**. Its **Detailed explanation** contains the new review sentence, and the publishing status provides a link to the job. Use the version number recorded for the current demonstration.",
            afterAction: 2,
            crop: {
              x: 0,
              y: 0,
              width: 1440,
              height: 900,
              sourceWidth: 1440,
              sourceHeight: 900,
            },
            annotations: [
              {
                x: 79.51,
                y: 1.56,
                width: 6.67,
                height: 3.33,
                label: "Confirm **Approved**",
              },
              {
                x: 22.22,
                y: 69.89,
                width: 45.14,
                height: 3.67,
                label: "Confirm the added review sentence",
              },
              {
                x: 79.17,
                y: 5.56,
                width: 20.69,
                height: 11.22,
                label: "Follow publishing progress",
              },
            ],
          },
          {
            file: "demo-public-search-published-body.png",
            title: "The published sentence appears in Search",
            alt: "In the expanded native Search document, body now contains the sentence published from the page. This is the automatic update to verify.",
            caption:
              "In the expanded native **Search** document, body now contains the sentence published from the page. This is the automatic update to verify.",
            afterAction: 3,
            crop: {
              x: 80,
              y: 90,
              width: 1280,
              height: 720,
              sourceWidth: 1440,
              sourceHeight: 900,
            },
            annotations: [
              {
                x: 10.23,
                y: 25.69,
                width: 87.34,
                height: 29.58,
                label: "The updated published body is in **Search**",
              },
            ],
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
        inputs: [
          {
            action: 1,
            label: "New page name",
            value: "coverage-guide-live",
          },
          {
            action: 2,
            label: "Hero heading",
            value: "Explore coverage with confidence",
          },
          {
            action: 2,
            label: "Introduction heading",
            value: "Guidance for your next decision",
          },
          {
            action: 2,
            label: "Introduction body",
            value:
              "Review approved information, compare your options, and speak with an agent about your needs.",
          },
          {
            action: 5,
            label: "Page submission comment",
            value: "Review coverage guidance page",
          },
          {
            action: 5,
            label: "Local content submission comment",
            value: "Review coverage guidance content",
          },
          {
            action: 6,
            label: "Approval comment",
            value: "Approved coverage guidance",
          },
        ],
        presenterActions: [
          [
            `In the **Author** browser profile, open [**public Home in Page Builder**](${publicEditor}).`,
            "Confirm **Public Website**, **English**, and **Default editing host**.",
            "Choose **Home → Create a page → Landing page → Select**.",
            "Paste **New page name** below into the sitemap’s editable **New page** name, then press **Enter**.",
            "Wait for **Page created from branch template**.",
          ],
          [
            "Choose **Reload tree** if shown. Select **coverage-guide-live**, and wait for the matching page heading.",
            "Open **Content → coverage-guide-live → Data → Hero**. Paste **Hero heading** below into **Heading**.",
            "Press **Tab**, wait for **Saved**, then open **Data → Introduction**.",
            "Paste **Introduction heading** below into **Heading**; press **Tab**, and wait for **Saved**.",
            "Paste **Introduction body** below into **Body**; click outside the field, and wait for **Saved**.",
          ],
          [
            "Return to **Editor**; select **coverage-guide-live** in **Sitemap**, and confirm its heading.",
            "Open **Layers → headless-public-content-1 → Insert into** immediately after **Article text**.",
            "Show the permitted choices; choose **Promotions → Promotion → Bundle and save**.",
            "Select **Assign**, rather than **Duplicate and assign**.",
            "Choose **Design → Variant → Compact** instead of **Default**.",
          ],
          [
            "Select **Preview → Preview**.",
            "Confirm both headings and the shared Promotion; return to **Editor**. Keep the page unpublished.",
          ],
          [
            "On **coverage-guide-live**, choose **Actions → Submit**; paste **Page submission comment** below, then select **Submit**.",
            "Open **Page items**; check **coverage-guide-live**, **Hero**, and **Introduction**.",
            "For each local item still in **Draft**, open **Content → Actions → Submit**; paste **Local content submission comment**, then **Submit**.",
            "Confirm the page, **Hero**, and **Introduction** are all **Awaiting approval**.",
          ],
          [
            "In the separate **Approver** profile, review **coverage-guide-live**, **Hero**, and **Introduction**.",
            "On the page, choose **Actions → Approve**; paste **Approval comment** below, then select **Submit**.",
            "In **Page items**, open any local item still **Awaiting approval**; review it, then **Actions → Approve → Submit**.",
            "Confirm all three are **Approved**. Switch to the publisher profile for publication.",
          ],
          [
            "In the **administrator acting as publisher** profile, open **coverage-guide-live**, then choose **Publish**.",
            "Select **Page**, **Current language (English)**, **All references**, and **Include related items**. Leave **Subpages** unchecked; select **Start publish**.",
            `After completion, open [**the published coverage page**](${PUBLIC}/coverage-guide-live); confirm both headings and the shared Promotion.`,
          ],
        ],
        presenterResult:
          "The published **coverage-guide-live** page shows both authored headings and the reused Promotion.",
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
        images: [
          {
            file: "demo-public-create-page.png",
            title: "Create a page from the approved template",
            alt: "Select the Landing page tile, then select Select to create the new page with its approved starting structure.",
            caption:
              "**Select** the **Landing page** tile, then select **Select** to create the new page with its approved starting structure.",
            afterAction: 1,
            crop: {
              x: 225,
              y: 55,
              width: 1470,
              height: 800,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 5.78,
                y: 12.75,
                width: 13.61,
                height: 23.62,
                label: "Choose **Landing page**",
              },
              {
                x: 91.7,
                y: 90.88,
                width: 5.44,
                height: 5.38,
                label: "Then select **Select**",
              },
            ],
          },
          {
            file: "demo-public-components-promotion.png",
            title: "Choose an allowed component",
            alt: "The selected page-body placeholder offers approved component choices. In Promotions, choose Promotion.",
            caption:
              "The selected page-body placeholder offers approved component choices. In **Promotions**, choose **Promotion**.",
            afterAction: 3,
            crop: {
              x: 0,
              y: 0,
              width: 710,
              height: 900,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 47.89,
                y: 9.0,
                width: 45.07,
                height: 77.67,
                label: "These choices belong to this placeholder",
              },
              {
                x: 50.7,
                y: 57.89,
                width: 10.7,
                height: 8.67,
                label: "Choose **Promotion**",
              },
            ],
          },
          {
            file: "demo-public-assign-promotion.png",
            title: "Reuse the existing Promotion",
            alt: "Choose Bundle and save from Promotions, then use Assign to reference the existing content item.",
            caption:
              "Choose **Bundle and save** from **Promotions**, then use **Assign** to reference the existing content item.",
            afterAction: 3,
            crop: {
              x: 435,
              y: 60,
              width: 1050,
              height: 762,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 8.0,
                y: 31.1,
                width: 23.33,
                height: 5.12,
                label: "**Select** **Bundle and save**",
              },
              {
                x: 88.29,
                y: 90.94,
                width: 7.81,
                height: 5.51,
                label: "Use **Assign** to reuse it",
              },
            ],
          },
          {
            file: "demo-public-promotion-variant.png",
            title: "Apply the Compact presentation variant",
            alt: "With the Promotion selected, open Design, open Variant, and choose Compact. This changes its presentation.",
            caption:
              "With the **Promotion** selected, open **Design**, open **Variant**, and choose **Compact**. This changes its presentation.",
            afterAction: 3,
            crop: {
              x: 1615,
              y: 115,
              width: 305,
              height: 345,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 32.79,
                y: 6.67,
                width: 24.92,
                height: 10.43,
                label: "Open **Design**",
              },
              {
                x: 4.92,
                y: 56.23,
                width: 91.48,
                height: 11.3,
                label: "Choose **Compact**",
              },
            ],
          },
          {
            file: "demo-public-page-preview-menu.png",
            title: "Open the unpublished page preview",
            alt: "Use the eye-shaped Preview control, then choose Preview in its menu to inspect the page before publication.",
            caption:
              "Use the eye-shaped **Preview** control, then choose **Preview** in its menu to inspect the page before publication.",
            afterAction: 4,
            crop: {
              x: 1190,
              y: 65,
              width: 720,
              height: 420,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 52.36,
                y: 2.62,
                width: 4.58,
                height: 7.62,
                label: "Open **Preview**",
              },
              {
                x: 63.61,
                y: 15.0,
                width: 13.47,
                height: 8.81,
                label: "Choose **Preview** in the menu",
              },
            ],
          },
          {
            file: "demo-public-workflow-comment.png",
            title: "Submit the draft for review",
            alt: "The workflow action opens Comment. Enter the review comment, then select Submit.",
            caption:
              "The workflow action opens **Comment**. Enter the review comment, then select **Submit**.",
            afterAction: 5,
            crop: {
              x: 690,
              y: 55,
              width: 540,
              height: 320,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 7.59,
                y: 30.94,
                width: 85.74,
                height: 30.94,
                label: "Enter the review comment",
              },
              {
                x: 76.67,
                y: 77.81,
                width: 15.93,
                height: 13.44,
                label: "**Submit** for review",
              },
            ],
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
          "The marketer wants to turn a content recommendation into a reviewed page change without leaving the authoring process.",
        objective:
          "Show a real in-platform content recommendation, then explain how proposed Profound content would enter Liberty Mutual’s governed publishing process.",
        stopWhen:
          "The existing and proposed wording and its target field have been shown, and the proposed Profound-to-Draft, review, and publication path has been explained.",
        presenterActions: [
          [
            `Open the prepared [**Prospera AEO recommendation review**](${SCRUNCH_REVIEW}). Confirm **agverticals → Prospera**.`,
            "Under **Readability & Clarity**, open the **Home** recommendations. Keep this example read-only.",
          ],
          [
            "Find **Cards · Description**; compare the upper existing wording with the lower proposed wording.",
            "Point to **trackable rewards** and **card options side by side**.",
            "Leave **Apply**, **Apply all**, and **Dismiss** untouched.",
          ],
          [
            `Select **Open in Page builder**, or open [**the prepared recommendation in Page Builder**](${SCRUNCH_EDITOR}).`,
            "Show **AEO opportunities** and **Powered by Scrunch**.",
            "On **Cards · Description**, choose **Show live content** if needed.",
            "Compare **Recommended | Rewritten** with **Live content**, then select **Scroll to content**.",
            "Show the outlined field. Do not apply, dismiss, edit, or publish.",
          ],
          [
            "Return to Liberty Mutual’s prepared **Page Builder** tab.",
            "Show the proposed path: **Profound output → scoped Sitecore authoring API → SitecoreAI Draft**.",
            "Continue: **human review and approval → publication → website, Search, and API consumers**.",
            "Identify **Profound** as a proposed integration; the live recommendation example uses **Scrunch**.",
          ],
        ],
        presenterResult:
          "Show the recommendation, its target field, and the proposed Profound-to-review path; leave Prospera unchanged.",
        actions: [
          `Open the prepared [**Prospera AEO recommendation review**](${SCRUNCH_REVIEW}) tab. Confirm the **agverticals** environment and **Prospera** site. Under **Readability & Clarity**, review the **Home** page recommendations. This is the existing integrated recommendation example. Keep it read-only.`,
          "Locate **Cards · Description**. Compare the existing wording in the upper block with the proposed wording in the lower block. Point out **trackable rewards** and **card options side by side** as examples of clearer phrasing. Leave **Apply**, **Apply all**, and **Dismiss** untouched.",
          `Use **Open in Page builder** on that recommendation, or open the prepared [**same recommendation in Page Builder**](${SCRUNCH_EDITOR}). Show the **AEO opportunities** panel and **Powered by Scrunch** label beside the page. On **Cards · Description**, choose **Show live content** if the existing copy is collapsed. Compare **Recommended | Rewritten** with **Live content**, then select **Scroll to content**. The corresponding field is outlined on the page. Inspect it without applying the recommendation or changing the page.`,
          "Return to Liberty Mutual’s prepared Page Builder tab. Trace the proposed integration design: **Profound output → scoped Sitecore authoring API → SitecoreAI Draft → human review and approval → publication → website, Search, and API consumers**. Use the Liberty Mutual review process already demonstrated to show where governance applies. The read-only Prospera example demonstrates recommendation review and field context; Liberty Mutual’s preceding page demonstration supplies the workflow proof.",
        ],
        expected: [
          "The marketer can inspect a real contextual recommendation in SitecoreAI and understand how proposed Profound content would enter Liberty Mutual’s existing Draft, review, and publishing process.",
        ],
        talkTrack: [
          "SitecoreAI brings content opportunities into the authoring experience. Here the marketer can compare the suggested wording with the original and see the exact page field it would change. This existing experience uses Scrunch. For Profound, an integration could use Sitecore’s authoring APIs to create or update the appropriate content as a draft. The Liberty Mutual review, approval, and publishing controls we just demonstrated would then apply.",
        ],
        controls: [
          "The existing **AEO opportunities** experience associates a recommendation with its native page, component, and field. This example is read-only in **Sales Engineers1 → agverticals → Prospera**.",
          "Profound intake remains a proposed integration design with scoped API permissions, template mapping, Draft creation, and human review. The workflow evidence comes from Liberty Mutual’s preceding demonstration.",
        ],
        links: [
          {
            label: "Review the native AEO recommendation",
            href: SCRUNCH_REVIEW,
          },
          {
            label: "Open the same recommendation in Page Builder",
            href: SCRUNCH_EDITOR,
          },
          {
            label: "Return to Liberty Mutual Page Builder",
            href: publicEditor,
          },
        ],
        images: [
          {
            file: "demo-aeo-recommendation-review.png",
            title: "Compare the existing and proposed wording",
            alt: "Native AEO recommendation for Cards Description with existing wording above and proposed clearer phrasing below.",
            caption:
              "**Cards · Description** identifies the target component and field. Compare the existing wording in the upper block with the proposed wording below it. The page-opening icon launches the same recommendation in **Page Builder**.",
            afterAction: 2,
            crop: {
              x: 438,
              y: 590,
              width: 326,
              height: 247,
              sourceWidth: 813,
              sourceHeight: 988,
            },
            annotations: [
              {
                x: 3.07,
                y: 38.05,
                width: 92.94,
                height: 23.08,
                label: "Read the existing wording.",
              },
              {
                x: 3.07,
                y: 66.4,
                width: 92.94,
                height: 27.1,
                label: "Compare the proposed wording.",
              },
              {
                x: 90.18,
                y: 15.8,
                width: 7.98,
                height: 10,
                label: "Open the recommendation in **Page Builder**.",
              },
            ],
          },
          {
            file: "demo-aeo-page-builder-context.png",
            title: "Review the recommendation beside the page",
            alt: "Page Builder AEO opportunities panel powered by Scrunch, with Cards Description recommended wording, Live content, and Scroll to content.",
            caption:
              "The **AEO opportunities** panel identifies **Cards · Description** and displays its recommendation beside **Live content**. Use **Scroll to content** to locate the field on the page. Keep this example read-only.",
            afterAction: 3,
            crop: {
              x: 315,
              y: 132,
              width: 470,
              height: 650,
              sourceWidth: 1600,
              sourceHeight: 1000,
            },
            annotations: [
              {
                x: 3.2,
                y: 0.9,
                width: 63.8,
                height: 6.6,
                label:
                  "Identify **AEO opportunities** and **Powered by Scrunch**.",
              },
              {
                x: 3.2,
                y: 57.3,
                width: 40,
                height: 4.3,
                label: "Find **Cards · Description**.",
              },
              {
                x: 67,
                y: 57.3,
                width: 29.5,
                height: 4.3,
                label: "Select **Scroll to content**.",
              },
              {
                x: 3.2,
                y: 68.5,
                width: 92.5,
                height: 10.5,
                label: "Read the recommended wording.",
              },
              {
                x: 3.2,
                y: 83,
                width: 92.5,
                height: 9,
                label: "Compare **Live content**.",
              },
            ],
          },
          {
            file: "demo-aeo-page-builder-context.png",
            title: "The corresponding page field is outlined",
            alt: "The actual Cards Description rich-text field is outlined in the Page Builder canvas after Scroll to content.",
            caption:
              "**Scroll to content** locates the existing **Cards · Description** field in the page canvas. The recommendation and the native field refer to the same content. Leave the field unchanged.",
            afterAction: 3,
            crop: {
              x: 850,
              y: 795,
              width: 680,
              height: 160,
              sourceWidth: 1600,
              sourceHeight: 1000,
            },
            annotations: [
              {
                x: 15.3,
                y: 53.1,
                width: 67.1,
                height: 35,
                label: "The native page field contains the existing wording.",
              },
            ],
          },
        ],
        transition:
          "Recommendations help the team choose a change. Next, show the engagement signals that help marketers assess their content.",
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
        presenterActions: [
          [
            `Open [**Optimization → Analytics → Events**](${ANALYTICS}).`,
            "Set **Site → liberty-mutual-public-site** and **Time → 1 hour**.",
          ],
          [
            "Show **Events over Time** and **Events Table**.",
            "Find actual **pageView**, **LM_PUBLIC_CTA_CLICK**, and **LM_PUBLIC_SCROLL_25** or other recorded scroll milestones.",
            "Match their timestamps to the visitor journey completed during preparation.",
          ],
          [
            "Point to visits, reading depth, and selected next actions in the actual report.",
            "Show which signal helps identify a content improvement.",
          ],
        ],
        presenterResult:
          "The site-filtered report shows genuine page, CTA, and scroll events with the prepared journey’s timestamps.",
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
        presenterActions: [
          [
            "Show **Experience Edge content delivery** in [**the shared presentation**](https://sitecore1.sharepoint.com/:p:/s/Ops/cQoDg9wZPRa8Tb3nJmHAOX-TEgUCuSmQQA7MGbe1g6C_LnOG3A).",
            "Trace **SitecoreAI authoring → Publish → Experience Edge → API consumers**.",
          ],
          [
            "Open [**One published page, two experiences**](/workshops/content-api).",
            "Under **Published insurance question**, select **Can I bundle my car and home insurance?**, then **Load content**.",
          ],
          [
            `Find **Review your options with your agent before choosing coverage.**; compare it with [**the public article**](${ARTICLE}).`,
            "Under **The governance travels with the answer**, show the source and applicability metadata.",
          ],
          [
            "Under **A stable contract for other applications**, show **API contract version**, **Native content version**, and **Stable item ID**.",
            "Match the stable ID to the resource page and the native version to its published English revision.",
          ],
        ],
        presenterResult:
          "The second experience and public article show the same published sentence, source, applicability, stable ID, and content version.",
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
        presenterActions: [
          [
            "Open prepared [**Communication preferences**](/workshops/preferences); show **1 eligible recipient → Cameron Ellis - Allowed**.",
            "Record that profile’s **Native profile ID**, then select **Opt out Cameron**.",
            "Leave the tab open while the update processes; continue with Avery and Daniel.",
          ],
          [
            `In the **avery.01** session, open [**Agent Portal Home**](${PORTAL}/). Confirm **Avery Brooks → Cedar Ridge Insurance**.`,
            "Find **Priorities for your agency**; show **Build a stronger small-business practice** first.",
            "Then show **Support workers’ compensation conversations in Texas** and **Connect home and auto conversations**.",
            "Open **Your profile**; show the principal role and **Licensed states: Texas, Illinois, and Florida**.",
          ],
          [
            `In the separate **daniel.01** session, open [**Home**](${PORTAL}/). Confirm **Daniel Ortiz → Prairie Oak Insurance**.`,
            "Compare his household-first priorities.",
            "Open **Your profile**; show the producer role and **Licensed states: Illinois and Texas**.",
          ],
          [
            `As administrator, open [**Agent Portal Home in Page Builder**](${portalEditor}); keep **Default editing host**, then **Layers → Agency priorities**.`,
            "Choose **Edit personalization rules → Liberty Mutual - Agency product priorities**.",
            "Choose **Select profile → Load profile → Profile ID**, replacing **Client ID** if shown.",
            "Paste Avery’s prepared [**Native profile ID**](/workshops/reset#current-profiles); press **Enter**. Wait for **Testing as: Avery Brooks - 01**; select **Test**, and confirm green **agency-growth**.",
            "Repeat with Daniel’s current UUID; wait for **Testing as: Daniel Ortiz - 01**; select **Test**, and confirm green **producer-priorities**. Choose **Cancel**.",
          ],
          [
            `Open [**Liberty Mutual marketing eligibility → Configuration**](${MARKETING_ELIGIBILITY}), then **API response → Open variant editor**.`,
            "Show **marketingEligible** requiring an identified profile and **marketingSuppressed === false**.",
            "Select **Close editor**. Leave the Live rule unchanged.",
          ],
          [
            "Return to **Communication preferences**; select **Check import status** until **SitecoreAI confirmed the imported records**.",
            "Confirm **Cameron Ellis - Allowed** now has **marketingSuppressed = true**, with the same **Native profile ID**.",
            "Under **Marketing outreach preview**, select **Run eligibility check**.",
            "Show **No eligible recipients**, with no email preview.",
            "Under **Native decision receipts**, confirm **marketingEligible = false** and **Same profile as this session’s first check**.",
          ],
        ],
        presenterResult:
          "Avery and Daniel match their native priority rules; Cameron’s same-profile opt-out yields **No eligible recipients** and no email preview.",
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
          "Two representative portal pages share the same design, the permitted component choices are visible, and the sample Brand Kit’s voice guidance has been shown.",
        presenterActions: [
          [
            `In Avery’s session, compare **My workspace** with [**Learning & resources**](${PORTAL}/resources).`,
            "Show common navigation, typography, buttons, cards, and **Coverage and availability**.",
          ],
          [
            `Open [**Agent Portal Home in Page Builder**](${portalEditor}). Confirm **Agent Portal**, **English**, and **Default editing host**.`,
            "Open **Layers**; locate **Agency priorities** and the shared **Disclosure** component.",
          ],
          [
            "In **Layers → headless-agency-priorities**, select **Insert into** before or after **Agency priorities**.",
            "Show **Components → Business priorities → Agency priorities** as the permitted choice.",
            "Close the picker without inserting content.",
          ],
          [
            `Open [**Design → Brand kits**](${BRAND_KITS}).`,
            "Select **Published → Liberty Mutual — Independent Agents → Sections → Tone of Voice**.",
            "Show the voice guidance. Leave the kit unchanged.",
          ],
        ],
        presenterResult:
          "Both portal pages share the design; the placeholder limits component choices, and the sample Brand Kit’s voice guidance is visible.",
        actions: [
          `In Avery’s session, compare **My workspace** with [**Learning & resources**](${PORTAL}/resources). Identify their common navigation, typography, buttons, cards, and **Coverage and availability** disclosure.`,
          `Open [**Agent Portal Home in Page Builder**](${portalEditor}). Confirm **Agent Portal**, **English**, and **Default editing host**. Open **Layers**, and locate **Agency priorities** and the shared **Disclosure** component.`,
          "In **Layers**, find **headless-agency-priorities**, and choose its **Insert into** button before or after **Agency priorities**. The filtered **Components** picker shows **Business priorities → Agency priorities** for this placeholder. Close the picker without selecting a component or inserting content. Explain that the page design supplies shared structure and placeholder settings limit which components fit each area.",
          `Switch to the prepared [**Design → Brand kits**](${BRAND_KITS}) tab. Select the **Published** **Liberty Mutual — Independent Agents** card, then open **Sections → Tone of Voice**. Briefly identify its reusable voice guidance, and leave the kit unchanged.`,
        ],
        expected: [
          "The portal uses consistent design and governed component choices, while the sample Brand Kit provides reusable guidance for content creation.",
        ],
        talkTrack: [
          "Shared design keeps these personalized experiences consistently on brand. The portal’s shared structure and placeholder settings give business users approved components and appropriate places for them. We also assembled a sample Liberty Mutual Brand Kit for the workshop, with reusable visual and voice guidance for content creation.",
        ],
        controls: [
          "**Page designs**, **partial designs**, native renderings, and **placeholder settings** govern reusable structure and permitted composition. Content edits remain separate from component code.",
          "The sample **Brand Kit** collects reusable visual and voice instructions for content creation. Shared application styles and native composition controls govern the rendered portal.",
        ],
        links: [
          {
            label: "Agent Portal Home in Page Builder",
            href: `${portalEditor}`,
          },
          { label: "Learning & resources", href: `${PORTAL}/resources` },
          { label: "Open the sample Brand Kit library", href: BRAND_KITS },
        ],
        images: [
          {
            file: "demo-portal-allowed-component.png",
            title: "The placeholder governs available components",
            alt: "In this portal placeholder, the Components picker exposes the Agency priorities component under Business priorities.",
            caption:
              "In this portal placeholder, the **Components** picker exposes the **Agency priorities** component under **Business priorities**.",
            afterAction: 3,
            crop: {
              x: 0,
              y: 0,
              width: 720,
              height: 900,
              sourceWidth: 1440,
              sourceHeight: 900,
            },
            annotations: [
              {
                x: 47.22,
                y: 9.0,
                width: 44.44,
                height: 77.67,
                label: "The selected placeholder’s component choices",
              },
              {
                x: 49.86,
                y: 25.78,
                width: 38.47,
                height: 14.22,
                label: "**Agency priorities** is the permitted choice",
              },
            ],
          },
          {
            file: "demo-brand-kit-voice.png",
            title: "The sample Brand Kit supplies reusable voice guidance",
            alt: "Native Brand Kit Sections tab with the Tone of Voice section and reusable guidance for the Liberty Mutual independent-agent portal.",
            caption:
              "In **Liberty Mutual — Independent Agents**, open **Sections → Tone of Voice**. The sample kit supplies reusable voice guidance for content creation.",
            afterAction: 4,
            crop: {
              x: 18,
              y: 340,
              width: 780,
              height: 560,
              sourceWidth: 813,
              sourceHeight: 988,
            },
            annotations: [
              {
                x: 14.1,
                y: 0.35,
                width: 11.7,
                height: 5.5,
                label: "Open **Sections**.",
              },
              {
                x: 0.8,
                y: 19.8,
                width: 21.8,
                height: 5.2,
                label: "Find **Tone of Voice**.",
              },
              {
                x: 1.67,
                y: 39.64,
                width: 96.15,
                height: 46.6,
                label: "Read the reusable voice guidance.",
              },
            ],
          },
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
          "Part 1 of the priority-change loop: save the new order as a Draft, ready for review, approval, and publication in the next step.",
        stopWhen:
          "Checkpoint: the Texas-first Draft is saved, the original approved version remains intact, and the live experience is unchanged. Continue with the audience-preview demonstration and the review/publication actions to complete this priority-change loop.",
        inputs: [
          {
            action: 2,
            label: "New priority version name",
            value: "Texas guidance priority",
          },
        ],
        presenterActions: [
          [
            `As **Author**, open [**Agency growth priorities in Page Builder Content**](${priorityContent}).`,
            "Confirm **Agent Portal**, **English**, and **Data → Agency priorities → Agency growth priorities**.",
          ],
          [
            "Record the approved version and original order: **Small business growth → Texas workers compensation → Home and auto conversations**.",
            "Choose **Create version**; paste **New priority version name** below, then select **Create**.",
            "Reopen the version selector; select the new **Texas guidance priority → Draft** row by its new number.",
            "Wait for fields to load, then recheck the selected version number.",
          ],
          [
            "In **Ordered recommendations**, select **Remove all items** to clear only this draft’s selection.",
            "Open the picker; select **Texas workers compensation**, **Small business growth**, then **Home and auto conversations**.",
            "Click the item heading to close; wait for **Saved**.",
            "Record the selected number as **Saved priority version**; retain it for the following approval and publication.",
          ],
          [
            "Recheck **Saved priority version**, **Draft**, and the Texas-first order.",
            "Leave it unpublished; continue to audience preview and the same version’s review/publication.",
          ],
        ],
        presenterResult:
          "The recorded **Saved priority version** is a saved Texas-first **Draft**; the original approved version and live order remain unchanged.",
        actions: [
          `As the **Author**, open [**Agency growth priorities in Page Builder Content**](${priorityContent}). Confirm **Agent Portal**, **English**, and **Data → Agency priorities → Agency growth priorities**.`,
          "Record the current approved version and its order: **Small business growth → Texas workers compensation → Home and auto conversations**. Open the version selector, choose **Create version**, name it **Texas guidance priority**, and click **Create**. Reopen the version selector, explicitly select the new **Texas guidance priority** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm the selected version number before changing **Ordered recommendations**.",
          "Find **Ordered recommendations**. Click **Remove all items** to clear only this draft’s selection, open the picker, and select **Texas workers compensation**, **Small business growth**, and **Home and auto conversations**, in that order. Click the item heading to close the picker, and wait for **Saved**. Record the version number currently shown as **Saved priority version**. Use that same saved version number for submission, the Approver’s review, and publication.",
          "With **Saved priority version** selected, confirm the order **Texas workers compensation → Small business growth → Home and auto conversations** and that the version remains **Draft**. Leave it unpublished. The next step demonstrates native page-level audience preview on the prepared growth page, then returns to this saved priority version for approval and publication.",
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
        images: [
          {
            file: "demo-portal-priority-order.png",
            title: "The draft’s ordered recommendations",
            alt: "Ordered recommendations contains Texas workers compensation first, followed by Small business growth and Home and auto conversations. The version remains Draft.",
            caption:
              "**Ordered recommendations** contains **Texas workers compensation** first, followed by **Small business growth** and **Home and auto conversations**. The version remains **Draft**. Use the version number recorded for the current demonstration.",
            afterAction: 3,
            crop: {
              x: 300,
              y: 0,
              width: 1620,
              height: 908,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 87.53,
                y: 1.1,
                width: 4.26,
                height: 3.96,
                label: "Confirm this version is **Draft**",
              },
              {
                x: 1.23,
                y: 87.0,
                width: 97.53,
                height: 6.94,
                label: "Read the selected cards from left to right",
              },
            ],
          },
        ],
        transition:
          "Next, inspect the two native page-level audience previews, then return to this saved priority version for approval and publication.",
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
          "Part 2 of the priority-change loop: inspect native page-level audience previews, then approve and publish the saved Home priority change and verify its intended live result.",
        stopWhen:
          "Both named page variants have been previewed while the growth page remains unpublished; publishing the saved priority collection changes Avery’s live Home order, while Daniel’s order remains unchanged.",
        inputs: [
          {
            action: 4,
            label: "Priority submission comment",
            value: "Prioritize Texas workers compensation guidance",
          },
          {
            action: 5,
            label: "Priority approval comment",
            value: "Approved agency priority update",
          },
        ],
        presenterActions: [
          [
            `In the **administrator acting as publisher** profile, open [**Agent audience preview in Page Builder**](${audiencePreviewEditor}).`,
            "Confirm **Agent Portal**, **English**, **Default editing host**, and unpublished **Home → growth → Agent audience preview**.",
            "Select **Personalize**.",
          ],
          [
            "Select **Avery agency principal → Preview → Preview**.",
            "Show **Set your agency’s next growth priority** and **Give your team a clear direction**.",
            "Confirm Avery/Cedar Ridge principal context; close the preview tab, and return to **Personalize**.",
          ],
          [
            "Select **Daniel producer → Preview → Preview**.",
            "Show **Prepare your next business insurance opportunity** and **Build a stronger first submission**.",
            "Confirm Daniel/Prairie Oak producer context; close the preview tab. Keep this growth page unpublished.",
          ],
          [
            `In the **Author** profile, open [**Agency growth priorities**](${priorityContent}); select **Saved priority version**.`,
            "Wait for loading; confirm **Draft** and Texas-first **Ordered recommendations**.",
            "Choose **Actions → Submit**; paste **Priority submission comment** below, then select **Submit**.",
            "Confirm **Awaiting approval**.",
          ],
          [
            "In the separate **Approver** session, select the same **Saved priority version**, and review its Texas-first order.",
            "Choose **Actions → Approve**; paste **Priority approval comment** below, then select **Submit**.",
            "Confirm **Approved**.",
          ],
          [
            "In the **administrator acting as publisher** session, open the collection in **Content**; select the same **Saved priority version**.",
            "Confirm **Approved** and Texas-first order. Choose **Publish** with **Item** and **Current language (English)** selected.",
            "Leave **Subitems** unchecked, select **Start publish**, and wait for completion.",
            "Reload Avery’s live Home: confirm Texas guidance first. Reload Daniel’s separate session: confirm his household-first order remains unchanged.",
          ],
        ],
        presenterResult:
          "Both audience previews work; publishing the saved priority version changes Avery’s live order while Daniel’s remains unchanged.",
        actions: [
          `In the prepared **administrator acting as publisher** browser profile, open [**Agent audience preview in Page Builder**](${audiencePreviewEditor}). Confirm **Agent Portal**, **English**, **Default editing host**, and the unpublished **Agent audience preview** page beneath **Home → growth**. Open **Personalize** in the top navigation.`,
          "Select **Avery agency principal**. Choose the header **Preview** button, then **Preview** in its menu. In the complete page preview, identify **Set your agency’s next growth priority** and **Give your team a clear direction**. Confirm the Avery/Cedar Ridge principal context. Close the preview tab, and return to the same **Personalize** screen.",
          "Select **Daniel producer**, and choose **Preview → Preview** again. Identify **Prepare your next business insurance opportunity** and **Build a stronger first submission**, with the Daniel/Prairie Oak producer context. Close that preview tab. The native page variants select authored Hero and Callout content on this unpublished growth page. Home retains its existing component-level personalization.",
          `Switch back to the **Author** browser profile, and open [**Agency growth priorities**](${priorityContent}). Select **Saved priority version**, wait for its fields to load, and recheck **Draft** and the Texas-first order in **Ordered recommendations**. Choose **Actions → Submit**, enter **Prioritize Texas workers compensation guidance**, and click **Submit**. Confirm **Awaiting approval**.`,
          "In the separate **Approver** session, select the same **Saved priority version**, inspect its submitted order, and choose **Actions → Approve**. Enter **Approved agency priority update**, click **Submit**, and confirm **Approved**.",
          "In the **administrator acting as publisher** session, open that collection in **Content**, select the same **Saved priority version**, confirm **Approved** and its Texas-first order, and choose **Publish**, keep **Item** and **Current language (English)** selected, leave **Subitems** unchecked, and click **Start publish**. After completion, reload Avery’s actual live portal and confirm Texas guidance first. Reload Daniel’s separate producer session and confirm his household-first order remains unchanged.",
        ],
        expected: [
          "Native page-level Preview shows the two authored audience experiences on the unpublished growth page. Publishing the separately reviewed priority collection updates Avery’s Home without publishing Home manually or deploying frontend code; Daniel remains unchanged.",
        ],
        talkTrack: [
          "The marketer can inspect a complete page for each configured audience before publication. The principal view focuses on setting direction for the agency; the producer view focuses on preparing a stronger submission. These are native page variants on an unpublished growth page. We will now complete the Texas-first Home priority change prepared earlier, using separate approval and publication, and verify the live result for both agents.",
        ],
        controls: [
          "**Personalize → Avery agency principal** and **Personalize → Daniel producer** select native page variants. **Preview → Preview** opens the corresponding complete page. Each variant uses its own authored **Hero** and **Callout** datasources. The preview page remains unpublished.",
          "The operational header uses a synthetic, read-only context that matches the native selected Hero datasource during verified CMS editing and preview. No real agent sign-in or CDP identity is created by this page preview.",
          "The **Saved priority version** from A3 is a separate Home content collection. The **Author** submits it, the **Approver** reviews it, and the administrator publishes it. Home’s existing native component rules still select Avery’s and Daniel’s live content.",
        ],
        links: [
          {
            label: "Open native page audience preview",
            href: audiencePreviewEditor,
          },
          {
            label: "Review and publish the priority collection",
            href: priorityContent,
          },
          { label: "Verify Avery’s live portal", href: `${PORTAL}/` },
        ],
        images: [
          {
            file: "demo-portal-page-audience-selector.png",
            title: "Choose the audience, then open its complete page preview",
            alt: "Page Builder Personalize view lists Avery agency principal and Daniel producer on the unpublished Agent audience preview page. The Preview eye button is in the page toolbar.",
            caption:
              "Open **Personalize**, select **Avery agency principal** or **Daniel producer** in the left panel, and use the toolbar’s **Preview** button. Choose **Preview** in its menu to open the complete page.",
            afterAction: 1,
            crop: {
              x: 0,
              y: 0,
              width: 1280,
              height: 720,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
            annotations: [
              {
                x: 63.5,
                y: 0.3,
                width: 5.6,
                height: 7.3,
                label: "Open **Personalize**.",
              },
              {
                x: 0.6,
                y: 36.3,
                width: 22.2,
                height: 19.4,
                label: "Select one of the named page variants.",
              },
              {
                x: 72.0,
                y: 10.2,
                width: 2.7,
                height: 4.8,
                label: "Open **Preview**, then select **Preview**.",
              },
              {
                x: 77.5,
                y: 9.9,
                width: 18.2,
                height: 4.8,
                label: "Confirm **Agent audience preview**.",
              },
            ],
          },
          {
            file: "demo-portal-avery-page-preview.png",
            title: "Avery’s agency-principal page preview",
            alt: "Avery’s page preview shows the Cedar Ridge Insurance Texas principal context, Set your agency’s next growth priority, and Give your team a clear direction.",
            caption:
              "The **Avery agency principal** variant shows **Set your agency’s next growth priority** and **Give your team a clear direction**. The agency and Texas context match that audience. Close this preview tab before choosing the other variant.",
            afterAction: 2,
            crop: {
              x: 220,
              y: 165,
              width: 580,
              height: 790,
              sourceWidth: 813,
              sourceHeight: 988,
            },
            annotations: [
              {
                x: 6.9,
                y: 6.3,
                width: 88,
                height: 13.8,
                label: "Principal context and audience-specific **Hero**.",
              },
              {
                x: 6.9,
                y: 51.4,
                width: 88,
                height: 6,
                label: "Audience-specific **Callout**.",
              },
            ],
          },
          {
            file: "demo-portal-daniel-page-preview.png",
            title: "Daniel’s producer page preview",
            alt: "Daniel’s page preview shows the Prairie Oak Insurance Illinois producer context, Prepare your next business insurance opportunity, and Build a stronger first submission.",
            caption:
              "The **Daniel producer** variant shows **Prepare your next business insurance opportunity** and **Build a stronger first submission**. The agency and Illinois context change with the selected native variant. The page remains unpublished.",
            afterAction: 3,
            crop: {
              x: 220,
              y: 165,
              width: 580,
              height: 770,
              sourceWidth: 813,
              sourceHeight: 988,
            },
            annotations: [
              {
                x: 6.9,
                y: 6.5,
                width: 88,
                height: 14.2,
                label: "Producer context and audience-specific **Hero**.",
              },
              {
                x: 6.9,
                y: 52.7,
                width: 88,
                height: 6.2,
                label: "Audience-specific **Callout**.",
              },
            ],
          },
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
        inputs: [
          {
            action: 2,
            label: "New disclosure version name",
            value: "Shared disclosure review",
          },
          {
            action: 2,
            label: "Sentence to append to Disclosure",
            value:
              "Review available options with your agent before making a coverage decision.",
          },
          {
            action: 3,
            label: "Disclosure submission comment",
            value: "Review shared disclosure wording",
          },
          {
            action: 3,
            label: "Disclosure approval comment",
            value: "Approved shared disclosure wording",
          },
        ],
        presenterActions: [
          [
            `As **Author**, open [**Product availability notice in Page Builder Content**](${disclosureContent}).`,
            "Confirm **Public Website**, **English**, and **Data → Disclosures → Product availability notice**.",
            "Record the original approved English version and **Disclosure** wording for the next loop’s restoration.",
          ],
          [
            "Choose **Create version**; paste **New disclosure version name** below, then select **Create**.",
            "Reopen the version selector; select the new **Shared disclosure review → Draft** row by its new number.",
            "Wait for fields to load, then recheck the selected number.",
            "Append **Sentence to append to Disclosure** below to **Disclosure**; click outside, and wait for **Saved**.",
            "Record the number as **Saved disclosure version**; use it for submission, approval, and publication.",
          ],
          [
            "Select **Saved disclosure version**; confirm **Draft** and the added sentence.",
            "Choose **Actions → Submit**; paste **Disclosure submission comment** below, then **Submit**. Confirm **Awaiting approval**.",
            "In the separate **Approver** session, select the same **Saved disclosure version**, and review its wording.",
            "Choose **Actions → Approve**; paste **Disclosure approval comment** below, then select **Submit**.",
          ],
          [
            "In the **administrator acting as publisher** session, open the disclosure in **Content**, and select **Saved disclosure version**.",
            "Confirm **Approved** and the added sentence.",
            "Publish with **Item** and **Current language (English)** selected, and **Subitems** unchecked; select **Start publish**.",
          ],
          [
            "Wait for publication to complete.",
            `Reload [**public Home**](${PUBLIC}/) and Avery’s [**Agent Portal Home**](${PORTAL}/).`,
            "Show the added sentence in **Coverage and availability** on both pages.",
          ],
        ],
        presenterResult:
          "Both Home pages show the added disclosure sentence after one shared-source publication.",
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
        images: [
          {
            file: "demo-shared-disclosure-editor.png",
            title: "Edit the shared source once",
            alt: "Product availability notice holds the shared Disclosure field. The new draft contains the sentence that will appear on both sites after approval and publication.",
            caption:
              "**Product availability notice** holds the shared **Disclosure** field. The new draft contains the sentence that will appear on both sites after approval and publication. Use the version number recorded for the current demonstration.",
            afterAction: 2,
            crop: {
              x: 300,
              y: 0,
              width: 1620,
              height: 770,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 87.53,
                y: 1.3,
                width: 4.26,
                height: 4.68,
                label: "The new version is **Draft**",
              },
              {
                x: 1.23,
                y: 18.18,
                width: 32.1,
                height: 4.55,
                label: "This is the shared source item",
              },
              {
                x: 1.23,
                y: 51.95,
                width: 97.53,
                height: 14.29,
                label: "Edit and review the **Disclosure** wording",
              },
            ],
          },
          {
            file: "demo-shared-disclosure-public.png",
            title: "Public Website: the published disclosure",
            alt: "On Public Website Home, Coverage and availability displays the published sentence from the shared source.",
            caption:
              "On Public Website Home, **Coverage and availability** displays the published sentence from the shared source.",
            afterAction: 5,
            crop: {
              x: 372,
              y: 435,
              width: 1180,
              height: 100,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 0.93,
                y: 9.0,
                width: 97.46,
                height: 61.0,
                label: "The shared wording on Public Website",
              },
            ],
          },
          {
            file: "demo-shared-disclosure-portal.png",
            title: "Agent Portal: the same published disclosure",
            alt: "On Agent Portal Home, Coverage and availability displays the same published sentence in the portal’s own design.",
            caption:
              "On Agent Portal Home, **Coverage and availability** displays the same published sentence in the portal’s own design.",
            afterAction: 5,
            crop: {
              x: 587,
              y: 515,
              width: 980,
              height: 210,
              sourceWidth: 1920,
              sourceHeight: 908,
            },
            annotations: [
              {
                x: 3.57,
                y: 13.33,
                width: 93.37,
                height: 42.86,
                label: "The same shared wording on Agent Portal",
              },
            ],
          },
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
        inputs: [
          {
            action: 3,
            label: "Restored disclosure version name",
            value: "Original disclosure restored",
          },
          {
            action: 4,
            label: "Restoration submission comment",
            value: "Restore original disclosure wording",
          },
          {
            action: 4,
            label: "Restoration approval comment",
            value: "Approved restoration of shared disclosure wording",
          },
        ],
        presenterActions: [
          [
            `Open [**public Home in Page Builder Editor**](${publicEditor}).`,
            "Choose **Sitemap → Home → Content tree options → Page items → Product availability notice**.",
          ],
          [
            "Select **Workflow history**.",
            "Under **History**, show **Draft → Awaiting approval** and **Awaiting approval → Approved**.",
            "Read the user, timestamp, and **Comment**; match the preceding Author and Approver actions.",
          ],
          [
            `As **Author**, open [**Product availability notice in Content**](${disclosureContent}); select the recorded original approved English version.`,
            "Wait for loading; recheck the selected number and original **Disclosure** wording before choosing **Create version**.",
            "Paste **Restored disclosure version name** below, then **Create**. Reopen the selector; select the new **Original disclosure restored → Draft** row.",
            "Wait; recheck its new version number and original wording without the added sentence.",
            "After **Saved**, record the number as **Restored disclosure version**; use it for submission, approval, and publication.",
          ],
          [
            "Select **Restored disclosure version**; confirm **Draft** and original **Disclosure** wording without the temporary sentence.",
            "Choose **Actions → Submit**; paste **Restoration submission comment** below, then select **Submit**.",
            "In the separate **Approver** session, select the same **Restored disclosure version**, and review the original wording.",
            "Choose **Actions → Approve**; paste **Restoration approval comment** below, then select **Submit**.",
          ],
          [
            "In the **administrator acting as publisher** session, select **Restored disclosure version** in **Content**; confirm **Approved** and original wording.",
            "Publish with **Item** and **Current language (English)** selected, and **Subitems** unchecked; select **Start publish**.",
            "While publication completes, show the original, changed, and restored versions in the **Content version selector**.",
            "Open **Page items → Product availability notice → Workflow history**; show the restored version’s submission, approval, and comments.",
          ],
          [
            `Wait for publication to complete, then reload [**public Home**](${PUBLIC}/) and Avery’s [**Agent Portal Home**](${PORTAL}/).`,
            "Confirm the temporary sentence is absent from both pages. Retain all content versions.",
          ],
        ],
        presenterResult:
          "Both Home pages show the original wording; version history retains the original, changed, and restored revisions and their approvals.",
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
