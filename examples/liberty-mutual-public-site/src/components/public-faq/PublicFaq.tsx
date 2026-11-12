import { RichText, Text, type Field } from "@sitecore-content-sdk/nextjs";
import { getBaseUrl } from "lib/utils";
import {
  faqAnchor,
  faqPageSchema,
} from "src/features/structured-data/faq-schema";
import { serializeJsonLd } from "src/features/structured-data/serialize-json-ld";
import FaqItems from "src/features/faq/FaqItems";
import type { PublicFaqProps } from "./public-faq.props";
export const Default = ({
  fields,
  params,
  rendering,
  page,
}: PublicFaqProps) => {
  if (!fields) return null;
  const items = Array.isArray(fields.items) ? fields.items : [];
  const routeFields = page.layout.sitecore.route?.fields as
    Record<string, Field<string> | undefined> | undefined;
  const schema = faqPageSchema(
    {
      title: routeFields?.metadataTitle?.value || routeFields?.Title?.value,
      description: routeFields?.metadataDescription?.value,
      canonicalUrl: routeFields?.canonicalUrl?.value,
      language: page.locale,
    },
    items,
    getBaseUrl(),
  );
  return (
    <section
      className={`component public-section public-faq ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
        />
      )}
      <div className="public-container">
        <Text tag="h2" field={fields.heading} />
        <FaqItems>
          {items.map((item) => (
            <details key={item.id} id={faqAnchor(item.id)}>
              <summary>
                <Text tag="span" field={item.fields.question} />
                <svg
                  className="public-faq__caret"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M2.71112 4.00194L1.29501 5.41426L7.98512 12.1223L14.7092 5.41615L13.2969 4.00005L7.9889 9.29388L2.71112 4.00194Z" />
                </svg>
              </summary>
              <RichText className="public-prose" field={item.fields.answer} />
            </details>
          ))}
        </FaqItems>
      </div>
    </section>
  );
};
