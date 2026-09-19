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
  label: "Production: Reset a reviewer number and current identities",
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
  "Use your own authorized **Sitecore** account in **Safeco Insurance Company of America POC**, with **Liberty Mutual Agent Portal** selected. Portal usernames do not grant **Sitecore** access.";
const authorPrerequisite =
  "Keep **Default** as the **Page Builder** editing host. Agree shared-item edits with the **Sitecore** author responsible for that content; do not edit the same version concurrently.";
const packPrerequisite =
  "Use your assigned reviewer pack consistently across all personas. Pack 01 is the presenter example; attendees use their assigned pack from 02–15.";
const signOut =
  "Click the signed-in person’s name or avatar in the upper right, then **Sign out**. Wait for **Welcome back** before switching to another persona.";
const persistentWork =
  "Saved work has no automatic expiry. Signing out ends the session but keeps saved work and native **SitecoreAI** profile history.";
const sharedReset =
  "Retain the example for review, or open **Reset a reviewer number** on the designated preview and sign in to the workshop guide. Select your assigned pack under **Reviewer number**. Make sure everyone using that pack has finished, check the number on the button, then click **Reset reviewer {{pack}}**. Wait for **Reviewer {{pack}} is ready** and sign into the **Agent Portal** again. This one action restores baseline saved work and activates seven newly verified native profiles with clean browsing history, for this reviewer number on this host only. Previous native profiles and experiment history remain. CMS content, **Search**, **Agentic** artifacts and webhook receipts are unchanged.";

function login(persona: string, preview = false): GuideStep {
  return {
    title: `Sign in as ${persona}.01`,
    action: [
      `Open the ${preview ? "transaction-preview" : "live"} portal login. If another person is signed in, use their profile menu > **Sign out** first.`,
      `Enter username **${persona}.01** and password **Sitecore**, then click **Sign in**.`,
    ],
    expected: [
      "**My workspace** opens at /. Confirm the person and agency shown before continuing.",
    ],
    links: [preview ? previewLogin : liveLogin],
  };
}

export const marketingGuides: WorkshopGuide[] = [
  {
    slug: "start-and-switch-agents",
    audience: "marketing",
    category: "Start here",
    title: "Get ready and switch between agent personas",
    summary:
      "Choose the right account and environment, understand shared work, and finish a walkthrough without losing the next person’s place.",
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
      "The **Sitecore** workshop team supplies your pack assignment and any separate **Sitecore** invitation. **Reset a reviewer number** is available to signed-in workshop reviewers with no additional credentials.",
    ],
    links: [
      liveLogin,
      previewLogin,
      sitecoreWorkspace,
      liveReset,
      previewReset,
    ],
    steps: [
      {
        title: "Choose the environment for the exercise",
        action: [
          "Use the live portal for browsing, personalization, **Search** and checking published content.",
          "Use the designated transaction preview for new submissions, renewal follow-ups, bonds and saved conversation requests.",
        ],
        expected: [
          "Production and preview keep saved operational work separate.",
          "The preview can show unpublished CMS content, so it cannot prove that an article has been published. Native history can be shared by older seeded identities; new profile sets use distinct identities for each host.",
        ],
        links: [liveLogin, previewLogin],
      },
      {
        title: "Choose a personal or small-commercial persona",
        action: [
          "**Avery Brooks**: **avery.01**, **Cedar Ridge** agency principal; licensed in Texas, Florida and Illinois.",
          "**Maya Chen**: **maya.01**, **Cedar Ridge** personal-lines account manager; licensed in Texas, Florida and Illinois.",
          "**Jordan Ellis**: **jordan.01**, **Cedar Ridge** small-commercial producer; licensed in Texas and Illinois.",
          "**Daniel Ortiz**: **daniel.01**, **Prairie Oak** business-insurance producer; licensed in Illinois and Texas.",
        ],
        expected: [
          "The role, agency and individual licenses explain differences in guidance and business actions. Seeing shared agency work does not automatically grant permission to advance it.",
        ],
      },
      {
        title: "Choose a commercial, surety or wholesale persona",
        action: [
          "**Priya Shah**: **priya.01**, **Harborline** commercial account executive.",
          "**Marcus Reed**: **marcus.01**, **Harborline** surety specialist.",
          "**Elena Park**: **elena.01**, **Summit Specialty** wholesale broker.",
          "All three have Texas, Florida and Illinois licenses. Their product and transaction authority still differs.",
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
          "Sign in with another persona and the same pack suffix. Close an unsaved dialog with its × button or Escape before switching.",
        ],
        expected: [
          persistentWork,
          "Signing in again keeps the active native profile; it does not create a new profile set. Use **Reset a reviewer number** in this private workshop guide when you need to reset a pack.",
        ],
      },
      {
        title: "Keep the clocks and permissions distinct",
        action: [
          "After an eight-hour session, sign in again to resume saved work.",
          "Use your own invited **Sitecore** account for authoring, review, publishing and platform inspection.",
        ],
        expected: [
          "The fictional business metrics use a September 10, 2026 scenario and the September 2025–August 2026 reporting period. Authority checks use the current UTC date.",
          "Known profile attributes help personalize guidance. The application separately checks record ownership, licenses, appointments and product eligibility before protected actions. General guidance remains valid if native personalization context is unavailable.",
        ],
      },
    ],
    cleanup: {
      body: [
        signOut,
        "For a clean reset, open **Reset a reviewer number** on the host you used. **Reviewer number** offers 01–15 and starts at your assigned pack. Check the selected number, then click **Reset reviewer** for that number. There are no reset modes to choose. Wait for **Reviewer [selected number] is ready** and sign into the **Agent Portal** again. The action restores baseline saved work and activates seven newly verified native profiles with clean browsing history. All seven same-suffix personas change together on this host only. Previous profiles and experiment history remain; CMS content, **Search**, **Agentic** artifacts and webhook receipts are unaffected.",
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
          "On **My workspace**, find the **Agency growth** card below **Your priorities**.",
          "Click **Explore the growth path**. Return and open **Clients & policies**; choose **All policies** if needed.",
          "Open **Products & appetite** > **Risk state**, then sign out.",
        ],
        expected: [
          "**Cedar Ridge**’s principal sees **Build your next chapter in small business**. The action opens the small-business practice resource.",
          "The baseline book has six rows: four personal policies and two Juniper small-business policies. These working rows are not the complete book used for production metrics.",
          "Texas, Florida and Illinois are available.",
        ],
      },
      login("jordan"),
      {
        title: "Compare the small-commercial producer",
        action: [
          "Find **Agency growth** below **Your priorities**. Click **Prepare a BOP submission**.",
          "Return to **Clients & policies**, then **Products & appetite** > **Risk state**.",
          "Open **Quote & submit** > **Pecan Street Design**. Inspect the seed **Draft** without changing its checklist or status; close it and sign out.",
        ],
        expected: [
          "**Bring a stronger submission to the table** leads to BOP preparation guidance. The guidance button does not itself start an intake.",
          "The baseline book contains **Juniper Businessowners policy** and **Workers compensation**. Only Texas and Illinois are selectable; Florida is absent.",
          "Seed **Draft** SUB-2609-1042 retains Texas.",
        ],
      },
      login("maya"),
      {
        title: "Compare the personal-lines account manager",
        action: [
          "Find **Agency growth** below **Your priorities** and click **Start the learning path**.",
          "Return to **Clients & policies**, then sign out.",
        ],
        expected: [
          "**Connect everyday conversations to new needs** leads to the small-business practice article. Opening the article does not register for a course.",
          "Four personal rows include Morgan auto and home. Juniper commercial rows are absent.",
        ],
      },
      login("elena"),
      {
        title: "Observe valid neutral guidance",
        action: [
          "Find **Agency growth** and click **Browse resources**.",
          "Click **Elena Park** in the upper right to open **Your profile**. Inspect **Distribution channel** and **Licensed states**.",
        ],
        expected: [
          "**Summit Specialty** receives **Resources for your next client conversation** and opens **Learning & resources**. Elena is outside the seeded small-business growth audience.",
          "The profile shows **Wholesale** and Illinois, Texas and Florida. Neutral marketing guidance does not mean authentication or the portal has failed.",
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
      "Search the native **SitecoreAI** index, narrow by state, recover from no results and verify a personal bookmark.",
    outcome:
      "Daniel sees Illinois, Texas and nationwide guidance; Maya can also find Florida guidance. A bookmark persists after reload and can be removed independently.",
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
          "Set **Risk state** to Texas, then Illinois. Inspect the available choices.",
        ],
        expected: [
          "**Risk state** starts at **My licensed states**. Daniel’s scope includes Illinois, Texas and nationwide guidance; Florida-only guidance is absent.",
          "Each selected state includes that state and nationwide content. Florida and **All states** are not offered. The recorded baseline had four matches, but state inclusion and exclusion are the acceptance criteria.",
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
          "The unmatched phrase produces zero results and **Let’s try another angle**. **Reset search** clears both query and filters; it does not reset saved work or CDP history.",
        ],
      },
      {
        title: "Read the Texas article and record its bookmark state",
        action: [
          "Click **Workers compensation** again. On **Workers compensation: a Texas starting point**, click **Read resource**.",
          "Read the source and reviewed date. Record whether the bookmark button starts as **Save resource** or **Saved to your resources**.",
          "If it says **Save resource**, click it. If already saved, keep it unchanged.",
        ],
        expected: [
          "The actual authored Texas article opens.",
          "A new save displays **Resource saved** and changes the button to **Saved to your resources**.",
        ],
      },
      {
        title: "Verify the saved resource after reload",
        action: [
          "Reload the article. Click **Back to learning & resources**, then the **[N] saved resource(s)** button.",
          "Find the article under **Saved for your next conversation**.",
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
          "Compare the state labels with Daniel’s results.",
          "Clear the search input, click **Search** and leave **Risk state** at **My licensed states**.",
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
    slug: "bop-submission",
    audience: "marketing",
    category: "Agent experience",
    title: "Prepare and submit a Texas BOP account",
    summary:
      "Carry the selected state from product guidance into a saved submission, complete requirements and verify the result after reload.",
    outcome:
      "A new fictional Texas submission retains its reference, effective date and **Submitted** status.",
    duration: "10 minutes",
    personas: ["daniel.01"],
    prerequisites: [
      packPrerequisite,
      "Use the designated transaction preview and your assigned pack. Create a uniquely named fictional record; leave existing submissions unchanged.",
      "Choose an appropriate future requested effective date within the configured rules.",
    ],
    links: [previewLogin],
    steps: [
      login("daniel", true),
      {
        title: "Carry Texas from guidance to account preparation",
        action: [
          "Open **Products & appetite** and set **Risk state** to Texas.",
          "Select **Small business** > **Businessowners policy** > **Explore coverage**.",
          "Click **Back to products & appetite**. Select **Small business** again if needed, then **Businessowners policy** > **Prepare account**.",
          "Choose **Retail** and click **Continue to account information**.",
        ],
        expected: [
          "The product page says **Product preparation for Texas**. Illinois and Texas are the available states.",
          "Texas remains selected after returning from guidance. **Prepare your submission** retains **Businessowners policy** and Texas.",
        ],
      },
      {
        title: "Save a uniquely named fictional account",
        action: [
          "**Named insured / account name**: Prairie Market Partners [your initials] [today’s date]. Enter your chosen future **Requested effective date**.",
          "**Number of employees**: 8. **Annual revenue ($)**: 750000.",
          "**Account notes**: Single-location retail business. Review operations, location details and loss history.",
          "Click **Save & review requirements**. Record the generated reference.",
        ],
        expected: [
          "**Your submission draft is saved**. The new **Draft** opens in **Quote & submit**.",
          "**Risk location / business** reads Texas · **Retail** and the effective date matches your entry.",
        ],
      },
      {
        title: "Complete the requirements and submit",
        action: [
          "Check **Business operations summary** and wait for **Requirement marked complete**.",
          "Check **Property and location details**, then **Three-year loss history**, waiting for each save.",
          "When available, click **Submit for review**.",
        ],
        expected: [
          "**Submit for review** stays disabled until every current requirement and authority check passes.",
          "**Submission sent for review** appears and the status becomes **Submitted**. This does not rate or bind insurance coverage.",
        ],
        note: "Completed requirements cannot be unchecked. The portal has no **Submitted**-to-**Draft** action.",
      },
      {
        title: "Verify the same saved record after reload",
        action: [
          "Close the dialog and reload. Type your unique account name in **Search account or reference**; the table filters as you type.",
          "Open the account and compare its reference, Texas risk state, effective date and **Submitted** status.",
          "Close the dialog, clear the table search and sign out. Retain the reference with your walkthrough notes.",
        ],
        expected: [
          "All recorded values persist. There is no separate table **Search** button or per-submission **Delete**/Undo control.",
        ],
      },
    ],
    cleanup: { body: [sharedReset], links: [previewReset] },
    related: ["renewal-follow-up", "surety-request"],
    sourceSlides: [77, 78, 79, 80],
  },
  {
    slug: "renewal-follow-up",
    audience: "marketing",
    category: "Agent experience",
    title: "Turn a household renewal into a saved follow-up",
    summary:
      "Create a policy-specific priority with a due date and useful notes, then return to the same policy from the saved task.",
    outcome:
      "The new follow-up survives reload under **All priorities** with a link to the correct Morgan homeowners policy.",
    duration: "7 minutes",
    personas: ["maya.01"],
    prerequisites: [
      packPrerequisite,
      "Use the designated transaction preview. Before resetting, make sure other people using the same pack have finished.",
    ],
    links: [previewLogin],
    steps: [
      login("maya", true),
      {
        title: "Open the correct renewal policy",
        action: [
          "Click **Clients & policies** > **Review renewals**.",
          "Open **Morgan household**, **Homeowners**, policy LM-8426101.",
          "Click **Renewal review** > **Save a renewal follow-up**.",
        ],
        expected: [
          "The status filter becomes **Renewal review**.",
          "The home policy is distinct from **Morgan Personal auto** LM-8426100. **Keep the conversation moving** opens.",
        ],
      },
      {
        title: "Save a useful next action",
        action: [
          "**Follow-up title**: Morgan home renewal [your initials] [today’s date]. Choose an appropriate future **Due date**.",
          "**Notes**: Confirm home improvements and household changes before renewal.",
          "Click **Save follow-up**.",
        ],
        expected: [
          "**Follow-up saved to your priorities** appears. The policy dialog stays open. This action does not renew or modify the policy.",
        ],
      },
      {
        title: "Verify the task and policy link",
        action: [
          "Close the policy dialog. Open **My workspace** > **All priorities**, then reload.",
          "Find your new title and due date. Click its title to return to the policy.",
          "Close the dialog, return to **My workspace** and compare **Renewals** with **All priorities**.",
        ],
        expected: [
          "The follow-up and its policy link persist.",
          "The new item is a follow-up under **All priorities**, not a **Renewals**-filter task. Completing it would not restore the original baseline.",
        ],
      },
    ],
    cleanup: {
      body: [
        signOut,
        "Record the task title; there is no per-task delete/undo for this exercise.",
        sharedReset,
      ],
      links: [previewReset],
    },
    related: ["commercial-and-wholesale", "bop-submission"],
    sourceSlides: [81, 82],
  },
  {
    slug: "commercial-and-wholesale",
    audience: "marketing",
    category: "Agent experience",
    title: "Compare commercial and wholesale specialty journeys",
    summary:
      "Inspect policy details and protected document links, then see how distribution channel changes specialty guidance.",
    outcome:
      "Priya reaches retail-specialty guidance and Elena reaches wholesale-specialty guidance without changing policy records.",
    duration: "8 minutes",
    personas: ["priya.01", "elena.01"],
    prerequisites: [
      packPrerequisite,
      "Use the live portal. This is a read-only account and guidance comparison.",
    ],
    links: [liveLogin],
    steps: [
      login("priya"),
      {
        title: "Inspect a commercial property account",
        action: [
          "Open **Clients & policies** > **Coastal Fabrication Group**, **Commercial property**, LM-8426108.",
          "Inspect **Overview** and **Renewal review**. Open **Documents** and optionally download **Coverage summary**.",
        ],
        expected: [
          "This is the Florida property policy, distinct from same-name **General liability** LM-8426109.",
          "**Documents** offers two protected links. **Coverage summary** is an authenticated generated text file, not an issued policy document or a CMS reference PDF.",
        ],
      },
      {
        title: "Follow the independent-agency specialty route",
        action: [
          "Close the policy. Open **Products & appetite** > **Commercial** > **Commercial property** > **Explore coverage**.",
          "Click **Back to products & appetite** > **Specialty** > **Specialty casualty** > **Explore coverage**.",
          "**Sign out**.",
        ],
        expected: [
          "The first link opens midsize and large commercial guidance. The specialty link opens retail-specialty guidance for Priya’s independent-agency channel.",
        ],
      },
      login("elena"),
      {
        title: "Compare the wholesale route",
        action: [
          "Open **Clients & policies** > **Northpoint Property Partners**, **Specialty casualty**, LM-8426111.",
          "Inspect **Overview**, **Documents** and **Renewal review**; close the dialog.",
          "Open **Products & appetite** > **Specialty** > **Specialty casualty** > **Explore coverage**.",
          "Open **Elena Park**’s profile and inspect **Distribution channel** and **Licensed states**.",
        ],
        expected: [
          "The account belongs to **Summit Specialty Partners** and remains unchanged.",
          "Elena reaches wholesale-specialty guidance. **Wholesale** channel selects relevant content but does not remove state eligibility requirements.",
        ],
      },
    ],
    cleanup: {
      body: [
        signOut,
        "Close any downloaded document preview. No reviewer reset is needed.",
      ],
    },
    related: ["surety-request", "personalization-by-role"],
    sourceSlides: [83, 84],
  },
  {
    slug: "surety-request",
    audience: "marketing",
    category: "Agent experience",
    title: "Save and submit a surety request",
    summary:
      "Use Marcus’s specialist workflow for a fictional contract-performance bond request and verify its saved details.",
    outcome:
      "The same request reference, Florida state, $250,000 amount and **Submitted** status survive reload.",
    duration: "8 minutes",
    personas: ["marcus.01"],
    prerequisites: [
      packPrerequisite,
      "Use the designated transaction preview and your assigned pack. Keep existing bond requests unchanged.",
    ],
    links: [previewLogin],
    steps: [
      login("marcus", true),
      {
        title: "Create a new bond request",
        action: [
          "Open **Quote & submit** > **New bond request**.",
          "**Principal legal name**: Bayline Construction [your initials] [today’s date]. **Obligee**: City of Clearwater Facilities.",
          "**Bond type**: **Contract performance**. **State**: Florida. **Bond amount ($)**: 250000.",
          "**Project / request notes**: Municipal facility improvement. Gather principal financials and project details.",
          "Click **Save bond request** and record the new reference.",
        ],
        expected: [
          "The new **Draft** opens automatically. This surety form has its own fields; it does not use the insurance submission’s three-checkbox preparation flow.",
          "Saving does not establish surety credit or issue a bond.",
        ],
      },
      {
        title: "Submit the saved request",
        action: [
          "Compare **Obligee**, **Bond type**, **Bond amount** and **State** with your entries.",
          "Click **Submit bond request**.",
        ],
        expected: [
          "The details are City of Clearwater Facilities, **Contract performance**, $250,000 and Florida.",
          "**Bond request submitted for review** appears and the status becomes **Submitted**. No bond is issued.",
        ],
      },
      {
        title: "Verify persistence",
        action: [
          "Close the dialog and reload. In **Your submissions**, select **Bond requests ([N])** if needed.",
          "Open your unique principal name and compare the reference, status, state and amount.",
          "Close the dialog, sign out and retain the reference with your walkthrough notes.",
        ],
        expected: [
          "The same values remain. There is no per-bond **Delete** or Undo submission control.",
        ],
      },
    ],
    cleanup: { body: [sharedReset], links: [previewReset] },
    related: ["bop-submission", "commercial-and-wholesale"],
    sourceSlides: [85, 86],
  },
  {
    slug: "campaign-and-conversation",
    audience: "marketing",
    category: "Forms and campaigns",
    title: "Explore a campaign and save a conversation request",
    summary:
      "Follow authored navigation, accordions and resource links, then try the campaign’s accessible contact dialog.",
    outcome:
      "You can distinguish campaign content from the custom form that persists a request in the agency’s saved work.",
    duration: "10 minutes",
    personas: ["daniel.01"],
    prerequisites: [
      packPrerequisite,
      "Browse on production first. Switch to the designated preview before saving a request.",
    ],
    links: [liveLogin, previewLogin],
    steps: [
      login("daniel"),
      {
        title: "Follow campaign navigation and guidance",
        action: [
          "Beside **Agency growth** in the sidebar, click **Show Agency growth pages**, then **Small business growth**.",
          "Under **ON THIS PAGE**, select **Opportunity**, **Your questions** and **Your next step**.",
          "Expand **Where should my team begin?** and **What should we prepare before asking for a review?** Try keyboard navigation as well.",
          "Under **Keep useful guidance close**, open **Develop your small-business practice**; return to the campaign.",
        ],
        expected: [
          "The campaign opens at /growth/small-business. **Overview** and the child-page links remain distinct.",
          "Section links move to the intended part of the page, the title includes a growth icon, and each accordion reveals authored rich text.",
          "Resource, preparation and product links are explicit actions. This inspection creates no saved insurance or contact record.",
        ],
      },
      {
        ...login("daniel", true),
        title: "Switch to the preview before saving work",
      },
      {
        title: "Check dialog focus and dismissal",
        action: [
          "Open **Small business growth** > **Your next step** > **Plan a conversation**.",
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
          "The request persists in **Upstash**-backed agency work. It does not send email or create a **Salesforce** transaction. **Native Contact your team** uses a separate form and webhook path.",
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
    ],
    sourceSlides: [87, 88],
  },
  {
    slug: "native-contact-form",
    audience: "marketing",
    category: "Forms and campaigns",
    title: "Native Forms: trace Contact your team to a webhook",
    summary:
      "Inspect the marketer-managed form, submit fictional details and match the message to its receiving webhook record.",
    outcome:
      "You see the full native form-to-webhook path and understand where a real business database or **Salesforce** integration would connect.",
    duration: "10 minutes",
    personas: ["daniel.01", "Sitecore form administrator"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Before submitting, ask the person who manages **Demo Webhook** to confirm its receiver is active and provide the current receipt-inbox link. The original temporary receiver expires September 23, 2026; its owner must replace the URL and retest it before expiry.",
      "Use fictional contact details. The receiver is a demonstration collector, not a **Salesforce** or email integration.",
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
          "Open **Contact your team** in **SitecoreAI Forms**. Select **Edit form**, then **Edit** to inspect the active designer.",
          "Inspect **Your name**, **Work email**, **Agency name**, **How can we help?** and **What would you like to discuss?**.",
          "Open **Settings** using the gear. Inspect **Demo Webhook**, site availability and the success message.",
        ],
        expected: [
          "The form is **Active** for **liberty-mutual-agent-portal**. All five fields are required.",
          "Topic choices are **Agency growth**, **Product guidance** and **Portal support**. **Site** availability shows 1 out of 1.",
          "**Push changes** is available for reviewed active-form updates. Leave it untouched and return to preview without changing the form.",
        ],
        links: [{ label: "Open the native form", href: FORMS }],
      },
      login("daniel"),
      {
        title: "Complete the agent-facing form",
        action: [
          "Open **Support** > **Contact your team**.",
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
        title: "Match the actual receipt",
        action: [
          "Open the current receiver inbox with the person who has access. Select the POST containing your unique marker.",
          "Inspect **Request Content** or **Raw Content** and compare all five entered values with the form.",
        ],
        expected: [
          "The matching JSON and **Contact your team** metadata establish receipt of this specific request.",
          "The collector’s submission endpoint and receipt inbox are different URLs. A success message alone is not the same evidence as finding the matching receipt.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Reload the form to clear the confirmation, then sign out. Keep earlier receipts unchanged; any optional repeat uses a new marker.",
        "No reviewer reset is needed, and a pack reset cannot delete webhook receipts.",
        "**Native Forms** owns the form design and webhook delivery. A governed backend is needed to persist business records, create **Salesforce** activity, send email or implement a production database.",
      ],
    },
    related: ["campaign-and-conversation", "marketing-capability-boundaries"],
    sourceSlides: [89, 90],
  },
  {
    slug: "resource-content-workflow",
    audience: "marketing",
    category: "Content authoring",
    title: "Author, classify, publish and restore a resource",
    summary:
      "Follow one shared Texas article from a new **Draft** through managed metadata, approval, publication, **Search** refresh and exact restoration.",
    outcome:
      "The article and **Search** result show the same approved wording, then both return to the recorded starting content.",
    duration: "25–35 minutes, including publish and index time",
    personas: ["daniel.01", "Authorized Sitecore author"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      authorPrerequisite,
      "This is a shared-item exercise: one authorized **Sitecore** author edits while others observe. **Resource metadata** access is currently limited to organization administrators/owners; separate customer author and approver permissions still require verification.",
      "Reserve enough time to complete publication, **Search** refresh and restoration. Do not leave the temporary summary published.",
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
          "Open **Learning & resources**, search **Workers compensation** and open **Workers compensation: a Texas starting point**.",
          "Record the exact summary, source and body before editing. The expected starting summary is A source-linked overview for discussions with Texas employers.",
          "Keep this live portal tab for publication checks.",
        ],
        expected: [
          "The recorded live content is the restoration baseline. Preserve intentional changes made by the content owner instead of blindly replacing them with historical wording.",
        ],
      },
      {
        title: "Create one named English Draft",
        action: [
          "In **Page Builder**, select **Home** > **Learning & resources** > **Workers compensation: a Texas starting point**. In **Layers**, select **ResourceArticle**.",
          "Record the selected **English** version number. Open the version selector above the canvas > **Create version**, enter an optional unique name and click **Create**.",
          "Keep the new **English** **Draft** selected. Open **Apps** > **Resource metadata**.",
        ],
        expected: [
          "The active **ResourcePage** itself stores the article and **Search** metadata. **Data/Resources** copies are not the active datasource.",
          "A new **Draft** preserves earlier versions. The panel identifies the selected page, **English** language and version. **Approved** versions are read-only.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Understand the managed choices",
        action: [
          "Record all five loaded values. The baseline is **Risk state**: Texas; **Business family**: **Small commercial**; **Product**: **Workers’ compensation**; **Distribution channel**: **Independent agent**; **Resource type**: **State guidance**.",
          "Read the help under each dropdown.",
        ],
        expected: [
          "Each field currently permits one selection. The labels store TX, small-commercial, workers-compensation, independent-agent and **State guidance**.",
          "The custom **Marketplace** panel supplies managed choices while preserving native **Search**’s text-field contract. Classification never grants agent licensing or transaction access.",
        ],
      },
      {
        title: "Try an unsaved change and discard it",
        action: [
          "Select **Resource type** > **Preparation guide**.",
          "Observe the unsaved-change count, then click **Discard changes**.",
        ],
        expected: [
          "**1 unsaved change** appears and **Save metadata** becomes available; the canvas retains the saved classification.",
          "Discard returns the dropdown to the loaded value and shows **No unsaved changes**. No save occurred.",
        ],
      },
      {
        title: "Save metadata, read it back, then restore it",
        action: [
          "Select **Preparation guide** again and click **Save metadata**. Click **Refresh** in the panel.",
          "Restore the original **Resource type** recorded earlier. Click **Save metadata**, then **Refresh**.",
          "Select **Learning & resources**, then return to the Texas article and the same **English** **Draft**. Verify all five original values.",
        ],
        expected: [
          "**Metadata saved** and **No unsaved changes** appear. The **Draft** canvas shows **PREPARATION GUIDE TX**, and **Refresh** retains the saved choice.",
          "Restoration returns the original classification. The landing page offers no metadata form; returning to the resource reloads its saved values.",
          "No new version is required for every save: the panel edits the current editable **Draft**. Do not publish the temporary classification or reindex it.",
        ],
      },
      {
        title: "Edit and preview the temporary summary",
        action: [
          "Close the metadata app. Open **Content mode** > **Summary**.",
          "Enter: Prepare your next Texas employer conversation using this source-linked overview.",
          "Click outside **Summary** and wait for the **Saved** checkmark. Return to **Editor** view for the same **Draft** with **Default** editing host.",
        ],
        expected: [
          "**Content mode** autosaves on blur; there is no Save button. The canvas shows the temporary summary with the original source and body.",
        ],
      },
      {
        title: "Approve and publish only this page",
        action: [
          "Choose **Actions** > **Approve**. Add a comment if needed and click **Submit**. Confirm **Approved**.",
          "Open **Publish**. Uncheck **Include related items** first, then **All references**. Keep **Page** and **Current language (English)** checked; leave **Subpages** off.",
          "Click **Start publish** and wait for completion.",
        ],
        expected: [
          "This tenant moves directly from **Draft** to **Approved**; there is no separate **Submitted** workflow state.",
          "The exact **English** page publishes without a Git release. The image datasource is unchanged, so this exercise does not include references.",
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
          "The live article first proves publication. **Search** may still show earlier wording until its separate refresh succeeds.",
          "After completed indexing, both card and article show the exact temporary summary. **Pending** is not a successful **Search** update.",
        ],
        links: [sitecoreWorkspace],
      },
      {
        title: "Restore through a new version and publication",
        action: [
          "Create another named **English** **Draft** of the same Texas page. Restore the exact summary recorded at the start.",
          "Click outside the field, wait for **Saved** and inspect the restored **Draft**.",
          "**Actions** > **Approve** > **Submit**. Confirm **Approved**. **Publish** with **Include related items** off first, then **All references** off; **Page** and **Current language (English)** on, **Subpages** off.",
          "Confirm publication, then run **Reindex Content** once on the same **Liberty Mutual Agent Resources** source and wait for success.",
        ],
        expected: [
          "Earlier versions remain available. Restoration follows the same real delivery path as the temporary change.",
        ],
      },
      {
        title: "Check the complete restoration",
        action: [
          "Reload Daniel’s live article and repeat the **Search**. Compare the starting summary, source and body in both the article and result card.",
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
      "Start from the **Resource page** branch, fill blank fields, select a reusable image and inspect its accessible description.",
    outcome:
      "Your unpublished practice page has its own image datasource and can be removed without changing existing articles or shared assets.",
    duration: "15 minutes",
    personas: ["Your Sitecore author account"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "Use a unique practice-page name and keep the page unpublished. Access to the metadata panel requires an authorized administrator/owner.",
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
          "In **Page Builder**, select **Liberty Mutual Agent Portal**. At **Learning & resources**, click … > **Create a subpage**.",
          "Choose **Resource page** > **Select**. Enter a unique lowercase, hyphen-separated name such as resource-practice-jd-20260918-1430, replacing the initials and date/time with your own. Press Enter.",
          "Click **Reload tree** and select your new page.",
        ],
        expected: [
          "**Page created from branch template** appears. The title starts with your name; summary, body, reviewed date, source and metadata start empty.",
          "The branch creates the intended layout and a local **Data**/**Resource image** item. Existing articles are unchanged.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Add practice content and a Media image",
        action: [
          "In **Content mode**, enter a practice title and summary. Click outside each field and wait for **Saved**.",
          "Return to **Editor**. Click the blank image area between summary and body > **Browse media library** > **Media BETA**.",
          "Select **liberty-mutual-businessowner-preparing-submission.jpg**. Inspect **Details** > **Alt text** and **Delivery** > **Public link**.",
          "Under **Image transformation**, set **Width** to 640 with aspect ratio locked, then click **Insert**.",
        ],
        expected: [
          "The canvas shows your practice content. The selected photograph has descriptive alt text and an active public link.",
          "The image saves to this page’s **Data**/**Resource image**. The 640-pixel rendition preserves the source aspect ratio without enlarging the 669-pixel original.",
        ],
      },
      {
        title: "Inspect metadata without changing classification",
        action: [
          "Open **Apps** > **Resource metadata** on the new resource.",
          "Inspect the five managed choices. Try one selection, then click **Discard changes**.",
        ],
        expected: [
          "The loaded values return. Each field currently accepts one choice and this page remains unpublished.",
          "The image datasource does not duplicate **Search** metadata; that classification remains on the **ResourcePage** itself.",
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
          "New image uploads can receive AI tags and alt-text suggestions. These are existing human-reviewed values, not new AI output from this exercise. Asset tags do not automatically populate **ResourcePage** taxonomy.",
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
          "Changing this local image field does not replace other pages’ images. The shared **Media** asset remains reusable.",
        ],
      },
      {
        title: "Remove only your unpublished practice page",
        action: [
          "Select your practice page in **Content**. Choose **More options (…)** > **Delete**.",
          "In **Delete item**, confirm the exact practice name, then click **Delete**. Reload the tree if needed.",
          "Return to **Learning & resources**. Leave the **Resource page** branch and both **Media** assets intact.",
        ],
        expected: [
          "Your page, versions and descendants move to the **Recycle Bin**. No live unpublish, **Search** refresh or workspace reset is needed for an unpublished exercise.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Delete only the uniquely named unpublished page created by this exercise. Never delete its reusable **Media** asset or the **Resource page** branch.",
        "If the practice article was published, work with the **Sitecore** author responsible for it to remove it from live delivery and refresh its **Search** source before considering cleanup complete.",
        "For a real article with an image change, publication must include the page and **Resource image**: keep **Page**, **English** and **All references** on; clear **Include related items**, leave **Subpages** off and inspect **View references** before publishing. Public reference images do not demonstrate private policy-document storage.",
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
      "Duplicate a component with its own content, reorder it and inspect the allowed choices for main and sidebar regions.",
    outcome:
      "You see how native authoring controls provide flexibility within the page’s approved structure.",
    duration: "10 minutes",
    personas: ["Sitecore author"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "Use the shared unpublished **Campaign practice** page with one **Sitecore** author making changes at a time. Record the starting component order and local **Data** items before changing anything.",
    ],
    links: [pageBuilder],
    steps: [
      {
        title: "Find the isolated practice component",
        action: [
          "Open **Page Builder** > **Home** > **Agency growth** > **Campaign practice**.",
          "In **Layers**, select the first **CampaignAccordion**. Record its position and datasource.",
        ],
        expected: [
          "The unpublished page has independent local content and the component toolbar is available. The live campaign uses different content.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Duplicate and reorder the component",
        action: [
          "In the floating toolbar, click **Duplicate component**. Record the new copy and its datasource.",
          "Select **Move up**. Open **Swap with another component**, inspect the choices and cancel without swapping.",
        ],
        expected: [
          "The copy has independent local content, such as **Start the conversation_var2**; later runs can use another suffix.",
          "The main region offers **CampaignAccordion**, **CampaignAlert** and **CampaignCallout**. The component remains in an approved location.",
        ],
      },
      {
        title: "Compare the sidebar’s allowed components",
        action: [
          "Select **CampaignLinkList** > **Swap with another component**.",
          "Inspect the options, then cancel.",
        ],
        expected: [
          "The sidebar offers **CampaignContact** and **CampaignLinkList**, distinct from the main region’s options.",
          "**Page Builder** supports drag-and-drop; these native toolbar actions provide a reproducible way to inspect and change the composition.",
        ],
      },
      {
        title: "Restore the original practice layout",
        action: [
          "Have the same **Sitecore** author remove the newly added component and restore the recorded original order and layout.",
          "After confirming it is no longer used, recycle only the duplicate’s newly created local datasource.",
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
        "The **Campaign page** branch can create a new campaign with blank local content; this shared-page exercise is not an instruction to publish or replace the live campaign. A pack reset cannot restore component layout.",
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
      "Fix a deliberate spelling error, review a prompted rewrite, and restore the original rich text after testing both actions.",
    outcome:
      "You can accept, reject and verify AI-assisted edits while retaining editorial control.",
    duration: "10 minutes",
    personas: ["Sitecore author"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "Use the unpublished **Campaign practice** item only. One editor records and restores the exact original **Body**, including formatting.",
    ],
    links: [pageBuilder],
    steps: [
      {
        title: "Record the correct rich-text field",
        action: [
          "Open **Page Builder** > **Content** > **Home** > **Agency growth** > **Campaign practice** > **Data** > **Growth opportunity**.",
          "Record the complete original **Body** before entering a temporary sentence with a spelling error.",
        ],
        expected: [
          "**Body** is a rich-text field on this practice datasource, not the campaign hero **Summary**. The live campaign is separate.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Review and keep a grammar correction",
        action: [
          "Select **Optimize with AI** > **Fix spelling and grammar**.",
          "Compare the original and proposed text. Click **Keep optimized**.",
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
          "Inspect the new wording and the available assigned **Brand Kit** option.",
          "Select **Revert to original** for this current AI rewrite.",
        ],
        expected: [
          "The AI proposes readable copy. **Revert to original** rejects the current proposed rewrite; it is not a restoration of every earlier edit in this exercise.",
        ],
      },
      {
        title: "Restore the true starting content",
        action: [
          "Restore the exact **Body** recorded before the first temporary edit.",
          "Click outside the field, wait for the saved checkmark and reload. Compare wording and formatting.",
        ],
        expected: [
          "The practice item matches the starting content. Autosave protects server-saved changes; it does not guarantee recovery of offline or unsaved keystrokes.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Keep the page unpublished and verify exact restoration after reload. Named versions provide a recovery point before substantial real edits; a pack reset does not undo CMS changes.",
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
    title: "Apply and reverse a scoped bulk text change",
    summary:
      "Use native **Search and replace** on reviewed local practice content, then verify the inverse replacement restores all affected fields.",
    outcome:
      "Four known practice fields change together and return to their original wording, with live content outside the scope.",
    duration: "10 minutes",
    personas: ["Sitecore content author"],
    prerequisites: [
      platformPrerequisite,
      "Use one **Sitecore** author for this shared-folder exercise. Record the exact starting text in all affected fields and confirm no other author is changing this practice folder.",
      "Scope the operation to the full **Campaign practice**/**Data** path shown below. Do not run **Search and replace** across the site.",
    ],
    links: [
      {
        label: "Open Content Editor",
        href: `https://xmc-scaipocusem400b-sitecoreai950c-demo4418.sitecorecloud.io/sitecore/shell/Applications/Content%20Editor.aspx?sc_bw=1&organization=${ORG}`,
      },
    ],
    steps: [
      {
        title: "Open the exact practice search scope",
        action: [
          "In **Content Editor**’s left search, paste the path below. Select **Direct Hit** > **Data**, then the magnifier beside **Content**.",
          "Enter * and press Enter. Review the entire result set before proceeding.",
        ],
        code: "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home/growth/campaign-practice/Data",
        expected: [
          "The baseline has eight results: the **Data** folder and seven local items. The live campaign is outside this scope. If the set differs, compare the items with the **Sitecore** author responsible for the practice page before replacing text.",
        ],
      },
      {
        title: "Apply a reviewed replacement",
        action: [
          "Record the original text in **Growth opportunity** **Body**, **Preparation update** **Body**, **Prepare for review** **Answer** and **Your next step** **Title**.",
          "Open **More search options** > **Search operations** > **Search and replace**.",
          "Enter relationship team|relationship colleagues. Select **OK**, then **OK** again when completed.",
        ],
        expected: [
          "The case-sensitive operation changes the four known practice fields. The pipe separates the original phrase from its replacement.",
        ],
      },
      {
        title: "Restore and inspect every affected field",
        action: [
          "Select **Search [1]**. Open **Search and replace** again and enter relationship colleagues|relationship team.",
          "Confirm completion, then inspect all four fields against your recorded starting values.",
        ],
        expected: [
          "The original wording returns in all four fields. A shared datasource is a separate reuse technique; bulk replacement changes multiple independent items.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Verify every affected field and leave **Campaign practice** unpublished. A reviewer reset cannot reverse content changes.",
        "For broader structured field updates, evaluate a scoped API workflow or a **Marketplace** export/import tool with versions, raw field formats and restoration validated first. Native text replacement is not a universal bulk field editor.",
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
      "Inspect rich-text alert dates, then distinguish a display window from actual content publication and expiration.",
    outcome:
      "You can explain which settings hide an alert and which publishing actions change **Live Experience Edge** delivery.",
    duration:
      "10 minutes to inspect; allow the agreed UTC window for a timed release",
    personas: ["Sitecore author", "Developer with publication API access"],
    prerequisites: [
      platformPrerequisite,
      authorPrerequisite,
      "Inspect the unpublished **Campaign practice** page. A full timed publication run requires a developer with protected publication API access and an agreed UTC window.",
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
          "Open **Campaign practice** > **Data** > **Preparation update** in **Page Builder** **Content**.",
          "Inspect **Title**, **Body**, **Visible from (UTC)** and **Visible until (UTC)**. Record original values before any practice edit.",
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
          "With **Default** editing host, inspect the **CampaignAlert** in **Editor**, including an inactive window if the **Sitecore** author has prepared one.",
          "Restore any body or date values changed during practice and verify them after reload.",
        ],
        expected: [
          "Authors can still find and edit an alert whose live visibility window is inactive. These fields control presentation; they do not themselves publish or delete content.",
        ],
      },
      {
        title: "Prepare an optional real publication-and-expiration run",
        action: [
          "Have the developer with publication API access follow the linked bounded scheduling guide, clean only its expired sample and prepare a new dedicated **campaign-schedule-check** page.",
          "Record **English** content, the exact subtree and the UTC start/end window. Verify that the page is initially absent from **Live Experience Edge**.",
        ],
        expected: [
          "The scheduling example uses a dedicated page and matching native availability dates on its local content. It does not change the live small-business campaign.",
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
          "Have that developer start the bounded scheduler. At the start, inspect the scoped publish operation and wait for live propagation.",
          "Open the production route supplied by that developer and confirm the page appears.",
          "At the end, inspect the second scoped publish operation applying expiration, then confirm the page is absent from **Live Experience Edge** and unavailable on the production route.",
        ],
        expected: [
          "The observable sequence is absent, present, absent in published delivery. A preview-context route may still show unpublished or expired content.",
          "The bounded script exits after the two operations; no recurring job remains. This example uses external automation. A future implementation needs a managed scheduler, monitoring and recovery ownership.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Restore any edited practice alert body and dates; keep **Campaign practice** unpublished.",
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
      "Match a portal login to its current native profile before interpreting affinities, page views or experiment activity.",
    outcome:
      "You inspect the correct person, pack and current profile set rather than an old seed or browser alias.",
    duration: "5 minutes",
    personas: ["daniel.01", "maya.01", "elena.01", "Sitecore profile reviewer"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Choose one portal host and complete any planned reviewer reset before portal sign-in. Keep that host throughout profile lookup and browsing.",
    ],
    links: [liveLogin, profileLink, liveReset, previewReset],
    steps: [
      {
        title: "Get the current identity for the intended login",
        action: [
          "Open **Reset a reviewer number** on the same host as the portal you will use. Sign in to the workshop guide if needed, then select the intended pack under **Reviewer number**; the page starts with your assigned pack.",
          "Under **current profile identities**, find the intended username and copy its **Agent identity** value. Expand **Reset details** below the identities and record **Profile generation** with the starting state.",
          "Copy the displayed **Agent identity** values for Maya or Elena if needed. You can inspect all seven personas without switching portal logins. Do not reset merely to look up identities or rely on the historical seed map after a reviewer reset.",
        ],
        expected: [
          "**Agent identity** is the active Liberty Mutual agent identifier for that username, pack and host, not a profile UUID. A completed reviewer reset changes these identifiers to the new profiles while retaining earlier native history.",
        ],
        links: [liveReset, previewReset],
      },
      {
        title: "Search by the native agent identifier",
        action: [
          "In **SitecoreAI**, open **Performance** > **Profiles**.",
          "Open **Search filter** > **Liberty Mutual agent identity**. Paste the copied **Agent identity** value into **Search by Liberty Mutual agent identity** and press Enter.",
          "Wait for the matching person, then click their name.",
        ],
        expected: [
          "The canonical profile matches the intended person and current identity. A name alone is insufficient when older profile sets exist.",
        ],
        links: [profileLink],
      },
      {
        title: "Record a baseline before browsing tagged pages",
        action: [
          "Open **Overview** > **Top affinities**. Record existing topic scores.",
          "Open **Engagement** and inspect the relevant session and page views.",
        ],
        expected: [
          "Earlier walkthroughs may already have added history. A clean login does not establish a no-affinity baseline.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close the **Reset a reviewer number** tab when the identity lookup is complete. Keep only the profile and portal tabs needed for the next exercise.",
        "Do not edit or delete profile data. For a fresh comparison, open **Reset a reviewer number** on the intended host, select the pack under **Reviewer number** and click **Reset reviewer** for that number. Wait for **Reviewer [selected number] is ready**, then sign into the portal again and use the newly displayed **Agent identity** values. This also restores baseline saved work for all seven personas in the selected pack.",
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
      "Use the live portal. Open production **Reset a reviewer number**, choose your pack under **Reviewer number** and copy Avery’s and Daniel’s **Agent identity** values from the **current profile identities**. Keep the saved custom value and rules unchanged.",
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
          "In **Page Builder**, open **Home** > **Agency growth** > **Small-business growth**.",
          "Select **CampaignCallout** in **Layers** and click **Edit personalization rules**.",
        ],
        expected: [
          "The panel shows **Personalized**. The rule uses **Liberty Mutual - Small business growth opportunity**. This callout is separate from the role-guidance, **Products**-affinity and **Resources** A/B components.",
        ],
        links: [pageBuilder],
      },
      {
        title: "Understand the business calculation",
        action: [
          "Open the saved custom value and inspect its JavaScript without changing it.",
          "Read the ratio as small-commercial premium divided by personal plus small-commercial premium. **Growth opportunity** requires a share below 20%.",
        ],
        expected: [
          "The calculation requires an identified principal or producer. Missing, invalid or zero-total data returns neutral guidance.",
          "The imported production metrics are fictional **UDL** inputs. A **Salesforce** or **Snowflake** connection would require governed identifiers, mappings, freshness and source access.",
        ],
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
          "Use the custom value’s native test with Avery’s current profile, then Daniel’s current profile from the same pack.",
          "Compare the results with their agency metrics. Leave the code and rules unchanged.",
        ],
        expected: [
          "**Cedar Ridge**’s 14.46% share matches the criterion. **Prairie Oak**’s 36.86% share gives Daniel neutral guidance.",
        ],
      },
      login("avery"),
      {
        title: "Compare actual signed-in delivery",
        action: [
          "Open **Agency growth** > **Small business growth** and read the campaign callout.",
          "**Sign out**, sign in as **daniel.01** with password **Sitecore**, then open the same page.",
        ],
        expected: [
          "Avery sees **Build on your personal-lines relationships**.",
          "Daniel sees **Turn local knowledge into a stronger submission**. The difference changes guidance, not transaction authority.",
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
      "Build two different native affinities through real content visits and connect the scores to the **Products** spotlight.",
    outcome:
      "Daniel’s workers-compensation interest and Maya’s **household** interest select distinct authored guidance while an independently checked Elena profile provides a neutral comparison.",
    duration: "15–20 minutes",
    personas: ["daniel.01", "maya.01", "elena.01", "Sitecore profile reviewer"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Use the live production portal throughout. Obtain current production identifiers for Daniel, Maya and Elena using **Find the active SitecoreAI profile for an agent**.",
      "Inspect starting scores before tagged browsing. For a clean replay, open **Reset a reviewer number** on production, select your pack under **Reviewer number** and click **Reset reviewer {{pack}}**. Wait for **Reviewer {{pack}} is ready** before signing into the live portal again. The reset restores saved-work baseline and creates seven fresh profiles with clean browsing history. Signing out alone preserves the current profile and its affinities.",
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
          "Open **Performance** > **Settings** > **Affinities** and select **Liberty Mutual Agent Portal**.",
          "Inspect the **insurance_interest** assignments without changing them.",
          "Open the current Daniel, Maya and Elena profiles and record existing scores before any tagged visits.",
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
          "Open **Products & appetite** > **Risk state**: Illinois.",
          "Record the actual headline and compare it with Daniel’s starting **Top affinities**.",
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
          "The real Illinois and Texas articles load in the same identified session. Browser Back may return to an unfiltered library, so repeat the suggestion.",
          "The page events use CMS names **illinois-workers-compensation** and **texas-workers-compensation**, matching their native affinity assignments.",
        ],
      },
      {
        title: "Connect Daniel’s score to the rendered spotlight",
        action: [
          "On Daniel’s current native profile, open **Overview** > **Top affinities** and **Engagement**. Inspect the two visits and **workers_compensation** interest.",
          "Return to **Products & appetite** with Illinois selected. Read the headline and click **Review account preparation**.",
          "Confirm Illinois remains in the destination context, then sign out.",
        ],
        expected: [
          "An accepted fresh run showed 2 views and score 1.00. This is recorded evidence, not a guaranteed timing, threshold or count for a profile with existing history.",
          "For the corresponding top interest, the spotlight says **Build a stronger workers compensation conversation**. Its action opens BOP preparation retaining Illinois.",
        ],
      },
      login("maya"),
      {
        title: "Build Maya’s distinct household interest",
        action: [
          "Open **Products & appetite** > **Risk state**: Texas and record the starting headline.",
          "Select **Personal lines** > **Homeowners** > **Explore coverage**. On **Personal insurance**, click **Explore the preparation guide**.",
          "Return to **Products** with Texas retained. In Maya’s current profile, inspect **Overview** > **Top affinities** and **Engagement** before the final checklist revisit.",
        ],
        expected: [
          "The **household**-renewal resource opens with state=TX.",
          "The accepted fresh journey recorded 2 views and score 1.00 for **household**; current counts can differ. The corresponding spotlight says **Make the next household renewal conversation count**.",
        ],
      },
      {
        title: "Check the household action and switch identities",
        action: [
          "Click **Review the household renewal checklist** and verify Texas in the destination context.",
          "**Sign out**, then sign in as **elena.01** with password **Sitecore**. Open **Products & appetite** > **Risk state**: Illinois.",
          "Compare Elena’s headline with her independently checked native scores.",
        ],
        expected: [
          "The checklist opens the **household**-renewal resource with state=TX and can add another tagged visit.",
          "A no-affinity Elena profile shows **Protection built around the business you know**. Daniel’s or Maya’s topic must not carry into Elena’s separate identity.",
        ],
      },
      {
        title: "Inspect the authored mapping behind the result",
        action: [
          "In **Page Builder**, select **Products & appetite**. After the canvas loads, open **Layers** > **ProductSpotlight** > **Edit personalization rules**.",
          "Inspect **Liberty Mutual - Product interest spotlight** and the **Top Affinity** equality rows for **workers_compensation** and **household**.",
          "Click **Cancel** and record the ending profiles, scores and actual headlines.",
        ],
        expected: [
          "The **Live** rules map each native interest to authored content in **headless-products-spotlight**.",
          "**Top Affinity** considers profile groups; the current site uses **insurance_interest**. Equal scores have no promised business-priority order. Interest changes editorial relevance, not licensing or transaction permission.",
        ],
        links: [pageBuilder],
      },
    ],
    cleanup: {
      body: [
        signOut,
        "Preserve the authored rules. To replay a fresh journey, open **Reset a reviewer number** on production, select your pack under **Reviewer number** and click **Reset reviewer {{pack}}**. Wait for **Reviewer {{pack}} is ready**, then sign into the live portal again and look up its new **Agent identity** values. The reset restores baseline saved work and activates seven new native profiles with clean browsing history. All seven same-suffix personas change together on production only. Previous native profiles and experiment history remain; CMS content, **Search**, **Agentic** artifacts and webhook receipts are unaffected.",
        "Affinity here selects authored variants from browsing signals; it does not demonstrate autonomous machine-learning recommendations or business eligibility.",
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
      "Preview two authored button labels, follow Daniel’s actual delivered experience and distinguish page events from credited experiment goals.",
    outcome:
      "You understand the configured comparison and can inspect real native reporting without claiming a winner from a small sample.",
    duration: "12 minutes",
    personas: ["daniel.01", "Sitecore experiment reviewer"],
    prerequisites: [
      packPrerequisite,
      platformPrerequisite,
      "Use production. Open **Reset a reviewer number**, choose your pack under **Reviewer number** and copy Daniel’s current **Agent identity**; viewing identities does not require a reset. Inspect the existing test without starting, stopping or selecting a winner.",
    ],
    links: [pageBuilder, liveLogin, profileLink, liveReset],
    steps: [
      {
        title: "Preview the current authored variations",
        action: [
          "In **Page Builder**, select **Home** > **Learning & resources** > **Layers**. Click the test icon beside **AgentGuidance**.",
          "Open **Liberty Mutual Small Business Guide CTA**. **Preview** A, then B.",
          "Compare the heading, body, button destination and applied configuration. Return the editor selection to **A**.",
        ],
        expected: [
          "**A** says **Start with small business**. **B** says **Build your small-business practice**. Only the button label differs.",
          "Eligible traffic is split 50/50 with 100% participation. The goal is a visit to the small-business guide.",
          "**Editor** preview proves authored variations, not live allocation or conversion. This **Resources** page is kept separate from personalized pages because **SitecoreAI** does not allow an A/B/n test on a page with personalization configured.",
        ],
        links: [pageBuilder],
      },
      login("daniel"),
      {
        title: "Follow the actual delivered treatment",
        action: [
          "Open **Learning & resources**. Below the search results, find **Useful guidance, easier to find**.",
          "Record the visible action label, then click it.",
          "Return once to **Learning & resources** and record the action label again. Record the visit time, then sign out.",
        ],
        expected: [
          "The action opens /resources/expand-small-business-practice.",
          "**A** may be the test control or the general fallback when no test decision is available. A label alone cannot establish native assignment. A guide visit alone does not prove an attributed goal.",
        ],
      },
      {
        title: "Find the corresponding native page events",
        action: [
          "Open **Performance** > **Profiles**. Select **Search filter** > **Liberty Mutual agent identity**, enter Daniel’s current identifier and open **Daniel Ortiz**.",
          "Open **Engagement** and the relevant session. Inspect **Resources**, **growth-guide** and return events against the recorded time.",
        ],
        expected: [
          "Timestamps and page variants show the recorded pages for that session. The same destination could also be reached from another link, so a page visit does not prove that a specific CTA was visible.",
        ],
        links: [profileLink],
      },
      {
        title: "Read attributed results without declaring a winner",
        action: [
          "Open **Performance** > **Component A/B/n tests**. Select **Site**: **liberty-mutual-agent-portal** and **Test**: **Liberty Mutual Small Business Guide CTA**.",
          "Record current visits, goals, goal rates, confidence and test status for each treatment.",
          "Close the report without changing the experiment.",
        ],
        expected: [
          "Native aggregate reporting separates credited experiment goals from raw profile events.",
          "Historical September 15 rehearsal results were **A**: 8 visits and 2 goals (25%); **B**: 4 visits and no goals, with 89.75% confidence and **Test in progress**. Read the current report rather than treating those counts as fixed.",
          "The small sample does not establish a winner or business lift. The goal measures reaching the guide, not a policy sale.",
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
        "**Sign out** and preserve the running test, authored variations and history. Do not manufacture traffic or reset the experiment to improve its report.",
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
      "Agentic Studio: inspect connected work, brand context and artifacts",
    summary:
      "Use the saved Watkins example to understand reusable instructions, research tools, brand retrieval and human refinement.",
    outcome:
      "You can follow how **Agentic Studio** organizes work and creates reviewable outputs without mistaking the example for autonomous approval or sent outreach.",
    duration: "15 minutes",
    personas: ["Your Sitecore marketing account"],
    prerequisites: [
      platformPrerequisite,
      "This is read-only inspection of a saved workspace. Leave **Run workflow**, all instructions, **Brand Kit** content and existing artifacts unchanged.",
    ],
    links: [
      { label: "Open the saved Agentic Studio workspace", href: STUDIO },
      sitecoreWorkspace,
    ],
    steps: [
      {
        title: "Inspect the connected workflow",
        action: [
          "Open the saved **Liberty Mutual | Watkins Insurance Group outreach** space. If the direct link does not open the intended tenant, return to **SitecoreAI** > **Agentic** > **Recent** or **Spaces**, then select **Liberty Mutual | Watkins Insurance Group outreach**.",
          "Select **Chat**, then **Agents**. Inspect **Connected workflow**: **Account Enrichment**, **Brief Generation** and **Content Generation**.",
        ],
        expected: [
          "Three connected stages organize research, a brief and content tasks alongside saved run history and artifacts.",
          "The built-in agent definitions were not modified for this example.",
        ],
        links: [{ label: "Open the saved workspace", href: STUDIO }],
      },
      {
        title: "Read reusable and per-run instructions",
        action: [
          "Click **Instructions**. Read **Space Context**: **Objective**, **Constraints** and **Brand Guidance**.",
          "Read **Agent Context** below **Space Context**, then return to **Agents** without editing.",
        ],
        expected: [
          "**Space Context** retains shared requirements, source rules, brand guidance and output format. **Agent Context** supplies additional instructions for the next execution.",
          "The initial workflow produced research and a brief. Later refinement and human editorial work contributed to final artifacts; a complete rerun after every instruction update is not claimed.",
        ],
      },
      {
        title: "Inspect the run’s research and tool context",
        action: [
          "In **Chat**, below the workflow outputs, find the prompt beginning **Create the final, readable Watkins**. Expand **Prompt details** if needed.",
          "Inspect its **Context** and **Tools**, then the **Web Search** results below that saved prompt.",
        ],
        expected: [
          "**Context** includes the attached **Brand Kit**. **Tools** includes retrieval, artifacts, web search and **Sitecore** capabilities.",
          "Linked public sources make research inspectable. Check dates and source facts before using generated claims; later refinement corrected an older ownership description.",
        ],
      },
      {
        title: "Verify actual Brand Kit retrieval",
        action: [
          "Expand **Get Brand Kit** in the saved conversation.",
          "Expand **Get Brand Kit Section**. Check **Input** for sectionName: **Visual Guidelines** and read **Output**. Inspect the retrieved **Tone of Voice** and **Brand Context** sections where shown.",
        ],
        expected: [
          "**Get Brand Kit** returns **Liberty Mutual — Independent Agents**. The section output includes authored palette, typography and logo guidance.",
          "Completed tool results demonstrate retrieval; merely attaching a kit would not prove it was used. Public-source brand guidance is separate from customer corporate-brand approval.",
        ],
      },
      {
        title: "Open the saved research and HTML artifacts",
        action: [
          "Select **Artifacts** > **Watkins | Account research and campaign brief**. Open its card with the expand arrows.",
          "In the dialog’s left list, choose **Watkins | Principal email preview | Patrick Watkins** and click **Preview**.",
          "Choose **Watkins | Advisor email preview | Clint Bradford**, then **Watkins | Client service email preview**. Compare **Preview** and inspect **Content**, **JSON** or **HTML** as useful.",
        ],
        expected: [
          "The research artifact separates source facts, the brief and proposed direction.",
          "Readable HTML previews show distinct role-specific subjects, content and actions from shared context. Marketers can review presentation while developers inspect output structure.",
        ],
      },
      {
        title: "Find the human review behind the final output",
        action: [
          "Close the dialog and read the later refinement prompts.",
          "Select **Artifacts** > **Watkins outreach | Evidence and editorial review** and expand its card.",
        ],
        expected: [
          "The saved history records corrections, editorial decisions and refined output. Evidence stays separate from recipient-facing content.",
          "This walkthrough does not demonstrate a native approval gate, autonomous approval or outbound delivery. No emails were sent, no audience activated and no portal profile changed.",
        ],
      },
    ],
    cleanup: {
      body: [
        "Close the artifact viewer and retain the saved work. Read-only inspection requires no generation, sending, publication or reset.",
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
      "Separate working sandbox capabilities from optional integrations, additional validation and future implementation decisions.",
    outcome:
      "Your review notes state what was actually observed and identify the next question where a requirement extends beyond it.",
    duration: "5 minutes",
    personas: ["Marketing reviewers", "Architects and developers"],
    prerequisites: [
      "Use this reference alongside the related walkthroughs. It does not require changes to any shared configuration.",
    ],
    steps: [
      {
        title: "Distinguish personalization methods",
        action: [
          "Compare known-attribute guidance, a calculated **UDL** targeting value, browsing affinity and A/B testing using their separate walkthroughs.",
        ],
        expected: [
          "These show authored rules and variants, native interest signals and measured experiments. Autonomous machine-learning recommendations or audience discovery are separate scope requiring confirmation of product capabilities, entitlement and suitable data.",
        ],
      },
      {
        title: "State the authoring and recovery boundaries",
        action: [
          "Wait for **Saved** after content edits. Create a named version before substantial work.",
          "For bulk maintenance, inspect the native **Search and replace** example and identify whether the actual requirement concerns text or broader field data.",
        ],
        expected: [
          "Autosave retains server-saved changes; it is not a guarantee of recovering offline or unsaved keystrokes.",
          "For wider field updates, a scoped API workflow or **Marketplace** **Content Export/Import Tool** is a possibility. Raw field formats, versions, workflow and restoration need validation.",
        ],
      },
      {
        title: "Identify integration and governance work explicitly",
        action: [
          "Compare **Native Contact your team** with the campaign’s custom saved request. Identify where a business backend would receive the data.",
          "Record the customer roles and accessibility acceptance needed beyond the exercises performed with administrator access.",
        ],
        expected: [
          "**Native Forms** delivers to a webhook; a real database or **Salesforce** workflow requires an implemented backend. The custom campaign request instead saves to **Upstash**.",
          "Controlled component placement and reviewed interactions are demonstrated. Separate customer author/approver permissions and full accessibility acceptance still require validation.",
        ],
      },
      {
        title: "Treat Marketplace extensions as evaluated options",
        action: [
          "Consider **Content Score** for accessibility review, **Workbox Pro** for workflow collaboration and **Content Export/Import Tool** for broader content maintenance when those use cases apply.",
        ],
        expected: [
          "These are possible **Marketplace** options, not installed or validated capabilities of this sandbox. They complement rather than replace access control, sound workflow design and accessibility acceptance.",
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
