#!/usr/bin/env node
'use strict';
/** Read-only acceptance of the native Page Builder insertion permissions.
 * ENVIRONMENT [--report /absolute/path/to/permissions.json]
 * Reads latest English page versions and edit-mode layout chrome. It does not
 * retry, refresh credentials, track visits, modify, approve, or publish items.
 */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const SITE = 'liberty-mutual-agent-portal';
const HOME = '/sitecore/content/LibertyMutual/' + SITE + '/Home';
const RENDERINGS = Object.freeze({
  AgentGuidance: '193a0299b5b65668b7929f3552463163',
  ResourceSearch: '15cf6efac180563ab229c08f2dac3dad',
  ResourceArticle: '980ad02c08e55f279f08f28e829ca94d',
  ProductSpotlight: '1962d596418751c9a91f4d39a9318b51',
});
const PRODUCT_ROUTES = ['personal', 'small-commercial', 'farm-ranch', 'midsize-large', 'retail-specialty', 'surety', 'wholesale-specialty'];
const norm = value => String(value || '').replace(/[{}-]/g, '').toLowerCase();
const GUID = /^(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}|\{[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\})$/i;
class PermissionCheckError extends Error {
  constructor(code, detail = {}) { super(code); this.name = 'PermissionCheckError'; this.code = code; this.detail = detail; }
}
function insist(condition, code, detail) { if (!condition) throw new PermissionCheckError(code, detail); }
function placements(route) {
  if (route.startsWith('/resources/')) return { 'headless-resource-article': RENDERINGS.ResourceArticle };
  if (route === '/resources') return { 'headless-resource-search': RENDERINGS.ResourceSearch, 'headless-agent-guidance': RENDERINGS.AgentGuidance };
  if (route === '/products') return { 'headless-agent-guidance': RENDERINGS.AgentGuidance, 'headless-products-spotlight': RENDERINGS.ProductSpotlight };
  return { 'headless-agent-guidance': RENDERINGS.AgentGuidance };
}
function portalRoutes(manifest) {
  insist(manifest?.site === HOME.slice(0, -5), 'unexpected-site-manifest');
  for (const [name, id] of Object.entries(RENDERINGS)) insist(norm(manifest.renderingIds?.[name]) === id, 'unexpected-rendering-manifest');
  const base = ['/', '/quote', '/clients', '/products', '/growth', '/resources', '/support'];
  insist(Array.isArray(manifest.resourcePages) && manifest.resourcePages.length === 12, 'unexpected-resource-manifest');
  const resources = manifest.resourcePages.map(item => {
    insist(typeof item.route === 'string' && /^\/resources\/[a-z0-9-]+$/.test(item.route) && GUID.test(item.pageId), 'invalid-resource-manifest');
    return item.route;
  });
  const routes = [...base, ...PRODUCT_ROUTES.map(slug => '/products/' + slug), ...resources];
  insist(routes.length === 26 && new Set(routes).size === 26, 'unexpected-page-inventory');
  return routes;
}
function pagePath(route) { return route === '/' ? HOME : HOME + route; }
function latestPage(item, route) {
  insist(item && GUID.test(item.itemId) && item.path === pagePath(route), 'missing-or-mismatched-page', { route });
  insist(Array.isArray(item.versions), 'missing-page-versions', { route });
  const versions = item.versions.filter(v => v.language?.name === 'en').map(v => v.version);
  insist(versions.length > 0 && versions.every(v => Number.isSafeInteger(v) && v > 0) && new Set(versions).size === versions.length,
    'invalid-english-page-versions', { route });
  return { route, itemId: norm(item.itemId), version: Math.max(...versions), language: 'en' };
}
function inspectPermissions(response, page) {
  const sitecore = response?.sitecore || response?.layout?.sitecore;
  insist(sitecore?.context?.pageEditing === true && sitecore.context.pageState === 'edit' &&
    sitecore.context.language === 'en' && sitecore.context.site?.name === SITE, 'not-site-editing-metadata');
  const route = sitecore.route;
  insist(route && GUID.test(route.itemId) && norm(route.itemId) === page.itemId && route.itemLanguage === 'en' &&
    route.itemVersion === page.version, 'wrong-page-or-version-metadata');
  const expected = placements(page.route), slots = route.placeholders;
  insist(slots && typeof slots === 'object' && !Array.isArray(slots), 'missing-placeholders');
  const actualKeys = Object.keys(slots);
  insist(actualKeys.length === Object.keys(expected).length && actualKeys.every(key => Object.hasOwn(expected, key)),
    'unexpected-placeholder-inventory', { expectedPlaceholders: Object.keys(expected), actualCount: actualKeys.length });
  const findings = [];
  for (const [key, renderingId] of Object.entries(expected)) {
    const entries = slots[key];
    insist(Array.isArray(entries), 'invalid-placeholder-payload', { placeholder: key });
    const chrome = entries.filter(entry => entry?.attributes?.chrometype === 'placeholder');
    const open = chrome.filter(entry => entry.attributes.kind === 'open'), close = chrome.filter(entry => entry.attributes.kind === 'close');
    insist(chrome.length === 2 && open.length === 1 && close.length === 1 && entries.indexOf(open[0]) < entries.indexOf(close[0]),
      'missing-or-ambiguous-placeholder-chrome', { placeholder: key });
    insist(open[0].name === 'code' && open[0].type === 'text/sitecore' && open[0].attributes.key === key &&
      close[0].name === 'code' && close[0].type === 'text/sitecore' && close[0].attributes.hintname === key,
      'mismatched-placeholder-chrome', { placeholder: key });
    insist(typeof open[0].contents === 'string' && open[0].contents.length < 262144, 'invalid-placeholder-chrome-json', { placeholder: key });
    let custom;
    try { custom = JSON.parse(open[0].contents).custom; } catch { throw new PermissionCheckError('invalid-placeholder-chrome-json', { placeholder: key }); }
    insist(custom && custom.placeholderKey === key && Array.isArray(custom.placeholderMetadataKeys) &&
      custom.placeholderMetadataKeys.length === 1 && custom.placeholderMetadataKeys[0] === key,
      'mismatched-placeholder-metadata-key', { placeholder: key });
    insist(custom.editable === true || /^true$/i.test(String(custom.editable)), 'placeholder-not-editable', { placeholder: key });
    const context = custom.contextItem;
    insist(context && GUID.test(context.id) && norm(context.id) === page.itemId && context.version === page.version && context.language === 'en',
      'wrong-placeholder-page-context', { placeholder: key });
    const allowed = custom.allowedRenderings;
    insist(Array.isArray(allowed) && allowed.every(id => typeof id === 'string' && GUID.test(id)), 'invalid-allowed-renderings', { placeholder: key });
    const ids = allowed.map(norm);
    const passed = ids.length === 1 && ids[0] === renderingId;
    findings.push({ placeholder: key, expectedRenderingId: renderingId, allowedRenderingIds: ids, passed,
      ...(passed ? {} : { failure: 'unexpected-allowed-renderings' }) });
  }
  return { ...page, passed: findings.every(f => f.passed), placeholders: findings };
}
function connection(environment, options = {}) {
  insist(typeof environment === 'string' && /^[a-z\d_-]+$/i.test(environment), 'invalid-cli-environment');
  const config = options.config || JSON.parse(fs.readFileSync(path.join(ROOT, '.sitecore/user.json'), 'utf8'));
  const entries = Object.entries(config.endpoints || {});
  const find = name => entries.find(([key]) => key.toLowerCase() === String(name).toLowerCase())?.[1];
  const endpoint = find(environment);
  insist(endpoint?.host, 'missing-cli-environment');
  let origin;
  try { origin = new URL(endpoint.host); } catch { throw new PermissionCheckError('invalid-cm-origin'); }
  insist(origin.protocol === 'https:' && !origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === '/', 'invalid-cm-origin');
  let auth = endpoint; const seen = new Set();
  while (auth.ref) { insist(!seen.has(auth.ref.toLowerCase()), 'cyclic-cli-authentication'); seen.add(auth.ref.toLowerCase()); auth = find(auth.ref); insist(auth, 'missing-cli-authentication'); }
  insist(typeof auth.accessToken === 'string' && auth.accessToken, 'missing-cli-authentication');
  const fetcher = options.fetch || fetch;
  async function request(url, method, body) {
    let response;
    try {
      response = await fetcher(url, { method, headers: { Authorization: 'Bearer ' + auth.accessToken, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(20000) });
    } catch { throw new PermissionCheckError('native-request-failed'); }
    insist(response.ok, 'native-request-failed');
    try { return await response.json(); } catch { throw new PermissionCheckError('invalid-native-json'); }
  }
  return {
    async query(document, variables) {
      insist(/^query\b/.test(document), 'read-only-query-required');
      const result = await request(new URL('/sitecore/api/authoring/graphql/v1/', origin), 'POST', { query: document, variables });
      insist(result.data && !result.errors?.length, 'native-query-failed');
      return result.data;
    },
    async layout(page) {
      insist(GUID.test(page.itemId) && Number.isSafeInteger(page.version) && page.version > 0, 'invalid-layout-page');
      const url = new URL('/sitecore/api/layout/render/sxa-jss', origin);
      for (const [key, value] of Object.entries({ sc_headless_mode: 'edit', item: page.itemId, sc_lang: 'en', sc_site: SITE, version: String(page.version), tracking: 'false' })) url.searchParams.set(key, value);
      return request(url, 'GET');
    },
  };
}
async function discoverPages(client, routes) {
  const pages = [];
  for (let offset = 0; offset < routes.length; offset += 6) {
    const batch = routes.slice(offset, offset + 6), variables = {};
    const definitions = batch.map((_, index) => `$p${index}:String!`).join(',');
    const selection = batch.map((route, index) => {
      variables['p' + index] = pagePath(route);
      return `p${index}:item(where:{database:"master",path:$p${index},language:"en"}){itemId path versions(allLanguages:true){version language{name}}}`;
    }).join(' ');
    const result = await client.query(`query(${definitions}){${selection}}`, variables);
    batch.forEach((route, index) => pages.push(latestPage(result['p' + index], route)));
  }
  insist(new Set(pages.map(page => page.itemId)).size === routes.length, 'duplicate-native-page-id');
  return pages;
}
async function verifyPages(client, pages, onPage = () => {}) {
  const results = [];
  for (const page of pages) {
    const response = await client.layout(page);
    let result;
    try { result = inspectPermissions(response, page); }
    catch (error) {
      if (!(error instanceof PermissionCheckError)) throw error;
      result = { ...page, passed: false, failure: error.code, ...error.detail };
    }
    results.push(result); onPage(result);
  }
  return { checkedAt: new Date().toISOString(), readOnly: true, site: SITE, language: 'en', checkedPages: pages.length,
    passed: results.every(page => page.passed), pages: results };
}
async function main() {
  const [environment, ...args] = process.argv.slice(2);
  let reportFile;
  if (args.length) {
    insist(args.length === 2 && args[0] === '--report' && path.isAbsolute(args[1]), 'invalid-report-option');
    reportFile = args[1]; insist(!fs.existsSync(reportFile), 'report-already-exists');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'authoring/items/liberty-mutual/content-manifest.json'), 'utf8'));
  const client = connection(environment), pages = await discoverPages(client, portalRoutes(manifest));
  const report = await verifyPages(client, pages, result => console.log(JSON.stringify(result)));
  if (reportFile) fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, checkedPages: report.checkedPages, failedPages: report.pages.filter(page => !page.passed).length, ...(reportFile ? { reportFile } : {}) }));
  if (!report.passed) process.exitCode = 1;
}
module.exports = { SITE, HOME, RENDERINGS, PermissionCheckError, placements, portalRoutes, latestPage, inspectPermissions, connection, discoverPages, verifyPages };
if (require.main === module) main().catch(error => {
  console.error(JSON.stringify({ passed: false, reason: error instanceof PermissionCheckError ? error.code : 'configuration-or-native-request-failed' }));
  process.exitCode = 1;
});
