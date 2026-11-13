import type { DemoChapter } from "./types";

import {
  PUBLIC,
  SITECORE_AI,
  PORTAL,
  SEARCH_SOURCE,
  ANALYTICS,
  BUNDLING,
  BUNDLING_FAQ,
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
      "Search retrieves approved guidance. Published page metadata, visible FAQ schema, and canonical URLs help permitted search and AI engines understand the public page; the same native FAQ fields also support Search and connected applications.",
    nextStep:
      "SitecoreAI assistants can help marketers draft and refine brand-aligned website copy for human review. The proposed Profound integration would bring external content proposals into the same Draft, approval, and publishing process.",
    talkTrack:
      "Published page metadata and visible FAQ schema support search and AI discovery; the same native FAQ fields support Search and connected applications. SitecoreAI assistants help marketers draft and refine brand-aligned copy. Proposed Profound intake would use the same human review and publication controls.",
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
          "The supported question shows Bundle home and auto insurance as the lead result with its excerpt and related published guidance, and the unsupported question ends with No results found and Contact an agent.",
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
          "**Say:** “We’ll ask an insurance question in everyday language, then try an unsupported topic. Customers get relevant guidance and a clear route to an agent.”",
          "Point to the lead **/bundling** result, its FAQ answer, and related articles.",
          "Show **No results found** and **Contact an agent**.",
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
            "Highlight **Bundle home and auto insurance** as the first result, which links to **/bundling**, and read its excerpt. Point to the blue FAQ answer as guidance from that same page.",
            "Briefly point out **How to bundle your insurance policies** and **3 tips for bundling your insurance policies**. Keep all results unopened.",
          ],
          [
            "Replace **keyword(s)** with **Unsupported search question**, then select **Search**.",
            "Show **No results found** and **Contact an agent**. Leave the contact link unopened.",
          ],
        ],
        presenterResult:
          "The supported question shows **Bundle home and auto insurance** first, alongside related published guidance. The unsupported question shows **No results found** and **Contact an agent**.",
        actions: [
          `In the **Public website** tab, open the [**public Home page**](${PUBLIC}/), and select **Search** in the header.`,
          "In **Search**, enter **Can I combine home and car coverage?**, and select **Search**. Wait for **Searching…** to finish. Highlight **Bundle home and auto insurance** as the first result, which links to **/bundling**, and read its excerpt on the results page. Point to the blue FAQ answer from the same bundling page, then briefly point out **How to bundle your insurance policies** and **3 tips for bundling your insurance policies** as related guidance. Keep every result unopened.",
          "In **keyword(s)**, replace the query with **Does car insurance cover cyberextortion?**, and select **Search**. Show **No results found** and **Contact an agent**. End this loop with that contact option; leave the link unopened.",
        ],
        expected: [
          "The conversational question returns relevant published guidance: **Bundle home and auto insurance** is the lead result, alongside **How to bundle your insurance policies** and **3 tips for bundling your insurance policies**. The result excerpts help the visitor choose useful content. The unsupported subject offers an agent-assisted next step.",
        ],
        talkTrack: [
          "We’ll ask an insurance question in everyday language, then try an unsupported topic. Customers get relevant guidance and a clear route to an agent.",
        ],
        controls: [
          "**SitecoreAI Search** retrieves published pages. A native Search rule pins **Bundle home and auto insurance** as the lead result for bundling keywords. The application’s authored-evidence check confirms whether approved source material addresses the question before presenting a result.",
          "Published website pages join Search when their native **Include in site search** checkbox is selected. Its visible native FAQs also supply individual Search answer records linking to their anchors on **/bundling**, with classifications inherited from the page. The bundling page and related articles are managed and published in **SitecoreAI**.",
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
            title:
              "The bundling page, related guidance, and a native FAQ answer",
            alt: "Find Bundle home and auto insurance first, the related How to bundle your insurance policies and 3 tips for bundling your insurance policies results, and the blue FAQ answer. Keep the results unopened.",
            caption:
              "Find **Bundle home and auto insurance** first, point out the related articles, and read the blue **FAQ answer** from the same bundling page. Keep the results unopened.",
            afterAction: 2,
            crop: {
              x: 44,
              y: 151,
              width: 1190,
              height: 630,
              sourceWidth: 1280,
              sourceHeight: 1973,
            },
            annotations: [
              {
                x: 1,
                y: 37.5,
                width: 98,
                height: 12,
                label: "Lead result: **Bundle home and auto insurance**",
              },
              {
                x: 1,
                y: 50.2,
                width: 98,
                height: 22,
                label: "Helpful related articles remain available",
              },
              {
                x: 1,
                y: 74,
                width: 98,
                height: 24,
                label: "Read a native **FAQ answer** from **/bundling**",
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
          "The customer has found a clear starting point and related guidance. Next, inspect the bundling page behind the lead result and the native FAQs that also supply Search.",
      },
      {
        id: "public-discovery",
        title: "Inspect page metadata and native FAQs",
        label:
          "Search engines and AI answer engines can find and cite the right LM content",
        phase: "Core Demonstration Flow",
        sourceSlide: 10,
        durationMinutes: 2,
        persona: "Public-site marketer",
        scenario:
          "The marketer needs a natural bundling page whose metadata and visible FAQs support discovery, Search, and reuse.",
        objective:
          "Show one natural bundling page backed by governed metadata, taxonomy, and visible FAQPage schema, with the same native FAQ fields available to Search and connected applications.",
        stopWhen:
          "The bundling page, Search title and description, managed applicability values, canonical URL, and FAQPage schema have been shown without changing content.",
        inputs: [
          {
            beforeLine: 2,
            action: 3,
            label: "Find structured data in page source",
            value: "FAQPage",
          },
          {
            beforeLine: 4,
            action: 3,
            label: "Find the canonical link in page source",
            value: "canonical",
          },
        ],
        presenterPoints: [
          "**Say:** “We’ll inspect the bundling page’s metadata and FAQs. One content source helps customers, Search, and permitted AI engines find consistent guidance.”",
          "**Search title**, **Search description**, and checklists define purpose and applicability.",
          "Visible FAQs supply **FAQPage** schema, Search answers, and API fields.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 1 },
          { point: 2, action: 2, afterLine: 3 },
          { point: 3, action: 3, afterLine: 4 },
        ],
        actionPurposes: [
          "Show the bundling page’s content and governed metadata",
          "Show how taxonomy identifies content applicability",
          "Inspect visible FAQ schema for permitted external discovery",
        ],
        presenterActions: [
          [
            "Switch to the **Public website** tab, and open the **Bundling page** URL. Briefly show **Bundle auto and home insurance to save**, then expand **What's an auto and home insurance bundle?** in its FAQ section.",
            "Switch to the existing **Page Builder** tab. If it is closed, choose **SitecoreAI → Channels → Public Website → Page builder**. Choose **Site switcher → Public Website → Editor → Pages**.",
            "In **Sitemap**, expand **Home**, and select **bundling**. On that selected row, choose **Content tree options (•••) → Page content**. Confirm **English**.",
            "In the **Page content** panel beside the canvas, expand **Content**: show **Search title**, **Search description**, **Canonical URL**, and **Reference source**.",
            "Return to the canvas, and expand the first FAQ, **What's an auto and home insurance bundle?**. Point to its visible question and answer: these are native **Question** and **Answer** fields, reused by Search and connected applications. Leave all content unchanged.",
          ],
          [
            "In **Page content**, expand **Content**, or use **Go to field → State applicability**. Open **State applicability** using its **1 item selected** control; show **All states**, then close.",
            "Open **Products**; show **Auto**, **Homeowners**, **Renters**, and **Condo** selected as separate checkboxes, then close.",
            "Open **Audience**; show **All consumers**, then close. Leave all selections unchanged.",
          ],
          [
            "Return to the **Public website** tab’s bundling page. In the browser, right-click a blank area, and choose **View page source**. If the browser context menu does not offer the source command, use Chrome’s **View → Developer → View Source** menu on Mac. In the source tab, enable **Line wrap**, then press **⌘F** (Mac) or **Ctrl+F** (Windows) to open **Find**.",
            "Paste **Find structured data in page source** into **Find**.",
            "Use the actual **FAQPage** script block, rather than a later escaped copy in application data. Show **mainEntity → Question → name** and **acceptedAnswer → text** matching the visible first FAQ; its **url** points to that FAQ on **/bundling**.",
            "Find **canonical** using the copy field, and show the matching **rel=canonical** link.",
            "Close the source tab, and return to the **Public website** tab.",
          ],
        ],
        presenterResult:
          "One natural bundling page has governed metadata, managed classifications, a canonical URL, and **FAQPage** schema matching its visible FAQs; the same native FAQ fields also supply Search and connected applications.",
        actions: [
          `Open the [**bundling page**](${BUNDLING}), and expand **What's an auto and home insurance bundle?** in its FAQ section. In **Page Builder**, choose **Site switcher → Public Website → Editor → Pages**. In **Sitemap**, expand **Home**, and select **bundling**. On the selected row, choose **Content tree options (•••) → Page content**. Confirm **English**. In the panel beside the canvas, expand **Content** to inspect **Search title**, **Search description**, **Canonical URL**, and **Reference source**. Return to the canvas, and expand the first FAQ. Its visible **Question** and **Answer** are native fields used by Search and connected applications. Leave all content unchanged.`,
          "In the same **Page content** panel, expand **Content**, or choose **Go to field → State applicability**. Open **State applicability** to show **All states**, then close it. Open **Products** to show **Auto**, **Homeowners**, **Renters**, and **Condo** selected independently, then close it. Open **Audience** to show **All consumers**, then close it. Leave all selections unchanged.",
          "Return to the **Public website** tab’s bundling page. Right-click a blank area, and choose **View page source**. If needed on Mac, use Chrome’s **View → Developer → View Source** menu. Enable **Line wrap**, then press **⌘F** (Mac) or **Ctrl+F** (Windows). Find **FAQPage**, and use the actual JSON-LD script block rather than a later escaped copy in application data. Show **mainEntity → Question → name**, **acceptedAnswer → text**, and the FAQ **url** matching the visible first FAQ. Find **canonical** to show the page’s **rel=canonical** link. Close the source tab, and return to the rendered bundling page.",
        ],
        expected: [
          "The bundling page owns its governed metadata, managed classifications, and visible FAQs. FAQPage schema, individual Search records, and native APIs reuse those same FAQ fields.",
        ],
        talkTrack: [
          "We’ll inspect the bundling page’s metadata and FAQs. One content source helps customers, Search, and permitted AI engines find consistent guidance.",
        ],
        controls: [
          "The native **Page content** panel keeps metadata and **Checklist** classifications beside the canvas. Choices are maintained beneath **Data → Taxonomy**. The **Questions and answers** component renders the page’s native FAQ items. Search inherits the parent page’s state, product, and audience classifications for each FAQ record.",
          "The public rendering supplies **FAQPage** JSON-LD from the same visible **Question** and **Answer** fields: **mainEntity** contains **Question** objects with **name**, **acceptedAnswer → text**, and native-ID anchor URLs on **/bundling**. The page’s **Canonical URL** supplies the canonical link. These fields support permitted crawlers.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "Bundling page", href: BUNDLING },
          { action: 1, afterLine: 1, label: "SitecoreAI", href: SITECORE_AI },
        ],
        transition:
          "Keep this same bundling page selected. Next, update its first native FAQ, complete review, and verify that Search receives the published wording automatically.",
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
            value: "What's an auto and home insurance bundle?",
          },
          {
            beforeLine: 3,
            action: 2,
            label: "New FAQ version name",
            value: "Bundling FAQ review",
          },
          {
            beforeLine: 5,
            action: 2,
            label: "FAQ answer — review sentence",
            value:
              "Review your options with your agent before choosing coverage.",
          },
          {
            beforeLine: 2,
            action: 3,
            label: "Repeat Search by term",
            value: "What's an auto and home insurance bundle?",
          },
        ],
        presenterPoints: [
          "**Say:** “We’ll see a published FAQ update reach Search automatically. Liberty Mutual can keep customer guidance current without duplicate content maintenance.”",
          "Custom synchronization sends published **Experience Edge** content through the **Search Push API**.",
          "Show the new sentence in Search; classifications stay intact.",
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
            "Return to the existing **Page Builder** tab. In **Content**, expand **Home → bundling → Data → FAQs → Questions**, and select **01 What is an auto and home insurance bundle**. Confirm its **Question** is **What's an auto and home insurance bundle?**; this is the same visible FAQ inspected in P2.",
            "In this FAQ item’s version selector, confirm the **latest version** is **Approved** and marked **Live**. Its **Answer** must not contain the review sentence.",
            "Choose **Create version**, paste **New FAQ version name**, and select **Create**.",
            "Reopen the FAQ item’s version selector, explicitly select the newest **Bundling FAQ review → Draft** row, and wait for its fields to load. Confirm **Draft**.",
            "Return to **Editor → Pages → bundling**, expand **What's an auto and home insurance bundle?**, and click its answer on the canvas. Append **FAQ answer — review sentence** exactly once at the end of **Answer**, retaining its existing wording.",
            "Click outside **Answer**, and wait for **Saved**. Return to the same FAQ item in **Content**, reselect the new Draft version, then choose **Actions → Submit**, followed by **Submit**; confirm **Awaiting approval**.",
            "Using the same presenter account, review this FAQ version’s complete answer, choose **Actions → Approve**, then **Submit**; confirm **Approved**.",
            "Choose **Publish** on this FAQ item: keep **Item** and **Current language (English)** selected.",
            "Leave **Subitems** unchecked, select **Start publish**, and wait for completion.",
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
          `Open [**SitecoreAI Search → Preview**](${SEARCH_SOURCE}). Enter **What's an auto and home insurance bundle?** in **Search by term**, open the matching FAQ row with **Toggle document details**, and confirm that **Review your options with your agent before choosing coverage.** is absent.`,
          "Return to **Page Builder**. In **Content**, expand **Home → bundling → Data → FAQs → Questions**, and select **01 What is an auto and home insurance bundle**. Confirm **Question → What's an auto and home insurance bundle?**, its **latest version** is **Approved** and marked **Live**, and its **Answer** lacks the review sentence. Choose **Create version**, name it **Bundling FAQ review**, and select **Create**. Explicitly select the newest **Bundling FAQ review → Draft** row, and wait for its fields to finish loading. Return to **Editor → Pages → bundling**, expand that FAQ, and click its answer on the canvas. At the end of **Answer**, append **Review your options with your agent before choosing coverage.** exactly once, retaining its existing wording. Click outside **Answer**, and wait for **Saved**. Return to this same FAQ in **Content**, reselect the new Draft version, choose **Actions → Submit**, then **Submit**, and confirm **Awaiting approval**. Using the same presenter account, review the complete answer, choose **Actions → Approve**, then **Submit**, and confirm **Approved**. Choose **Publish** with **Item** and **Current language (English)** selected; leave **Subitems** unchecked, then select **Start publish**.",
          `Wait for the publishing job to complete. Return to [**SitecoreAI Search → Preview**](${SEARCH_SOURCE}), refresh, repeat the exact question search, and expand the FAQ result. If the prior wording is still visible, allow content distribution and the automatic Search update to finish, then refresh again until the added sentence appears. Confirm that **body** contains the added sentence, **url** points to the FAQ on **/bundling**, and **state**, **product**, and **audience** remain correct. No manual reindex or second content edit is needed.`,
        ],
        expected: [
          "Publishing one reviewed native FAQ updates its individual Search record automatically, including the changed answer, canonical page anchor, and inherited applicability metadata.",
        ],
        talkTrack: [
          "We’ll see a published FAQ update reach Search automatically. Liberty Mutual can keep customer guidance current without duplicate content maintenance.",
        ],
        controls: [
          "The **OnEnd** publication event calls the configured publication service, which reads published website content from **Live Experience Edge** and synchronizes it through the **Search Push API**. **Include in site search** selects the pages available to Search. Each visible FAQ receives its own Search record linking to its native anchor on **/bundling**, with state, product, and audience inherited from that page. This loop publishes the FAQ item itself; creating a page version does not create a new FAQ version.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
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
          "**Say:** “We’ll build a page visually with approved components and reusable content, then publish it. Marketers can move quickly while protecting Liberty Mutual’s design standards.”",
          "Show approved components, the shared **Promotion**, and **Image left / Image right**.",
          "One presenter publishes; production teams normally separate authoring, approval, and publishing.",
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
          "We’ll build a page visually with approved components and reusable content, then publish it. Marketers can move quickly while protecting Liberty Mutual’s design standards.",
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
          "**Say:** “We’ll review a suggested content change beside its page. This Scrunch example shows how a proposed Profound integration could support faster updates with human approval.”",
          "Proposed **Profound** intake follows **Draft**, human review, approval, and publication.",
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
          "We’ll review a suggested content change beside its page. This Scrunch example shows how a proposed Profound integration could support faster updates with human approval.",
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
          "**Say:** “We’ll see page views and meaningful CTA clicks. Marketers can understand engagement and decide where customer content needs improvement.”",
          "Show **pageView** and the custom **LM_PUBLIC_CTA_CLICK** event.",
          "Visitor privacy choices govern optional analytics and personalization.",
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
          "We’ll see page views and meaningful CTA clicks. Marketers can understand engagement and decide where customer content needs improvement.",
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
          "Show how any application can retrieve the same published FAQ fields through Experience Edge’s native GraphQL API.",
        stopWhen:
          "The native GraphQL response shows the same FAQ item ID, published version, question and answer, including the sentence published in P3.",
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
  item(path: "{8C73B233-9576-52D7-BD5A-A78756A08C14}", language: "en") {
    id
    name
    version
    question: field(name: "question") { value }
    answer: field(name: "answer") { value }
  }
}`,
          },
        ],
        presenterPoints: [
          "**Say:** “We’ll retrieve the same published FAQ through Experience Edge’s GraphQL API. Liberty Mutual can reuse approved content across applications without maintaining competing copies.”",
          "Match the FAQ ID, published version, and newly published sentence.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 2 },
          { point: 2, action: 3, afterLine: 2 },
        ],
        actionPurposes: [
          "Show where Experience Edge delivers approved content",
          "Retrieve the published FAQ through native GraphQL",
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
            "In the response on the right, show **id**, **version**, **question**, and **answer**.",
            "Find **Review your options with your agent before choosing coverage.** in **answer**.",
            "Switch to the **Public website** tab, and open the **Published FAQ** URL. It opens the matching answer automatically; compare its wording with the API response. Return to **GraphQL Explorer**.",
          ],
          [
            "Explain that the front end, LibertyAir, or any other application can retrieve these same published fields through the native API.",
            "Finish on the actual response: one approved FAQ, available to multiple experiences without another content copy.",
          ],
        ],
        presenterResult:
          "The native GraphQL response and the bundling page’s first FAQ show the same published question, answer, and added sentence, with the native FAQ item’s ID and published version.",
        actions: [
          "Show **Experience Edge content delivery** in [**the shared presentation**](https://sitecore1.sharepoint.com/:p:/s/Ops/cQoDg9wZPRa8Tb3nJmHAOX-TEgUCuSmQQA7MGbe1g6C_LnOG3A). Trace **SitecoreAI authoring → Publish → Experience Edge → API consumers**.",
          `Open the prepared [**GraphQL Explorer**](${GRAPHQL_EXPLORER}). Its **HTTP HEADERS** must use the **Live Delivery API token** configured in **P0**, not Preview. Use the **HTTP headers** copy field below if needed. Copy **GraphQL query** below, replace the existing text in the left **Query** editor, and select the triangular **Run** button.`,
          `In the response on the right, identify **id**, **version**, **question**, and **answer**. Find **Review your options with your agent before choosing coverage.** in **answer**, and briefly compare it with [**the published FAQ**](${BUNDLING_FAQ}). Return to **GraphQL Explorer**.`,
          "Explain that the front end, LibertyAir, or any other application can retrieve these same published fields through the native API. Finish on the actual response; no additional application demonstration is needed.",
        ],
        expected: [
          "Experience Edge’s native GraphQL API returns the same approved, published FAQ fields used by the public website.",
        ],
        talkTrack: [
          "We’ll retrieve the same published FAQ through Experience Edge’s GraphQL API. Liberty Mutual can reuse approved content across applications without maintaining competing copies.",
        ],
        controls: [
          "**GraphQL Explorer** queries **Live Experience Edge** using a generated **Delivery API token** in the **sc_apikey** HTTP header. The token is configured locally before the demonstration; it is not part of the query or link.",
          "The query selects the native FAQ item by its stable item ID and English language. **version** identifies its published content version. Draft and Preview content remain in authoring.",
        ],
        links: [
          {
            action: 2,
            afterLine: 0,
            label: "GraphQL Explorer",
            href: GRAPHQL_EXPLORER,
          },
          {
            action: 3,
            afterLine: 2,
            label: "Published FAQ",
            href: BUNDLING_FAQ,
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
        durationMinutes: 3,
        persona:
          "Independent agents Daniel and Avery, followed by a portal marketer",
        scenario:
          "Agents with different roles, licensed states, and agency context need priorities relevant to their business.",
        objective:
          "Start with Daniel’s producer priorities, contrast Avery’s principal priorities, then test Avery’s profile and inspect the readable Agent priority classification behind the named result.",
        stopWhen:
          "Daniel and Avery’s different priorities are visible, Avery matches **Rule 1** for **Agent priority → Agency growth** using her own Client ID, and the central business classification is shown.",
        presenterPoints: [
          "**Say:** “We’ll compare Daniel’s and Avery’s priorities, then inspect the profile-driven rule. Liberty Mutual can make each agent’s next opportunity easier to find.”",
          "Compare Daniel’s household-first order with Avery’s growth-first order.",
          "**Agent priority** combines role, licensed state, and production for relevant recommendations.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 0 },
          { point: 2, action: 2, afterLine: 3 },
          { point: 3, action: 5, afterLine: 3 },
        ],
        actionPurposes: [
          "Show Daniel’s producer baseline for comparison",
          "Show Avery’s agency growth priorities for comparison",
          "Identify Avery’s native profile for an exact test",
          "Prove Avery matches the agency growth rule",
          "Show the central Agent priority business rules",
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
            "In the **SitecoreAI** tab, choose **Optimization → Profiles**. Under **Most recent users**, open the most recent matching **Avery Brooks - 01** row from the portal login you just showed. Identical names farther down are historical profiles. Keep this tab as **Profiles**; leave the separate **Page Builder** tab open.",
            "Choose **Toggle menu → Inspect → JSON view**. Copy the first UUID in **clientIds**, without quotation marks, then close **Inspect profile**. This **Client ID** identifies Avery for the native rule test.",
          ],
          [
            "Switch to **Page Builder**. If it is closed, choose **SitecoreAI → Channels → Agent Portal → Page builder**. Choose **Site switcher → Agent Portal → Editor → Pages → Home**, keep **Default editing host**, then choose **Layers → Agency priorities**.",
            "Choose **Edit personalization rules → Liberty Mutual - Agency product priorities**.",
            "In the Builder, choose **Select profile → Load profile → Client ID**; paste Avery’s copied **Client ID**, then press **Enter**.",
            "Wait for **Testing as: Avery Brooks - 01**; select **Test**, and confirm the green first row and **Rule 1 matched**. Point to the single **Agent priority** column: its first row is **Is equal to Agency growth**, and its second row is **Is equal to Producer priorities**. Select **Cancel** to return to **Page Builder**.",
          ],
          [
            "Switch to the **SitecoreAI** tab used for Profiles. Choose **Optimization → Custom values**, and open **Agent priority**.",
            "Find the **Agency growth** business section. Show the readable criteria: **principal**, **licensed in Texas**, and **agency small-business share below 20%**. Avery’s share is about **14.46%**, so she receives this result.",
            "Find the **Producer priorities** business section. Show **producer**, **licensed in Illinois**, **small-business specialization**, and **positive individual small-business production**. These criteria explain Daniel’s result.",
            "Explain that this saved JavaScript classifies the trusted profile; the component uses its named result to choose content. Content authors still edit the message and card order in **Page Builder**.",
            "Leave the saved **Agent priority** value unchanged, and return to the **Page Builder** tab.",
          ],
        ],
        presenterResult:
          "Daniel’s producer-first baseline contrasts with Avery’s principal experience. Avery’s native profile test shows **Rule 1 matched** for **Agency growth**. The **Agent priority** custom value explains the shared business classification, and the component maps each named result to its content.",
        actions: [
          `Switch to the **Daniel portal** tab, and open [**portal home**](${PORTAL}/). Confirm **daniel.01 → Daniel Ortiz → Prairie Oak Insurance**. Read his three priorities in order: **Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice**. Open **Your profile**; show the producer role and **Licensed states: Illinois and Texas**, then choose **Close dialog**.`,
          `Switch to the separate **Avery portal** tab, and open [**portal home**](${PORTAL}/). Confirm **avery.01 → Avery Brooks → Cedar Ridge Insurance**. Contrast her principal priorities: **Build a stronger small-business practice → Support workers’ compensation conversations in Texas → Connect home and auto conversations**. Open **Your profile**; show the principal role and **Licensed states: Texas, Illinois, and Florida**, then choose **Close dialog**.`,
          "In the **SitecoreAI** tab, choose **Optimization → Profiles**. Under **Most recent users**, open the most recent matching **Avery Brooks - 01** row from the portal login you just showed. Identical names farther down are historical profiles. Choose **Toggle menu → Inspect → JSON view**. Copy the first UUID in **clientIds**, without quotation marks, then close **Inspect profile**. This **Client ID** identifies Avery for the native rule test. Keep the separate **Page Builder** tab open.",
          `Switch to **Page Builder**, and open [**Agent Portal Home**](${portalEditor}); keep **Default editing host**, then choose **Layers → Agency priorities → Edit personalization rules → Liberty Mutual - Agency product priorities**. Choose **Select profile → Load profile → Client ID**; paste Avery’s copied **Client ID**, then press **Enter**. Wait for **Testing as: Avery Brooks - 01**, select **Test**, and confirm the green first row and **Rule 1 matched**. Point to the single **Agent priority** column: its first row is **Is equal to Agency growth**, and its second row is **Is equal to Producer priorities**. Select **Cancel** to return to **Page Builder**.`,
          "Switch to the **SitecoreAI** tab used for Profiles. Choose **Optimization → Custom values**, and open **Agent priority**. Find the **Agency growth** business section: **principal**, **licensed in Texas**, and **agency small-business share below 20%**. Avery’s share is about **14.46%**, so she receives this result. Find **Producer priorities**: **producer**, **licensed in Illinois**, **small-business specialization**, and **positive individual small-business production** explain Daniel’s result. Explain that the saved JavaScript classifies the trusted profile; the component uses its named result to choose content. Content authors edit the message and card order in **Page Builder**. Leave the saved **Agent priority** value unchanged, and return to **Page Builder**.",
        ],
        expected: [
          "Daniel’s producer priorities and Avery’s principal priorities differ. Avery’s native profile test verifies her qualification. One central **Agent priority** custom value returns a named business result for the component to use.",
        ],
        talkTrack: [
          "We’ll compare Daniel’s and Avery’s priorities, then inspect the profile-driven rule. Liberty Mutual can make each agent’s next opportunity easier to find.",
        ],
        controls: [
          "The native decision table has one **Agent priority** custom-value input. **Is equal to Agency growth** selects **Agency growth priorities**; **Is equal to Producer priorities** selects **Producer priorities**. The readable JavaScript in **Optimization → Custom values → Agent priority** defines the role, licensing, and production criteria. **Standard** and unmatched results receive the original **For all agencies** content.",
          "The rule requires an identified **liberty-mutual-agent** profile, **USD** production currency, and **agency** production scope. Agency small-commercial share is small-commercial production divided by personal plus small-commercial production. The application separately enforces licensed-state eligibility alongside the content personalization.",
          "The priority Builder loads a visitor through **Load profile → Client ID**. Find that UUID in the native profile’s **Inspect → JSON view → clientIds**; the **Profile ID** in the browser URL is a different identifier. Inspect Avery’s current profile in **A1**, and use her **Client ID** throughout the native test.",
          "These read-only checks inspect the existing configuration and do not publish or change a rule. The custom value validates the trusted profile and calculates production share before returning **Agency growth**, **Producer priorities**, or **Standard**. Eligibility changes follow the custom value’s Draft, test, and publication process; authors manage each result’s message and card order in **Page Builder**.",
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
            afterAction: 4,
            title: "Read the named Agent priority results",
            alt: "The single Agent priority decision-table column has Is equal to Agency growth and Is equal to Producer priorities rows; Avery’s Agency growth row is green after the native test.",
            caption:
              "In **Liberty Mutual - Agency product priorities**, the single **Agent priority** column uses two distinct results: **Is equal to Agency growth** and **Is equal to Producer priorities**. Avery’s first row is green after **Test**.",
            crop: {
              x: 125,
              y: 285,
              width: 725,
              height: 210,
              sourceWidth: 1440,
              sourceHeight: 900,
            },
            annotations: [
              {
                x: 2.76,
                y: 7.14,
                width: 56.55,
                height: 85.71,
                label: "Compare the two named priority results.",
              },
            ],
          },
          {
            file: "demo-agent-priority-custom-value.png",
            afterAction: 5,
            title: "Read the central Agent priority business rules",
            alt: "Published Agent priority custom value with the 20% growth threshold and readable Agency growth and Producer priorities business sections.",
            caption:
              "Open **Optimization → Custom values → Agent priority**. **growthShareLimitPercent = 20** sets the agency-growth threshold. The **Agency growth** and **Producer priorities** sections return the named results used by the component. Inspect this published value without changing it.",
            crop: {
              x: 25,
              y: 65,
              width: 760,
              height: 645,
              sourceWidth: 813,
              sourceHeight: 987,
            },
            annotations: [
              {
                x: 7.24,
                y: 11.16,
                width: 39.47,
                height: 4.96,
                label: "The agency-growth threshold is **20%**.",
              },
              {
                x: 6.58,
                y: 31.32,
                width: 92.11,
                height: 59.69,
                label: "Read the two named business rules.",
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
          "**Say:** “We’ll use Brand Kit guidance and AI writing assistance within Page Builder. Approved components help marketers create consistent content faster while retaining control.”",
          "Compare the expanded introduction; **Revert to original** keeps authors in control.",
          "Allowed components protect the design while authors edit content.",
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
            "Open **Liberty Mutual — Independent Agents**, marked **PUBLISHED**, then choose **Sections → Tone of Voice**.",
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
          `Switch to the prepared [**Brand Kit**](${BRAND_KITS}) tab, or navigate **Design → Brand kits**. Open **Liberty Mutual — Independent Agents**, marked **PUBLISHED**, then choose **Sections → Tone of Voice**. Explain that a Brand Kit supplies reusable voice and messaging guidance for AI-assisted content generation, and leave the kit unchanged.`,
          `In **Page Builder**, choose **Site switcher → Agent Portal → Editor → Pages → Home**, or open [**Agent Portal Home**](${portalEditor}). Confirm **English** and **Default editing host**. Choose **Layers → Agency priorities → Introduction**, or click the paragraph beneath **Priorities for your agency**; confirm **Introduction** in the right panel. Select **Optimize with AI**, and point to **Adhere to brand kit**. Paste **AI writing prompt** below into **Ask AI for content improvements**, and select **Generate content**. When **Ready!** appears, look for **Build your next opportunity.** and a visibly longer paragraph. Compare the new wording with the original, and check that its meaning is preserved without new claims. Select **Revert to original**, and confirm the original wording returns. Leave **Keep optimized**, **A/B/n test**, and **Publish** untouched.`,
          "In **Layers**, find **headless-agency-priorities**, and choose its **Insert into** button before or after **Agency priorities**. The filtered **Components** picker shows **Business priorities → Agency priorities** for this placeholder. Close the picker without selecting a component or inserting content. Explain that authors change content; reusable components control presentation, page designs supply shared structure, and placeholder settings limit which components fit each area.",
        ],
        expected: [
          "Marketers can use brand guidance and native AI assistance while editing content, with reusable design and restricted component choices preserving a consistent portal.",
        ],
        talkTrack: [
          "We’ll use Brand Kit guidance and AI writing assistance within Page Builder. Approved components help marketers create consistent content faster while retaining control.",
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
          "**Say:** “We’ll reorder the principal audience’s recommendations without changing code. Marketers can quickly align agent guidance with Liberty Mutual’s business priorities.”",
          "Save a new **Draft**; the approved live order stays unchanged.",
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
            "Open the component’s personalization dropdown, initially **Original**, and choose **1 Agent priority is equal to Agency growth**.",
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
          "In **Page Builder**, choose **Site switcher → Agent Portal → Editor → Pages → Home**, and confirm **English** and **Default editing host**. Choose **Layers → Agency priorities**, selecting the component, then open the right-hand **Content** tab. In its personalization dropdown, initially **Original**, choose **1 Agent priority is equal to Agency growth**. Confirm **Content item → Agency growth priorities**; its **Ordered recommendations** field appears in this panel.",
          "In the **Agency growth priorities** content-item card, open its version selector, explicitly select **Priority baseline version** recorded under **Before presenting**, and wait for its fields to finish loading. Confirm that selected original version number and its order: **Small business growth → Texas workers compensation → Home and auto conversations**. Choose **Create version**, name it **Texas guidance priority**, and click **Create**. Reopen the version selector, explicitly select the new **Texas guidance priority** **Draft** row by its new version number, and wait for its fields to finish loading. Confirm the selected version number before changing **Ordered recommendations**.",
          "Find **Ordered recommendations**. For this reorder, click **Remove all items** to clear only this draft’s selection. Use the far-right **down-chevron** to open the available choices, then click the **card names** **Texas workers compensation**, **Small business growth**, and **Home and auto conversations**, in that order. Selected chips determine the cards on the canvas. Click the item heading to close the picker, and wait for **Saved**. Record the version number currently shown as **Saved priority version**. Use that same saved version number for submission, approval, and publication. With **Saved priority version** selected, confirm **Texas workers compensation → Small business growth → Home and auto conversations**, that the version remains **Draft**, and that the canvas shows Texas guidance first. Leave it unpublished for the following preview and review steps.",
        ],
        expected: [
          "The new Draft references the same approved cards in the new order. Avery’s live page retains the published order until the following preview and publication loop completes.",
        ],
        talkTrack: [
          "We’ll reorder the principal audience’s recommendations without changing code. Marketers can quickly align agent guidance with Liberty Mutual’s business priorities.",
        ],
        controls: [
          "**Ordered recommendations** is an ordered native item selection. **Agency growth priorities** supplies the first personalized rule’s content; **Producer priorities** supplies the second rule’s content.",
          "The original approved version is retained. Saving the new **Draft** changes authoring content, with publication still governed by the configured workflow.",
        ],
        links: [
          { action: 1, afterLine: 0, label: "SitecoreAI", href: SITECORE_AI },
        ],
        images: [
          {
            file: "demo-portal-priority-order-in-context.png",
            afterAction: 3,
            title: "Confirm the selected recommendation order",
            alt: "Page Builder’s Ordered recommendations field has three selected cards, with Texas workers compensation guidance first.",
            caption:
              "In the right-hand **Content** panel, read **Ordered recommendations** from top to bottom: **Texas workers compensation → Small business growth → Home and auto conversations**. This selected order controls the cards in **Agency growth priorities**.",
            crop: {
              x: 980,
              y: 545,
              width: 295,
              height: 160,
              sourceWidth: 1280,
              sourceHeight: 720,
            },
            annotations: [
              {
                x: 3.39,
                y: 7.5,
                width: 94.91,
                height: 85,
                label: "**Ordered recommendations** controls the card order.",
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
          "**Say:** “We’ll preview each content variant before publishing. Marketers can check the intended agent experience and release changes with confidence.”",
          "**Personalization Preview**, a private Marketplace extension, compares native content variants.",
          "Publish once; Avery’s order changes, while Daniel’s stays unchanged.",
        ],
        presenterCues: [
          { point: 1, action: 1, afterLine: 2 },
          { point: 2, action: 3, afterLine: 3 },
          { point: 3, action: 6, afterLine: 4 },
        ],
        actionPurposes: [
          "Open the selected page’s available content variants",
          "Preview the Texas-first Agency growth priorities Draft",
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
            "Close **Personalization Preview**, then in **Page Builder**, choose **Layers → Agency priorities → Content**. In the component’s personalization dropdown, choose **1 Agent priority is equal to Agency growth**.",
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
          "Close **Personalization Preview**, then in **Page Builder**, choose **Layers → Agency priorities → Content**, and select **1 Agent priority is equal to Agency growth** in the component’s personalization dropdown. Confirm **Content item → Agency growth priorities**, and choose its **••• (Data source options) → Open in Content mode**. Confirm the **Agency growth priorities** heading. Select **Saved priority version**, wait for its fields to load, and recheck **Draft** and the Texas-first order in **Ordered recommendations**. Choose **Actions → Submit**, enter **Prioritize Texas workers compensation guidance**, and click **Submit**. Confirm **Awaiting approval**.",
          "Stay on the same **Saved priority version** in **Page Builder**, inspect its submitted order, and choose **Actions → Approve**. Enter **Approved agency priority update**, click **Submit**, and confirm **Approved**.",
          "On the same **Saved priority version** in **Page Builder**, confirm **Approved** and its Texas-first order, and choose **Publish**. Keep **Item** and **Current language (English)** selected, leave **Subitems** unchecked, and click **Start publish**. After completion, in the **Avery portal** tab, select **My workspace** in the left navigation, and reload; confirm Texas guidance first. Repeat in **Daniel portal**, and confirm his household-first order remains unchanged.",
        ],
        expected: [
          "Personalization Preview shows the draft Agency growth priorities and unchanged Producer priorities on the same Home page. Publishing the reviewed priority collection updates Avery’s Home without publishing Home manually or deploying frontend code; Daniel remains unchanged.",
        ],
        talkTrack: [
          "We’ll preview each content variant before publishing. Marketers can check the intended agent experience and release changes with confidence.",
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
          "**Say:** “We’ll change one shared copyright notice and see both sites update. Liberty Mutual maintains consistent content once, while each site keeps its own design.”",
          "**2025 → 2026**: publish once, then compare versions while delivery completes.",
          "Confirm **2026** in both live footers before restoring.",
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
          "We’ll change one shared copyright notice and see both sites update. Liberty Mutual maintains consistent content once, while each site keeps its own design.",
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
          "**Say:** “We’ll compare versions and restore earlier wording through approval. Liberty Mutual can correct content safely while preserving a clear history of changes.”",
          "**Versions** compare wording; **Statistics** shows who changed it and when.",
          "Both footers return to **2025**; every version remains available.",
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
          "We’ll compare versions and restore earlier wording through approval. Liberty Mutual can correct content safely while preserving a clear history of changes.",
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
