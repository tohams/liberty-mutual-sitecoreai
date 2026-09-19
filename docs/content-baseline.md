# Restore the Liberty Mutual CMS content baseline

The CMS baseline is a private, point-in-time copy of the Liberty Mutual site's authored content and project definitions. It can restore changed or deleted content without turning pages into read-only deployment resources. It is separate from the portal's attendee-number reset, which resets application work and starts a fresh CDP identity.

This is a **CMS content restore**, not a complete SitecoreAI environment backup or an automatic deployment seed. The original `LibertyMutual.Content` module is an initial `CreateOnly` seed; it deliberately preserves existing author edits. The baseline captures the current native content, including items created after that initial seed.

## Current baseline

The initial complete capture is stored outside the disposable Git clone:

```text
/Users/thomaslin/Documents/Codex/2026-09-08/i-ne/backups/sitecore-content-baseline/20260919T180500Z
```

The authoritative capture time, source environment, Git commit, file checksums, item IDs, and language/version inventory are in its `manifest.json`. The directory name is a label; use the manifest's UTC timestamp for the capture time. Keep this directory in a restricted backup location that will survive deletion or recloning of the project. Keep the snapshot and its CLI logs outside the application repository.

The capture contains **752 items and 769 serialized item versions**, all in English. It includes the observed versions, rather than only the latest published version. This describes the current captured state; it does not certify that every page is pristine or approved. Choose and capture the desired workshop starting state before calling a future snapshot a factory baseline.

| Scope                                                         | Items | What is retained                                                                                                                               |
| ------------------------------------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sitecore/content/LibertyMutual`                             |   310 | Site pages, local and shared data, taxonomy, page/partial designs, page branches, settings, dictionary items, layouts, and authored CMS fields |
| `/sitecore/templates/Project/LibertyMutual`                   |   139 | Project templates, fields, standard values, and the isolated workshop page template                                                            |
| `/sitecore/templates/Branches/Project/LibertyMutual`          |     1 | The project branch folder; the editable page branches are under the site Presentation tree                                                     |
| `/sitecore/layout/Renderings/Project/LibertyMutual`           |    13 | Project rendering definitions                                                                                                                  |
| `/sitecore/layout/Layouts/Project/LibertyMutual`              |     7 | Project layouts                                                                                                                                |
| `/sitecore/layout/Placeholder Settings/Project/LibertyMutual` |    12 | Project placeholder definitions and restrictions                                                                                               |
| `/sitecore/system/Settings/Project/LibertyMutual`             |     2 | Project settings                                                                                                                               |
| `/sitecore/media library/Project/LibertyMutual`               |   260 | Classic CMS media items, including 60 nonempty serialized Blob fields                                                                          |
| `/sitecore/system/Workflows/Liberty Mutual Workshop Review`   |     8 | The custom Draft → Awaiting approval → Approved workflow and commands                                                                          |

The full Liberty Mutual site subtree is included. There are no seed-module exclusions for campaigns, taxonomy, page branches, resource images, workshop practice pages, or the Support page's form binding. Other customers' content, shared Sitecore platform definitions, and unrelated system trees are outside the capture.

## Prerequisites

- Use the repository's .NET Sitecore CLI 6.0.23 and Serialization plugin 6.0.23. From the repository root, run `dotnet tool restore` when needed.
- Install the portal's locked dependencies with `npm ci` in `examples/liberty-mutual-agent-portal`; the inventory reader uses its installed `js-yaml` dependency.
- Authenticate the Sitecore CLI and configure the named environment `demo` for this POC. Authentication remains in the ignored `.sitecore/user.json`; the backup never contains a copy of that file.
- Run the commands below from the repository root. The capture destination must be an absolute, new directory outside the clone, with an existing parent directory.

The tool temporarily links the existing CLI session into an isolated configuration, and removes the link after the operation. It never changes the repository's `sitecore.json`, normal serialization modules, or `xmcloud.build.json`.

## Capture a new baseline

Pause content editing while capturing so the set of items represents a consistent starting point. Serialization is not a transactional database backup.

```bash
node authoring/scripts/content-baseline.cjs capture \
  --environment demo \
  --output /absolute/private/backups/liberty-mutual-YYYYMMDDTHHMMSSZ
```

The capture performs a read-only native root check, `ser pull`, a scope/privacy inventory, and `ser validate`. It does not publish or change any CMS item. A manifest becomes `complete: true` only after all checks pass. A failed capture remains marked incomplete and cannot be restored by this tool. Choose a new directory for the next attempt; existing snapshots are never overwritten.

Audit-owner identities, created-by identities, updated-by identities, and item locks are excluded by their exact field IDs. The inventory rejects email-bearing field values and suspected credential fields. Item security fields and role references remain included, while user accounts and role membership records are not exported. If a capture fails the privacy checks, review the identified field privately before deciding whether to exclude it; do not bypass the check or post its value in a ticket.

## Verify the files

```bash
node authoring/scripts/content-baseline.cjs verify \
  --baseline /absolute/private/backups/liberty-mutual-YYYYMMDDTHHMMSSZ
```

This checks the complete manifest, exact configuration, allowlisted item scopes, and SHA-256 hashes. Keep the manifest and YAML files together and unchanged. Copy the whole directory when moving it to another restricted backup location.

## Preview a restore

```bash
node authoring/scripts/content-baseline.cjs restore \
  --environment demo \
  --baseline /absolute/private/backups/liberty-mutual-YYYYMMDDTHHMMSSZ
```

With no `--apply` flag, restore always invokes the CLI's `--what-if`. Inspect the reported private log for proposed changes. The default operation recreates missing baseline items and restores baseline field values on existing items; it preserves items that were added later. It does not restore an unrelated environment or a site whose protected root IDs have changed. Missing protected roots require a separately reviewed recovery procedure.

The first snapshot passed local serialization validation and a native restore dry run against the current tenant. **No live restore has been performed.** A successful dry run is not proof of a complete disaster-recovery process.

## Deliberately apply a restore

First capture the current state into a different directory so later work can be recovered. Stop concurrent editing, review the dry-run log, and obtain the exact `sourceOrigin` from the chosen baseline's manifest. Then use:

```bash
node authoring/scripts/content-baseline.cjs restore \
  --environment demo \
  --baseline /absolute/private/backups/liberty-mutual-YYYYMMDDTHHMMSSZ \
  --apply \
  --confirm-origin https://exact-authoring-origin-from-manifest
```

The explicit apply command changes CMS content. It never runs as part of a GitHub, Vercel, or Deploy App build, and it does not publish automatically. Check the restored pages and their workflow state in Page Builder before publishing the intended approved pages. Drafts and awaiting-approval content must follow their workflow.

## Remove content added after the baseline

For a deliberate reset of the site content tree, add `--remove-added-site-content` to the dry run:

```bash
node authoring/scripts/content-baseline.cjs restore \
  --environment demo \
  --baseline /absolute/private/backups/liberty-mutual-YYYYMMDDTHHMMSSZ \
  --remove-added-site-content
```

This permits the CLI to delete later-added items **only under**:

```text
/sitecore/content/LibertyMutual/liberty-mutual-agent-portal
```

It can remove workshop-created pages and data that are absent from the chosen baseline. The tenant folder, project templates, renderings, layouts, workflow, and media scopes remain create/update-only. Review every proposed deletion, retain the pre-restore capture, and add both `--apply` and `--confirm-origin` only when ready to perform that reset. A CMS item reset does not by itself clear published Edge content, external personalization state, application data, or external media. Reconcile publication separately and verify live delivery.

## Boundaries of this backup

| Area                                  | Captured                                                                                                                                                   | Separate recovery work                                                                                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CMS pages and rendering configuration | Item IDs, content fields, language versions, workflow-state fields, presentation fields, datasource references, page designs, branches, and metadata lists | Review publication state and republish approved content; verify links and Page Builder                                                                                                    |
| CMS item permissions                  | Serialized item ACLs and role references                                                                                                                   | Recreate native roles and account assignments with the existing workshop provisioning tools; identity accounts, passwords, and workflow history are not backed up here                    |
| Classic Media Library                 | Items and the serialized Blob field values present in this capture                                                                                         | Validate restored assets; this is not a separate binary-download audit                                                                                                                    |
| Modern Media Library                  | References and image URLs stored in CMS fields                                                                                                             | Asset originals, metadata, public links, transformations, and the external media service need their own export/recovery; CMS serialization is not a Modern Media asset backup             |
| Personalization and A/B testing       | CMS presentation configuration and referenced content variants                                                                                             | UDL/CDP profiles and behavior, affinity settings, segments, custom values, external decisions, test state, and experiment results require separate service-specific exports/configuration |
| Search                                | Search-related resource fields and taxonomy choices                                                                                                        | Search sources, attributes, indexing, and external service configuration are separate; verify or rebuild the index after publication                                                      |
| Forms                                 | The Support page's CMS component binding                                                                                                                   | Native form definition, webhook configuration, integration secrets, submissions, and downstream data are separate                                                                         |
| Agentic Studio and Brand Kits         | CMS links or content references, if stored in the site tree                                                                                                | Agentic spaces, conversations, generated artifacts, Brand Kits, and external application configuration require separate recovery                                                          |
| Portal and hosting                    | No application database or hosting-state backup                                                                                                            | Git retains code and fixtures; Vercel environment variables, Upstash data, portal reviewer resets, and other account configuration have separate recovery procedures                      |

The captured project model may include definitions normally supplied through Items as Resources. Restoring authored content with serialization does not put pages into an IAR package. Leave the normal deployment configuration unchanged so subsequent builds do not overwrite editorial content.

## Supported mechanism

Sitecore documents [configuring serialization includes and exclusions](https://doc.sitecore.com/sai/en/developers/sitecoreai/sitecore-content-serialization/set-up-content-serialization.html), [allowed create/update/delete operations](https://doc.sitecore.com/xp/en/developers/104/developer-tools/sitecore-content-serialization-configuration-reference.html), and [the serialization pull, push, validation, and what-if commands](https://doc.sitecore.com/xp/en/developers/104/developer-tools/the-cli-serialization-command.html). This tool wraps those supported operations with an isolated, explicit scope and private inventory; it is not a substitute for a tested platform backup service.
