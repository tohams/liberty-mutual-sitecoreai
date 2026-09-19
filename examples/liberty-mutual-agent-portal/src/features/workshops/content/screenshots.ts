import type { WorkshopGuide, GuideImage } from "../types";

// Captured from the connected sandbox on 18 September 2026.
// Keys are one-based step positions; keep captions explicit about reference state.
const screenshots: Record<string, Record<number, GuideImage>> = {
  "start-and-switch-agents": {
    "4": {
      file: "agent-workspace.png",
      alt: "Agent Portal workspace showing the profile menu and primary navigation",
      caption:
        "The profile menu is at the upper right. Use it to confirm the current person and to sign out before switching personas.",
    },
  },
  "state-aware-search": {
    "2": {
      file: "resource-search.png",
      alt: "Learning and resources search interface with licensed-state filter controls",
      caption:
        "**Learning & resources**: use the search field and **Risk state** filter. This reference shows Daniel’s library; result counts and treatment copy may vary.",
    },
  },
  "bop-submission": {
    "2": {
      file: "products-texas.png",
      alt: "Products and appetite with Texas selected and Prepare account buttons",
      caption:
        "Confirm **Texas** in **Risk state** before choosing **Prepare account** on the **Businessowners policy** card.",
    },
    "3": {
      file: "bop-preparation.png",
      alt: "Prepare your submission dialog with Texas risk state and coverage selection",
      caption:
        "The preparation dialog carries the selected risk state forward. Complete the account fields using a unique fictional name for your exercise.",
    },
  },
  "native-contact-form": {
    "3": {
      file: "native-contact-form.png",
      alt: "Contact your team form below the relationship-team cards on Support",
      caption:
        "On **Support**, scroll below the relationship-team cards to find the native **Contact your team** form.",
    },
  },
  "resource-content-workflow": {
    "3": {
      file: "pagebuilder-resource.png",
      alt: "Page Builder showing the Texas resource and its ResourceArticle and ResourceImage layers",
      caption:
        "Reference layout for the Texas resource. **Layers** identifies the article and its nested image. The version shown is **Live**; create the coordinated **Draft** before editing.",
    },
    "4": {
      file: "resource-metadata.png",
      alt: "Resource metadata app with managed risk state, business family, product, and distribution choices",
      caption:
        "**Apps** → **Resource metadata**. This screenshot shows the existing **Live** version, so fields are read-only. The guide creates a **Draft** before making changes.",
    },
  },
  "create-resource-and-media": {
    "2": {
      file: "modern-media-library.png",
      alt: "Modern Media Library showing the twelve Liberty Mutual resource images",
      caption:
        "**Content** → **Media BETA** opens the **Modern Media Library**. Reuse the prepared asset that fits the practice article.",
    },
    "5": {
      file: "pagebuilder-resource.png",
      alt: "Page Builder Layers showing the nested ResourceImage component",
      caption:
        "Existing article for reference: **ResourceImage** belongs inside **ResourceArticle**’s image placeholder. Your new page has its own local image datasource.",
    },
  },
  "affinity-personalization": {
    "1": {
      file: "native-affinities.png",
      alt: "SitecoreAI Affinities showing insurance_interest page mappings",
      caption:
        "**Performance** → **Settings** → **Affinities** shows the tagged pages. These settings define signals; inspect the current agent’s profile to verify accumulated scores.",
    },
    "5": {
      file: "products-texas.png",
      alt: "Products page with the workers compensation spotlight",
      caption:
        "Daniel’s workers-compensation treatment appears above the product filters. Confirm both native profile evidence and the current rendered treatment.",
    },
  },
  "agentic-studio-workflow": {
    "1": {
      file: "agentic-workflow.png",
      alt: "Agentic Studio showing saved conversation and three connected workflow stages",
      caption:
        "The **Agents** panel shows **Account Enrichment** → **Brief Generation** → **Content Generation**. Inspect the saved work without clicking **Run workflow**.",
    },
    "5": {
      file: "agentic-email-preview.png",
      alt: "Agentic Studio artifact dialog showing the styled principal outreach email",
      caption:
        "Choose the artifact ending in **email preview**, then select **Preview**. The left panel lets you compare the three reviewed role-specific emails.",
    },
  },
  "architecture-and-ownership": {
    "2": {
      file: "pagebuilder-resource.png",
      alt: "ResourceArticle and ResourceImage layers in Page Builder",
      caption:
        "Authored page fields and local image data are rendered by the corresponding React components.",
    },
  },
  "resource-taxonomy": {
    "2": {
      file: "resource-metadata.png",
      alt: "Installed Resource metadata panel in Page Builder",
      caption:
        "The panel reads managed taxonomy choices while preserving the raw Search-compatible field values. **Live** versions are read-only.",
    },
  },
};

export function withScreenshots(guide: WorkshopGuide): WorkshopGuide {
  return {
    ...guide,
    steps: guide.steps.map((step, index) => ({
      ...step,
      image: screenshots[guide.slug]?.[index + 1] ?? step.image,
    })),
  };
}
