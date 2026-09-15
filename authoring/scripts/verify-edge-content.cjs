#!/usr/bin/env node
// Read-only native Content SDK check. Prints only content IDs/field names, never configuration or credentials.
const path = require('node:path');
const { createRequire } = require('node:module');
const fs = require('node:fs');

function expectedPlacements(route) {
  if (route.startsWith('/resources/')) return { 'headless-resource-article': 'ResourceArticle' };
  if (route === '/resources') return { 'headless-resource-search': 'ResourceSearch', 'headless-agent-guidance': 'AgentGuidance' };
  if (route === '/products') return { 'headless-agent-guidance': 'AgentGuidance', 'headless-products-spotlight': 'ProductSpotlight' };
  return { 'headless-agent-guidance': 'AgentGuidance' };
}

function verifyComposition(route, data, manifest) {
  if (!data) throw new Error('Missing page');
  const placements = expectedPlacements(route);
  const actualKeys = Object.keys(data.placeholders || {});
  if (actualKeys.length !== Object.keys(placements).length || actualKeys.some(key => !(key in placements))) {
    throw new Error('Unexpected placeholder');
  }
  const evidence = [];
  for (const [placeholder, expected] of Object.entries(placements)) {
    const components = data.placeholders[placeholder];
    if (!Array.isArray(components) || components.length === 0) throw new Error('Missing composition');
    for (const component of components) {
      if (component.componentName !== expected) throw new Error('Unexpected component');
      const keys = Object.keys(component.fields || {});
      if (expected === 'ResourceSearch') {
        const value = component.fields?.search?.value;
        const configuration = typeof value === 'string' ? JSON.parse(value) : value;
        if (configuration?.searchIndex !== manifest.resourceSearch.sourceId || configuration.fieldsMapping?.title !== 'Title') throw new Error('Missing native search configuration');
      } else if (!component.fields?.body?.value || !component.fields?.[expected === 'ResourceArticle' ? 'Title' : 'headline']?.value) {
        throw new Error('Missing editable fields');
      }
      evidence.push({ route, itemId: data.itemId, placeholder, component: component.componentName, fields: keys });
    }
  }
  return evidence;
}

let activeRoute;
async function main() {
  const appRoot = path.resolve(__dirname, '../../examples/liberty-mutual-agent-portal');
  const appRequire = createRequire(path.join(appRoot, 'package.json'));
  appRequire('@next/env').loadEnvConfig(appRoot);
  const { SitecoreClient } = appRequire('@sitecore-content-sdk/nextjs/client');
  const { defineConfig } = appRequire('@sitecore-content-sdk/nextjs/config');
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../items/liberty-mutual/content-manifest.json'), 'utf8'));
  const client = new SitecoreClient(defineConfig({
    api: { edge: { contextId: process.env.SITECORE_EDGE_CONTEXT_ID || '', clientContextId: process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID || '', edgeUrl: process.env.NEXT_PUBLIC_SITECORE_EDGE_PLATFORM_HOSTNAME || 'https://edge-platform.sitecorecloud.io' } },
    defaultSite: 'liberty-mutual-agent-portal', defaultLanguage: 'en', generateStaticPaths: false,
  }));
  const routes = ['/', '/quote', '/clients', '/products', '/growth', '/resources', '/support', ...manifest.resourcePages.map(x => x.route), ...['personal','small-commercial','farm-ranch','midsize-large','retail-specialty','surety','wholesale-specialty'].map(x => '/products/' + x)];
  for (const route of routes) {
    activeRoute = route;
    const page = await client.getPage(route, { site: 'liberty-mutual-agent-portal', locale: 'en' }, { cache: 'no-store' });
    const data = page?.layout?.sitecore?.route;
    for (const evidence of verifyComposition(route, data, manifest)) console.log(JSON.stringify(evidence));
  }
  activeRoute = undefined;
  const projection = await client.getData('query { __type(name: "ResourcePage") { name fields { name } } }');
  const projected = new Set(projection?.__type?.fields?.map(field => field.name));
  if (!['title','summary','body','resourceType','state','reviewedAt','sourceLink','businessFamily','product','channel'].every(field => projected.has(field))) throw new Error('Missing template projection');
  console.log('Verified ' + routes.length + ' native Edge pages, compositions and editable field payloads.');
}

module.exports = { expectedPlacements, verifyComposition };

if (require.main === module) main().catch((error) => {
  const safeMessages = new Set(['Missing page', 'Missing composition', 'Unexpected placeholder', 'Unexpected component', 'Missing editable fields', 'Missing template projection', 'Missing native search configuration']);
  console.error(JSON.stringify({errorType: error?.name, reason: safeMessages.has(error?.message) ? error.message : 'SDK request failed', route: activeRoute, status: error?.response?.status || error?.status}));
  if (process.env.PORTAL_VERIFY_DEBUG === 'true') {
    let safe = String(error?.stack || error?.message || error).split('\n').slice(0, 5).join('\n');
    for (const [key, value] of Object.entries(process.env)) if (/SECRET|TOKEN|PASSWORD|CONTEXT|API_KEY/.test(key) && value && value.length > 8) safe = safe.split(value).join('[redacted]');
    console.error(safe.replace(/([?&](?:sitecoreContextId|sc_apikey|token|key)=)[^&\s]+/gi, '$1[redacted]'));
  }
  console.error('Native Edge content verification failed. Inspect the private connection or scoped publication status; no credentials were logged.');
  process.exitCode = 1;
});
