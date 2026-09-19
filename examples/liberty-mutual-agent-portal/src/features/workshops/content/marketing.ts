import type { GuideLink, GuideStep, WorkshopGuide } from "../types";

const LIVE = "https://liberty-mutual-agent-portal.vercel.app";
const PREVIEW =
  "https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app";
const ORG = "org_XqL3u1MSNVuubOTb";
const TENANT = "97eea84c-ac47-4d91-7e4f-08defdaaa7df";
const SITECORE = `https://app.sitecorecloud.io/?organization=${ORG}&tenantId=${TENANT}`;
const PAGES = `https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=${ORG}`;
const PROFILES = `https://app.sitecorecloud.io/performance/profiles?organization=${ORG}&tenantId=${TENANT}`;
const STUDIO = `https://agentic-studio-use.sitecorecloud.io/spaces/21e4d9d9-ba94-498e-808e-1b1ae125066c?organization=${ORG}&tenantName=scaipocusem400b-sitecoreai950c-demo4418`;
const FORMS = `https://forms.sitecorecloud.io/design/preview?organization=${ORG}&tenantName=scaipocusem400b-sitecoreai950c-demo4418&entityId=980983421c624d078ccf2fd29e4ae665-use`;
const REPO = "https://github.com/tohams/liberty-mutual-sitecoreai/blob/main";

const liveLogin: GuideLink = {
  label: "Open the live portal login",
  href: `${LIVE}/login`,
};
const previewLogin: GuideLink = {
  label: "Open the transaction-preview login",
  href: `${PREVIEW}/login`,
};
const liveReset: GuideLink = {
  label: "Live portal: Reset a reviewer number and current identities",
  href: `${LIVE}/workshops/reset`,
};
const previewReset: GuideLink = {
  label: "Transaction preview: Reset a reviewer number and current identities",
  href: `${PREVIEW}/workshops/reset`,
};
const pageBuilder: GuideLink = { label: "Open Page Builder", href: PAGES };
const sitecoreWorkspace: GuideLink = {
  label: "Open SitecoreAI",
  href: SITECORE,
};
const profileLink: GuideLink = {
  label: "Open SitecoreAI Profiles",
  href: PROFILES,
};
const platformPrerequisite =
  "Open the Sitecore tool linked in this guide and sign in with the email address that received your **Sitecore Cloud** invitation. The link targets **Safeco Insurance Company of America POC** and its **SitecoreAI / Demo** environment. If a step uses **Page Builder**, confirm **Liberty Mutual Agent Portal** is selected there. If access is denied or another organization opens, ask the workshop team to check your invitation; a portal username such as **daniel.01** cannot provide this access.";
const authorPrerequisite =
  "In **Page Builder**, keep the editing host at **Default** so the canvas uses the hosted portal. CMS pages are shared across the workshop; your portal reviewer number does not create a separate CMS copy. Follow the editing mode stated in this guide. Scoped workshop **Author** and **Approver** roles permit the paired workflow exercise, not edits to every resource or campaign page.";
const packPrerequisite =
  "Find your name and reviewer number in **Attendee assignments** on this workshop website. Use that same number after the dot in every portal username. Number 01 is for presenters; attendees use their listed number from 02–15. If your name is not listed, ask the workshop team for a number before starting. The workshop team provides Sitecore authoring roles and practice-pair assignments separately.";
const signOut =
  "Click the signed-in person’s name or avatar in the upper right, then **Sign out**. Wait for **Welcome back** before switching to another persona.";
const persistentWork =
  "Saved work has no automatic expiry. Signing out ends the session but keeps saved work and native **SitecoreAI** profile history.";
const sharedReset =
  "To keep your new record for review, sign out without resetting. To repeat from the starting data, use the **Transaction preview: Reset a reviewer number and current identities** link below. Sign in to that workshop website if requested, select your number from **Attendee assignments** under **Reviewer number**, and wait until anyone using that number has finished. Click **Reset reviewer {{pack}}**, wait for **Reviewer {{pack}} is ready**, and sign in to the portal again. This removes saved changes for all seven personas with that number on the transaction-preview host and activates seven clean native profiles. It does not reset the live portal. Earlier native profiles and experiment history remain; CMS content, **Search**, **Agentic** artifacts, and webhook receipts are unchanged.";

const personaNames = {
  avery: "Avery Brooks",
  maya: "Maya Chen",
  jordan: "Jordan Ellis",
  daniel: "Daniel Ortiz",
  priya: "Priya Shah",
  marcus: "Marcus Reed",
  elena: "Elena Park",
};

function login(persona: keyof typeof personaNames, preview = false): GuideStep {
  return {
    title: `Sign in as ${persona}.01`,
    action: [
      `Click **${preview ? "Open the transaction-preview login" : "Open the live portal login"}** below. ${preview ? "This host keeps saved practice transactions separate from the live portal." : "This host shows published portal content."} If another person is signed in, click their name or avatar in the upper right, then **Sign out**.`,
      `Enter username **${persona}.01** and password **Sitecore**, then click **Sign in**.`,
    ],
    expected: [
      `**My workspace** opens. The upper-right profile menu must show **${personaNames[persona]}**. If it shows someone else, sign out and repeat this step before comparing content or saving work.`,
    ],
    links: [preview ? previewLogin : liveLogin],
  };
}

export const marketingGuides: WorkshopGuide[] = [
  {
    slug: "start-and-switch-agents",
    audience: "marketing",
    category: "Start here",
    title: "Portal accounts and SitecoreAI workspaces",
    summary:
      "Use the named portal persona and login link in each guide, find your reviewer number, and recognize when a separate Sitecore account is required.",
    outcome:
      "You can sign in, select a persona for its business role, and distinguish portal access from **Sitecore** authoring access.",
    duration: "5 minutes",
    personas: [
      "avery.01",
      "maya.01",
      "jordan.01",
      "daniel.01",
      "priya.01",
      "marcus.01",
      "elena.01",
    ],
    prerequisites: [
      packPrerequisite,
      "The workshop team provides your initial portal sign-in details and any separate **Sitecore Cloud** invitation. After workshop sign-in, **Attendee assignments** and **Reset a reviewer number** require no additional credentials.",
    ],
    links: [
      {
        label: "Attendee assignments",
        href: "https://liberty-mutual-agent-portal.vercel.app/workshops/attendees",
      },
      liveLogin,
      previewLogin,
      sitecoreWorkspace,
      {
        label: "Open the Sitecore Cloud Portal",
        href: `https://portal.sitecorecloud.io/?organization=${ORG}`,
      },
      liveReset,
      previewReset,
    ],
    steps: [
      {
        title: "Use the login link supplied by each walkthrough",
        action: [
          "For browsing, personalization, **Search**, and publication checks, use **Open the live portal login** below. These guides link to liberty-mutual-agent-portal.vercel.app, which displays published content.",
          "The **Portal components: connect campaign content to a saved request** guide names the point at which to use **Open the transaction-preview login** below. Its one saved conversation shows how a custom component can connect an authored campaign to agency work while keeping practice changes separate from the live portal.",
        ],
        expected: [
          "Production and preview keep saved operational work separate.",
          "The transaction preview can display unpublished content. Use the live portal when checking whether a content change has been published, and use the same website for browsing and profile lookup.",
        ],
        links: [liveLogin, previewLogin],
      },
      {
        title: "Recognize the personal and small-commercial accounts",
        action: [
          "**Avery Brooks**: **avery.01**, **Cedar Ridge** agency principal; licensed in Texas, Florida, and Illinois.",
          "**Maya Chen**: **maya.01**, **Cedar Ridge** personal-lines account manager; licensed in Texas, Florida, and Illinois.",
          "**Jordan Ellis**: **jordan.01**, **Cedar Ridge** small-commercial producer; licensed in Texas and Illinois.",
          "**Daniel Ortiz**: **daniel.01**, **Prairie Oak** business-insurance producer; licensed in Illinois and Texas.",
        ],
        expected: [
          "Follow the account named in each guide. Its role, agency, and licenses determine the guidance, records, and business actions available to that agent.",
        ],
      },
      {
        title: "Recognize the specialist accounts and shared agency work",
        action: [
          "**Priya Shah**: **priya.01**, **Harborline** commercial account executive.",
          "**Marcus Reed**: **marcus.01**, **Harborline** surety specialist.",
          "**Elena Park**: **elena.01**, **Summit Specialty** wholesale broker.",
          "All three have Texas, Florida, and Illinois licenses. Their product and transaction authority still differs.",
        ],
        expected: [
          "Colleagues in the same agency and pack share that agency’s saved work. Favorites and learning registrations belong to individual agents. Each attendee’s pack is separate.",
        ],
      },
      login("maya"),
      {
        title: "Switch the person without resetting the exercise",
        action: [
          signOut,
          "For this orientation, sign in as **daniel.01** with password **Sitecore**. Use the same reviewer number as Maya. On later exercises, follow the persona named in that guide. Close any unsaved dialog with its × button or Escape before signing out.",
        ],
        expected: [
          persistentWork,
          "Signing in again resumes the same profile and browsing history. Use **Reset a reviewer number** when you want to repeat an exercise with clean profiles and starting data.",
        ],
      },
      {
        title: "Use a separate Sitecore login for authoring",
        action: [
          "Open **SitecoreAI** using the link above. Use the email address that received your **Sitecore Cloud** invitation, not a portal persona. The workshop team supplies any **Author** or **Approver** role and practice-pair assignment separately.",
          "The **Open SitecoreAI** link goes directly to the POC environment. If you instead begin at the **Sitecore Cloud Portal**, select **Safeco Insurance Company of America POC**, then **SitecoreAI / Demo**. For editing, open **Page Builder** and select **Liberty Mutual Agent Portal**. If access is denied, follow the presenter while the workshop team checks your invitation.",
        ],
        expected: [
          "Your invited Sitecore account opens the authoring tools allowed by its role. Your portal account opens an agent’s workspace. Portal sessions last eight hours; signing in again resumes saved work.",
          "The later walkthroughs show how agent attributes personalize content and how authoring permissions control who can edit, review, and publish it.",
        ],
      },
    ],
    cleanup: {
      body: [
        signOut,
        "This orientation needs no reset: signing out is enough. If you deliberately want a clean start, use **Live portal: Reset a reviewer number and current identities** for live activity or the **Transaction preview** reset link for preview activity. Select your number from **Attendee assignments**, check that nobody is still using it, and click **Reset reviewer** for that number. Wait for **Reviewer [selected number] is ready** before signing in again. Reset restores baseline saved work and clean profiles for all seven personas with that number on that host. It leaves the other host, previous profiles, experiment history, CMS content, **Search**, **Agentic** artifacts, and webhook receipts unchanged.",
      ],
      links: [liveReset, previewReset],
    },
    related: [
      "personalization-by-role",
      "state-aware-search",
      "find-an-agent-profile",
    ],
    sourceSlides: [58, 59, 60, 61, 62, 63, 64, 65, 68],
  },
  {
    slug: "personalization-by-role",
    audience: "marketing",
    category: "Agent experience",
    title: "Personalization: compare four roles in the same portal",
    summary:
      "See how known agent attributes change **Agency growth** guidance while role and state permissions shape the working book.",
    outcome:
      "You can explain the difference between relevant marketing guidance and authority to view or transact business.",
    duration: "12 minutes",
    personas: ["avery.01", "jordan.01", "maya.01", "elena.01"],
    prerequisites: [
      packPrerequisite,
      "Use the live portal. This comparison leaves existing submissions and policies unchanged.",
    ],
    links: [liveLogin],
    steps: [
      login("avery"),
      {
        title: "Read the principal’s growth guidance",
        action: [
          "On **My workspace**, scroll below the **Your priorities** list to the card headed **Agency growth**. Read its headline and the button beneath the description.",
          "Click **Explore the growth path** to see the article chosen for a principal. Then click **Clients & policies** in the sidebar. If a policy filter is active, select **All policies** so you compare the full visible book.",
          "Click **Products & appetite** in the left sidebar, then open the **Risk state** dropdown. Read the available state names to compare Avery’s licenses with the next persona. Then use the upper-right profile menu > **Sign out**.",
        ],
        expected: [
          "**Cedar Ridge**’s principal sees **Build your next chapter in small business**. The action opens the small-business practice resource.",
          "The starting book has six rows: four personal policies and two Juniper small-business policies.",
          "Texas, Florida, and Illinois are available.",
        ],
      },
      login("jordan"),
      {
        title: "Compare the small-commercial producer",
        action: [
          "On **My workspace**, scroll below **Your priorities** to the **Agency growth** card. Read its headline, then click **Prepare a BOP submission** within that card.",
          "Click **Clients & policies** in the sidebar to compare Jordan’s book with Avery’s. Then open **Products & appetite** and inspect **Risk state**.",
          "Click **Quote & submit** in the left sidebar, then the **Pecan Street Design** row. In its details dialog, check reference **SUB-2609-1042**, status **Draft**, and risk state **Texas**. Leave the checklist unchanged, close the dialog, and sign out.",
        ],
        expected: [
          "**Bring a stronger submission to the table** opens an article that helps Jordan prepare a BOP submission.",
          "The baseline book contains **Juniper Businessowners policy** and **Workers compensation**. Only Texas and Illinois are selectable; Florida is absent.",
          "Existing **Draft** SUB-2609-1042 shows Texas.",
        ],
      },
      login("maya"),
      {
        title: "Compare the personal-lines account manager",
        action: [
          "On **My workspace**, scroll below **Your priorities** to the **Agency growth** card and click its **Start the learning path** button.",
          "Click **Clients & policies** in the sidebar to compare Maya’s personal-lines book with the earlier roles, then use the upper-right profile menu > **Sign out**.",
        ],
        expected: [
          "**Connect everyday conversations to new needs** opens the small-business practice article, giving Maya guidance for client conversations.",
          "Four personal rows include Morgan auto and home. Juniper commercial rows are absent.",
        ],
      },
      login("elena"),
      {
        title: "See guidance for a wholesale broker",
        action: [
          "On **My workspace**, scroll below **Your priorities** to the **Agency growth** card. Read the headline **Resources for your next client conversation**, then click **Browse resources** in the same card.",
          "Click **Elena Park** in the upper right to open **Your profile**. Inspect **Distribution channel** and **Licensed states**.",
        ],
        expected: [
          "**Summit Specialty** receives **Resources for your next client conversation** and opens **Learning & resources**, providing a broad resource starting point for Elena.",
          "The profile shows **Wholesale** and Illinois, Texas, and Florida. Compare those attributes with the roles and guidance you saw for Avery, Jordan, and Maya.",
        ],
      },
    ],
    cleanup: {
      body: [
        signOut,
        "No reviewer reset is needed. Browsing may add native engagement history.",
      ],
    },
    related: [
      "state-aware-search",
      "calculated-growth-personalization",
      "affinity-personalization",
    ],
    sourceSlides: [69, 70, 71, 72],
  },
  {
    slug: "state-aware-search",
    audience: "marketing",
    category: "Agent experience",
    title: "Search: find licensed-state guidance and save a resource",
    summary:
      "Search the native **SitecoreAI** index, narrow by state, recover from no results, and verify a personal bookmark.",
    outcome:
      "Daniel sees Illinois, Texas, and nationwide guidance; Maya can also find Florida guidance. A bookmark persists after reload and can be removed independently.",
    duration: "12 minutes",
    personas: ["daniel.01", "maya.01"],
    prerequisites: [
      packPrerequisite,
      "Use the live portal. Result totals can change as published content and the **Search** index change.",
    ],
    links: [liveLogin],
    steps: [
      login("daniel"),
      {
        title: "Search within Daniel’s licensed states",
        action: [
          "Click **Learning & resources**. Click the **Workers compensation** suggestion, or enter **Workers compensation** in the library search field and click **Search**.",
          "Set **Risk state** to **Texas** and inspect the labels on the results. Then select **Illinois** and compare. Open the dropdown again to check whether **Florida** is offered.",
        ],
        expected: [
          "**Risk state** starts at **My licensed states**. Daniel’s scope includes Illinois, Texas, and nationwide guidance; Florida-only guidance is absent.",
          "Each selected state includes that state and nationwide content. **Florida** and **All states** are not offered. Result counts may vary; confirm the state labels rather than expecting a fixed total.",
        ],
      },
      {
        title: "Compare two different reset controls",
        action: [
          "Select **Risk state** > **Nationwide guidance only**.",
          "Click **Clear filters** while filters are active.",
          "Replace the search text with zzq-nomatch-91473 and click **Search**. In the empty-results panel, click **Reset search**.",
        ],
        expected: [
          "**Nationwide guidance only** removes state-specific results while retaining the phrase.",
          "**Clear filters** restores the licensed-state scope and retains **Workers compensation**.",
          "The unmatched phrase produces zero results and **Let’s try another angle**. **Reset search** clears the query and filters while keeping saved resources and profile history.",
        ],
      },
      {
        title: "Read the Texas article and record its bookmark state",
        action: [
          "Click **Workers compensation** again. On **Workers compensation: a Texas starting point**, click **Read resource**.",
          "Read the source and reviewed date to identify the article’s provenance. Note whether the bookmark button starts as **Save resource** or **Saved to your resources**; this tells you whether cleanup should remove a bookmark that you add.",
          "If it says **Save resource**, click it. If already saved, keep it unchanged.",
        ],
        expected: [
          "The Texas article opens with its source, reviewed date, and full guidance.",
          "A new save displays **Resource saved** and changes the button to **Saved to your resources**.",
        ],
      },
      {
        title: "Verify the saved resource after reload",
        action: [
          "Reload the article. Click **Back to learning & resources**, then the **[N] saved resource(s)** button.",
          "In the **Saved for your next conversation** section, look for **Workers compensation: a Texas starting point**. Its presence confirms that Daniel’s bookmark survived the reload.",
          "If you added the bookmark during this run, reopen it and click **Saved to your resources** to remove it. Preserve a pre-existing bookmark. Then sign out.",
        ],
        expected: [
          "The favorite survives reload and belongs to Daniel.",
          "Removing only the newly added bookmark returns the button to **Save resource**.",
        ],
      },
      login("maya"),
      {
        title: "Compare the same search with Maya",
        action: [
          "Open **Learning & resources** and click **Workers compensation**.",
          "Compare the state labels with Daniel’s results and inspect **Risk state** for **Florida**. Using the same query makes the effect of Maya’s Florida license easier to see.",
          "Clear the search input, click **Search**, and leave **Risk state** at **My licensed states** to include all published resource topics. Look for Florida guidance as well as Illinois, Texas, and nationwide guidance.",
        ],
        expected: [
          "Maya’s default scope includes Florida because she holds that license. Guidance eligibility follows licensed states even when the resource is outside her product specialization.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Undo only a bookmark created by this walkthrough, leave any pre-existing favorite intact, then sign out. No pack reset is needed.",
        "Normal article visits remain in **SitecoreAI** history and may build affinities.",
      ],
    },
    related: ["affinity-personalization", "resource-content-workflow"],
    sourceSlides: [73, 74, 75, 76],
  },
  {
    slug: "campaign-and-conversation",
    audience: "marketing",
    category: "Forms and campaigns",
    title: "Portal components: connect campaign content to a saved request",
    summary:
      "See how a SitecoreAI portal combines marketer-managed navigation, accordions, and resource links with a custom component that saves an agent’s request.",
    outcome:
      "You can explain how **SitecoreAI** content and custom application components work together: marketers manage the campaign, and application code connects an agent’s next action to saved business data.",
    duration: "10 minutes",
    personas: ["daniel.01"],
    prerequisites: [
      packPrerequisite,
      "Use **Open the live portal login** for the first browsing step. At **Switch to the preview before saving work**, use **Open the transaction-preview login**; that host keeps the saved conversation separate from live portal work.",
    ],
    links: [liveLogin, previewLogin],
    steps: [
      login("daniel"),
      {
        title: "Follow campaign navigation and guidance",
        action: [
          "Beside **Agency growth** in the sidebar, click **Show Agency growth pages**, then **Small business growth**.",
          "Under **ON THIS PAGE**, select **Opportunity**, **Your questions**, and **Your next step**.",
          "Expand **Where should my team begin?** and **What should we prepare before asking for a review?** To inspect keyboard access, press Tab until an accordion heading has focus, then press Enter to open or close it.",
          "Under **Keep useful guidance close**, open **Develop your small-business practice**. Use the browser’s Back button to return to the campaign; this checks that the linked guidance supports the campaign message.",
        ],
        expected: [
          "**Small business growth** opens with an introduction and links to the campaign’s main sections.",
          "Each section link scrolls to its matching heading, the title includes a growth icon, and each accordion reveals authored rich text.",
          "The resource, preparation, and product links help an agent move from the campaign message to useful guidance. Marketers manage the campaign content and composition in **Page Builder**; developers implement the components’ behavior.",
        ],
      },
      {
        ...login("daniel", true),
        title: "Switch to the preview before saving work",
      },
      {
        title: "Check dialog focus and dismissal",
        action: [
          "On the transaction preview, expand **Agency growth** in the sidebar, open **Small business growth**, select **Your next step**, and click **Plan a conversation**.",
          "Press Escape, then reopen **Plan a conversation**.",
        ],
        expected: [
          "The dialog opens with **Close dialog** focused. Escape closes it and returns focus to **Plan a conversation**.",
        ],
      },
      {
        title: "Save and retrieve a conversation topic",
        action: [
          "In **What would you like to discuss?**, enter Growth review [your initials] [today’s date/time].",
          "Click **Save conversation request**, then **View your requests**.",
          "Reload **Support** and locate your unique topic.",
        ],
        expected: [
          "The dialog closes and **Request saved.** appears.",
          "The custom component saves the topic through the portal’s server API, and the request remains available after reload. This demonstrates an interactive portal that brings authored content and business actions into one experience.",
          "The sandbox uses synthetic agency data and application-managed storage. A deployed business solution would connect this component to the appropriate system, such as **Salesforce**. That integration requires implementation; saving this request does not send email or create a Salesforce record.",
          "This one example represents the portal’s other working submission, policy, and surety components, which remain available for exploration. The separate **Native Forms: trace Contact your team to a webhook** guide shows the marketer-managed form and actual webhook delivery.",
        ],
      },
    ],
    cleanup: {
      body: [signOut, "Record the request topic.", sharedReset],
      links: [previewReset],
    },
    related: [
      "native-contact-form",
      "campaign-composition",
      "calculated-growth-personalization",
      "architecture-and-ownership",
    ],
    sourceSlides: [87, 88],
  },
  {
    slug: "native-contact-form",
    audience: "marketing",
    category: "Forms and campaigns",
    title: "Native Forms: trace Contact your team to a webhook",
    summary:
      "Inspect the marketer-managed form, submit fictional details, and match the message to its receiving webhook record.",
    outcome:
      "You see the SitecoreAI form-to-webhook path and where a business database or **Salesforce** integration would connect.",
    duration: "10 minutes",
    personas: ["daniel.01", "Sitecore form administrator"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Review the existing form configuration without editing it, then submit fictional details through the portal. Before starting, ask the workshop team for the current **Demo Webhook** receipt-inbox link and confirmation that its receiver is active. If you lack Forms administration or receiver access, follow the presenter for configuration and receipt inspection.",
      "Use fictional contact details. The workshop receiver collects submitted data for inspection; a business backend would handle **Salesforce** activity or email delivery.",
    ],
    links: [
      { label: "Open Contact your team in SitecoreAI Forms", href: FORMS },
      {
        label: "Open Contact your team in the portal",
        href: `${LIVE}/support#contact-your-team`,
      },
      liveLogin,
    ],
    steps: [
      {
        title: "Inspect the native form configuration",
        action: [
          "Click **Open the native form** below. In **SitecoreAI Forms**, confirm the form name is **Contact your team**, select **Edit form**, and then select **Edit** to open the designer.",
          "On the form canvas, read the five field labels: **Your name**, **Work email**, **Agency name**, **How can we help?**, and **What would you like to discuss?**. These are the fields you will complete in the portal.",
          "Click the **Settings** gear in the form designer. Read the selected webhook name **Demo Webhook**, check **Site** availability for **liberty-mutual-agent-portal**, and read the configured success message. Leave these settings unchanged.",
        ],
        expected: [
          "The form is **Active** for **liberty-mutual-agent-portal**. All five fields are required.",
          "Topic choices are **Agency growth**, **Product guidance**, and **Portal support**. **Site** availability shows 1 out of 1.",
          "**Push changes** is available for reviewed active-form updates. Leave it untouched and return to preview without changing the form.",
        ],
        links: [{ label: "Open the native form", href: FORMS }],
      },
      login("daniel"),
      {
        title: "Complete the agent-facing form",
        action: [
          "Click **Support** in the left sidebar, then scroll below the relationship-team cards to the form headed **Contact your team**.",
          "Optionally click **Send request** while the form is blank to inspect the five required-field errors. Fill **Your name**: **Daniel Ortiz**; **Work email**: **daniel.01@example.com**; **Agency name**: **Prairie Oak Insurance**.",
          "Select **How can we help?** > **Agency growth**. In **What would you like to discuss?**, enter a unique marker such as LM-NATIVE-[your initials]-[date-time].",
          "Click **Send request** once.",
        ],
        expected: [
          "Required fields and invalid email formats prevent an incomplete request from sending.",
          "A successful request displays **Thank you. Your request has been received.** The fields clear while the form remains visible.",
        ],
        links: [
          {
            label: "Open Support: Contact your team",
            href: `${LIVE}/support#contact-your-team`,
          },
        ],
      },
      {
        title: "Find your form submission in the receiver",
        action: [
          "Open the receipt-inbox link supplied by the workshop team, or follow the presenter’s receiver view. Find the **POST** request containing the exact **LM-NATIVE-…** marker you entered; do not use another attendee’s receipt.",
          "Open that receipt’s **Request Content** or **Raw Content** view and compare the name, email, agency, topic, and discussion text with your entries. This confirms delivery beyond the form’s on-screen success message.",
        ],
        expected: [
          "The matching JSON and **Contact your team** metadata establish receipt of this specific request.",
          "The matching marker connects the portal submission to its received data. Use the receipt-inbox link supplied by the workshop team to inspect these records.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Reload the form to clear the confirmation, then sign out. Keep earlier receipts unchanged; any optional repeat uses a new marker.",
        "No reviewer reset is needed, and a pack reset cannot delete webhook receipts.",
        "**Native Forms** owns the form design and webhook delivery. A governed backend is needed to persist business records, create **Salesforce** activity, send email, or implement a production database.",
      ],
    },
    related: ["campaign-and-conversation", "marketing-capability-boundaries"],
    sourceSlides: [89, 90],
  },
  {
    slug: "resource-content-workflow",
    audience: "marketing",
    category: "Content authoring",
    title: "Author, classify, publish, and restore a resource",
    summary:
      "**Presenter-led:** Follow one shared Texas article from a new **Draft** through managed metadata, approval, publication, **Search** refresh, and exact restoration.",
    outcome:
      "The article and **Search** result show the same approved wording, then both return to the recorded starting content.",
    duration: "25–35 minutes, including publish and index time",
    personas: ["daniel.01", "Authorized Sitecore author"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      authorPrerequisite,
      "The workshop team selects one presenter to edit the shared Texas article; everyone else follows that screen. The presenter needs permission to edit and publish the resource; **Resource metadata** currently requires organization administrator/owner access. For hands-on editing with a scoped **Author** or **Approver** role, use **Author and approver: review and publish content together** on your team-assigned pair page.",
      "Reserve enough time to complete publication, **Search** refresh, and restoration. Do not leave the temporary summary published.",
    ],
    links: [
      pageBuilder,
      liveLogin,
      {
        label: "Resource metadata authoring guide",
        href: `${REPO}/docs/resource-metadata-authoring.md`,
      },
    ],
    steps: [
      login("daniel"),
      {
        title: "Record the live article’s starting content",
        action: [
          "Open **Learning & resources**, search **Workers compensation**, and open **Workers compensation: a Texas starting point**.",
          "Copy the current summary, source, and body into your notes before editing. You will use this exact text to restore the article at the end.",
          "Keep this live portal tab for publication checks.",
        ],
        expected: [
          "Your notes capture the article as agents see it now and provide the values needed for cleanup.",
        ],
      },
      {
        title: "Create one named English Draft",
        action: [
          "Click **Open Page Builder** below. In the left page tree, expand **Home** > **Learning & resources**, then select **Workers compensation: a Texas starting point**. Click the stacked-layers **Layers** icon above the tree and select **ResourceArticle**.",
          "Above the page canvas, the version dropdown is immediately left of **Default editing host**. Open it, record the selected **English** version number, then choose **Create version**. Name the version resource-review-[your initials]-[date-time] and click **Create** so you can recognize it later.",
          "Reopen that version dropdown and select the newest **English** **Draft** with your version name. Wait for its fields to load. In the top toolbar, click the puzzle-piece **Apps** icon, then **Resource metadata**. Check the selected page, language, and version shown in the panel.",
        ],
        expected: [
          "The panel displays the metadata for the selected resource page. Check its page name, language, and version before changing a value.",
          "A new **Draft** preserves earlier versions of this same shared article; it does not create a separate attendee page. Only the presenter edits this version. The panel identifies the page, **English** language, and version. **Approved** versions are read-only.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Understand the managed choices",
        action: [
          "Record all five loaded values. The baseline is **Risk state**: Texas; **Business family**: **Small commercial**; **Product**: **Workers’ compensation**; **Distribution channel**: **Independent agent**; **Resource type**: **State guidance**.",
          "Scroll within the **Resource metadata** panel to read all five dropdowns and their help text. Copy each current value into your notes so you can restore it after testing.",
        ],
        expected: [
          "Each field permits one selection, giving authors consistent choices for describing the resource.",
          "The custom **Marketplace** panel makes classification easier for authors. These choices help **Search** return resources that match an agent’s state and interests.",
        ],
      },
      {
        title: "Try an unsaved change and discard it",
        action: [
          "Select **Resource type** > **Preparation guide**.",
          "At the bottom of the panel, check for **1 unsaved change** and an enabled **Save metadata** button. Click **Discard changes** beside that button.",
        ],
        expected: [
          "**1 unsaved change** appears and **Save metadata** becomes available; the canvas retains the saved classification.",
          "Discard returns the dropdown to the loaded value and shows **No unsaved changes**. No save occurred.",
        ],
      },
      {
        title: "Save metadata, read it back, then restore it",
        action: [
          "Set **Resource type** to **Preparation guide** again and click **Save metadata** at the bottom of the panel. After **Metadata saved** appears, click **Refresh** beside the selected-resource details near the top of the panel.",
          "Restore the original **Resource type** recorded earlier. Click **Save metadata**, then **Refresh**.",
          "Select **Learning & resources**, then return to the Texas article and the same **English** **Draft**. Verify all five original values.",
        ],
        expected: [
          "**Metadata saved** and **No unsaved changes** appear. The **Draft** canvas shows **PREPARATION GUIDE TX**, and **Refresh** retains the saved choice.",
          "Returning to the Texas article reloads the saved classification. The metadata controls are available on resource articles.",
          "Continue working in this same **Draft**. Restore its original classification before the publication steps so the temporary value stays out of the live library.",
        ],
      },
      {
        title: "Edit and preview the temporary summary",
        action: [
          "Close **Resource metadata** with the × at the panel’s upper right. Click the **Content** tab in Page Builder’s top navigation, then locate the **Summary** field for the selected Texas article.",
          "Enter: Prepare your next Texas employer conversation using this source-linked overview.",
          "Click outside **Summary** and wait for the **Saved** checkmark. Click **Editor** in the top navigation. Keep the same **Draft** and **Default editing host**, then read the summary immediately below the article title in the page preview.",
        ],
        expected: [
          "The **Content** tab saves when you click outside the field. The **Saved** checkmark confirms the change, and the page preview shows the temporary summary with the original source and body.",
        ],
      },
      {
        title: "Approve and publish only this page",
        action: [
          "Choose **Actions** > **Approve**, enter the comment Workshop resource summary review, and click **Submit**. Confirm **Approved** before publishing.",
          "Open **Publish**. Uncheck **Include related items** first, then **All references**. Keep **Page** and **Current language (English)** checked; leave **Subpages** off.",
          "Click **Start publish** and wait for completion.",
        ],
        expected: [
          "This resource uses **Basic Workflow**, which moves directly from **Draft** to **Approved**. The separate **Workshop practice** pages use **Draft** → **Awaiting approval** → **Approved**.",
          "Publication sends the approved **English** article to the live portal. Because this exercise changes only the article summary, publish the page with its existing image left unchanged.",
        ],
      },
      {
        title: "Verify live delivery and refresh the exact Search source",
        action: [
          "Reload the article in Daniel’s live portal tab and compare the temporary summary.",
          "In **SitecoreAI**, open **Content** > **Search Sources** > **Liberty Mutual Agent Resources** > **Settings**. Verify source ID b5e24aff-8b5b-4653-bf66-deef52c1241a.",
          "Return to the source list and click **Reindex Content** once for that source. Wait until the job reaches **Succeeded**.",
          "As Daniel, search **Workers compensation** again; compare the Texas result card and article.",
        ],
        expected: [
          "The updated live article confirms publication. Refreshing **Search** then brings the library result card into line with that article.",
          "Once indexing reaches **Succeeded**, both the result card and article show the exact temporary summary.",
        ],
        links: [sitecoreWorkspace],
      },
      {
        title: "Restore through a new version and publication",
        action: [
          "On the same Texas page, open the version selector > **Create version**, enter resource-restore-[your initials]-[date-time], and click **Create**. Reopen the selector, select this newest **English** **Draft**, and wait for its fields to load. Restore the summary recorded at the start.",
          "Click outside the field, wait for **Saved**, and inspect the restored **Draft**.",
          "**Actions** > **Approve** > **Submit**. Confirm **Approved**. **Publish** with **Include related items** off first, then **All references** off; **Page** and **Current language (English)** on, **Subpages** off.",
          "Confirm publication, then run **Reindex Content** once on the same **Liberty Mutual Agent Resources** source and wait for success.",
        ],
        expected: [
          "The restored version is published and indexed, with earlier versions retained for review.",
        ],
      },
      {
        title: "Check the complete restoration",
        action: [
          "Reload Daniel’s live article and repeat the **Search**. Compare the starting **Summary** in both the article and result card, then check the article’s **Source** and **Body** against your notes.",
          "Record the restoration version and publish/index outcomes.",
        ],
        expected: [
          "The original wording and all five metadata values are restored. A reviewer-pack reset cannot undo or replace these CMS restoration steps.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Complete the final restoration and verify both live article delivery and **Search** before leaving. **Sign out** of the portal.",
        "If a temporary metadata value was accidentally published, restore it in a new **Draft**, approve and publish the exact page, then reindex the same **Search** source. A reviewer reset has no effect on CMS content.",
      ],
    },
    related: [
      "author-approver-workflow",
      "create-resource-and-media",
      "state-aware-search",
      "marketing-capability-boundaries",
    ],
    sourceSlides: [17, 18, 19, 20, 21, 22, 23],
  },
  {
    slug: "create-resource-and-media",
    audience: "marketing",
    category: "Content authoring",
    title: "Create a resource page with local content and Modern Media",
    summary:
      "**Presenter-led:** Create a uniquely named **Resource page** with blank fields and its own local **Data** folder, then select an image and inspect its accessible description.",
    outcome:
      "The new unpublished page has its own image content item and can be removed without changing existing articles or shared assets.",
    duration: "15 minutes",
    personas: ["Your Sitecore author account"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "Follow the presenter for this guide. The presenter needs permission to create and delete pages under **Learning & resources**, edit local image content, and use **Modern Media Library**. **Resource metadata** additionally requires organization administrator/owner access. Scoped workshop **Author** and **Approver** roles do not include these permissions.",
      "The presenter creates one uniquely named page with its own **Data**/**Resource image**, keeping existing resources unchanged. Keep this page unpublished and delete it at the end. Attendees do not need to create copies.",
    ],
    links: [
      pageBuilder,
      {
        label: "Resource page authoring guide",
        href: `${REPO}/docs/resource-page-authoring.md`,
      },
    ],
    steps: [
      {
        title: "Create a page from the resource branch",
        action: [
          "In **Page Builder**, confirm **Liberty Mutual Agent Portal** in the site selector at the upper left. In the left page tree, expand **Home**, select **Learning & resources**, and open its … menu > **Create a subpage**.",
          "Choose **Resource page** > **Select**. Enter a unique lowercase, hyphen-separated name such as resource-practice-jd-20260918-1430, replacing the initials and date/time with your own. Press Enter.",
          "Click **Reload tree** and select your new page.",
        ],
        expected: [
          "**Page created from branch template** appears. The title starts with the page name you entered; summary, body, reviewed date, source, and metadata start empty.",
          "The branch supplies **ResourceArticle** and its nested **ResourceImage**, plus a local **Data**/**Resource image** item. You can fill the new page without assembling the layout or changing existing articles.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Add practice content and a Media image",
        action: [
          "With your new page selected, click **Content** in the top navigation. Set **Title** to Resource practice [your initials] and **Summary** to Practice guidance for an agent conversation. Click outside each field and wait for **Saved**.",
          "Click **Editor** in the top navigation. In the page preview, click the blank image area between the summary and body, then **Browse media library** > **Media BETA**.",
          "Select **liberty-mutual-businessowner-preparing-submission.jpg**. Inspect **Details** > **Alt text** and **Delivery** > **Public link**.",
          "Under **Image transformation**, set **Width** to 640 with aspect ratio locked, then click **Insert**.",
        ],
        expected: [
          "The canvas shows your practice content. The selected photograph has descriptive alt text and an active public link.",
          "The image saves to this page’s **Data**/**Resource image**. Reload to confirm that the image remains 640 pixels wide and retains its proportions.",
        ],
      },
      {
        title: "Inspect metadata without changing classification",
        action: [
          "Keep the new resource page selected. Click the puzzle-piece **Apps** icon in the top toolbar, then **Resource metadata**.",
          "Inspect the five dropdowns. Set **Resource type** to **Preparation guide**, observe the unsaved-change indicator, then click **Discard changes** to return to the blank starting classification.",
        ],
        expected: [
          "The loaded values return. Each field currently accepts one choice and this page remains unpublished.",
          "The resource’s classification is managed through **Resource metadata**, while its photograph is selected through the image field.",
        ],
      },
      {
        title: "Inspect the shared asset’s editable metadata",
        action: [
          "In **SitecoreAI**, open **Content** > **Media BETA**. Select **liberty-mutual-small-business-team-planning.png**.",
          "Open **Details** > **Tags** > **Edit tags** and inspect the choices. Select **Alt text** and inspect **Description** and the public-link expiration.",
          "Leave the values unchanged and close the dialog.",
        ],
        expected: [
          "The reviewed alt text describes two colleagues reviewing a tablet beside warehouse boxes. Public-link expiration is **None**.",
          "You are inspecting reviewed metadata on an existing image. New image uploads can receive AI tag and alt-text suggestions for an author to review. Resource classification is managed separately in **Resource metadata**.",
        ],
        links: [sitecoreWorkspace],
      },
      {
        title: "Verify the page’s independent local image",
        action: [
          "Return to **Page Builder** > **Content**. Expand your exact practice page > **Data** > **Resource image**.",
          "Confirm the image item is beneath your page and the existing articles remain unchanged.",
        ],
        expected: [
          "This page has its own image selection, while the same **Media** asset can be reused on other pages.",
        ],
      },
      {
        title: "Remove only your unpublished practice page",
        action: [
          "Select your practice page in **Content**. Choose **More options (…)** > **Delete**.",
          "In **Delete item**, confirm the dialog names only the resource-practice page you created, then click **Delete**. Click **Reload tree** if the deleted page still appears.",
          "Return to **Learning & resources**. Leave the **Resource page** branch and both **Media** assets intact.",
        ],
        expected: [
          "Your page, versions, and descendants move to the **Recycle Bin**. No live unpublish, **Search** refresh, or workspace reset is needed for an unpublished exercise.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Delete only the uniquely named unpublished page created by this exercise. Never delete its reusable **Media** asset or the **Resource page** branch.",
        "If the practice article was published, work with the **Sitecore** author responsible for it to remove it from live delivery and refresh its **Search** source before considering cleanup complete.",
        "When publishing a resource with a new image, include the page and **Resource image**: keep **Page**, **English**, and **All references** on; clear **Include related items**, leave **Subpages** off, and inspect **View references** before publishing. For this exercise, keep the practice page unpublished and delete it as described above.",
      ],
    },
    related: ["resource-content-workflow", "marketing-capability-boundaries"],
    sourceSlides: [24, 25, 26, 27],
  },
  {
    slug: "campaign-composition",
    audience: "marketing",
    category: "Content authoring",
    title: "Compose a campaign using approved components",
    summary:
      "**Presenter-led:** On the shared **Campaign practice** page, duplicate a component with its own content, reorder it, and inspect the allowed choices for main and sidebar regions.",
    outcome:
      "You see how native authoring controls provide flexibility within the page’s approved structure.",
    duration: "10 minutes",
    personas: ["Sitecore author"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "The workshop team identifies one presenter with access to **Home** > **Agency growth** > **Campaign practice** and its **Data** items. Everyone else follows that screen. All attendees observe the same practice page; its content is separate from the live campaign. Keep it unpublished, and record its starting component order and local **Data** items before changing them.",
    ],
    links: [pageBuilder],
    steps: [
      {
        title: "Open the shared campaign practice page",
        action: [
          "Open **Page Builder** > **Home** > **Agency growth** > **Campaign practice**.",
          "In **Editor**, click the stacked-layers **Layers** icon at the top of the left pane. Select the first **CampaignAccordion** in that list. Record its position and datasource—the content item supplying its text—so you can identify the duplicate during cleanup.",
        ],
        expected: [
          "The component toolbar is available on the shared, unpublished practice page. Its local content is separate from the live campaign, so the presenter can demonstrate changes without editing the live campaign.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Duplicate and reorder the component",
        action: [
          "In the floating toolbar, click **Duplicate component**. Record the new copy and its datasource.",
          "Select **Move up** on the new copy to change its position. Open **Swap with another component**, inspect the offered replacements, and cancel without swapping. The choices demonstrate the placement rules supplied by developers.",
        ],
        expected: [
          "The copy has independent local content, such as **Start the conversation_var2**; later runs can use another suffix.",
          "The main region offers **CampaignAccordion**, **CampaignAlert**, and **CampaignCallout**. The component remains in an approved location.",
        ],
      },
      {
        title: "Compare the sidebar’s allowed components",
        action: [
          "In the **Layers** list, select **CampaignLinkList**. On its component toolbar, click **Swap with another component**.",
          "Read the component names in the selection dialog, then click **Cancel** to keep the current sidebar component.",
        ],
        expected: [
          "The sidebar offers **CampaignContact** and **CampaignLinkList**, distinct from the main region’s options.",
          "**Page Builder** supports drag-and-drop; these native toolbar actions provide a reproducible way to inspect and change the composition.",
        ],
        note: "**What to notice:** Arrange approved components in the visual **Page Builder** canvas and inspect the choices allowed in each region. Once developers have supplied the components and placement rules, marketers can compose pages without changing component code.",
      },
      {
        title: "Restore the original practice layout",
        action: [
          "In **Layers**, select the duplicate recorded in step 2 and click **Delete** for that component. Compare the remaining order with your notes from step 1; the original accordion must remain.",
          "Open **Content** > **Home** > **Agency growth** > **Campaign practice** > **Data**. Select only the new datasource name recorded in step 2, use **More options (…)** > **Delete**, and confirm that exact name. The page no longer needs this item after its duplicate component is removed.",
          "Reopen **Layers** and compare the original component list and **Data** items.",
        ],
        expected: [
          "The practice page returns to its exact starting structure. Original components and content remain intact.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Keep **Campaign practice** unpublished. Restore the original layout and remove only the datasource created by this run.",
        "For another campaign, the **Campaign page** branch supplies a starting layout with blank content. Restore this practice page through the editing steps above; reviewer resets affect portal work, while CMS layout changes require CMS cleanup.",
      ],
    },
    related: [
      "ai-assisted-authoring",
      "bulk-copy-maintenance",
      "campaign-and-conversation",
    ],
    sourceSlides: [91],
  },
  {
    slug: "ai-assisted-authoring",
    audience: "marketing",
    category: "Content authoring",
    title: "Use AI to improve and draft campaign copy",
    summary:
      "**Presenter-led:** On the shared **Campaign practice** page, fix a deliberate spelling error, review a prompted rewrite, and restore the original rich text.",
    outcome:
      "You can accept, reject, and verify AI-assisted edits while retaining editorial control.",
    duration: "10 minutes",
    personas: ["Sitecore author"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "The workshop team identifies one presenter with access to the unpublished **Campaign practice** page, its **Data** items, and **Optimize with AI**. Everyone else follows that screen because the **Growth opportunity** content item is shared. The presenter records and restores the exact original **Body**, including formatting.",
    ],
    links: [pageBuilder],
    steps: [
      {
        title: "Record the original practice Body field",
        action: [
          "Click **Open Page Builder** below, then **Content** in the top navigation. In the content tree, expand **Home** > **Agency growth** > **Campaign practice** > **Data**, and select **Growth opportunity**. Locate its **Body** rich-text editor.",
          "Copy the complete original **Body**, including formatting, into your notes. Replace it temporarily with: We help your agnecy prepare for the next client conversation. The deliberate misspelling lets you see what the AI correction changes.",
        ],
        expected: [
          "**Body** is the rich-text field for **Growth opportunity** on the unpublished practice page. Its editor provides the AI tools used in the next step.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Review and keep a grammar correction",
        action: [
          "Click inside the **Body** rich-text editor to expose its editing toolbar. Select **Optimize with AI**, then **Fix spelling and grammar**.",
          "In the AI result view, compare your sentence with the proposed correction. Confirm that **agnecy** becomes **agency**, then click **Keep optimized**.",
          "Wait for the save checkmark and reload the item.",
        ],
        expected: [
          "The accepted correction appears in **Body** and persists after reload. A suggested change remains subject to author review.",
        ],
      },
      {
        title: "Try a short drafting prompt and reject the rewrite",
        action: [
          "Reopen **Optimize with AI** and enter: Write two concise sentences for an agency preparing a small-business submission.",
          "Inspect the proposed wording. If a **Brand Kit** is shown, read its name and leave the selection unchanged. You can explore how brand guidance informs generated content in the **Agentic Studio** walkthrough.",
          "Select **Revert to original** for this current AI rewrite.",
        ],
        expected: [
          "The AI proposes copy for review. **Revert to original** returns to the text present when you opened this rewrite. The next step restores the practice page’s starting text from your notes.",
        ],
      },
      {
        title: "Restore the recorded starting content",
        action: [
          "Restore the exact **Body** recorded before the first temporary edit.",
          "Click outside the field, wait for the saved checkmark, and reload. Compare wording and formatting.",
        ],
        expected: [
          "The practice item matches your recorded wording and formatting. Waiting for the save checkmark before leaving confirms that the restoration reached Sitecore.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Keep the page unpublished and verify exact restoration after reload. Named versions provide a recovery point before substantial edits. Restore CMS content in Page Builder; a reviewer reset applies to portal work.",
      ],
    },
    related: [
      "campaign-composition",
      "bulk-copy-maintenance",
      "agentic-studio-workflow",
    ],
    sourceSlides: [92],
  },
  {
    slug: "bulk-copy-maintenance",
    audience: "marketing",
    category: "Content authoring",
    title: "Bulk editing: inspect the need and implementation options",
    summary:
      "**Read-only:** Inspect repeated wording across four **Page Builder** content items, then compare content reuse with a bulk-update tool.",
    outcome:
      "You can identify repeated content and compare shared content with tools for updating several items together.",
    duration: "5 minutes",
    personas: ["Sitecore content reviewer"],
    prerequisites: [
      platformPrerequisite,
      "This is a read-only discussion. Use an account with access to **Campaign practice** and its **Data** items, or follow the presenter if your role is limited to a **Workshop practice** page.",
    ],
    links: [pageBuilder],
    steps: [
      {
        title: "Locate the separate content items in Page Builder",
        action: [
          "Open **Page Builder** > **Content** > **Home** > **Agency growth** > **Campaign practice** > **Data**.",
          "Expand **Data** and find **Growth opportunity**, **Preparation update**, **Prepare for review**, and **Your next step**. Do not change their fields.",
        ],
        expected: [
          "These are separate content items beneath the unpublished practice page. Their text can be edited independently; the live campaign has its own content.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Inspect why repeated copy creates maintenance work",
        action: [
          "Select **Growth opportunity** and read **Body**, then **Preparation update** and its **Body**.",
          "Read **Prepare for review** > **Answer**, then **Your next step** > **Title**. Look for the phrase relationship team in each field.",
        ],
        expected: [
          "The practice content repeats wording across four independently editable fields. Note where the phrase appears and any differences between items; leave their current content unchanged.",
        ],
      },
      {
        title: "Identify the bulk-editing gap and alternatives",
        action: [
          "For wording that should always stay identical, discuss using one shared content item for multiple components.",
          "For a one-time change across independent items, record the exact items, fields, languages, and versions that a bulk-update process would need to include. Consider a scoped API workflow or **Marketplace** **Content Export/Import Tool** for evaluation.",
        ],
        expected: [
          "**Page Builder** edits these items individually. A shared content item can reduce repeated maintenance, while updating several independent items together requires a bulk-editing tool or implementation.",
          "A bulk-update tool would need review, workflow, publication, and a tested restoration process. The suggested extension has not been installed or validated in this sandbox.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close the practice page without changing or publishing content. No reviewer reset is needed. Keep the bulk-editing requirement and the chosen evaluation questions in your workshop notes.",
      ],
    },
    related: [
      "campaign-composition",
      "ai-assisted-authoring",
      "marketing-capability-boundaries",
    ],
    sourceSlides: [93],
  },
  {
    slug: "alert-dates-and-publication",
    audience: "marketing",
    category: "Content authoring",
    title: "Control alert visibility and understand scheduled releases",
    summary:
      "**Read-only review:** Inspect rich-text alert dates. An optional presenter-led demonstration then shows scheduled publication and expiration on a dedicated sample page.",
    outcome:
      "You can explain which settings hide an alert and which publishing actions change **Live Experience Edge** delivery.",
    duration:
      "10 minutes to inspect; allow the agreed UTC window for a timed release",
    personas: ["Sitecore author", "Developer with publication API access"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "The workshop team identifies a presenter with access to **Campaign practice** for the first two, read-only steps. The final two steps are an optional developer demonstration: before attempting them, the team must supply a developer with publication API access, a prepared sample, and the UTC start and end times.",
    ],
    links: [
      pageBuilder,
      {
        label: "Open the bounded scheduling guide",
        href: `${REPO}/authoring/CAMPAIGN-AUTHORING.md#run-the-bounded-publication-and-expiration-exercise`,
      },
    ],
    steps: [
      {
        title: "Inspect the alert’s authored message and dates",
        action: [
          "In **Page Builder** > **Content**, open **Home** > **Agency growth** > **Campaign practice** > **Data** > **Preparation update**.",
          "Read **Title**, **Body**, **Visible from (UTC)**, and **Visible until (UTC)** without changing them. The dates determine when this component is displayed after publication.",
        ],
        expected: [
          "**Body** is **Rich Text** and can contain meaningful formatting and links.",
          "An empty start has no lower limit; an empty end has no upper limit. The published application hides the alert before its start and at the end of its window.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Keep inactive content editable",
        action: [
          "Select **Campaign practice**, return to **Editor**, and find **CampaignAlert** in **Layers**. Keep the **Default** editing host so you inspect the hosted authoring view.",
          "Compare the canvas with the dates read in step 1. If both dates are empty, no display window is configured. If the recorded window is inactive, the alert remains visible to authors so they can edit it; leave the dates unchanged.",
        ],
        expected: [
          "Authors can still find and edit an alert whose live visibility window is inactive. These fields control presentation; they do not themselves publish or delete content.",
        ],
      },
      {
        title: "Prepare the optional scheduled-publication demonstration",
        action: [
          "For the optional timed demonstration, follow the developer identified by the workshop team. That developer prepares **campaign-schedule-check** using the linked scheduling guide. Continue once they provide the page URL and schedule; otherwise, finish after the alert inspection.",
          "Record the page URL and UTC start and end times supplied by the developer. The developer verifies the **English** page and its local content are initially absent from **Live Experience Edge**, establishing the before-publication baseline.",
        ],
        expected: [
          "The scheduling example uses a dedicated page and matching publishing-availability dates for its content, keeping the exercise scoped to that page.",
        ],
        links: [
          {
            label: "Scheduling procedure and cleanup",
            href: `${REPO}/authoring/CAMPAIGN-AUTHORING.md#run-the-bounded-publication-and-expiration-exercise`,
          },
        ],
      },
      {
        title: "Observe the two delivery boundaries",
        action: [
          "Follow the same developer’s screen as they start the scheduling script. At the agreed start time, observe its publish operation and allow time for the published content to reach **Live Experience Edge**.",
          "Open the production route supplied by that developer and confirm the page appears.",
          "At the end, inspect the second scoped publish operation applying expiration, then confirm the page is absent from **Live Experience Edge** and unavailable on the production route.",
        ],
        expected: [
          "On the live portal, the page is unavailable before the scheduled start, available during the window, and unavailable after expiration. Use that live URL for each check.",
          "The developer’s script automates the two publication operations and then exits. For ongoing scheduled publishing, the implementation would need a managed scheduler, monitoring, and recovery ownership.",
        ],
      },
    ],
    cleanup: {
      body: [
        "The standard alert inspection changes nothing, so no reset is needed. If someone edited a value, restore the recorded **Body** and dates, wait for **Saved**, and reload to verify. Keep **Campaign practice** unpublished.",
        "For the optional timed run, have that developer record both publish-operation IDs and confirm the script exited. The dedicated sample items remain for inspection. A reviewer-pack reset cannot cancel publication jobs or restore CMS content.",
      ],
    },
    related: ["resource-content-workflow", "marketing-capability-boundaries"],
    sourceSlides: [94, 95],
  },
  {
    slug: "find-an-agent-profile",
    audience: "marketing",
    category: "Personalization and measurement",
    title: "Find the active SitecoreAI profile for an agent",
    summary:
      "Match a portal login to its current native profile before interpreting affinities, page views, or experiment activity.",
    outcome:
      "You match the username and reviewer number to the profile currently receiving that person’s browsing events.",
    duration: "5 minutes",
    personas: ["daniel.01", "maya.01", "elena.01", "Sitecore profile reviewer"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Use the live portal and **daniel.01** with your reviewer number for this example. If the calculation or affinity guide sent you here, repeat these lookup steps for the named Avery, Maya, or Elena account with that same number. If a guide explicitly uses the transaction preview, use its reset link instead; lookup and browsing must use the same host.",
    ],
    links: [liveLogin, profileLink, liveReset, previewReset],
    steps: [
      {
        title: "Copy Daniel’s current live-portal identity",
        action: [
          "Click **Live portal: Reset a reviewer number and current identities** below. Sign in to the workshop website if requested, then select your number from **Attendee assignments** under **Reviewer number**. Do not click **Reset reviewer** for this lookup.",
          "Under **current profile identities**, find **daniel.01** with your reviewer number and copy its **Agent identity**. This value identifies the profile currently receiving that account’s browsing activity.",
          "For the affinity guide, also copy **maya.01** and **elena.01** from this same list. All seven identities are visible without signing into each persona. A reset changes the active values, so recopy them after any reset rather than using an earlier note.",
        ],
        expected: [
          "Use **Agent identity** with the **Liberty Mutual agent identity** search filter in the next step. Each reviewer reset supplies new values, so copy the currently displayed identifier.",
        ],
        links: [liveReset, previewReset],
      },
      {
        title: "Search by the native agent identifier",
        action: [
          "In **SitecoreAI**, click **Performance** in the top navigation, then **Profiles** in the left sidebar.",
          "Above the profile results, open the **Search filter** dropdown beside the search input and select **Liberty Mutual agent identity**. Paste the copied identifier into **Search by Liberty Mutual agent identity** and press Enter.",
          "Wait for the matching person, then click their name.",
        ],
        expected: [
          "For this example, the result matches **Daniel Ortiz** and the copied identity. When repeating for Avery, Maya, or Elena, match that person’s name and copied identity. Checking both values selects the current profile even when earlier profiles have the same name.",
        ],
        links: [profileLink],
      },
      {
        title: "Record a baseline before browsing tagged pages",
        action: [
          "On the open profile, select **Overview** and scroll to the **Top affinities** section. Record its topic names and scores, or note that it is empty. These starting values let you compare what later resource visits add.",
          "Click **Engagement** on the profile and open the session whose time matches your portal sign-in. Read its page-view events and note their times so you can recognize later activity. A profile that has not yet browsed may have no session.",
        ],
        expected: [
          "Earlier walkthroughs may already have added history. Signing out and signing in does not clear affinity scores; a reviewer reset activates clean profiles instead. Record any existing scores before making a comparison.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close the **Reset a reviewer number** tab when the identity lookup is complete. Keep only the profile and portal tabs needed for the next exercise.",
        "Lookup changes nothing, so no reset is required. If you later need a fresh comparison, use the reset link for the same host, select your number, and wait until anyone using it has finished before clicking **Reset reviewer**. Wait for **Reviewer [selected number] is ready**, sign into the portal again, and copy the new **Agent identity** values. This resets saved work and activates clean profiles for all seven personas with that number; it retains older native profiles.",
      ],
      links: [liveReset, previewReset],
    },
    related: [
      "affinity-personalization",
      "ab-testing",
      "calculated-growth-personalization",
    ],
    sourceSlides: [96, 61, 65],
  },
  {
    slug: "calculated-growth-personalization",
    audience: "marketing",
    category: "Personalization and measurement",
    title: "Personalization: target a calculated agency opportunity",
    summary:
      "Inspect a reusable JavaScript targeting value, then compare the delivered campaign callout for Avery and Daniel.",
    outcome:
      "You connect known agency production attributes to a transparent calculation and a marketer-controlled content choice.",
    duration: "10 minutes",
    personas: ["avery.01", "daniel.01", "Sitecore personalization reviewer"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Use the live portal. Follow **Find the active SitecoreAI profile for an agent** for Avery and Daniel with your number from **Attendee assignments**. Keep both native profile tabs open; the test needs their profile UUIDs, not the **Agent identity** values used to find them. Leave the saved JavaScript and rules unchanged.",
    ],
    links: [
      pageBuilder,
      liveLogin,
      liveReset,
      {
        label: "Open the growth-opportunity custom value",
        href: `https://app.sitecorecloud.io/personalize/custom-values/9faad837-0e23-4b5b-af10-c6883dba86ac?organization=${ORG}&tenantId=${TENANT}`,
      },
    ],
    steps: [
      {
        title: "Find the rule on its own component",
        action: [
          "In Page Builder’s left page tree, expand **Home** > **Agency growth** and click **Small-business growth**. Keep **Editor** selected in the top navigation.",
          "Click the stacked-layers **Layers** icon at the top of the left pane and select **CampaignCallout**. Open **Edit personalization rules** for that selected component to see which audience receives its personalized content.",
        ],
        expected: [
          "The panel shows **Personalized** and the rule **Liberty Mutual - Small business growth opportunity**. This rule chooses the campaign callout based on the calculated agency opportunity.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Understand the business calculation",
        action: [
          "Click **Open the saved JavaScript custom value** below. Confirm the name **Liberty Mutual - Small business growth opportunity**, then read the code displayed in its editor. Leave the code unchanged.",
          "Read the ratio as small-commercial premium divided by personal plus small-commercial premium. **Growth opportunity** requires a share below 20%.",
        ],
        expected: [
          "The calculation requires an identified principal or producer. Missing, invalid, or zero-total data returns neutral guidance.",
          "The **Unified Data Layer (UDL)** holds the fictional agency production metrics used here. Using **Salesforce** or **Snowflake** data would require an integration with agreed fields, identity matching, access, and update frequency.",
        ],
        note: "**What to notice:** Developers supply a reusable JavaScript calculation; marketers use its result in a visual personalization rule to select authored content. The calculation and data connection are implementation work, while the content choice is managed in **SitecoreAI**.",
        links: [
          {
            label: "Open the saved JavaScript custom value",
            href: `https://app.sitecorecloud.io/personalize/custom-values/9faad837-0e23-4b5b-af10-c6883dba86ac?organization=${ORG}&tenantId=${TENANT}`,
          },
        ],
      },
      {
        title: "Compare the native profile test",
        action: [
          "In each current native profile tab, copy the UUID in the address’s final path segment after /profiles/, stopping before the question mark. This is not the **Agent identity** from the reset page. Return to **Liberty Mutual - Small business growth opportunity**, open **Test**, load Avery’s profile with that UUID, and run the test. Repeat with Daniel’s UUID so both evaluations use known profile attributes.",
          "Compare the returned true/false result with the small-commercial share described in the previous step. Loading a test profile supplies inputs for evaluation; do not edit the stored profile, JavaScript, or published rule.",
        ],
        expected: [
          "**Cedar Ridge**’s 14.46% share matches the criterion. **Prairie Oak**’s 36.86% share gives Daniel neutral guidance.",
        ],
      },
      login("avery"),
      {
        title: "Compare the campaign for Avery and Daniel",
        action: [
          "In the portal sidebar, click **Show Agency growth pages** beside **Agency growth**, then **Small business growth**. Under **ON THIS PAGE**, click **Opportunity** and read the callout headline in that section.",
          "**Sign out**, sign in as **daniel.01** with password **Sitecore**, then open the same page.",
        ],
        expected: [
          "Avery sees **Build on your personal-lines relationships**.",
          "Daniel sees **Turn local knowledge into a stronger submission**. Each agency receives a next step suited to its production mix, while the agent’s business permissions stay unchanged.",
        ],
      },
    ],
    cleanup: {
      body: [
        signOut,
        "**Cancel** or close rule and custom-value editors without saving. No reviewer reset is needed.",
      ],
    },
    related: [
      "personalization-by-role",
      "find-an-agent-profile",
      "affinity-personalization",
    ],
    sourceSlides: [97],
  },
  {
    slug: "affinity-personalization",
    audience: "marketing",
    category: "Personalization and measurement",
    title: "Personalization: let browsing interests shape the next step",
    summary:
      "Build two different SitecoreAI affinities by visiting resources and connect the scores to the **Products** spotlight.",
    outcome:
      "Daniel’s workers-compensation interest and Maya’s **household** interest select distinct authored guidance while an independently checked Elena profile provides a neutral comparison.",
    duration: "15–20 minutes",
    personas: ["daniel.01", "maya.01", "elena.01", "Sitecore profile reviewer"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Use **Open the live portal login** throughout. Follow **Find the active SitecoreAI profile for an agent** for Daniel, Maya, and Elena with your reviewer number. Keep those profile tabs open so you can compare scores before and after browsing.",
      "For the neutral-to-personalized comparison, begin with clean profiles: use **Live portal: Reset a reviewer number and current identities**, select your reviewer number, and wait until anyone using it has finished before clicking **Reset reviewer {{pack}}**. Wait for **Reviewer {{pack}} is ready**, then look up the new identities and sign in. Reset also restores baseline saved work for all seven personas with that number. If you keep existing work instead, record the starting scores and expect that a personalized headline may already appear.",
    ],
    links: [
      liveLogin,
      liveReset,
      profileLink,
      {
        label: "Open native Affinities",
        href: `https://app.sitecorecloud.io/performance/settings/affinities?organization=${ORG}&tenantId=${TENANT}`,
      },
      pageBuilder,
    ],
    steps: [
      {
        title: "Inspect the tagged-page setup and starting profiles",
        action: [
          "In **SitecoreAI**, click **Performance** in the top navigation. Click the **Settings** gear at the bottom of the left sidebar, then **Affinities**. In the site list beside the settings menu, select **Liberty Mutual Agent Portal**.",
          "In the table on the right, read the **Affinity Name**, **Affinity Value**, and **Page** columns. Compare the pages mapped to **workers_compensation** and **household** under **insurance_interest**. Leave these assignments unchanged.",
          "Open the current Daniel, Maya, and Elena profiles and record existing scores before any tagged visits.",
        ],
        expected: [
          "Five pages carry interest tags. The **Products** landing page is untagged.",
          "Existing history can already select a topic. Neutral guidance is expected only for an independently confirmed profile with no relevant affinity.",
        ],
      },
      login("daniel"),
      {
        title: "Record Daniel’s starting Products experience",
        action: [
          "Click **Products & appetite** in the portal’s left sidebar and set **Risk state** to **Illinois**. The personalized spotlight is the large card above the product-category tabs.",
          "Record the displayed headline and compare it with Daniel’s starting **Top affinities**.",
        ],
        expected: [
          "An unused no-affinity profile shows **Protection built around the business you know**. Existing history may already show workers-compensation guidance.",
        ],
      },
      {
        title: "Visit the two workers-compensation resources",
        action: [
          "Open **Learning & resources**. Under **Popular**, click **Workers compensation**, then **Read resource** on **Workers compensation: an Illinois starting point**.",
          "Use browser Back. Click **Workers compensation** under **Popular** again, then **Read resource** on **Workers compensation: a Texas starting point**.",
        ],
        expected: [
          "The Illinois and Texas articles load while Daniel remains signed in. Repeat the search suggestion after using Back to find the next article.",
          "The page events use CMS names **illinois-workers-compensation** and **texas-workers-compensation**, matching their native affinity assignments.",
        ],
      },
      {
        title: "Connect Daniel’s score to the rendered spotlight",
        action: [
          "On Daniel’s current native profile, open **Engagement** and look for the two resource visits, then **Overview** > **Top affinities** for **workers_compensation**. Refresh the profile if new events have not appeared yet. If they remain absent, recheck the current **Agent identity** before interpreting the portal headline.",
          "Return to **Products & appetite**, confirm **Illinois** in **Risk state**, and read the large spotlight card above the product-category tabs. Click **Review account preparation** within that card.",
          "Confirm Illinois remains in the destination context, then sign out.",
        ],
        expected: [
          "The resource visits add native **workers_compensation** interest. Scores and event counts depend on recorded history and processing; the important comparison is the new visits, the top interest, and the corresponding authored headline.",
          "For the corresponding top interest, the spotlight says **Build a stronger workers compensation conversation**. Its action opens BOP preparation retaining Illinois.",
        ],
      },
      login("maya"),
      {
        title: "Build Maya’s distinct household interest",
        action: [
          "Click **Products & appetite** in the portal’s left sidebar and set **Risk state** to **Texas**. Record the headline in the large spotlight card above the product-category tabs.",
          "Select **Personal lines** > **Homeowners** > **Explore coverage**. On **Personal insurance**, click **Explore the preparation guide**.",
          "Click **Products & appetite** in the sidebar and confirm **Risk state** remains **Texas**. In Maya’s current profile, inspect **Engagement** for those visits and **Overview** > **Top affinities** for **household**. Refresh if the new events are not yet visible.",
        ],
        expected: [
          "The **household**-renewal resource opens with state=TX.",
          "The visits build **household** interest on Maya’s profile. When that is her top interest, the spotlight says **Make the next household renewal conversation count**. Compare the topic and headline; a fixed score or visit count is not required.",
        ],
      },
      {
        title: "Check the household action and switch identities",
        action: [
          "Click **Review the household renewal checklist** and verify Texas in the destination context.",
          "**Sign out**, then sign in as **elena.01** with password **Sitecore**. Click **Products & appetite** in the portal’s left sidebar and set **Risk state** to **Illinois**. The personalized spotlight is the large card above the product-category tabs.",
          "Compare Elena’s headline with her independently checked native scores.",
        ],
        expected: [
          "The checklist opens the **household**-renewal resource with state=TX and can add another tagged visit.",
          "With no recorded affinity, Elena sees **Protection built around the business you know**. Each agent’s profile reflects that agent’s own browsing.",
        ],
      },
      {
        title: "Inspect the authored mapping behind the result",
        action: [
          "In Page Builder’s left page tree, select **Home** > **Products & appetite**. In **Editor**, click the stacked-layers **Layers** icon, select **ProductSpotlight**, and click **Edit personalization rules** for that component.",
          "In the rules panel, read **Liberty Mutual - Product interest spotlight**. Locate the two rows using **Top Affinity**: one equals **workers_compensation**, and one equals **household**. Compare each row’s content choice with the headlines you saw in the portal.",
          "Click **Cancel** and record the ending profiles, scores, and displayed headlines.",
        ],
        expected: [
          "The **Live** rules connect each interest to the headline and action shown in **ProductSpotlight**.",
          "The rule reads the agent’s **Top Affinity** and selects the corresponding authored guidance. Licensed-state and business permissions remain in effect as the content changes.",
        ],
        note: "**What to notice:** Inspect the audience rule on the component itself in **Page Builder**. With profile tracking and affinity tags already configured, **SitecoreAI** builds the interest scores and **Top Affinity** selects authored variants. Marketers can see how each interest maps to the guidance shown.",
        links: [pageBuilder],
      },
    ],
    cleanup: {
      body: [
        signOut,
        "Preserve the authored rules. To replay a fresh journey, open **Reset a reviewer number** on production, select your pack under **Reviewer number**, and click **Reset reviewer {{pack}}**. Wait for **Reviewer {{pack}} is ready**, then sign into the live portal again and look up its new **Agent identity** values. The reset restores baseline saved work and activates seven new native profiles with clean browsing history. All seven same-suffix personas change together on production only. Previous native profiles and experiment history remain; CMS content, **Search**, **Agentic** artifacts, and webhook receipts are unaffected.",
        "This walkthrough uses browsing signals to select content variants that marketers have authored. Broader predictive recommendations are an additional capability to evaluate.",
      ],
      links: [liveReset],
    },
    related: ["find-an-agent-profile", "ab-testing", "personalization-by-role"],
    sourceSlides: [96, 98, 99, 100, 101],
  },
  {
    slug: "ab-testing",
    audience: "marketing",
    category: "Personalization and measurement",
    title: "A/B testing: compare a CTA and inspect its measured goal",
    summary:
      "Preview two button labels, follow Daniel’s portal experience, and review the page activity and goals recorded in SitecoreAI.",
    outcome:
      "You can compare the two button labels, trace a guide visit, and read the test’s goals and confidence before drawing conclusions.",
    duration: "12 minutes",
    personas: ["daniel.01", "Sitecore experiment reviewer"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Review the existing test configuration without editing it, then use your reviewer number for the portal interaction. Open **Live portal: Reset a reviewer number and current identities**, select your number from **Attendee assignments**, and copy Daniel’s **Agent identity**. Do not reset merely to view this value. Your invited Sitecore account needs access to the existing test and profile reports; otherwise, follow the presenter for those steps. Leave the test running.",
    ],
    links: [pageBuilder, liveLogin, profileLink, liveReset],
    steps: [
      {
        title: "Preview the current authored variations",
        action: [
          "In Page Builder’s left page tree, select **Home** > **Learning & resources**. In **Editor**, click the stacked-layers **Layers** icon at the top of the left pane. Locate **AgentGuidance** in the list and click its test icon.",
          "In the test panel, open **Liberty Mutual Small Business Guide CTA**. Select variation **A** and click **Preview**, then select **B** and click **Preview**. Read the guidance button in each preview.",
          "Compare the button labels and check that the surrounding heading, description, and destination stay the same. In the test’s configuration, read the traffic split and goal. Return the variation selector to **A**.",
        ],
        expected: [
          "**A** says **Start with small business**. **B** says **Build your small-business practice**. Only the button label differs.",
          "Eligible traffic is split 50/50 with 100% participation. The goal is a visit to the small-business guide.",
          "**Editor** preview lets you compare the authored variations before browsing. This page uses A/B testing; the portal’s other walkthroughs show personalization. SitecoreAI supports A/B/n testing on pages without personalization configured.",
        ],
        note: "**What to notice:** Marketers configure the component’s copy variations, traffic split, and goal in **Page Builder**, then review results in **Performance**. This comparison uses the existing component and tracking setup, so the copy test can be managed through authoring tools.",
        links: [pageBuilder],
      },
      login("daniel"),
      {
        title: "Follow the button shown to Daniel",
        action: [
          "Click **Learning & resources** in the portal’s left sidebar. Scroll below the search results to the card headed **Useful guidance, easier to find**. Its button will show one of the two labels you previewed.",
          "Record the visible action label, then click it.",
          "Return once to **Learning & resources** and record the action label again. Record the visit time, then sign out.",
        ],
        expected: [
          "The action opens /resources/expand-small-business-practice.",
          "Record the label you receive, then use the **Component A/B/n tests** report in step 5 to inspect credited experiment activity. **A** is also the default label when the portal has no test decision.",
        ],
      },
      {
        title: "Find the corresponding native page events",
        action: [
          "Open **Performance** > **Profiles**. Select **Search filter** > **Liberty Mutual agent identity**, enter Daniel’s current identifier, and open **Daniel Ortiz**.",
          "On Daniel’s profile, click **Engagement** and open the session matching the time you recorded in step 3. Read its page-view events for **Resources**, **growth-guide**, and the return to **Resources**. Compare the event times with your notes, and refresh if the new events have not appeared yet.",
        ],
        expected: [
          "The matching timestamps connect Daniel’s portal journey to the recorded page visits. The experiment report in the next step shows which visits and goals were credited to the test.",
        ],
        links: [profileLink],
      },
      {
        title: "Review goals, confidence, and test status",
        action: [
          "Click **Open the existing component test report** below to open **Performance** > **Component A/B/n tests**. In the report’s filters, set **Site** to **liberty-mutual-agent-portal** and **Test** to **Liberty Mutual Small Business Guide CTA**.",
          "Read the result row for **A**, then **B**. Record each row’s visits, goals, and goal rate, along with the report’s confidence and test status, to compare the two labels.",
          "Close the report without changing the experiment.",
        ],
        expected: [
          "The report shows credited visits, goals, and goal rates for each variation.",
          "The totals combine eligible activity from all participants and can take time to update. Use the current counts, confidence, and status to assess the test as a whole.",
          "The configured goal measures visits to the small-business guide. A reliable decision about the better label needs enough activity and confidence; this workshop’s small sample is for learning how to read the report.",
        ],
        links: [
          {
            label: "Open the existing component test report",
            href: `https://app.sitecorecloud.io/performance/dashboards/ab-tests?test=component_c9b4e46b3b7250d4a96e732c4d181b6a_e144a961809e570f9e26c1cdd5d4e99b_en_20260914t022704347z&site=&page=&organization=${ORG}&tenantId=${TENANT}`,
          },
        ],
      },
    ],
    cleanup: {
      body: [
        "**Sign out** and leave the test running with its existing variations and history. The shared results remain available for later review.",
        "A reviewer reset creates fresh profiles and restores baseline saved work, but does not clear the experiment’s history or settings. Recheck the current **Agent identity** after any reset.",
      ],
    },
    related: ["find-an-agent-profile", "affinity-personalization"],
    sourceSlides: [102, 103, 104],
  },
  {
    slug: "agentic-studio-workflow",
    audience: "marketing",
    category: "Agentic Studio",
    title:
      "Agentic Studio: inspect connected work, brand context, and artifacts",
    summary:
      "**Read-only:** Use the saved Watkins example to understand reusable instructions, research tools, brand retrieval, and human refinement.",
    outcome:
      "You can follow how **Agentic Studio** carries research and brand guidance into content drafts that marketers can review and refine.",
    duration: "15 minutes",
    personas: ["Your Sitecore marketing account"],
    prerequisites: [
      platformPrerequisite,
      "Your invited Sitecore account must be able to open the saved **Liberty Mutual | Watkins Insurance Group outreach** space. If it is unavailable, follow the presenter and ask the workshop team to check access. This walkthrough inspects saved work so everyone can compare the same outputs; do not click **Run workflow** or change instructions, **Brand Kit** content, or artifacts.",
    ],
    links: [
      { label: "Open the saved Agentic Studio workspace", href: STUDIO },
      sitecoreWorkspace,
    ],
    steps: [
      {
        title: "Inspect the connected workflow",
        action: [
          "Click **Open the saved workspace** below and confirm the space title is **Liberty Mutual | Watkins Insurance Group outreach**. If another space opens, use **Open SitecoreAI** above, confirm **Safeco Insurance Company of America POC**, and open **Agentic** > **Spaces** > **Liberty Mutual | Watkins Insurance Group outreach**.",
          "At the top of the space, select the **Chat** view. In the right-hand panel, select **Agents** and read the three stages under **Connected workflow**: **Account Enrichment**, **Brief Generation**, and **Content Generation**. Follow their top-to-bottom order from research to a brief and content tasks.",
        ],
        expected: [
          "Three connected stages organize research, a brief, and content tasks alongside saved run history and artifacts.",
          "The workflow uses built-in agents, with the space’s instructions providing the task and brand context.",
        ],
        links: [{ label: "Open the saved workspace", href: STUDIO }],
      },
      {
        title: "Read reusable and per-run instructions",
        action: [
          "In the space’s right-hand panel, click **Instructions**, beside **Agents**. Under **Space Context**, read **Objective**, **Constraints**, and **Brand Guidance**. Note the goal, source restrictions, and output format that these instructions establish.",
          "Read **Agent Context** below **Space Context** to distinguish instructions for the next execution from the shared space requirements. Return to **Agents** without editing.",
        ],
        expected: [
          "**Space Context** retains shared requirements, source rules, brand guidance, and output format. **Agent Context** supplies additional instructions for the next execution.",
          "The saved conversation shows research and a brief followed by feedback and refinement of the content drafts.",
        ],
      },
      {
        title: "Inspect the run’s research and tool context",
        action: [
          "In the center **Chat** conversation, scroll to the message beginning **Create the final, readable Watkins** below the workflow outputs. Expand that message’s **Prompt details** to reveal **Context** and **Tools**.",
          "Inspect that prompt’s **Context** and **Tools**, then the **Web Search** results below it. Open a source link if you want to compare a research claim with its evidence; return to the saved conversation afterward.",
        ],
        expected: [
          "**Context** includes the attached **Brand Kit**. **Tools** includes retrieval, artifacts, web search, and **Sitecore** capabilities.",
          "Linked public sources let you review the research. Check a source’s date and facts as part of deciding whether to use a generated claim.",
        ],
      },
      {
        title: "Inspect the Brand Kit used in the conversation",
        action: [
          "In the same **Chat** conversation, scroll through the response beneath **Create the final, readable Watkins**. Expand the completed **Get Brand Kit** tool result and read its returned kit name, **Liberty Mutual — Independent Agents**.",
          "Expand **Get Brand Kit Section**. Check **Input** for sectionName: **Visual Guidelines** and read **Output**. Inspect the retrieved **Tone of Voice** and **Brand Context** sections where shown.",
        ],
        expected: [
          "**Get Brand Kit** returns **Liberty Mutual — Independent Agents**. The section output includes authored palette, typography, and logo guidance.",
          "These results show the brand instructions retrieved for the response. The workshop kit uses public-source guidance; Liberty Mutual’s brand team can review and refine it for future use.",
        ],
      },
      {
        title: "Open the saved research and HTML artifacts",
        action: [
          "Click **Artifacts** at the top of the space, beside the view selectors. Select **Watkins | Account research and campaign brief**, then click the expand arrows on that card to open the artifact viewer.",
          "In the dialog’s left list, choose **Watkins | Principal email preview | Patrick Watkins** and click **Preview** to see the readable email layout.",
          "Next select **Watkins | Advisor email preview | Clint Bradford**, then **Watkins | Client service email preview**, choosing **Preview** for each. Compare the audience, message, and call to action. **Content**, **JSON**, or **HTML** views, when offered, expose the output structure for a technical review.",
        ],
        expected: [
          "The research artifact separates source facts, the brief, and proposed direction.",
          "Readable HTML previews show distinct role-specific subjects, content, and actions from shared context. Marketers can review presentation while developers inspect output structure.",
        ],
      },
      {
        title: "Find the human review behind the final output",
        action: [
          "Close the artifact dialog and read the later refinement prompts in **Chat**. Look for requested factual corrections and presentation changes to understand where people improved the generated output.",
          "Click **Artifacts** at the top of the space, select **Watkins outreach | Evidence and editorial review**, and click that card’s expand arrows. Read the review notes to see which facts and presentation details received human attention.",
        ],
        expected: [
          "The saved history records corrections, editorial decisions, and refined output. Evidence stays separate from recipient-facing content.",
          "These artifacts are saved email drafts for human review. Sending outreach and establishing a formal approval process would be separate steps.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close the artifact viewer and leave the saved conversation and artifacts available for the next reviewer. No reset is needed.",
      ],
    },
    related: ["ai-assisted-authoring", "marketing-capability-boundaries"],
    sourceSlides: [105, 106, 107],
  },
  {
    slug: "marketing-capability-boundaries",
    audience: "marketing",
    category: "Start here",
    title: "Understand the demonstrated capabilities and remaining choices",
    summary:
      "Separate working sandbox capabilities from optional integrations, additional validation, and future implementation decisions.",
    outcome:
      "You can record the capabilities you tried and the integrations, access decisions, or further validation your team would need.",
    duration: "5 minutes",
    personas: ["Marketing reviewers", "Architects and developers"],
    prerequisites: [
      "Use this reference alongside the related walkthroughs. It does not require changes to any shared configuration.",
    ],
    steps: [
      {
        title: "Distinguish personalization methods",
        action: [
          "Compare known-attribute guidance, a calculated **UDL** targeting value, browsing affinity, and A/B testing using their separate walkthroughs.",
        ],
        expected: [
          "These show authored rules and variants, native interest signals, and measured experiments. Autonomous machine-learning recommendations or audience discovery are separate scope requiring confirmation of product capabilities, entitlement, and suitable data.",
        ],
      },
      {
        title: "State the authoring and recovery boundaries",
        action: [
          "In the authoring walkthroughs, look for the **Saved** checkmark after an edit and the named **Draft** created before substantial changes. These provide evidence of a server save and a version to review; this reference requires no new edit.",
          "Open **Bulk editing: inspect the need and implementation options** to compare repeated wording with wider field updates. Page Builder edits these items individually; a bulk-update workflow or extension is an additional implementation choice.",
        ],
        expected: [
          "The **Saved** checkmark confirms that changes reached Sitecore. Recovery of work typed while offline or before saving requires separate validation.",
          "For wider field updates, a scoped API workflow or **Marketplace** **Content Export/Import Tool** is a possibility. Raw field formats, versions, workflow, and restoration need validation.",
        ],
      },
      {
        title: "Identify integration and governance work explicitly",
        action: [
          "Compare **Native Contact your team** with the campaign’s custom saved request. Identify where a business backend would receive the data.",
          "Review **Author and approver: review and publish content together**. The workshop team supplies your Sitecore role, practice-pair number, and page; these are separate from your portal reviewer number. Record any missing attendee assignments and the accessibility acceptance still required.",
        ],
        expected: [
          "**Native Forms** delivers to a webhook. A database or **Salesforce** workflow would connect through an implemented backend. The campaign’s custom form saves a request in the portal’s agency work.",
          "Controlled component placement and separate non-administrator **Author** and **Approver** permissions are demonstrated. Attendee role and practice-pair assignments remain pending. Full accessibility acceptance requires additional validation.",
        ],
      },
      {
        title: "Treat Marketplace extensions as evaluated options",
        action: [
          "Match a remaining requirement to a possible extension: **Content Score** for accessibility review, **Workbox Pro** for workflow collaboration, or **Content Export/Import Tool** for wider content maintenance. Record the behavior and permissions you would need to validate before selecting an app.",
        ],
        expected: [
          "These **Marketplace** apps are options to evaluate; they are not installed or validated in this sandbox. Assess each against your access controls, publishing workflow, and acceptance criteria.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Record observations and remaining questions. No configuration change or reset is needed.",
      ],
    },
    related: [
      "native-contact-form",
      "alert-dates-and-publication",
      "resource-content-workflow",
      "agentic-studio-workflow",
    ],
    sourceSlides: [108],
  },
];
