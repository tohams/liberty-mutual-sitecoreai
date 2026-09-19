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
      "The Agent Portal is the website an independent agent would use. Sign in with the fictional agent accounts assigned to your workshop number to see how guidance changes for each agent, search for resources, and try a request form. These exercises show the experience Liberty Mutual can offer its agents.",
    location: "Agent Portal · agent login",
    kind: "core",
  },
  content: {
    label: "Create and manage content in SitecoreAI",
    description:
      "SitecoreAI is where Liberty Mutual’s team manages the pages, content, and rules that shape the agent experience. Use your separate SitecoreAI account to explore these tools. A guide marked Presenter demonstration asks you to watch the presenters make a shared change; other guides explain the page or activity you can use yourself.",
    location: "SitecoreAI · separate Sitecore login",
    kind: "core",
  },
  architecture: {
    label: "Understand the architecture",
    description:
      "See how the portal is assembled: SitecoreAI manages content and experience capabilities, Vercel hosts the website application, and custom application code connects business functions. Trace a page from its content to the website and understand which parts each team maintains. These are inspection and discussion exercises.",
    location: "Architecture discussion · repository and SitecoreAI",
    kind: "core",
  },
  development: {
    label: "Develop locally",
    description:
      "Run a copy of the website application on your computer in VS Code, change a React component, and see that change in Page Builder’s visual preview. SitecoreAI continues to supply the shared content. You do not install a local Sitecore server, and your local code changes do not change the shared website.",
    location: "Your computer · VS Code and a local editing host",
    kind: "core",
  },
  tools: {
    label: "Optional development tools",
    description:
      "After the local exercises, connect VS Code’s AI assistant to SitecoreAI and Sitecore documentation so it can consult content and product guidance. The guide explains each connection and its permissions. These connections are optional; the portal runs without them.",
    location: "VS Code · optional connections",
    kind: "optional",
  },
  support: {
    label: "Workshop support",
    description:
      "Use these guides when an exercise asks you to inspect an agent’s stored attributes and activity, or when you want to start again. Your workshop number groups your seven fictional agent logins; resetting that number restores their starting work and gives them fresh personalization profiles.",
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
      "Each fictional agent has a different profile, including licensed states and business activity. Signing in as different agents lets you compare the same website from their perspectives and prepares you to recognize personalization in the following exercises.",
  },
  "personalization-by-role": {
    priority: "relevance",
    section: "portal",
    relevance:
      "Personalization changes a section of a page according to the person viewing it. Here, SitecoreAI uses known agent attributes to choose guidance for the **Agency growth** card on the portal home page. The aim is to help each agent find a useful next action and encourage more business with Liberty Mutual.",
  },
  "state-aware-search": {
    priority: "dependable",
    section: "portal",
    relevance:
      "Help agents find relevant reference materials without searching through every page. **SitecoreAI Search** supplies search results from published content, and the portal’s custom state-access rules limit which results the signed-in agent can receive. The exercise checks the results from the agent’s perspective.",
  },
  "campaign-and-conversation": {
    priority: "components",
    section: "portal",
    relevance:
      "A portal needs useful actions as well as pages to read. Follow a campaign page to a contact dialog and a saved request. SitecoreAI supplies the authored content; custom application code saves the request using the sandbox’s sample data. That code provides a connection point for a future business system. The separate [**Submit a contact form**](/workshops/guide/native-contact-form) guide shows SitecoreAI’s marketer-managed form tool.",
  },
  "native-contact-form": {
    priority: "engagement",
    section: "content",
    relevance:
      "See how a form created in **SitecoreAI Forms** collects an agent’s request and sends it to another service. The workshop’s **Demo Webhook** is a receiving URL, and its receipt inbox lets you inspect the submitted data. Saving that data in a business database or creating a **Salesforce** record would require an integration with that system.",
  },
  "author-approver-workflow": {
    priority: "publishing",
    section: "content",
    relevance:
      "A publishing workflow is a sequence of review states that controls when new wording reaches agents. Watch an **Author** prepare a page and an **Approver** review it in **Page Builder**, SitecoreAI’s visual page-editing tool. Page permissions control where each person can work; workflow permissions control the review actions available to that person.",
  },
  "resource-content-workflow": {
    priority: "publishing",
    section: "content",
    relevance:
      "Follow a resource page from its saved revision to the published website and then to **Search** results. The page’s classification fields describe the content so search can filter it. This shows why saving content, publishing it, and making the update searchable are separate stages to verify.",
  },
  "create-resource-and-media": {
    priority: "management",
    section: "content",
    relevance:
      "Create a resource page from a prepared starting structure so its fields and layout are already in place. Select an image from the **Modern Media Library**, where the team manages reusable media, and inspect its alternative text, the description used when an image cannot be seen. This connects easier page creation with consistent content and media organization.",
  },
  "campaign-composition": {
    priority: "creation",
    section: "content",
    relevance:
      "A component is one section of a page, such as a heading or a content card. Edit a component’s heading in **Page Builder** and view the result on the page. This demonstrates a routine copy change that a marketer can make without asking a developer to change or deploy website code.",
  },
  "ai-assisted-authoring": {
    priority: "creation",
    section: "content",
    relevance:
      "Use AI assistance while editing content to correct spelling or suggest wording. Compare the suggestion with the original copy before choosing whether to accept it. This shows how the tools can speed content preparation while the marketer remains responsible for the final wording.",
  },
  "alert-dates-and-publication": {
    priority: "publishing",
    section: "content",
    relevance:
      "An alert is a message displayed to agents on a page. Inspect its formatted text and the dates that this portal’s custom alert component uses to decide when to display it. Compare that behavior with SitecoreAI publishing controls: hiding a message by date and publishing or expiring a page are different operations.",
  },
  "find-an-agent-profile": {
    priority: "relevance",
    section: "support",
    relevance:
      "A profile is SitecoreAI’s record of an agent’s attributes and tracked activity. Find the profile connected to your current portal login so you can inspect the data behind personalization and testing. After a workshop reset, the same username uses a fresh profile, so the current identity matters.",
  },
  "calculated-growth-personalization": {
    priority: "relevance",
    section: "content",
    relevance:
      "Some personalization decisions need a calculation rather than a simple field comparison. Inspect the developer-written **JavaScript** calculation that uses agency production attributes, then see how a marketer’s rule uses its result to choose content. The workshop supplies fictional values; a connected **Salesforce** or **Snowflake** integration would supply the corresponding business data.",
  },
  "affinity-personalization": {
    priority: "relevance",
    section: "portal",
    relevance:
      "An affinity records interest inferred from the content a person views. Browse product content to build an affinity in SitecoreAI, then observe the portal guidance selected by its configured rule. This demonstrates personalization informed by browsing behavior; a marketer has defined how that interest selects content.",
  },
  "ab-testing": {
    priority: "engagement",
    section: "content",
    relevance:
      "An A/B test shows different versions of content to visitors and measures a defined action. Compare the two calls to action in the configured component test and inspect SitecoreAI’s goal report. The marketer can compare wording without releasing website code. The workshop shows how measurement works; its small sample does not establish a winning version.",
  },
  "agentic-studio-workflow": {
    priority: "creation",
    section: "content",
    relevance:
      "**Agentic Studio** connects AI-assisted tasks into a workflow. Inspect a saved example that researches an agency, prepares a brief, and drafts outreach emails using reusable brand guidance. The example shows the research, intermediate work, and outputs a marketer can review; the emails are drafts and have not been sent.",
  },
  "architecture-and-ownership": {
    priority: "maintenance",
    section: "architecture",
    relevance:
      "Understand how SitecoreAI’s managed services reduce the platform and infrastructure work that the team performs. **Experience Edge** is Sitecore’s globally distributed service for delivering published content to the website. Trace that separation from the website application, whose code, dependencies, integrations, and access still need team ownership.",
  },
  "local-setup": {
    priority: "delivery",
    section: "development",
    relevance:
      "Clone the repository, configure the application, and use **Node.js** to run the website on your computer. It reads content from the shared SitecoreAI environment. This lets a developer begin working on the portal without installing a local Sitecore server or preparing an XP virtual machine.",
  },
  "component-development": {
    priority: "delivery",
    section: "development",
    relevance:
      "A **React** component defines how one part of the website is displayed. Change a small piece of component text locally, then point **Page Builder** at the website running on your computer, its local editing host. You can see the changed component with Sitecore content before deploying any code to the shared site.",
  },
  "vscode-mcp": {
    priority: "delivery",
    section: "tools",
    relevance:
      "The **Model Context Protocol (MCP)** lets an AI assistant use connected tools and information. Connect VS Code to SitecoreAI and Sitecore documentation so the assistant can consult site content and product guidance instead of relying only on the question you type. These optional connections support development; they are not needed to run the portal locally.",
  },
  "release-and-recovery": {
    priority: "dependable",
    section: "architecture",
    relevance:
      "Understand which delivery process applies to a change: publishing edited content, deploying the website application, or deploying the content-management definitions that developers maintain. Inspect how **GitHub**, **Vercel**, and the **SitecoreAI Deploy app** participate and discuss recovery. Attendees inspect the design without needing Vercel access or deploying a shared change.",
  },
  "resource-taxonomy": {
    priority: "dependable",
    section: "architecture",
    relevance:
      "A taxonomy is a managed list of classification choices, such as state or product. Trace a selection in the custom **Resource metadata** app to the stored resource field and the filter used by **Search**. This shows how author-friendly choices are translated into the values that search expects.",
  },
  "saved-work-reset": {
    priority: "relevance",
    section: "support",
    relevance:
      "Use the workshop’s reset page when you want to repeat a portal exercise from its starting state. It resets the seven fictional agent accounts belonging to your workshop number, restores their sample saved work, and gives them fresh SitecoreAI profiles. Pages edited in SitecoreAI require their own cleanup and are not restored by this reset.",
  },
  "fresh-profile-restart": {
    priority: "relevance",
    section: "support",
    relevance:
      "After a reset, verify that your familiar portal username is connected to a fresh SitecoreAI profile. This matters when repeating an exercise that builds interest from browsing: the new profile gives you a clean starting point, while earlier profiles remain in historical records.",
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
