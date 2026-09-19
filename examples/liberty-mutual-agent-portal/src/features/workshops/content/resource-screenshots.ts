import type {
  GuideImage,
  GuideImageAnnotation,
  GuideImageCrop,
} from "../types";

const portal = { sourceWidth: 1304, sourceHeight: 998 };
const native = { sourceWidth: 1280, sourceHeight: 720 };

// Target rectangles use the untouched source pixels for easy visual review.
// The rendered annotations use percentages of the displayed crop.
function focus(
  image: Omit<GuideImage, "crop" | "annotations">,
  crop: GuideImageCrop,
  targets: GuideImageAnnotation[],
): GuideImage {
  return {
    ...image,
    crop,
    annotations: targets.map((target) => ({
      ...target,
      x: ((target.x - crop.x) / crop.width) * 100,
      y: ((target.y - crop.y) / crop.height) * 100,
      width: (target.width / crop.width) * 100,
      height: (target.height / crop.height) * 100,
    })),
  };
}

// One-based positions include each guide's sign-in steps. Empty lists remove a
// legacy screenshot when its visible screen belongs to another step.
export const resourceScreenshots: Record<
  string,
  Record<number, GuideImage | GuideImage[]>
> = {
  "state-aware-search": {
    2: focus(
      {
        file: "resource-search.png",
        title: "Find the library search and licensed-state filter",
        alt: "Learning and resources library search, Workers compensation suggestion, and Risk state dropdown",
        caption:
          "Use the search inside **Learning & resources**. This reference shows the starting **My licensed states** selection before entering a query; your result count and spotlight wording may differ.",
      },
      { ...portal, x: 260, y: 235, width: 1015, height: 380 },
      [
        {
          x: 410,
          y: 390,
          width: 724,
          height: 57,
          label: "Enter **Workers compensation** here, then click **Search**.",
        },
        {
          x: 665,
          y: 457,
          width: 123,
          height: 27,
          label:
            "Or click **Workers compensation** under **Popular** to run that search.",
        },
        {
          x: 274,
          y: 540,
          width: 193,
          height: 65,
          label:
            "Open **Risk state**, choose **Texas**, and then compare **Illinois**. Daniel’s choices follow his licensed states.",
        },
      ],
    ),
  },
  "native-contact-form": {
    3: focus(
      {
        file: "native-contact-form.png",
        title: "Find Contact your team below the relationship-team cards",
        alt: "Contact your team form on Support showing the name, work email, and agency fields",
        caption:
          "On **Support**, scroll below the relationship-team cards. This crop shows the start of **Contact your team**; continue scrolling for **How can we help?**, **What would you like to discuss?**, and **Send request**.",
      },
      { ...portal, x: 275, y: 438, width: 992, height: 560 },
      [
        {
          x: 396,
          y: 482,
          width: 222,
          height: 35,
          label: "Find the form heading **Contact your team**.",
        },
        {
          x: 402,
          y: 583,
          width: 738,
          height: 112,
          label:
            "Enter the fictional **Your name** value specified in the step.",
        },
        {
          x: 402,
          y: 751,
          width: 738,
          height: 72,
          label:
            "Enter **Work email**, using your own workshop number in the fictional address.",
        },
        {
          x: 402,
          y: 881,
          width: 738,
          height: 110,
          label:
            "Complete **Agency name**, then scroll to the remaining required fields.",
        },
      ],
    ),
  },
  "resource-content-workflow": {
    3: focus(
      {
        file: "pagebuilder-resource.png",
        title: "Locate Layers, the version selector, and Apps",
        alt: "Page Builder toolbar and ResourceArticle layer on the Texas resource",
        caption:
          "This reference shows an existing version of **Workers compensation: a Texas starting point**. Use the version selector to create and select your named **English Draft** before editing; the version name shown here will differ.",
      },
      { ...native, x: 0, y: 0, width: 1110, height: 360 },
      [
        {
          x: 67,
          y: 63,
          width: 41,
          height: 44,
          label:
            "Open **Layers** with the stacked-layers icon above the left tree.",
        },
        {
          x: 76,
          y: 229,
          width: 172,
          height: 32,
          label: "Select **ResourceArticle** in the layer tree.",
        },
        {
          x: 327,
          y: 69,
          width: 171,
          height: 44,
          label:
            "Open the version selector immediately left of **Default editing host** to create and then select your **Draft**.",
        },
        {
          x: 1049,
          y: 8,
          width: 37,
          height: 42,
          label:
            "After selecting the **Draft**, open the puzzle-piece **Apps** menu and choose **Resource metadata**.",
        },
      ],
    ),
    4: focus(
      {
        file: "resource-metadata.png",
        title: "Check the selected resource and its managed classification",
        alt: "Resource metadata panel showing the Texas article, its language and read-only version, and Risk state",
        caption:
          "This layout reference shows an existing **Live** version, marked **Read only**. In this exercise, select the **Draft** you just created. **Risk state** is visible here; scroll inside the panel for the other four dropdowns.",
      },
      { ...native, x: 317, y: 276, width: 939, height: 300 },
      [
        {
          x: 328,
          y: 289,
          width: 602,
          height: 52,
          label:
            "Confirm **Workers compensation: a Texas starting point** under **Selected resource**.",
        },
        {
          x: 328,
          y: 344,
          width: 184,
          height: 27,
          label:
            "Check the language and version. Your selected **Draft** should be editable.",
        },
        {
          x: 328,
          y: 462,
          width: 921,
          height: 74,
          label:
            "Record **Risk state** as **Texas**, then record **Business family**, **Product**, **Distribution channel**, and **Resource type** after scrolling.",
        },
      ],
    ),
  },
  "create-resource-and-media": {
    2: [],
    4: focus(
      {
        file: "modern-media-library.png",
        title: "Find the shared image in Modern Media Library",
        alt: "SitecoreAI Media directory showing Content navigation, Search media, filters, and asset thumbnails",
        caption:
          "This is the standalone **Media** directory opened through **Content** > **Media BETA**. Find **liberty-mutual-small-business-team-planning.png**, then inspect its **Details** as described in the step. The thumbnail order may change.",
      },
      { ...native, x: 10, y: 52, width: 1260, height: 352 },
      [
        {
          x: 263,
          y: 57,
          width: 107,
          height: 39,
          label:
            "Open **Content** > **Media BETA** to reach the shared library.",
        },
        {
          x: 24,
          y: 188,
          width: 1233,
          height: 51,
          label:
            "Use **Search media** to find **liberty-mutual-small-business-team-planning.png**, then open the matching asset.",
        },
      ],
    ),
    5: [],
  },
  "affinity-personalization": {
    1: focus(
      {
        file: "native-affinities.png",
        title: "Find the native affinity assignments",
        alt: "SitecoreAI Performance Settings Affinities with Liberty Mutual Agent Portal and insurance_interest page assignments",
        caption:
          "These settings map resource-page visits to **insurance_interest** values. Use this view to inspect the configuration; the agent’s profile shows the scores accumulated from those visits.",
      },
      { ...native, x: 0, y: 50, width: 1265, height: 670 },
      [
        {
          x: 367,
          y: 57,
          width: 112,
          height: 40,
          label: "Open **Performance** from the top navigation.",
        },
        {
          x: 5,
          y: 656,
          width: 62,
          height: 59,
          label: "Open **Settings** at the bottom of the left sidebar.",
        },
        {
          x: 83,
          y: 169,
          width: 226,
          height: 39,
          label: "Choose **Affinities** in the settings menu.",
        },
        {
          x: 359,
          y: 274,
          width: 209,
          height: 39,
          label: "Select **Liberty Mutual Agent Portal** in the site list.",
        },
        {
          x: 623,
          y: 275,
          width: 613,
          height: 342,
          label:
            "Compare the **Affinity Name**, **Affinity Value**, and **Page** assignments without changing them.",
        },
      ],
    ),
    3: focus(
      {
        file: "product-spotlight-card.png",
        title: "Record the spotlight before visiting tagged resources",
        alt: "Products and appetite with Illinois selected and the neutral product spotlight",
        caption:
          "This reference shows the neutral **Protection built around the business you know** spotlight with **Illinois** selected. Compare your current headline with Daniel’s starting profile; existing browsing may already select a different variant.",
      },
      { ...native, x: 260, y: 115, width: 994, height: 371 },
      [
        {
          x: 1070,
          y: 146,
          width: 174,
          height: 42,
          label: "Set **Risk state** to **Illinois**.",
        },
        {
          x: 305,
          y: 302,
          width: 557,
          height: 70,
          label:
            "Record the large spotlight headline above the product-category tabs.",
        },
      ],
    ),
    5: [
      focus(
        {
          file: "native-affinity-score.png",
          title: "Find the recorded interest on Daniel’s profile",
          alt: "Top affinities card showing insurance_interest and workers_compensation with views and score",
          caption:
            "On Daniel’s current profile, open **Overview** and find **Top affinities**. This reference shows **workers_compensation** after resource visits; your view count and score can differ.",
        },
        { ...native, x: 451, y: 375, width: 389, height: 220 },
        [
          {
            x: 477,
            y: 397,
            width: 152,
            height: 30,
            label: "Find the **Top affinities** card in **Overview**.",
          },
          {
            x: 480,
            y: 484,
            width: 337,
            height: 60,
            label:
              "Read **workers_compensation** under **insurance_interest**, then compare it with the portal’s spotlight.",
          },
        ],
      ),
      focus(
        {
          file: "products-texas.png",
          title: "Match the interest to the authored spotlight",
          alt: "Workers compensation spotlight and Review account preparation button above the product tabs",
          caption:
            "This reference shows **Build a stronger workers compensation conversation** and its **Review account preparation** action. The captured session uses **Texas**; keep **Illinois** selected in your walkthrough and verify that the destination retains it.",
        },
        { ...portal, x: 275, y: 136, width: 991, height: 318 },
        [
          {
            x: 307,
            y: 198,
            width: 583,
            height: 71,
            label:
              "Compare this workers-compensation headline with Daniel’s **Top affinities**.",
          },
          {
            x: 311,
            y: 370,
            width: 215,
            height: 53,
            label:
              "Click **Review account preparation**, then confirm **Illinois** in the destination.",
          },
        ],
      ),
    ],
  },
};
