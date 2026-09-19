import type { WorkshopGuide } from "../types";

export const governanceGuides: WorkshopGuide[] = [
  {
    slug: "author-approver-workflow",
    audience: "marketing",
    category: "Content governance",
    title: "Author and approver: review and publish content together",
    summary:
      "Use two **Sitecore Cloud** accounts to edit one practice page in **Page Builder**: one partner writes as the **Author**, and the other reviews as the **Approver**. Complete a revision cycle, publish the approved wording, and restore the page.",
    outcome:
      "See how page permissions limit the content an author can change, while separate **Author** and **Approver** roles control review and approval. Verify that approval publishes the content without a code release.",
    duration: "20–25 minutes for a pair",
    personas: ["Sitecore Author", "Sitecore Approver"],
    prerequisites: [
      "Each partner needs an accepted **Sitecore Cloud** invitation to **Safeco Insurance Company of America POC** and access to its **SitecoreAI** application. Use the email account that received that invitation. Your **Agent Portal** persona login does not open **Page Builder**.",
      "Before starting, ask the **Sitecore workshop team** to confirm three things for each partner: the **Sitecore Cloud** email account, the **Author** or **Approver** role installed for that account, and the shared practice-page name. Attendee roles and practice pairs are pending assignment; follow the presenters until the team has completed yours. Do not use an administrator account for this exercise, because its permissions bypass the role restrictions being demonstrated.",
      "The presenters use **Demo**. The team allocates each attendee pair one page named **Pair 02** through **Pair 09** under **Home** → **Workshop practice**. Both partners use that same page. **Attendee assignments** lists portal reviewer numbers, not authoring pairs; a portal suffix such as **.02** does not determine your practice page.",
      "Each partner uses their own computer. If demonstrating both roles on one computer, use separate **Chrome** profiles; two tabs in the same browser profile share the same Sitecore login. In **Page Builder**, select **Liberty Mutual Agent Portal**, use **English**, and keep **Default** selected as the editing host. **Default** previews the shared hosted site; a localhost editing host is unnecessary for this content-only exercise.",
      "Change **Summary** only, and record its starting wording before editing. Leave images, component placement, and **Resource metadata** unchanged. Reserve time for the final restoration cycle so the live page does not retain your practice text.",
      "If your partner is unavailable, tell the **Sitecore workshop team** before starting. A presenter can use the demonstration **Approver** account to review an **Author** participant's page; an **Approver** participant still needs an **Author** to prepare and submit content.",
    ],
    links: [
      {
        label: "Attendee assignments and authoring access",
        href: "https://liberty-mutual-agent-portal.vercel.app/workshops/attendees",
      },
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
        title: "Both partners: open the confirmed practice page",
        action: [
          "Both partners: use **Open Page Builder** above. If sign-in is required, use the **Sitecore Cloud** email account confirmed by the **Sitecore workshop team**. Select **Safeco Insurance Company of America POC**, if prompted, then verify **Liberty Mutual Agent Portal**, **English**, and the **Default** editing host.",
          "To check which account is signed in, choose **SitecoreAI Dashboard** at the top left and inspect its profile menu. Confirm that the email matches the account the team gave your **Author** or **Approver** role, then return to **Page Builder**.",
          "In **Pages**, select **Home** → **Workshop practice**, then the exact page name the team confirmed for your pair. Presenters select **Demo**; attendees select their confirmed **Pair 02** through **Pair 09**. Read the page name and version number to your partner so both browsers display the same **English** version.",
          "Open the top **Content** tab and copy the complete **Summary** into a local note. Keep it until cleanup is complete; it is the wording you will restore and republish.",
        ],
        expected: [
          "Both partners see the same page name, version number, and **Summary**. These practice pages use the configured **Liberty Mutual Workshop Review** workflow.",
          "A new practice page starts in **Draft**. A previously completed page may show **Approved** or **Live**. If it is already **Awaiting approval**, ask the **Sitecore workshop team** to identify the unfinished review before adding another change.",
        ],
      },
      {
        title: "Author: create a draft and preview one summary change",
        action: [
          "The partner with the **Author** role: select the main portal's **Home** page and inspect the **Content** tab without changing anything. Return to the practice page you and your partner opened in the previous step. This compares a page outside your editing scope with the page you can change.",
          "If the page shows **Live** or **Approved**, open the version selector, choose **Create version**, leave the optional version name blank, and select **Create**. If it already shows **Draft**, keep that version.",
          "After creating a version, reopen the version selector and select the newest **Draft**. Wait until the header shows **Draft Version [number]** and **Summary** has reloaded. Note the actual version number; your partner will review this version.",
          "In your practice page's **Content** tab, keep the original **Summary** and append this sentence: Our team is preparing this resource for the next client conversation.",
          "Click outside **Summary** and wait for **Saved**. Open the **Editor** tab to see the revised summary on the page.",
        ],
        expected: [
          "The main portal's **Home** content is read-only for the scoped **Author** role; your pair's practice page can be edited. If these permissions differ, ask the **Sitecore workshop team** to check your account and pair assignment before continuing.",
          "The saved wording appears in the page preview. Saving the draft does not publish it.",
          "Creating a **Draft** preserves the previous approved version. Your new wording reaches the live page only after review and approval.",
          "The **Author** can **Submit** the draft but cannot **Approve** it.",
        ],
        note: "**What to notice:** If you know **Sitecore XP**, focus on the authoring experience here: edit a field, let it autosave, see it on the page, and submit it for review within **Page Builder**. The familiar draft-and-approval process stays close to the page being edited.",
      },
      {
        title: "Author: submit the draft for review",
        action: [
          "As the **Author**, keep the edited **Draft** selected and choose **Actions** → **Submit**. In the **Comment** dialog, enter Please review the new summary sentence, then select **Submit**. This sends the saved version for review; it does not publish the page.",
          "Tell the **Approver** the exact practice-page name and version number shown in the header. Both partners continue using **English**.",
        ],
        expected: [
          "The page moves from **Draft** to **Awaiting approval**.",
          "The **Approver** now has a submitted version to review; the **Author** does not have the **Approve** action.",
        ],
      },
      {
        title: "Approver: request a specific revision",
        action: [
          "The partner with the **Approver** role: refresh the practice page in **Page Builder**. Use the version selector to choose the version number the **Author** provided, and confirm **English** and **Awaiting approval**. Open **Content** and read the added sentence in **Summary**.",
          "Choose **Actions** → **Return to author**. In the **Comment** dialog, enter Please change preparing to reviewing, then select **Submit**.",
          "Tell the **Author** to replace preparing with reviewing in the sentence they added. **Author**: refresh that same page and version, then confirm the header shows **Draft** before revising it.",
        ],
        expected: [
          "The **Approver** has **Approve** and **Return to author** actions for the submitted page.",
          "Choosing **Return to author** moves that version back to **Draft** for revision.",
        ],
      },
      {
        title: "Author: revise and resubmit",
        action: [
          "As the **Author**, keep the returned **Draft** selected and open **Content** → **Summary**. Change only the added sentence to Our team is reviewing this resource for the next client conversation. Click outside the field and wait for **Saved**.",
          "Choose **Actions** → **Submit**. In the **Comment** dialog, enter Updated the summary as requested, then select **Submit**.",
          "Tell the **Approver** that the revision is ready, and repeat the practice-page name and version number so your partner reviews the same content.",
        ],
        expected: [
          "The revised version returns to **Awaiting approval** for the **Approver** to review.",
          "The draft has changed without a code commit or a frontend deployment.",
        ],
      },
      {
        title: "Approver: approve the wording and trigger publication",
        action: [
          "As the **Approver**, refresh the same practice page and select the version number the **Author** resubmitted. Confirm **English** and **Awaiting approval**, then open **Content** and check that **Summary** contains reviewing instead of preparing.",
          "Choose **Actions** → **Approve**. In the **Comment** dialog, enter Approved for publication, then select **Submit**.",
          "Confirm the page becomes **Approved**. The workflow's **Auto Publish** action publishes this page in **English** automatically. Wait for publication; the page may show **Approved** before changing to **Live**.",
        ],
        expected: [
          "Approval triggers publication of the approved page in **English**, without publishing child pages or related items.",
          "No separate **Publish** action, Git commit, or frontend deployment is needed for this content change.",
        ],
      },
      {
        title: "Verify the approved wording on the live page",
        action: [
          "Use the live-page links above to open the exact page your pair edited: **Demo live page** for the presenters, or **Pair 02 live page** through **Pair 09 live page** matching your practice-page name. Choose the link by the practice pair, not your portal reviewer number. These links open the published portal, separate from the **Page Builder** preview.",
          "If the portal asks you to sign in, use **daniel.01** and the workshop portal password **Sitecore**. The username shown in this guide uses the reviewer number from your workshop sign-in; confirm that number against your name in **Attendee assignments**. After sign-in opens **My workspace**, open your practice-page link again. This portal login lets you view the result; it does not change your **Author** or **Approver** role.",
          "Compare the live summary with the wording your partner approved. Refresh the live page after publication if necessary.",
        ],
        expected: [
          "The live page shows the approved summary. The **Page Builder** preview alone does not establish that publication completed.",
          "The two roles have completed a review cycle: the **Author** prepared and revised the content, and the **Approver** returned and approved it.",
        ],
      },
    ],
    cleanup: {
      title: "Restore and republish the original summary",
      body: [
        "Both partners complete this cleanup before leaving. Use the same practice page and **English** language as the exercise; the goal is to restore the original live wording, not to erase the workflow's version history.",
        "As the **Author**, refresh your practice page. Open the version selector, choose **Create version**, leave the optional version name blank, and select **Create**. Reopen the selector and select the newest **Draft**; wait for **Draft Version [number]** in the header and for **Summary** to reload. Give this new version number to the **Approver**.",
        "In **Content** → **Summary**, restore the original wording recorded at the start. Click outside the field and wait for **Saved**. Choose **Actions** → **Submit**, enter a restoration note in **Comment**, then select **Submit**.",
        "As the **Approver**, refresh **Page Builder** and select the new version number supplied by the **Author**. Confirm **English** and **Awaiting approval**, then compare **Summary** with the original note. Choose **Actions** → **Approve**, add a restoration **Comment**, and select **Submit**. Wait for automatic publication, then refresh the same live-page link and verify the original wording is visible.",
        "Saving the restored draft alone does not restore the live page; the **Approver** must approve that version. If either partner cannot finish, give the **Sitecore workshop team** the page name, version number, and original summary so they can complete the restoration.",
        "Leave other pairs' pages unchanged. **Reset a reviewer number** resets portal personas and saved work; it does not restore Sitecore page content or workflow. Do not use it as a substitute for this cleanup.",
        "Close the extra practice-page and **Page Builder** preview tabs when finished. Keep the workshop guide open for the next exercise.",
      ],
    },
    related: ["resource-content-workflow", "marketing-capability-boundaries"],
    sourceSlides: [],
  },
];
