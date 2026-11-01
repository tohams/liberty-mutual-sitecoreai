import assert from "node:assert/strict";
import test from "node:test";
import {
  ANSWER_COLLECTION_URL,
  contentParagraphs,
  displayContentDate,
  loadPublishedAnswer,
  PublishedAnswerNotAvailable,
  PublishedContentUnavailable,
} from "./published-answers";

const ID = "70144ef3-4be0-597a-9b22-81e8ee1cc9f6";
const OTHER_ID = "13fea402-dd76-589a-95e6-beacdbf658f7";
const answer = {
  id: ID,
  language: "en",
  version: 3,
  revision: "a".repeat(64),
  revisionKind: "published-content-sha256",
  question: "Can I bundle car and home insurance?",
  answer: "Explore the approved options with an agent.",
  formalWording: "<p>Coverage is subject to policy terms.</p>",
  explanation: "<p>Consider your needs and review the source.</p>",
  owner: "Content team",
  effectiveDate: "20261031T000000Z",
  reviewDate: "20270131T000000Z",
  state: "national",
  product: "auto-home",
  audience: "consumer",
  sourceLink: {
    href: "https://www.libertymutual.com/bundling",
    text: "Source",
  },
  canonicalUrl:
    "https://liberty-mutual-public-site.vercel.app/insurance-resources/bundle-car-and-home",
};

function response(data: unknown, etag = '"response-one"') {
  return Response.json(
    {
      schemaVersion: "1.0",
      data,
      meta: {
        site: "liberty-mutual-public-site",
        language: "en",
        source: "SitecoreAI Experience Edge Live",
        contentRevision: "b".repeat(64),
      },
    },
    { headers: { ETag: etag } },
  );
}

test("the second rendering host retrieves the chosen answer through the collection and stable REST item URL", async () => {
  const calls: Array<{ url: string; options?: RequestInit }> = [];
  const fetcher = (async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1 ? response([answer]) : response(answer);
  }) as typeof fetch;
  const result = await loadPublishedAnswer(ID, false, fetcher);
  assert.deepEqual(
    calls.map((call) => call.url),
    [ANSWER_COLLECTION_URL, `${ANSWER_COLLECTION_URL}/${ID}`],
  );
  assert.equal(result.selected.data.version, 3);
  assert.equal(result.selected.data.answer, answer.answer);
  assert.equal(result.selected.meta.source, "SitecoreAI Experience Edge Live");
  assert.equal(result.etag, '"response-one"');
  assert(calls.every(({ options }) => options?.cache === "no-store"));
  assert(calls.every(({ options }) => options?.redirect === "error"));
  assert(calls.every(({ options }) => options?.signal instanceof AbortSignal));
});

test("an unrecognized answer parameter never becomes an arbitrary request URL", async () => {
  const urls: string[] = [];
  const fetcher = (async (url) => {
    urls.push(String(url));
    return urls.length === 1 ? response([answer]) : response(answer);
  }) as typeof fetch;
  await assert.rejects(
    loadPublishedAnswer("https://example.invalid/private", false, fetcher),
    PublishedAnswerNotAvailable,
  );
  assert.deepEqual(urls, [ANSWER_COLLECTION_URL]);
});

test("a requested retired ID remains unavailable rather than being silently replaced by another published answer", async () => {
  const calls: string[] = [];
  const remaining = {
    ...answer,
    id: OTHER_ID,
    question: "Another approved question",
  };
  const fetcher = (async (url) => {
    calls.push(String(url));
    return response([remaining]);
  }) as typeof fetch;
  await assert.rejects(
    loadPublishedAnswer(ID, false, fetcher),
    PublishedAnswerNotAvailable,
  );
  assert.deepEqual(calls, [ANSWER_COLLECTION_URL]);
});

test("retirement between collection retrieval and the single-record request is also unavailable", async () => {
  let calls = 0;
  const fetcher = (async () =>
    ++calls === 1
      ? response([answer])
      : Response.json(
          { error: { code: "NOT_FOUND" } },
          { status: 404 },
        )) as typeof fetch;
  await assert.rejects(
    loadPublishedAnswer(ID, false, fetcher),
    PublishedAnswerNotAvailable,
  );
  assert.equal(calls, 2);
});

test("the unchanged check sends the actual response ETag and observes a real 304", async () => {
  let count = 0;
  const fetcher = (async (_url, options) => {
    count++;
    if (count === 1) return response([answer]);
    if (count === 2) return response(answer, '"actual-etag"');
    assert.equal(
      new Headers(options?.headers).get("If-None-Match"),
      '"actual-etag"',
    );
    return new Response(null, {
      status: 304,
      headers: { ETag: '"actual-etag"' },
    });
  }) as typeof fetch;
  const result = await loadPublishedAnswer(ID, true, fetcher);
  assert.equal(count, 3);
  assert.equal(result.conditionalStatus, 304);
  assert.equal(result.selected.data.answer, answer.answer);
});

test("a conditional response that changed replaces the displayed answer rather than keeping older content", async () => {
  let count = 0;
  const updated = {
    ...answer,
    version: 4,
    answer: "Newly approved guidance.",
    revision: "c".repeat(64),
  };
  const fetcher = (async () => {
    count++;
    if (count === 1) return response([answer]);
    return count === 2 ? response(answer) : response(updated, '"response-two"');
  }) as typeof fetch;
  const result = await loadPublishedAnswer(ID, true, fetcher);
  assert.equal(result.conditionalStatus, 200);
  assert.equal(result.selected.data.version, 4);
  assert.equal(result.selected.data.answer, updated.answer);
  assert.equal(result.etag, '"response-two"');
});

test("unavailable, incomplete, unsafe, or cross-site responses fail without fabricated content", async () => {
  const candidates = [
    () => new Response("Unavailable", { status: 503 }),
    () => response([]),
    () =>
      response([
        {
          ...answer,
          sourceLink: { href: "javascript:alert(1)", text: "Unsafe" },
        },
      ]),
    () =>
      response([
        {
          ...answer,
          canonicalUrl: "https://other.example/insurance-resources/article",
        },
      ]),
    () => response([{ ...answer, answer: "" }]),
    () => Response.json({ schemaVersion: "2.0", data: [answer], meta: {} }),
    () =>
      new Response("not JSON", { headers: { "Content-Type": "text/html" } }),
    () => response([answer, answer]),
  ];
  for (const candidate of candidates) {
    await assert.rejects(
      loadPublishedAnswer(ID, false, (async () => candidate()) as typeof fetch),
      PublishedContentUnavailable,
    );
  }
});

test("the single-record response must match the ID selected from the approved collection", async () => {
  let count = 0;
  await assert.rejects(
    loadPublishedAnswer(ID, false, (async () =>
      ++count === 1
        ? response([answer])
        : response({ ...answer, id: OTHER_ID })) as typeof fetch),
    PublishedContentUnavailable,
  );
});

test("oversized JSON is rejected even when the response omits Content-Length", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(1_048_577));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    loadPublishedAnswer(
      ID,
      false,
      (async () =>
        new Response(stream, {
          headers: { "Content-Type": "application/json" },
        })) as typeof fetch,
    ),
    PublishedContentUnavailable,
  );
  assert.equal(cancelled, true);
});

test("API rich text becomes readable paragraphs without rendering untrusted markup", () => {
  assert.deepEqual(
    contentParagraphs(
      "<p>Terms &amp; conditions.</p><p>Agent&#8217;s guidance.<br>Next step.</p>",
    ),
    ["Terms & conditions.", "Agent’s guidance.", "Next step."],
  );
  assert.deepEqual(contentParagraphs("<p>&lt;img onerror=alert(1)&gt;</p>"), [
    "<img onerror=alert(1)>",
  ]);
  assert.equal(displayContentDate("20261031T000000Z"), "October 31, 2026");
  assert.equal(displayContentDate(""), "Not specified");
});
