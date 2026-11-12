# Agency recommendations and shared copyright

The portal separates operational work from marketer-managed recommendations. **Your priorities** contains operational work such as renewals and submissions. **Agency priorities** is a native Sitecore component for product and bundle recommendations. It does not determine an agent’s permissions or replace the operational task list.

## Authoring contract

| Component and variant | Native datasource fields | Placement |
| --- | --- | --- |
| AgencyPriorities | Heading, Intro, and an ordered Recommendations selection | Agent Portal Home, `headless-agency-priorities` |
| SharedDisclosure.Default | title, body, sourceLink, effectiveDate, and reviewDate | Existing coverage-and-availability guidance |
| SharedDisclosure.Copyright | body, displayed to authors as **Disclosure** | Public Website and Agent Portal footers |

Each selected **AgencyPriority** item contains Heading, Body, Image, Link, and Eyebrow. Recommendations is a native ordered item selection. Its selected item order becomes the displayed card order. The component uses the referenced Content SDK fields, including their editing metadata; no fixture supplies missing cards or copy.

Native personalization selects the **Agency priorities** datasource. Keep the message, card selection, order, imagery, and calls to action together in that datasource. Rules belong in SitecoreAI. The component contains no agency, role, or state targeting logic. Server-side eligibility separately enforces access to protected pages and transactions.

Avery Brooks represents Cedar Ridge Insurance: a principal licensed in Texas, Florida, and Illinois. Daniel Ortiz represents Prairie Oak Insurance: a producer licensed in Illinois and Texas. Their native profile attributes select the relevant recommendation collection. The operational Home greeting and task data are separate from that content decision.

The **For all agencies** default selects **Home and auto conversations → Small business growth → Team support**. Its state-neutral support card links to the existing Support page. The five-card library also contains the Texas and Illinois guidance cards; each audience collection selects its own ordered subset, and the visitor component renders all selected valid references. The principal baseline remains **Small business growth → Texas workers compensation → Home and auto conversations**; the producer baseline remains **Home and auto conversations → Illinois workers compensation → Small business growth**.

## Central Agent priority classification

The **Liberty Mutual - Agency product priorities** decision table has one String custom-value input, **Agent priority**. The reusable classification is maintained in **Optimization → Custom values → Agent priority** as readable, commented JavaScript.

| Agent priority result | Current business criteria | Matching content |
| --- | --- | --- |
| Agency growth | Principal; licensed in Texas; agency small-business share below 20% | Agency growth priorities |
| Producer priorities | Producer; licensed in Illinois; small-business specialization; positive individual small-business production | Producer priorities |
| Standard, or no matching table rule | The original component | For all agencies |

In **Page Builder → Agent Portal → Editor → Pages → Home → Layers → Agency priorities → Edit personalization rules → Liberty Mutual - Agency product priorities**, the two rows compare **Agent priority** with **Agency growth** and **Producer priorities** using **Is equal to**. These distinct business names identify which content each rule selects.

The custom value validates the known profile, reads its licensing and production data, and calculates agency small-business share. To change eligibility, duplicate the published custom value into a Draft, update and test the JavaScript, publish it, and select the reviewed published value in the decision table. Message, approved card selection, and card order remain editable through **Agency growth priorities** or **Producer priorities** in **Page Builder**. Neither the component nor the frontend deployment contains the targeting criteria. Server-side licensing checks separately control eligibility for protected content and transactions.

Keep qualification and presentation checks distinct. **Select profile → Load profile → Client ID → Test** evaluates the real native rules for a known visitor. **Personalization Preview** selects the configured content variants and shows current authoring content; it does not evaluate those audience conditions or impersonate an agent.

In A1, compare Daniel and Avery, test Avery in the native Builder, then inspect the central **Agent priority** business sections without changing them. A3 changes the matched collection’s card order, and A4 previews, reviews, and publishes that content change. The thirteen prescribed loops retain their existing 39-minute allocation, with opening, closing, and buffer accounting for the full 45-minute presentation.

## Preview and publish one Home priority change

Use the same presenter account in Page Builder for the demonstration’s editing, submission, approval, and publication. In a normal team, separate Author, Approver, and Publisher permissions govern those actions.

1. In **Page Builder → Agent Portal → Editor → Pages → Home**, choose **Layers → Agency priorities → Content**. Select **1 Agent priority is equal to Agency growth**, and confirm **Content item → Agency growth priorities**. In that content-item card, select the **Priority baseline version** recorded during preparation. Wait for loading, and confirm **Small business growth → Texas workers compensation → Home and auto conversations**.
2. Create a new **Texas guidance priority** version from that verified original. Explicitly select the new numbered **Draft**, then change **Ordered recommendations** to **Texas workers compensation → Small business growth → Home and auto conversations**. Wait for **Saved**, and record **Saved priority version**. Leave it unpublished.
3. Return to **Editor → Pages → Home**, and open **Apps → Personalization Preview**. The app attempts to connect the existing SitecoreAI session automatically. If **Connect to SitecoreAI** appears, select it with the same presenter account; its connection window closes after authentication, and the app verifies the session automatically. Complete this connection check before presenting.
4. Under **Agency priorities**, choose **Agency growth priorities**; leave **Guidance** at **Default**. Select **Preview page**. The current draft opens automatically in a new read-only tab. Confirm Texas guidance appears first in **Priorities for your agency**, then close the preview tab.
5. Return to the same app, choose **Producer priorities** under **Agency priorities**, and select **Preview page** again. Confirm the producer collection retains **Connect home and auto conversations → Support workers’ compensation conversations in Illinois → Build a stronger small-business practice**. Close the preview tab.
6. Return to **Layers → Agency priorities → Content**, select **1 Agent priority is equal to Agency growth**, and confirm **Content item → Agency growth priorities**. Choose its **••• (Data source options) → Open in Content mode**, and select the exact **Saved priority version**. Submit it, approve it, and publish that item in English. Confirm Avery’s live Home now leads with Texas guidance and Daniel’s household-first order remains unchanged. Publishing the frontend app does not publish CMS content.

The private Marketplace extension reads the selected page’s current personalization configuration and renders the selected native content variants through the official Content SDK preview service. It does not evaluate visitor eligibility or impersonate Avery or Daniel. Selecting a variant checks how that content looks; the existing published SitecoreAI rules still determine which live agent receives it. The surrounding portal context is generic and read-only. The app does not create CDP profiles, change agent accounts or rules, publish content, or grant content permissions.

The real-profile rule test remains a separate check in **A1**: inspect each native profile’s **clientIds**, then load that **Client ID** in the native rule Builder. A **Profile ID** from the profile URL is a different identifier. **Personalization Preview** selects configured content variants and does not require either identifier.

## One copyright source for both website footers

The shared copyright item is:

`/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Disclosures/Copyright notice`

Its stable ID is `9dc572ee-3d67-5909-922f-6482def1cdb0`. Both native footer placements reference that same item through **SharedDisclosure → Copyright**. The variant renders only the complete **Disclosure** rich-text body. It does not render a title, content-owner metadata, dates, or a separate source-link field. Each website retains its own footer design.

The public footer uses `headless-public-copyright-{*}`. Its placeholder settings restrict composition to the intended shared-notice component. The portal footer also receives the shared copyright as native content, rather than an editable duplicate or a hardcoded year.

The existing **Product availability notice** remains a separate legal-content item at:

`/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Disclosures/Product availability notice`

Its ID remains `c4fd68f7-7c79-5bb6-9919-fb6f82b84bca`. Existing coverage-and-availability and promotion references retain their legal wording. The copyright demonstration does not repurpose that item.

The shared library contains intentionally public wording. Agency records, customer information, and protected portal resources do not belong in it. Author permissions and the configured workflow govern changes. Native definitions and CreateOnly initial content are recorded in `authoring/items/liberty-mutual-public/public-contract.json`; ordinary frontend deployments do not overwrite authored wording.

## Copyright demonstration and restoration

1. Before presenting, confirm both website footers display the full notice below with **2025**. Record the copyright item’s original approved English version, and retain it.
2. In **Page Builder → Public Website → Content**, select the top-level **Data → Disclosures → Copyright notice**. Create **Copyright year update** from the recorded original version, explicitly select its new numbered **Draft**, and change only **2025** to **2026** in **Disclosure**. Preserve all other wording, punctuation, the line break, and the **Equal Opportunity Employer** link.
3. Record **Saved copyright version** after saving. Submit, approve, and publish that exact shared item once, with **Item** and **Current language (English)** selected and **Subitems** unchecked.
4. Reload the public website and Agent Portal, scroll to both footers, and confirm both display the full notice with **2026**. Experience Edge delivers the approved shared source to the two independent sites; neither footer requires a second copy edit or frontend release.
5. In **Page Builder → Public Website → Content → Data → Disclosures → Copyright notice**, open the version selector. Open the changed version’s **••• → Compare versions**. In the modal, set **Compare** to the recorded original approved version and **With** to the changed version. Under **Content → Disclosure**, confirm that only **2025 → 2026** changed, with all wording and the link retained. The comparison updates automatically; choose **close** when finished.
6. Return to **Content → Data → Disclosures → Copyright notice**, select the recorded original approved English version, and create **Copyright year restored** from it. Select the new numbered Draft, confirm the full notice again contains **2025**, then save, submit, approve, and publish that exact restored version. Retain the original, changed, and restored versions.
7. Reload both website footers, and confirm **2025** is restored with all other copy and the link intact. Use the version selector and **Compare versions** to show the original, changed, and restored wording. The earlier page-authoring demonstration shows the review and approval process.

The frontend tests verify ordered Content SDK fields, native component and datasource preservation, governed placement, full copyright rendering without content-owner metadata, and empty-slot spacing. These source checks complement the native authoring, decision, publication, and browser checks; they do not replace a live rehearsal.

## Full baseline copyright notice

© 2025 Liberty Mutual Insurance, 175 Berkeley Street, Boston, MA 02116<br>
Liberty Mutual is an [Equal Opportunity Employer](https://www.libertymutualgroup.com/about-lm/our-company/equal-employment-opportunity-and-anti-discrimination-policy) and an Equal Housing Insurer.

The **Disclosure** field’s baseline HTML is:

```html
<p>© 2025 Liberty Mutual Insurance, 175 Berkeley Street, Boston, MA 02116<br>Liberty Mutual is an <a href="https://www.libertymutualgroup.com/about-lm/our-company/equal-employment-opportunity-and-anti-discrimination-policy">Equal Opportunity Employer</a> and an Equal Housing Insurer.</p>
```
