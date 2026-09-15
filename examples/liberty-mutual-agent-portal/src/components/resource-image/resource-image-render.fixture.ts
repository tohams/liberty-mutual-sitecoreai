import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AppPlaceholder, LayoutServicePageState, SitecoreProviderReactContext,
  type ComponentMap, type ComponentRendering, type Page,
} from '@sitecore-content-sdk/nextjs';
import { Default as ResourceImage } from './ResourceImage';
import { Default as ResourceArticle } from '../resource-article/ResourceArticle';
import { getResourceImagePlaceholder } from '@/features/resources/resource-image-placeholder';
import type { ResourceImageProps } from './resource-image.props';
import nativeArticleFixture from './resource-article-native.fixture.json';

const imageRendering: ComponentRendering = { componentName: 'ResourceImage', uid: 'resource-image-instance', dataSource: 'local-image-item' };
const componentMap: ComponentMap = new Map([['ResourceImage', { Default: ResourceImage }]]);
function pageFor(editing: boolean): Page {
  return {
    locale: 'en', layout: { sitecore: { context: {}, route: { name: 'resource', placeholders: {} } } },
    mode: { name: editing ? LayoutServicePageState.Edit : LayoutServicePageState.Normal, isEditing: editing,
      isPreview: false, isNormal: !editing, isDesignLibrary: false, designLibrary: { isVariantGeneration: false } },
  };
}
function render(child: ReactNode, page: Page) {
  return renderToStaticMarkup(createElement(SitecoreProviderReactContext, {
    value: { page, componentMap, loadImportMap: async () => ({ default: [] }) },
  }, child));
}
function imageHtml(fields: ResourceImageProps['fields'], editing = false) {
  const page = pageFor(editing);
  return render(createElement(ResourceImage, { fields, page, rendering: imageRendering, params: {} }), page);
}

test('Modern Media public-link query parameters, alt text and intrinsic dimensions reach the img unchanged', () => {
  const src = 'https://media.example.test/api/public/content/asset?public-link=kept&rendition=hero%2Fwide';
  const html = imageHtml({ image: { value: { src, alt: 'Agent and business owner review a shop', width: '1600', height: '900' } },
    caption: { value: 'A conversation about operations & property.' } });
  assert.match(html, /<img[^>]+src="https:\/\/media\.example\.test\/api\/public\/content\/asset\?public-link=kept&amp;rendition=hero%2Fwide"/);
  assert.match(html, /alt="Agent and business owner review a shop"/);
  assert.match(html, /width="1600" height="900"/);
  assert.match(html, /<figcaption[^>]*>A conversation about operations &amp; property\.<\/figcaption>/);
  assert.doesNotMatch(html, /\/_next\/image|jssmedia|srcSet=|\?w=/);
});

test('classic Sitecore images keep their URL and missing alt is explicitly decorative', () => {
  const html = imageHtml({ image: { value: { src: 'https://edge.sitecorecloud.io/-/media/photo.jpg?rev=123&hash=abc' } } });
  assert.match(html, /src="https:\/\/edge\.sitecorecloud\.io\/-\/media\/photo.jpg\?rev=123&amp;hash=abc"/);
  assert.match(html, /alt=""/);
  assert.doesNotMatch(html, /<figcaption|jssmedia/);
});

test('an absent image contributes no figure or orphan caption to delivery', () => {
  assert.equal(imageHtml(undefined), '');
  assert.equal(imageHtml({ image: { value: {} }, caption: { value: 'Caption without an image' } }), '');
});

test('blank native fields retain Image and caption editing metadata for Page Builder', () => {
  const html = imageHtml({
    image: { value: {}, metadata: { fieldId: 'ca9a643a-07b6-5945-8fa5-af13e02af584', itemId: 'local-image-item', fieldType: 'image' } },
    caption: { value: '', metadata: { fieldId: 'a8d126c1-34ee-5679-9cf6-8d699a788cd8', itemId: 'local-image-item', fieldType: 'single-line text' } },
  }, true);
  assert.match(html, /chrometype="field"/);
  assert.match(html, /ca9a643a-07b6-5945-8fa5-af13e02af584/);
  assert.match(html, /a8d126c1-34ee-5679-9cf6-8d699a788cd8/);
  assert.match(html, /scEmptyImage/);
  assert.match(html, /\[No text in field\]/);
});

test('native nested image placement is between article summary and body, and empty slot chromes have a valid ID', () => {
  const page = pageFor(false);
  const article: ComponentRendering = {
    componentName: 'ResourceArticle', uid: 'native-article-instance', dataSource: 'page:',
    params: { DynamicPlaceholderId: '1' },
    placeholders: { 'headless-resource-image-{*}': [{ ...imageRendering, fields: {
      image: { value: { src: 'https://media.example.test/hero.jpg', alt: 'A resource illustration' } },
      caption: { value: 'Caption marker' },
    } }] },
  };
  const html = render(createElement(ResourceArticle, { page, rendering: article, params: {}, fields: {
    Title: { value: 'Article title' }, summary: { value: 'Summary marker' }, body: { value: '<p>Body marker</p>' },
  } }), page);
  assert(html.indexOf('Summary marker') < html.indexOf('<figure'));
  assert(html.indexOf('</figure>') < html.indexOf('Body marker'));
  assert.match(html, /Caption marker/);
  const emptyArticle = { ...article, placeholders: {} };
  const editing = pageFor(true);
  const slot = getResourceImagePlaceholder(emptyArticle, true)!;
  const emptyHtml = render(createElement(AppPlaceholder, { ...slot, page: editing, componentMap }), editing);
  assert.match(emptyHtml, /sc-jss-empty-placeholder/);
  assert.match(emptyHtml, /id="headless-resource-image-\{\*\}_native-article-instance"/);
  assert.doesNotMatch(emptyHtml, /id=""|headless-main/);
});

test('captured native SXA metadata keeps the image bound to its cloned page and emits matching editing chrome', () => {
  // Captured from the tenant's real preview GraphQL response after native branch creation.
  // The original static-only helper cannot find this wildcard key and fails this test.
  // Native optional SXA fields can be null although the SDK index signature excludes null.
  const article = structuredClone(nativeArticleFixture.rendering) as unknown as ComponentRendering;
  const original = structuredClone(article);
  const nativeImage = article.placeholders!['headless-resource-image-{*}'][0];
  const slot = getResourceImagePlaceholder(article, true)!;
  assert.equal(slot.name, 'headless-resource-image-1');
  assert.deepEqual(slot.rendering, article, 'Every native rendering, field and metadata value survives binding');
  assert.equal(slot.rendering.placeholders['headless-resource-image-{*}'][0], nativeImage);

  const editing = pageFor(true);
  const html = render(createElement(ResourceArticle, {
    page: editing, rendering: article, params: article.params!, fields: article.fields,
  }), editing);
  assert.match(html, /<figure/);
  assert.match(html, /id="headless-resource-image-\{\*\}_0d896b77-39d8-559b-ae12-8a1898f07030"/);
  assert.match(html, /979e3420-9c7c-52fc-8d26-dcf77920ee12/);
  assert.match(html, /72EFB61C-854B-47BF-B36E-60B2B0815DA5/i);
  assert.match(html, /CA9A643A-07B6-5945-8FA5-AF13E02AF584/i);
  assert.match(html, /transform=true&amp;format=auto&amp;width=745&amp;height=420/);
  assert.doesNotMatch(html, /id=""|headless-resource-image-0-1|headless-main/);
  assert.deepEqual(article, original, 'SDK rendering does not mutate the captured native response');
});
