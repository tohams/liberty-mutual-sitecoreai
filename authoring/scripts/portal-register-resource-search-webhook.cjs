#!/usr/bin/env node
"use strict";
/** Portal-specific wrapper over the environment-bound, read-before-write registrar. */
const shared = require("./public-register-search-webhook.cjs");
const HOOK_CONFIG = Object.freeze({
  label: "Liberty Mutual agent resource Search sync",
  clientName: "Liberty Mutual Portal webhook setup",
  clientDescription:
    "Temporary environment-scoped setup client for the Agent Portal resource Search completion webhook.",
  originKey: "PORTAL_RESOURCE_PUBLIC_ORIGIN",
  secretKey: "PORTAL_RESOURCE_PUBLICATION_WEBHOOK_SECRET",
  site: "liberty-mutual-agent-portal",
  route: "/api/sitecore/resource-publication",
});
module.exports = {
  ...shared,
  LABEL: HOOK_CONFIG.label,
  HOOK_CONFIG,
  edgeClientRequest: () => shared.edgeClientRequest(HOOK_CONFIG),
  desiredHook: (settings) => shared.desiredHook(settings, HOOK_CONFIG),
  register: (options) =>
    shared.register({ ...options, hookConfig: HOOK_CONFIG }),
  main: () =>
    shared.main(HOOK_CONFIG, "portal-register-resource-search-webhook.cjs"),
};
if (require.main === module)
  shared
    .main(HOOK_CONFIG, "portal-register-resource-search-webhook.cjs")
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
