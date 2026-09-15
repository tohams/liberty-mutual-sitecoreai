'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('./fixtures/placeholder-permissions-home-unfiltered.json');
const manifest = require('../items/liberty-mutual/content-manifest.json');
const { SITE, HOME, RENDERINGS, placements, portalRoutes, latestPage, inspectPermissions, connection, discoverPages, verifyPages } = require('./verify-placeholder-permissions.cjs');
const HOME_ID = 'ae9e45caf1274abe9ca72ff109981998';
const page = (route = '/', version = 1) => ({ route, itemId: HOME_ID, version, language: 'en' });
function allowed(response, key, ids) {
  const marker = response.sitecore.route.placeholders[key].find(entry => entry.attributes.chrometype === 'placeholder' && entry.attributes.kind === 'open');
  const contents = JSON.parse(marker.contents); contents.custom.allowedRenderings = ids; marker.contents = JSON.stringify(contents);
}
function responseFor(route = '/', version = 1) {
  const result = structuredClone(fixture), source = result.sitecore.route.placeholders['headless-agent-guidance'];
  result.sitecore.route.itemVersion = version; result.sitecore.route.placeholders = {};
  for (const [key, id] of Object.entries(placements(route))) {
    const open = structuredClone(source[0]), close = structuredClone(source.at(-1));
    open.attributes.key = key; close.attributes.hintname = key;
    open.contents = JSON.stringify({ custom: { placeholderKey: key, placeholderMetadataKeys: [key], editable: 'true',
      allowedRenderings: [id], contextItem: { id: HOME_ID, version, language: 'en' } } });
    result.sitecore.route.placeholders[key] = [open, close];
  }
  return result;
}
test('real redacted Home chrome reproduces the native 17-rendering permission failure', () => {
  const result = inspectPermissions(fixture, page());
  assert.equal(result.passed, false); assert.equal(result.placeholders[0].failure, 'unexpected-allowed-renderings');
  assert.equal(result.placeholders[0].allowedRenderingIds.length, 17);
  assert(result.placeholders[0].allowedRenderingIds.includes(RENDERINGS.AgentGuidance));
  assert(result.placeholders[0].allowedRenderingIds.includes(RENDERINGS.ResourceArticle));
});
test('each page role requires the exact intended key and one rendering per native insertion region', () => {
  for (const route of ['/', '/products', '/products/small-commercial', '/resources', '/resources/build-a-bop-submission']) {
    const result = inspectPermissions(responseFor(route, 7), page(route, 7));
    assert.equal(result.passed, true); assert.deepEqual(result.placeholders.map(f => f.placeholder), Object.keys(placements(route)));
    assert(result.placeholders.every(f => f.allowedRenderingIds.length === 1));
  }
});
test('an empty allowlist, duplicate ID, another owned component, and an OOTB rendering all fail', () => {
  for (const ids of [[], [RENDERINGS.AgentGuidance, RENDERINGS.AgentGuidance], [RENDERINGS.ResourceSearch],
    [RENDERINGS.AgentGuidance, 'ab2edba039604f12b765579dc231894a']]) {
    const response = responseFor(); allowed(response, 'headless-agent-guidance', ids);
    assert.equal(inspectPermissions(response, page()).passed, false);
  }
});
test('normal delivery, stale page/version, and another site cannot count as permission evidence', () => {
  for (const mutate of [r => { r.sitecore.context.pageEditing = false; }, r => { r.sitecore.context.site.name = 'DemoSite'; },
    r => { r.sitecore.route.itemVersion = 2; }, r => { r.sitecore.route.itemId = '11111111111111111111111111111111'; }]) {
    const response = responseFor(); mutate(response); assert.throws(() => inspectPermissions(response, page()));
  }
});
test('missing, duplicated, malformed or mismatched placeholder chrome fails closed', () => {
  for (const mutate of [entries => entries.pop(), entries => entries.push(structuredClone(entries[0])),
    entries => { entries[0].contents = '{broken'; }, entries => { entries[0].attributes.key = 'headless-main'; },
    entries => { const data = JSON.parse(entries[0].contents); data.custom.contextItem.version = 2; entries[0].contents = JSON.stringify(data); },
    entries => { const data = JSON.parse(entries[0].contents); data.custom.editable = false; entries[0].contents = JSON.stringify(data); },
    entries => { const data = JSON.parse(entries[0].contents); data.custom.placeholderMetadataKeys.push('headless-main'); entries[0].contents = JSON.stringify(data); }]) {
    const response = responseFor(); mutate(response.sitecore.route.placeholders['headless-agent-guidance']);
    assert.throws(() => inspectPermissions(response, page()));
  }
});
test('extra or absent route placeholders fail even when existing allowlists are correct', () => {
  const extra = responseFor(); extra.sitecore.route.placeholders['headless-main'] = [];
  assert.throws(() => inspectPermissions(extra, page()), /unexpected-placeholder-inventory/);
  const missing = responseFor('/resources'); delete missing.sitecore.route.placeholders['headless-resource-search'];
  assert.throws(() => inspectPermissions(missing, page('/resources')), /unexpected-placeholder-inventory/);
});
test('26 route inventory is bounded and latest native English version wins', () => {
  const routes = portalRoutes(manifest); assert.equal(routes.length, 26); assert.equal(new Set(routes).size, 26);
  assert.equal(routes[0], '/'); assert(!routes.includes('/workspace'));
  assert.deepEqual(latestPage({ itemId: HOME_ID, path: HOME, versions: [
    { version: 1, language: { name: 'en' } }, { version: 7, language: { name: 'en' } }, { version: 19, language: { name: 'fr' } },
  ] }, '/'), page('/', 7));
  assert.throws(() => latestPage({ itemId: HOME_ID, path: HOME, versions: [] }, '/'));
  const duplicate = structuredClone(manifest); duplicate.resourcePages[1] = duplicate.resourcePages[0];
  assert.throws(() => portalRoutes(duplicate), /unexpected-page-inventory/);
});
test('native discovery resolves every route through read-only queries and rejects missing pages', async () => {
  const routes = portalRoutes(manifest); let calls = 0, count = 0;
  const client = { query: async (query, variables) => {
    calls++; assert(query.startsWith('query(')); assert(!query.includes('mutation'));
    return Object.fromEntries(Object.entries(variables).map(([key, pathname]) => [key, { itemId: (++count).toString(16).padStart(32, '0'), path: pathname,
      versions: [{ version: 1, language: { name: 'en' } }, { version: 3, language: { name: 'en' } }] }]));
  } };
  const pages = await discoverPages(client, routes); assert.equal(pages.length, 26); assert.equal(calls, 5); assert(pages.every(p => p.version === 3));
  await assert.rejects(() => discoverPages({ query: async () => ({ p0: null }) }, ['/']), /missing-or-mismatched-page/);
});
const config = { endpoints: { demo: { host: 'https://cm.example.test/', ref: 'cloud' }, cloud: { accessToken: 'private-test-token' } } };
test('layout transport uses explicit native version and disables tracking; no secrets in URL', async () => {
  const requests = [];
  const client = connection('DeMo', { config, fetch: async (url, options) => { requests.push({ url: new URL(url), options }); return { ok: true, json: async () => responseFor('/resources', 7) }; } });
  await client.layout(page('/resources', 7));
  assert.equal(requests.length, 1); const { url, options } = requests[0];
  assert.equal(url.pathname, '/sitecore/api/layout/render/sxa-jss'); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
  assert.equal(url.searchParams.get('version'), '7'); assert.equal(url.searchParams.get('tracking'), 'false'); assert.equal(url.searchParams.get('sc_headless_mode'), 'edit');
  assert.equal(url.searchParams.get('sc_site'), SITE); assert.equal(url.searchParams.get('sc_lang'), 'en');
  assert.equal(options.headers.Authorization, 'Bearer private-test-token'); assert(!url.href.includes('private-test-token')); assert.equal(options.body, undefined);
});
test('mutation attempts and unsafe origins are rejected before any network request', async () => {
  let calls = 0; const client = connection('demo', { config, fetch: async () => { calls++; throw Error('must not run'); } });
  await assert.rejects(() => client.query('mutation{deleteItem{item{id}}}', {}), /read-only-query-required/); assert.equal(calls, 0);
  for (const host of ['http://cm.example.test/', 'https://user:secret@cm.example.test/', 'https://cm.example.test/?token=secret', 'https://cm.example.test/unsafe/']) {
    const modified = structuredClone(config); modified.endpoints.demo.host = host;
    assert.throws(() => connection('demo', { config: modified }), /invalid-cm-origin/);
  }
});
test('transport never retries or exposes native error bodies or token-bearing errors', async () => {
  let calls = 0; const client = connection('demo', { config, fetch: async () => { calls++; throw Error('private-test-token https://sensitive.example'); } });
  await assert.rejects(() => client.layout(page()), error => error.message === 'native-request-failed' && !JSON.stringify(error).includes('private-test-token'));
  assert.equal(calls, 1);
  const denied = connection('demo', { config, fetch: async () => ({ ok: false, json: async () => { throw Error('private-test-token'); } }) });
  await assert.rejects(() => denied.layout(page()), /native-request-failed/);
});
test('all pages are checked after a permission failure and reports contain only safe evidence', async () => {
  const visited = [];
  const result = await verifyPages({ layout: async p => p.route === '/' ? fixture : responseFor('/resources') }, [page(), page('/resources')], p => visited.push(p.route));
  assert.equal(result.passed, false); assert.equal(result.checkedPages, 2); assert.deepEqual(visited, ['/', '/resources']);
  assert.equal(result.pages[1].passed, true); assert(!JSON.stringify(result).includes('contents')); assert(!JSON.stringify(result).includes('Authorization'));
});
