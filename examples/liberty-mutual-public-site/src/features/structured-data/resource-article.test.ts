import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutServicePageState } from "@sitecore-content-sdk/nextjs";
import { Default as ResourceContent } from "../../components/public-resource-content/PublicResourceContent";
import type { PublicResourceContentProps } from "../../components/public-resource-content/public-resource-content.props";
import { resourceArticleSchema } from "./resource-article-schema";

const origin = "https://public.example.com";
const canonical = origin + "/insurance-resources/bundle-car-and-home";
function props(): PublicResourceContentProps {
  return {
    params: {},
    rendering: {
      componentName: "PublicResourceContent",
      dataSource: "article-page",
    },
    page: {
      locale: "en",
      layout: { sitecore: { context: {}, route: null } },
      mode: {
        name: LayoutServicePageState.Normal,
        designLibrary: { isVariantGeneration: false },
        isNormal: true,
        isPreview: false,
        isEditing: false,
        isDesignLibrary: false,
      },
    },
    fields: {
      Title: { value: "Bundling your car and home insurance" },
      metadataDescription: {
        value: "Explore coverage and savings for your household.",
      },
      canonicalUrl: { value: canonical },
      question: {
        value: "Search-only question",
      },
      answer: {
        value: "Search-only answer",
      },
      explanation: {
        value:
          "<h2>How bundling works</h2><p>Bring your household coverage together.</p><p>Review your options with your agent before choosing coverage.</p>",
      },
      formalWording: {
        value: "<p>Savings depend on eligibility and policy terms.</p>",
      },
      nextStep: { value: { href: "/get-a-quote", text: "Get a quote" } },
      sourceLink: {
        value: {
          href: "https://www.libertymutual.com/bundling",
          text: "More about bundling",
        },
      },
      disclosure: {
        id: "disclosure",
        name: "Disclosure",
        url: "/disclosure",
        fields: {
          body: { value: "<p>Policy conditions apply.</p>" },
          sourceLink: { value: {} },
        },
      },
    },
  };
}
function schema(markup: string): Record<string, unknown> | undefined {
  const content = markup.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];
  return content ? JSON.parse(content) : undefined;
}

test("the public article renders its authored body and supporting actions without exposing search-only Q&A", () => {
  const markup = renderToStaticMarkup(createElement(ResourceContent, props()));
  assert.match(markup, /<h2>How bundling works<\/h2>/);
  assert.match(markup, /Bring your household coverage together\./);
  assert.match(
    markup,
    /Review your options with your agent before choosing coverage\./,
  );
  assert.match(markup, /Coverage and policy details/);
  assert.match(markup, /Savings depend on eligibility and policy terms\./);
  assert.match(markup, /href="\/get-a-quote"/);
  assert.match(markup, /More about bundling/);
  assert.match(markup, /Policy conditions apply\./);
  assert.doesNotMatch(
    markup,
    /Search-only question|Search-only answer|editing surrogate|FAQPage|acceptedAnswer/,
  );
  assert.deepEqual(schema(markup), {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Bundling your car and home insurance",
    description: "Explore coverage and savings for your household.",
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  });
});

test("an editing page never substitutes hidden Q&A for the visible article", () => {
  const editing = props();
  editing.page.mode = {
    ...editing.page.mode,
    name: LayoutServicePageState.Edit,
    isNormal: false,
    isEditing: true,
  };
  const markup = renderToStaticMarkup(createElement(ResourceContent, editing));
  assert.match(markup, /Bring your household coverage together/);
  assert.doesNotMatch(
    markup,
    /Search-only question|Search-only answer|editing surrogate/,
  );
});

test("a missing page title does not generate FAQ schema or borrow a hidden search question", () => {
  const untitled = props();
  delete untitled.fields!.Title;
  const markup = renderToStaticMarkup(createElement(ResourceContent, untitled));
  assert.equal(schema(markup), undefined);
  assert.match(markup, /Bring your household coverage together/);
  assert.doesNotMatch(markup, /Search-only question|Search-only answer/);
});

test("Article metadata cannot break the inert JSON-LD script boundary", () => {
  const unsafe = props();
  const text = '</ScRiPt><script>alert("inert")</script><!--';
  unsafe.fields!.Title = { value: text };
  unsafe.fields!.metadataDescription = { value: text };
  const markup = renderToStaticMarkup(createElement(ResourceContent, unsafe));
  assert.equal((markup.match(/<\/script\s*>/gi) || []).length, 1);
  assert.doesNotMatch(markup, /<script>alert/);
  assert.equal(schema(markup)?.headline, text);
  assert.equal(schema(markup)?.description, text);
});

test("canonical article URLs resolve relative paths and omit unsupported or credential-bearing URLs", () => {
  const article = {
    title: "An authored article",
    canonicalUrl: "/insurance-resources/bundling",
  };
  assert.equal(
    resourceArticleSchema(article, origin)?.url,
    origin + article.canonicalUrl,
  );
  for (const canonicalUrl of [
    "javascript:alert(1)",
    "data:text/html,content",
    "https://user:password@public.example.com/article",
    "https://[",
  ]) {
    const metadata = resourceArticleSchema(
      { ...article, canonicalUrl },
      origin,
    );
    assert.equal(metadata?.url, undefined);
    assert.equal(metadata?.mainEntityOfPage, undefined);
    assert.equal(metadata?.headline, article.title);
  }
});
