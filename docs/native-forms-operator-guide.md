# Native Forms: Contact your team

This exercise shows how a marketer manages a native SitecoreAI form and how an agent's submission reaches its configured webhook. The form belongs on [Support → Contact your team](https://liberty-mutual-agent-portal.vercel.app/support#contact-your-team). Sign in through the [portal login](https://liberty-mutual-agent-portal.vercel.app/login) with the agent login for your assigned **workshop number** first. Each number identifies seven portal accounts with the same suffix; **01** is reserved for presenters.

**Verified September 16, 2026:** **Contact your team** is Active. Native **Test webhook** and the deployed preview passed submission checks; the preview also passed required-field/email validation and a 390-pixel layout check without horizontal overflow. In production, `daniel.04` submitted all five values, the receiver captured the matching request and production domain, and the form showed its success message. The saved-request list stayed unchanged. Reloading cleared the form and success message. The Support page retains its original guidance, workflow, and version 1.

## What the two contact experiences demonstrate

| Experience | What handles submission | Where to verify the result | How to repeat |
|---|---|---|---|
| **Contact your team** on Support | Native SitecoreAI Forms and its assigned **Demo Webhook** | The configured webhook.site receiver | Reload the form and use a fresh unique message marker; retain receiver history |
| Relationship cards' **Request a conversation** and the campaign's **Plan a conversation** | The portal's authenticated action service and Redis saved-work store | **Your service & follow-up requests** on Support | Reset the assigned workshop number on the same preview host using [Reset a workshop number](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/workshops/reset) |

Submitting the native form does not create an item in the portal's saved-request list. The receiver is an inspection endpoint, not a connected Salesforce instance, mailbox, or production case database. Use fictional contact details and an `example.com` email address for this exercise. The configured receiver uses no authentication; replacement with a business backend requires an explicit authentication, payload, error-handling, and retention design.

## Presenter runbook

The participant instructions are in [Submit a contact form](https://liberty-mutual-agent-portal.vercel.app/workshops/guide/native-contact-form). Presenters inspect shared form configuration and the receipt inbox; attendees can submit fictional requests from their own portal accounts. The steps below support that demonstration and do not require attendees to edit the active form or share a receiver account.

The protected [Submit a contact form](https://liberty-mutual-agent-portal.vercel.app/workshops/guide/native-contact-form) guide now includes a direct receipt-inbox link. The presenter should open that link before the session, clear any saved **Search** filter, and confirm that requests are visible. A saved filter can hide the matching request even when delivery succeeded. The URL configured in **Demo Webhook** settings is the **POST destination**; the guide links to the corresponding inspection inbox. Keep the inbox in a separate tab and use a unique message marker to distinguish each submission from earlier requests. The inbox contains synthetic workshop data and uses no authentication; keep this repository private.

| Step | Click or inspect | Observe |
|---|---|---|
| 1 | In SitecoreAI, open **Forms → Active → Contact your team**. From the preview, select **Edit form**, then **Edit**. | The active form designer opens. The form is available for `liberty-mutual-agent-portal`. |
| 2 | Inspect **Your name**, **Work email**, **Agency name**, **How can we help?**, and **What would you like to discuss?** | All five fields are required. Topic choices are **Agency growth**, **Product guidance**, and **Portal support**. |
| 3 | Open **Settings** using the gear. Inspect **Demo Webhook**, site availability, and the success message. | **Demo Webhook** is selected. Site availability shows **1 out of 1**. The success message is configured. |
| 4 | Inspect **Push changes**, then return to the form preview without changing the form. | The action updates an active form. This inspection leaves the form and its live behavior unchanged. |
| 5 | As the presenter, sign in as `daniel.01`, password `Sitecore`, at the [portal login](https://liberty-mutual-agent-portal.vercel.app/login). Open [Support → Contact your team](https://liberty-mutual-agent-portal.vercel.app/support#contact-your-team). Enter `Daniel Ortiz`, `daniel.01@example.com`, and `Prairie Oak Insurance`. Attendees use their own workshop-number login and a fictional `example.com` address. | **Your name**, **Work email** and **Agency name** contain those fictional values. |
| 6 | In **How can we help?**, select **Agency growth**. In **What would you like to discuss?**, enter a unique marker such as `LM-NATIVE-yourname-date-time`. Select **Send request**. | **Thank you. Your request has been received.** appears. The fields clear and the form remains visible. |
| 7 | Open the receipt-inbox link in **Submit a contact form**, clear a saved **Search** filter if present, select the **POST** with your marker, then inspect **Request Content** or **Raw Content**. | JSON matches the five submitted values; request metadata identifies **Contact your team**. Match the unique message marker. |
| 8 | Reload to clear the confirmation. Repeat with a new message marker and leave earlier receipts unchanged. | No saved-work reset is needed. Portal reset does not erase webhook receipts. |

Before entering the fictional values at step 5, you can optionally select **Send request** with empty fields, then try an invalid **Work email**. Five required-field errors appear; an invalid email shows **Email address must follow the format user@example.com**. Neither invalid attempt sends a receipt. Native submissions remain separate from **Your service & follow-up requests**, which lists the custom conversation flow.

The visitor's success message and the receiver's matching request are two separate observations. Check both. Do not infer backend storage, email delivery, or Salesforce processing from a rendered form or a success screen.

### Receiver availability

The current limited free inbox expires on **September 23, 2026**. It was verified on September 19 with four requests visible, the latest dated September 18, and **x-formname: Contact your team**. Check its current availability before the session. Before expiry, the maintainer must renew the receiver or replace its URL in the existing **Demo Webhook** with a working free receiver and rerun native **Test webhook**. If the receiver identifier changes, update the receipt-inbox link in the protected HTML guide as part of the same change. Verify the new receiver's matching POST and the Forms result before the next walkthrough. Updating the native webhook destination does not require replacing the active form. A changed receipt-inbox link must also be deployed with the workshop HTML. Do not place receiver links in the public Agent Portal navigation.

## Form authoring and activation

Open **Forms** in [SitecoreAI](https://app.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df), find **Contact your team** in **Active**, and open its preview. Select **Edit form**, then confirm **Edit** to open the designer. Inspect the field labels, required-field settings, topic choices, submit action, and completion message without changing them. The active designer exposes **Push changes** for an intentional form update; it is not necessary to duplicate the form to edit it.

For a new form, use the following configuration and activation sequence. For the existing active form, inspect the same settings and test changes deliberately before using **Push changes**.

1. In **Settings**, confirm **Demo Webhook** is assigned. Review the actual receiver destination with its owner.
2. Use **Test webhook**, enter fictional values and inspect **Test Form Submission** before sending. Compare its destination, field keys, and request headers with the receiver's expectations. Use the message marker to distinguish the exercise: the verified tenant payload did not include a `test` flag.
3. Inspect the matching received request and the Forms result. A recipient can return a failure result even after accepting the HTTP request; resolve a negative response before activation. [Webhook configuration and testing](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/forms/edit-form-settings/work-with-webhooks.html).
4. Set **Form available on** explicitly to **Liberty Mutual Agent Portal**. The verified active settings show **1/1** site and **Demo Webhook**. An empty site selection means all sites.
5. Use **Save and Activate** once the design, submit action and receiver test are correct. Activation makes the form available for placement; it is separate from publishing the CMS page. An activated form can be edited or archived but cannot be deleted. [Form activation](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/forms/activate-a-form.html).

The form definition and its webhook live in native Forms. Pushing changes to the same form is not a GitHub or Vercel deployment. Review the impact on every page using that active form before pushing changes. If deliberately selecting a different form, change the native **Form** component's selection in Page Builder and publish the Support page; do not confuse that page release with the native form update.

The verified test receipt contained these five submitted values. Use a new message marker for every repeat. These payload keys are integration identifiers, not a claim that the on-screen field labels use camelCase.

| Payload key | Verified fictional value |
|---|---|
| `agentName` | `Daniel Ortiz` |
| `workEmail` | `daniel.04@example.com` |
| `agencyName` | `Prairie Oak Insurance` |
| `requestTopic` | `Agency growth` |
| `message` | A small-business growth conversation request with the marker `LM-FORMS-20260916-01` |

The portal form uses these visible controls:

- **Your name**, **Work email**, and **Agency name**.
- **How can we help?** with **Agency growth**, **Product guidance**, and **Portal support**.
- **What would you like to discuss?** and the **Send request** button.

All five fields are required. Invalid email displays **Email address must follow the format user@example.com**. A successful request clears the fields and displays **Thank you. Your request has been received.** below the form. Reloading leaves a blank form without the previous success message; it does not remove the receiver's request.

## Page composition and developer ownership

The existing **Support** page uses a dedicated `headless-support-form` placeholder. It permits only Sitecore's native **Form** rendering. The application maps that rendering to the Content SDK's Form component and passes the native `FormId` rendering parameter. It does not translate the submission into a custom portal request.

| Item | Value or responsibility |
|---|---|
| Native form | `Contact your team` — `980983421c624d078ccf2fd29e4ae665-use` |
| Page | `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home/support` |
| Native rendering | `62DD1639-9F28-4040-8738-C886480B2127` |
| Placement | `headless-support-form`, above the saved-request history |
| Application/model release | Form component mapping, Support layout, and explicit placement restrictions |
| CMS page release | The page's selected form and its `FormId` binding |
| Forms release | Native field design, validation, completion action, activation, and webhook settings |

The site must list the native rendering in **Available Renderings**, and the placeholder's **Allowed Controls** must include it. Preserve the explicit allowlist: an empty Allowed Controls field permits all available renderings. The shared Sitecore rendering is referenced, not copied into Liberty Mutual's owned model. [Enable Forms in Page Builder](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/forms/enable-forms-in-the-page-builder.html).

### Configure the binding in another environment

From the repository root, use Node.js 24 and an authenticated, writable Sitecore CLI environment. The commands below use the existing `demo` environment and this form's ID. In another tenant, create, test, and activate the native form there, then substitute its ID. Keep snapshots and journals outside the repository.

First review and install the scoped model module. `LibertyMutual.SupportForm` contains exactly three developer-owned layout/placeholder items and is included in the normal authoring build. These commands do not publish content.

```sh
python authoring/scripts/build-support-form-seed.py --check
dotnet sitecore ser push -n demo -i LibertyMutual.SupportForm --what-if
dotnet sitecore ser push -n demo -i LibertyMutual.SupportForm
```

After the native form is activated, capture the existing Support configuration, review the binding plan, and apply that reviewed plan:

```sh
node authoring/scripts/configure-support-native-form.cjs demo --form-id 980983421c624d078ccf2fd29e4ae665-use --snapshot /absolute/private/support-form-before.json
node authoring/scripts/configure-support-native-form.cjs demo --baseline /absolute/private/support-form-before.json
node authoring/scripts/configure-support-native-form.cjs demo --baseline /absolute/private/support-form-before.json --apply --journal /absolute/private/support-form-change.json
```

The snapshot captures the form ID; review and apply read it from that baseline rather than accepting a second ID. Review the plan before applying it. The routine verifies the scoped layout/placement configuration, manages the site's Forms availability entry and binds the existing Support item. It does not activate a form, alter the webhook, or publish content. Review the resulting page in Page Builder, then publish only the intended page and required owned configuration through the normal release process. Preserve the form selection during later model deployments.

## Acceptance and reset

Record these results against the deployed version and native form configuration:

- The signed-in production Support page loads the native form at the direct link above; Page Builder uses the Default editing host.
- Required fields and email validation reject incomplete or invalid input without a successful receiver submission.
- A valid submission shows the configured completion state and produces a matching receiver request containing the unique marker and expected fields.
- Native Forms field changes and page placement can be inspected in their respective authoring interfaces. Keyboard access, labels, narrow-screen layout, and loading/error behavior are usable.
- Native submissions do not appear in **Your service & follow-up requests**. The custom request path still saves and reloads correctly.
- Retain receiver history and record the exercise's unique marker as its evidence. Reload the form to repeat it with a new marker; no receiver deletion is part of the walkthrough.
- Restore any form, webhook, or page settings changed for the exercise. Preserve the active form and its page binding. Close unused tabs.

Reload or sign out after inspecting the result; neither deletes delivered requests. Resetting a workshop number creates fresh portal-linked UDL profiles while preserving earlier profiles and their history. It does not erase webhook data, Forms analytics, or experiment history. Do not archive the active form merely to reset a walkthrough.
