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
    placeholders: { 'headless-resource-image': [{ ...imageRendering, fields: {
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
  assert.match(emptyHtml, /id="headless-resource-image_[^"]+"/);
  assert.doesNotMatch(emptyHtml, /id=""|headless-main/);
});
