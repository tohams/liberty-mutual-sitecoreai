import assert from "node:assert/strict";
import test from "node:test";
import {
  ANSWER_ROOT,
  ANSWER_TEMPLATE,
  mapPublishedAnswer,
  type SearchOperation,
} from "./content";
import {
  LivePages,
  LiveSearchContent,
  PUBLIC_HOME,
  PUBLIC_PAGE_TEMPLATE,
  pageSearchDocument,
  type NativeSearchPage,
} from "./live-pages";
import { PublicationService } from "./publication-service";
import type {
  PublicationReceipt,
  PublicationState,
  PublicationStore,
} from "./receipt-store";
import { contentGet } from "./content-http";
import { supportedQuestionResults } from "../search/question-evidence";

const origin = "https://public.example.com";
const id = "11111111-2222-5333-8444-555555555555";
const heroId = "22222222-2222-5333-8444-555555555555";
const articleId = "33333333-2222-5333-8444-555555555555";
const unusedId = "44444444-2222-5333-8444-555555555555";
const sharedId = "55555555-2222-5333-8444-555555555555";
const answerId = "66666666-2222-5333-8444-555555555555";
const route = "/insurance-resources/auto/bundling/how-to-bundle-your-insurance";
const field = (value: unknown) => ({ jsonValue: { value } });

function page(): NativeSearchPage {
  return {
    id,
    path: PUBLIC_HOME + route,
    version: 1,
    template: { id: PUBLIC_PAGE_TEMPLATE },
    includeInSearch: field(true),
    metadataTitle: field("How to bundle your insurance policies"),
    metadataDescription: field(
      "Compare home and auto insurance coverage before bundling your policies.",
    ),
    canonicalUrl: field(route),
    sourceLink: field({
      href: "https://www.libertymutual.com" + route,
      text: "Liberty Mutual",
    }),
    state: field("All"),
    product: field("auto,home"),
    audience: field("consumer"),
  };
}

function body() {
  return {
    localData: {
      path: PUBLIC_HOME + route + "/Data",
      children: {
        pageInfo: { hasNext: false },
        results: [heroId, articleId, unusedId].map((id, index) => ({
          id,
          path: PUBLIC_HOME + route + "/Data/" + index,
        })),
      },
    },
    layout: {
      item: {
        rendered: {
          sitecore: {
            route: {
              itemId: id,
              placeholders: {
                "headless-main": [
                  {
                    componentName: "PublicPageBody",
                    placeholders: {
                      "headless-public-content-1": [
                        {
                          componentName: "PublicHero",
                          dataSource: heroId,
                          fields: {
                            heading: {
                              value: "How to bundle your insurance policies",
                            },
                            summary: {
                              value:
                                "<p>Combine eligible home and auto policies.</p>",
                            },
                          },
                        },
                        {
                          componentName: "PublicArticle",
                          dataSource: articleId,
                          fields: {
                            heading: { value: "Review coverage" },
                            body: {
                              value:
                                "<p>Compare limits &amp; deductibles before you bundle.</p>",
                            },
                          },
                        },
                        // This is not page-owned content and must not become evidence for a result.
                        {
                          componentName: "PublicArticle",
                          dataSource: sharedId,
                          fields: { body: { value: "cyberextortion" } },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  };
}

function fixture() {
  let pages = [page()];
  let currentBody: unknown = body();
  let error = false;
  let incomplete = false;
  let layoutReads = 0;
  const transport: typeof fetch = async (input, init) => {
    assert.equal(
      String(input),
      "https://edge-platform.sitecorecloud.io/v1/content/api/graphql/v1",
    );
    assert.equal(
      new Headers(init?.headers).get("x-sitecore-contextid"),
      "live-only",
    );
    assert.equal(init?.cache, "no-store");
    const payload = JSON.parse(String(init?.body));
    if (error) return Response.json({ errors: [{ message: "Unavailable" }] });
    if (payload.query.includes("query PublishedSearchPages")) {
      assert.match(payload.query, /_latestversion.*true/);
      assert.match(payload.query, /_language.*en/);
      assert.match(payload.query, /\.\.\. on MultilistField/);
      return Response.json({
        data: { search: { results: pages, pageInfo: { hasNext: incomplete } } },
      });
    }
    layoutReads++;
    assert.equal(payload.variables.dataPath, page().path + "/Data");
    assert.equal(payload.variables.route, route);
    return Response.json({ data: currentBody });
  };
  return {
    reader: new LivePages("live-only", origin, transport),
    setPages: (value: NativeSearchPage[]) => {
      pages = value;
    },
    setBody: (value: unknown) => {
      currentBody = value;
    },
    setError: () => {
      error = true;
    },
    setIncomplete: () => {
      incomplete = true;
    },
    layoutReads: () => layoutReads,
  };
}

const answerReader = {
  readAll: async () => [
    mapPublishedAnswer(
      {
        id: answerId,
        path: ANSWER_ROOT + "/Original answer",
        version: 1,
        template: { id: ANSWER_TEMPLATE },
        question: field("Can I bundle my car and home insurance?"),
        answer: field("Review eligible policies."),
        canonicalUrl: field("/insurance-resources/bundle-car-and-home"),
      },
      origin,
    ),
  ],
};

test("page Search uses real published titles and rendered local content, without creating a question", async () => {
  const f = fixture();
  const [published] = await f.reader.readAll();
  const operation = pageSearchDocument(published);
  assert.equal(operation.sc_url, origin + route);
  assert.equal(
    operation.fields?.title,
    "How to bundle your insurance policies",
  );
  assert.equal(operation.fields?.question, "");
  assert.match(operation.fields!.body, /Compare limits & deductibles/);
  assert(!operation.fields!.body.includes("cyberextortion"));
  assert.equal(
    operation.fields?.sourceurl,
    "https://www.libertymutual.com" + route,
  );
  assert.equal(
    supportedQuestionResults(
      "Can I combine home and car coverage?",
      [operation],
      (row) => Object.values(row.fields!).join(" "),
    ).length,
    1,
  );
  assert.equal(
    supportedQuestionResults(
      "Does car insurance cover cyberextortion?",
      [operation],
      (row) => Object.values(row.fields!).join(" "),
    ).length,
    0,
  );
});

test("new pages remain out of Search until the native checkbox is explicitly selected", async () => {
  for (const value of [undefined, false, "", "0", "false"]) {
    const f = fixture();
    f.setPages([
      {
        ...page(),
        includeInSearch: value === undefined ? undefined : field(value),
      },
    ]);
    assert.deepEqual(await f.reader.readAll(), []);
    assert.equal(f.layoutReads(), 0);
  }
});

test("page Search classifies native Checklist values on the page itself", async () => {
  const f = fixture();
  const option = (number: string, folder: string, name: string) => ({
    id: `${number}-2222-5333-8444-555555555555`,
    name,
    path: `/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Taxonomy/${folder}/${name}`,
    template: { id: "9dc18d3c-9944-507a-aeab-9787c8fc4d9c" },
  });
  const products = [
    option("11111111", "Products", "home"),
    option("22222222", "Products", "auto"),
  ];
  const states = [
    option("33333333", "States", "TX"),
    option("44444444", "States", "IL"),
  ];
  f.setPages([
    {
      ...page(),
      product: {
        targetIds: products.map((item) => item.id),
        targetItems: products,
      },
      state: { targetIds: states.map((item) => item.id), targetItems: states },
    },
  ]);
  const [published] = await f.reader.readAll();
  assert.equal(published.product, "auto,home");
  assert.equal(published.state, "IL,TX");
  assert.equal(pageSearchDocument(published).fields?.product, "auto,home");
  products.pop();
  await assert.rejects(f.reader.readAll(), /MISSING_PUBLISHED_TAXONOMY/);
});

test("published local information sections and linked FAQ copy also contribute to the page document", async () => {
  const f = fixture();
  f.setBody({
    localData: body().localData,
    layout: {
      item: {
        rendered: {
          sitecore: {
            route: {
              itemId: id,
              placeholders: {
                main: [
                  {
                    componentName: "PublicSplitContent",
                    dataSource: articleId,
                    fields: {
                      heading: { value: "Compare your options" },
                      body: { value: "<p>Review home and auto coverages.</p>" },
                    },
                  },
                  {
                    componentName: "PublicFaq",
                    dataSource: unusedId,
                    fields: {
                      heading: { value: "Bundling questions" },
                      items: [
                        {
                          fields: {
                            question: { value: "When can I bundle?" },
                            answer: {
                              value:
                                "<p>Ask about eligible policies when reviewing your coverage.</p>",
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  });
  const [result] = await f.reader.readAll();
  assert.match(result.body, /Review home and auto coverages/);
  assert.match(result.body, /When can I bundle/);
  assert.match(result.body, /Ask about eligible policies/);
});

test("wrong layout identity, incomplete local publication, and foreign canonical URLs fail closed", async () => {
  const wrongLayout = fixture();
  const wrong = body();
  wrong.layout.item.rendered.sitecore.route.itemId = sharedId;
  wrongLayout.setBody(wrong);
  await assert.rejects(
    wrongLayout.reader.readAll(),
    /PUBLISHED_PAGE_LAYOUT_MISMATCH/,
  );
  const partial = fixture();
  const data = body();
  data.localData.children.pageInfo.hasNext = true;
  partial.setBody(data);
  await assert.rejects(partial.reader.readAll(), /INCOMPLETE_PUBLISHED_PAGE/);
  const foreign = fixture();
  foreign.setPages([
    { ...page(), canonicalUrl: field("https://other.example.com/article") },
  ]);
  await assert.rejects(foreign.reader.readAll(), /INVALID_PUBLISHED_PAGE/);
});

test("an unreadable or truncated native page query is never treated as an empty library", async () => {
  const failed = fixture();
  failed.setError();
  await assert.rejects(failed.reader.readAll(), /LIVE_PAGES_UNAVAILABLE/);
  const incomplete = fixture();
  incomplete.setIncomplete();
  await assert.rejects(
    incomplete.reader.readAll(),
    /INCOMPLETE_PUBLISHED_PAGES/,
  );
});

test("page publication changes upsert the real page; opt-out and unpublish remove it without touching answers", async () => {
  const f = fixture();
  const reader = new LiveSearchContent(answerReader, f.reader);
  let state: PublicationState | null = null;
  let latest: PublicationReceipt | null = null;
  const store: PublicationStore = {
    acquire: async () => "test-lease",
    state: async () => state,
    latest: async () => latest,
    finish: async (_lease, receipt, next) => {
      latest = receipt;
      if (next) state = next;
    },
  };
  const pushes: SearchOperation[][] = [];
  const service = new PublicationService(
    reader,
    {
      push: async (operations) => {
        pushes.push(operations);
        return operations.length;
      },
    },
    store,
  );
  const sync = () =>
    service.reconcile({ kind: "edge-publish-complete", id: "native-publish" });
  assert.equal((await sync()).upserts, 2);
  const changed = body();
  changed.layout.item.rendered.sitecore.route.placeholders[
    "headless-main"
  ][0].placeholders["headless-public-content-1"][1].fields.body!.value =
    "<p>Review your current limits and deductibles before bundling coverage.</p>";
  f.setBody(changed);
  assert.equal((await sync()).upserts, 1);
  assert.equal(pushes.at(-1)![0].id, id);
  assert.match(pushes.at(-1)![0].fields!.body, /Review your current limits/);
  f.setPages([{ ...page(), includeInSearch: field(false) }]);
  assert.equal((await sync()).deletes, 1);
  assert.deepEqual(pushes.at(-1), [
    { action: "delete", id, locale: "en", sc_url: origin + route },
  ]);
  f.setPages([page()]);
  await sync();
  f.setPages([]);
  assert.equal((await sync()).deletes, 1);
  const api = await contentGet(
    new Request(origin + "/api/content/v1/answers"),
    undefined,
    answerReader,
  );
  const result = await api.json();
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, answerId);
  assert.equal(
    result.data[0].question,
    "Can I bundle my car and home insurance?",
  );
});

test("a failed page read retains the previous complete Search manifest", async () => {
  const f = fixture();
  let state: PublicationState | null = null;
  const store: PublicationStore = {
    acquire: async () => "test-lease",
    state: async () => state,
    latest: async () => null,
    finish: async (_lease, _receipt, next) => {
      if (next) state = next;
    },
  };
  const pushes: SearchOperation[][] = [];
  const service = new PublicationService(
    new LiveSearchContent(answerReader, f.reader),
    {
      push: async (operations) => {
        pushes.push(operations);
        return operations.length;
      },
    },
    store,
  );
  await service.reconcile({ kind: "edge-publish-complete", id: "one" });
  const preserved = structuredClone(state);
  f.setError();
  await assert.rejects(
    service.reconcile({ kind: "edge-publish-complete", id: "two" }),
    /LIVE_PAGES_UNAVAILABLE/,
  );
  assert.deepEqual(state, preserved);
  assert.equal(pushes.length, 1);
});
