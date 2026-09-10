#!/usr/bin/env node
/** Explicit, additive migration for two owned style items. No publishing or model changes. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const environmentName = process.argv[2];
if (!environmentName) {
  console.error('Usage: node authoring/scripts/enable-portal-styles.cjs ENVIRONMENT');
  process.exit(2);
}
const styleRoot = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Presentation/Styles';
const styles = [
  { id: '0c531d6d-1fee-4ecf-a83e-200995b06b83', path: `${styleRoot}/Background color/Dark background`, value: 'container-dark-background' },
  { id: 'ff96a9d6-0ee6-4a10-9901-c1b01c4d004b', path: `${styleRoot}/Container/Bordered`, value: 'sxa-bordered' },
];
async function main() {
  const config = JSON.parse(fs.readFileSync(path.join(root, '.sitecore/user.json'), 'utf8'));
  const endpoint = Object.entries(config.endpoints).find(([name]) => name.toLowerCase() === environmentName.toLowerCase())?.[1];
  if (!endpoint?.host || endpoint.allowWrite !== true) throw new Error('Invalid writable environment.');
  let authentication = endpoint;
  const visited = new Set();
  while (authentication.ref) {
    const reference = authentication.ref.toLowerCase();
    if (visited.has(reference)) throw new Error('Invalid authentication reference.');
    visited.add(reference);
    authentication = Object.entries(config.endpoints).find(([name]) => name.toLowerCase() === reference)?.[1];
    if (!authentication) throw new Error('Missing authentication reference.');
  }
  if (!authentication.accessToken) throw new Error('Missing authentication.');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'authoring/items/liberty-mutual/content-manifest.json'), 'utf8'));
  const renderingIds = ['AgentGuidance', 'ResourceArticle', 'ResourceSearch'].map(name => {
    const id = manifest.renderingIds[name];
    if (!/^[a-f\d-]{36}$/i.test(id || '')) throw new Error('Invalid rendering identity.');
    return `{${id.toUpperCase()}}`;
  });
  async function request(query, variables) {
    const response = await fetch(new URL('/sitecore/api/authoring/graphql/v1/', endpoint.host), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authentication.accessToken}` },
      body: JSON.stringify({ query, variables }),
    });
    const result = await response.json();
    if (!response.ok || result.errors?.length) throw new Error('Style API request failed.');
    return result.data;
  }
  for (const style of styles) {
    const current = await request('query($id:ID!) { item(where:{database:"master",itemId:$id,language:"en"}) {path value:field(name:"Value"){value} allowed:field(name:"Allowed Renderings"){value}} }', { id: style.id });
    if (current.item?.path !== style.path || current.item.value?.value !== style.value) throw new Error('Style scope verification failed.');
    const allowed = [...new Set((current.item.allowed?.value.match(/\{[A-F\d-]{36}\}/gi) || []).map(id => id.toUpperCase()))];
    // Preserve the existing list, including upstream applicability; add only owned renderings.
    for (const id of renderingIds) if (!allowed.includes(id)) allowed.push(id);
    const result = await request('mutation($id:ID!,$value:String!) { updateItem(input:{database:"master",itemId:$id,language:"en",fields:[{name:"Allowed Renderings",value:$value}]}) {item{path allowed:field(name:"Allowed Renderings"){value}}} }', { id: style.id, value: allowed.join('|') });
    if (result.updateItem?.item?.path !== style.path || !renderingIds.every(id => result.updateItem.item.allowed?.value.toUpperCase().includes(id))) throw new Error('Style verification failed.');
    console.log(`Enabled portal renderings for owned style: ${style.value}`);
  }
  console.log('Publish only the two updated style item paths to Edge after reviewing the result.');
}
main().catch(() => {
  console.error('Style migration failed. Check the selected writable CLI environment and owned style metadata. No credentials were logged.');
  process.exitCode = 1;
});
