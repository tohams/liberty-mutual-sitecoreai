import type { WorkshopGuide } from "../types";

export const governanceGuides: WorkshopGuide[] = [
  {
    slug: "author-approver-workflow",
    audience: "marketing",
    category: "Content governance",
    title: "Author and approver: review and publish content together",
    summary:
      "Work with a partner in **Page Builder** to prepare a page, request a revision and approve the final wording for publication.",
    outcome:
      "See how assigned pages and separate **Author** and **Approver** roles support a review process, with publication triggered by approval.",
    duration: "20–25 minutes for a pair",
    personas: ["Sitecore Author", "Sitecore Approver"],
    prerequisites: [
      "Use your invited **Sitecore Cloud** account with your assigned **Author** or **Approver** role. Your **Agent Portal** username is a separate login.",
      "The presenters use **Demo**. Attendees use their assigned **Pair** page under **Home** → **Workshop practice**. This pair number is separate from your **Agent Portal** reviewer number.",
      "Each pair works on its own page. In **Page Builder**, select **Liberty Mutual Agent Portal**, use **English** and keep **Default** selected as the editing host.",
      "This exercise changes **Summary** only. Leave images, component placement and **Resource metadata** unchanged.",
      "If your partner is unavailable, a presenter can use the demonstration **Approver** account to review your practice page.",
    ],
    links: [
      {
        label: "Open Sitecore Cloud",
        href: "https://portal.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb",
      },
      {
        label: "Open Page Builder",
        href: "https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb",
      },
      ...Array.from({ length: 9 }, (_, index) => {
        const pair = String(index + 1).padStart(2, "0");
        return {
          label: index === 0 ? "Demo live page" : `Pair ${pair} live page`,
          href: `https://liberty-mutual-agent-portal.vercel.app/workshop-practice/pair-${pair}`,
        };
      }),
    ],
    steps: [
      {
        title: "Find your shared page and confirm your roles",
        action: [
          "Both partners: open **Page Builder**. In **Pages**, select **Home** → **Workshop practice** → **Demo**, or your assigned **Pair** page.",
          "The **Author** and **Approver** use different **Sitecore Cloud** accounts. To confirm your account, choose **SitecoreAI Dashboard** at the top left and check its profile menu, then return to **Page Builder**. Both partners select the same practice page and **English** version.",
          "Open the top **Content** tab and record the exact **Summary**. You will restore this wording at the end.",
        ],
        expected: [
          "Both partners see the same page and content. The page uses **Liberty Mutual Workshop Review**.",
          "A new practice page starts in **Draft**. A page used previously may show **Approved** or **Live**.",
        ],
      },
      {
        title: "Author: edit your assigned page and preview the change",
        action: [
          "As the **Author**, select the main portal's **Home** page and inspect the **Content** tab without changing anything. Then return to your assigned page under **Workshop practice**.",
          "If the page shows **Live** or **Approved**, open the version selector, choose **Create version**, leave the optional version name blank and select **Create**. If it already shows **Draft**, keep that version.",
          "After creating a version, reopen the version selector and select the newest **Draft**. Wait until the header shows **Draft Version [number]** and **Summary** has reloaded before continuing.",
          "In your practice page's **Content** tab, add this sentence to **Summary**: Our team is preparing this resource for the next client conversation.",
          "Click outside **Summary** and wait for **Saved**. Open the **Editor** tab to see the revised summary on the page.",
        ],
        expected: [
          "The main portal's **Home** content is read-only for this role; your assigned practice page can be edited.",
          "The saved wording appears in the page preview. Saving the draft does not publish it.",
          "Creating a **Draft** preserves the previous approved version. Your new wording reaches the live page only after review and approval.",
          "The **Author** can **Submit** the draft but cannot **Approve** it.",
        ],
      },
      {
        title: "Author: submit the draft for review",
        action: [
          "Choose **Actions** → **Submit**. In the **Comment** dialog, enter Please review the new summary sentence, then select **Submit**.",
          "Tell your partner the practice page and **English** version you submitted.",
        ],
        expected: [
          "The page moves from **Draft** to **Awaiting approval**.",
          "The **Approver** now has a submitted version to review; the **Author** does not have the **Approve** action.",
        ],
      },
      {
        title: "Approver: request a specific revision",
        action: [
          "As the **Approver**, refresh the same page in **Page Builder** and select the submitted **English** version. Open **Content** and read **Summary**.",
          "Choose **Actions** → **Return to author**. In the **Comment** dialog, enter Please change preparing to reviewing, then select **Submit**.",
          "Tell your partner the requested change. **Author**: refresh the same page and version.",
        ],
        expected: [
          "The **Approver** has **Approve** and **Return to author** actions for the submitted page.",
          "Choosing **Return to author** moves that version back to **Draft** for revision.",
        ],
      },
      {
        title: "Author: revise and resubmit",
        action: [
          "As the **Author**, open **Content** → **Summary**. Change the added sentence to Our team is reviewing this resource for the next client conversation. Click outside the field and wait for **Saved**.",
          "Choose **Actions** → **Submit**. In the **Comment** dialog, enter Updated the summary as requested, then select **Submit**.",
        ],
        expected: [
          "The revised version returns to **Awaiting approval** for the **Approver** to review.",
          "The draft has changed without a code commit or a frontend deployment.",
        ],
      },
      {
        title: "Approver: approve the wording and trigger publication",
        action: [
          "As the **Approver**, refresh the submitted page, open **Content** and review the corrected **Summary**.",
          "Choose **Actions** → **Approve**. In the **Comment** dialog, enter Approved for publication, then select **Submit**.",
          "Confirm the page becomes **Approved**. The workflow's **Auto Publish** action publishes this page in **English** automatically. Wait for publication; the page may show **Approved** before changing to **Live**.",
        ],
        expected: [
          "Approval triggers publication of the approved page in **English**, without publishing child pages or related items.",
          "No separate **Publish** action, Git commit or frontend deployment is needed for this content change.",
        ],
      },
      {
        title: "Verify the approved wording on the live page",
        action: [
          "Open **Demo live page** or the **Pair** live-page link above that matches your assigned page. If prompted, sign into the **Agent Portal** using your assigned portal account, then open the same practice-page link again; sign-in takes you to **My workspace**.",
          "Compare the live summary with the wording your partner approved. Refresh the live page after publication if necessary.",
        ],
        expected: [
          "The live page shows the approved summary. The **Page Builder** preview alone does not establish that publication completed.",
          "The two roles have completed a review cycle: the **Author** prepared and revised the content, and the **Approver** returned and approved it.",
        ],
      },
    ],
    cleanup: {
      title: "Restore your page through the same workflow",
      body: [
        "As the **Author**, refresh your practice page. Open the version selector, choose **Create version**, leave the optional version name blank and select **Create**. Reopen the selector and select the newest **Draft**; wait for **Draft Version [number]** in the header and for **Summary** to reload.",
        "In **Content** → **Summary**, restore the original wording recorded at the start. Click outside the field and wait for **Saved**. Choose **Actions** → **Submit**, enter a restoration note in **Comment**, then select **Submit**.",
        "As the **Approver**, refresh **Page Builder** and select the newly submitted **English** version. Review the restored **Summary**. Choose **Actions** → **Approve**, add a **Comment** and select **Submit**. Wait for automatic publication, then verify the live page shows the original wording.",
        "Leave other pairs' pages unchanged. The **Agent Portal** reviewer reset does not reset Sitecore page content or workflow.",
        "Close extra practice and preview tabs when finished.",
      ],
    },
    related: ["resource-content-workflow", "marketing-capability-boundaries"],
    sourceSlides: [],
  },
];
