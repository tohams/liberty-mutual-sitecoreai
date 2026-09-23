import 'server-only';
import type { ProductCatalogPage } from '../../contracts/portal';
import { fixtures } from './fixtures';
import { PortalError } from '../errors';

interface CmsField { jsonValue?: { value?: unknown } | null; }
interface CmsProductItem {
  id: string; name: string; template?: { id?: string } | null; title?: CmsField | null; summary?: CmsField | null;
  image?: CmsField | null; channel?: CmsField | null; url?: { path?: unknown } | null;
  products?: { targetItems?: Array<{ productId?: CmsField | null } | null> | null } | null;
}
interface ProductQueryResult {
  item?: { children: { results: CmsProductItem[]; pageInfo: { hasNext: boolean; endCursor?: string | null } } } | null;
}

const PRODUCT_QUERY = `query PortalProductCatalog($root: String!, $language: String!, $after: String) {
  item(path: $root, language: $language) {
    children(first: 8, after: $after) {
      pageInfo { hasNext endCursor }
      results {
        id name template { id } url { path }
        title: field(name: "Title") { jsonValue }
        summary: field(name: "catalogSummary") { jsonValue }
        image: field(name: "catalogImage") { jsonValue }
        channel: field(name: "catalogChannel") { jsonValue }
        products: field(name: "catalogProducts") {
          ... on MultilistField {
            targetItems { productId: field(name: "productId") { jsonValue } }
          }
        }
      }
    }
  }
}`;

// These identifiers describe the operational integration, not CMS page families.
const PRODUCT_IDS = new Set(fixtures.products.map((product) => product.id));
export const PRODUCT_PAGE_TEMPLATE_ID = '80228789b957573ca1c51b511d7281dc';
const ITEM_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
function unavailable(): PortalError {
  return new PortalError('CONTENT_UNAVAILABLE', 'The product catalog is temporarily unavailable. Please try again shortly.', 503);
}
function fieldText(field?: CmsField | null): string {
  return typeof field?.jsonValue?.value === 'string' ? field.jsonValue.value.trim() : '';
}
function itemIdentifier(item: CmsProductItem): string {
  return typeof item?.id === 'string' && ITEM_ID.test(item.id) ? item.id.replace(/-/g, '').toLowerCase() : 'invalid-item-id';
}
function isProductPage(item: CmsProductItem): boolean {
  return typeof item?.template?.id === 'string' && item.template.id.replace(/-/g, '').toLowerCase() === PRODUCT_PAGE_TEMPLATE_ID;
}
function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) >= 127 && character.charCodeAt(0) <= 159);
}
function pageHref(path: unknown): string {
  if (typeof path !== 'string' || /[\s\\?#]/.test(path) || hasControlCharacters(path)) throw unavailable();
  const match = /^\/products\/([^/]+)\/?$/.exec(path);
  if (!match) throw unavailable();
  let child: string;
  try { child = decodeURIComponent(match[1]); } catch { throw unavailable(); }
  // Check nested escapes too so another router decoding pass cannot expose traversal or separators.
  for (;;) {
    if (!child.trim() || child === '.' || child === '..' || /[/\\?#]/.test(child) || hasControlCharacters(child)) throw unavailable();
    const decoded = child.replace(/%([a-f0-9]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    if (decoded === child) break;
    child = decoded;
  }
  return `/products/${match[1]}`;
}
function imageDimension(value: unknown): number | undefined {
  const number = typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}
function mapImage(field?: CmsField | null): ProductCatalogPage['image'] {
  const value = field?.jsonValue?.value;
  if (value == null || value === '') return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw unavailable();
  if (!('src' in value) || value.src === '' || value.src == null) return undefined;
  if (typeof value.src !== 'string') throw unavailable();
  const src = value.src.trim();
  if (!src) return undefined;
  if (/[\s\\]/.test(src) || hasControlCharacters(src)) throw unavailable();
  if (!/^\/(?!\/)/.test(src)) {
    let url: URL;
    try { url = new URL(src); } catch { throw unavailable(); }
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw unavailable();
  }
  const alt = 'alt' in value && typeof value.alt === 'string' ? value.alt.trim() : '';
  const width = imageDimension('width' in value ? value.width : undefined);
  const height = imageDimension('height' in value ? value.height : undefined);
  return { src, alt, ...(width ? { width } : {}), ...(height ? { height } : {}) };
}

/** A page keeps its CMS identity while its name, copy, and operational references change. */
export function mapCmsProduct(item: CmsProductItem): ProductCatalogPage {
  const id = itemIdentifier(item);
  const title = fieldText(item?.title);
  const summary = fieldText(item?.summary);
  const channel = fieldText(item?.channel);
  const references = item?.products?.targetItems;
  if (id === 'invalid-item-id' || !isProductPage(item)
    || !title || !summary || !['all', 'independent', 'wholesale'].includes(channel)
    || !Array.isArray(references) || !references.length) throw unavailable();
  const productIds = references.map((reference) => fieldText(reference?.productId));
  if (productIds.some((productId) => !PRODUCT_IDS.has(productId))) throw unavailable();
  const image = mapImage(item.image);
  return {
    id, href: pageHref(item.url?.path), title, summary,
    channel: channel as ProductCatalogPage['channel'], productIds: [...new Set(productIds)],
    ...(image ? { image } : {}),
  };
}

/** Invalid page metadata is omitted; provider and incomplete-pagination failures remain explicit. */
export async function readCmsProductCatalog(
  fetchPage: (after?: string) => Promise<ProductQueryResult>,
  reportInvalid: (itemId: string) => void = (itemId) => console.warn('Portal product omitted: invalid published metadata', itemId),
): Promise<ProductCatalogPage[]> {
  const catalog: ProductCatalogPage[] = [];
  const seenItems = new Set<string>();
  const seenCursors = new Set<string>();
  let after: string | undefined;
  // Small pages stay under Edge query-complexity limits; bounds prevent a partial catalog on bad pagination.
  for (let page = 0; page < 25; page++) {
    const result = await fetchPage(after);
    const children = result?.item?.children;
    if (!Array.isArray(children?.results) || typeof children.pageInfo?.hasNext !== 'boolean') throw unavailable();
    for (const item of children.results) {
      // Other page types and folders under /products do not participate in this catalog.
      if (!isProductPage(item)) continue;
      let mapped: ProductCatalogPage;
      try { mapped = mapCmsProduct(item); } catch (error) {
        if (!(error instanceof PortalError) || error.code !== 'CONTENT_UNAVAILABLE') throw error;
        reportInvalid(itemIdentifier(item));
        continue;
      }
      if (!seenItems.has(mapped.id)) {
        catalog.push(mapped);
        seenItems.add(mapped.id);
      }
    }
    if (!children.pageInfo.hasNext) return catalog;
    const nextCursor = children.pageInfo.endCursor;
    if (typeof nextCursor !== 'string' || !nextCursor.trim() || seenCursors.has(nextCursor)) throw unavailable();
    seenCursors.add(nextCursor);
    after = nextCursor;
  }
  throw unavailable();
}

export async function getProductCatalog(language?: string): Promise<ProductCatalogPage[]> {
  const { default: client } = await import('../../lib/sitecore-client');
  const { default: config } = await import('../../../sitecore.config');
  return readCmsProductCatalog((after) => client.getData<ProductQueryResult>(PRODUCT_QUERY, {
    root: `/sitecore/content/LibertyMutual/${config.defaultSite}/Home/products`, language: language ?? config.defaultLanguage, after,
  }, { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) }));
}
