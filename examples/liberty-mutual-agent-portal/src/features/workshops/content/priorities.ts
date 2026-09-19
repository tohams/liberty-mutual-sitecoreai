import type { WorkshopGuide } from "../types";

// These headings come from the current shared deck's Marketing priorities
// (slides 3–4) and Platform priorities (slide 5), reviewed September 19, 2026.
export const customerPriorities = {
  creation: { label: "Easy content creation", slide: 3 },
  publishing: { label: "Controlled publishing", slide: 3 },
  management: { label: "Content and access management", slide: 3 },
  components: { label: "Flexible components", slide: 4 },
  relevance: { label: "Relevant agent experience", slide: 4 },
  engagement: { label: "Connected engagement and optimization", slide: 4 },
  maintenance: { label: "Less platform maintenance", slide: 5 },
  delivery: { label: "Faster delivery", slide: 5 },
  dependable: { label: "Dependable agent experience", slide: 5 },
} as const;

export const workshopSections = {
  portal: {
    label: "Explore the Agent Portal",
    description:
      "Experience the website as an independent agent. Use your assigned agent logins to compare personalized guidance, find resources, and interact with portal components.",
    location: "Agent Portal · agent login",
    kind: "core",
  },
  content: {
    label: "Create and manage content in SitecoreAI",
    description:
      "See how marketers create pages, edit content, review personalization rules, and review results. These exercises use SitecoreAI; follow the presenter where the guide is marked Presenter demonstration.",
    location: "SitecoreAI · separate Sitecore login",
    kind: "core",
  },
  architecture: {
    label: "Understand the architecture",
    description:
      "Trace the agent experience through managed SitecoreAI services, frontend hosting, and business integrations. Follow the presenter or inspect the implementation without changing shared content.",
    location: "Architecture discussion · repository and SitecoreAI",
    kind: "core",
  },
  development: {
    label: "Develop locally",
    description:
      "Run the frontend on your computer, change a React component, and preview it in Page Builder. Your local code changes do not require a shared deployment.",
    location: "Your computer · VS Code and a local editing host",
    kind: "core",
  },
  tools: {
    label: "Optional development tools",
    description:
      "Connect VS Code to Sitecore content and documentation after the local exercises. These AI tools are optional.",
    location: "VS Code · optional connections",
    kind: "optional",
  },
  support: {
    label: "Workshop support",
    description:
      "Find the current agent profile or reset your workshop number when you want to repeat an exercise.",
    location: "Reference · use when needed",
    kind: "support",
  },
} as const;

type PriorityKey = keyof typeof customerPriorities;
type SectionKey = keyof typeof workshopSections;
interface GuideFocusDefinition {
  priority: PriorityKey;
  section: SectionKey;
  relevance: string;
}

export interface WorkshopFocus {
  priority: (typeof customerPriorities)[PriorityKey];
  section: (typeof workshopSections)[SectionKey] & { id: SectionKey };
  relevance: string;
}
export type PrioritizedWorkshopGuide = WorkshopGuide & { focus: WorkshopFocus };

export const guidePriorities: Record<string, GuideFocusDefinition> = {
  "start-and-switch-agents": {
    priority: "relevance",
    section: "portal",
    relevance:
      "Use known agent profiles to compare the same portal from different business perspectives. This preparation supports the personalization exercises.",
  },
  "personalization-by-role": {
    priority: "relevance",
    section: "portal",
    relevance:
      "See component-level personalization use known agent attributes to select more useful guidance. The aim is to help Liberty Mutual earn more of each independent agent's business.",
  },
  "state-aware-search": {
    priority: "dependable",
    section: "portal",
    relevance:
      "Evaluate robust site search and reference-material retrieval using the agent's licensed states. Native **Search** supplies results; the portal applies its state-access rules.",
  },
  "campaign-and-conversation": {
    priority: "components",
    section: "portal",
    relevance:
      "See **SitecoreAI** support a portal with both authored content and functional, integrated components. One campaign connects navigation, accordions, and a contact modal to a saved request. The custom server API is the point at which a business-system integration would connect; the separate Native Forms guide demonstrates the marketer-managed form and webhook.",
  },
  "native-contact-form": {
    priority: "engagement",
    section: "content",
    relevance:
      "Trace a native form submission to a webhook. A database backend or **Salesforce** connection requires an implemented integration beyond this receiving webhook.",
  },
  "author-approver-workflow": {
    priority: "publishing",
    section: "content",
    relevance:
      "Watch the presenters demonstrate content roles, permissions, and approval workflow in **Page Builder**. Separate **Author** and **Approver** accounts demonstrate who can edit, review, and approve publication.",
  },
  "resource-content-workflow": {
    priority: "publishing",
    section: "content",
    relevance:
      "Follow versioned resource content through classification, publication, and **Search** refresh. This connects controlled publishing to the guidance agents actually find.",
  },
  "create-resource-and-media": {
    priority: "management",
    section: "content",
    relevance:
      "Create a consistently structured resource page, select a managed image, and inspect its alt text. This addresses content and media organization while supporting accessible authoring.",
  },
  "campaign-composition": {
    priority: "creation",
    section: "content",
    relevance:
      "Edit one component’s heading in **Page Builder**, then preview the result. Marketers can change authored content without a frontend deployment.",
  },
  "ai-assisted-authoring": {
    priority: "creation",
    section: "content",
    relevance:
      "Try spelling correction and AI-assisted copy generation while retaining editorial control. Review the suggested wording before accepting any change.",
  },
  "alert-dates-and-publication": {
    priority: "publishing",
    section: "content",
    relevance:
      "Inspect rich-text alerts and visibility dates, then distinguish them from scheduled publishing and expiration. This makes the demonstrated behavior and the remaining scheduling setup clear.",
  },
  "find-an-agent-profile": {
    priority: "relevance",
    section: "support",
    relevance:
      "Find the active profile before evaluating known attributes, behavior, or experiment activity. This supporting lookup helps you verify the personalization exercises.",
  },
  "calculated-growth-personalization": {
    priority: "relevance",
    section: "content",
    relevance:
      "Inspect a reusable JavaScript calculation using agency production attributes, then see content selected by a marketer-managed rule. Synthetic data illustrates the contract a **Salesforce** or **Snowflake** integration would need to supply.",
  },
  "affinity-personalization": {
    priority: "relevance",
    section: "portal",
    relevance:
      "Use native browsing affinities to select relevant guidance with less custom behavior tracking. The exercise uses an explicit targeting rule, not a claim of autonomous AI recommendations or segmentation.",
  },
  "ab-testing": {
    priority: "engagement",
    section: "content",
    relevance:
      "Compare authored CTA variants and inspect their native goal reporting. Marketers can test a content choice without releasing new frontend code; a small workshop sample does not establish a winner.",
  },
  "agentic-studio-workflow": {
    priority: "creation",
    section: "content",
    relevance:
      "Extend AI-assisted content creation with connected research, reusable brand context, and reviewable outputs. The outreach campaign is an example of the tooling, not an additional campaign requirement or sent communication.",
  },
  "architecture-and-ownership": {
    priority: "maintenance",
    section: "architecture",
    relevance:
      "Understand how managed **SitecoreAI** services reduce platform upgrade and infrastructure work while **Experience Edge** supports content delivery. The team still owns application dependencies, integrations, access, and operational validation.",
  },
  "local-setup": {
    priority: "delivery",
    section: "development",
    relevance:
      "Reduce developer onboarding to the repository, a supported **Node.js** runtime, and local configuration. Run the frontend against shared **SitecoreAI** without installing a local Sitecore instance or preparing an XP virtual machine.",
  },
  "component-development": {
    priority: "delivery",
    section: "development",
    relevance:
      "Make a small **React** change and inspect it in **Page Builder** through the local editing host. This demonstrates a shorter development feedback loop without deploying to the shared site.",
  },
  "vscode-mcp": {
    priority: "delivery",
    section: "tools",
    relevance:
      "Explore optional AI assistance grounded in the site's content and Sitecore documentation. These connections can support developer understanding; they are not prerequisites for the local workshop.",
  },
  "release-and-recovery": {
    priority: "dependable",
    section: "architecture",
    relevance:
      "Trace separate release paths for content, frontend code, and CMS definitions, including recovery responsibilities. This is an architecture discussion; attendees do not need **Vercel** access or a deployment exercise.",
  },
  "resource-taxonomy": {
    priority: "dependable",
    section: "architecture",
    relevance:
      "Trace author-managed classification choices to stable **Search** filters. The custom **Resource metadata** app preserves the indexed field contract so useful reference material remains findable.",
  },
  "saved-work-reset": {
    priority: "relevance",
    section: "support",
    relevance:
      "Reset your workshop number to repeat personalization with fresh profiles and baseline saved work. This is a workshop utility, not a customer platform requirement.",
  },
  "fresh-profile-restart": {
    priority: "relevance",
    section: "support",
    relevance:
      "Verify that a reset created new profiles before repeating a behavior-based exercise. The procedure supports reliable evaluation of the personalization walkthroughs.",
  },
};

export function withPriorities(guide: WorkshopGuide): PrioritizedWorkshopGuide {
  const focus = guidePriorities[guide.slug];
  if (!focus) throw new Error(`Missing customer priority for ${guide.slug}`);
  return {
    ...guide,
    focus: {
      priority: customerPriorities[focus.priority],
      section: { ...workshopSections[focus.section], id: focus.section },
      relevance: focus.relevance,
    },
  };
}

// Within each section, move from the simplest action to configuration and review.
const walkthroughOrder = [
  "start-and-switch-agents",
  "personalization-by-role",
  "state-aware-search",
  "affinity-personalization",
  "campaign-and-conversation",
  "create-resource-and-media",
  "campaign-composition",
  "ai-assisted-authoring",
  "author-approver-workflow",
  "resource-content-workflow",
  "alert-dates-and-publication",
  "calculated-growth-personalization",
  "ab-testing",
  "native-contact-form",
  "agentic-studio-workflow",
  "architecture-and-ownership",
  "release-and-recovery",
  "resource-taxonomy",
  "local-setup",
  "component-development",
  "vscode-mcp",
  "find-an-agent-profile",
  "saved-work-reset",
  "fresh-profile-restart",
];

export function orderByWorkshopSection(guides: PrioritizedWorkshopGuide[]) {
  const sectionOrder = Object.keys(workshopSections);
  return [...guides].sort((left, right) => {
    const sectionDifference =
      sectionOrder.indexOf(left.focus.section.id) -
      sectionOrder.indexOf(right.focus.section.id);
    return (
      sectionDifference ||
      walkthroughOrder.indexOf(left.slug) - walkthroughOrder.indexOf(right.slug)
    );
  });
}
