# Marketing preference examples

These JSONL files are a small synthetic source of marketing preferences, representing the data that a consent-management platform or customer system could supply to SitecoreAI. They contain two fictional profiles and no credentials, email addresses, or real customer data. They are separate from the portal reviewer accounts.

| Native profile display name | Provider identifier | Starting marketing preference |
| --- | --- | --- |
| Cameron Ellis - Allowed | `liberty-mutual-agent` / `limu-preferences-allowed` | `extensions.marketingSuppressed = false` |
| Cameron Ellis - Suppressed | `liberty-mutual-agent` / `limu-preferences-suppressed` | `extensions.marketingSuppressed = true` |

Both profiles have the same fictional agency, Texas state, producer role, and license attributes. The comparison isolates the marketing preference. A native audience can require Texas eligibility and exclude profiles whose `marketingSuppressed` field is true.

- `baseline.jsonl` loads or restores the comparison: Allowed is false, and Suppressed is true.
- `opt-out.jsonl` upserts only the Allowed profile, setting its preference to true while preserving its provider identifier.

The label **Allowed** identifies the starting comparison profile; after an opt-out, that same profile has a true suppression flag. No profile deletion is needed to demonstrate suppression.

## Native import boundary

The protected workshop preference page submits these fixed actions through `/api/workshops/preferences`. The server uses the existing server-only Profile Import configuration and a separate persistent Redis checkpoint. It writes the checkpoint before its single upload, treats `202 Accepted` as queued, and verifies completion through status, statistics, and per-record results. Repeated clicks cannot submit a second batch while an upload is pending or uncertain.

The receipt confirms that the native import accepted the exact submitted records. Open the native profile and audience to observe the stored attribute and exclusion. The fixture itself is not a native consent registry, and importing a field does not automatically enforce it in every channel. Each applicable audience or activation must use the preference in its own eligibility rules.

For a real integration, use the organization's approved preference source, map its meaning into the agreed profile schema, maintain stable identifiers, and apply the exclusion consistently to the relevant marketing activities.

[Sitecore Profile Import API](https://doc.sitecore.com/sai/en/developers/sitecoreai/profile-import/profile-import-api.html) · [Import record format and merge behavior](https://doc.sitecore.com/sai/en/developers/sitecoreai/profile-import/batch-file-format.html)
