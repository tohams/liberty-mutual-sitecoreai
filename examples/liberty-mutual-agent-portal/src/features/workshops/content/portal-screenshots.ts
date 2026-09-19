import type { GuideImage } from "../types";

type Rectangle = [x: number, y: number, width: number, height: number];
type Highlight = [bounds: Rectangle, label: string];

// Actual 1280 × 720 browser captures. Bounds below use source pixels so that
// a reviewer can compare each highlighted control directly with the capture.
function capture(
  file: string,
  title: string,
  caption: string,
  bounds: Rectangle,
  highlights: Highlight[],
): GuideImage {
  const [x, y, width, height] = bounds;
  return {
    file,
    title,
    alt: title,
    caption,
    crop: { x, y, width, height, sourceWidth: 1280, sourceHeight: 720 },
    annotations: highlights.map(([box, label]) => ({
      x: ((box[0] - x) / width) * 100,
      y: ((box[1] - y) / height) * 100,
      width: (box[2] / width) * 100,
      height: (box[3] / height) * 100,
      label,
    })),
  };
}

const homeGuidance = capture(
  "agency-growth-card.png",
  "My workspace: find the Agency Growth card",
  "Select **My workspace**, then scroll below **Your priorities**. This white card sits immediately above **Recent activity**. The heading and button can differ by persona; this capture shows Daniel’s starting guidance.",
  [264, 88, 697, 196],
  [
    [
      [298, 122, 395, 58],
      "Find the small **Agency Growth** label and read the larger heading beneath it.",
    ],
    [
      [766, 159, 160, 56],
      "Read the yellow action button. Daniel’s starting example is **Browse resources**.",
    ],
  ],
);

const learningGuidance = capture(
  "learning-guidance-card.png",
  "Learning & resources: find the A/B test button",
  "Scroll past the resource cards and page-number controls. Find **Useful guidance, easier to find**, immediately above **Your next learning opportunity**. This capture shows the **Build your small-business practice** variation; your assigned variation may show **Start with small business**.",
  [265, 281, 988, 173],
  [
    [
      [298, 317, 361, 61],
      "Use **Useful guidance, easier to find** to identify the correct card.",
    ],
    [
      [957, 339, 263, 58],
      "Compare the yellow button label, then follow the button displayed in your browser.",
    ],
  ],
);

const productSpotlight = capture(
  "product-spotlight-card.png",
  "Products & appetite: find the interest-based banner",
  "The illustrated banner sits directly below the page title and **Risk state**, above the **All solutions** filter. This is the starting example; browsing tagged resources can change its heading and action.",
  [265, 138, 988, 411],
  [
    [
      [1073, 145, 173, 47],
      "Check **Risk state** before comparing the experience. This reference uses **Illinois**.",
    ],
    [
      [306, 273, 530, 160],
      "Read the banner’s heading and supporting text. This is the **ProductSpotlight** component.",
    ],
  ],
);

const workshopNumber = capture(
  "reviewer-reset-controls.png",
  "Reset page: choose your workshop number",
  "Open [**Live portal reset**](https://liberty-mutual-agent-portal.vercel.app/workshops/reset) or [**Transaction preview reset**](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset), matching the website used in your exercise. This reference shows **Live portal** and the presenters’ **01**. Choose your assigned **Workshop number** before resetting.",
  [84, 356, 634, 231],
  [
    [
      [99, 366, 84, 41],
      "Read the website label: **Live portal** or **Preview portal**.",
    ],
    [
      [99, 456, 608, 56],
      "Open **Workshop number**, then choose your assigned number. **01** belongs to the presenters.",
    ],
  ],
);

const currentIdentity = capture(
  "current-profile-identity.png",
  "Current profile identities: copy the matching agent’s row",
  "Scroll to **Current profile identities** on the reset page. This example locates Daniel’s row. Use the row for your own workshop number and copy its current value; the value pictured here is only a reference and changes after a reset.",
  [75, 315, 1125, 89],
  [
    [
      [84, 335, 141, 49],
      "Match the **Portal username** to the person and number used in the portal.",
    ],
    [
      [1126, 334, 64, 34],
      "Select **Copy** on that same row to copy the **Agent identity**.",
    ],
  ],
);

const profileFilter = capture(
  "profile-search-filter.png",
  "Profiles: choose Liberty Mutual agent identity",
  "In **SitecoreAI**, open **Performance** → **Profiles**. Under **Most recent users**, open the search dropdown that initially shows **Client ID**, then choose **Liberty Mutual agent identity**.",
  [788, 355, 454, 246],
  [
    [[799, 407, 130, 48], "Open this dropdown beside the search box."],
    [
      [811, 484, 215, 36],
      "Choose **Liberty Mutual agent identity** before pasting the copied value.",
    ],
  ],
);

const profileOverview = capture(
  "native-profile-overview.png",
  "Native profile: Overview and Engagement",
  "After opening the matching search result, confirm the profile’s name. **Overview** contains **Additional data** and, farther down, **Top affinities**. **Engagement** contains sessions and events. Counts and dates vary as you browse.",
  [92, 100, 762, 605],
  [
    [
      [101, 138, 96, 45],
      "Keep **Overview** selected to inspect profile attributes and affinity scores.",
    ],
    [
      [201, 138, 107, 45],
      "Select **Engagement** when the step asks you to inspect browsing events.",
    ],
    [
      [127, 633, 173, 39],
      "Scroll within the page to read **Additional data**, including **agentId**, licensing attributes, and **reviewerPack**, the stored field for your workshop number.",
    ],
  ],
);

const profileResult = capture(
  "profile-search-result.png",
  "Profiles: paste the current identity and open the result",
  "After choosing **Liberty Mutual agent identity**, paste the value you just copied from your current username’s row. Wait for the filtered result, then open the matching agent. This screenshot’s identity and timestamp are examples.",
  [785, 334, 454, 247],
  [
    [
      [999, 391, 217, 41],
      "Paste your copied **Agent identity** in the search field.",
    ],
    [
      [792, 490, 442, 83],
      "Open the matching result, then confirm the agent and workshop number in the profile.",
    ],
  ],
);

const profileEngagement = capture(
  "native-profile-engagement.png",
  "Engagement: open a session and select a page-view event",
  "In **Engagement**, select the newest session in the left column, then a **Page view** entry in the middle column. Read its fields on the right. This capture illustrates the layout; follow the event names required by your exercise.",
  [74, 157, 1194, 545],
  [
    [[128, 168, 120, 34], "The **Engagement** tab opens session history."],
    [
      [77, 370, 218, 128],
      "Select the most recent session for **liberty-mutual-agent-portal**.",
    ],
    [
      [427, 415, 204, 69],
      "Select a **Page view** event and compare its page name and timestamp with your browsing.",
    ],
  ],
);

const resetActions = capture(
  "reset-action-buttons.png",
  "Reset page: start a reset or refresh its status",
  "Below **A clean start, every time**, the dark **Reset workshop** button starts the reset for the selected number. The adjacent **Refresh status** button reads the current result without starting another reset. The button includes the selected number so you can check it before continuing.",
  [87, 185, 632, 344],
  [
    [
      [99, 415, 174, 53],
      "Select **Reset workshop** only after checking the number shown on the button.",
    ],
    [
      [278, 415, 146, 53],
      "Use **Refresh status** to check progress. If **Continue reset** appears, it resumes the existing request.",
    ],
  ],
);

const summaryField = capture(
  "pagebuilder-summary-field.png",
  "Page Builder: open the Demo page in Content",
  "The presenters use **Home** → **Workshop practice** → **Demo** for the review demonstration. Use the top **Content** tab to read **Summary**, and keep the starting wording in a local note before editing. Attendees follow the presenters’ screens.",
  [0, 0, 1270, 523],
  [
    [
      [44, 214, 231, 64],
      "Expand **Home** → **Workshop practice**, then select **Demo**.",
    ],
    [
      [594, 1, 53, 55],
      "Select the **Content** tab at the top of Page Builder.",
    ],
    [
      [316, 385, 944, 110],
      "Find **Summary** and record its complete starting wording.",
    ],
  ],
);

const versionMenu = capture(
  "pagebuilder-version-menu.png",
  "Page Builder: open versions and create a Draft",
  "The version selector is above the content fields or editor canvas. This reference shows a **Live** page and its older approved versions. Follow the step to create a version only when your page is already **Live** or **Approved**; version numbers will differ.",
  [303, 66, 326, 300],
  [
    [
      [315, 78, 137, 34],
      "Open the version selector to inspect the available versions.",
    ],
    [
      [336, 308, 186, 36],
      "Choose **Create version**, complete its dialog, then reopen the selector and select the newest **Draft**.",
    ],
  ],
);

const submitAction = capture(
  "pagebuilder-submit-action.png",
  "Page Builder: submit a Draft from Actions",
  "Find the page’s workflow state at the upper right. For a **Draft**, open **Actions**, then choose **Submit**. The following **Comment** dialog completes the action.",
  [1068, 0, 211, 114],
  [
    [[1084, 17, 63, 22], "Confirm the state is **Draft**."],
    [[1154, 5, 119, 45], "Open **Actions**."],
    [[1170, 52, 89, 40], "Choose **Submit** to open the comment dialog."],
  ],
);

const workflowComment = capture(
  "pagebuilder-workflow-comment.png",
  "Workflow comment: explain the action, then submit it",
  "After choosing a workflow action, enter the comment specified in your step. The dialog’s **Submit** button confirms that selected action, whether you are submitting a draft, requesting a revision, or approving content.",
  [377, 57, 528, 318],
  [
    [[409, 150, 469, 108], "Enter the step’s review note in **Comment**."],
    [
      [781, 301, 91, 49],
      "Select **Submit** to complete the workflow action. **Cancel** closes the dialog without completing it.",
    ],
  ],
);

export const portalScreenshots: Record<
  string,
  Record<number, GuideImage | GuideImage[]>
> = {
  "architecture-and-ownership": {
    1: [homeGuidance, learningGuidance, productSpotlight],
  },
  "start-and-switch-agents": {
    4: [],
    5: capture(
      "portal-profile-menu.png",
      "Your profile: confirm the person, then sign out",
      "Open your name at the upper right of the portal. This reference shows Daniel; verify the person named in your step, then choose **Sign out** before entering another persona’s username.",
      [334, 105, 611, 510],
      [
        [[449, 243, 265, 67], "Confirm the person, role, and agency."],
        [
          [369, 381, 542, 44],
          "Read **Licensed states** to understand the content available to this person.",
        ],
        [[369, 528, 123, 52], "Select **Sign out** before switching personas."],
      ],
    ),
  },
  "personalization-by-role": {
    2: capture(
      "agency-growth-avery.png",
      "Avery: the principal’s Agency Growth card",
      "On **My workspace**, scroll below **Your priorities** and above **Recent activity**. Avery’s card offers the agency growth path.",
      [266, 282, 694, 219],
      [
        [
          [300, 317, 405, 58],
          "Read **Agency Growth** and **Build your next chapter in small business**.",
        ],
        [
          [730, 363, 196, 58],
          "Avery’s next action is **Explore the growth path**.",
        ],
      ],
    ),
    4: capture(
      "agency-growth-jordan.png",
      "Jordan: the producer’s Agency Growth card",
      "Return to the same card location after signing in as Jordan. Compare the heading and yellow action with Avery’s card.",
      [266, 282, 694, 195],
      [
        [
          [300, 317, 405, 58],
          "Jordan sees **Bring a stronger submission to the table**.",
        ],
        [
          [712, 351, 214, 57],
          "Jordan’s next action is **Prepare a BOP submission**.",
        ],
      ],
    ),
    6: capture(
      "agency-growth-maya.png",
      "Maya: the account manager’s Agency Growth card",
      "Maya’s card occupies the same place on **My workspace**. Its copy introduces a learning path for recognizing additional client needs.",
      [266, 341, 694, 197],
      [
        [
          [300, 378, 410, 59],
          "Maya sees **Connect everyday conversations to new needs**.",
        ],
        [
          [739, 409, 187, 59],
          "Maya’s next action is **Start the learning path**.",
        ],
      ],
    ),
    8: capture(
      "agency-growth-elena.png",
      "Elena: the wholesale broker’s Agency Growth card",
      "Elena’s card provides a broad resource starting point. Compare this heading and button with Avery’s growth path and Jordan’s submission guidance.",
      [266, 282, 694, 195],
      [
        [
          [300, 317, 405, 58],
          "Elena sees **Resources for your next client conversation**.",
        ],
        [
          [766, 351, 160, 57],
          "Select **Browse resources**, then check **Distribution channel** in Elena’s profile.",
        ],
      ],
    ),
  },
  "ab-testing": { 3: learningGuidance, 4: profileEngagement },
  "find-an-agent-profile": {
    1: [workshopNumber, currentIdentity],
    2: [profileFilter, profileResult],
    3: [profileOverview, profileEngagement],
  },
  "fresh-profile-restart": {
    1: {
      ...resetActions,
      title: "Read the existing reset status",
      caption:
        "Use **Refresh status** beneath **A clean start, every time** to read the result of the reset you already completed. Check the resulting status message before copying the current identities below it.",
      annotations: resetActions.annotations?.slice(1),
    },
    2: currentIdentity,
    3: [profileFilter, profileResult],
    4: profileOverview,
  },
  "saved-work-reset": { 1: workshopNumber, 3: resetActions },
  "create-resource-and-media": {
    1: [
      capture(
        "resource-create-menu.png",
        "Learning & resources: open Create a subpage",
        "In **Pages**, select **Learning & resources**. Open the three-dot **Content tree options** menu beside that page, then select **Create a subpage**.",
        [8, 370, 440, 140],
        [
          [
            [76, 436, 176, 36],
            "Confirm **Learning & resources** is the selected parent page; the three-dot menu is at the right end of its row.",
          ],
          [
            [259, 381, 174, 39],
            "Choose **Create a subpage** to open the template picker.",
          ],
        ],
      ),
      capture(
        "resource-page-template.png",
        "Select a page template: choose Resource page",
        "Select the **Resource page** tile, then click **Select**. Continue with the workshop page name in the instructions; the template supplies the article components and local image datasource.",
        [64, 65, 1152, 590],
        [
          [[134, 155, 238, 297], "Choose the **Resource page** tile."],
          [
            [1109, 592, 80, 46],
            "Click **Select** to continue to the page name.",
          ],
        ],
      ),
    ],
  },
  "author-approver-workflow": {
    1: [summaryField, versionMenu],
    2: summaryField,
    3: [submitAction, workflowComment],
    4: workflowComment,
  },
};
