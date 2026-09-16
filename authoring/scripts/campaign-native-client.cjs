"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const ROOT = path.resolve(__dirname, "../..");
function connection(environment, apply = false) {
  const config = JSON.parse(
    fs.readFileSync(path.join(ROOT, ".sitecore/user.json"), "utf8"),
  );
  const find = (name) =>
    Object.entries(config.endpoints).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    )?.[1];
  const endpoint = find(environment);
  assert(
    endpoint?.host && (!apply || endpoint.allowWrite === true),
    "Use a configured writable CLI environment for apply.",
  );
  const origin = new URL(endpoint.host);
  assert(origin.protocol === "https:", "HTTPS authoring endpoint required.");
  let auth = endpoint;
  const seen = new Set();
  while (auth.ref) {
    assert(!seen.has(auth.ref), "Authentication reference cycle.");
    seen.add(auth.ref);
    auth = find(auth.ref);
    assert(auth);
  }
  assert(auth.accessToken, "Log in through the normal Sitecore CLI.");
  return {
    origin: origin.origin,
    query: async (query, variables = {}) => {
      assert(
        apply || /^query\b/.test(query),
        "Read-only mode rejected a mutation.",
      );
      let response, result;
      try {
        response = await fetch(
          new URL("/sitecore/api/authoring/graphql/v1/", origin),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + auth.accessToken,
            },
            body: JSON.stringify({ query, variables }),
            signal: AbortSignal.timeout(30000),
          },
        );
        result = await response.json();
      } catch {
        throw new Error(
          "Native response not confirmed. Read back the recorded item before retrying.",
        );
      }
      assert(
        response.ok && !result.errors?.length && result.data,
        "Native request failed; private response suppressed.",
      );
      return result.data;
    },
  };
}
async function read(query, where) {
  let first, after;
  const fields = [];
  for (let page = 0; page < 10; page++) {
    const { item } = await query(
      'query($where:ItemQueryInput!,$after:String){item(where:$where){itemId name path version language{name} parent{itemId path} template{templateId name} revision:field(name:"__Revision"){value} versions(allLanguages:true){version language{name}} children(first:100,includeHiddenItems:true){nodes{itemId name path template{templateId}}pageInfo{hasNextPage}}fields(first:100,after:$after,excludeStandardFields:false,ownFields:false,withLanguageFallback:false){nodes{fieldId name value}pageInfo{hasNextPage endCursor}}}}',
      { where: { database: "master", language: "en", ...where }, after },
    );
    if (!item) return null;
    if (!first) first = item;
    assert(
      first.revision.value === item.revision.value,
      "Item changed during read.",
    );
    fields.push(...item.fields.nodes);
    if (!item.fields.pageInfo.hasNextPage) break;
    after = item.fields.pageInfo.endCursor;
    assert(page < 9, "Incomplete field inventory.");
  }
  assert(
    first.children.pageInfo.hasNextPage === false,
    "Incomplete child inventory.",
  );
  return { ...first, children: first.children.nodes, fields };
}
const value = (item, name) =>
  item.fields.find((f) => f.name === name)?.value ?? "";
function writePrivate(file, data) {
  assert(
    path.isAbsolute(file) && !file.startsWith(ROOT + path.sep),
    "Keep native snapshots outside the repository.",
  );
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}
module.exports = { ROOT, connection, read, value, writePrivate };
