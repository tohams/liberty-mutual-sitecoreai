import assert from "node:assert/strict";
import test from "node:test";
import { serializeJsonLd } from "./serialize-json-ld";

test("authored closing-script text cannot escape the JSON-LD element", () => {
  const question = '</ScRiPt><script>alert("not executable")</script><!--';
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: "Compare <limits>, & review the policy.",
        },
      },
    ],
  };
  const serialized = serializeJsonLd(schema);
  assert.equal(serialized.includes("<"), false);
  assert.ok(serialized.includes("\\u003c/ScRiPt>"));
  assert.equal(
    ('<script type="application/ld+json">' + serialized + "</script>").match(
      /<\/script\s*>/gi,
    )?.length,
    1,
  );
  assert.deepEqual(JSON.parse(serialized), schema);
});

test("ordinary quotes, Unicode, and already escaped text remain valid JSON data", () => {
  const schema = {
    question: "What does “coverage” mean?",
    answer:
      'A "quoted" value, a literal \\u003c sequence, and a line\nremain data.',
  };
  assert.deepEqual(JSON.parse(serializeJsonLd(schema)), schema);
});
