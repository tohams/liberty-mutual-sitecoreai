import 'server-only';
import type { BusinessLine, Resource, StateCode } from '../../contracts/portal';
import { fixtures } from './fixtures';
import { PortalError } from '../errors';

interface CmsField { jsonValue?: { value?: unknown } | null; }
interface CmsResourceItem {
  id: string; name: string; title?: CmsField | null; summary?: CmsField | null;
  body?: CmsField | null; resourceType?: CmsField | null; state?: CmsField | null;
  reviewedAt?: CmsField | null; sourceLink?: CmsField | null; businessFamily?: CmsField | null;
  product?: CmsField | null; channel?: CmsField | null;
}
interface ResourceQueryResult {
  item?: { children: { results: CmsResourceItem[]; pageInfo: { hasNext: boolean; endCursor?: string } } } | null;
}

const RESOURCE_QUERY = `query PortalResourceCatalog($root: String!, $language: String!, $after: String) {
  item(path: $root, language: $language) {
    children(first: 8, after: $after) {
      pageInfo { hasNext endCursor }
      results {
        id name
        title: field(name: "Title") { jsonValue }
        summary: field(name: "summary") { jsonValue }
        body: field(name: "body") { jsonValue }
        resourceType: field(name: "resourceType") { jsonValue }
        state: field(name: "state") { jsonValue }
        reviewedAt: field(name: "reviewedAt") { jsonValue }
        sourceLink: field(name: "sourceLink") { jsonValue }
        businessFamily: field(name: "businessFamily") { jsonValue }
        product: field(name: "product") { jsonValue }
        channel: field(name: "channel") { jsonValue }
      }
    }
  }
}`;

const FAMILY_LINES: Record<string, BusinessLine | 'all'> = {
  personal: 'personal', 'small-commercial': 'small-commercial', commercial: 'commercial',
  'midsize-large': 'commercial', 'farm-ranch': 'commercial', specialty: 'specialty',
  'retail-specialty': 'specialty', 'wholesale-specialty': 'specialty', surety: 'surety', all: 'all',
};
const ALL_STATES: StateCode[] = ['TX', 'FL', 'IL'];
function fieldText(field?: CmsField | null): string { return typeof field?.jsonValue?.value === 'string' ? field.jsonValue.value.trim() : ''; }

/** Map CMS metadata directly; a resource's item ID remains stable when its name/URL changes. */
export function mapCmsResource(item: CmsResourceItem): Resource {
  const id = item.id.replace(/-/g, '').toLowerCase();
  const title = fieldText(item.title);
  const description = fieldText(item.summary);
  const type = fieldText(item.resourceType);
  const family = fieldText(item.businessFamily);
  const body = fieldText(item.body).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const stateValue = fieldText(item.state);
  const states = stateValue.toLowerCase() === 'all' ? ALL_STATES : stateValue.split(/[,;| ]+/).filter((value): value is StateCode => ALL_STATES.includes(value as StateCode));
  const dateValue = fieldText(item.reviewedAt);
  const updatedAt = /^\d{8}T/.test(dateValue) ? `${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}` : dateValue.slice(0, 10);
  if (!/^[a-f0-9]{32}$/.test(id) || !/^[a-z0-9-]+$/i.test(item.name) || !title || !description || !type || !states.length || !FAMILY_LINES[family] || !/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
    throw new PortalError('CONTENT_UNAVAILABLE', 'The resource library is being updated. Please try again shortly.', 503);
  }
  const linkValue = item.sourceLink?.jsonValue?.value;
  const href = linkValue && typeof linkValue === 'object' && 'href' in linkValue && typeof linkValue.href === 'string' ? linkValue.href : undefined;
  return {
    id, href: `/resources/${item.name}`, title, description, body,
    line: FAMILY_LINES[family], states: [...states], type, updatedAt,
    readMinutes: Math.max(1, Math.ceil(body.split(/\s+/).length / 200)),
    tags: [family, fieldText(item.product), fieldText(item.channel), type, ...states].filter(Boolean),
    ...(href && /^https:\/\//.test(href) ? { sourceUrl: href } : {}),
  };
}

export async function getResourceCatalog(): Promise<Resource[]> {
  if (process.env.PORTAL_CONTENT_ADAPTER === 'fixtures' && !process.env.VERCEL && process.env.NODE_ENV !== 'production') return fixtures.resources;
  const { default: client } = await import('../../lib/sitecore-client');
  const { default: config } = await import('../../../sitecore.config');
  const resources: Resource[] = [];
  let after: string | undefined;
  // Small pages avoid Experience Edge's query-complexity limit; a bounded cursor guards bad pagination.
  for (let page = 0; page < 25; page++) {
    const result: ResourceQueryResult = await client.getData<ResourceQueryResult>(RESOURCE_QUERY, {
      root: `/sitecore/content/LibertyMutual/${config.defaultSite}/Home/resources`, language: config.defaultLanguage, after,
    }, { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) });
    if (!result.item) throw new PortalError('CONTENT_UNAVAILABLE', 'The resource library is temporarily unavailable. Please try again shortly.', 503);
    resources.push(...result.item.children.results.map(mapCmsResource));
    const nextCursor = result.item.children.pageInfo.endCursor;
    if (!result.item.children.pageInfo.hasNext) return resources;
    if (!nextCursor || nextCursor === after) break;
    after = nextCursor;
  }
  throw new PortalError('CONTENT_UNAVAILABLE', 'The resource library is temporarily unavailable. Please try again shortly.', 503);
}
