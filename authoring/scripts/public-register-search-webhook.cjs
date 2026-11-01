#!/usr/bin/env node
"use strict";
/** Register only this environment's public Search completion hook.
 * Default: authenticated read-only plan. --apply creates only a missing owned hook.
 * Credentials and runtime settings are read from private files; no browser state is used.
 *
 * ENV --edge-client /abs/private-client.json --runtime-env /abs/public.env.local
 *     --report /abs/private-plan.json [--apply --before /abs/private-before.json]
 *
 * Private client file: { projectId, environmentId, clientId, clientSecret }.
 * Never store this short-lived setup client's credentials in Vercel or source.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { parseEnv } = require("node:util");
const {
  ROOT,
  connection,
  writePrivate,
} = require("./campaign-native-client.cjs");

const BINDING = Object.freeze({
  projectId: "7f0TVOCnwZyTYy9vJwhC8",
  environmentId: "4Ng6xXzEpoWJNPisksPG2y",
  cmOrigin:
    "https://xmc-scaipocusem400b-sitecoreai950c-demo4418.sitecorecloud.io",
});
const LABEL = "Liberty Mutual public knowledge Search sync";
const EDGE_ADMIN = "https://edge.sitecorecloud.io/api/admin/v1/webhooks";
const DEPLOY = "https://xmclouddeploy-api.sitecorecloud.io";
const CLIENT_MANAGEMENT_SCOPE = "xmclouddeploy.clients:manage";
const digest = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function edgeClientRequest() {
  return {
    projectId: BINDING.projectId,
    environmentId: BINDING.environmentId,
    name: "Liberty Mutual public webhook setup",
    description:
      "Temporary environment-scoped setup client for the public Search completion webhook.",
  };
}
function desiredHook(settings) {
  const url = new URL(
    settings.PUBLIC_SITE_URL || settings.NEXT_PUBLIC_SITE_URL || "",
  );
  assert(
    url.protocol === "https:" &&
      url.pathname === "/" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
    "Provide the deployed public HTTPS origin.",
  );
  assert(
    typeof settings.PUBLICATION_WEBHOOK_SECRET === "string" &&
      settings.PUBLICATION_WEBHOOK_SECRET.length >= 24,
    "Provide the dedicated publication webhook secret.",
  );
  return {
    label: LABEL,
    uri: `${url.origin}/api/sitecore/publication`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.PUBLICATION_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      schemaVersion: 1,
      site: "liberty-mutual-public-site",
      event: "edge-publish-complete",
    }),
    createdBy: "Sitecore solutions team",
    executionMode: "OnEnd",
  };
}
function hookSignature(hook) {
  return {
    label: hook.label,
    uri: hook.uri,
    method: hook.method,
    headers: Object.fromEntries(
      Object.entries(hook.headers || {})
        .map(([key, value]) => [key.toLowerCase(), value])
        .sort(),
    ),
    body: hook.body,
    executionMode: hook.executionMode || "OnEnd",
    disabled: hook.disabled === true,
  };
}
function summarize(hook) {
  return hook
    ? {
        id: hook.id,
        label: hook.label,
        uri: hook.uri,
        executionMode: hook.executionMode || "OnEnd",
        disabled: hook.disabled === true,
        lastRuns: (hook.lastRuns || []).map((row) => ({
          timestamp: row.timestamp,
          success: row.success,
        })),
      }
    : null;
}
function cloudCredential(environment) {
  const config = JSON.parse(
    fs.readFileSync(path.join(ROOT, ".sitecore/user.json"), "utf8"),
  );
  const find = (name) =>
    Object.entries(config.endpoints).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    )?.[1];
  let endpoint = find(environment);
  assert(
    endpoint && new URL(endpoint.host).origin === BINDING.cmOrigin,
    "Only the Liberty Mutual POC environment is in scope.",
  );
  const seen = new Set();
  while (endpoint.ref) {
    assert(!seen.has(endpoint.ref), "CLI authentication reference cycle.");
    seen.add(endpoint.ref);
    endpoint = find(endpoint.ref);
    assert(endpoint);
  }
  assert(
    endpoint.accessToken,
    "Use the normal authenticated Sitecore CLI environment.",
  );
  let claims;
  try {
    claims = JSON.parse(
      Buffer.from(endpoint.accessToken.split(".")[1], "base64url"),
    );
  } catch {
    throw new Error("The normal CLI access token could not be inspected.");
  }
  assert(
    String(claims.scope || "")
      .split(" ")
      .includes(CLIENT_MANAGEMENT_SCOPE),
    "CLI credentials need xmclouddeploy.clients:manage for environment client setup.",
  );
  return endpoint.accessToken;
}
async function jsonRequest(
  url,
  { method = "GET", token, body, transport = fetch } = {},
) {
  let response, result;
  try {
    response = await transport(url, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    result = await response.json();
  } catch {
    throw new Error(
      `${method === "GET" ? "Read" : "Native request"} not confirmed. Inspect the owned webhook before retrying; credentials and provider responses were suppressed.`,
    );
  }
  return result;
}
async function edgeToken(client, transport = fetch) {
  assert(
    client.projectId === BINDING.projectId &&
      client.environmentId === BINDING.environmentId &&
      client.clientId &&
      client.clientSecret,
    "Use the private Edge administration client created for this exact environment.",
  );
  const result = await jsonRequest(
    "https://auth.sitecorecloud.io/oauth/token",
    {
      method: "POST",
      transport,
      body: {
        audience: "https://api.sitecorecloud.io",
        grant_type: "client_credentials",
        client_id: client.clientId,
        client_secret: client.clientSecret,
      },
    },
  );
  assert(
    typeof result.access_token === "string" && result.token_type === "Bearer",
    "Edge administration OAuth token was not confirmed.",
  );
  return result.access_token;
}
async function register({
  environment,
  client,
  settings,
  apply = false,
  recordBefore = () => {},
  transport = fetch,
}) {
  const cm = connection(environment, false);
  assert(cm.origin === BINDING.cmOrigin, "Unexpected authoring environment.");
  const cloudToken = cloudCredential(environment);
  const binding = await jsonRequest(
    `${DEPLOY}/api/environments/v1/${BINDING.environmentId}`,
    { token: cloudToken, transport },
  );
  assert(
    binding.id === BINDING.environmentId &&
      binding.projectId === BINDING.projectId,
    "Deploy environment/project binding changed.",
  );
  const token = await edgeToken(client, transport);
  const desired = desiredHook(settings);
  const list = await jsonRequest(EDGE_ADMIN, { token, transport });
  assert(Array.isArray(list), "Edge webhook inventory was not an array.");
  const matches = list.filter(
    (hook) => hook.label === LABEL || hook.uri === desired.uri,
  );
  assert(
    matches.length <= 1,
    "More than one hook uses this owned label or destination. Inspect duplicates before applying.",
  );
  const current = matches[0];
  if (current)
    assert.deepEqual(
      hookSignature(current),
      { ...hookSignature(desired), disabled: false },
      "An existing hook differs from the prepared public configuration. Preserve it; inspect before making an explicit change.",
    );
  const report = {
    schemaVersion: 1,
    projectId: BINDING.projectId,
    environmentId: BINDING.environmentId,
    source: "normal Sitecore CLI and environment Edge administration client",
    action: current ? "unchanged" : apply ? "created" : "create",
    desired: {
      label: desired.label,
      uri: desired.uri,
      method: desired.method,
      executionMode: desired.executionMode,
      body: desired.body,
      hasDedicatedBearer: true,
      contentType: "application/json",
    },
    before: summarize(current),
    createdClient: false,
    changedOtherHooks: false,
    requiredScopeForSetupClientCreation: CLIENT_MANAGEMENT_SCOPE,
  };
  if (!apply || current) return report;
  // Root owns this deliberate native write. Every routine execution remains read-only.
  recordBefore({
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    binding: BINDING,
    ownedHookBefore: current || null,
    desiredFingerprint: digest(hookSignature(desired)),
  });
  const created = await jsonRequest(EDGE_ADMIN, {
    method: "POST",
    token,
    body: desired,
    transport,
  });
  assert(
    created.id,
    "CreateWebhook did not return an ID. Read back before retrying.",
  );
  const verified = await jsonRequest(
    `${EDGE_ADMIN}/${encodeURIComponent(created.id)}`,
    { token, transport },
  );
  assert.deepEqual(
    hookSignature(verified),
    { ...hookSignature(desired), disabled: false },
    "Native webhook readback differs. Inspect it before retrying.",
  );
  report.after = summarize(verified);
  return report;
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(
      "public-register-search-webhook.cjs ENV --edge-client /abs/private-client.json --runtime-env /abs/public.env.local --report /abs/private-report.json [--apply --before /abs/private-before.json]",
    );
    return;
  }
  const environment = args.shift();
  const options = {};
  while (args.length) {
    const key = args.shift();
    assert(
      [
        "--edge-client",
        "--runtime-env",
        "--report",
        "--apply",
        "--before",
      ].includes(key) && !Object.hasOwn(options, key),
      "Invalid or repeated argument.",
    );
    options[key] = key === "--apply" ? true : args.shift();
  }
  for (const key of ["--edge-client", "--runtime-env", "--report"])
    assert(
      path.isAbsolute(options[key] || ""),
      `Provide ${key} as an absolute private path.`,
    );
  assert(
    environment &&
      (!options["--apply"] || path.isAbsolute(options["--before"] || "")),
    "Apply requires an absolute before-image path.",
  );
  const paths = [
    "--edge-client",
    "--runtime-env",
    "--report",
    ...(options["--before"] ? ["--before"] : []),
  ].map((key) => path.resolve(options[key]));
  assert(
    new Set(paths).size === paths.length &&
      !fs.existsSync(options["--report"]) &&
      [
        options["--report"],
        ...(options["--before"] ? [options["--before"]] : []),
      ].every(
        (file) =>
          path.resolve(file) !== ROOT &&
          !path.resolve(file).startsWith(ROOT + path.sep),
      ),
    "Use distinct inputs and new report/before-image paths.",
  );
  if (options["--apply"])
    assert(
      !fs.existsSync(options["--before"]),
      "Do not overwrite a before-image.",
    );
  const client = JSON.parse(fs.readFileSync(options["--edge-client"], "utf8"));
  const settings = parseEnv(fs.readFileSync(options["--runtime-env"], "utf8"));
  const report = await register({
    environment,
    client,
    settings,
    apply: options["--apply"] === true,
    recordBefore: (data) => writePrivate(options["--before"], data),
  });
  writePrivate(options["--report"], report);
  console.log(
    JSON.stringify({
      action: report.action,
      uri: report.desired.uri,
      executionMode: report.desired.executionMode,
      webhookId: report.after?.id || report.before?.id || null,
    }),
  );
}
module.exports = {
  BINDING,
  LABEL,
  EDGE_ADMIN,
  CLIENT_MANAGEMENT_SCOPE,
  edgeClientRequest,
  desiredHook,
  hookSignature,
  summarize,
  edgeToken,
  register,
};
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
