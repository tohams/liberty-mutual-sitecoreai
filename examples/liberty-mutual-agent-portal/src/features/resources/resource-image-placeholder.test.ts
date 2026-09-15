import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import type { ComponentRendering, RouteData } from '@sitecore-content-sdk/nextjs';
import { getPortalPlaceholders } from '@/features/portal/portal-placeholders';
import { getResourceImagePlaceholder, RESOURCE_IMAGE_PLACEHOLDER_PATTERN } from './resource-image-placeholder';

test('the nested image slot preserves native identity and excludes other component types', () => {
  const image: ComponentRendering = {
    componentName: 'ResourceImage', uid: 'owned-image-instance', dataSource: 'page:/Data/Resource image',
    params: { FieldNames: 'Default' }, fields: { caption: { value: 'Authored caption' } },
  };
  const hidden: ComponentRendering = { componentName: 'Hidden Rendering', uid: 'hidden-image-variant' };
  const article: ComponentRendering = {
    componentName: 'ResourceArticle', uid: 'owned-article-instance', dataSource: 'page:',
    params: { DynamicPlaceholderId: '1' },
    placeholders: { [RESOURCE_IMAGE_PLACEHOLDER_PATTERN]: [image, hidden, { componentName: 'AgentGuidance', uid: 'misplaced-guidance' }] },
  };
  const original = structuredClone(article);
  const slot = getResourceImagePlaceholder(article, false)!;
  assert.equal(slot.name, 'headless-resource-image-1');
  assert.equal(slot.rendering.uid, article.uid);
  assert.equal(slot.rendering.dataSource, article.dataSource);
  assert.equal(slot.rendering.params, article.params);
  assert.deepEqual(slot.rendering.placeholders[RESOURCE_IMAGE_PLACEHOLDER_PATTERN], [image]);
  assert.equal(slot.rendering.placeholders[RESOURCE_IMAGE_PLACEHOLDER_PATTERN][0], image);
  assert.deepEqual(getResourceImagePlaceholder(article, true)!.rendering.placeholders[RESOURCE_IMAGE_PLACEHOLDER_PATTERN], [image, hidden]);
  assert.deepEqual(article, original, 'Native Layout Service data is never mutated');
  const route: RouteData = { name: 'article', placeholders: { 'headless-resource-article': [article] } };
  const placement = getPortalPlaceholders('/resources/guide', route, { isEditing: false, isPreview: false }).resourceArticle!;
  assert.equal(placement.rendering.placeholders[placement.name][0], article, 'Top-level placement keeps nested native rendering data');
});

test('a blank nested slot is available to Page Builder but contributes no visitor markup', () => {
  const article: ComponentRendering = { componentName: 'ResourceArticle', uid: 'article-instance', params: { DynamicPlaceholderId: '23' } };
  assert.equal(getResourceImagePlaceholder(article, false), undefined);
  assert.equal(getResourceImagePlaceholder(article, true)!.name, 'headless-resource-image-23');
  assert.deepEqual(getResourceImagePlaceholder(article, true)!.rendering.placeholders, { 'headless-resource-image-{*}': [] });
  const wrongSlot = { ...article, placeholders: { 'headless-main': [{ componentName: 'ResourceImage' }] } };
  assert.equal(getResourceImagePlaceholder(wrongSlot, false), undefined, 'No fallback to an unrestricted legacy slot');
});

test('a resolved native key binds only to the parent dynamic ID and keeps native field metadata', () => {
  const image: ComponentRendering = {
    componentName: 'ResourceImage', uid: 'native-image-instance', dataSource: 'page:/Data/Resource image',
    fields: { image: { value: {}, metadata: { itemId: 'page-local-image', fieldId: 'native-image-field' } } },
  };
  const article: ComponentRendering = {
    componentName: 'ResourceArticle', uid: 'native-article-instance', params: { DynamicPlaceholderId: '23' },
    placeholders: {
      'headless-resource-image-23': [image],
      'headless-resource-image-1': [{ componentName: 'ResourceImage', uid: 'another-instance' }],
    },
  };
  for (const editing of [false, true]) {
    const slot = getResourceImagePlaceholder(article, editing)!;
    assert.equal(slot.name, 'headless-resource-image-23');
    assert.deepEqual(Object.keys(slot.rendering.placeholders), ['headless-resource-image-23']);
    assert.equal(slot.rendering.placeholders[slot.name][0], image);
    assert.equal(slot.rendering.placeholders[slot.name][0].fields, image.fields);
  }
});

test('invalid legacy placement and missing dynamic IDs never become another article image slot', () => {
  for (const key of ['headless-resource-image', 'headless-resource-image-0-1', 'headless-resource-image-2', 'headless-main']) {
    const article: ComponentRendering = {
      componentName: 'ResourceArticle', params: { DynamicPlaceholderId: '1' },
      placeholders: { [key]: [{ componentName: 'ResourceImage', uid: 'misplaced-image' }] },
    };
    assert.equal(getResourceImagePlaceholder(article, false), undefined, key);
    assert.deepEqual(getResourceImagePlaceholder(article, true)!.rendering.placeholders, { 'headless-resource-image-{*}': [] });
  }
  for (const dynamicId of [undefined, '', 'undefined', '0-1', '../1']) {
    const article: ComponentRendering = {
      componentName: 'ResourceArticle', params: dynamicId === undefined ? {} : { DynamicPlaceholderId: dynamicId },
      placeholders: { [RESOURCE_IMAGE_PLACEHOLDER_PATTERN]: [{ componentName: 'ResourceImage' }] },
    };
    assert.equal(getResourceImagePlaceholder(article, false), undefined);
    assert.equal(getResourceImagePlaceholder(article, true), undefined);
  }
});

test('SDK image rendering preserves native and Modern Media links, editable empty fields and nested placement', async () => {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(process.execPath, [
    '--import', 'tsx', '--test', '--test-reporter=tap',
    join(process.cwd(), 'src/components/resource-image/resource-image-render.fixture.ts'),
  ], { env: environment, timeout: 15000 });
  assert.match(stdout, /pass 6/);
});
