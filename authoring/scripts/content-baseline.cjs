"use strict";

// Deliberate, private CMS backups. This file is never called by deployment.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const { spawnSync } = require("node:child_process");
const { ROOT, connection } = require("./campaign-native-client.cjs");
const SITE = "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal";
const NAMESPACE = "LibertyMutual.PrivateBaseline";
const SCOPES = Object.freeze([
  ["templates", "/sitecore/templates/Project/LibertyMutual"],
  ["branches", "/sitecore/templates/Branches/Project/LibertyMutual"],
  ["renderings", "/sitecore/layout/Renderings/Project/LibertyMutual"],
  ["layouts", "/sitecore/layout/Layouts/Project/LibertyMutual"],
  [
    "placeholders",
    "/sitecore/layout/Placeholder Settings/Project/LibertyMutual",
  ],
  ["settings", "/sitecore/system/Settings/Project/LibertyMutual"],
  ["media", "/sitecore/media library/Project/LibertyMutual"],
  ["workflow", "/sitecore/system/Workflows/Liberty Mutual Workshop Review"],
  ["content", "/sitecore/content/LibertyMutual"],
]);
const EXCLUDED_FIELDS = Object.freeze([
  ["52807595-0f8f-4b20-8d2a-cb71d28c6103", "__Owner"],
  ["5dd74568-4d4b-44c1-b513-0af5f4cda34f", "__Created by"],
  ["badd9cf9-53e0-4d0c-bcc0-2d784c282f6a", "__Updated by"],
  ["001dd393-96c5-490b-924a-b0f25cd9efd8", "__Lock"],
]);
const norm = (id) => String(id).replace(/[{}-]/g, "").toLowerCase();
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
function write(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
}
function within(value, root) {
  return value === root || value.startsWith(root + "/");
}
function moduleConfig(removeAdded = false) {
  return {
    namespace: NAMESPACE,
    description:
      "Private, explicit CMS baseline. Never include in normal deployment.",
    items: {
      includes: SCOPES.map(([name, itemPath]) => ({
        name,
        path: itemPath,
        database: "master",
        scope: "ItemAndDescendants",
        allowedPushOperations: "CreateAndUpdate",
        ...(removeAdded && name === "content"
          ? {
              rules: [
                {
                  path: "/liberty-mutual-agent-portal",
                  scope: "ItemAndDescendants",
                  allowedPushOperations: "CreateUpdateAndDelete",
                },
              ],
            }
          : {}),
      })),
    },
  };
}
function rootConfig() {
  return {
    modules: ["Baseline.module.json"],
    plugins: ["Sitecore.DevEx.Extensibility.Serialization@6.0.23"],
    serialization: {
      defaultMaxRelativeItemPathLength: 100,
      defaultModuleRelativeSerializationPath: "items",
      removeOrphansForRoles: false,
      removeOrphansForUsers: false,
      continueOnItemFailure: false,
      progressiveMetadataPull: false,
      excludedFields: EXCLUDED_FIELDS.map(([fieldId, description]) => ({
        fieldId,
        description,
      })),
    },
    settings: {
      telemetryEnabled: false,
      cacheAuthenticationToken: true,
      versionComparisonEnabled: true,
      apiClientTimeoutInMinutes: 5,
    },
  };
}
function filesBelow(directory, prefix = "") {
  const stat = fs.lstatSync(directory);
  assert(
    stat.isDirectory() && !stat.isSymbolicLink(),
    "Baseline data directories must not be symbolic links.",
  );
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      assert(
        !entry.isSymbolicLink(),
        "Baseline data must not contain symbolic links.",
      );
      const relative = path.posix.join(prefix, entry.name);
      return entry.isDirectory()
        ? filesBelow(path.join(directory, entry.name), relative)
        : [relative];
    })
    .sort();
}
function allFields(item) {
  return [
    ...(item.SharedFields ?? []),
    ...(item.Languages ?? []).flatMap((language) => [
      ...(language.Fields ?? []),
      ...(language.Versions ?? []).flatMap((version) => version.Fields ?? []),
    ]),
  ];
}
function inspectItem(item, file) {
  assert(
    item &&
      typeof item.Path === "string" &&
      /^[a-f\d]{32}$/.test(norm(item.ID)),
    `Invalid serialized item: ${file}`,
  );
  const scope = SCOPES.find(([, root]) => within(item.Path, root));
  assert(scope, `Out-of-scope item: ${file}`);
  const fields = allFields(item);
  for (const field of fields) {
    assert(
      !EXCLUDED_FIELDS.some(([id]) => norm(id) === norm(field.ID)),
      `Excluded personal/lock field remains: ${file}`,
    );
    assert(
      !(
        /password|secret|access.?token|refresh.?token|api.?key/i.test(
          field.Hint ?? "",
        ) && field.Value
      ),
      `Potential credential field: ${file}`,
    );
    assert(
      !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(String(field.Value ?? "")),
      `Email-bearing field requires private-data review: ${file}`,
    );
    assert(
      !/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._-]{20,}/.test(
        String(field.Value ?? ""),
      ),
      `Potential credential value: ${file}`,
    );
  }
  return {
    id: norm(item.ID),
    path: item.Path,
    scope: scope[0],
    templateId: norm(item.Template),
    languages: (item.Languages ?? []).map((language) => ({
      language: language.Language,
      versions: (language.Versions ?? []).map((v) => v.Version),
    })),
    blobFields: fields.filter((f) => /blob/i.test(f.Hint ?? "") && f.Value)
      .length,
  };
}
function inventory(directory) {
  let yaml;
  try {
    yaml = createRequire(
      path.join(ROOT, "examples/liberty-mutual-agent-portal/package.json"),
    )("js-yaml");
  } catch {
    throw new Error(
      "Install the portal's locked dependencies with npm ci before using this tool (js-yaml is required).",
    );
  }
  const files = filesBelow(path.join(directory, "items")).map((file) => {
    const content = fs.readFileSync(path.join(directory, "items", file));
    let item;
    if (/\.yml$/i.test(file)) {
      let parsed;
      try {
        // SCS writes a wildcard host/environment as bare `Value: *`.
        // Normalize only the audit parser input; preserve the original YAML bytes.
        parsed = yaml.load(
          content.toString("utf8").replace(/^(\s*Value:) \*\s*$/gm, '$1 "*"'),
        );
      } catch {
        throw new Error(`Cannot audit serialized YAML: ${file}`);
      }
      item = inspectItem(parsed, file);
    }
    return {
      file: "items/" + file,
      sha256: hash(content),
      bytes: content.length,
      ...(item ? { item } : {}),
    };
  });
  const items = files.filter((file) => file.item).map((file) => file.item);
  assert(
    items.length && new Set(items.map((item) => item.id)).size === items.length,
    "Empty baseline or duplicate item IDs.",
  );
  for (const [, scope] of SCOPES)
    assert(
      items.some((item) => item.path === scope),
      `Missing scope root: ${scope}`,
    );
  return {
    files,
    itemCount: items.length,
    versionCount: items.reduce(
      (n, item) =>
        n +
        item.languages.reduce(
          (total, language) => total + language.versions.length,
          0,
        ),
      0,
    ),
    languageNames: [
      ...new Set(
        items.flatMap((item) =>
          item.languages.map((language) => language.language),
        ),
      ),
    ].sort(),
    scopes: SCOPES.map(([name, itemPath]) => ({
      name,
      path: itemPath,
      count: items.filter((item) => item.scope === name).length,
      id: items.find((item) => item.path === itemPath).id,
    })),
    blobFieldCount: items.reduce((n, item) => n + item.blobFields, 0),
    auxiliaryFileCount: files.filter((file) => !file.item).length,
  };
}
function cli(config, args, log) {
  const result = spawnSync(
    "dotnet",
    ["sitecore", "ser", ...args, "--config", config],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    },
  );
  // Native item values are deliberately not echoed into the conversation/console.
  fs.writeFileSync(log, (result.stdout ?? "") + (result.stderr ?? ""), {
    mode: 0o600,
  });
  assert(
    !result.error && result.status === 0,
    `CLI operation failed; inspect its private log: ${log}`,
  );
}
function installSession(directory) {
  const session = path.join(directory, ".sitecore");
  assert(
    !fs.existsSync(session),
    "Refusing to replace an existing CLI session directory.",
  );
  fs.mkdirSync(session, { mode: 0o700 });
  const cleanup = () => fs.rmSync(session, { recursive: true, force: true });
  try {
    fs.symlinkSync(
      path.join(ROOT, ".sitecore/user.json"),
      path.join(session, "user.json"),
    );
    const cache = path.join(ROOT, ".sitecore/package-cache");
    if (fs.existsSync(cache))
      fs.symlinkSync(cache, path.join(session, "package-cache"));
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}
async function nativeRoots(environment) {
  const { query, origin } = connection(environment);
  const roots = [];
  for (const [name, itemPath] of SCOPES) {
    const { item } = await query(
      "query($where:ItemQueryInput!){item(where:$where){itemId path}}",
      { where: { database: "master", language: "en", path: itemPath } },
    );
    assert(
      item?.path === itemPath,
      `Missing expected native root: ${itemPath}`,
    );
    roots.push({ name, path: itemPath, id: norm(item.itemId) });
  }
  return { origin, roots };
}
function externalDestination(output) {
  assert(path.isAbsolute(output), "Use an absolute backup directory.");
  assert(
    fs.existsSync(path.dirname(output)),
    "Create the backup parent directory first.",
  );
  const resolved = path.join(
    fs.realpathSync(path.dirname(output)),
    path.basename(output),
  );
  const realRoot = fs.realpathSync(ROOT);
  assert(
    !within(resolved, realRoot) && resolved !== realRoot,
    "Backups must be outside the disposable repository clone.",
  );
  assert(
    !fs.existsSync(resolved),
    "Refusing to overwrite an existing baseline.",
  );
  return resolved;
}
async function capture(environment, output) {
  output = externalDestination(output);
  const native = await nativeRoots(environment);
  fs.mkdirSync(output, { mode: 0o700 });
  write(path.join(output, "sitecore.json"), rootConfig());
  write(path.join(output, "Baseline.module.json"), moduleConfig());
  write(path.join(output, "manifest.json"), {
    schemaVersion: 1,
    complete: false,
    capturedAt: new Date().toISOString(),
    sourceOrigin: native.origin,
  });
  const cleanSession = installSession(output);
  try {
    cli(
      output,
      ["pull", "-n", environment, "-i", NAMESPACE],
      path.join(output, "capture.log"),
    );
    const summary = inventory(output);
    for (const root of native.roots)
      assert(
        summary.scopes.some(
          (scope) => scope.path === root.path && scope.id === root.id,
        ),
        "Native root identity changed during capture.",
      );
    cli(
      output,
      ["validate", "-i", NAMESPACE],
      path.join(output, "validation.log"),
    );
    const manifest = {
      schemaVersion: 1,
      complete: true,
      capturedAt: new Date().toISOString(),
      sourceOrigin: native.origin,
      repositoryCommit: spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: ROOT,
        encoding: "utf8",
      }).stdout.trim(),
      excludedFields: EXCLUDED_FIELDS,
      ...summary,
    };
    write(path.join(output, "manifest.json"), manifest);
    console.log(
      JSON.stringify(
        {
          output,
          itemCount: summary.itemCount,
          versionCount: summary.versionCount,
          languageNames: summary.languageNames,
          scopes: summary.scopes,
          blobFieldCount: summary.blobFieldCount,
          auxiliaryFileCount: summary.auxiliaryFileCount,
        },
        null,
        2,
      ),
    );
  } finally {
    cleanSession();
  }
}
function verifyBaseline(directory) {
  assert(path.isAbsolute(directory), "Use an absolute baseline path.");
  for (const file of [
    "manifest.json",
    "sitecore.json",
    "Baseline.module.json",
  ]) {
    const stat = fs.lstatSync(path.join(directory, file));
    assert(
      stat.isFile() && !stat.isSymbolicLink(),
      "Baseline configuration files must be regular files.",
    );
  }
  const manifest = json(path.join(directory, "manifest.json"));
  assert(
    manifest.schemaVersion === 1 && manifest.complete === true,
    "Baseline capture is incomplete.",
  );
  assert.deepEqual(
    json(path.join(directory, "sitecore.json")),
    rootConfig(),
    "Baseline configuration has changed.",
  );
  assert.deepEqual(
    json(path.join(directory, "Baseline.module.json")),
    moduleConfig(),
    "Baseline scopes have changed.",
  );
  assert.deepEqual(
    inventory(directory).files,
    manifest.files,
    "Baseline contents differ from their recorded hashes/inventory.",
  );
  return manifest;
}
async function restore(
  environment,
  directory,
  { apply = false, removeAdded = false, confirmation } = {},
) {
  const manifest = verifyBaseline(directory);
  const native = await nativeRoots(environment);
  assert.equal(
    native.origin,
    manifest.sourceOrigin,
    "This restore tool supports only the captured environment; migration needs separate review.",
  );
  for (const root of native.roots)
    assert(
      manifest.scopes.some(
        (scope) => scope.path === root.path && scope.id === root.id,
      ),
      "Native root identity differs from the baseline.",
    );
  if (apply) {
    assert.equal(
      confirmation,
      native.origin,
      "Apply requires --confirm-origin with the exact captured authoring origin.",
    );
    connection(environment, true);
  }
  const staging = fs.mkdtempSync(
    path.join(os.tmpdir(), "liberty-content-restore-"),
  );
  fs.chmodSync(staging, 0o700);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const log = path.join(
    directory,
    `restore-${apply ? "apply" : "plan"}-${removeAdded ? "remove-added" : "preserve-added"}-${timestamp}.log`,
  );
  try {
    fs.cpSync(path.join(directory, "items"), path.join(staging, "items"), {
      recursive: true,
    });
    write(path.join(staging, "sitecore.json"), rootConfig());
    write(
      path.join(staging, "Baseline.module.json"),
      moduleConfig(removeAdded),
    );
    installSession(staging);
    cli(
      staging,
      [
        "push",
        "-n",
        environment,
        "-i",
        NAMESPACE,
        ...(apply ? [] : ["--what-if"]),
      ],
      log,
    );
    console.log(
      JSON.stringify(
        {
          mode: apply ? "applied" : "what-if",
          removeAddedSiteContent: removeAdded,
          deletionScope: removeAdded ? SITE : null,
          published: false,
          log,
        },
        null,
        2,
      ),
    );
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}
function argumentsFor(argv) {
  const [command, ...rest] = argv;
  assert(
    ["capture", "verify", "restore"].includes(command),
    "Use capture, verify, or restore. See docs/content-baseline.md.",
  );
  const options = {};
  const flags = new Set(["--apply", "--remove-added-site-content"]);
  const valued = new Set([
    "--environment",
    "--output",
    "--baseline",
    "--confirm-origin",
  ]);
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    assert(
      (flags.has(flag) || valued.has(flag)) && !(flag in options),
      `Unexpected or duplicate option: ${flag}`,
    );
    if (flags.has(flag)) options[flag] = true;
    else {
      assert(
        rest[i + 1] && !rest[i + 1].startsWith("--"),
        `Value required: ${flag}`,
      );
      options[flag] = rest[++i];
    }
  }
  if (command !== "restore")
    assert(
      !options["--apply"] &&
        !options["--remove-added-site-content"] &&
        !options["--confirm-origin"],
      "Mutation options are valid only for restore.",
    );
  return { command, options };
}
async function main() {
  const { command, options: o } = argumentsFor(process.argv.slice(2));
  if (command === "verify") {
    const result = verifyBaseline(o["--baseline"]);
    console.log(
      JSON.stringify({
        verified: true,
        itemCount: result.itemCount,
        versionCount: result.versionCount,
      }),
    );
    return;
  }
  assert(o["--environment"], "An explicit --environment is required.");
  if (command === "capture") return capture(o["--environment"], o["--output"]);
  return restore(o["--environment"], o["--baseline"], {
    apply: !!o["--apply"],
    removeAdded: !!o["--remove-added-site-content"],
    confirmation: o["--confirm-origin"],
  });
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = {
  SITE,
  SCOPES,
  EXCLUDED_FIELDS,
  moduleConfig,
  rootConfig,
  inspectItem,
  argumentsFor,
  externalDestination,
  verifyBaseline,
  filesBelow,
  installSession,
};
