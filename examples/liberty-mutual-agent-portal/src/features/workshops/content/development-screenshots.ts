import type { GuideImage } from "../types";

// Real sandbox captures from 18–19 September 2026. Crops change presentation only;
// annotations use percentages of the displayed crop, not the full source image.
export const developmentScreenshots: Record<
  string,
  Record<number, GuideImage | GuideImage[]>
> = {
  "local-setup": {
    7: {
      file: "pagebuilder-editing-host.png",
      title: "Find the local editing-host option",
      alt: "Open Page Builder editing-host menu with Default editing host, Local host, and Save controls",
      caption:
        "Open the editing-host selector, then choose **Local host**. This reference shows the menu before that selection; the URL field appears after you choose **Local host**. Enter **http://localhost:3000**, then click **Save**.",
      crop: {
        x: 450,
        y: 60,
        width: 355,
        height: 160,
        sourceWidth: 1280,
        sourceHeight: 720,
      },
      annotations: [
        {
          x: 3.38,
          y: 7.5,
          width: 47.32,
          height: 23.75,
          label:
            "Open **Default editing host** in the toolbar above the canvas.",
        },
        {
          x: 58.31,
          y: 38.75,
          width: 29.01,
          height: 18.75,
          label:
            "Choose **Local host**, then enter your running frontend’s HTTP address in the field that appears.",
        },
        {
          x: 79.15,
          y: 68.13,
          width: 13.8,
          height: 16.25,
          label:
            "Click **Save** after entering the address. Keep npm run dev running on this machine.",
        },
      ],
    },
  },
  "release-and-recovery": {
    3: {
      file: "pagebuilder-editing-host.png",
      title: "Return to the shared editing host",
      alt: "Page Builder editing-host menu with Default editing host selected and a Save button",
      caption:
        "At the end of the local exercise, choose **Default editing host**, then click **Save**. Page Builder returns to the shared hosted frontend; this selection does not deploy your code.",
      crop: {
        x: 450,
        y: 60,
        width: 355,
        height: 160,
        sourceWidth: 1280,
        sourceHeight: 720,
      },
      annotations: [
        {
          x: 7.61,
          y: 38.75,
          width: 47.61,
          height: 18.75,
          label:
            "Select **Default editing host** to use the shared preview frontend.",
        },
        {
          x: 79.15,
          y: 68.13,
          width: 13.8,
          height: 16.25,
          label:
            "Click **Save** before stopping your local development server.",
        },
      ],
    },
  },
  "component-development": {
    3: {
      file: "page-builder-local-heading.png",
      title: "Locate the heading in the local Page Builder canvas",
      alt: "Page Builder connected to localhost and showing the starting Learning and resources heading",
      caption:
        "This reference shows **Learning & resources** rendered by the local frontend, with the starting heading highlighted. After saving your edit in **ResourceSearch.tsx**, confirm that the heading reads **Find the right resource for your next conversation**. No CMS publication or deployment is needed.",
      crop: {
        x: 0,
        y: 40,
        width: 1025,
        height: 355,
        sourceWidth: 1165,
        sourceHeight: 768,
      },
      annotations: [
        {
          x: 22.63,
          y: 9.01,
          width: 8,
          height: 5.35,
          label:
            "**http://localhost:3000** confirms that the canvas uses the frontend running on your machine.",
        },
        {
          x: 0.39,
          y: 44.23,
          width: 12.88,
          height: 5.35,
          label: "Select **Learning & resources** under **Home** in **Pages**.",
        },
        {
          x: 48.2,
          y: 54.65,
          width: 27.12,
          height: 6.76,
          label:
            "The starting heading is **Find guidance for your next client conversation**. Your saved edit should replace it with **Find the right resource for your next conversation**.",
        },
      ],
    },
  },
};
