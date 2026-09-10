#!/usr/bin/env node
/** Re-save owned template metadata through Sitecore's normal Authoring API.
 * Use after serialization only if Edge template projection is stale. Never logs auth.
 * The official CLI local access token is used as documented by Sitecore; no browser storage is read.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const environmentName = process.argv[2];
if (!environmentName) {
  console.error('Usage: node authoring/scripts/refresh-template-schema.cjs ENVIRONMENT');
  process.exit(2);
}
async function main() {
  const config = JSON.parse(fs.readFileSync(path.join(root, '.sitecore/user.json'), 'utf8'));
  const endpoint = Object.entries(config.endpoints).find(([name]) => name.toLowerCase() === environmentName.toLowerCase())?.[1];
  if (!endpoint?.host || endpoint.allowWrite !== true) throw new Error('Select an authenticated CLI environment with write access.');
  let authentication = endpoint;
  const visited = new Set();
  while (authentication.ref) {
    const reference = authentication.ref.toLowerCase();
    if (visited.has(reference)) throw new Error('Invalid CLI authentication reference.');
    visited.add(reference);
    authentication = Object.entries(config.endpoints).find(([name]) => name.toLowerCase() === reference)?.[1];
    if (!authentication) throw new Error('Missing CLI authentication reference.');
  }
  if (!authentication.accessToken) throw new Error('Run the Sitecore CLI login or refresh before this command.');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'authoring/items/liberty-mutual/content-manifest.json'), 'utf8'));
  for (const [name, id] of Object.entries(manifest.templateIds)) {
    const verificationQuery = `query { item(where:{database:"master",itemId:${JSON.stringify(id)},language:"en"}) {name path} }`;
    const verificationResponse = await fetch(new URL('/sitecore/api/authoring/graphql/v1/', endpoint.host), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authentication.accessToken}` },
      body: JSON.stringify({ query: verificationQuery }),
    });
    const verification = await verificationResponse.json();
    if (!verificationResponse.ok || verification.errors?.length || verification.data?.item?.path !== `/sitecore/templates/Project/LibertyMutual/${name}`) {
      throw new Error(`Template metadata refresh refused outside the owned project scope: ${name}.`);
    }
    // Omitting sections preserves every existing field; name remains unchanged.
    const query = `mutation { updateItemTemplate(input:{templateId:${JSON.stringify(id)},name:${JSON.stringify(name)}}) {itemTemplate{name}} }`;
    const response = await fetch(new URL('/sitecore/api/authoring/graphql/v1/', endpoint.host), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authentication.accessToken}` },
      body: JSON.stringify({ query }),
    });
    const result = await response.json();
    if (!response.ok || result.errors?.length || result.data?.updateItemTemplate?.itemTemplate?.name !== name) {
      throw new Error(`Template metadata refresh failed for ${name} (HTTP ${response.status}).`);
    }
    console.log(`Refreshed owned template: ${name}`);
  }
  console.log('Next, publish only /sitecore/templates/Project/LibertyMutual with subitems, then allow the Edge cache purge to complete.');
}
main().catch((error) => {
  // Deliberately omit response bodies, URLs, and stack traces to protect local authentication.
  console.error(error.message?.startsWith('Template metadata') ? error.message : 'Template refresh failed. Check the selected CLI environment and its authentication.');
  process.exitCode = 1;
});
