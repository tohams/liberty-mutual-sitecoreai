import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCmsProduct, readCmsProductCatalog } from './cms-products';
import { PortalError } from '../errors';

const field = (value: unknown) => ({ jsonValue: { value } });
const references = (...ids: string[]) => ({ targetItems: ids.map((id) => ({ productId: field(id) })) });
const authored = {
  id: 'E9573E8D-00D6-5FD9-9015-2F0AEC4A0B60', name: 'business-protection',
  url: { path: '/products/business-protection' },
  template: { id: '80228789-b957-573c-a1c5-1b511d7281dc' },
  title: field('Business protection'), summary: field('Prepare the next conversation around your client’s business.'),
  channel: field('independent'), products: references('bop', 'workers-comp'),
  image: field({ src: 'https://media.example.com/business.jpg', alt: 'A business owner', width: '800', height: '450' }),
};
const unavailable = (error: unknown) => error instanceof PortalError && error.code === 'CONTENT_UNAVAILABLE' && error.status === 503;
const page = (results: Array<typeof authored>, hasNext = false, endCursor?: string) => ({ item: { children: { results, pageInfo: { hasNext, endCursor } } } });

test('published copy, references, and renamed page URLs stay authoritative with a stable CMS identity', () => {
  const initial = mapCmsProduct(authored);
  const edited = mapCmsProduct({ ...authored, name: 'protect-your-business', url: { path: '/products/protect-your-business' }, title: field('Protect your business'), summary: field('Published copy.'), products: references('commercial-auto', 'bop', 'commercial-auto') });
  assert.equal(initial.id, 'e9573e8d00d65fd990152f0aec4a0b60');
  assert.equal(edited.id, initial.id);
  assert.equal(edited.href, '/products/protect-your-business');
  assert.equal(edited.title, 'Protect your business');
  assert.equal(edited.summary, 'Published copy.');
  assert.equal(edited.channel, 'independent');
  assert.deepEqual(edited.productIds, ['commercial-auto', 'bop']);
  assert.deepEqual(initial.image, { src: 'https://media.example.com/business.jpg', alt: 'A business owner', width: 800, height: 450 });
});

test('catalog pages require complete metadata and every reference must resolve to an operational product', () => {
  for (const patch of [
    { id: 'invalid' }, { id: 'e9573e8d00d65fd990152f0aec4a0b60-' }, { template: undefined },
    { url: undefined }, { url: null }, { url: {} }, { url: { path: '' } },
    { title: field(' ') }, { summary: field('') }, { channel: field('') }, { channel: field('unknown') },
    { products: undefined }, { products: references() }, { products: references('unknown') },
    { products: references('bop', 'unknown') }, { products: { targetItems: [null] } },
    { products: { targetItems: [{ productId: field('') }] } }, { products: { targetItems: [{}] } },
  ]) assert.throws(() => mapCmsProduct({ ...authored, ...patch }), unavailable);
  assert.equal(mapCmsProduct({ ...authored, channel: field('wholesale') }).channel, 'wholesale');
  assert.equal(mapCmsProduct({ ...authored, channel: field('all') }).channel, 'all');
});

test('published CMS paths preserve Sitecore name transformations, case, and legitimate escaping', () => {
  assert.equal(mapCmsProduct({ ...authored, name: 'Orange flavored ice cream', url: { path: '/products/Orange-flavored-ice-cream' } }).href, '/products/Orange-flavored-ice-cream');
  assert.equal(mapCmsProduct({ ...authored, name: 'Auto', url: { path: '/products/Auto/' } }).href, '/products/Auto');
  for (const path of ['/products/Farm%20%26%20Ranch', '/products/Caf%C3%A9', '/products/Caf%c3%a9', '/products/Risk-100%25']) {
    assert.equal(mapCmsProduct({ ...authored, url: { path } }).href, path);
  }
});

test('published URLs must identify one safe child under products', () => {
  for (const path of [
    'https://example.com/products/Auto', '//example.com/products/Auto', '/resources/Auto',
    '/products', '/products/', '/products//', '/products//Auto', '/products/Auto//', '/products/Auto/details',
    '/products/Auto?state=TX', '/products/Auto#details', '/products/Auto%3Fstate=TX', '/products/Auto%23details',
    '/products/Auto\\details', '/products/Auto\ndetails', '/products/Auto\tdetails', '/products/Auto details',
    '/products/.', '/products/..', '/products/%2e%2e', '/products/%2E.', '/products/%252e%252e',
    '/products/Auto%2Fdetails', '/products/Auto%5cdetails', '/products/Auto%252fdetails', '/products/Auto%25255Cdetails',
    '/products/Auto%00details', '/products/Auto%0Adetails', '/products/Auto%257fdetails', '/products/Auto%C2%85details',
    '/products/Auto%invalid', '/products/%20',
  ]) assert.throws(() => mapCmsProduct({ ...authored, url: { path } }), unavailable, path);
});

test('optional images allow blank fields and safe media while dropping unusable dimensions', () => {
  for (const image of [undefined, null, field(null), field(''), field({}), field({ src: ' ' })]) {
    assert.equal(mapCmsProduct({ ...authored, image }).image, undefined);
  }
  assert.deepEqual(mapCmsProduct({ ...authored, image: field({ src: '/-/media/business.jpg', width: 640, height: '-1' }) }).image,
    { src: '/-/media/business.jpg', alt: '', width: 640 });
  for (const src of ['javascript:alert(1)', 'data:image/png;base64,a', '//untrusted.example/image.jpg', '/\\untrusted.example/image.jpg', 'http://media.example.com/image.jpg', 'https://user:password@media.example.com/image.jpg', 'https://media.example.com/\nimage.jpg']) {
    assert.throws(() => mapCmsProduct({ ...authored, image: field({ src }) }), unavailable);
  }
});

test('pagination preserves CMS order, omits invalid metadata, and deduplicates item IDs', async () => {
  const next = { ...authored, id: '0A946D4D-2385-4D84-A2E7-31FB2DB9DDF2', name: 'personal', url: { path: '/products/personal' }, products: references('home') };
  const invalid = { ...authored, id: 'raw-untrusted-value', products: references('not-a-product') };
  const diagnostics: string[] = [];
  const cursors: Array<string | undefined> = [];
  const result = await readCmsProductCatalog(async (after) => {
    cursors.push(after);
    return after ? page([{ ...authored, id: authored.id.replace(/-/g, '').toLowerCase() }, next]) : page([authored, invalid], true, 'two');
  }, (id) => diagnostics.push(id));
  assert.deepEqual(cursors, [undefined, 'two']);
  assert.deepEqual(result.map((item) => item.href), ['/products/business-protection', '/products/personal']);
  assert.deepEqual(diagnostics, ['invalid-item-id']);
});

test('publication removal and newly published pages are reflected on subsequent reads', async () => {
  let published = [authored];
  const fetchPage = async () => page(published);
  assert.equal((await readCmsProductCatalog(fetchPage)).length, 1);
  published = [];
  assert.deepEqual(await readCmsProductCatalog(fetchPage), []);
  published = [{ ...authored, name: 'newly-published-page', url: { path: '/products/newly-published-page' } }];
  assert.equal((await readCmsProductCatalog(fetchPage))[0].href, '/products/newly-published-page');
});

test('unrelated templates under products are ignored without changing native product-page order', async () => {
  const diagnostics: string[] = [];
  const unrelated = { ...authored, template: { id: '55555555-5555-5555-5555-555555555555' } };
  const result = await readCmsProductCatalog(async () => page([unrelated, authored]), (id) => diagnostics.push(id));
  assert.deepEqual(result, [mapCmsProduct(authored)]);
  assert.deepEqual(diagnostics, []);
});

test('one omitted page does not hide valid pages or replace an invalid-only catalog with fixtures', async () => {
  const invalid = { ...authored, products: references('bop', 'unknown') };
  const diagnostics: string[] = [];
  assert.deepEqual(await readCmsProductCatalog(async () => page([invalid]), (id) => diagnostics.push(id)), []);
  assert.deepEqual(diagnostics, ['e9573e8d00d65fd990152f0aec4a0b60']);
  const valid = { ...authored, name: 'repaired-page', url: { path: '/products/repaired-page' } };
  const result = await readCmsProductCatalog(async () => page([invalid, valid]), () => {});
  assert.deepEqual(result.map((item) => item.href), ['/products/repaired-page']);
});

test('provider, missing root, and malformed connection errors remain explicit', async () => {
  const providerError = new Error('Provider unavailable');
  await assert.rejects(readCmsProductCatalog(async () => { throw providerError; }), (error) => error === providerError);
  await assert.rejects(readCmsProductCatalog(async () => ({ item: null })), unavailable);
  await assert.rejects(readCmsProductCatalog(async () => ({ item: {} } as never)), unavailable);
  await assert.rejects(readCmsProductCatalog(async () => ({ item: { children: { results: [], pageInfo: {} } } } as never)), unavailable);
});

test('missing, repeated, and cycling cursors fail instead of returning a partial catalog', async () => {
  await assert.rejects(readCmsProductCatalog(async () => page([authored], true)), unavailable);
  let calls = 0;
  await assert.rejects(readCmsProductCatalog(async () => { calls++; return page([authored], true, 'same'); }), unavailable);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(readCmsProductCatalog(async () => page([], true, ['one', 'two', 'one'][calls++])), unavailable);
  assert.equal(calls, 3);
});

test('an unbounded connection fails after the maximum page count', async () => {
  let calls = 0;
  await assert.rejects(readCmsProductCatalog(async () => page([], true, `page-${++calls}`)), unavailable);
  assert.equal(calls, 25);
});
