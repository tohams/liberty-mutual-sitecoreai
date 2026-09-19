import type { WorkshopGuide } from "../types";

export const governanceGuides: WorkshopGuide[] = [
  {
    slug: "author-approver-workflow",
    accountScope: "presenter",
    audience: "marketing",
    category: "Content governance",
    title: "Review and publish content",
    summary:
      "**Presenter demonstration:** Watch a marketer prepare a page and a reviewer approve it before agents see the change. The presenters use two separate accounts in **Page Builder**, SitecoreAI’s visual page-editing tool, to show each person’s responsibilities.",
    outcome:
      "You will recognize the difference between saving a draft and publishing a change to the Agent Portal. You will also see how page permissions limit which pages an author can edit and how an approval workflow controls when the change becomes visible to agents.",
    personas: ["Presenter: Sitecore Author", "Presenter: Sitecore Approver"],
    prerequisites: [
      "Attendees follow the presenters’ screens. No attendee pairing or authoring-role assignment is needed for this demonstration.",
      "The **Author** prepares content and submits it for review. The **Approver** reviews the submitted content and either approves it or returns it for revision. These are SitecoreAI editing roles, separate from the fictional agent logins used to browse the portal.",
      "This page follows the **Liberty Mutual Workshop Review** workflow: **Draft** means a version is being prepared; **Awaiting approval** means it has been submitted for review; **Approved** means the reviewer has accepted it. For this configured workflow, approval also starts publication. **Live** indicates the published page in Page Builder; publication can take time after approval.",
      "Presenters use the existing non-administrator accounts: **tohams+author@gmail.com** for **Author** and **tohams+approver@gmail.com** for **Approver**. Both belong to **Safeco Insurance Company of America POC**, the SitecoreAI organization containing this portal. Use separate computers or separate browser profiles so signing in as one role does not replace the other role’s session.",
      "Both presenters open [**Page Builder**](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb), select **Liberty Mutual Agent Portal**, use **English**, and keep **Default editing host** selected. The editing host supplies the website preview; **Default editing host** uses the shared, hosted portal rather than a developer’s computer.",
      "Use only **Home** > **Workshop practice** > **Demo** in the page tree, the left-hand list of pages. **Demo** is a prepared practice page for this presentation, so it does not need to be copied. A **version** is a saved revision of that same page; creating a draft version lets the published wording remain visible while a new revision is prepared.",
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
          "In the **Author** browser, open [**Page Builder**](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb) with **tohams+author@gmail.com**. Check **Liberty Mutual Agent Portal**, **English**, and **Default editing host** in the toolbar.",
          "In the left pane, click the page-shaped **Pages** icon to display the page tree. Expand **Home** > **Workshop practice** and select **Demo**. Click **Content** in the top navigation to display the page’s editable fields. Find **Summary**, the introductory text shown beneath the page title, and copy its complete starting text into a local note so it can be restored afterward.",
          "Read the workflow status in the page header. If it shows **Live** or **Approved**, open the version dropdown above the preview, choose **Create version**, leave the optional name blank, and click **Create**. Reopen the dropdown and select the newest **Draft**. If the page is already in **Draft**, use that version.",
          "If the page instead shows **Awaiting approval**, ask the **Approver** presenter to open the same **Demo** page and **English** version in their separate browser. They choose **Actions** > **Return to author**, enter Return to draft for the workshop in **Comment**, and click **Submit**. Refresh in the **Author** browser and confirm **Draft** before continuing. This returns the existing revision for editing without publishing it.",
        ],
        expected: [
          "The header identifies **Demo**, the selected **English** version, and the **Draft** state. These identify the page revision that will move through review; both presenters must work with this same revision.",
          "Creating a version preserves the earlier approved content on the same page. The dedicated **Demo** page separates this presentation from other practice content.",
        ],
      },
      {
        title: "Author: edit and preview the summary",
        action: [
          "Click the main **Home** item and read its fields in **Content**. Show that they are read-only for this **Author** account: this account has permission to edit the practice page, not the portal’s home page. Return to **Home** > **Workshop practice** > **Demo** and select the **Draft** version.",
          "In **Content**, keep the original **Summary** and append: Our team is preparing this resource for the next client conversation. Click outside the field and wait for **Saved**.",
          "Click **Editor** to return to the visual page preview. Read the summary directly below the page title and confirm the added sentence appears. This preview displays the selected draft so the author can check how the wording will look before submitting it.",
        ],
        expected: [
          "The **Author** can edit the **Demo** page while the main **Home** page remains read-only. Page permissions determine which content this account can change.",
          "**Saved** means SitecoreAI has retained the draft edit. It does not mean agents can see that edit on the live portal. The **Author** can submit it for review but cannot approve it.",
        ],
        note: "**What to notice:** Edit a field, let it autosave, see it on the page, and submit it for review within **Page Builder**. The familiar draft-and-approval process stays close to the page being edited.",
      },
      {
        title: "Author: submit for approval",
        action: [
          "Keep the edited **Draft** selected. Open **Actions** in the page header and choose **Submit** to request review. Enter Please review the new summary sentence in **Comment**, then click **Submit** in the dialog to complete that request.",
          "Read the selected version number in the header so the **Approver** can select the same **English** version of **Demo**.",
        ],
        expected: [
          "The header changes from **Draft** to **Awaiting approval**. This is a review request, not publication: the live page continues to show its previously approved content.",
        ],
      },
      {
        title: "Approver: review and approve",
        action: [
          "In the separate **Approver** browser, open [**Page Builder**](https://pages.sitecorecloud.io/editor?tenantName=scaipocusem400b-sitecoreai950c-demo4418&sc_site=liberty-mutual-agent-portal&organization=org_XqL3u1MSNVuubOTb) with **tohams+approver@gmail.com**. Select **Home** > **Workshop practice** > **Demo**, refresh, and select the same **English** version submitted by the **Author**.",
          "Confirm **Awaiting approval** in the header. Open **Content**, find **Summary**, and verify the added sentence against the wording shown by the **Author**. This is the review decision: the approver should inspect the submitted change before accepting it.",
          "Open **Actions**. Point out **Approve** and **Return to author**, then choose **Approve**. Enter Approved for publication in **Comment** and click **Submit**.",
          "Confirm **Approved**. This workflow includes **Auto Publish**, an action configured to publish the approved page in **English** automatically. Publishing makes the approved content available to the live website. Allow publication to finish; the page may show **Approved** before changing to **Live**.",
        ],
        expected: [
          "The **Approver** has the review actions that the **Author** lacks. **Return to author** would return the version to **Draft** if a revision were needed.",
          "The approved wording is published for this page in **English**. Other pages and related content are outside this action. The website application already knows how to display **Summary**, so this content change requires no code change or application deployment.",
        ],
      },
      {
        title: "See the approved content in the portal",
        action: [
          "Open [**the Demo live page**](https://liberty-mutual-agent-portal.vercel.app/workshop-practice/pair-01) to check the result as an agent, outside Page Builder’s authoring preview. If asked to sign in, enter **daniel.01** and password **Sitecore**. This is the presenters’ fictional agent login; the Author and Approver credentials are used only in SitecoreAI. After sign-in, reopen [**the Demo live page**](https://liberty-mutual-agent-portal.vercel.app/workshop-practice/pair-01).",
          "Read the summary below the page title. Confirm the sentence **Our team is preparing this resource for the next client conversation.** appears. Refresh after publication completes if the previous text remains.",
        ],
        expected: [
          "The agent-facing page now shows the reviewed wording. Seeing the sentence here verifies publication; seeing it only in the draft preview would not. The two accounts have demonstrated **Draft** → **Awaiting approval** → **Approved**, followed by automatic publication.",
        ],
      },
    ],
    cleanup: {
      title: "Restore and republish the original summary",
      body: [
        "In the **Author** browser, return to **Demo** in **English**. Use the version selector to **Create version**, leave its optional name blank, and click **Create**. Reopen the selector and select the newest **Draft**; wait for its fields to reload.",
        "In **Content**, replace **Summary** with the exact original text recorded before the demonstration. Click outside the field and wait for **Saved**. Choose **Actions** > **Submit**, enter Restored the starting summary in **Comment**, and click **Submit**. Record this new version number.",
        "In the **Approver** browser, refresh **Demo**, select that new **English** version, and confirm **Awaiting approval**. Compare **Summary** with the original note. Choose **Actions** > **Approve**, add a restoration **Comment**, and click **Submit**.",
        "Wait for automatic publication, then open or refresh [**the Demo live page**](https://liberty-mutual-agent-portal.vercel.app/workshop-practice/pair-01) and verify the original summary is visible. Both submission and approval are needed to restore the live content; the demonstration’s versions remain in its history.",
        "The workshop-number reset restores sample saved work and activates fresh profiles for the fictional agents; it does not restore pages edited in SitecoreAI. Restore this page through the submission and approval steps in this cleanup section so the next presentation starts with the same wording. Close extra **Page Builder** and live-page tabs when finished.",
      ],
    },
    related: ["campaign-composition", "resource-content-workflow"],
    sourceSlides: [],
  },
];
