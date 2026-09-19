import type { GuideImage } from "../types";

type Bounds = [x: number, y: number, width: number, height: number];
type Target = [bounds: Bounds, label: string];

// Untouched captures from the connected sandbox on 18 September 2026.
// Authoring these bounds in source pixels keeps each callout tied to its control.
// The renderer receives crop pixels and annotation percentages, as required.
function reference(
  file: string,
  title: string,
  alt: string,
  caption: string,
  [x, y, width, height]: Bounds,
  targets: Target[],
): GuideImage {
  return {
    file,
    title,
    alt,
    caption,
    crop: { x, y, width, height, sourceWidth: 1280, sourceHeight: 720 },
    annotations: targets.map(([bounds, label]) => ({
      x: ((bounds[0] - x) / width) * 100,
      y: ((bounds[1] - y) / height) * 100,
      width: (bounds[2] / width) * 100,
      height: (bounds[3] / height) * 100,
      label,
    })),
  };
}

export const marketingScreenshots: Record<
  string,
  Record<number, GuideImage | GuideImage[]>
> = {
  "campaign-and-conversation": {
    2: reference(
      "campaign-navigation-and-contact.png",
      "Open the campaign and expand its questions",
      "Agent Portal sidebar with Agency growth expanded and Small business growth selected, beside two collapsed campaign accordions",
      "Expand **Agency growth**, then select **Small business growth**. Choosing **Your questions** in the campaign’s **ON THIS PAGE** links scrolls to these two accordion headings. Click a heading or its plus icon to open the authored answer.",
      [5, 363, 934, 246],
      [
        [
          [184, 380, 32, 30],
          "The chevron beside **Agency growth** shows or hides its child pages.",
        ],
        [
          [61, 465, 160, 43],
          "Choose **Small business growth** from the expanded sidebar section.",
        ],
        [
          [294, 472, 616, 34],
          "Open **Where should my team begin?** to read the first answer.",
        ],
        [
          [294, 555, 616, 34],
          "Open **What should we prepare before asking for a review?** to compare the second answer.",
        ],
      ],
    ),
    4: reference(
      "campaign-navigation-and-contact.png",
      "Open the conversation dialog from the relationship-team card",
      "Make a plan with your relationship team card with a yellow Plan a conversation button",
      "After switching to the transaction preview, open the same **Small business growth** campaign and choose **Your next step**. The yellow **Plan a conversation** button opens the dialog. Press Escape to test dismissal, then reopen it before entering your fictional topic.",
      [946, 150, 307, 319],
      [
        [
          [981, 382, 235, 52],
          "Click **Plan a conversation** in **Make a plan with your relationship team**.",
        ],
      ],
    ),
  },
  "campaign-composition": {
    1: reference(
      "campaign-ai-grammar.png",
      "Find the campaign heading in Content",
      "Page Builder Content tree with Campaign practice, Growth opportunity, and its Title field",
      "Open **Content**, then select **Campaign practice** → **Data** → **Growth opportunity**. Record the text in **Title** before changing it. This reference shows where the field is located; use the current text in your environment for restoration.",
      [0, 0, 812, 447],
      [
        [[600, 2, 40, 48], "Select **Content** in the top navigation."],
        [
          [57, 315, 225, 130],
          "Expand **Campaign practice** and **Data**, then select **Growth opportunity**.",
        ],
        [
          [319, 335, 486, 58],
          "Copy the complete **Title** before editing. This field supplies the callout’s heading.",
        ],
      ],
    ),
  },
  "ai-assisted-authoring": {
    1: reference(
      "campaign-ai-grammar.png",
      "Open the practice content item",
      "Page Builder Content navigation and the expanded Campaign practice Data tree with Growth opportunity selected",
      "Choose **Content**, then expand **Home** → **Agency growth** → **Campaign practice** → **Data**. Select **Growth opportunity** before recording its original **Body**. This crop shows the navigation; the temporary AI edit is shown separately in the next step.",
      [0, 0, 715, 635],
      [
        [
          [600, 2, 40, 48],
          "Select **Content** in Page Builder’s top navigation.",
        ],
        [
          [57, 315, 225, 130],
          "Expand **Campaign practice** and **Data**, then select **Growth opportunity**.",
        ],
        [
          [319, 437, 94, 29],
          "**Body** is the rich-text field below **Title**. Record its original wording and formatting before editing.",
        ],
      ],
    ),
    2: reference(
      "campaign-ai-grammar.png",
      "Review the proposed change before accepting it",
      "Rich-text Body field and an AI grammar proposal with Revert to original and Keep optimized buttons",
      "The AI result appears beside the rich-text editor. This reference uses a different sample sentence; your run uses the sentence in the instructions. Compare your proposed correction, then choose **Keep optimized**. **Revert to original** rejects the current proposal.",
      [310, 325, 960, 245],
      [
        [
          [321, 509, 485, 35],
          "Compare the original sentence in **Body** with the proposed wording.",
        ],
        [
          [832, 394, 405, 50],
          "Read the proposed correction before accepting it.",
        ],
        [
          [1106, 455, 133, 35],
          "**Keep optimized** accepts this proposal. Wait for the save checkmark afterward.",
        ],
        [
          [834, 455, 145, 36],
          "**Revert to original** rejects this proposal; it does not restore text recorded before earlier edits.",
        ],
      ],
    ),
  },
  "alert-dates-and-publication": {
    2: reference(
      "campaign-alert-editor.png",
      "Select the alert in the authoring canvas",
      "Page Builder Layers with CampaignAlert selected and its alert message visible in the canvas",
      "Select **CampaignAlert** in **Layers** to locate the alert on the page. This reference has no start or end date, as its display-window note confirms. Read your current values in **Content**; this image does not demonstrate a timed publication.",
      [0, 125, 963, 465],
      [
        [
          [2, 405, 280, 39],
          "Select **CampaignAlert** beneath the main campaign region in **Layers**.",
        ],
        [
          [534, 326, 424, 248],
          "The selected alert is outlined in the page preview. Authors can inspect its rich text here.",
        ],
        [
          [596, 489, 363, 66],
          "The **Display window (UTC)** note explains the authored visibility window. Empty dates impose no start or end limit.",
        ],
      ],
    ),
  },
  "agentic-studio-workflow": {
    2: reference(
      "agentic-space-instructions.png",
      "Read the context supplied to the connected agents",
      "Agentic Studio Instructions tab showing the space objective and constraints",
      "In the right-hand panel, open **Instructions**. Read **Objective** and **Constraints**, then scroll within that panel for the remaining guidance. These saved instructions explain the research task, intended recipients, and limits on generated content.",
      [918, 82, 362, 630],
      [
        [
          [1033, 97, 81, 57],
          "Select **Instructions** beside the right-hand **Agents** tab.",
        ],
        [
          [942, 239, 330, 166],
          "**Objective** states the deliverables the agents were asked to create.",
        ],
        [
          [942, 414, 330, 292],
          "**Constraints** records source, brand, and editorial requirements. Scroll for the full text.",
        ],
      ],
    ),
    3: reference(
      "agentic-visual-guidelines.png",
      "Follow the research and tool activity in Chat",
      "Saved Agentic Studio conversation showing Web Search source links and an expanded Get Brand Kit Section tool result",
      "Scroll through the center **Chat** history to inspect the research and tool calls. Expand a completed tool result to read its inputs and outputs. The saved conversation provides evidence of the work; leave **Run workflow** untouched during this review.",
      [113, 172, 790, 384],
      [
        [
          [120, 174, 674, 163],
          "**Web Search** entries contain the source links used during research.",
        ],
        [
          [123, 346, 767, 35],
          "Select the tool-result row or its chevron to expand or collapse the details.",
        ],
        [
          [145, 386, 744, 166],
          "The expanded **Input** records the Brand Kit section requested by the agent.",
        ],
      ],
    ),
    4: [
      reference(
        "agentic-brand-kit-retrieval.png",
        "Identify the Brand Kit retrieval",
        "Expanded Get Brand Kit result in the saved Agentic Studio conversation",
        "The **Get Brand Kit** entry records the kit requested by the agent. Continue down the same saved conversation to the **Get Brand Kit Section** entry for its authored visual guidance.",
        [119, 345, 778, 205],
        [
          [
            [128, 348, 756, 34],
            "Expand **Get Brand Kit** to inspect the recorded call.",
          ],
          [
            [157, 441, 610, 36],
            "The **brandKitId** identifies the kit used for this saved run. This is reference evidence; no value needs to be copied.",
          ],
        ],
      ),
      reference(
        "agentic-visual-guidelines.png",
        "Confirm that the authored visual guidance was requested",
        "Get Brand Kit Section input showing Visual Guidelines as the section name",
        "In **Get Brand Kit Section**, read **sectionName** and then the returned output below it. The **Visual Guidelines** section contains the authored branding instructions used to prepare the email artifacts.",
        [119, 345, 778, 210],
        [
          [
            [126, 348, 759, 34],
            "Open **Get Brand Kit Section** in the saved **Chat** history.",
          ],
          [
            [174, 495, 485, 34],
            "Confirm **sectionName: Visual Guidelines**, then scroll down to read the returned section content.",
          ],
        ],
      ),
    ],
    5: [
      reference(
        "agentic-research-artifact.png",
        "Read the research artifact before reviewing the emails",
        "Agentic Studio artifact viewer with the account research and campaign brief selected",
        "Open **Artifacts**, expand the viewer, and select **Watkins | Account research and campaign brief**. Review the evidence in the main pane before comparing the three email previews. The artifact content is a saved example, so its relative update time may differ from this reference.",
        [66, 36, 1147, 650],
        [
          [
            [78, 179, 236, 76],
            "Choose **Watkins | Account research and campaign brief** in the left artifact list.",
          ],
          [
            [355, 294, 821, 359],
            "Read **Current starting point**, then scroll through the research and source context.",
          ],
        ],
      ),
      reference(
        "agentic-email-preview.png",
        "Switch from an artifact’s source to its formatted Preview",
        "Agentic Studio artifact viewer with the principal email selected and its formatted HTML Preview visible",
        "Select an artifact whose name includes **email preview**, then choose **Preview**. Use the left list to compare the principal, advisor, and client-service versions. The preview shows how the email reads; no email is sent by opening it.",
        [66, 112, 1147, 575],
        [
          [
            [77, 416, 237, 80],
            "Select the **Principal email preview** artifact; the other role-specific previews are in the same list.",
          ],
          [
            [527, 142, 69, 38],
            "Choose **Preview** beside **HTML** to read the styled email.",
          ],
          [
            [469, 300, 624, 108],
            "Compare the subject and opening headline, then scroll to the message and call to action.",
          ],
        ],
      ),
    ],
  },
  "ab-testing": {
    1: [
      reference(
        "ab-test-configuration.png",
        "Locate the component test and its applied settings",
        "Page Builder showing AgentGuidance, its test icon, and the Applied configurations panel with an equal traffic split",
        "Select **AgentGuidance** in **Layers**, open its test, and choose **Applied configurations**. This captured configuration shows equal traffic allocation to **A** and **B**. Read the current saved configuration without changing or ending the test.",
        [0, 122, 784, 507],
        [
          [
            [6, 298, 272, 38],
            "The flask icon identifies the test on **AgentGuidance**.",
          ],
          [
            [484, 173, 184, 35],
            "Select **Applied configurations** to read the saved goal and traffic allocation.",
          ],
          [
            [317, 357, 450, 127],
            "Compare **A: AgentGuidance (control)** and **B: Variant B**. Each receives 50% in this reference.",
          ],
        ],
      ),
      reference(
        "ab-test-configuration.png",
        "Select the authored variants in the right panel",
        "Page Builder test panel with A and B tabs, View analytics, and the control content item",
        "Use the right-hand **A** and **B** tabs to inspect the authored content for each treatment. **View analytics** opens the test’s reporting view. The test’s current status and measured results may differ from this saved reference.",
        [972, 99, 300, 610],
        [
          [
            [991, 298, 79, 43],
            "Choose **A** or **B** to inspect that variant’s fields and preview.",
          ],
          [
            [997, 480, 246, 41],
            "The **Content item** identifies the content supplying the selected variant.",
          ],
          [
            [1093, 252, 153, 38],
            "**View analytics** opens native test reporting. The report is examined later in this guide.",
          ],
        ],
      ),
    ],
  },
  "calculated-growth-personalization": {
    1: reference(
      "growth-personalization-rule.png",
      "Read the calculation used by the component rule",
      "Personalization Builder for the CampaignCallout showing the small business growth opportunity custom value and Is true condition",
      "The rule builder identifies **CampaignCallout** as the base component. Its row matches when **Liberty Mutual - Small business growth opportunity** returns **Is true**. Inspect the row, then close without saving changes.",
      [31, 28, 1217, 390],
      [
        [
          [46, 174, 332, 30],
          "Confirm the base component is **CampaignCallout**.",
        ],
        [
          [141, 296, 506, 49],
          "The column names the reusable **Liberty Mutual - Small business growth opportunity** calculation.",
        ],
        [
          [141, 362, 106, 34],
          "**Is true** is the condition that selects this personalized content.",
        ],
      ],
    ),
    2: reference(
      "growth-custom-value.png",
      "Read the saved business calculation and open Test",
      "Published JavaScript custom value with Test button, business description, and Boolean return type",
      "The saved custom value has a **Boolean** return type: it answers true or false for a profile. Read the **Description** beside the code to understand the business criterion, then use **Test** for the two profile comparisons. Leave the published code unchanged.",
      [393, 64, 879, 391],
      [
        [
          [783, 74, 61, 37],
          "**Test** opens the profile-based evaluation used in the next step.",
        ],
        [
          [914, 152, 352, 175],
          "Read **Description** for the 20% criterion and the handling of missing or invalid inputs.",
        ],
        [
          [916, 370, 127, 72],
          "**Return type: Boolean** means the rule receives a true-or-false result.",
        ],
      ],
    ),
    3: [
      reference(
        "growth-avery-test.png",
        "Avery’s test result: true",
        "Test custom value dialog showing Response and a true result",
        "After loading Avery’s current native profile and clicking **Run test**, read **Response**. This verified reference returns **true**, matching Cedar Ridge’s 14.46% small-commercial share. Use the current profile UUID obtained in the guide.",
        [136, 47, 1006, 169],
        [
          [[279, 98, 102, 40], "Select **Response** after the test completes."],
          [
            [185, 171, 81, 29],
            "**true** means Avery’s profile matches the growth-opportunity criterion.",
          ],
        ],
      ),
      reference(
        "growth-daniel-test.png",
        "Daniel’s test result: false",
        "Test custom value dialog showing Response and a false result",
        "Repeat with Daniel’s current native profile. This verified reference returns **false**, matching Prairie Oak’s 36.86% share. The comparison evaluates the saved calculation without changing either profile.",
        [136, 47, 1006, 169],
        [
          [
            [279, 98, 102, 40],
            "Read **Response** for the second profile test.",
          ],
          [
            [185, 171, 81, 29],
            "**false** keeps Daniel on the neutral campaign guidance.",
          ],
        ],
      ),
    ],
    5: [
      reference(
        "growth-avery-callout.png",
        "Avery receives the growth-opportunity message",
        "Agency growth campaign callout headed Build on your personal-lines relationships",
        "After opening **Small business growth** as Avery and selecting **Opportunity**, compare the callout’s headline and action. This is the content selected by the true result from the prior test.",
        [272, 285, 660, 364],
        [
          [
            [302, 345, 591, 43],
            "Avery’s headline is **Build on your personal-lines relationships**.",
          ],
          [
            [302, 570, 208, 50],
            "The matching action is **Plan a growth conversation**.",
          ],
        ],
      ),
      reference(
        "growth-daniel-callout.png",
        "Daniel receives the neutral preparation message",
        "Agency growth campaign callout headed Turn local knowledge into a stronger submission",
        "Open the same campaign as Daniel and compare the same **Opportunity** section. His false result keeps the preparation message and its **Prepare a BOP submission** action.",
        [272, 285, 660, 435],
        [
          [
            [302, 345, 594, 42],
            "Daniel’s headline is **Turn local knowledge into a stronger submission**.",
          ],
          [
            [302, 661, 208, 49],
            "The matching action is **Prepare a BOP submission**.",
          ],
        ],
      ),
    ],
  },
};
