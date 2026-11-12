import assert from "node:assert/strict";
import test from "node:test";
import { faqAnchor, faqPageSchema } from "./faq-schema";
import { serializeJsonLd } from "./serialize-json-ld";

const id = "8c73b233-9576-52d7-bd5a-a78756a08c14";
const items = [
  {
    id,
    fields: {
      question: { value: "An authored question?" },
      answer: { value: "<p>The visible authored answer.</p>" },
    },
  },
];
const canonical = "https://public.example.com/bundling";

test("native IDs produce the same stable FAQ fragment in all SDK GUID formats", () => {
  for (const value of [id, `{${id.toUpperCase()}}`, id.replaceAll("-", "")])
    assert.equal(faqAnchor(value), `faq-${id}`);
  assert.equal(faqAnchor("not-a-native-item"), undefined);
});

test("the page and FAQ schema use the visible native fields and their exact destination", () => {
  const schema = faqPageSchema(
    { title: "A page title", canonicalUrl: "/bundling", language: "en" },
    items,
    "https://public.example.com",
  );
  assert(schema);
  assert.deepEqual(schema["@graph"][0], {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: "A page title",
    inLanguage: "en",
  });
  assert.deepEqual(schema["@graph"][1], {
    "@type": "FAQPage",
    url: canonical,
    isPartOf: { "@id": `${canonical}#webpage` },
    mainEntity: [
      {
        "@type": "Question",
        "@id": `${canonical}#faq-${id}`,
        url: `${canonical}#faq-${id}`,
        name: "An authored question?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "<p>The visible authored answer.</p>",
        },
      },
    ],
  });
});

test("incomplete FAQ fields do not claim an answer in the structured output", () => {
  assert.equal(
    faqPageSchema(
      {},
      [{ id, fields: { question: { value: "Question only" } } }],
      canonical,
    ),
    null,
  );
  assert.equal(
    faqPageSchema(
      {},
      [
        {
          id,
          fields: {
            question: { value: "Question" },
            answer: { value: "<p></p>" },
          },
        },
      ],
      canonical,
    ),
    null,
  );
});

test("unsafe canonical URLs and authored script text cannot break the inert schema boundary", () => {
  for (const url of [
    "javascript:alert(1)",
    "https://user:password@public.example.com/bundling",
  ]) {
    const schema = faqPageSchema({ canonicalUrl: url }, items, canonical)!;
    assert(!("url" in schema["@graph"][0]));
    assert(!("url" in schema["@graph"][1]));
  }
  const authored = structuredClone(items);
  authored[0].fields.answer.value =
    "<p>Visible text</p></ScRiPt><script>alert(1)</script>";
  const serialized = serializeJsonLd(
    faqPageSchema({ canonicalUrl: canonical }, authored, canonical)!,
  );
  assert(!serialized.includes("</ScRiPt>"));
  assert.equal(
    JSON.parse(serialized)["@graph"][1].mainEntity[0].acceptedAnswer.text,
    authored[0].fields.answer.value,
  );
});
