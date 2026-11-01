import { RichText, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicFaqProps } from "./public-faq.props";
export const Default = ({ fields, params, rendering }: PublicFaqProps) => {
  if (!fields) return null;
  const items = Array.isArray(fields.items) ? fields.items : [];
  return (
    <section
      className={`component public-section public-faq ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <div className="public-container">
        <Text tag="h2" field={fields.heading} />
        <div className="public-faq__items">
          {items.map((item) => (
            <details key={item.id}>
              <summary>
                <Text tag="span" field={item.fields.question} />
              </summary>
              <RichText className="public-prose" field={item.fields.answer} />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
