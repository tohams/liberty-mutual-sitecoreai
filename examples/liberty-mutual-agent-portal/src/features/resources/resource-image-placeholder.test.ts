import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import type { ComponentRendering, RouteData } from '@sitecore-content-sdk/nextjs';
import { getPortalPlaceholders } from '@/features/portal/portal-placeholders';
import { getResourceImagePlaceholder, RESOURCE_IMAGE_PLACEHOLDER } from './resource-image-placeholder';

test('the nested image slot preserves native identity and excludes other component types', () => {
  const image: ComponentRendering = {
    componentName: 'ResourceImage', uid: 'owned-image-instance', dataSource: 'page:/Data/Resource image',
    params: { FieldNames: 'Default' }, fields: { caption: { value: 'Authored caption' } },
  };
  const hidden: ComponentRendering = { componentName: 'Hidden Rendering', uid: 'hidden-image-variant' };
  const article: ComponentRendering = {
    componentName: 'ResourceArticle', uid: 'owned-article-instance', dataSource: 'page:',
    placeholders: { [RESOURCE_IMAGE_PLACEHOLDER]: [image, hidden, { componentName: 'AgentGuidance', uid: 'misplaced-guidance' }] },
  };
  const original = structuredClone(article);
  const slot = getResourceImagePlaceholder(article, false)!;
  assert.equal(slot.name, 'headless-resource-image');
  assert.equal(slot.rendering.uid, article.uid);
  assert.equal(slot.rendering.dataSource, article.dataSource);
  assert.deepEqual(slot.rendering.placeholders[slot.name], [image]);
  assert.equal(slot.rendering.placeholders[slot.name][0], image);
  assert.deepEqual(getResourceImagePlaceholder(article, true)!.rendering.placeholders[slot.name], [image, hidden]);
  assert.deepEqual(article, original, 'Native Layout Service data is never mutated');
  const route: RouteData = { name: 'article', placeholders: { 'headless-resource-article': [article] } };
  const placement = getPortalPlaceholders('/resources/guide', route, { isEditing: false, isPreview: false }).resourceArticle!;
  assert.equal(placement.rendering.placeholders[placement.name][0], article, 'Top-level placement keeps nested native rendering data');
});

test('a blank nested slot is available to Page Builder but contributes no visitor markup', () => {
  const article: ComponentRendering = { componentName: 'ResourceArticle', uid: 'article-instance' };
  assert.equal(getResourceImagePlaceholder(article, false), undefined);
  assert.deepEqual(getResourceImagePlaceholder(article, true)!.rendering.placeholders, { 'headless-resource-image': [] });
  const wrongSlot = { ...article, placeholders: { 'headless-main': [{ componentName: 'ResourceImage' }] } };
  assert.equal(getResourceImagePlaceholder(wrongSlot, false), undefined, 'No fallback to an unrestricted legacy slot');
});

test('SDK image rendering preserves native and Modern Media links, editable empty fields and nested placement', async () => {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(process.execPath, [
    '--import', 'tsx', '--test', '--test-reporter=tap',
    join(process.cwd(), 'src/components/resource-image/resource-image-render.fixture.ts'),
  ], { env: environment, timeout: 15000 });
  assert.match(stdout, /pass 5/);
});
