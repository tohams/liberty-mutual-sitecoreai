import type { DemoChapter } from "./types";

import {
  PUBLIC,
  SITECORE_AI,
  PORTAL,
  SEARCH_SOURCE,
  ANALYTICS,
  ARTICLE,
  GRAPHQL_EXPLORER,
  SCRUNCH_REVIEW,
  SCRUNCH_EDITOR,
  BRAND_KITS,
  portalEditor,
} from "./demo-destinations";

/** Explain AI's role in each customer journey without implying autonomous publication. */
export const customerDemoAiContext: Record<
  DemoChapter["id"],
  { demonstrated: string; nextStep: string; talkTrack: string }
> = {
  public: {
    demonstrated:
      "Search retrieves approved guidance. Published article metadata, schema, and canonical URLs help permitted search and AI engines understand the public page; structured CMS fields also support connected applications.",
    nextStep:
      "SitecoreAI assistants can help marketers draft and refine brand-aligned website copy for human review. The proposed Profound integration would bring external content proposals into the same Draft, approval, and publishing process.",
    talkTrack:
      "Published article metadata supports search and AI discovery; structured CMS fields support connected applications. SitecoreAI assistants help marketers draft and refine brand-aligned copy. Proposed Profound intake would use the same human review and publication controls.",
  },
  portal: {
    demonstrated:
      "Known profile attributes and explicit native rules use role, state licensing, and agency production to select relevant agent guidance.",
    nextStep:
      "SitecoreAI assistants and Agentic Studio can help prepare audience-specific campaign drafts. Liberty Mutual could adopt those drafts within the same human review and publication controls.",
    talkTrack:
      "Known attributes and explicit rules select the agent experience today. SitecoreAI’s available AI assistants and Agentic Studio can prepare audience-specific campaign drafts; Liberty Mutual could adopt those within the same review and eligibility controls.",
  },
};

/** Angela introduces the AI vision before the customer-prescribed live sequence. */
export const customerDemoOpening = {
  presenter: "Angela Gustafson",
  title: "AI assistance with business control",
  talkTrack: [
    "We will follow your two requested journeys in order and show three outcomes: trusted customer guidance, relevant agent priorities, and business-managed changes with clear control.",
    "First, a customer finds published guidance, and the team keeps the same source current across Search, the website, and other applications. Then, two independent agents receive priorities that reflect their roles and licensed states.",
    "Finally, marketers create, preview, review, publish, and reverse real content changes. Your teams already use Microsoft Copilot; SitecoreAI brings AI assistance into content work while people retain the decision to keep and publish a change.",
  ],
  handoff:
    "Let’s begin with the public-site visitor and the first requirement in your guide: asking an insurance question in everyday language.",
};

export const customerDemoClosing = [
  "**Trusted guidance:** one approved source stays aligned across the website, Search, and APIs.",
  "**Relevant agent experiences:** known role, licensing, and business attributes select useful priorities.",
  "**Business control:** marketers create and preview content, then review, publish, and restore it without a frontend release.",
];

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
            beforeLine: 1,
            action: 2,
            label: "Supported search question",
            value: "Can I combine home and car coverage?",
          },
          {
            beforeLine: 1,
            action: 3,
            label: "Unsupported search question",
            value: "Does car insurance cover cyberextortion?",
          },
        ],
        presenterPoints: [
          "**Say:** “Your visitors can ask a question in their own words and find useful guidance. A clear route to an agent keeps the conversation moving when published content does not answer their question.”",
          "Point to the related bundling results and the **Can I bundle my car and home insurance?** answer excerpt; leave results unopened.",
          "For the unsupported question, show **No results found** and **Contact an agent** as the clear next step.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 0 },
          { point: 2, action: 2, afterLine: 4 },
          { point: 3, action: 3, afterLine: 2 },
        ],
        actionPurposes: [
          "Start the customer’s search for insurance guidance",
          "Find relevant guidance from a natural-language question",
          "Offer an agent when the question lacks support",
        ],
        presenterActions: [
          [
            "Start in the **Public website** tab on **Home**.",
            "Select **Search** in the header.",
          ],
          [
            "Paste **Supported search question** into **Search**, then select **Search**.",
            "Wait until **Searching…** finishes.",
            "Show **How to bundle your insurance policies** and **3 tips for bundling your insurance policies**.",
            "Highlight **Can I bundle my car and home insurance?** and its answer excerpt. Keep all results unopened.",
          ],
          [
            "Replace **keyword(s)** with **Unsupported search question**, then select **Search**.",
            "Show **No results found** and **Contact an agent**. Leave the contact link unopened.",
          ],
        ],
        presenterResult:
          "The supported question returns relevant guidance; the unsupported question shows **No results found** and **Contact an agent**.",
        actions: [
          `In the **Public website** tab, open the [**public Home page**](${PUBLIC}/), and select **Search** in the header.`,
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
          "Optional measurement respects the visitor’s stored privacy preferences.",
        ],
        links: [
          {
            action: 1,
            afterLine: 0,
            label: "Public website",
            href: `${PUBLIC}/`,
          },
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
        title: "Inspect article metadata and structured content",
        label:
          "Search engines and AI answer engines can find and cite the right LM content",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 2,
        persona: "Public-site marketer",
        scenario:
          "The marketer needs a natural customer article with clear metadata, source attribution, and applicability for discovery and reuse.",
        objective:
          "Show one natural article backed by governed SEO metadata, taxonomy, and published Article schema, with structured fields available to Search and connected applications.",
        stopWhen:
          "The natural article, Search title and description, managed applicability values, canonical URL, and Article schema have been shown without changing content.",
        inputs: [
          {
            beforeLine: 2,
            action: 3,
            label: "Find structured data in page source",
            value: "application/ld+json",
          },
          {
            beforeLine: 4,
            action: 3,
            label: "Find the canonical link in page source",
            value: "canonical",
          },
        ],
        presenterPoints: [
          "**Say:** “Structured fields and metadata help search and permitted AI engines understand Liberty Mutual’s content. That makes useful guidance easier to discover while your team maintains one clear, governed source.”",
          "**Search title**, **Search description**, and the native checklists keep the page’s purpose and applicability explicit. **Question** and **Plain-language answer** supply Search and connected applications.",
          "The public page exposes **Article** schema and a canonical URL for permitted search and AI engines. Connected applications retrieve structured CMS fields through their integrations.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 1 },
          { point: 2, action: 2, afterLine: 3 },
          { point: 3, action: 3, afterLine: 4 },
        ],
        actionPurposes: [
          "Show one article’s customer copy and governed metadata",
          "Show how taxonomy identifies content applicability",
          "Inspect Article schema for permitted external discovery",
        ],
        presenterActions: [
          [
            "Switch to the **Public website** tab, and open the **Public article** URL. Briefly show **Bundling your car and home insurance** and its article copy.",
            "Switch to the existing **Page Builder** tab. If it is closed, choose **SitecoreAI → Channels → Public Website → Page builder**. Choose **Site switcher → Public Website → Editor → Pages**.",
            "In **Sitemap**, expand **Home → insurance-resources**, and select **bundle-car-and-home**. On that selected row, choose **Content tree options (•••) → Page content**. Confirm **English**.",
            "In the **Page content** panel beside the canvas, expand **Content**: show **Search title**, **Search description**, **Canonical URL**, and **Reference source**.",
            "Expand **Resource content**: point to **Question** and **Plain-language answer** as structured fields for **Search** and connected AI applications. Show **Detailed explanation**, and leave all fields unchanged.",
          ],
          [
            "In **Page content**, expand **Content**, or use **Go to field → State applicability**. Open **State applicability** using its **1 item selected** control; show **All states**, then close.",
            "Open **Products** using **2 items selected**; show **Auto** and **Homeowners**, then close.",
            "Open **Audience**; show **All consumers**, then close. Leave all selections unchanged.",
          ],
          [
            "Return to the **Public website** tab’s article. In the browser, right-click a blank area, and choose **View page source**. If the browser context menu does not offer the source command, use Chrome’s **View → Developer → View Source** menu on Mac. In the source tab, enable **Line wrap**, then press **⌘F** (Mac) or **Ctrl+F** (Windows) to open **Find**.",
            "Paste **Find structured data in page source** into **Find**.",
            "Use the first **application/ld+json** script block. Show **Article**, **headline → Bundling your car and home insurance**, **description**, and **mainEntityOfPage → @id**, which identifies the article’s canonical URL.",
            "Find **canonical** using the copy field, and show the matching **rel=canonical** link.",
            "Close the source tab, and return to the **Public website** tab.",
          ],
        ],
        presenterResult:
          "One natural article has governed search metadata, managed classifications, published **Article** schema, and a canonical URL; its structured CMS fields also support Search and connected applications.",
        actions: [
          `Open the [**public article**](${ARTICLE}), and briefly show **Bundling your car and home insurance** and its natural article copy. In **Page Builder**, choose **Site switcher → Public Website → Editor → Pages**. In **Sitemap**, expand **Home → insurance-resources**, and select **bundle-car-and-home**. On the selected row, choose **Content tree options (•••) → Page content**. Confirm **English**. In the **Page content** panel beside the canvas, expand **Content** to inspect **Search title**, **Search description**, **Canonical URL**, and **Reference source**. Expand **Resource content** to show **Question** and **Plain-language answer** as structured fields for **Search** and connected AI applications, plus **Detailed explanation**. Leave all fields unchanged.`,
          "In the same **Page content** panel, expand **Content**, or choose **Go to field → State applicability**. Locate **State applicability**, **Products**, and **Audience**. Open each field’s selection control: the collapsed labels show **1 item selected** or **2 items selected**. Show **All states** under **State applicability**, **Auto** and **Homeowners** under **Products**, and **All consumers** under **Audience**. Close each list before opening the next, and leave this approved version unchanged.",
          "Return to the **Public website** tab’s article. In the browser, right-click a blank area, and choose **View page source**. If the browser context menu does not offer the source command, use Chrome’s **View → Developer → View Source** menu on Mac. In the source tab, enable **Line wrap**, then press **⌘F** (Mac) or **Ctrl+F** (Windows) to open **Find**, and locate the first **application/ld+json** script block. Identify **Article**, **headline → Bundling your car and home insurance**, **description**, and **mainEntityOfPage → @id**. Find the **canonical** link, and compare its URL with **@id**. Close the source tab, and return to the rendered article.",
        ],
        expected: [
          "The resource page owns its natural article, governed search metadata, managed classifications, and canonical Article schema. Search and connected applications reuse its structured CMS fields.",
        ],
        talkTrack: [
          "The customer reads a natural article about bundling car and home insurance. Behind it, the marketer manages the Search title and description, canonical URL, source, and applicability on one page. Its published Article schema supports external discovery; its structured fields also serve Search and connected applications.",
          customerDemoAiContext.public.talkTrack,
        ],
        controls: [
          "The **Page content** panel keeps native resource fields and **Checklist** classifications beside the page canvas. Classification choices are maintained beneath **Data → Taxonomy**. If a template question arises, the full **Page Builder → Content → Quick Info** view identifies **PublicResourcePage**; that extra view is not needed for the live loop. Content and classifications follow the same publication into Search and the content API.",
          "The public rendering supplies **Article** schema: **headline** uses the native page **Title**, **description** uses **Search description**, and **url** and **mainEntityOfPage → @id** use **Canonical URL**. These published fields support permitted crawlers. **Question** and **Plain-language answer** remain native CMS fields for Search and connected applications through their configured APIs.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "Public article", href: ARTICLE },
          { action: 1, afterLine: 1, label: "SitecoreAI", href: SITECORE_AI },
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
          {
            file: "demo-public-page-content-metadata.png",
            afterAction: 1,
            title: "Keep SEO metadata beside the natural article",
            alt: "Native Page content Search title and Search description fields beside the public heading Bundling your car and home insurance.",
            caption:
              "**Search title** and **Search description** are native fields in **Page content**. The canvas beside them shows the natural article heading, **Bundling your car and home insurance**.",
            crop: {
              x: 300,
              y: 390,
              width: 950,
              height: 245,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
            annotations: [
              {
                x: 2.63,
                y: 20.41,
                width: 47.26,
                height: 24.49,
                label: "**Search title**",
              },
              {
                x: 2.63,
                y: 53.47,
                width: 47.26,
                height: 42.45,
                label: "**Search description**",
              },
            ],
          },
        ],
        transition:
          "Keep this same resource selected. Next, make a reviewed update and verify that Search receives the published wording automatically.",
      },
      {
        id: "public-indexing",
        title: "Keep Search current as content changes",
        label:
          "Published content is automatically indexed by enterprise search platform",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 5,
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
            beforeLine: 2,
            action: 1,
            label: "Search by term",
            value: "Can I bundle my car and home insurance?",
          },
          {
            beforeLine: 3,
            action: 2,
            label: "New resource version name",
            value: "Resource page review",
          },
          {
            beforeLine: 5,
            action: 2,
            label: "Detailed explanation — review sentence",
            value:
              "Review your options with your agent before choosing coverage.",
          },
          {
            beforeLine: 2,
            action: 3,
            label: "Repeat Search by term",
            value: "Can I bundle my car and home insurance?",
          },
        ],
        presenterPoints: [
          "**Say:** “Customers need current guidance wherever they find it. Publishing one reviewed change and keeping Search aligned reduces duplicate work for Liberty Mutual and helps visitors find the latest approved wording.”",
          "A configured **OnEnd** publication event invokes a custom synchronization service, which reads **Live Experience Edge** and updates the index through the **Search Push API**.",
          "Show the sentence absent before publication and present in Search afterward; the state, product, and audience classifications stay intact.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 0 },
          { point: 2, action: 2, afterLine: 9 },
          { point: 3, action: 3, afterLine: 4 },
        ],
        actionPurposes: [
          "Establish the clean Search record before the update",
          "Edit, approve, and publish one controlled revision",
          "Verify Search updates automatically and retains classifications",
        ],
        presenterActions: [
          [
            "In the **SitecoreAI** tab, choose **Content → Search Sources → Liberty Mutual Approved Answers → Preview**. Keep this tab as **Search Preview**.",
            "Paste **Search by term** into **Search by term**, then expand the matching row using **Toggle document details**.",
            "Confirm **body** does not contain **Review your options with your agent before choosing coverage.**",
          ],
          [
            "Return to the existing **Page Builder** tab and the **bundle-car-and-home** page kept selected from P2. Reopen **Content tree options (•••) → Page content** only if its panel is closed.",
            "In the version selector, confirm the **latest version** is **Approved** and marked **Live**. Its **Detailed explanation** must not contain the review sentence.",
            "Choose **Create version**, paste **New resource version name**, and select **Create**.",
            "Reopen the version selector, explicitly select the newest **Resource page review → Draft** row, and wait for its fields to load. Confirm **Draft**.",
            "Expand **Resource content**. Place the cursor at the end of **Detailed explanation**, and append **Detailed explanation — review sentence** exactly once. Retain all existing paragraphs; do not replace the field’s content.",
            "Press **Tab**, or click outside **Detailed explanation**, to leave the edited field and save it. Wait for **Saved**. On this same new version, choose **Actions → Submit**, then **Submit**; confirm **Awaiting approval**.",
            "Using the same presenter account, review this version’s complete content, choose **Actions → Approve**, then **Submit**; confirm **Approved**.",
            "Choose **Publish**: keep **Page** and **Current language (English)** selected; clear **Include related items** before **All references**.",
            "Leave **Subpages** unchecked, select **Start publish**, and wait for completion.",
          ],
          [
            "Return to the **Search Preview** tab, and refresh.",
            "Repeat **Search by term** using the Copy field; expand the matching row.",
            "If needed, wait and refresh until **body** contains **Review your options with your agent before choosing coverage.**",
            "Confirm **state**, **product**, and **audience** are preserved.",
          ],
        ],
        presenterResult:
          "The native Search document contains the newly published sentence, with its **state**, **product**, and **audience** unchanged.",
        actions: [
          `Open [**SitecoreAI Search → Preview**](${SEARCH_SOURCE}). Enter **Can I bundle my car and home insurance?** in **Search by term**, open the matching row with **Toggle document details**, and confirm that **Review your options with your agent before choosing coverage.** is absent.`,
          "Return to **Page Builder** for **bundle-car-and-home**, the page kept selected from P2. Reopen **Content tree options (•••) → Page content** only if its panel is closed. Confirm the **latest version** is **Approved** and marked **Live**, with the review sentence absent. Choose **Create version**, name it **Resource page review**, and select **Create**. Reopen the version selector, explicitly select the newest **Resource page review → Draft** row, and wait for its fields to finish loading. Expand **Resource content**. At the end of **Detailed explanation**, append **Review your options with your agent before choosing coverage.** exactly once, retaining all existing paragraphs. Press **Tab**, or click outside **Detailed explanation**, to leave the edited field and save it. Wait for **Saved**. On this same new version, choose **Actions → Submit**, then **Submit**, and confirm **Awaiting approval**. Using the same presenter account, review the complete content, choose **Actions → Approve**, then **Submit**, and confirm **Approved**. Choose **Publish**. **Page** is already selected. Keep **Current language (English)** selected. Clear **Include related items** first, then clear **All references**; the related-items control disappears when **All references** is cleared. Leave **Subpages** unchecked, and select **Start publish**.",
          `Wait for the publishing job to complete. Return to [**SitecoreAI Search → Preview**](${SEARCH_SOURCE}), refresh, repeat the exact title search, and expand the result. If the prior wording is still visible, allow content distribution and the automatic Search update to finish, then refresh again until the added sentence appears. Confirm that **body** contains the added sentence and that **state**, **product**, and **audience** remain correct. No manual reindex or second content edit is needed.`,
        ],
        expected: [
          "A single approved page publication updates the native Search record automatically, including the changed body and unchanged applicability metadata.",
        ],
        talkTrack: [
          "We create one fresh Draft, retain the article, and append one sentence. The same presenter account submits, reviews, and publishes that revision; separate roles normally govern those actions. Experience Edge distributes published content globally, while the configured publication flow keeps Search aligned with the approved wording and classifications. The team manages the page content once across these delivery channels.",
        ],
        controls: [
          "The **OnEnd** publication event calls the configured publication service, which reads published website content from **Live Experience Edge** and synchronizes it through the **Search Push API**. **Include in site search** selects the pages available to Search. This loop follows the resource page’s own guidance and applicability metadata.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
        ],
        images: [
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
        persona: "Public-site content administrator",
        scenario:
          "A marketer needs a new coverage page using approved components, with review before customers can see it.",
        objective:
          "Create, preview, and publish pages without an engineering ticket, using approved components and a clear review process.",
        stopWhen:
          "The new coverage-page page shows the authored headings and the shared Promotion on the public website.",
        inputs: [
          {
            beforeLine: 4,
            action: 1,
            label: "New page name",
            value: "coverage-page",
          },
          {
            beforeLine: 2,
            action: 2,
            label: "Hero heading",
            value: "Explore coverage with confidence",
          },
          {
            beforeLine: 4,
            action: 2,
            label: "Article heading",
            value: "Guidance for your next decision",
          },
          {
            beforeLine: 5,
            action: 2,
            label: "Article body",
            value:
              "Review approved information, compare your options, and speak with an agent about your needs.",
          },
          {
            beforeLine: 2,
            action: 6,
            label: "Page submission comment",
            value: "Review coverage guidance page",
          },
          {
            beforeLine: 2,
            action: 7,
            label: "Approval comment",
            value: "Approved coverage guidance",
          },
        ],
        presenterPoints: [
          "**Say:** “Your marketers can create and publish useful pages without waiting for an engineering ticket. Approved components and review controls help them move quickly while giving visitors a consistent Liberty Mutual experience.”",
          "Point to the permitted components, the reused **Promotion**, and the obvious **Image left / Image right** presentation choices.",
          "Submit, approve, and publish the page; show the same headings, image, and Promotion on the public website.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 0 },
          { point: 2, action: 4, afterLine: 5 },
          { point: 3, action: 8, afterLine: 4 },
        ],
        actionPurposes: [
          "Create a page with approved structure",
          "Write page content directly on the canvas",
          "Choose a reusable image from Modern Media Library",
          "Reuse an approved promotion and change its presentation",
          "Preview the complete page before publication",
          "Submit the page and its local content for review",
          "Approve the reviewed page",
          "Publish the page and verify the customer experience",
        ],
        presenterActions: [
          [
            "Reuse the **Page Builder** tab. If it is closed, choose **SitecoreAI → Channels → Public Website → Page builder**. Choose **Site switcher → Public Website → Editor → Pages**, then select **Home** in **Sitemap**.",
            "Confirm **Public Website**, **English**, and **Default editing host**.",
            "Choose **Home → Create a page → Landing page → Select**.",
            "Paste **New page name** into the sitemap’s editable **New page** name, then press **Enter**.",
            "Wait for **Page created from branch template**.",
          ],
          [
            "Choose **Reload tree** if shown, and wait for the refreshed **Sitemap** to finish loading. In **Sitemap**, select **coverage-page**, and wait for its matching page heading in Page Builder. If **Home** still appears, select **Home**, refresh the **Page Builder** browser tab, then reselect **coverage-page**. Confirm its page heading before editing.",
            "Keep **Editor** open. On the canvas, click the large blank **Hero → Heading**, and paste **Hero heading**.",
            "Click outside the text, and wait for **Saved**.",
            "Below the Hero, click **Article text → Heading**, and paste **Article heading**.",
            "Click the blank **Body** immediately below that heading, and paste **Article body**. Click outside, and wait for **Saved**.",
          ],
          [
            "In the **Page Builder** tab, click the **Hero image** placeholder on the canvas.",
            "In the right-hand **Image** panel, choose **Browse media library → Media BETA** to open the **Modern Media Library**.",
            "Select **liberty-mutual-public-family-basketball.jpg**, then choose **Insert** in its image details.",
            "Confirm the family photograph appears beside the Hero heading, and wait for **Saved**.",
          ],
          [
            "In the **Page Builder** tab, open **Layers → headless-public-content-1 → Insert into** immediately after **Article text**.",
            "Show the permitted choices; choose **Promotions → Promotion → Bundle and save**.",
            "Select **Assign**, rather than **Duplicate and assign**.",
            "With **Promotion** selected, choose **Design → Variant → Image left**, then **Image right**.",
            "On desktop, confirm the photograph switches sides while the copy stays the same. On mobile, both variants keep the image above the text.",
          ],
          [
            "In the **Page Builder** toolbar, choose **Preview** to open the calendar popup, then select **Preview** in that popup. The page preview opens in a new tab.",
            "Confirm both headings, the Hero image, and the shared Promotion. Close the preview tab, and return to **Page Builder**. Keep the page unpublished.",
          ],
          [
            "In the **Page Builder** tab, select **coverage-page**, then choose **Actions → Submit**.",
            "Paste **Page submission comment**, then select **Submit**.",
            "Confirm the page is **Awaiting approval**. Its local Hero and Article text follow the page through review.",
          ],
          [
            "Stay on **coverage-page** in **Page Builder**, and review the page on its canvas.",
            "Choose **Actions → Approve**; paste **Approval comment**, then select **Submit**.",
            "Confirm **Approved**.",
          ],
          [
            "On the same **coverage-page** in **Page Builder**, choose **Publish**.",
            "Select **Page**, **Current language (English)**, **All references**, and **Include related items**. Leave **Subpages** unchecked; select **Start publish**.",
            "Wait for publication to complete.",
            "Switch to the **Public website** tab, open the **Published page** URL, and confirm both headings, the Hero image, and the shared Promotion.",
          ],
        ],
        presenterResult:
          "The published **coverage-page** page shows both authored headings, the selected Hero image, and the reused Promotion.",
        actions: [
          "In **Page Builder**, choose **Site switcher → Public Website → Editor → Pages**, then select **Home** in **Sitemap**. Confirm **English** and **Default editing host**. Choose **Home → Create a page → Landing page → Select**. Paste **New page name** below into the sitemap’s editable **New page** name, then press **Enter**. Wait for **Page created from branch template**.",
          "Choose **Reload tree** if shown, and wait for the refreshed **Sitemap** to finish loading. In **Sitemap**, select **coverage-page**, and wait for its matching page heading in Page Builder. If **Home** still appears, select **Home**, refresh the **Page Builder** browser tab, then reselect **coverage-page**. Confirm its page heading before editing. Keep **Editor** open. On the canvas, click the large blank **Hero → Heading**, and paste **Hero heading** below. Click outside the text, and wait for **Saved**. Below the Hero, click **Article text → Heading**, and paste **Article heading** below. Click the blank **Body** immediately below that heading, and paste **Article body** below. Click outside, and wait for **Saved**.",
          "In the **Page Builder** tab, click the **Hero image** placeholder on the canvas. In the right-hand **Image** panel, choose **Browse media library → Media BETA** to open the **Modern Media Library**. Select **liberty-mutual-public-family-basketball.jpg**, then choose **Insert** in its image details. Confirm the family photograph appears beside the Hero heading, and wait for **Saved**.",
          "In the **Page Builder** tab, open **Layers → headless-public-content-1 → Insert into** immediately after **Article text**. Show the permitted choices; choose **Promotions → Promotion → Bundle and save**. Select **Assign**, rather than **Duplicate and assign**. With **Promotion** selected, choose **Design → Variant → Image left**, then **Image right**. On desktop, confirm the photograph switches sides while the copy stays the same. On mobile, both variants keep the image above the text.",
          "In the **Page Builder** toolbar, choose **Preview** to open the calendar popup, then select **Preview** in that popup. The page preview opens in a new tab. Confirm both headings, the Hero image, and the shared Promotion. Close the preview tab, and return to **Page Builder**. Keep the page unpublished.",
          "In the **Page Builder** tab, select **coverage-page**, then choose **Actions → Submit**. Paste **Page submission comment** below, then select **Submit**. Confirm the page is **Awaiting approval**. Its local Hero and Article text follow the page through review.",
          "Stay on **coverage-page** in **Page Builder**, and review the page on its canvas. Choose **Actions → Approve**; paste **Approval comment** below, then select **Submit**. Confirm **Approved**.",
          `On the same **coverage-page** in **Page Builder**, choose **Publish**. Select **Page**, **Current language (English)**, **All references**, and **Include related items**. Leave **Subpages** unchecked; select **Start publish**. After completion, switch to the **Public website** tab, open [**the published coverage page**](${PUBLIC}/coverage-page), and confirm both headings, the Hero image, and the shared Promotion.`,
        ],
        expected: [
          "The new page is previewed and published without code changes, using approved components, independent local content, a reused Promotion, and the configured review workflow.",
        ],
        talkTrack: [
          "The same publishing controls also support a complete page. The marketer starts with an approved structure and permitted components. Local copy remains independently editable, while the shared Promotion is reused. We submit, approve, and publish the page without a frontend deployment. I’m using one SitecoreAI administrator account to move through these steps quickly; production teams normally assign authoring, approval, and publishing permissions to separate roles.",
        ],
        controls: [
          "**Landing page** creates local **Hero** and **Introduction** items. Placeholder settings restrict the available components. **Assign** reuses the existing Promotion; **Image left** and **Image right** change only its presentation. Both place the image above the text on mobile.",
          "The configured workflow is **Draft → Awaiting approval → Approved**. The page’s local content moves with it through review, and a separate publishing action releases the approved page. Shared Promotions retain their own review.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
          {
            action: 8,
            afterLine: 3,
            label: "Published page — open after publishing",
            href: `${PUBLIC}/coverage-page`,
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
            afterAction: 4,
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
            afterAction: 4,
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
            file: "demo-public-page-preview-menu.png",
            title: "Open the unpublished page preview",
            alt: "Use the eye-shaped Preview control, then choose Preview in its menu to inspect the page before publication.",
            caption:
              "Use the eye-shaped **Preview** control, then choose **Preview** in its menu to inspect the page before publication.",
            afterAction: 5,
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
            afterAction: 6,
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
        presenterPoints: [
          "**Say:** “Liberty Mutual can turn external content recommendations into improvements while retaining editorial control. We’re showing the existing **Scrunch** pattern; a **Profound** integration could bring proposals into the same review and publishing process.”",
          "For **Profound**, a scoped integration could bring proposed content into **Draft**, followed by human editing, review, approval, and publication.",
        ],
        presenterCues: [
          { point: 1, action: 3, afterLine: 5 },
          { point: 2, action: 4, afterLine: 3 },
        ],
        actionPurposes: [
          "Open the existing Scrunch recommendation example",
          "Compare live copy with the proposed improvement",
          "Locate that recommendation in the authoring field",
          "Explain proposed Profound intake and human review",
        ],
        presenterActions: [
          [
            "Switch to the **Prospera recommendations** tab in the **Incognito / Private** window. Confirm **agverticals → Prospera**.",
            "Under **Readability & Clarity**, open the **Home** recommendations. Keep this example read-only.",
          ],
          [
            "Find **Cards · Description**; compare the existing wording under **Original content** with the proposed wording under **Suggested content**.",
            "Point to **trackable rewards** and **card options side by side**.",
            "Leave **Apply**, **Apply all**, and **Dismiss** untouched.",
          ],
          [
            "Beside **Cards · Description**, select the **page-opening icon** to the right of **Select**, labeled **Open in Page Builder**. Switch to the **Prospera Page Builder** tab that opens in the same **Incognito / Private** window.",
            "Show **AEO opportunities** and **Powered by Scrunch**.",
            "On **Cards · Description**, choose **Show live content** if needed.",
            "Compare **Recommended | Rewritten** with **Live content**, then select **Scroll to content**.",
            "Show the outlined field. Do not apply, dismiss, edit, or publish.",
          ],
          [
            "Stay in the **Prospera Page Builder** tab in the **Incognito / Private** window.",
            "Explain: a marketer can accept a recommendation, refine the editable copy, and follow the content’s configured review and approval before publication.",
            "For **Profound**, explain the proposed authoring-API intake into **Draft**, followed by human review, approval, and publication. Keep this example read-only; leave **Apply**, **Apply all**, **Dismiss**, and **Publish** untouched.",
          ],
        ],
        presenterResult:
          "Show the recommendation, its target field, and the proposed Profound-to-review path; leave Prospera unchanged.",
        actions: [
          `Open the prepared [**Prospera AEO recommendation review**](${SCRUNCH_REVIEW}) tab. Confirm the **agverticals** environment and **Prospera** site. Under **Readability & Clarity**, review the **Home** page recommendations. This is the existing integrated recommendation example. Keep it read-only.`,
          "Locate **Cards · Description**. Compare the existing wording under **Original content** with the proposed wording under **Suggested content**. Point out **trackable rewards** and **card options side by side** as examples of clearer phrasing. Leave **Apply**, **Apply all**, and **Dismiss** untouched.",
          `Use **Open in Page Builder** on that recommendation, or open the prepared [**same recommendation in Page Builder**](${SCRUNCH_EDITOR}). Show the **AEO opportunities** panel and **Powered by Scrunch** label beside the page. On **Cards · Description**, choose **Show live content** if the existing copy is collapsed. Compare **Recommended | Rewritten** with **Live content**, then select **Scroll to content**. The corresponding field is outlined on the page. Inspect it without applying the recommendation or changing the page.`,
          "Stay in the **Prospera Page Builder** tab in the **Incognito** window. Explain that a marketer can accept a recommendation into editable content, refine the wording, and follow the configured human review and approval workflow before publication. Show the recommendation beside its page field; do not apply it, edit the page, or publish. For Liberty Mutual’s requested Profound integration, this is the intended review pattern.",
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
            action: 1,
            afterLine: 0,
            label: "Prospera recommendations — Private window",
            href: SCRUNCH_REVIEW,
          },
        ],
        images: [
          {
            file: "demo-aeo-recommendation-review.png",
            title: "Compare the existing and proposed wording",
            alt: "Native AEO recommendation for Cards Description with existing wording above and proposed clearer phrasing below.",
            caption:
              "**Cards · Description** identifies the target component and field. Compare the existing wording under **Original content** with the proposed wording under **Suggested content**. The **Open in Page Builder** icon launches the same recommendation in **Page Builder**.",
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
        durationMinutes: 2,
        persona: "Public-site marketer",
        scenario:
          "The marketer needs to understand website page views and the next-step actions visitors select.",
        objective:
          "Show how marketers can measure defined visitor actions alongside page views using actual public-site events.",
        stopWhen:
          "The public-site report shows pageView and LM_PUBLIC_CTA_CLICK over the past month, and the presenter explains the visitor action represented by the custom event.",
        presenterPoints: [
          "**Say:** “Your team can see which content people visit and which next steps they choose. That gives Liberty Mutual evidence to prioritize improvements around useful customer actions as well as page views.”",
          "**pageView** measures page views; **LM_PUBLIC_CTA_CLICK** records selections of defined next-step buttons and links.",
          "Recorded visitor choices automatically govern optional measurement and personalization.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 3 },
          { point: 2, action: 2, afterLine: 3 },
          { point: 3, action: 3, afterLine: 2 },
        ],
        actionPurposes: [
          "Focus analytics on the site and reporting period",
          "Read actual page views and CTA engagement",
          "Connect a custom event to a business action",
        ],
        presenterActions: [
          [
            "In the **SitecoreAI** tab, choose **Optimization → Analytics → Events**. If the left navigation is collapsed, choose **Expand navigation** first. Keep this tab as **Events**.",
            "Set **Site → liberty-mutual-public-site** and **Time → 1 month**.",
            "Under **Event Type**, select only **pageView** and **LM_PUBLIC_CTA_CLICK**; clear all other event checkboxes.",
          ],
          [
            "Show **Events over Time** and **Events Table**.",
            "Find the actual **pageView** and **LM_PUBLIC_CTA_CLICK** rows.",
            "Read the values shown for the selected site and reporting period.",
          ],
          [
            "Explain: **LM_PUBLIC_CTA_CLICK** records a visitor’s selection of a defined next-step button or link.",
            "Show that the custom business action can be measured alongside **pageView** page views.",
          ],
        ],
        presenterResult:
          "The public-site report shows actual page views and defined CTA selections over the past month.",
        actions: [
          `Switch to the prepared **Events** tab, or open [**Optimization → Analytics → Events**](${ANALYTICS}). Set **Site → liberty-mutual-public-site** and **Time → 1 month**. Under **Event Type**, select only **pageView** and **LM_PUBLIC_CTA_CLICK**; clear all other event checkboxes.`,
          "Inspect **Events over Time** and **Events Table**. Identify the actual **pageView** and **LM_PUBLIC_CTA_CLICK** rows, and read the values shown for the selected site and reporting period.",
          "Explain that **LM_PUBLIC_CTA_CLICK** is a custom event for a visitor’s selection of a defined next-step button or link. Show that this business action can be measured alongside **pageView** page views.",
        ],
        expected: [
          "A marketer can inspect the public site’s recorded page views and custom business actions in SitecoreAI over the selected monthly reporting period.",
        ],
        talkTrack: [
          "Marketers can measure website page views and the actions that matter to Liberty Mutual. Here, pageView records page views, and the defined LM_PUBLIC_CTA_CLICK event records selections of next-step buttons and links. Custom events let the team name and measure meaningful business actions. This report shows the public site’s actual recorded activity over the past month.",
        ],
        controls: [
          "The **Site** filter separates the Public Website from the Agent Portal. **Time → 1 month** defines the reporting period, and **Event Type** checkboxes focus the report on **pageView** and **LM_PUBLIC_CTA_CLICK**. The native report supplies the recorded rows and totals.",
          "The application defines **LM_PUBLIC_CTA_CLICK** and sends it through the **Sitecore Content SDK** after the visitor allows optional measurement. **SitecoreAI** displays the received custom events alongside page views. Liberty Mutual’s Tealium architecture remains part of the integration discussion.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
        ],
        images: [
          {
            file: "demo-public-events-month.png",
            afterAction: 1,
            title: "Filter the public site’s monthly events",
            alt: "Native SitecoreAI Events view with liberty-mutual-public-site selected, Time set to 1 month, and Event Type limited to LM_PUBLIC_CTA_CLICK and pageView",
            caption:
              "Set **Site → liberty-mutual-public-site** and **Time → 1 month**. Under **Event Type**, select only **pageView** and **LM_PUBLIC_CTA_CLICK**; clear all other event checkboxes.",
            crop: {
              x: 64,
              y: 110,
              width: 1190,
              height: 308,
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
        title: "Retrieve approved content through native GraphQL",
        label: "Decoupled delivery with a stable content API",
        phase: "Measurement & Delivery Foundation",
        sourceSlide: 10,
        durationMinutes: 2,
        persona: "Content team supporting another digital experience",
        scenario:
          "Another application needs the same approved guidance without maintaining another copy.",
        objective:
          "Show how any application can retrieve the same published page fields through Experience Edge’s native GraphQL API.",
        stopWhen:
          "The native GraphQL response shows the same page ID, published version, question, answer, and Detailed explanation, including the sentence published in P3.",
        inputs: [
          {
            beforeLine: 2,
            action: 2,
            label: "HTTP headers",
            value: `{
  "sc_apikey": "<Delivery API token>"
}`,
          },
          {
            beforeLine: 3,
            action: 2,
            label: "GraphQL query",
            value: `query PublishedCoverageGuidance {
  item(path: "{AE109FC0-B508-5840-97EB-0B2C02AE1A9B}", language: "en") {
    id
    name
    version
    question: field(name: "question") { value }
    answer: field(name: "answer") { value }
    explanation: field(name: "explanation") { value }
    source: field(name: "sourceLink") { jsonValue }
  }
}`,
          },
        ],
        presenterPoints: [
          "**Say:** “One approved source can serve the website and other applications. Liberty Mutual can reuse guidance without maintaining competing copies, and each channel can present that content in the way its audience needs.”",
          "Point to the same page ID, published version, and newly published sentence in the live GraphQL response.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 2 },
          { point: 2, action: 3, afterLine: 2 },
        ],
        actionPurposes: [
          "Show where Experience Edge delivers approved content",
          "Retrieve the published page through native GraphQL",
          "Verify the API and website use the same revision",
          "Explain reuse by other applications without duplicate content",
        ],
        presenterActions: [
          [
            "Return to the already-open presentation, and show **Experience Edge content delivery**.",
            "Trace **SitecoreAI authoring → Publish → Experience Edge → API consumers**.",
          ],
          [
            "Switch to the **GraphQL Explorer** tab; its **HTTP HEADERS** already contain the **Live Delivery API token** configured in **P0**.",
            "Keep **HTTP HEADERS** configured with your **Live Delivery API token**, using the **HTTP headers** copy field if needed.",
            "Copy **GraphQL query**, replace the existing text in the left **Query** editor, and select the triangular **Run** button.",
          ],
          [
            "In the response on the right, show **id**, **version**, **question**, **answer**, **explanation**, and **source**.",
            "Find **Review your options with your agent before choosing coverage.** in **explanation**.",
            "Switch to the **Public website** tab, open the **Public article** URL, and compare the wording. Return to **GraphQL Explorer**.",
          ],
          [
            "Explain that the front end, LibertyAir, or any other application can retrieve these same published fields through the native API.",
            "Finish on the actual response: one approved page, available to multiple experiences without another content copy.",
          ],
        ],
        presenterResult:
          "The native GraphQL response and public article show the same published guidance and added sentence, with the resource page’s ID, published version, and source.",
        actions: [
          "Show **Experience Edge content delivery** in [**the shared presentation**](https://sitecore1.sharepoint.com/:p:/s/Ops/cQoDg9wZPRa8Tb3nJmHAOX-TEgUCuSmQQA7MGbe1g6C_LnOG3A). Trace **SitecoreAI authoring → Publish → Experience Edge → API consumers**.",
          `Open the prepared [**GraphQL Explorer**](${GRAPHQL_EXPLORER}). Its **HTTP HEADERS** must use the **Live Delivery API token** configured in **P0**, not Preview. Use the **HTTP headers** copy field below if needed. Copy **GraphQL query** below, replace the existing text in the left **Query** editor, and select the triangular **Run** button.`,
          `In the response on the right, identify **id**, **version**, **question**, **answer**, **explanation**, and **source**. Find **Review your options with your agent before choosing coverage.** in **explanation**, and briefly compare it with [**the public article**](${ARTICLE}). Return to **GraphQL Explorer**.`,
          "Explain that the front end, LibertyAir, or any other application can retrieve these same published fields through the native API. Finish on the actual response; no additional application demonstration is needed.",
        ],
        expected: [
          "Experience Edge’s native GraphQL API returns the same approved, published page fields used by the public website.",
        ],
        talkTrack: [
          "Content teams manage and approve content in SitecoreAI. Publishing sends that content to Experience Edge, Sitecore’s globally distributed content delivery service. Websites and other applications retrieve it through APIs. That lets Liberty Mutual reuse one approved source across experiences, while publishing content independently of application deployments.",
          "This is the native GraphQL response for the same car-and-home page. Its ID, published version, guidance, and source come directly from Live Experience Edge, including the sentence we just published. The website, LibertyAir, or another application can retrieve these fields without maintaining another copy of the content.",
        ],
        controls: [
          "**GraphQL Explorer** queries **Live Experience Edge** using a generated **Delivery API token** in the **sc_apikey** HTTP header. The token is configured locally before the demonstration; it is not part of the query or link.",
          "The query selects the resource page by its stable item ID and English language. **version** identifies its published content version. Draft and Preview content remain in authoring.",
        ],
        links: [
          {
            action: 2,
            afterLine: 0,
            label: "GraphQL Explorer",
            href: GRAPHQL_EXPLORER,
          },
          { action: 3, afterLine: 2, label: "Public article", href: ARTICLE },
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
        durationMinutes: 3,
        persona:
          "Independent agents Daniel and Avery, followed by a portal marketer",
        scenario:
          "Agents with different roles, licensed states, and agency context need priorities relevant to their business.",
        objective:
          "Start with Daniel’s producer priorities, contrast Avery’s principal priorities, then follow Avery’s profile into the native personalization test and state business rule.",
        stopWhen:
          "Daniel and Avery’s different priorities are visible, Avery matches the native agency-growth rule using her own Client ID, and the published Texas and Illinois conditions are shown.",
        presenterPoints: [
          "**Say:** “Independent agents have a choice of carriers. Guidance that reflects their role, licensed states, and business priorities helps them find a useful next conversation with Liberty Mutual and makes the portal easier to use.”",
          "Compare the ordered recommendations and licensed states: Daniel sees household guidance first; Avery sees agency growth first.",
          "Follow Avery’s **Client ID** into the native **agency-growth** test, then show the Texas / Illinois business conditions behind the experiences.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 0 },
          { point: 2, action: 2, afterLine: 3 },
          { point: 3, action: 5, afterLine: 4 },
        ],
        actionPurposes: [
          "Show Daniel’s producer baseline for comparison",
          "Show Avery’s agency-growth priorities for comparison",
          "Identify Avery’s native profile for an exact test",
          "Prove Avery matches the agency-growth personalization",
          "Explain the state and business conditions behind the result",
        ],
        presenterActions: [
          [
            "Switch to the **Daniel portal** tab, and select **My workspace** in the left navigation. Confirm **daniel.01 → Daniel Ortiz → Prairie Oak Insurance**.",
            "Read his three priorities in order: **Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice**.",
            "Open **Your profile**; show the producer role and **Licensed states: Illinois and Texas**. Choose **Close dialog**.",
          ],
          [
            "Switch to the separate **Avery portal** tab, and select **My workspace** in the left navigation. Confirm **avery.01 → Avery Brooks → Cedar Ridge Insurance**.",
            "Contrast her principal priorities: **Build a stronger small-business practice → Support workers’ compensation conversations in Texas → Connect home and auto conversations**.",
            "Open **Your profile**; show the principal role and **Licensed states: Texas, Illinois, and Florida**. Choose **Close dialog**.",
          ],
          [
            "In the **SitecoreAI** tab, choose **Optimization → Profiles**. Under **Most recent users**, open the first, most recent **Avery Brooks - 01** row from the portal login you just showed, normally marked **Now**. Identical names farther down are historical profiles. Keep this tab as **Profiles**; leave the separate **Page Builder** tab open.",
            "Choose **Toggle menu → Inspect → JSON view**. Copy the first UUID in **clientIds**, without quotation marks, then close **Inspect profile**. This **Client ID** identifies Avery for the native rule test.",
          ],
          [
            "Switch to **Page Builder**. If it is closed, choose **SitecoreAI → Channels → Agent Portal → Page builder**. Choose **Site switcher → Agent Portal → Editor → Pages → Home**, keep **Default editing host**, then choose **Layers → Agency priorities**.",
            "Choose **Edit personalization rules → Liberty Mutual - Agency product priorities**.",
            "In the Builder, choose **Select profile → Load profile → Client ID**; paste Avery’s copied **Client ID**, then press **Enter**.",
            "Wait for **Testing as: Avery Brooks - 01**; select **Test**, and confirm green **agency-growth**. Choose **Cancel** after this read-only test.",
          ],
          [
            "In the **SitecoreAI** tab, choose **Optimization → Custom values → Liberty Mutual - Agency product priorities**. Show the published rule without editing it.",
            "Point to Avery’s matching **agency-growth** condition: **principal**, **licensedInTexas === true**, and agency small-commercial share below **20%**.",
            "Show the **producer-priorities** branch behind Daniel’s earlier experience: **producer**, **licensedInIllinois === true**, small-commercial specialization, and positive agent small-commercial production.",
            "Explain that these known licensing and business attributes select relevant guidance. Leave the published rule unchanged.",
          ],
        ],
        presenterResult:
          "Daniel’s producer-first baseline contrasts with Avery’s principal experience. Avery’s own native profile test matches **agency-growth**, and the published rule shows the role, licensing, and production conditions behind both experiences.",
        actions: [
          `Switch to the **Daniel portal** tab, and open [**portal home**](${PORTAL}/). Confirm **daniel.01 → Daniel Ortiz → Prairie Oak Insurance**. Read his three priorities in order: **Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice**. Open **Your profile**; show the producer role and **Licensed states: Illinois and Texas**, then choose **Close dialog**.`,
          `Switch to the separate **Avery portal** tab, and open [**portal home**](${PORTAL}/). Confirm **avery.01 → Avery Brooks → Cedar Ridge Insurance**. Contrast her principal priorities: **Build a stronger small-business practice → Support workers’ compensation conversations in Texas → Connect home and auto conversations**. Open **Your profile**; show the principal role and **Licensed states: Texas, Illinois, and Florida**, then choose **Close dialog**.`,
          "In the **SitecoreAI** tab, choose **Optimization → Profiles**. Under **Most recent users**, open the first, most recent **Avery Brooks - 01** row from the portal login you just showed, normally marked **Now**. Identical names farther down are historical profiles. Choose **Toggle menu → Inspect → JSON view**. Copy the first UUID in **clientIds**, without quotation marks, then close **Inspect profile**. This **Client ID** identifies Avery for the native rule test. Keep the separate **Page Builder** tab open.",
          `Switch to **Page Builder**, and open [**Agent Portal Home**](${portalEditor}); keep **Default editing host**, then choose **Layers → Agency priorities → Edit personalization rules → Liberty Mutual - Agency product priorities**. Choose **Select profile → Load profile → Client ID**; paste Avery’s copied **Client ID**, then press **Enter**. Wait for **Testing as: Avery Brooks - 01**, select **Test**, and confirm green **agency-growth**. Choose **Cancel** after this read-only test.`,
          "In the **SitecoreAI** tab, choose **Optimization → Custom values → Liberty Mutual - Agency product priorities**. Show the published rule without editing it. Point to Avery’s matching **agency-growth** condition: **principal**, **licensedInTexas === true**, and agency small-commercial share below **20%**. Show the **producer-priorities** branch behind Daniel’s earlier experience: **producer**, **licensedInIllinois === true**, small-commercial specialization, and positive agent small-commercial production. Explain that these known licensing and business attributes select relevant guidance. Leave the published rule unchanged.",
        ],
        expected: [
          "Daniel’s producer priorities and Avery’s principal priorities differ. Avery’s native profile test and the published custom value reveal the role, licensed-state, and production conditions behind those experiences.",
        ],
        talkTrack: [
          "Daniel’s producer priorities lead with household conversations. Avery’s principal priorities lead with agency growth. We stay with Avery, inspect her profile, and test her exact visitor ID. The published rule combines Texas licensing and a principal role with agency production; its Illinois producer branch explains Daniel’s earlier experience. Liberty Mutual can keep Ping for sign-in and supply this context from its existing systems.",
          customerDemoAiContext.portal.talkTrack,
        ],
        controls: [
          "The published **Liberty Mutual - Agency product priorities** custom value uses known UDL attributes: **principal**, **licensedInTexas = true**, and agency small-commercial share below **20%** return **agency-growth**; **producer**, **licensedInIllinois = true**, small-commercial specialization, and positive agent small-commercial production return **producer-priorities**. Unmatched profiles receive **neutral**.",
          "The rule requires an identified **liberty-mutual-agent** profile, **USD** production currency, and **agency** production scope. Agency small-commercial share is small-commercial production divided by personal plus small-commercial production. The application separately enforces licensed-state eligibility alongside the content personalization.",
          "The priority Builder loads a visitor through **Load profile → Client ID**. Find that UUID in the native profile’s **Inspect → JSON view → clientIds**; the **Profile ID** in the browser URL is a different identifier. Inspect Avery’s current profile in **A1**, and use her **Client ID** throughout the native test.",
          "These read-only checks inspect the existing configuration and do not publish or change a rule.",
        ],
        links: [
          {
            action: 1,
            afterLine: 0,
            label: "Agent Portal",
            href: `${PORTAL}/`,
          },
          { action: 3, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
        ],
        images: [
          {
            file: "customer-demo-priorities.png",
            afterAction: 2,
            title: "Find Priorities for your agency",
            alt: "Avery's portal dashboard with Priorities for your agency below the agency overview and the small-business and Texas guidance cards",
            caption:
              "On **My workspace**, find **Priorities for your agency** below the agency overview. After Daniel’s household-first baseline, Avery’s principal experience leads with **Build a stronger small-business practice**.",
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
            file: "demo-state-business-rule.png",
            afterAction: 5,
            title: "Show the known-state business conditions",
            alt: "Published native custom value with Texas licensing required for principal growth guidance and Illinois licensing required for producer priorities.",
            caption:
              "The **Published**, **View only** rule checks **licensedInTexas** for principal growth guidance and **licensedInIllinois** for producer priorities, alongside the stated business attributes. Leave the rule unchanged.",
            crop: {
              x: 24,
              y: 110,
              width: 1240,
              height: 440,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
            annotations: [
              {
                x: 4,
                y: 45,
                width: 62,
                height: 8,
                label: "Texas licensing and principal role",
              },
              {
                x: 4,
                y: 74,
                width: 65,
                height: 18,
                label: "Illinois licensing and producer context",
              },
            ],
          },
        ],
        transition:
          "The agents receive priorities that fit their business. Next, show how shared design keeps those relevant experiences consistently on brand.",
      },
      {
        id: "portal-design",
        title: "Create on-brand content within a governed design",
        label: "Agent sees consistent brand and design across all portal pages",
        phase: "Agent Experience",
        sourceSlide: 11,
        durationMinutes: 2,
        persona: "Independent agent, followed by a portal marketer",
        scenario:
          "Marketers need to create clear, on-brand copy while the portal keeps a consistent design across pages.",
        objective:
          "Show the Brand Kit’s role in AI-assisted writing, then demonstrate how editable content remains separate from reusable design and governed component choices.",
        stopWhen:
          "The sample Brand Kit, field-level AI writing assistance, and permitted component choices are visible, with no content changes kept or published.",
        inputs: [
          {
            beforeLine: 3,
            action: 2,
            label: "AI writing prompt",
            value:
              "Expand this brief introduction into a welcoming 35–45-word paragraph for an independent insurance agent. Use three short sentences, starting with “Build your next opportunity.” Address the agent as “you,” and focus on exploring product conversations and useful resources to grow their agency.",
          },
        ],
        presenterPoints: [
          "**Say:** “Your marketers can create clearer, on-brand content more efficiently. **Brand Kit** guidance, **Content Copilot**, and approved components help the team focus on the message while agents receive a consistent, professional portal experience.”",
          "Compare the expanded introduction with the short original, check its meaning, then **Revert to original**: the author decides what to retain.",
          "Point to the allowed component choice: governed structure keeps the agent experience consistent while marketers edit content.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 2 },
          { point: 2, action: 2, afterLine: 4 },
          { point: 3, action: 3, afterLine: 2 },
        ],
        actionPurposes: [
          "Show the Brand Kit that guides AI-assisted writing",
          "Review an expanded introduction and retain author control",
          "Show the component choices that govern page design",
        ],
        presenterActions: [
          [
            "In the **SitecoreAI** tab, choose **Design → Brand kits**.",
            "Select **Published → Liberty Mutual — Independent Agents → Sections → Tone of Voice**.",
            "Explain that a Brand Kit supplies reusable voice and messaging guidance for AI-assisted content generation. Leave the kit unchanged.",
          ],
          [
            "Return to the existing **Page Builder** tab. If it is closed, choose **SitecoreAI → Channels → Agent Portal → Page builder**. Choose **Site switcher → Agent Portal → Editor → Pages → Home**. Confirm **English** and **Default editing host**.",
            "Choose **Layers → Agency priorities → Introduction**, or click the paragraph beneath **Priorities for your agency**. Confirm **Introduction** in the right panel.",
            "Select **Optimize with AI**; point to **Adhere to brand kit**, then paste **AI writing prompt** into **Ask AI for content improvements**, and select **Generate content**.",
            "When **Ready!** appears, look for **Build your next opportunity.** and a visibly longer paragraph. Compare the new wording with the original, and check that its meaning is preserved without new claims.",
            "Choose **Revert to original**, and confirm the original wording returns. Leave **Keep optimized**, **A/B/n test**, and **Publish** untouched.",
          ],
          [
            "Open **Layers → headless-agency-priorities**, and select **Insert into** before or after **Agency priorities**.",
            "Show **Components → Business priorities → Agency priorities** as the permitted choice.",
            "Close the picker without inserting content.",
            "Explain: authors change content; reusable components control its presentation, page designs supply shared structure, and placeholder settings govern composition.",
          ],
        ],
        presenterResult:
          "The Brand Kit guides content creation, native AI assistance operates on an editable field, and governed components preserve a consistent design. No generated change is kept or published.",
        actions: [
          `Switch to the prepared [**Brand Kit**](${BRAND_KITS}) tab, or navigate **Design → Brand kits**. Open **Published → Liberty Mutual — Independent Agents → Sections → Tone of Voice**. Explain that a Brand Kit supplies reusable voice and messaging guidance for AI-assisted content generation, and leave the kit unchanged.`,
          `In **Page Builder**, choose **Site switcher → Agent Portal → Editor → Pages → Home**, or open [**Agent Portal Home**](${portalEditor}). Confirm **English** and **Default editing host**. Choose **Layers → Agency priorities → Introduction**, or click the paragraph beneath **Priorities for your agency**; confirm **Introduction** in the right panel. Select **Optimize with AI**, and point to **Adhere to brand kit**. Paste **AI writing prompt** below into **Ask AI for content improvements**, and select **Generate content**. When **Ready!** appears, look for **Build your next opportunity.** and a visibly longer paragraph. Compare the new wording with the original, and check that its meaning is preserved without new claims. Select **Revert to original**, and confirm the original wording returns. Leave **Keep optimized**, **A/B/n test**, and **Publish** untouched.`,
          "In **Layers**, find **headless-agency-priorities**, and choose its **Insert into** button before or after **Agency priorities**. The filtered **Components** picker shows **Business priorities → Agency priorities** for this placeholder. Close the picker without selecting a component or inserting content. Explain that authors change content; reusable components control presentation, page designs supply shared structure, and placeholder settings limit which components fit each area.",
        ],
        expected: [
          "Marketers can use brand guidance and native AI assistance while editing content, with reusable design and restricted component choices preserving a consistent portal.",
        ],
        talkTrack: [
          "We assembled a sample Liberty Mutual Brand Kit with reusable voice and messaging guidance for AI-assisted writing. Content Copilot helps an author refine copy directly in Page Builder, with human review before keeping the result. Content and design remain separate: authors manage words and images, content templates define the fields, reusable components control presentation, and page designs arrange those components. Placeholder settings limit the permitted choices. Marketers can work faster while agents receive a consistent Liberty Mutual experience.",
        ],
        controls: [
          "**Page designs**, **partial designs**, native renderings, and **placeholder settings** govern reusable structure and permitted composition. Content edits remain separate from component code.",
          "The sample **Brand Kit** collects reusable visual and voice guidance for AI-assisted writing. **Optimize with AI** offers **Adhere to brand kit** alongside writing improvements. The author reviews the suggestion; **Revert to original** restores the field without keeping the generated wording or publishing it.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
        ],
        images: [
          {
            file: "demo-ai-field-copilot.png",
            title: "Open AI writing assistance for the Introduction field",
            alt: "Page Builder’s Introduction field with the Optimize with AI menu, Ask AI for content improvements prompt, Generate content button, and writing-improvement actions.",
            caption:
              "Select **Layers → Agency priorities → Introduction**. In the right panel, choose **Optimize with AI**, enter the prompt in **Ask AI for content improvements**, and select **Generate content**. Review the new opening and visibly longer paragraph, then choose **Revert to original**.",
            afterAction: 2,
            crop: {
              x: 800,
              y: 80,
              width: 470,
              height: 480,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
          },
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
            afterAction: 1,
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
        persona: "Portal content administrator",
        scenario:
          "For a Texas workers’ compensation campaign, the business wants approved Texas guidance to lead the principal audience’s priorities without requesting a code change.",
        objective:
          "Part 1 of the priority-change loop: save the new order as a Draft, ready for review, approval, and publication in the next step.",
        stopWhen:
          "Checkpoint: the Texas-first Draft is saved, the original approved version remains intact, and the live experience is unchanged. Continue with the personalization-preview demonstration and the review/publication actions to complete this priority-change loop.",
        inputs: [
          {
            beforeLine: 3,
            action: 2,
            label: "New priority version name",
            value: "Texas guidance priority",
          },
        ],
        presenterPoints: [
          "**Say:** “When priorities change, your marketers can adjust what agents see without waiting for a code release. Putting the Texas campaign first helps eligible agency principals focus on Liberty Mutual’s current growth opportunity.”",
          "Change the actual **Ordered recommendations** in a new **Draft**; the original approved version and live order remain intact.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 0 },
          { point: 2, action: 3, afterLine: 4 },
        ],
        actionPurposes: [
          "Locate the marketer-managed priority collection",
          "Create a Draft while preserving the published order",
          "Reorder approved recommendations for the Texas campaign",
        ],
        presenterActions: [
          [
            "Reuse the **Page Builder** tab. If it is closed, choose **SitecoreAI → Channels → Agent Portal → Page builder**. Choose **Site switcher → Agent Portal → Editor → Pages → Home**. Confirm **English** and **Default editing host**.",
            "Choose **Layers → Agency priorities**, selecting the component, then open its right-hand **Content** tab.",
            "Open the component’s personalization dropdown, initially **Original**, and choose **rule 1: Liberty Mutual - Agency product priorities is equal to agency-growth**.",
            "Confirm **Content item → Agency growth priorities**. Its **Ordered recommendations** field is in this same panel.",
          ],
          [
            "In **Content item → Agency growth priorities**, open the content item’s version selector; select **Priority baseline version** recorded under **Before presenting**, and wait for its fields to load.",
            "Recheck its version number and original order: **Small business growth → Texas workers compensation → Home and auto conversations**.",
            "Choose **Create version**; paste **New priority version name**, then select **Create**.",
            "Reopen the content item’s version selector; select the new **Texas guidance priority → Draft** row by its new number.",
            "Wait for fields to load, then recheck the selected version number.",
          ],
          [
            "For this reorder, select **Remove all items** in **Ordered recommendations** to clear only this draft’s selection.",
            "Click the far-right **down-chevron** in **Ordered recommendations**. The chips show selected cards; the dropdown lists available choices. Click the **card names** **Texas workers compensation**, **Small business growth**, then **Home and auto conversations** to append them in that order.",
            "Click the item heading to close; wait for **Saved**. Confirm that the canvas now shows Texas guidance first.",
            "Record the selected number as **Saved priority version**. Recheck **Draft** and the Texas-first order; leave it unpublished for the next preview and review steps.",
          ],
        ],
        presenterResult:
          "The recorded **Saved priority version** is a saved Texas-first **Draft**; the original approved version and live order remain unchanged.",
        actions: [
          "In **Page Builder**, choose **Site switcher → Agent Portal → Editor → Pages → Home**, and confirm **English** and **Default editing host**. Choose **Layers → Agency priorities**, selecting the component, then open the right-hand **Content** tab. In its personalization dropdown, initially **Original**, choose **rule 1: Liberty Mutual - Agency product priorities is equal to agency-growth**. Confirm **Content item → Agency growth priorities**; its **Ordered recommendations** field appears in this panel.",
          "In the **Agency growth priorities** content-item card, open its version selector, explicitly select **Priority baseline version** recorded under **Before presenting**, and wait for its fields to finish loading. Confirm that selected original version number and its order: **Small business growth → Texas workers compensation → Home and auto conversations**. Choose **Create version**, name it **Texas guidance priority**, and click **Create**. Reopen the version selector, explicitly select the new **Texas guidance priority** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm the selected version number before changing **Ordered recommendations**.",
          "Find **Ordered recommendations**. For this reorder, click **Remove all items** to clear only this draft’s selection. Use the far-right **down-chevron** to open the available choices, then click the **card names** **Texas workers compensation**, **Small business growth**, and **Home and auto conversations**, in that order. Selected chips determine the cards on the canvas. Click the item heading to close the picker, and wait for **Saved**. Record the version number currently shown as **Saved priority version**. Use that same saved version number for submission, approval, and publication. With **Saved priority version** selected, confirm **Texas workers compensation → Small business growth → Home and auto conversations**, that the version remains **Draft**, and that the canvas shows Texas guidance first. Leave it unpublished for the following preview and review steps.",
        ],
        expected: [
          "The new Draft references the same approved cards in the new order. Avery’s live page retains the published order until the following preview and publication loop completes.",
        ],
        talkTrack: [
          "For a Texas workers’ compensation campaign, the marketer moves approved Texas guidance to the top of the principal audience’s recommendations. The new Draft leaves the current live experience intact until it is reviewed and published.",
        ],
        controls: [
          "**Ordered recommendations** is an ordered native item selection. This collection supplies the **agency-growth** experience, while **Producer priorities** supplies a separate experience.",
          "The original approved version is retained. Saving the new **Draft** changes authoring content, with publication still governed by the configured workflow.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
        ],
        images: [
          {
            file: "demo-portal-priority-order-in-context.png",
            afterAction: 3,
            title: "Edit the selected variant beside its page canvas",
            alt: "Page Builder Layers has Agency priorities selected; the right-hand content item is Agency growth priorities, and the canvas starts with Texas workers compensation guidance.",
            caption:
              "Select the **agency-growth** variant and confirm **Agency growth priorities** in the content-item card. **Ordered recommendations** is edited in the same panel; the canvas shows Texas guidance first after saving.",
            crop: {
              x: 20,
              y: 80,
              width: 1250,
              height: 640,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
            annotations: [
              {
                x: 0,
                y: 54.22,
                width: 21.6,
                height: 6.09,
                label: "Select **Agency priorities**",
              },
              {
                x: 78.24,
                y: 8.59,
                width: 21.2,
                height: 11.88,
                label: "Confirm the variant’s content item",
              },
              {
                x: 43.6,
                y: 82.34,
                width: 28.8,
                height: 12.5,
                label: "Texas guidance is first",
              },
            ],
          },
        ],
        transition:
          "Next, preview this Home priority change for a Texas principal and an Illinois producer, then approve and publish the saved version.",
      },
      {
        id: "portal-preview",
        title: "Preview each personalized priority experience",
        label: "Marketing user previews the experience for each agent audience",
        phase: "Liberty Business Experience",
        sourceSlide: 11,
        durationMinutes: 4,
        persona: "Portal content administrator",
        scenario:
          "The team needs to compare the draft Home content variants for the principal and producer experiences before publication.",
        objective:
          "Part 2 of the priority-change loop: preview both personalized content variants on Home, approve and publish the saved priority change, and verify both live agents.",
        stopWhen:
          "Before publication, Home preview shows Texas guidance first for the principal and the unchanged household-first order for the producer. After publication, Avery and Daniel show those same respective orders live.",
        inputs: [
          {
            beforeLine: 3,
            action: 4,
            label: "Priority submission comment",
            value: "Prioritize Texas workers compensation guidance",
          },
          {
            beforeLine: 2,
            action: 5,
            label: "Priority approval comment",
            value: "Approved agency priority update",
          },
        ],
        presenterPoints: [
          "**Say:** “Your team can check the draft experience for each selected content variant before publication. That helps marketers confirm that agents will see the intended priorities and gives them confidence to make business changes.”",
          "**Personalization Preview** is a private Marketplace extension. Compare **Agency growth priorities** with **Producer priorities** before publication; the producer keeps the household-first order.",
          "Review and publish the saved priority change once, then show Avery’s updated live order and Daniel’s unchanged order.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 2 },
          { point: 2, action: 3, afterLine: 3 },
          { point: 3, action: 6, afterLine: 4 },
        ],
        actionPurposes: [
          "Open the selected page’s available content variants",
          "Preview the Texas-first agency-growth Draft",
          "Confirm the producer variant remains unchanged",
          "Submit the saved priority change for review",
          "Approve the reviewed priority order",
          "Publish once and verify only the intended experience changes",
        ],
        presenterActions: [
          [
            "Reuse the **Page Builder** tab. If it is closed, choose **SitecoreAI → Channels → Agent Portal → Page builder**. Choose **Site switcher → Agent Portal → Editor → Pages → Home**. Confirm **English** and **Default editing host**.",
            "Open **Apps → Personalization Preview**. Keep **Home** selected in **Page Builder**, and leave the saved priority Draft unpublished.",
          ],
          [
            "Under **Agency priorities**, choose **Agency growth priorities**. Leave **Guidance → Default**.",
            "Select **Preview page**; the preview opens directly in a new tab.",
            "On **Home**, find **Priorities for your agency**. Confirm **Support workers’ compensation conversations in Texas → Build a stronger small-business practice → Connect home and auto conversations**.",
            "Close the preview tab, and return to the same **Personalization Preview** panel in **Page Builder**.",
          ],
          [
            "Under **Agency priorities**, choose **Producer priorities**. Keep **Guidance → Default**.",
            "Select **Preview page**; the producer preview opens directly in a new tab.",
            "On **Home**, confirm the producer’s unchanged order: **Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice**.",
            "Close the preview tab, and return to **Page Builder**. Both previews used named content variants, without an agent login.",
          ],
          [
            "Close **Personalization Preview**, then in **Page Builder**, choose **Layers → Agency priorities → Content**. In the component’s personalization dropdown, choose **rule 1: Liberty Mutual - Agency product priorities is equal to agency-growth**.",
            "Confirm **Content item → Agency growth priorities**, then choose its **••• (Data source options) → Open in Content mode**. Select **Saved priority version**, wait for loading, and confirm the **Agency growth priorities** heading, **Draft**, and Texas-first **Ordered recommendations**.",
            "Choose **Actions → Submit**; paste **Priority submission comment**, then select **Submit**.",
            "Confirm **Awaiting approval**.",
          ],
          [
            "Stay on the same **Saved priority version** in **Page Builder**, and review its Texas-first order.",
            "Choose **Actions → Approve**; paste **Priority approval comment**, then select **Submit**.",
            "Confirm **Approved**.",
          ],
          [
            "Stay on the same **Saved priority version** in **Page Builder**.",
            "Confirm **Approved** and Texas-first order. Choose **Publish** with **Item** and **Current language (English)** selected.",
            "Leave **Subitems** unchecked, select **Start publish**, and wait for completion.",
            "In the **Avery portal** tab, select **My workspace**, and reload; confirm Texas guidance first. Repeat in **Daniel portal**, and confirm his household-first order remains unchanged.",
          ],
        ],
        presenterResult:
          "The same Home page previews both personalized content variants. One reviewed publication then updates Avery’s live priorities while Daniel’s order remains unchanged.",
        actions: [
          "In **Page Builder**, choose **Site switcher → Agent Portal → Editor → Pages → Home**, and confirm **English** and **Default editing host**. Open **Apps → Personalization Preview**, and keep **Home** selected in **Page Builder**. Leave **Saved priority version** unpublished.",
          "Under **Agency priorities**, choose **Agency growth priorities**, and leave **Guidance → Default**. Select **Preview page**; the preview opens directly in a new tab. On **Home**, find **Priorities for your agency**, and confirm the draft order **Support workers’ compensation conversations in Texas → Build a stronger small-business practice → Connect home and auto conversations**. Close the preview tab, and return to the same **Personalization Preview** panel in **Page Builder**.",
          "Under **Agency priorities**, choose **Producer priorities**, and keep **Guidance → Default**. Select **Preview page**; the preview opens directly in a new tab. On **Home**, confirm the producer’s unchanged order **Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice**. Close the preview tab, and return to **Page Builder**. Neither preview requires an agent login or a human profile identifier.",
          "Close **Personalization Preview**, then in **Page Builder**, choose **Layers → Agency priorities → Content**, and select **rule 1: Liberty Mutual - Agency product priorities is equal to agency-growth** in the component’s personalization dropdown. Confirm **Content item → Agency growth priorities**, and choose its **••• (Data source options) → Open in Content mode**. Confirm the **Agency growth priorities** heading. Select **Saved priority version**, wait for its fields to load, and recheck **Draft** and the Texas-first order in **Ordered recommendations**. Choose **Actions → Submit**, enter **Prioritize Texas workers compensation guidance**, and click **Submit**. Confirm **Awaiting approval**.",
          "Stay on the same **Saved priority version** in **Page Builder**, inspect its submitted order, and choose **Actions → Approve**. Enter **Approved agency priority update**, click **Submit**, and confirm **Approved**.",
          "On the same **Saved priority version** in **Page Builder**, confirm **Approved** and its Texas-first order, and choose **Publish**. Keep **Item** and **Current language (English)** selected, leave **Subitems** unchecked, and click **Start publish**. After completion, in the **Avery portal** tab, select **My workspace** in the left navigation, and reload; confirm Texas guidance first. Repeat in **Daniel portal**, and confirm his household-first order remains unchanged.",
        ],
        expected: [
          "Personalization Preview shows the draft Agency growth priorities and unchanged Producer priorities on the same Home page. Publishing the reviewed priority collection updates Avery’s Home without publishing Home manually or deploying frontend code; Daniel remains unchanged.",
        ],
        talkTrack: [
          "Before publishing, I can choose each personalized content variant on this same Home page. The agency-growth draft puts Texas guidance first; the producer keeps the household-first order. I can inspect these draft experiences without signing in as an agent, then review and publish the saved change and confirm that only the intended live experience changes.",
        ],
        controls: [
          "**Personalization Preview** is a private **Marketplace** extension inside **Page Builder**. It reads the selected page’s native content-variant names and renders the chosen variants with current authoring content for **Home**.",
          "Native profile tests in **A1** verify the decision rules. This preview checks the selected content variants before publication, without changing human agent accounts, publishing content, or granting additional content permissions.",
          "The **Saved priority version** from A3 remains Draft during both Home previews. The same presenter account then performs **Submit**, **Approve**, and **Publish** on that exact version in **Page Builder**.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
        ],
        transition:
          "The intended agent now receives the reviewed priority change. Next, keep approved wording consistent across both independent websites.",
      },
      {
        id: "portal-shared-content",
        title: "Update one copyright notice in both footers",
        label:
          "Approved shared content is managed once and distributed to every website",
        phase: "Shared-Content Foundation",
        sourceSlide: 11,
        durationMinutes: 3,
        persona: "Content administrator",
        scenario:
          "The copyright year must stay consistent in the public website and Agent Portal footers.",
        objective:
          "Change one shared copyright notice, publish its source once, and show the updated year on both sites.",
        stopWhen:
          "Both site footers show the full copyright notice with 2026 after one shared-source publication.",
        inputs: [
          {
            beforeLine: 1,
            action: 2,
            label: "New copyright version name",
            value: "Copyright year update",
          },
          {
            beforeLine: 4,
            action: 2,
            label: "New copyright year",
            value: "2026",
          },
          {
            beforeLine: 2,
            action: 3,
            label: "Copyright submission comment",
            value: "Review copyright year update to 2026",
          },
          {
            beforeLine: 4,
            action: 3,
            label: "Copyright approval comment",
            value: "Approved copyright year update to 2026",
          },
        ],
        presenterPoints: [
          "**Say:** “Shared wording should stay consistent wherever it appears. One reviewed update reaches both sites, reducing repeated work for Liberty Mutual and the chance that visitors and agents encounter different versions of the same notice.”",
          "Change only **2025 → 2026**, publish the shared source once, and compare versions while delivery completes.",
          "Confirm **2026** on both live sites before beginning restoration.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 0 },
          { point: 2, action: 4, afterLine: 5 },
          { point: 3, action: 5, afterLine: 3 },
        ],
        actionPurposes: [
          "Locate the shared copyright source for both sites",
          "Change the year while preserving the full notice",
          "Review and approve the shared content update",
          "Publish one source and inspect the year-only difference",
          "Verify both sites display the same updated notice",
        ],
        presenterActions: [
          [
            "Reuse the **Page Builder** tab. If it is closed, choose **SitecoreAI → Channels → Public Website → Page builder**. Choose **Site switcher → Public Website → Content**.",
            "In the content tree, select the top-level **Data → Disclosures → Copyright notice**. Confirm **English**.",
            "Record the original approved English version and full **Disclosure** wording for restoration. Confirm its copyright year is **2025**.",
          ],
          [
            "Choose **Create version**; paste **New copyright version name**, then select **Create**.",
            "Reopen the version selector; select the new **Copyright year update → Draft** row by its new number.",
            "Wait for fields to load, then recheck the selected number.",
            "In **Disclosure**, replace only **2025** with **2026**. Preserve every other word, punctuation mark, line break, and the **Equal Opportunity Employer** link; click outside, and wait for **Saved**.",
            "Record the number as **Saved copyright version**; use it for submission, approval, and publication.",
          ],
          [
            "Select **Saved copyright version**; confirm **Draft** and copyright year **2026**.",
            "Choose **Actions → Submit**; paste **Copyright submission comment**, then **Submit**. Confirm **Awaiting approval**.",
            "Stay on the same **Saved copyright version** in **Page Builder**, and review the full notice.",
            "Choose **Actions → Approve**; paste **Copyright approval comment**, then select **Submit**.",
          ],
          [
            "Stay on the same **Saved copyright version** in **Page Builder**.",
            "Confirm **Approved**, copyright year **2026**, and unchanged surrounding wording.",
            "Publish the shared item once with **Item** and **Current language (English)** selected, and **Subitems** unchecked; select **Start publish**.",
            "While publication and delivery complete, return to the item’s version selector, open **Saved copyright version → ••• → Compare versions**, and set **Compare** to the recorded original version and **With** to **Saved copyright version**.",
            "Under **Content → Disclosure**, show **2025** beside **2026**, with all surrounding wording and the link intact.",
            "Choose **close**.",
          ],
          [
            "Wait for publication to complete.",
            "In the **Public website** tab, reload, and scroll to the footer. In the **Avery portal** tab, reload, and scroll to the footer.",
            "Show the same full copyright notice with **2026** in both footers.",
          ],
        ],
        presenterResult:
          "The public website and Agent Portal footers show the same full copyright notice with 2026 after one shared-source publication.",
        actions: [
          "In **Page Builder**, choose **Site switcher → Public Website → Content**. In the content tree, select the top-level **Data → Disclosures → Copyright notice**, and confirm **English**. Record the original approved English version and full **Disclosure** text for the rollback in the next loop. Confirm its copyright year is **2025**.",
          "Choose **Create version**, name it **Copyright year update**, and select **Create**. Reopen the version selector, explicitly select the new **Copyright year update** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm the selected version number before editing **Disclosure**. Replace only **2025** with **2026** in **Disclosure**, preserving every other word and punctuation mark in the full copyright notice, its line break, and the **Equal Opportunity Employer** link. Click outside the field, and wait for **Saved**. Record the version number currently shown as **Saved copyright version**. Use that same saved version number for submission, approval, and publication.",
          "With **Saved copyright version** selected, recheck **Draft** and copyright year **2026** in **Disclosure**. Choose **Actions → Submit**, enter **Review copyright year update to 2026**, and select **Submit**. Confirm **Awaiting approval**. Stay on the same **Saved copyright version** in **Page Builder**, review the full notice, and choose **Actions → Approve**, enter **Approved copyright year update to 2026**, and select **Submit**.",
          "On the same **Saved copyright version** in **Page Builder**, confirm **Approved**, copyright year **2026**, and unchanged surrounding wording. Publish the shared item once with **Item** and **Current language (English)** selected and **Subitems** unchecked. Select **Start publish**. While publication and delivery complete, return to the item’s version selector, open **Saved copyright version → ••• → Compare versions**, and set **Compare** to the recorded original version and **With** to **Saved copyright version**. Under **Content → Disclosure**, show **2025** beside **2026**, with the surrounding wording and link intact. Choose **close**.",
          "After the job completes, reload the **Public website** tab, and scroll to its footer. Reload **Avery portal**, and scroll to its footer. Confirm that both footers show the same full copyright notice with **2026**.",
        ],
        expected: [
          "Both independent sites display the same full copyright notice with 2026 from one governed content item, without separate copy edits or frontend releases. The first line reads **© 2026 Liberty Mutual Insurance, 175 Berkeley Street, Boston, MA 02116**. The second reads **Liberty Mutual is an Equal Opportunity Employer and an Equal Housing Insurer.** The **Equal Opportunity Employer** link remains intact.",
        ],
        talkTrack: [
          "Both footers use one copyright notice. I change only the year, review the change, and publish its shared source once. Experience Edge makes that approved content available to both sites, while each site retains its own design.",
        ],
        controls: [
          "**Copyright notice** belongs to the public site’s top-level **Data → Disclosures** library. Both footers reference that same native item.",
          "The complete copyright notice is shared content delivered through **Experience Edge**. Only its year changes from **2025** to **2026**; its address, equal-opportunity wording, line break, and **Equal Opportunity Employer** link stay intact.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
          {
            action: 5,
            afterLine: 1,
            label: "Public website",
            href: `${PUBLIC}/`,
          },
        ],
        transition:
          "One reviewed update now reaches both footers. Finish by comparing the versions and restoring the original year without losing that history.",
      },
      {
        id: "portal-audit-rollback",
        title: "Restore prior wording without losing history",
        label: "Every change is approved, auditable, and reversible",
        phase: "Shared-Content Foundation",
        sourceSlide: 11,
        durationMinutes: 3,
        persona: "Content administrator",
        scenario:
          "The team needs to compare the shared copyright change and restore its original year while preserving version history.",
        objective:
          "Compare the original and changed copyright versions, then restore year 2025 through a new reviewed version.",
        stopWhen:
          "Both site footers show the full copyright notice with restored year 2025, and the original, changed, and restored versions remain in history.",
        inputs: [
          {
            beforeLine: 3,
            action: 3,
            label: "Restored copyright version name",
            value: "Copyright year restored",
          },
          {
            beforeLine: 2,
            action: 4,
            label: "Restoration submission comment",
            value: "Restore copyright year to 2025",
          },
          {
            beforeLine: 4,
            action: 4,
            label: "Restoration approval comment",
            value: "Approved restoration of copyright year to 2025",
          },
        ],
        presenterPoints: [
          "**Say:** “Moving quickly is easier when changes remain accountable and recoverable. Your team can see what changed, review it, and restore earlier approved wording while retaining the history of those decisions.”",
          "Versions show what changed; item statistics show who last updated it and when.",
          "Finish with **2025** in both footers: a controlled change and a controlled reversal.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 0 },
          { point: 2, action: 5, afterLine: 6 },
          { point: 3, action: 6, afterLine: 2 },
        ],
        actionPurposes: [
          "Open the shared notice for controlled restoration",
          "Identify the retained original and changed versions",
          "Create a new Draft from the original wording",
          "Review and approve the restored notice",
          "Publish the restoration and show version history",
          "Confirm the restored notice reaches both sites",
        ],
        presenterActions: [
          [
            "Reuse the **Page Builder** tab. If it is closed, choose **SitecoreAI → Channels → Public Website → Page builder**. Choose **Site switcher → Public Website → Content**.",
            "Select the top-level **Data → Disclosures → Copyright notice**, and confirm **English**.",
          ],
          [
            "Begin restoration only after A5 confirms **2026** in both live footers.",
            "Open the version selector. Find the original approved English version recorded under **Before presenting** and **Saved copyright version** from A5. Keep both versions; the year-only comparison was shown while A5 published.",
          ],
          [
            "Switch to **Page Builder → Content → Data → Disclosures → Copyright notice**; select the recorded original approved English version.",
            "Wait for loading; recheck the selected number and original **Disclosure** wording with copyright year **2025** before choosing **Create version**.",
            "Paste **Restored copyright version name**, then **Create**. Reopen the selector; select the new **Copyright year restored → Draft** row.",
            "Wait; recheck its new version number and the full copyright notice with **2025**. Preserve all other wording, punctuation, the line break, and the **Equal Opportunity Employer** link.",
            "After **Saved**, record the number as **Restored copyright version**; use it for submission, approval, and publication.",
          ],
          [
            "Select **Restored copyright version**; confirm **Draft** and original **Disclosure** wording with year **2025**.",
            "Choose **Actions → Submit**; paste **Restoration submission comment**, then select **Submit**.",
            "Stay on the same **Restored copyright version** in **Page Builder**, and review the full notice.",
            "Choose **Actions → Approve**; paste **Restoration approval comment**, then select **Submit**.",
          ],
          [
            "Stay on the same **Restored copyright version** in **Page Builder**; confirm **Approved** and copyright year **2025**.",
            "Publish with **Item** and **Current language (English)** selected, and **Subitems** unchecked; select **Start publish**.",
            "While publication completes, show the original, changed, and restored versions in the **Content version selector**.",
            "Open the restored version’s **••• → Compare versions**. Set **Compare** to the recorded original version and **With** to **Restored copyright version**; under **Content → Disclosure**, confirm that the full **2025** notice matches. Choose **close**.",
            "After closing **Compare versions**, enable **Show all fields** if needed, and expand **Statistics**.",
            "Point to **Updated** and **Updated by** for the item’s latest update.",
          ],
          [
            "Wait for publication to complete. Reload the **Public website** tab, and scroll to its footer. Reload **Avery portal**, and scroll to its footer.",
            "Confirm that both footers show the full copyright notice with **2025** again. Retain all content versions.",
          ],
        ],
        presenterResult:
          "Both site footers show the full copyright notice with 2025 again; history retains the original, changed, and restored revisions.",
        actions: [
          "In **Page Builder**, choose **Site switcher → Public Website → Content**. Select the top-level **Data → Disclosures → Copyright notice**, and confirm **English**.",
          "Begin restoration only after A5 confirms **2026** in both live footers. Open the version selector, and find the original approved English version recorded under **Before presenting** and **Saved copyright version** from A5. Keep both versions; the year-only comparison was shown while A5 published.",
          "In **Page Builder → Content → Data → Disclosures → Copyright notice**, select the item. Select the original approved English version recorded in the prior loop, and wait for its fields to finish loading. Confirm the selected version number and original **Disclosure** wording with copyright year **2025** before choosing **Create version**. Name it **Copyright year restored**, and select **Create**. Reopen the version selector, explicitly select the new **Copyright year restored** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm the selected version number and that **Disclosure** contains the preserved full copyright notice with **2025**, without changing any other wording or punctuation, its line break, or the **Equal Opportunity Employer** link. After the original wording is saved, record the version number currently shown as **Restored copyright version**. Use that same saved version number for submission, approval, and publication.",
          "With **Restored copyright version** selected, recheck **Draft** and the original **Disclosure** wording with year **2025**. Choose **Actions → Submit**, enter **Restore copyright year to 2025**, and select **Submit**. Stay on the same **Restored copyright version** in **Page Builder**, review the full notice, and choose **Actions → Approve**, enter **Approved restoration of copyright year to 2025**, and select **Submit**.",
          "On the same **Restored copyright version** in **Page Builder**, confirm **Approved** and copyright year **2025**, and publish with **Item** and **Current language (English)** selected and **Subitems** unchecked. While publication completes, use the **Content version selector** to show the original, changed, and restored versions. Open the restored version’s **••• → Compare versions**. Set **Compare** to the recorded original version and **With** to **Restored copyright version**; under **Content → Disclosure**, confirm that the full **2025** notice matches. Choose **close**. Enable **Show all fields** if needed, and expand **Statistics**. Point to **Updated** and **Updated by** for the item’s latest update.",
          "After completion, reload the **Public website** tab, and scroll to its footer. Reload **Avery portal**, and scroll to its footer. Confirm that both footers show the full copyright notice with **2025** again, and retain all versions in history.",
        ],
        expected: [
          "Native version comparison shows the year-only change. A newer reviewed version restores copyright year 2025 in both footers while preserving the original and changed versions.",
        ],
        talkTrack: [
          "We have already seen the review and approval process. Version comparison now shows exactly what changed: only the copyright year. We restore the earlier wording through a new reviewed version, returning both footers to 2025 while retaining the original and changed versions.",
        ],
        controls: [
          "In **Content**, the item’s version selector exposes **••• → Compare versions**. Compare the recorded original, changed, and restored versions without changing their wording.",
          "Creating a new Draft from the original approved version preserves the original and changed versions. The same governed process reviews and publishes the restoration.",
          "Submission, approval, and publication remain distinct actions in the configured workflow demonstrated earlier.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
        ],
        transition:
          "Close on what this enables for Liberty Mutual: trusted guidance, more relevant agent experiences, and business-managed changes with clear accountability.",
      },
    ],
  },
];
