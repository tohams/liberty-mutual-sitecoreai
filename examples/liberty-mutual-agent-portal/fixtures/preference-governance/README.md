# Marketing preference examples

These JSONL files are a small synthetic source of marketing preferences, representing the data that a consent-management platform or customer system could supply to SitecoreAI. They contain two fictional profiles and no credentials, email addresses, or real customer data. They are separate from the portal reviewer accounts.

| Native profile display name | Provider identifier                                    | Starting marketing preference            |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| Cameron Ellis - Allowed     | `liberty-mutual-agent` / `limu-preferences-allowed`    | `extensions.marketingSuppressed = false` |
| Cameron Ellis - Suppressed  | `liberty-mutual-agent` / `limu-preferences-suppressed` | `extensions.marketingSuppressed = true`  |

Both profiles have the same fictional agency, Texas state, producer role, and license attributes. The comparison isolates the marketing preference. The live native **Liberty Mutual marketing eligibility** personalization reads the stored choice. A saved Audience provides a separate example of the same explicit-false eligibility policy.

- `baseline.jsonl` loads or restores the comparison: Allowed is false, and Suppressed is true.
- `opt-out.jsonl` upserts only the Allowed profile, setting its preference to true while preserving its provider identifier.

The label **Allowed** identifies the starting comparison profile; after an opt-out, that same profile has a true suppression flag. No profile deletion is needed to demonstrate suppression.

## Native import boundary

The protected workshop preference page submits these fixed actions through `/api/workshops/preferences`. The server uses the existing server-only Profile Import configuration and a separate persistent Redis checkpoint. It writes the checkpoint before its single upload, treats `202 Accepted` as queued, and verifies completion through status, statistics, and per-record results. Repeated clicks cannot submit a second batch while an upload is pending or uncertain.

The receipt confirms that the native import accepted the exact submitted records. Open the native profile to inspect the stored attribute, then run the native eligibility check. The fixture represents a preference source; each applicable marketing activity must consume the stored choice through its eligibility policy.

## Live native decision and outreach preview

`/api/workshops/marketing-eligibility` is a same-origin, workshop-authenticated POST endpoint. It accepts only an empty JSON object, resolves the fixed pair from the verified import receipt, and calls the native headless personalization for each profile. The native API response contains `marketingEligible`, `marketingSuppressed`, `preferenceKnown`, and `profileId`. The response configuration reads `profile.extensions.marketingSuppressed`; an identified profile qualifies only when that stored choice is explicitly false.

The application does not duplicate the eligibility rule. It uses the returned `marketingEligible` Boolean to select recipients for an HTML email preview. No email is sent. Before displaying a result, the server validates the native profile UUID against the completed import, the native stored choice against that import's current choice, and the unchanged preference operation. A missing, malformed, stale, or failed response withholds the entire recipient preview and requests another check. The saved Audience's scheduled membership is not used for this runtime proof.

The baseline returns one recipient, the opt-out returns none, and restoration returns the original recipient. All three checks must preserve the same native profile UUIDs. The UI discards any previous preview when a preference import starts, and displays native receipts for the new check.

### Server configuration

Use the existing server-side Profile Import settings and the site's scoped browser Edge context. The native personalization has friendly ID `liberty_mutual_marketing_eligibility` and analytics identifier `liberty-mutual-agent-portal`. Its REST connection is `/v1/personalize/v2/callFlows?siteId=liberty-mutual-agent-portal` on the Sitecore Edge platform.

Provision two native clients and send each a native IDENTITY event for its fixed `liberty-mutual-agent` identifier. Verify that the resulting headless response returns the same native profile UUID as the completed import. Store those two verified bindings atomically in server-only `SITECORE_MARKETING_ELIGIBILITY_CLIENT_BINDINGS`:

```json
{
  "limu-preferences-allowed": {
    "clientId": "<native client UUID>",
    "profileId": "<verified native profile UUID>"
  },
  "limu-preferences-suppressed": {
    "clientId": "<native client UUID>",
    "profileId": "<verified native profile UUID>"
  }
}
```

Each runtime request uses the corresponding verified `browserId` from this configuration. These bindings contain no passwords or API keys. Keep them server-only, and configure them separately for another tenant. Fixture `id` values are import correlation IDs, not native profile IDs. The server rejects incomplete bindings, extra profile scopes, reused client IDs, or a UUID that differs from the current verified import. Normal local component exercises do not require this optional hosted-workshop configuration.

For a real integration, use the organization's approved preference source, map its meaning into the agreed profile schema, maintain stable identifiers, and apply the exclusion consistently to the relevant marketing activities.

[Sitecore Profile Import API](https://doc.sitecore.com/sai/en/developers/sitecoreai/profile-import/profile-import-api.html) · [Import record format and merge behavior](https://doc.sitecore.com/sai/en/developers/sitecoreai/profile-import/batch-file-format.html)
