import type { WorkshopGuide } from "../types";

export const governanceGuides: WorkshopGuide[] = [
  {
    slug: "author-approver-workflow",
    audience: "marketing",
    category: "Content governance",
    title: "Author and approver: review and publish content together",
    summary:
      "**Paired hands-on:** Edit your pair’s separate practice page in **Page Builder**. One partner writes as the **Author**, and the other reviews as the **Approver**. Complete a revision cycle, publish the approved wording, and restore the page.",
    outcome:
      "See how page permissions limit the content an author can change, while separate **Author** and **Approver** roles control review and approval. Verify publication through the configured approval workflow.",
    duration: "20–25 minutes for a pair",
    personas: ["Sitecore Author", "Sitecore Approver"],
    prerequisites: [
      "Each partner needs an accepted **Sitecore Cloud** invitation to **Safeco Insurance Company of America POC** and access to its **SitecoreAI** application. Use the invited email account for **Page Builder**. You will use an **Agent Portal** persona later to inspect the published page.",
      "Before starting, ask the **Sitecore workshop team** to confirm three things for each partner: the **Sitecore Cloud** email account, the **Author** or **Approver** role installed for that account, and the shared practice-page name. Attendee roles and practice pairs are pending assignment; follow the presenters until the team has completed yours. Use a non-administrator account so you experience the permissions of your **Author** or **Approver** role.",
      "The practice pages are already prepared under **Home** → **Workshop practice**. Presenters use **Demo**; the team allocates each attendee pair a different page from **Pair 02** through **Pair 09**. Both partners use only their pair’s page, keeping their work separate from other pairs. Use that page as provided; no duplication is needed. The team provides this authoring pair separately from your portal reviewer number in **Attendee assignments**.",
      "Each partner uses their own computer. If demonstrating both roles on one computer, use separate **Chrome** profiles; two tabs in the same browser profile share the same Sitecore login. In **Page Builder**, select **Liberty Mutual Agent Portal**, use **English**, and keep **Default** selected as the editing host to preview the shared hosted site.",
      "Change **Summary** only, and record its starting wording before editing. Leave images, component placement, and **Resource metadata** unchanged. Reserve time for the final restoration cycle so the live page returns to its starting wording.",
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
          "Both partners: click **Open Page Builder** above. If asked to sign in, use the **Sitecore Cloud** email account confirmed by the **Sitecore workshop team**. Select **Safeco Insurance Company of America POC** if prompted. In Page Builder’s top toolbar, check the site selector for **Liberty Mutual Agent Portal** and the language selector for **English**. Above the page preview, keep **Default editing host** selected.",
          "To check your account, choose **SitecoreAI Dashboard** at the top left. On that dashboard, click the profile avatar at the upper right and read the email address. It must match the account assigned your **Author** or **Approver** role. Use **Open Page Builder** above again to return.",
          "In Page Builder’s left pane, click the page-shaped **Pages** icon. Expand **Home** > **Workshop practice** in the tree, then click your confirmed page: **Demo** for presenters, or your assigned **Pair 02** through **Pair 09**. Open the version dropdown above the preview, immediately left of **Default editing host**, and read its selected version number to your partner. Both browsers must show the same page and **English** version.",
          "Click **Content** in the top navigation. In the selected page’s fields, locate **Summary** and copy all of its text into a local note. Keep this note for the final restoration and publication.",
        ],
        expected: [
          "Both partners see the same page name, version number, and **Summary**. These practice pages use the configured **Liberty Mutual Workshop Review** workflow.",
          "A new practice page starts in **Draft**. A previously completed page may show **Approved** or **Live**. If it is already **Awaiting approval**, ask the **Sitecore workshop team** to identify the unfinished review before adding another change.",
        ],
      },
      {
        title: "Author: create a draft and preview one summary change",
        action: [
          "The partner with the **Author** role: click the main **Home** item in the content tree and read its fields in **Content**. Check that its content is read-only. Return to **Home** > **Workshop practice** > your pair’s page to compare it with the content your role permits you to edit.",
          "Read the workflow status in the page header. If it shows **Live** or **Approved**, open the version dropdown above the preview, choose **Create version**, leave the optional name blank, and click **Create**. If the status is already **Draft**, keep that version.",
          "After creating a version, reopen the version selector and select the newest **Draft**. Wait until the header shows **Draft Version [number]** and **Summary** has reloaded. Note the actual version number; your partner will review this version.",
          "In your practice page's **Content** tab, keep the original **Summary** and append this sentence: Our team is preparing this resource for the next client conversation.",
          "Click outside **Summary** and wait for the **Saved** checkmark. Click **Editor** in the top navigation. In the page preview, read the summary below the page title and confirm that it includes your added sentence.",
        ],
        expected: [
          "The main portal's **Home** content is read-only for the scoped **Author** role; your pair's practice page can be edited. If these permissions differ, ask the **Sitecore workshop team** to check your account and pair assignment before continuing.",
          "The saved wording appears in the page preview. The draft is ready for review; publication follows approval.",
          "Creating a **Draft** adds a version to your pair’s existing page and preserves its previous approved version. It does not create a separate attendee copy; the assigned pair page keeps your work separate from other pairs. Your new wording reaches that page’s live URL only after review and approval.",
          "The **Author** can **Submit** the draft but cannot **Approve** it.",
        ],
        note: "**What to notice:** If you know **Sitecore XP**, focus on the authoring experience here: edit a field, let it autosave, see it on the page, and submit it for review within **Page Builder**. The familiar draft-and-approval process stays close to the page being edited.",
      },
      {
        title: "Author: submit the draft for review",
        action: [
          "As the **Author**, keep the edited **Draft** selected and open **Actions** in the page header. Choose **Submit**. In the dialog’s **Comment** field, enter Please review the new summary sentence, then click **Submit** in that dialog to send the saved version for review.",
          "Tell the **Approver** the exact practice-page name and version number shown in the header. Both partners continue using **English**.",
        ],
        expected: [
          "The page moves from **Draft** to **Awaiting approval**.",
          "The **Approver** now has a submitted version to review using the page name and version number provided by the **Author**.",
        ],
      },
      {
        title: "Approver: request a specific revision",
        action: [
          "The partner with the **Approver** role: refresh the same practice page in **Page Builder**. Open the version dropdown above the preview and select the number supplied by the **Author**. Confirm **English** and status **Awaiting approval**. Click the top **Content** tab, locate **Summary**, and read the sentence the Author added.",
          "In the page header, open **Actions** and choose **Return to author**. In the dialog’s **Comment** field, enter Please change preparing to reviewing, then click **Submit**.",
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
          "As the **Author**, keep the returned **Draft** selected. Click **Content** in the top navigation and locate **Summary**. Change only the added sentence to Our team is reviewing this resource for the next client conversation. Click outside the field and wait for **Saved**.",
          "Open **Actions** in the page header and choose **Submit**. Enter Updated the summary as requested in the dialog’s **Comment** field, then click **Submit**.",
          "Tell the **Approver** that the revision is ready, and repeat the practice-page name and version number so your partner reviews the same content.",
        ],
        expected: [
          "The revised version returns to **Awaiting approval** for the **Approver** to review.",
          "The content revision is saved in SitecoreAI; the frontend application code remains unchanged.",
        ],
      },
      {
        title: "Approver: approve the wording and trigger publication",
        action: [
          "As the **Approver**, refresh the same practice page. Open the version dropdown above the preview and select the version the **Author** resubmitted. Confirm **English** and **Awaiting approval**, then click the top **Content** tab and check the added **Summary** sentence for reviewing.",
          "Open **Actions** in the page header and choose **Approve**. Enter Approved for publication in the dialog’s **Comment** field, then click **Submit**.",
          "Confirm the page becomes **Approved**. The workflow's **Auto Publish** action publishes this page in **English** automatically. Wait for publication; the page may show **Approved** before changing to **Live**.",
        ],
        expected: [
          "Approval triggers publication of the approved page in **English**, without publishing child pages or related items.",
          "The configured workflow handles publication automatically after **Approve**, while the frontend application code remains unchanged.",
        ],
      },
      {
        title: "Verify the approved wording on the live page",
        action: [
          "Use the live-page links above to open the exact page your pair edited: **Demo live page** for the presenters, or **Pair 02 live page** through **Pair 09 live page** matching your practice-page name. These links open the published portal so you can check the result as an agent.",
          "If the portal asks you to sign in, use **daniel.01** and the workshop portal password **Sitecore**. The username shown in this guide uses the reviewer number from your workshop sign-in; confirm that number against your name in **Attendee assignments**. After sign-in opens **My workspace**, open your practice-page link again. Continue using your **Sitecore Cloud** account for authoring and this portal account for live checks.",
          "On the published page, read the summary directly below the title. Compare its added sentence with your partner’s approved wording: Our team is reviewing this resource for the next client conversation. If the previous text remains, refresh after publication completes.",
        ],
        expected: [
          "The live page shows the approved summary, confirming that the reviewed wording has reached the published portal.",
          "The two roles have completed a review cycle: the **Author** prepared and revised the content, and the **Approver** returned and approved it.",
        ],
      },
    ],
    cleanup: {
      title: "Restore and republish the original summary",
      body: [
        "Both partners complete this cleanup before leaving. Restore the original live wording on the same practice page in **English**. The exercise's versions remain available in its history.",
        "As the **Author**, refresh your practice page. Open the version selector, choose **Create version**, leave the optional version name blank, and select **Create**. Reopen the selector and select the newest **Draft**; wait for **Draft Version [number]** in the header and for **Summary** to reload. Give this new version number to the **Approver**.",
        "Click the top **Content** tab and replace **Summary** with the original text saved in your note. Click outside the field and wait for **Saved**. Open **Actions** in the page header > **Submit**, enter Restored the starting summary in **Comment**, and click **Submit** in the dialog.",
        "As the **Approver**, refresh **Page Builder** and select the new version number supplied by the **Author**. Confirm **English** and **Awaiting approval**, then compare **Summary** with the original note. Choose **Actions** → **Approve**, add a restoration **Comment**, and select **Submit**. Wait for automatic publication, then refresh the same live-page link and verify the original wording is visible.",
        "Complete both the **Author** submission and **Approver** approval to restore the live page. If either partner cannot finish, give the **Sitecore workshop team** the page name, version number, and original summary so they can complete the restoration.",
        "Leave other pairs' pages unchanged. Use the workflow above to restore this CMS page. **Reset a reviewer number** applies to portal personas and saved work, so this content exercise needs no reviewer reset.",
        "Close the extra practice-page and **Page Builder** preview tabs when finished. Keep the workshop guide open for the next exercise.",
      ],
    },
    related: ["resource-content-workflow", "marketing-capability-boundaries"],
    sourceSlides: [],
  },
];
