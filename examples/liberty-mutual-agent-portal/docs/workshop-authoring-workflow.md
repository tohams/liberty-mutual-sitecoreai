# Author and approver workshop

This exercise demonstrates how SitecoreAI separates content preparation from approval. Two participants work on one practice page: an **Author** changes its content and submits it, and an **Approver** reviews the change. Approval triggers publication of that page through the workflow. Each participant uses their own SitecoreAI identity, so workflow history can identify who performed each action.

This document describes the native configuration, setup tools and acceptance checks supporting the **Page Builder** workshop. The dedicated workflow, page ACLs, presenter account assignments and automatic publishing have been configured and checked. Real non-admin presenter sessions have demonstrated author edits, submission, return to Draft, resubmission, approval and automatic publication of the revised summary to the live practice page. The Author did not have the **Approve** command.

Attendee accounts have not yet been assigned workshop roles. The paired-page permissions are configured, but each attendee's access still needs the actual-session checks below after assignment. The verified presenter cycle does not establish that every attendee account or pair has passed those checks.

## Accounts and practice pages

SitecoreAI accounts are separate from the portal's synthetic agent logins. A portal username such as `daniel.01` does not grant access to Page Builder or determine an authoring role.

| Assignment | Native role | Content scope |
| --- | --- | --- |
| Presenter Author | **Liberty Mutual Workshop Author** | **Demo**, the `pair-01` page |
| Presenter Approver | **Liberty Mutual Workshop Approver** | All nine practice pages; can help any pair |
| Participant Author | **Liberty Mutual Workshop Author** | Their assigned pair page |
| Participant Approver | **Liberty Mutual Workshop Approver** | The same page as their paired Author |

**Pair 01** is reserved for the presenters. **Pairs 02–09** provide eight attendee practice pages. Workshop pair numbers are independent of portal reviewer numbers **01–15**. The presenter provides each participant's role and pair assignment; the private account roster is not stored in the repository.

The content tree is:

```text
/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home
└── workshop-practice                 Workshop practice
    ├── pair-01                       Demo
    ├── pair-02                       Pair 02
    ├── …
    └── pair-09                       Pair 09
```

Both members of a pair can read their practice page. Page permissions are configured to limit editing to the assigned pair, and workflow permissions control the available commands. The exercise changes the page's versioned **Summary** field; **Title** and **Body** are also versioned. Local **Data** items and the optional image remain read-only; the Resource Metadata Marketplace app is outside this exercise.

Practice pages use the dedicated **WorkshopPracticePage** template. It inherits directly from **PortalPage**, alongside **ResourcePage**, so practice pages are excluded from the native Search source's **ResourcePage** selection. They reuse the article rendering without becoming agent reference resources. Confirm that exclusion in the live Search results as part of acceptance.

## Workflow and expected behavior

The dedicated workflow is **Liberty Mutual Workshop Review**, under `/sitecore/system/Workflows`. It does not modify the existing **Basic Workflow** or move existing portal content into a new workflow.

| Current state | Who acts | Command | Result |
| --- | --- | --- | --- |
| **Draft** | Author | **Submit** | Moves the page to **Awaiting approval** |
| **Awaiting approval** | Approver | **Return to author** | Returns the page to **Draft** for revision |
| **Awaiting approval** | Approver | **Approve** | Moves the page to **Approved** |

**Approved** is the final workflow state. Its native **Auto Publish** action requests publication of the approved page to **Experience Edge**, in **English**. It does not publish child pages or related items. Publishing is asynchronous: entering **Approved** and seeing the updated published page are separate observations.

Neither workshop role receives **Sitecore Client Publishing**. Publication is controlled by the Approver's permission to execute **Approve** on the assigned practice page. This avoids exposing the broad manual publishing controls available through that client role.

The exercise uses **Page Builder** for editing and workflow actions:

1. Both participants open **Page Builder**, select **liberty-mutual-agent-portal**, and open **Pages → Home → Workshop practice**. Select **Demo** for presenters, or the assigned **Pair 02–09** for attendees. Use **English**, the same version and **Default editing host**.
2. If the page is **Live**, the Author opens the version selector, selects **Create version**, leaves the optional name blank and selects **Create**. Reopen the selector, select the newest **Draft**, and wait for **Draft Version [number]** and its **Summary** to finish loading before editing. On that draft, open the **Content** tab, record the original **Summary**, change it and wait for the change to save. Select **Actions → Submit**, enter a comment in the **Comment** dialog and select **Submit**. The page moves to **Awaiting approval**; the Author does not have **Approve**.
3. The Approver refreshes the same page and version, reviews the summary and selects **Actions → Return to author**. Enter a comment in the **Comment** dialog and select **Submit**. The page returns to **Draft**. The Author refreshes, revises **Summary**, waits for the save and resubmits using **Actions → Submit**.
4. The Approver refreshes the submitted version and selects **Actions → Approve**, enters a comment in the **Comment** dialog and selects **Submit**. Approval triggers publication without a separate **Publish** click. Wait for Page Builder to progress from **Approved** to **Live**.
5. Open the assigned page's portal URL in a separate tab and compare its content with the approved version. Sign in with a portal agent account if prompted. The live **Demo** page showed the approved revised summary after the actual Approver's approval. A Page Builder preview of draft content is not a published-result check.
6. For another review cycle, the Author uses **Create version** again, leaves the optional name blank and selects **Create**. Reopen the selector, select the newest **Draft** and wait for its header and **Summary** to load before editing. The previously published version remains unchanged; the new draft needs its own **Submit** and **Approve** before its changes go live. To restore the starting content, use the original summary recorded at the beginning and complete the same review cycle.

Editing a **Live** version also created a new **Draft** automatically in the verified Author session; the workshop uses explicit **Create version** so participants select the intended draft before changing content.

The role configuration prevents Authors from approving and Approvers from submitting drafts. Do not give one participant both roles. Do not demonstrate the permissions with an administrator account: administrators bypass workflow restrictions and do not represent the participant experience.

## Access prerequisites

Before assigning native roles:

1. Invite each participant to the correct Sitecore Cloud organization and grant access to this SitecoreAI application using a non-admin account.
2. Each participant accepts their invitation and opens **Page Builder** at least once. This first sign-in establishes the native user record that the assignment tool must find.
3. Check that the account does not already have administrator, developer, designer, site-management, security-management or another broad authoring role. The assignment tool refuses conflicting privileges; it does not silently remove them.
4. Assign exactly one workflow role and one pair scope. Only the presenter Approver receives **All pages**.
5. Sign out and sign in again after role assignment, then test the actual account session. Use separate browser profiles for presenter Author and Approver so their sessions remain distinct.

Cloud access, native role membership and actual page permissions are separate checks. A successful invitation or provisioning command alone does not prove that the workshop works.

### Assign roles in User Manager

The setup maintainer can assign the same scoped roles through the native interface:

1. Open **Settings → Access Management → User Manager**. Select the intended account and choose **Edit**.
2. Verify the displayed username and email, and confirm that **Administrator** is not selected.
3. Open **Member Of**, then choose **Edit**.
4. In **Available Roles**, select **Liberty Mutual Workshop Author** or **Liberty Mutual Workshop Approver**, plus the assigned **Liberty Mutual Workshop Pair NN** role, and choose **Add**. For the presenter Approver, use **Liberty Mutual Workshop All pages** instead of a pair role.
5. Confirm the role-selection dialog and save the user. Reopen **Member Of** to verify the two direct memberships. Inherited **Sitecore Client Authoring** and **Sitecore Client Users** roles are expected. Neither account should have **Sitecore Client Publishing** or **Sitecore Client Advanced Publishing**.
6. Test a fresh session as that user against the acceptance checks below.

This path is required for the presenter accounts containing a `+` email alias in the current environment: User Manager can display and update them, while the authoring GraphQL API rejects their profile/role lookup during native username validation. The assignment helper reports **requiresNativeUserManager** for that API limitation. It does not infer profile values or claim that UI-assigned roles have been verified by the API. Keep these manual assignments out of an automated attendee batch; unrelated plus-alias accounts do not prevent checks for ordinary attendee identities.

Direct membership can also be checked read-only from the **role** side of GraphQL, which works for these aliases:

```graphql
query {
  role(roleName: "sitecore\\Liberty Mutual Workshop Author") {
    name
    members(indirect: false, first: 100) {
      nodes { name }
      pageInfo { hasNextPage endCursor }
    }
  }
}
```

Repeat for **Approver**, **All pages** and the pair roles, following pagination when required. This verifies membership of those roles only. It does not establish the full user profile, administrator status or absence of unrelated roles; retain the **User Manager** and actual-session checks for those facts. Keep returned account names in private setup records.

## Configuration and setup tools

Run these tools from the **repository root**, using the configured Sitecore CLI environment `demo`. The setup maintainer needs a current normal Sitecore CLI sign-in, a working ignored `.sitecore/user.json`, and permission to configure this environment. Applying changes also requires that CLI environment to allow writes. These are setup requirements for the maintainer; attendees do not run provisioning commands.

| Tool | Purpose |
| --- | --- |
| [configure-workshop-editorial-workflow.cjs](../../../authoring/scripts/configure-workshop-editorial-workflow.cjs) | Creates or reconciles only the dedicated workflow, its roles and explicit practice-page ACLs |
| [configure-workshop-practice-template.cjs](../../../authoring/scripts/configure-workshop-practice-template.cjs) | Creates or verifies the isolated **WorkshopPracticePage** template without changing **ResourcePage** |
| [provision-workshop-practice-content.cjs](../../../authoring/scripts/provision-workshop-practice-content.cjs) | Creates missing practice pages and their local data; records generated native item IDs and preserves existing participant edits |
| [assign-workshop-user-roles.cjs](../../../authoring/scripts/assign-workshop-user-roles.cjs) | Adds the selected workshop roles to existing, non-admin Cloud users after verifying both the exact native username and profile email |

These tools are read-only by default. Changes require `--apply`. Snapshots, native ID manifests, identity assignments and mutation journals must use absolute paths **outside the repository**. Keep these private files with the environment's setup records: they identify the exact items and accounts involved and support safe readback after an interrupted request.

Use this order:

1. Capture a workflow-only baseline, review the proposed changes, then apply it with a new journal and output manifest.
2. Review and create the isolated practice template, saving its external manifest.
3. Run the practice-content tool read-only with `--template-manifest`, then apply it with its separate content manifest. It verifies both the dedicated workflow and the isolated template before creating page content.
4. Capture a second workflow baseline with `--content-manifest` pointing to the practice-content manifest. Review and apply it to set the exact page ACLs. The ACL tool verifies the recorded template's native identity and its direct **PortalPage** base before changing a page.
5. Prepare and validate private user assignments, then apply them only when every intended account is ready.
6. Complete the publishing prerequisites and true-user acceptance checks below.

For example, replace `/absolute/private/workshop` with a real directory outside the checkout. Use new baseline, journal and workflow output filenames for each separate application:

```bash
node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --snapshot /absolute/private/workshop/workflow-before.json

node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --baseline /absolute/private/workshop/workflow-before.json

node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --baseline /absolute/private/workshop/workflow-before.json --apply \
  --journal /absolute/private/workshop/workflow-journal.json \
  --manifest /absolute/private/workshop/workflow-manifest.json

node authoring/scripts/configure-workshop-practice-template.cjs demo

node authoring/scripts/configure-workshop-practice-template.cjs demo --apply \
  --manifest /absolute/private/workshop/practice-template.json

node authoring/scripts/provision-workshop-practice-content.cjs demo \
  --template-manifest /absolute/private/workshop/practice-template.json

node authoring/scripts/provision-workshop-practice-content.cjs demo --apply \
  --template-manifest /absolute/private/workshop/practice-template.json \
  --manifest /absolute/private/workshop/practice-content.json

node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --snapshot /absolute/private/workshop/page-acls-before.json \
  --content-manifest /absolute/private/workshop/practice-content.json

node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --baseline /absolute/private/workshop/page-acls-before.json

node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --baseline /absolute/private/workshop/page-acls-before.json --apply \
  --journal /absolute/private/workshop/page-acls-journal.json \
  --manifest /absolute/private/workshop/page-acls-manifest.json
```

On later template checks, supply its existing `--manifest`. On later practice-content checks, supply both `--template-manifest` and its existing content `--manifest` so the tool can verify previously created items. Legacy practice manifests that used **ResourcePage** are not accepted for new ACL changes. Provisioning does not reset participant edits, approve content, publish content or create user accounts. If a request's outcome is uncertain, inspect the journal and read back its recorded item before retrying.

### Upgrade the initial workflow to publish on approval

The initial configuration gave the Approver **Sitecore Client Publishing** and did not contain an automatic publishing action. The scoped migration removes that global parent role and adds **Approved → Auto Publish**. It does not change any account assignments, page content or other workflow.

Use `--migrate-publishing` only when capturing the reviewed migration baseline:

```bash
node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --snapshot /absolute/private/workshop/publishing-before.json \
  --migrate-publishing

node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --baseline /absolute/private/workshop/publishing-before.json

node authoring/scripts/configure-workshop-editorial-workflow.cjs demo \
  --baseline /absolute/private/workshop/publishing-before.json --apply \
  --journal /absolute/private/workshop/publishing-journal.json \
  --manifest /absolute/private/workshop/publishing-manifest.json
```

The migration accepts only the exact previously installed Approver parent set: **Sitecore Client Users**, **Sitecore Client Authoring** and **Sitecore Client Publishing**. It removes only **Sitecore Client Publishing**, verifies readback, then installs the action. Any other inherited privilege stops provisioning for review. A fresh installation already uses the restricted model and does not need this migration flag.

The action uses the native type `Sitecore.Workflows.Simple.PublishAction, Sitecore.Kernel` with:

```text
deep=0&related=0&smart=1&targets=experienceedge&alllanguages=0&languages=en&itemlanguage=0
```

The action's `targets` parameter is the database name **experienceedge**, configured on the **Edge** publishing-target item. Recheck this target when setting up another environment. The parameters limit the publishing request to the current page and English; they also compare revisions to avoid republishing unchanged content. They do not grant users a general publishing role.

The private role-assignment JSON uses `schemaVersion: 1` and an `assignments` array. Each entry has `email`, `role` (`author` or `approver`) and `pair` (`01`–`09`, or `all` for the presenter Approver). Use the exact email from the accepted SitecoreAI identity, preserving any plus alias.

```bash
node authoring/scripts/assign-workshop-user-roles.cjs demo \
  --assignments /absolute/private/workshop/assignments.json \
  --report /absolute/private/workshop/assignment-plan.json

node authoring/scripts/assign-workshop-user-roles.cjs demo \
  --assignments /absolute/private/workshop/assignments.json --apply \
  --journal /absolute/private/workshop/assignment-journal.json \
  --report /absolute/private/workshop/assignment-result.json
```

The entire assignment batch is checked before the first change. Missing users, ambiguous native usernames, mismatched profile emails, disabled accounts, administrator flags, conflicting effective roles or accounts requiring User Manager stop the batch. Discovery first lists only native usernames and administrator flags, then reads the full profile and roles of each requested `sitecore\<accepted email>` identity. The tool adds only the intended memberships and verifies them afterward; it never invites users, changes passwords, removes unrelated roles or grants administrator access.

## Publishing prerequisites and account acceptance checks

The setup maintainer must ensure **Workshop practice**, its ancestors, the isolated page template and required static rendering definitions are published before testing approval-triggered publication of a practice page. The practice root initially inherits **Basic Workflow**; it is not one of the paired pages in **Liberty Mutual Workshop Review**. Approve and publish the root as a separate setup action when required, without including its children or related items. Publish required definitions as a separate setup action; do not publish the paired drafts. Confirm that practice content is excluded from agent-facing navigation and Search before publishing practice pages.

**Use actual browser sessions to verify the publishing boundary.** The initial Approver could open the manual **Publish** controls on read-only **Home** because of **Sitecore Client Publishing**. Pair-level write access did not restrict those controls. After the migration, the real Approver's **Publish** button was disabled on **Home** in both Page Builder **Editor** and **Content** modes. Complete the remaining checks on the assigned page and unrelated content, and verify that **Approve** publishes only the permitted practice page.

GraphQL **Item.access** can help check effective read and write access. Its **canPublish** value is not sufficient proof of access to the publishing controls: it returned `true` for an Author whose **Publish** button was disabled. Verify the button/command behavior and the actual published result rather than treating that flag as a permissions test.

Use real Author and Approver sessions to verify:

| Check | Required observation |
| --- | --- |
| Author edits their own Draft | Versioned content saves and **Submit** is available |
| Author opens another pair's page or an existing portal page | They cannot edit that content |
| Author submits | **Actions → Submit → Comment → Submit** moves the page to **Awaiting approval**; the Author does not have **Approve** |
| Approver opens their assigned submitted page | **Actions** offers **Approve** and **Return to author**, but not the Author's workflow **Submit** command |
| Approver opens another pair's submitted page | They cannot approve or return it |
| Approver returns a page | Author can revise it in **Draft** and resubmit |
| Approver approves | **Actions → Approve → Comment → Submit** moves the item to **Approved** and triggers publication of the approved English page to **Experience Edge**; Page Builder shows **Live** after publication |
| Publication result is checked | The approved text appears at that practice page's portal URL after publication; other pair pages and unrelated portal content remain unchanged |
| Manual publishing controls are inspected | After a fresh sign-in, **Publish** is disabled for both roles on their own page, another pair's page, **Home** and an existing portal resource |
| Author edits an Approved page again | A new Draft version is created and the previously published version remains unchanged |
| Presenter Approver helps another pair | They can review every paired page without administrator privileges |

Native role and ACL readback is useful configuration evidence. Administrator-token API results, **canPublish** and unit tests are not substitutes for these real-user checks.

Run the provisioning-model tests from the repository root:

```bash
node --test authoring/scripts/*workshop*.test.cjs
```

## Repeating the exercise

The portal's reviewer reset does not reset Sitecore content or workflow history. To repeat, the Author opens their assigned page's version selector, selects **Create version**, leaves the optional name blank and selects **Create**. Reopen the selector, select the newest **Draft** and wait for its header and **Summary** to load before editing. The published version stays unchanged until the new draft is approved. To restore starter wording, use the original summary recorded at the start and submit it for approval again; approval triggers publication. There is no bulk reset or deletion action in these provisioning tools.

This is a practice area for the time-limited Liberty Mutual sandbox. It does not establish production identity, publishing or governance policies.

## Sitecore reference

- [Users, roles and security tools](https://doc.sitecore.com/sai/en/developers/sitecoreai/user-security/sitecoreai-security/the-security-tools.html)
- [Workflow and security features](https://doc.sitecore.com/sai/en/developers/sitecoreai/content-modeling-and-presentation/workflow/workflow-reference/workflow-and-security-features.html)
- [Security roles](https://doc.sitecore.com/sai/en/developers/sitecoreai/user-security/users-roles-and-domains/the-security-roles.html)
- [Publishing content and its ancestors](https://doc.sitecore.com/sai/en/users/sitecoreai/content-editor/managing-items/general/publishing.html)
- [Standard workflow actions](https://doc.sitecore.com/sai/en/developers/sitecoreai/content-modeling-and-presentation/workflow/workflow-reference/standard-and-custom-actions.html)
