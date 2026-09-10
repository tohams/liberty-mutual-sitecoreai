#!/usr/bin/env node
/** Configure only this portal's dedicated editing host and site grouping.
 * Default is read-only. --apply is an explicit infrastructure configuration action.
 * Uses the established Sitecore CLI login; never prints authentication or reads browser state.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const [environmentName, editingUrl, deliveryUrl, applyFlag] = process.argv.slice(2);
const siteName = 'liberty-mutual-agent-portal';
const siteGroupingPath = `/sitecore/content/LibertyMutual/${siteName}/Settings/Site Grouping/${siteName}`;
const hostParent = '/sitecore/system/Settings/Services/Rendering Hosts';
const ownedHostPath = `${hostParent}/${siteName}`;
const hostTemplate = 'bc71d442-3e4f-46ba-887c-746e54f9bb83';

function origin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.port) {
    throw new Error('Supply an HTTPS origin without a path, credentials, query, fragment or custom port.');
  }
  return url;
}

async function main() {
  if (!environmentName || !editingUrl || !deliveryUrl || (applyFlag && applyFlag !== '--apply')) {
    throw new Error('Usage: node authoring/scripts/configure-portal-host.cjs ENVIRONMENT https://EDITING_HOST https://DELIVERY_HOST [--apply]');
  }
  const editing = origin(editingUrl);
  const delivery = origin(deliveryUrl);
  const config = JSON.parse(fs.readFileSync(path.join(root, '.sitecore/user.json'), 'utf8'));
  const endpointByName = (name) => Object.entries(config.endpoints).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  const endpoint = endpointByName(environmentName);
  if (!endpoint?.host || (applyFlag && endpoint.allowWrite !== true)) throw new Error('Select a configured CLI environment with the required access.');
  let authentication = endpoint;
  const visited = new Set();
  while (authentication.ref) {
    const reference = authentication.ref.toLowerCase();
    if (visited.has(reference)) throw new Error('Invalid CLI authentication reference.');
    visited.add(reference);
    authentication = endpointByName(reference);
    if (!authentication) throw new Error('Missing CLI authentication reference.');
  }
  if (!authentication.accessToken) throw new Error('Run the normal Sitecore CLI login before this command.');

  async function request(query, variables) {
    const response = await fetch(new URL('/sitecore/api/authoring/graphql/v1/', endpoint.host), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authentication.accessToken}` },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || result.errors?.length) throw new Error(`Authoring request failed (HTTP ${response.status}); no response or credentials logged.`);
    return result.data;
  }
  const readQuery = `query PortalHost($path:String!) {
    item(where:{database:"master",path:$path,language:"en"}) {
      itemId name path template { templateId }
      fields(first:100,excludeStandardFields:true) { nodes { name value } }
    }
  }`;
  const read = async (itemPath) => (await request(readQuery, { path: itemPath })).item;
  const grouping = await read(siteGroupingPath);
  const parent = await read(hostParent);
  let host = await read(ownedHostPath);
  if (grouping?.path !== siteGroupingPath || parent?.path !== hostParent || (host && host.path !== ownedHostPath)) {
    throw new Error('Refusing configuration outside the dedicated portal items.');
  }
  if (host && host.template.templateId.replaceAll('-', '').toLowerCase() !== hostTemplate.replaceAll('-', '')) {
    throw new Error('The existing dedicated host has an unexpected template.');
  }
  const fieldsOf = (item) => Object.fromEntries(item.fields.nodes.map((field) => [field.name, field.value]));
  const currentGrouping = fieldsOf(grouping);
  if (currentGrouping.SiteName !== siteName) throw new Error('Site grouping does not belong to this portal.');
  const hostFields = {
    AppName: siteName,
    ServerSideRenderingEngineApplicationUrl: editing.origin + '/',
    ServerSideRenderingEngineEndpointUrl: editing.origin + '/api/editing/render',
    ServerSideRenderingEngineConfigUrl: editing.origin + '/api/editing/config',
  };
  const groupingFields = {
    RenderingHost: siteName,
    HostName: [...new Set([delivery.hostname, editing.hostname])].join('|'),
    TargetHostName: delivery.hostname,
    Scheme: 'https',
  };
  console.log(JSON.stringify({ mode: applyFlag ? 'apply' : 'read-only',
    dedicatedHost: { path: ownedHostPath, operation: host ? 'update' : 'create', fields: hostFields },
    siteGrouping: { path: siteGroupingPath, fields: groupingFields, preservedAnalyticsMapping: currentGrouping.POS },
  }, null, 2));
  if (!applyFlag) return;

  const values = (fields) => Object.entries(fields).map(([name, value]) => ({ name, value }));
  if (!host) {
    const created = await request(`mutation CreatePortalHost($input:CreateItemInput!) { createItem(input:$input) { item { itemId path } } }`, {
      input: { database: 'master', language: 'en', parent: parent.itemId, templateId: hostTemplate, name: siteName, fields: values(hostFields) },
    });
    if (created.createItem?.item?.path !== ownedHostPath) throw new Error('Dedicated host creation did not return the expected path.');
    host = await read(ownedHostPath);
  } else {
    await request(`mutation UpdatePortalHost($input:UpdateItemInput!) { updateItem(input:$input) { item { itemId } } }`, {
      input: { database: 'master', language: 'en', itemId: host.itemId, fields: values(hostFields) },
    });
  }
  await request(`mutation UpdatePortalGrouping($input:UpdateItemInput!) { updateItem(input:$input) { item { itemId } } }`, {
    input: { database: 'master', language: 'en', itemId: grouping.itemId, fields: values(groupingFields) },
  });
  for (const [itemPath, expected] of [[ownedHostPath, hostFields], [siteGroupingPath, groupingFields]]) {
    const actual = fieldsOf(await read(itemPath));
    if (Object.entries(expected).some(([key, value]) => actual[key] !== value)) throw new Error('Configuration read-back did not match the requested fields.');
    if (itemPath === siteGroupingPath && actual.POS !== currentGrouping.POS) throw new Error('Analytics mapping unexpectedly changed.');
  }
  console.log('Verified dedicated host and grouping configuration. Shared rendering hosts were not modified.');
  console.log('Publish the owned site grouping to Edge, regenerate SDK site metadata, and verify the editing canvas against its Preview-configured host.');
}

main().catch((error) => {
  // Only deliberately constructed errors above are safe to print.
  const safe = /^(Usage:|Supply an HTTPS|Select a configured|Invalid CLI|Missing CLI|Run the normal|Authoring request failed|Refusing configuration|The existing dedicated|Site grouping|Dedicated host creation|Configuration read-back|Analytics mapping)/;
  console.error(safe.test(error.message || '') ? error.message : 'Portal host configuration failed; inspect the selected environment privately.');
  process.exitCode = 1;
});
