import type { WorkshopGuide } from "../types";

export const governanceGuides: WorkshopGuide[] = [
  {
    slug: "author-approver-workflow",
    accountScope: "presenter",
    audience: "marketing",
    category: "Content governance",
    title: "Review and publish content",
    summary:
      "**Presenter demonstration:** Watch separate **Author** and **Approver** accounts move one page through **Draft**, **Awaiting approval**, and **Approved**, then verify the published result.",
    outcome:
      "You see how page permissions and publishing approval let marketers manage content with clear responsibilities, all within **Page Builder**.",
    personas: ["Presenter: Sitecore Author", "Presenter: Sitecore Approver"],
    prerequisites: [
      "Attendees follow the presenters’ screens. No attendee pairing or authoring-role assignment is needed for this demonstration.",
      "Presenters use the existing non-administrator accounts: **tohams+author@gmail.com** for **Author** and **tohams+approver@gmail.com** for **Approver**. Both belong to **Safeco Insurance Company of America POC**. Use separate computers or separate browser profiles so signing in as one role does not replace the other role’s session.",
      "Both presenters open **Liberty Mutual Agent Portal** in **Page Builder**, use **English**, and keep **Default editing host** selected. Use only **Home** > **Workshop practice** > **Demo**. This page is prepared for the demonstration; it does not need to be copied.",
      "Change **Summary** only, and copy its complete starting text into a local note. Leave images, component placement, and **Resource metadata** unchanged. Complete the restoration at the end so the live page returns to its original wording.",
    ],
    links: [
      {
        label: "Open Page Builder",
        href: "https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb",
      },
      {
        label: "Open the Demo live page",
        href: "https://liberty-mutual-agent-portal.vercel.app/workshop-practice/pair-01",
      },
    ],
    steps: [
      {
        title: "Author: open the practice page",
        action: [
          "In the **Author** browser, open **Page Builder** with **tohams+author@gmail.com**. Check **Liberty Mutual Agent Portal**, **English**, and **Default editing host** in the toolbar.",
          "In the left pane, click the page-shaped **Pages** icon. Expand **Home** > **Workshop practice** and select **Demo**. Click **Content** in the top navigation, find **Summary**, and copy its complete starting text into a local note.",
          "Read the workflow status in the page header. If it shows **Live** or **Approved**, open the version dropdown above the preview, choose **Create version**, leave the optional name blank, and click **Create**. Reopen the dropdown and select the newest **Draft**. If the page is already in **Draft**, use that version. If it is **Awaiting approval**, finish the existing review before adding another change.",
        ],
        expected: [
          "The **Demo** page uses **Liberty Mutual Workshop Review**. The selected **English** version is in **Draft**, ready for an author to edit.",
          "Creating a version preserves the earlier approved content on the same page. The dedicated **Demo** page separates this presentation from other practice content.",
        ],
      },
      {
        title: "Author: edit and preview the summary",
        action: [
          "Click the main **Home** item and read its fields in **Content**. Show that they are read-only for this scoped **Author** account, then return to **Home** > **Workshop practice** > **Demo** and select the **Draft** version.",
          "In **Content**, keep the original **Summary** and append: Our team is preparing this resource for the next client conversation. Click outside the field and wait for **Saved**.",
          "Click **Editor** and read the summary directly below the page title. Confirm the added sentence appears in the preview.",
        ],
        expected: [
          "The **Author** can edit the **Demo** page while the main **Home** page remains read-only. Page permissions determine which content this account can change.",
          "The draft preview shows the saved wording. The **Author** can submit it for review but cannot approve it.",
        ],
        note: "**What to notice:** Edit a field, let it autosave, see it on the page, and submit it for review within **Page Builder**. The familiar draft-and-approval process stays close to the page being edited.",
      },
      {
        title: "Author: submit for approval",
        action: [
          "Keep the edited **Draft** selected. Open **Actions** in the page header and choose **Submit**. Enter Please review the new summary sentence in **Comment**, then click **Submit** in the dialog.",
          "Read the selected version number in the header so the **Approver** can select the same **English** version of **Demo**.",
        ],
        expected: [
          "The page moves from **Draft** to **Awaiting approval**. The live page continues to show its previously approved content.",
        ],
      },
      {
        title: "Approver: review and approve",
        action: [
          "In the separate **Approver** browser, open **Page Builder** with **tohams+approver@gmail.com**. Select **Home** > **Workshop practice** > **Demo**, refresh, and select the same **English** version submitted by the **Author**.",
          "Confirm **Awaiting approval** in the header. Open **Content** and compare **Summary** with the wording shown by the **Author**.",
          "Open **Actions**. Point out **Approve** and **Return to author**, then choose **Approve**. Enter Approved for publication in **Comment** and click **Submit**.",
          "Confirm **Approved**. The configured **Auto Publish** action publishes this page in **English** automatically. Allow publication to finish; the page may show **Approved** before changing to **Live**.",
        ],
        expected: [
          "The **Approver** has the review actions that the **Author** lacks. **Return to author** would return the version to **Draft** if a revision were needed.",
          "Approval publishes the approved page in **English**, without publishing child pages or related items. No frontend-code deployment is required.",
        ],
      },
      {
        title: "See the approved content in the portal",
        action: [
          "Click **Open the Demo live page** above. If asked to sign in, use the presenters’ **Daniel** portal login for workshop number **01** and password **Sitecore**. After sign-in, open the same live-page link again.",
          "Read the summary below the page title. Confirm the sentence **Our team is preparing this resource for the next client conversation.** appears. Refresh after publication completes if the previous text remains.",
        ],
        expected: [
          "The agent-facing page shows the reviewed wording. The two accounts have demonstrated **Draft** → **Awaiting approval** → **Approved**, followed by automatic publication.",
        ],
      },
    ],
    cleanup: {
      title: "Restore and republish the original summary",
      body: [
        "In the **Author** browser, return to **Demo** in **English**. Use the version selector to **Create version**, leave its optional name blank, and click **Create**. Reopen the selector and select the newest **Draft**; wait for its fields to reload.",
        "In **Content**, replace **Summary** with the exact original text recorded before the demonstration. Click outside the field and wait for **Saved**. Choose **Actions** > **Submit**, enter Restored the starting summary in **Comment**, and click **Submit**. Record this new version number.",
        "In the **Approver** browser, refresh **Demo**, select that new **English** version, and confirm **Awaiting approval**. Compare **Summary** with the original note. Choose **Actions** > **Approve**, add a restoration **Comment**, and click **Submit**.",
        "Wait for automatic publication, then refresh **Open the Demo live page** and verify the original summary is visible. Both submission and approval are needed to restore the live content; the demonstration’s versions remain in its history.",
        "Resetting a workshop number affects portal activity, not CMS content. Restore this page through the workflow above. Close extra **Page Builder** and live-page tabs when finished.",
      ],
    },
    related: ["campaign-composition", "resource-content-workflow"],
    sourceSlides: [],
  },
];
