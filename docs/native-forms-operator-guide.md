# Native Forms: Contact your team

This exercise shows how a marketer manages a native SitecoreAI form and how an agent's submission reaches its configured webhook. The form belongs on [Support → Contact your team](https://liberty-mutual-agent-portal.vercel.app/support#contact-your-team). Sign in through the [portal login](https://liberty-mutual-agent-portal.vercel.app/login) with your assigned reviewer account first.

**Verification status:** the form, page binding and live delivery are being configured. Complete the acceptance checks below before presenting this as a verified end-to-end exercise. The current native form is **Contact your team**, initially created in Draft.

## What the two contact experiences demonstrate

| Experience | What handles submission | Where to verify the result | How to clean up |
|---|---|---|---|
| **Contact your team** on Support | Native SitecoreAI Forms and its assigned **Demo Webhook** | The configured webhook.site receiver | Remove only the uniquely identified exercise requests from that receiver, using its supported controls |
| Relationship cards' **Request a conversation** and the campaign's **Plan a conversation** | The portal's authenticated action service and Redis saved-work store | **Your service & follow-up requests** on Support | Coordinate the assigned preview pack's [saved-work reset](demo-loops.md#reset-and-repeat) |

Submitting the native form does not create an item in the portal's saved-request list. The receiver is an inspection endpoint, not a connected Salesforce instance, mailbox or production case database. Use fictional contact details and an `example.com` email address for this exercise. The configured receiver uses no authentication; replacement with a business backend requires an explicit authentication, payload, error-handling and retention design.

## Run the agent and marketer walkthrough

Use the [native Forms steps in the marketing walkthrough](marketing-capability-walkthrough.md#native-forms-contact-your-team). Keep the receiver available in a separate tab so the form submission and its received fields can be compared. Record a unique marker in the message, such as `Contact review Thomas 2026-09-16 14:30`, rather than relying only on a timestamp or a shared agent name.

The visitor's success message and the receiver's matching request are two separate observations. Check both. Do not infer backend storage, email delivery or Salesforce processing from a rendered form or a success screen.

## Form authoring and activation

Open **Forms** in [SitecoreAI](https://app.sitecorecloud.io/?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df) and select **Contact your team**. Inspect the field labels, required-field settings, topic choices, submit action and completion message before changing anything.

1. In **Settings**, confirm **Demo Webhook** is assigned. Review the actual receiver destination with its owner.
2. Use **Test webhook**, enter fictional values and inspect **Test Form Submission** before sending. Compare its destination, field keys and request headers with the receiver's expectations. This testing flow includes `"test": true` in the payload.
3. Inspect the matching received request and the Forms result. A recipient can return a failure result even after accepting the HTTP request; resolve a negative response before activation. [Webhook configuration and testing](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/forms/edit-form-settings/work-with-webhooks.html).
4. Set **Forms available on** explicitly to **Liberty Mutual Agent Portal**. An empty site selection means all sites.
5. Use **Save and Activate** once the design, submit action and receiver test are correct. Activation makes the form available for placement; it is separate from publishing the CMS page. An activated form can be edited or archived but cannot be deleted. [Form activation](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/forms/activate-a-form.html).

The form definition and its webhook live in native Forms. Editing those settings is not a GitHub or Vercel deployment. Review the impact of changing the shared active form before saving it.

## Page composition and developer ownership

The existing **Support** page uses a dedicated `headless-support-form` placeholder. It permits only Sitecore's native **Form** rendering. The application maps that rendering to the Content SDK's Form component and passes the native `FormId` rendering parameter. It does not translate the submission into a custom portal request.

| Item | Value or responsibility |
|---|---|
| Native form | `Contact your team` — `980983421c624d078ccf2fd29e4ae665-use` |
| Page | `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home/support` |
| Native rendering | `62DD1639-9F28-4040-8738-C886480B2127` |
| Placement | `headless-support-form`, above the saved-request history |
| Application/model release | Form component mapping, Support layout and explicit placement restrictions |
| CMS page release | The page's selected form and its `FormId` binding |
| Forms release | Native field design, validation, completion action, activation and webhook settings |

The site must list the native rendering in **Available Renderings**, and the placeholder's **Allowed Controls** must include it. Preserve the explicit allowlist: an empty Allowed Controls field permits all available renderings. The shared Sitecore rendering is referenced, not copied into Liberty Mutual's owned model. [Enable Forms in Page Builder](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/forms/enable-forms-in-the-page-builder.html).

### Configure the binding in another environment

From the repository root, use Node.js 24 and an authenticated, writable Sitecore CLI environment. The commands below use the existing `demo` environment and this form's ID. In another tenant, create, test and activate the native form there, then substitute its ID. Keep snapshots and journals outside the repository.

First review and install the scoped model module. `LibertyMutual.SupportForm` contains exactly three developer-owned layout/placeholder items and is included in the normal authoring build. These commands do not publish content.

```sh
python authoring/scripts/build-support-form-seed.py --check
dotnet sitecore ser push -n demo -i LibertyMutual.SupportForm --what-if
dotnet sitecore ser push -n demo -i LibertyMutual.SupportForm
```

After the native form is activated, capture the existing Support configuration, review the binding plan and apply that reviewed plan:

```sh
node authoring/scripts/configure-support-native-form.cjs demo --form-id 980983421c624d078ccf2fd29e4ae665-use --snapshot /absolute/private/support-form-before.json
node authoring/scripts/configure-support-native-form.cjs demo --baseline /absolute/private/support-form-before.json
node authoring/scripts/configure-support-native-form.cjs demo --baseline /absolute/private/support-form-before.json --apply --journal /absolute/private/support-form-change.json
```

The snapshot captures the form ID; review and apply read it from that baseline rather than accepting a second ID. Review the plan before applying it. The routine verifies the scoped layout/placement configuration, manages the site's Forms availability entry and binds the existing Support item. It does not activate a form, alter the webhook or publish content. Review the resulting page in Page Builder, then publish only the intended page and required owned configuration through the normal release process. Preserve the form selection during later model deployments.

## Acceptance and reset

Record these results against the deployed version and native form configuration:

- The signed-in production Support page loads the native form at the direct link above; Page Builder uses the Default editing host.
- Required fields and email validation reject incomplete or invalid input without a successful receiver submission.
- A valid submission shows the configured completion state and produces a matching receiver request containing the unique marker and expected fields.
- Native Forms field changes and page placement can be inspected in their respective authoring interfaces. Keyboard access, labels, narrow-screen layout and loading/error behavior are usable.
- Native submissions do not appear in **Your service & follow-up requests**. The custom request path still saves and reloads correctly.
- The receiver owner removes only the exercise's matching requests if its controls allow. If removal is unavailable, record the marker as test evidence and follow that receiver's retention process.
- Restore any form, webhook or page settings changed for the exercise. Preserve the active form and its page binding. Close unused tabs.

Reload or sign out after inspecting the result; neither deletes delivered requests. Portal saved-work reset does not clear webhook data, Forms analytics, UDL profiles or experiment history. Do not archive the active form merely to reset a walkthrough.
