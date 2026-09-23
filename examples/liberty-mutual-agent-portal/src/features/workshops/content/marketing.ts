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
const receiptInbox: GuideLink = {
  label: "Open the form receipt inbox",
  href: "https://webhook.site/#!/view/951f9e7b-3dd6-49dc-8fb1-3beda2cc034e",
};

const liveLogin: GuideLink = {
  label: "Open the live portal login",
  href: `${LIVE}/login`,
};
const previewLogin: GuideLink = {
  label: "Open the transaction-preview login",
  href: `${PREVIEW}/login`,
};
const liveReset: GuideLink = {
  label: "Live portal: Reset a workshop number and current identities",
  href: `${LIVE}/workshops/reset`,
};
const previewReset: GuideLink = {
  label: "Transaction preview: Reset a workshop number and current identities",
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
const platformPrerequisite = `**SitecoreAI** is the platform behind the Agent Portal: your team uses it to manage content, personalize experiences, and review engagement. Open [**SitecoreAI**](${SITECORE}) and sign in with the email address that received your **Sitecore Cloud** invitation. This opens **Safeco Insurance Company of America POC** and its **SitecoreAI / Demo** environment. If a step uses **Page Builder**, confirm **Liberty Mutual Agent Portal** is selected there. If access is denied or another organization opens, ask the workshop team to check your invitation; a portal username such as **daniel.01** cannot provide this access.`;
const authorPrerequisite =
  "**Page Builder** is SitecoreAI’s page-authoring tool. **Editor** shows the page preview, or canvas; **Content** shows the stored fields and content tree. A **component** is a page section, such as an image or guidance card. Keep **Default editing host** selected so the canvas uses the hosted website. For hands-on content editing, use only your assigned **Practice {{pack}}** page and its local **Data** items. Other content-management-system (**CMS**) pages and settings are shared; follow the presenter when a guide says **Presenter demonstration**. The publishing demonstration uses separate **Author** and **Approver** accounts to show their different permissions.";
const practicePagePrerequisite =
  "Find your assigned **workshop number** in [**Attendee assignments**](/workshops/attendees). In **Page Builder**, open **Home** > **Practice** > **Practice {{pack}}**. Number **01** is reserved for presenters; attendees use their assigned page from **02–20**. Each page owns a separate **Data** folder, so these exercises keep your page layout and content separate from other numbers. The number does not isolate shared media, component definitions, publishing, or other site settings, and it does not replace your separate SitecoreAI login or grant CMS permissions. If you cannot edit your assigned page and its Data items, ask the workshop team to check your access. Keep this page unpublished and restore your changes when finished; a portal reset does not reset CMS content.";
const workshopNumberPrerequisite =
  "A **persona** is a fictional agent with a defined role, agency, and licenses. Your **workshop number** gives you a set of seven persona logins for the exercises. Find your name and number in [**Attendee assignments**](/workshops/attendees). Use that same number after the dot in every portal username. Number 01 is for presenters; attendees use their listed number from 02–20. If your name is not listed, ask the workshop team for a number before starting. This workshop number also identifies your own **Practice {{pack}}** page and its local **Data** items for the hands-on authoring guides. Sitecore authoring uses a separate invited account. Other pages and site settings are shared; follow the presenter when a guide asks you to observe a shared-content change.";
const signOut =
  "Click the signed-in person’s name or avatar in the upper right, then **Sign out**. Wait for **Welcome back** before switching to another persona.";
const persistentWork =
  "Saved work has no automatic expiry. Signing out ends the session but keeps saved work and **SitecoreAI** profile history.";
const sharedReset = `To keep your new record for review, sign out without resetting. To repeat from the starting data, open [**Transaction preview: Reset a workshop number and current identities**](${previewReset.href}). Sign in to that workshop website if requested, select your number from [**Attendee assignments**](/workshops/attendees) under **Workshop number**, and wait until anyone using that number has finished. Click **Reset workshop {{pack}}**, wait for **Workshop {{pack}} is ready**, and sign in to the portal again. This removes saved changes for all seven personas with that number on the transaction-preview website and activates seven clean SitecoreAI profiles. It does not reset the live portal. Earlier SitecoreAI profiles and test history remain. Authored pages, search content, saved Agentic Studio outputs, and delivered form requests are unchanged.`;

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
      `Open [**${preview ? "the transaction-preview login" : "the live portal login"}**](${preview ? previewLogin.href : liveLogin.href}). ${preview ? "This website keeps saved practice transactions separate from the live portal." : "This website shows published portal content."} If another person is signed in, click their name or avatar in the upper right, then **Sign out**.`,
      `Enter username **${persona}.01** and password **Sitecore**, then click **Sign in**.`,
    ],
    expected: [
      `**My workspace**, the portal’s home page, opens with this agent’s priorities and guidance. The upper-right profile menu must show **${personaNames[persona]}**. Checking the name ensures you are observing the intended agent’s experience. If it shows someone else, sign out and repeat this step.`,
    ],
    links: [preview ? previewLogin : liveLogin],
  };
}

export const marketingGuides: WorkshopGuide[] = [
  {
    slug: "start-and-switch-agents",
    audience: "marketing",
    category: "Start here",
    title: "Sign in and find your workshop number",
    summary:
      "Start with the two places you will use: the **Agent Portal**, which independent agents visit, and **SitecoreAI**, where your team manages that experience. Find your workshop number and learn how to sign in to each.",
    outcome:
      "You know which website and account each exercise needs, how to recognize the signed-in agent, and why switching agents reveals a different experience.",
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
      workshopNumberPrerequisite,
      `The workshop team provides your initial portal sign-in details and any separate **Sitecore Cloud** invitation. After workshop sign-in, [**Attendee assignments**](/workshops/attendees) and [**Reset a workshop number**](${liveReset.href}) require no additional credentials.`,
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
        title: "Choose the portal for your exercise",
        action: [
          `For browsing, personalization, **Search**, and publication checks, open [**the live portal login**](${liveLogin.href}). These guides link to liberty-mutual-agent-portal.vercel.app, which displays published content.`,
          `The [**Save a request from a campaign**](/workshops/guide/campaign-and-conversation) guide names the point at which to open [**the transaction-preview login**](${previewLogin.href}). Its one saved conversation shows how a custom component can connect an authored campaign to agency work while keeping practice changes separate from the live portal.`,
        ],
        expected: [
          "The live portal is the published agent-facing website. The transaction preview is a separate hosted copy for the saved-request exercise; work saved in one does not appear in the other.",
          "Publishing makes reviewed content available to agents on the live portal. The transaction preview can also display unpublished content, so a page appearing there does not prove publication. For profile checks, use the identity lookup for the same website on which you browsed.",
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
          "Each account represents a different audience. Follow the account named in an exercise so its role, agency, and licenses produce the expected guidance and available actions. You do not need to memorize the full list.",
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
          "Within your workshop number, agents from the same fictional agency share agency work. Favorites and learning registrations belong to the individual agent. A different workshop number provides a separate set of activity, so your browsing does not alter another attendee’s persona history.",
        ],
      },
      login("maya"),
      {
        title: "Switch the person without resetting the exercise",
        action: [
          signOut,
          "For this orientation, sign in as **daniel.01** with password **Sitecore**. Use the same workshop number as Maya. On later exercises, follow the persona named in that guide. Close any unsaved dialog with its × button or Escape before signing out.",
        ],
        expected: [
          persistentWork,
          `Signing in again resumes the same profile and browsing history. Use [**Reset a workshop number**](${liveReset.href}) when you want to repeat an exercise with clean profiles and starting data.`,
        ],
      },
      {
        title: "Use a separate Sitecore login for authoring",
        action: [
          `Open [**SitecoreAI**](${SITECORE}). Use the email address that received your **Sitecore Cloud** invitation, not a portal persona. The presenters use separate **Author** and **Approver** accounts for the publishing demonstration; you can follow that demonstration without an authoring role.`,
          `[**SitecoreAI**](${SITECORE}) opens the POC environment directly. If you instead begin at the [**Sitecore Cloud Portal**](https://portal.sitecorecloud.io/?organization=${ORG}), select **Safeco Insurance Company of America POC**, then **SitecoreAI / Demo**. For editing, open [**Page Builder**](${PAGES}) and select **Liberty Mutual Agent Portal**. If access is denied, follow the presenter while the workshop team checks your invitation.`,
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
        `This orientation needs no reset: signing out is enough. If you deliberately want a clean start, open [**Live portal: Reset a workshop number and current identities**](${liveReset.href}) for live activity or [**Transaction preview: Reset a workshop number and current identities**](${previewReset.href}) for preview activity. Select your number from [**Attendee assignments**](/workshops/attendees), check that nobody is still using it, and click **Reset workshop** for that number. Wait for **Workshop [selected number] is ready** before signing in again. Reset restores baseline saved work and clean profiles for all seven personas with that number on that website. It leaves the other website and earlier profile/test history unchanged. Authored pages, search content, saved Agentic Studio outputs, and delivered form requests are also unchanged.`,
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
    title: "Compare role-based personalization",
    summary:
      "Personalization selects relevant content for the signed-in agent. Compare the **Agency growth** card on the portal’s home page for four roles, then inspect which records and states each role can access.",
    outcome:
      "You see how known profile attributes help Liberty Mutual offer a useful next step to each agent. You can also distinguish that content choice from application permissions, which control access to records and transactions.",
    personas: ["avery.01", "jordan.01", "maya.01", "elena.01"],
    prerequisites: [
      workshopNumberPrerequisite,
      "Use the live portal. The accounts already contain fictional role, agency, and license attributes; no prior browsing is needed for this comparison. **Agency growth** is the home-page guidance card, separate from the navigation section with the same name. This exercise leaves submissions and policies unchanged.",
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
          "**Cedar Ridge**’s principal sees **Build your next chapter in small business**. The button opens the small-business practice resource: guidance aimed at growing an agency, rather than preparing one submission.",
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
          "Jordan’s card says **Bring a stronger submission to the table**. Its button opens an article that helps a producer prepare a BOP submission. The same page section now supports a different role’s next action.",
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
          "Maya’s card says **Connect everyday conversations to new needs**. Its button opens the small-business practice article with guidance framed for her client conversations. Personalization can change the message even when two audiences use the same destination.",
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
        "No workshop-number reset is needed. These visits may remain in SitecoreAI’s browsing history.",
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
    title: "Find and save a resource",
    summary:
      "Use **Learning & resources**, the portal’s searchable guidance library. **SitecoreAI Search** retrieves published resource content, and the portal limits state choices to the signed-in agent’s licenses. Find an article, then save it for another visit.",
    outcome:
      "You see how relevant search results help an agent find usable guidance quickly. Comparing Daniel with Maya demonstrates licensed-state filtering; saving an article shows a separate portal convenience that persists between visits.",
    personas: ["daniel.01", "maya.01"],
    prerequisites: [
      workshopNumberPrerequisite,
      "Use the live portal. The **Search index** is the searchable copy of published resource content. Counts can change as content is published and indexed, so compare result labels and state eligibility rather than memorizing totals.",
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
        title: "Clear filters and recover from an empty search",
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
          "A new save displays **Resource saved** and changes the button to **Saved to your resources**. This bookmark is stored by the portal for Daniel; it is separate from SitecoreAI Search and does not alter the article.",
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
        "Undo only a bookmark created by this walkthrough, leave any pre-existing favorite intact, then sign out. No workshop-number reset is needed.",
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
    title: "Save a request from a campaign",
    summary:
      "Follow the **Small business growth** campaign from its guidance to an agent’s request for a conversation. This shows how SitecoreAI-managed content can lead into a working portal feature implemented by developers.",
    outcome:
      "You can explain how **SitecoreAI** content and custom application components work together: marketers manage the campaign, and application code connects an agent’s next action to saved business data.",
    personas: ["daniel.01"],
    prerequisites: [
      workshopNumberPrerequisite,
      `Open [**the live portal login**](${liveLogin.href}) for the first browsing step. At **Switch to the preview before saving work**, open [**the transaction-preview login**](${previewLogin.href}); that website keeps the saved conversation separate from live portal work.`,
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
          "The dialog opens with keyboard focus on **Close dialog**. Escape closes it and returns focus to **Plan a conversation**, showing that an agent can open and dismiss this interaction using the keyboard.",
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
          "This one example represents the portal’s other working submission, policy, and surety components, which remain available for exploration. The separate **Submit a contact form** guide shows the marketer-managed form and actual webhook delivery.",
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
    title: "Submit a contact form",
    summary:
      "Inspect **Contact your team** in **SitecoreAI Forms**, the tool for designing and publishing forms. Submit fictional details through the portal, then find the delivered message in the receiving inbox.",
    outcome:
      "You can trace one submission from its fields to its delivery record. A **webhook** sends the submitted data to a configured web address; this example’s receiving inbox lets you inspect the message that a business backend could process.",
    personas: ["daniel.01", "Sitecore form administrator"],
    prerequisites: [
      workshopNumberPrerequisite,
      platformPrerequisite,
      `Review the existing form configuration with the presenter, then submit fictional details through the portal. [**The form receipt inbox**](${receiptInbox.href}) opens the receiver used by **Demo Webhook**. Follow the presenter for configuration and receipt inspection if you lack Forms administration access.`,
      "Use fictional contact details. **Demo Webhook** is the configured delivery connection, and **Webhook.site** is its temporary receiving inbox. A **receipt** here means the received request record, not an email confirmation. A business backend would handle Salesforce activity or email delivery.",
    ],
    links: [
      { label: "Open Contact your team in SitecoreAI Forms", href: FORMS },
      receiptInbox,
      {
        label: "Open Contact your team in the portal",
        href: `${LIVE}/support#contact-your-team`,
      },
      liveLogin,
    ],
    steps: [
      {
        title: "Inspect the form configuration",
        action: [
          `Open [**Contact your team in SitecoreAI Forms**](${FORMS}). In **SitecoreAI Forms**, confirm the form name is **Contact your team**, select **Edit form**, and then select **Edit** to open the designer.`,
          "On the form’s preview canvas, read the five field labels: **Your name**, **Work email**, **Agency name**, **How can we help?**, and **What would you like to discuss?**. These are the fields you will complete in the portal.",
          "Click the **Settings** gear in the form designer. Read the selected webhook name **Demo Webhook**, which identifies the submission destination. Check **Site** availability for **liberty-mutual-agent-portal** and read the configured success message. These settings connect the designed form to the portal and its delivery destination; leave them unchanged.",
        ],
        expected: [
          "The form is **Active** for **liberty-mutual-agent-portal**. All five fields are required.",
          "Topic choices are **Agency growth**, **Product guidance**, and **Portal support**. **Site** availability shows 1 out of 1.",
          "**Push changes** is available for reviewed active-form updates. Leave it untouched and return to preview without changing the form.",
        ],
        links: [{ label: "Open Contact your team in Forms", href: FORMS }],
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
          `Open [**the form receipt inbox**](${receiptInbox.href}). In **Webhook.site**, clear any existing text in the **Search** box at the top of the left-hand **INBOX** list, then press **Enter** so previous search filters do not hide your request. Select the newest **POST** request and look for your exact **LM-NATIVE-…** marker in **Request Content**. If it belongs to another attendee, select the preceding request until you find your marker.`,
          "Open that receipt’s **Request Content** or **Raw Content** view and compare the name, email, agency, topic, and discussion text with your entries. This confirms delivery beyond the form’s on-screen success message.",
        ],
        expected: [
          "The received **JSON** is a structured list of field names and submitted values. Finding your unique marker in that record establishes that this specific request reached the receiving service.",
          "The **x-formname** header reads **Contact your team**. Your unique marker connects the portal submission to this received record.",
        ],
        links: [receiptInbox],
      },
    ],
    cleanup: {
      body: [
        "Reload the form to clear the confirmation, then sign out. Keep earlier receipts unchanged; any optional repeat uses a new marker.",
        "No reset is needed. Resetting a workshop number cannot delete webhook receipts.",
        "**SitecoreAI Forms** manages the form design and webhook delivery. A governed backend is needed to persist business records, create **Salesforce** activity, send email, or implement a production database.",
      ],
    },
    related: ["campaign-and-conversation"],
    sourceSlides: [89, 90],
  },
  {
    slug: "resource-content-workflow",
    accountScope: "presenter",
    audience: "marketing",
    category: "Content authoring",
    title: "Edit and publish a resource",
    summary:
      "**Presenter demonstration:** Follow a Texas resource article from authoring to the live portal and its search results. Change a summary, inspect the article’s classification choices, and restore the starting content after checking delivery.",
    outcome:
      "You understand why saving, publishing, and refreshing Search are separate actions: saving updates authoring content, publishing delivers reviewed content to agents, and indexing updates the searchable copy.",
    personas: ["daniel.01", "Authorized Sitecore author"],
    prerequisites: [
      "The presenter uses **daniel.01** with password **Sitecore** for the live-portal checks. Attendees follow that screen while the shared article is edited and restored.",
      platformPrerequisite,
      authorPrerequisite,
      "Follow the presenter as they edit the shared Texas article. Editing and publishing require access to this resource; **Resource metadata** currently requires organization administrator/owner access. The separate [**Review and publish content**](/workshops/guide/author-approver-workflow) demonstration uses the scoped **Author** and **Approver** accounts to show review permissions.",
      "A **version** retains a revision of this article in a selected language. A **Draft** can be edited; approval makes it eligible for publication in this configured workflow. **Metadata** describes the article’s state, product, and other classifications used by Search. Complete publication, Search refresh, and restoration so the temporary summary is not left live.",
      "For the supporting authoring instructions, open **Liberty Mutual’s GitHub repository** and browse to **docs/resource-metadata-authoring.md** from the repository root (its top-level folder).",
    ],
    links: [pageBuilder, liveLogin],
    repositoryFiles: [
      {
        label: "Resource metadata authoring guide",
        path: "docs/resource-metadata-authoring.md",
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
          `Open [**Page Builder**](${PAGES}). In the left page tree, expand **Home** > **Learning & resources**, then select **Workers compensation: a Texas starting point**. Click the stacked-layers **Layers** icon above the tree and select **Article**.`,
          "Above the page canvas, the version dropdown is immediately left of **Default editing host**. Open it, record the selected **English** version number, then choose **Create version**. Name the version resource-review-[your initials]-[date-time] and click **Create** so you can recognize it later.",
          "Reopen that version dropdown and select the newest **English** **Draft** with your version name. Wait for its fields to load. In the top toolbar, click the puzzle-piece **Apps** icon, then **Resource metadata**. Check the selected page, language, and version shown in the panel.",
        ],
        expected: [
          "**Resource metadata** is a custom Marketplace app inside Page Builder. It provides managed dropdown choices for the resource’s classification. Check its page name, language, and version before changing a value so you are editing the intended revision.",
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
          "A **Marketplace app** extends SitecoreAI’s authoring interface. This custom panel supplies centrally managed choices instead of requiring authors to type classifications consistently. Those saved values help Search filter the resource for an agent’s state and interests.",
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
          `Open [**SitecoreAI**](${SITECORE}), then select **Content** > **Search Sources** > **Liberty Mutual Agent Resources** > **Settings**. Verify source ID b5e24aff-8b5b-4653-bf66-deef52c1241a.`,
          "Return to the source list and click **Reindex Content** once for that source. Wait until the job reaches **Succeeded**.",
          "As Daniel, search **Workers compensation** again; compare the Texas result card and article.",
        ],
        expected: [
          "The updated live article confirms publication. A **Search source** identifies the content to index; **Reindex Content** rebuilds its searchable copy. That refresh brings the library’s result card into line with the published article.",
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
          "The original wording and all five metadata values are restored. A workshop-number reset cannot undo or replace these CMS restoration steps.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Complete the final restoration and verify both live article delivery and **Search** before leaving. **Sign out** of the portal.",
        "If a temporary metadata value was accidentally published, restore it in a new **Draft**, approve and publish the exact page, then reindex the same **Search** source. A workshop-number reset has no effect on CMS content.",
      ],
    },
    related: [
      "author-approver-workflow",
      "create-resource-and-media",
      "state-aware-search",
    ],
    sourceSlides: [17, 18, 19, 20, 21, 22, 23],
  },
  {
    slug: "create-resource-and-media",
    audience: "marketing",
    category: "Content authoring",
    title: "Create a page",
    summary:
      "**Presenter demonstration:** Create a resource article from a prepared starting structure, add text and an image, and inspect its classification choices. Keep the practice page unpublished, then remove it.",
    outcome:
      "You see how a page branch gives authors the expected layout, blank fields, and page-specific image content automatically. The shared media library lets an author reuse an asset while keeping each page’s image selection independent.",
    personas: ["Your Sitecore author account"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "Follow the presenter for this guide. The presenter needs permission to create and delete pages under **Learning & resources**, edit local image content, and use **Modern Media Library**. **Resource metadata** additionally requires organization administrator/owner access. Scoped workshop **Author** and **Approver** roles do not include these permissions.",
      "A **page branch** is a prepared starting structure that creates a page and its supporting content together. Here it creates a local **Data** folder containing **Resource image**, the item that stores this page’s image choice. The presenter creates one uniquely named, unpublished page and deletes it at the end. Attendees follow the demonstration without creating copies.",
      "For the supporting authoring instructions, open **Liberty Mutual’s GitHub repository** and browse to **docs/resource-page-authoring.md** from the repository root (its top-level folder).",
    ],
    links: [pageBuilder],
    repositoryFiles: [
      {
        label: "Resource page authoring guide",
        path: "docs/resource-page-authoring.md",
      },
      {
        label: "Product catalog authoring guide",
        path: "docs/product-catalog-authoring.md",
      },
    ],
    steps: [
      {
        title: "Create a page from the resource branch",
        action: [
          `Open [**Page Builder**](${PAGES}) and confirm **Liberty Mutual Agent Portal** in the site selector at the upper left. In the left page tree, expand **Home**, select **Learning & resources**, and open its … menu > **Create a subpage**.`,
          "Choose **Resource page** > **Select**. Enter a unique lowercase, hyphen-separated name such as resource-practice-jd-20260918-1430, replacing the initials and date/time with your own. Press Enter.",
          "Click **Reload tree** and select your new page.",
        ],
        expected: [
          "**Page created from branch template** appears. The title starts with the page name you entered; summary, body, reviewed date, source, and metadata start empty.",
          "The branch supplies the **Article** page section and its nested **Image** section. It also creates **Data** > **Resource image**, the content item that feeds the image component, often called its **datasource**. You can fill this page without assembling the layout or changing existing articles.",
        ],
        note: "**Product catalog authoring:** Under **Home** > **Products & appetite**, the **Product page** branch creates a Draft page. Authors edit **Title**, **Catalog summary**, optional **Catalog image**, and **Product details**, select existing **Related products**, and set **Distribution channel** (default **all**). Approving and publishing a complete page adds its card on the next portal refresh, without a code deployment or Search reindex. An omitted image uses an icon. Incomplete pages and invalid product references are omitted; state, license, and **Prepare account** checks still apply. This resource exercise does not create a product page.",
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
          "The canvas shows your practice content. **Media BETA** opens the **Modern Media Library**, which stores reusable images. The photograph has descriptive **Alt text** for people using assistive technology and a **Public link** through which the website can load it.",
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
          "Each dropdown describes one aspect of the article for filtering, such as its state or resource type. **Discard changes** returns these new-page fields to their blank values; the page remains unpublished.",
          "The resource’s classification is managed through **Resource metadata**, while its photograph is selected through the image field.",
        ],
      },
      {
        title: "Inspect the shared asset’s editable metadata",
        action: [
          `Open [**SitecoreAI**](${SITECORE}), then select **Content** > **Media BETA**. Select **liberty-mutual-small-business-team-planning.png**.`,
          "Open **Details** > **Tags** > **Edit tags** and inspect the choices. Select **Alt text** and inspect **Description** and the public-link expiration.",
          "Leave the values unchanged and close the dialog.",
        ],
        expected: [
          "The reviewed alt text describes two colleagues reviewing a tablet beside warehouse boxes. **Tags** help organize the asset, while **Alt text** describes the image’s meaning. Public-link expiration is **None**, so this delivery link has no configured expiry.",
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
        "When publishing a resource with a new image, include the page and **Resource image**: keep **Page**, **English**, and **All references** on; clear **Include related items**, leave **Subpages** off, and inspect **View references** before publishing. For this exercise, keep the practice page unpublished and delete it using **Remove only your unpublished practice page** in step 6.",
      ],
    },
    related: ["resource-content-workflow"],
    sourceSlides: [24, 25, 26, 27],
  },
  {
    slug: "campaign-composition",
    accountScope: "assigned",
    audience: "marketing",
    category: "Content authoring",
    title: "Edit page content",
    summary:
      "Use your assigned **Practice** page to edit a guidance card, add an accordion, move it, and remove it. Explore the component choices that keep each area of the page consistent, then restore the starting page.",
    outcome:
      "You can edit content and arrange approved components in **Page Builder** without changing application code. You see how native placeholder rules govern which components can go in each area, while your page and its content stay separate from other workshop numbers.",
    personas: ["Your Sitecore author account"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      practicePagePrerequisite,
      "A **datasource** is the content item that supplies a component’s fields. Your practice page owns seven items under **Data**: **Campaign introduction**, **Preparation update**, **Growth opportunity**, **Start the conversation**, **Prepare for review**, **Useful resources**, and **Your next step**. Use only items beneath **Practice {{pack}}** throughout this exercise. Record the original **Title** and component order so you can restore them exactly.",
    ],
    links: [pageBuilder],
    steps: [
      {
        title: "Open your page and record its starting content",
        action: [
          `Open [**Page Builder**](${PAGES}) and confirm **Liberty Mutual Agent Portal** in the site selector. Select **Content** in the top navigation, then expand **Home** > **Practice** > **Practice {{pack}}** > **Data** and select **Growth opportunity**.`,
          "Confirm that **Practice {{pack}}** matches your assigned workshop number before making a change. Find **Title**, above the **Body** rich-text editor, and copy the complete current title into a local note.",
        ],
        expected: [
          "**Growth opportunity** is a datasource owned by your practice page. The **Callout** component reads its **Title**, **Body**, and **Action link** to show a heading, supporting text, and button. Another number’s practice page has its own copy of these fields.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Edit the guidance card and check the preview",
        action: [
          "Replace **Title** with: Prepare for your next small-business conversation. Click outside the field and wait for the **Saved** checkmark.",
          "Select **Practice {{pack}}**, then click **Editor** in the top navigation. Keep **Default editing host** selected above the canvas. Open the stacked-layers **Layers** icon in the left pane and select **Callout**. If the previous heading remains after saving, reload the page.",
          "In **Layers**, expand **Layout**. Its named areas, or **placeholders**, map to the page: **headless-campaign-hero-1** is the title area, **headless-campaign-main-1** is the main area, and **headless-campaign-sidebar-1** is the sidebar. Record the starting order: **Heading** in the title area; **Alert**, **Callout**, and two **Accordion** components in the main area; **Links** and **Contact** in the sidebar. Keep **Layout** in place.",
        ],
        expected: [
          "The callout shows **Prepare for your next small-business conversation.** The edit is saved in CMS authoring and visible in the editor preview. **Practice {{pack}}** remains unpublished; no application-code change or website deployment is needed.",
        ],
      },
      {
        title: "Check the component choices for each area",
        action: [
          "In **Layers**, move the pointer between the **headless-campaign-main-1** heading and its first component to reveal **Insert into** (the **+** control), then click **+**. This is the main area. In the **Components** picker, open **Campaign**. Confirm that the choices are **Alert**, **Callout**, and **Accordion**. **Heading**, **Links**, and **Contact** are not offered here. Dismiss the picker without selecting a component.",
          "Repeat **Insert into** for **headless-campaign-hero-1**, the title area: only **Heading** is offered. Repeat it for **headless-campaign-sidebar-1**, the sidebar: only **Links** and **Contact** are offered, with no **Accordion** choice. Dismiss the picker. Leave the placeholder settings unchanged.",
        ],
        expected: [
          "Native placeholder rules govern which components fit each page area. An offered **Accordion** in the main area and no **Accordion** choice in the sidebar demonstrate both sides of the rule. The general component library can list components that a particular area does not accept.",
        ],
      },
      {
        title: "Add one temporary Accordion",
        action: [
          "Confirm **Practice {{pack}}** is still selected. Open **Components** using its icon in the left pane, then expand **Campaign**. Drag **Accordion** onto the canvas into the gap between the yellow **Make the next conversation count** alert and the white **Prepare for your next small-business conversation.** callout.",
          "The **Assign content item** dialog opens at your selected page’s **Data** folder. Select **Prepare for review**, then click **Assign**. Use **Assign**, because this exercise reuses your existing content; **Duplicate and assign** would create another item. Leave the datasource fields unchanged.",
          "Wait for **Saved**. Identify the extra **Accordion** between the yellow alert and the white callout. This is the temporary component you will move and remove; the original two accordions remain below the callout.",
        ],
        expected: [
          "The main area now has three accordions. The added one shows **What should we prepare before asking for a review?** between the alert and callout. It uses **Practice {{pack}}** > **Data** > **Prepare for review**, also used by the last original accordion. The assignment dialog offers only this page’s suitable items, **Prepare for review** and **Start the conversation**.",
        ],
      },
      {
        title: "Move the temporary component",
        action: [
          "Click **What should we prepare before asking for a review?** in the temporary accordion between the alert and callout. If this selects its text field, select the parent **Accordion** in the right pane to select the whole component. In the component toolbar, click the **Move down** arrow once.",
          "Wait for **Saved**, then compare **Layers** and the canvas. The extra accordion now sits below **Callout**, immediately before the original **Where should my team begin?** accordion. Its question and answer stay the same.",
        ],
        expected: [
          "The component order changes on your page while the datasource content stays the same. Native placeholder rules keep this accordion in an allowed area.",
        ],
      },
      {
        title: "Remove the extra component and restore the heading",
        action: [
          "Select the temporary **What should we prepare before asking for a review?** accordion directly below **Callout** and above **Where should my team begin?** If its text field is selected, choose the parent **Accordion** in the right pane. Click **Delete** (the trash icon) in the component toolbar, then **Delete** in the **Delete component** confirmation. Wait for **Saved**. This removes the temporary placement; keep the original two accordions and the **Prepare for review** item under **Data**.",
          "Return to **Content** > **Home** > **Practice** > **Practice {{pack}}** > **Data** > **Growth opportunity**. Restore the exact **Title** recorded in step 1, click outside the field, and wait for **Saved**.",
          "Reload the page. Check **Title** against your note, then return to **Practice {{pack}}** > **Editor**. Confirm the original heading and component order, with only the original two accordions. Leave the page unpublished.",
        ],
        expected: [
          "Your page matches its starting content and layout. Removing the added component removes its placement; the existing **Prepare for review** datasource is still available for the original component.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Restore the recorded **Title**, remove only the extra **Accordion** placement, and verify the original component order after reload. Keep all seven original **Data** items, the containing **Layout**, and **Practice {{pack}}** itself. Keep the page unpublished.",
        "These CMS changes do not reset automatically. A workshop-number reset restores portal work and profiles; it cannot restore the practice page’s fields or component order. Finish the restoration in **Page Builder** before leaving.",
      ],
    },
    related: [
      "ai-assisted-authoring",
      "author-approver-workflow",
      "campaign-and-conversation",
    ],
    sourceSlides: [91],
  },
  {
    slug: "ai-assisted-authoring",
    accountScope: "assigned",
    audience: "marketing",
    category: "Content authoring",
    title: "Improve content with AI",
    summary:
      "Use **Optimize with AI** in your assigned **Practice** page’s content field to correct spelling and propose a short rewrite. Compare the suggestions before accepting or rejecting them, then restore the practice content.",
    outcome:
      "You learn how AI assistance fits into everyday authoring: the tool proposes changes, the author reviews them, and only an accepted result becomes saved content. Saving updates authoring content; your practice page stays unpublished.",
    personas: ["Sitecore author"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      practicePagePrerequisite,
      "Use **Optimize with AI** on your own **Growth opportunity** item beneath **Practice {{pack}}** > **Data**. Record and restore the exact original **Body**, including formatting. If you just completed **Edit page content**, finish its cleanup before starting this exercise.",
    ],
    links: [pageBuilder],
    steps: [
      {
        title: "Record the original practice Body field",
        action: [
          `Open [**Page Builder**](${PAGES}), then select **Content** in the top navigation. In the content tree, expand **Home** > **Practice** > **Practice {{pack}}** > **Data**, and select **Growth opportunity**. Locate its **Body** rich-text editor.`,
          "Confirm **Practice {{pack}}** matches your assignment, then copy the complete original **Body**, including formatting, into your notes. Replace it temporarily with: We help your agnecy prepare for the next client conversation. The deliberate misspelling lets you see what the AI correction changes.",
        ],
        expected: [
          "**Growth opportunity** supplies the page’s guidance card. Its **Body** is a rich-text field, which can hold formatted paragraphs and links. The editor provides **Optimize with AI** for this field, so the author can improve the copy without leaving the content item.",
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
          "The accepted correction appears in your own **Body** and persists after reload. This saves authoring content only; the page remains unpublished. A suggested change remains subject to author review.",
        ],
      },
      {
        title: "Try a short drafting prompt and reject the rewrite",
        action: [
          "Reopen **Optimize with AI** and enter: Write two concise sentences for an agency preparing a small-business submission.",
          "Inspect the proposed wording for accuracy and usefulness. A **Brand Kit** collects brand guidance for AI-assisted work; if a kit is shown, read its name and leave the selection unchanged. The [**Explore Agentic Studio** walkthrough](/workshops/guide/agentic-studio-workflow) shows where brand instructions were retrieved for a saved example.",
          "Select **Revert to original** for this current AI rewrite.",
        ],
        expected: [
          "The AI proposes copy for review. **Revert to original** returns to the text present when you opened this rewrite. The next step restores the practice page’s starting text from your notes.",
        ],
      },
      {
        title: "Restore the recorded starting content",
        action: [
          "In **Practice {{pack}}** > **Data** > **Growth opportunity**, restore the exact **Body** recorded before the first temporary edit.",
          "Click outside the field, wait for the saved checkmark, and reload. Compare wording and formatting.",
        ],
        expected: [
          "The practice item matches your recorded wording and formatting. Waiting for the save checkmark before leaving confirms that the restoration reached Sitecore.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Keep **Practice {{pack}}** unpublished and verify the original **Body** wording and formatting after reload. CMS content does not reset automatically: restore it in **Page Builder**. A workshop-number reset applies to portal work and profiles, not your page or its Data items.",
      ],
    },
    related: ["campaign-composition", "agentic-studio-workflow"],
    sourceSlides: [92],
  },
  {
    slug: "alert-dates-and-publication",
    audience: "marketing",
    category: "Content authoring",
    title: "Review alert dates and publishing",
    summary:
      "**Read-only review:** Inspect an alert’s message and display dates in Page Builder. Learn the difference between showing or hiding an already published alert and publishing or retiring a whole page. An optional developer demonstration shows the latter.",
    outcome:
      "You can identify which action meets the need: a component’s date window controls its visibility, while publication changes the content delivered through **Experience Edge**, Sitecore’s service for published website content.",
    personas: ["Sitecore author", "Developer with publication API access"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "Follow the presenter in **Campaign practice** for the first two, read-only steps. **UTC** is the common time zone used by these date fields; compare times in UTC rather than your computer’s local time. The final two steps are an optional developer demonstration requiring publication API access, a prepared sample, and agreed UTC start and end times.",
    ],
    links: [pageBuilder],
    repositoryFiles: [
      {
        label: "Bounded scheduling guide",
        path: "authoring/CAMPAIGN-AUTHORING.md",
        section: "Run the bounded publication and expiration exercise",
      },
    ],
    steps: [
      {
        title: "Inspect the alert’s authored message and dates",
        action: [
          `Open [**Page Builder**](${PAGES}), select **Content**, and open **Home** > **Agency growth** > **Campaign practice** > **Data** > **Preparation update**.`,
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
          "Select **Campaign practice**, return to **Editor**, and find **Alert** in **Layers**. Keep the **Default** editing host so you inspect the hosted authoring view.",
          "Compare the canvas with the dates read in step 1. If both dates are empty, no display window is configured. If the recorded window is inactive, the alert remains visible to authors so they can edit it; leave the dates unchanged.",
        ],
        expected: [
          "Authors can still find and edit an alert whose live visibility window is inactive. These fields control presentation; they do not themselves publish or delete content.",
        ],
      },
      {
        title: "Prepare the optional scheduled-publication demonstration",
        action: [
          "For the optional timed demonstration, follow the developer’s screen. That developer opens **Liberty Mutual’s GitHub repository**, browses to **authoring/CAMPAIGN-AUTHORING.md** from the repository root (its top-level folder), and follows **Run the bounded publication and expiration exercise** to prepare **campaign-schedule-check**. Continue once they provide the page URL and schedule; otherwise, finish after the alert inspection.",
          "Record the page URL and UTC start and end times supplied by the developer. The developer verifies the **English** page and its local content are initially absent from **Live Experience Edge**, establishing the before-publication baseline.",
        ],
        expected: [
          "The scheduling example uses a dedicated page and matching publishing-availability dates for its content, keeping the exercise scoped to that page.",
        ],
        repositoryFiles: [
          {
            label: "Scheduling procedure and cleanup",
            path: "authoring/CAMPAIGN-AUTHORING.md",
            section: "Run the bounded publication and expiration exercise",
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
        "For the optional timed run, have that developer record both publish-operation IDs and confirm the script exited. The dedicated sample items remain for inspection. A workshop-number reset cannot cancel publication jobs or restore CMS content.",
      ],
    },
    related: ["resource-content-workflow"],
    sourceSlides: [94, 95],
  },
  {
    slug: "find-an-agent-profile",
    audience: "marketing",
    category: "Personalization and measurement",
    title: "Find an agent profile",
    summary:
      "Find the SitecoreAI record receiving one agent’s browsing activity. A **profile** brings together known attributes and recorded engagement; matching it to the portal login lets you understand the personalization and measurement exercises.",
    outcome:
      "You can connect a familiar portal username to its current SitecoreAI profile, inspect page visits, and recognize interest scores. This gives you evidence for why an agent sees particular content.",
    personas: ["daniel.01", "maya.01", "elena.01", "Sitecore profile reviewer"],
    prerequisites: [
      workshopNumberPrerequisite,
      platformPrerequisite,
      `Use the live portal and **daniel.01** with your workshop number for this example. If the calculation or affinity guide sent you here, repeat these lookup steps for the named Avery, Maya, or Elena account with that same number. If a guide explicitly uses the transaction preview, open [**Transaction preview: Reset a workshop number and current identities**](${previewReset.href}) instead; lookup and browsing must use the same website.`,
    ],
    links: [liveLogin, profileLink, liveReset, previewReset],
    steps: [
      {
        title: "Copy Daniel’s current live-portal identity",
        action: [
          `Open [**Live portal: Reset a workshop number and current identities**](${liveReset.href}). Sign in to the workshop website if requested, then select your number from [**Attendee assignments**](/workshops/attendees) under **Workshop number**. Do not click **Reset workshop** for this lookup.`,
          "Under **current profile identities**, find **daniel.01** with your workshop number and copy its **Agent identity**. This value identifies the profile currently receiving that account’s browsing activity.",
          "For the affinity guide, also copy **maya.01** and **elena.01** from this same list. All seven identities are visible without signing into each persona. A reset changes the active values, so recopy them after any reset rather than using an earlier note.",
        ],
        expected: [
          "**Agent identity** is the portal’s lookup identifier for this account’s active SitecoreAI profile. Use it with **Liberty Mutual agent identity**, not **Client ID**, in the search filter. Reset creates a new active identity while earlier profiles can retain the same person’s name, so copy the current value.",
        ],
        links: [liveReset, previewReset],
      },
      {
        title: "Search using the copied Agent identity",
        action: [
          `Open [**SitecoreAI Profiles**](${PROFILES}). This is **Performance** > **Profiles** in SitecoreAI.`,
          "Above the profile results, open the **Search filter** dropdown beside the search input and select **Liberty Mutual agent identity**. Paste the copied identifier into **Search by Liberty Mutual agent identity** and press Enter.",
          "Wait for the matching person, then click their name.",
        ],
        expected: [
          "For this example, the result matches **Daniel Ortiz - 01**, using your workshop number, and the copied identity. When repeating for Avery, Maya, or Elena, match that person’s name and copied identity. Checking both values selects the current profile even when earlier profiles have the same name.",
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
          "**Engagement** shows recorded visits. **Top affinities** shows interests inferred from visits to tagged pages; an empty section means no such scores are displayed yet. Earlier exercises may already have added history. Signing out preserves it, while a workshop-number reset activates clean profiles. Recording the baseline makes a later comparison meaningful.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close the **Reset a workshop number** tab when the identity lookup is complete. Keep only the profile and portal tabs needed for the next exercise.",
        `Lookup changes nothing, so no reset is required. If you later need a fresh comparison, open the reset page for the same website—[**Live portal**](${liveReset.href}) or [**Transaction preview**](${previewReset.href})—select your number, and wait until anyone using it has finished before clicking **Reset workshop**. Wait for **Workshop [selected number] is ready**, sign into the portal again, and copy the new **Agent identity** values. This resets saved work and activates clean profiles for all seven personas with that number; it retains older SitecoreAI profiles.`,
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
    title: "Review calculated personalization",
    summary:
      "See how a business calculation can choose relevant campaign content. Inspect an existing JavaScript condition that evaluates known agency production data, then compare the **Small business growth** campaign for Avery and Daniel.",
    outcome:
      "You understand how developers can provide a reusable condition and marketers can use its true-or-false result to select content. This example targets a known agency opportunity; it does not infer interest from browsing or split visitors into an A/B test.",
    personas: ["avery.01", "daniel.01", "Sitecore personalization reviewer"],
    prerequisites: [
      workshopNumberPrerequisite,
      platformPrerequisite,
      "Use the live portal. Follow [**Find an agent profile**](/workshops/guide/find-an-agent-profile) for Avery and Daniel with your number from [**Attendee assignments**](/workshops/attendees). Keep both SitecoreAI profile tabs open. The rule’s testing tool needs each profile’s **UUID**, its unique identifier in the profile URL, rather than the portal’s **Agent identity** lookup value. Leave the saved JavaScript and rules unchanged.",
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
          `Open [**Page Builder**](${PAGES}), SitecoreAI’s visual page-authoring tool. In the left page tree, expand **Home** > **Agency growth** and click **Small-business growth**. Keep **Editor** selected in the top navigation.`,
          "Click the stacked-layers **Layers** icon at the top of the left pane. **Layers** lists the page’s components, or sections. Select **Callout**, the campaign’s guidance card, then open **Edit personalization rules** to see how an audience is matched to content.",
        ],
        expected: [
          "**Callout** is the campaign’s guidance card. Its **Personalized** panel shows **Liberty Mutual - Small business growth opportunity**. The rule connects a calculated audience condition to an authored content **variant**, an alternative version of the card’s message and action.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Understand the business calculation",
        action: [
          `Open [**the saved JavaScript custom value**](https://app.sitecorecloud.io/personalize/custom-values/9faad837-0e23-4b5b-af10-c6883dba86ac?organization=${ORG}&tenantId=${TENANT}). Confirm the name **Liberty Mutual - Small business growth opportunity**, then read the code displayed in its editor. Leave the code unchanged.`,
          "Read the ratio as small-commercial premium divided by personal plus small-commercial premium. **Growth opportunity** requires a share below 20%.",
        ],
        expected: [
          "The calculation requires an identified principal or producer. Missing, invalid, or zero-total data returns the default guidance.",
          "The **Unified Data Layer (UDL)** is SitecoreAI’s profile data layer. It holds the fictional agency production attributes used here. Those known values let the condition evaluate an opportunity without waiting for browsing history. Using **Salesforce** or **Snowflake** data would require an integration with agreed fields, identity matching, access, and update frequency.",
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
        title: "Test the condition with two profiles",
        action: [
          "In each current SitecoreAI profile tab, copy the UUID in the address’s final path segment after /profiles/, stopping before the question mark. This is not the **Agent identity** from the reset page. Return to **Liberty Mutual - Small business growth opportunity**, open **Test**, load Avery’s profile with that UUID, and run the test. Repeat with Daniel’s UUID so both evaluations use known profile attributes.",
          "Compare the returned true/false result with the small-commercial share described in the previous step. Loading a test profile supplies inputs for evaluation; do not edit the stored profile, JavaScript, or published rule.",
        ],
        expected: [
          "Avery’s **Cedar Ridge** profile returns true: its 14.46% share is below the threshold. Daniel’s **Prairie Oak** profile returns false at 36.86%, so the campaign uses its default guidance. The test explains the audience decision before you inspect the delivered page.",
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
        "**Cancel** or close rule and custom-value editors without saving. No workshop-number reset is needed.",
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
    title: "Personalize by browsing interest",
    summary:
      "An **affinity** is an interest score built from visits to tagged content. Browse resources as Daniel and Maya, watch those interests appear in their SitecoreAI profiles, and compare the guidance card on **Products & appetite**.",
    outcome:
      "You see browsing behavior change a content choice without changing the agent’s role or licenses. The highest recorded interest selects an authored message; an Elena profile with no relevant scores provides the default comparison. This is separate from known-attribute personalization and A/B testing.",
    personas: ["daniel.01", "maya.01", "elena.01", "Sitecore profile reviewer"],
    prerequisites: [
      workshopNumberPrerequisite,
      platformPrerequisite,
      `To compare the default message with a personalized message, begin with clean profiles: open [**Live portal: Reset a workshop number and current identities**](${liveReset.href}), select your workshop number, and wait until anyone using it has finished before clicking **Reset workshop {{pack}}**. Wait for **Workshop {{pack}} is ready**, then close any older agent-profile tabs because those identities are no longer used by these logins. Reset also restores baseline saved work for all seven personas with that number. If you keep existing work instead, record the starting scores and expect that a personalized headline may already appear.`,
      `After deciding whether to reset, follow [**Find an agent profile**](/workshops/guide/find-an-agent-profile) for Daniel, Maya, and Elena with your workshop number. Copy their current identities from the live reset page, and keep the matching profile tabs open to compare scores before and after browsing. Use [**the live portal login**](${liveLogin.href}) throughout this exercise.`,
    ],
    links: [
      liveLogin,
      liveReset,
      profileLink,
      {
        label: "Open SitecoreAI Affinities",
        href: `https://app.sitecorecloud.io/performance/settings/affinities?organization=${ORG}&tenantId=${TENANT}`,
      },
      pageBuilder,
    ],
    steps: [
      {
        title: "Inspect the tagged-page setup and starting profiles",
        action: [
          `Open [**SitecoreAI Affinities**](https://app.sitecorecloud.io/performance/settings/affinities?organization=${ORG}&tenantId=${TENANT}). This is **Performance** > **Settings** > **Affinities** in SitecoreAI. In the site list beside the settings menu, select **Liberty Mutual Agent Portal**.`,
          "In the table on the right, read **Affinity Name**, **Affinity Value**, and **Page**. **insurance_interest** is the interest category; **workers_compensation** and **household** are its topic values. The page assignments tell SitecoreAI which visits contribute to each topic. Compare those assignments and leave them unchanged.",
          "Open the current Daniel, Maya, and Elena profiles and record existing scores before any tagged visits.",
        ],
        expected: [
          "Five pages carry interest tags. **Products & appetite** itself is untagged, so checking its guidance card does not add a topic score. The resource visits in this exercise supply the browsing signal.",
          "Existing browsing history can already select a topic. A profile with no relevant browsing interest shows the default message.",
        ],
      },
      login("daniel"),
      {
        title: "Record Daniel’s starting Products experience",
        action: [
          "Click **Products & appetite** in the portal’s left sidebar and set **Risk state** to **Illinois**. The personalized spotlight is the large card above the business-line filters.",
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
          "In SitecoreAI’s recorded events, these articles use their stored page names, **illinois-workers-compensation** and **texas-workers-compensation**, rather than their display titles. Those names match the affinity page assignments inspected earlier.",
        ],
      },
      {
        title: "Connect Daniel’s score to the rendered spotlight",
        action: [
          "On Daniel’s current SitecoreAI profile, open **Engagement** and look for the two resource visits, then **Overview** > **Top affinities** for **workers_compensation**. Refresh the profile if new events have not appeared yet. If they remain absent, recheck the current **Agent identity** before interpreting the portal headline.",
          "Return to **Products & appetite**, confirm **Illinois** in **Risk state**, and read the large spotlight card above the business-line filters. Click **Review account preparation** within that card.",
          "In the browser’s address bar, confirm the destination URL contains **state=IL**, which carries the selected Illinois context into the resource. Then sign out.",
        ],
        expected: [
          "The resource visits add **workers_compensation** interest in SitecoreAI. Scores and event counts depend on recorded history and processing; the important comparison is the new visits, the top interest, and the corresponding authored headline.",
          "For the corresponding top interest, the spotlight says **Build a stronger workers compensation conversation**. Its action opens BOP preparation retaining Illinois.",
        ],
      },
      login("maya"),
      {
        title: "Build Maya’s distinct household interest",
        action: [
          "Click **Products & appetite** in the portal’s left sidebar and set **Risk state** to **Texas**. Record the headline in the large spotlight card above the business-line filters.",
          "Select **Personal lines**, then click **Explore coverage** on the **Personal insurance** card. On the page that opens, click **Explore the preparation guide**.",
          "Click **Products & appetite** in the sidebar and confirm **Risk state** remains **Texas**. In Maya’s current profile, inspect **Engagement** for those visits and **Overview** > **Top affinities** for **household**. Refresh if the new events are not yet visible.",
        ],
        expected: [
          "The household-renewal resource opens. Its URL contains **state=TX**, preserving the Texas context selected on Products & appetite.",
          "The visits build **household** interest on Maya’s profile. When that is her top interest, the spotlight says **Make the next household renewal conversation count**. Compare the topic and headline; a fixed score or visit count is not required.",
        ],
      },
      {
        title: "Check the household action and switch identities",
        action: [
          "Click **Review the household renewal checklist**. In the browser’s address bar, confirm the destination URL contains **state=TX**, which carries the selected Texas context into the resource.",
          "**Sign out**, then sign in as **elena.01** with password **Sitecore**. Click **Products & appetite** in the portal’s left sidebar and set **Risk state** to **Illinois**. The personalized spotlight is the large card above the business-line filters.",
          "Compare Elena’s headline with the scores you recorded on her SitecoreAI profile.",
        ],
        expected: [
          "The checklist opens the household-renewal resource with **state=TX** in its URL and can add another tagged visit to Maya’s profile.",
          "With no recorded affinity, Elena sees **Protection built around the business you know**. Each agent’s profile reflects that agent’s own browsing.",
        ],
      },
      {
        title: "Inspect the authored mapping behind the result",
        action: [
          `Open [**Page Builder**](${PAGES}), SitecoreAI’s visual page-authoring tool. In the left page tree, select **Home** > **Products & appetite**. In **Editor**, click the stacked-layers **Layers** icon to list the page’s components, or sections. Select **Spotlight**, the guidance card you inspected in the portal, and click **Edit personalization rules**.`,
          "In the rules panel, read **Liberty Mutual - Product interest spotlight**. Locate the two rows using **Top Affinity**: one equals **workers_compensation**, and one equals **household**. Compare each row’s content choice with the headlines you saw in the portal.",
          "Click **Cancel** and record the ending profiles, scores, and displayed headlines.",
        ],
        expected: [
          "The **Live** rules connect each interest to the headline and action shown in **Spotlight**.",
          "**Top Affinity** is the highest recorded interest used by this rule. It selects the corresponding content **variant**, meaning the headline and action authored for that topic. The rule changes relevant guidance while the agent’s licensed-state and business permissions remain in effect.",
        ],
        note: "**What to notice:** Inspect the audience rule on the component itself in **Page Builder**. With profile tracking and affinity tags already configured, **SitecoreAI** builds the interest scores and **Top Affinity** selects authored variants. Marketers can see how each interest maps to the guidance shown.",
        links: [pageBuilder],
      },
    ],
    cleanup: {
      body: [
        signOut,
        `Preserve the authored rules. To replay a fresh journey, open [**Reset a workshop number on the live portal**](${liveReset.href}), select your number under **Workshop number**, and click **Reset workshop {{pack}}**. Wait for **Workshop {{pack}} is ready**, then sign into the live portal again and look up its new **Agent identity** values. The reset restores baseline saved work and activates seven new SitecoreAI profiles with clean browsing history. All seven personas with your workshop number change together on the live portal only. Previous SitecoreAI profiles and test history remain. Authored pages, search content, saved Agentic Studio outputs, and delivered form requests are unchanged.`,
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
    title: "Review an A/B test",
    summary:
      "An **A/B test** compares alternatives by sharing eligible traffic between them and measuring a goal. Preview two labels for the same guidance button, follow Daniel’s visit, and inspect the existing test’s results in SitecoreAI.",
    outcome:
      "You can explain the question this test asks: which button label encourages more visits to the small-business guide? You can distinguish assigned test variations from personalization based on an agent’s attributes or interests, and read the evidence before choosing a winner.",
    personas: ["daniel.01", "Sitecore experiment reviewer"],
    prerequisites: [
      workshopNumberPrerequisite,
      platformPrerequisite,
      `Review the existing test configuration without editing it, then use your workshop number for the portal interaction. Open [**Live portal: Reset a workshop number and current identities**](${liveReset.href}), select your number from [**Attendee assignments**](/workshops/attendees), and copy Daniel’s **Agent identity**. Do not reset merely to view this value. Your invited Sitecore account needs access to the existing test and profile reports; otherwise, follow the presenter for those steps. Leave the test running.`,
    ],
    links: [pageBuilder, liveLogin, profileLink, liveReset],
    steps: [
      {
        title: "Preview the current authored variations",
        action: [
          `Open [**Page Builder**](${PAGES}), SitecoreAI’s visual page-authoring tool. In the left page tree, select **Home** > **Learning & resources**. Open the version selector above the canvas and choose **Small-business CTA experiment (v2)**, the version containing this test. In **Editor**, click the stacked-layers **Layers** icon at the top of the left pane to list the page’s components, or sections. Locate **Guidance**, the guidance card whose button is being tested, and click its test icon.`,
          "In the test panel, open **Liberty Mutual Small Business Guide CTA**. Select variation **A** and click **Preview**, then select **B** and click **Preview**. Read the guidance button in each preview.",
          "Compare the button labels and check that the surrounding heading, description, and destination stay the same. In the test’s configuration, read the traffic split and goal. Return the variation selector to **A**.",
        ],
        expected: [
          "**Guidance** is the card headed **Useful guidance, easier to find**. Its **A** variation says **Start with small business**; **B** says **Build your small-business practice**. A variation is one option in the test. Only the button label changes, so the comparison focuses on that wording.",
          "The configured 50/50 split gives each variation an equal share of eligible traffic; 100% participation includes all eligible traffic in the test. A **goal** is the measured outcome, here a visit to the small-business guide.",
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
          `The action opens [**the small-business practice guide**](${LIVE}/resources/expand-small-business-practice), the destination measured by the test’s goal.`,
          "Record the label you receive, then use the **Component A/B/n tests** report in step 5 to inspect credited experiment activity. **A** is also the default label when the portal has no test decision.",
        ],
      },
      {
        title: "Find the corresponding page visits in SitecoreAI",
        action: [
          `Open [**SitecoreAI Profiles**](${PROFILES}). Select **Search filter** > **Liberty Mutual agent identity**, enter Daniel’s current identifier, and open **Daniel Ortiz**.`,
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
          `Open [**the existing component test report**](https://app.sitecorecloud.io/performance/dashboards/ab-tests?test=component_c9b4e46b3b7250d4a96e732c4d181b6a_e144a961809e570f9e26c1cdd5d4e99b_en_20260914t022704347z&site=&page=&organization=${ORG}&tenantId=${TENANT}) in **Performance** > **Component A/B/n tests**. In the report’s filters, set **Site** to **liberty-mutual-agent-portal** and **Test** to **Liberty Mutual Small Business Guide CTA**.`,
          "Read the result row for **A**, then **B**. Record each row’s visits, goals, and goal rate, along with the report’s confidence and test status, to compare the two labels.",
          "Close the report without changing the experiment.",
        ],
        expected: [
          "**Visits** records credited test traffic; **goals** records credited outcomes; **goal rate** expresses how often that traffic achieves the goal. Compare both variations using these measures. **Confidence** helps assess whether the observed difference is sufficiently reliable for a decision.",
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
        "A workshop-number reset creates fresh profiles and restores baseline saved work, but does not clear the experiment’s history or settings. Recheck the current **Agent identity** after any reset.",
      ],
    },
    related: ["find-an-agent-profile", "affinity-personalization"],
    sourceSlides: [102, 103, 104],
  },
  {
    slug: "agentic-studio-workflow",
    audience: "marketing",
    category: "Agentic Studio",
    title: "Explore Agentic Studio",
    summary:
      "**Read-only:** Explore **Agentic Studio**, where AI agents use instructions and tools to complete connected marketing tasks. A saved Watkins Insurance Group outreach example shows research becoming a brief and email drafts, with brand guidance and human review along the way.",
    outcome:
      "You can follow the work, inspect the sources and tools used, and see where a marketer improved the result. The outreach is the example; the capability is a reusable process that carries context from research into reviewable content.",
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
          `Open [**the saved Agentic Studio workspace**](${STUDIO}) and confirm the space title is **Liberty Mutual | Watkins Insurance Group outreach**. If another space opens, open [**SitecoreAI**](${SITECORE}), confirm **Safeco Insurance Company of America POC**, and open **Agentic** > **Spaces** > **Liberty Mutual | Watkins Insurance Group outreach**.`,
          "At the top of the space, select the **Chat** view. In the right-hand panel, select **Agents** and read the three stages under **Connected workflow**: **Account Enrichment**, **Brief Generation**, and **Content Generation**. Follow their top-to-bottom order from research to a brief and content tasks.",
        ],
        expected: [
          "A **space** groups one body of work, its instructions, conversation, and outputs. A **workflow** connects its stages. Here **Account Enrichment** gathers account context, **Brief Generation** organizes direction, and **Content Generation** produces content tasks and drafts. **Chat** preserves the execution and follow-up conversation.",
          "An **AI agent** performs an assigned task using the instructions and tools available to it. This workflow uses Sitecore’s built-in agent definitions unchanged. The space’s instructions provide the task and brand context.",
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
          "**Context** is the information supplied to guide the AI’s work. **Space Context** retains shared requirements, source rules, brand guidance, and output format. **Agent Context** adds instructions for the next execution, or run, without replacing that shared direction.",
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
          "The attached **Brand Kit** supplies brand guidance. **Tools** lists capabilities available for this task, such as retrieving information, searching the web, and saving artifacts. The expanded results show which information was actually retrieved, so you can inspect more than the AI’s final wording.",
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
          "A **Brand Kit** collects reusable guidance such as visual style, tone, and brand context. **Get Brand Kit** identifies **Liberty Mutual — Independent Agents**, and **Get Brand Kit Section** retrieves specific instructions. Here the output includes palette, typography, and logo guidance supplied to the response.",
          "These results show the brand instructions retrieved for the response. We assembled a sample **Brand Kit** for the Liberty Mutual Agent Portal workshop.",
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
          "An **artifact** is a saved output you can reopen separately from **Chat**. The research artifact separates source facts, the brief, and proposed direction, making the inputs and recommendations easier to review.",
          "The **HTML** artifacts contain the email layout as well as its text; **Preview** renders that layout for review. The three drafts adapt the shared context for different roles, with distinct subjects, messages, and actions. These are drafts, not sent emails.",
        ],
      },
      {
        title: "Find the human review behind the final output",
        action: [
          "Close the artifact dialog and read the later refinement prompts in **Chat**. Look for requested factual corrections and presentation changes to understand where people improved the generated output.",
          "Click **Artifacts** at the top of the space, select **Watkins outreach | Evidence and editorial review**, and click that card’s expand arrows. Read the review notes to see which facts and presentation details received human attention.",
        ],
        expected: [
          "The saved history shows how human feedback improved the generated content.",
          "These artifacts are saved email drafts for human review. Sending outreach and establishing a formal approval process would be separate steps.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close the artifact viewer and leave the saved conversation and artifacts available for the next reviewer. No reset is needed.",
      ],
    },
    related: ["ai-assisted-authoring"],
    sourceSlides: [105, 106, 107],
  },
];
