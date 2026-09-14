# Small-business guide A/B test verification — September 14, 2026 UTC

**Current status: Live; native aggregate goal attribution pending.** The replacement **Liberty Mutual Small Business Guide CTA** has a saved and independently reopened destination-page goal. Published control and B content passed 18 read-only checks. A normal production Daniel `.04` journey reached the guide. These checks establish configuration, published content and navigation; they do not yet establish a credited goal or statistical winner.

## Lifecycle and configuration

The preceding **Liberty Mutual Small Business Resource CTA** was ended with control A retained and the Resources page published. Its report and [September 11 observations](qa-ab-testing-2026-09-11.md) remain historical. The replacement is a separate native test; the earlier visits and goals must not be combined with its report. The cause of the earlier zero-goal report remains unproven.

The new test uses the same Resources English version **2** and AgentGuidance rendering instance. Its **Increase page views** goal was explicitly selected from the site tree using item `2bf3a728-a631-5a90-a323-8922aca62f23`. After Save and reopening Configure, the `expand-small-business-practice` selection remained present. Settings retained **50/50** allocation, **100%** participation, **All visitors**, **2%** base rate, **20%** minimum detectable difference, **95%** confidence and displayed sample size **21,110**. Both outcome actions return traffic to control.

Start and page-only publication completed, and Page Builder showed **Live** by **02:34 UTC**. Native Performance selected friendly key `component_c9b4e46b3b7250d4a96e732c4d181b6a_e144a961809e570f9e26c1cdd5d4e99b_en_20260914t022704347z`. This observed selector is not a flow-definition UUID or proof of the exact activation time. [Current configuration and inspection links](ab-testing.md#native-configuration-and-acceptance-record) identify the active test.

## Published content and serialization

The approved master snapshot at **02:33:27 UTC** and published Edge checks confirmed new B variant `e144a961809e570f9e26c1cdd5d4e99b_a8d397f0f30145e384ea177916db4ce5`. It reuses the original published B datasource `77e00d15-681c-45de-9079-aa08a48b7195`, `Data/Guidance/resources-guidance_var2`.

All **18/18** read-only content checks passed: native B discovery, expected page and datasource identities, A **Start with small business**, B **Build your small-business practice**, shared guide destination, Search first and intact, and published goal ResourceArticle. Explicitly selecting a layout variant for this content read does not establish random assignment or produce an experiment exposure.

A SingleItem serialization pull evaluated exactly **two** items: Resources and the reused B datasource. The B file remained unchanged. Only Resources version 2's native experiment rule identifiers and update metadata changed; shared fields, version 1 and Search's final-layout patch remained unchanged. The unused temporary copy is not part of the serialized solution. Content remains **CreateOnly**; no content push was performed. Item snapshots do not transfer native test configuration or report history to a new tenant.

## Normal production journey and measurement

Daniel `.04`, generation **0**, signed in normally, opened Resources at **02:34:42.220 UTC**, saw **Start with small business**, followed the displayed action to the guide around **02:35**, and signed out by **02:36**. No forced treatment, direct decision request, repeated goal traffic, saved-work change or reset was part of this journey. A's visible copy alone cannot distinguish native control allocation from an application fallback. The production Vercel trace for that exact Resources GET recorded HTTP **200**, a native browser-profile lookup for client `4dd12e20-436c-4b5c-a79f-db957d06a59f`, and a POST to `/v1/personalize`. The inspected trace exposed neither the decision response nor its selected variant: it proves a decision request occurred, not that native allocation was accepted.

At **02:36:39 UTC**, the replacement report showed **0 visits and 0 goals** for each variant. Same-session native event inspection and credited goal reporting remain separate acceptance checks. Sitecore documents that [analytics can take up to 24 hours](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/start-an-a-b-n-test.html) after a test starts; that allowance does not prove attribution will succeed.

The expected guide VIEW uses `page: expand-small-business-practice`, language `en`, and page-variant identifier `2bf3a728a6315a90a3238922aca62f23_en_default`. Native profile inspection must match the current person, browser/client and session. A credited goal in the replacement report is required before reporting attribution as verified. Sparse sandbox activity does not establish business lift, statistical confidence or a winning label.
