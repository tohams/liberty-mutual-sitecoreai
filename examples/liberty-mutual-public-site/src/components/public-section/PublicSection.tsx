import { Image, Link, RichText, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicSectionProps } from "./public-section.props";

type SectionStyle = "proof" | "numbered" | "images" | "bundles" | "quote";

function Section(
  { fields, params, rendering }: PublicSectionProps,
  style: SectionStyle,
) {
  if (!fields) return null;
  const items = Array.isArray(fields.items) ? fields.items : [];
  return (
    <section
      className={`component public-section public-card-section public-card-section--${style} ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <div className="public-container">
        <RichText className="public-section-heading" field={fields.heading} />
        <RichText
          className="public-section-intro"
          field={fields.introduction}
        />
        <div className="public-card-grid">
          {items.map((item, index) => (
            <article className="public-content-card" key={item.id}>
              {style === "numbered" && (
                <span
                  className="public-content-card__number"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
              )}
              {style !== "proof" && style !== "numbered" && (
                <Image
                  className="public-content-card__image"
                  field={item.fields.image}
                />
              )}
              <div className="public-content-card__content">
                {style === "proof" && (
                  <Text
                    tag="p"
                    className="public-content-card__value"
                    field={item.fields.value}
                  />
                )}
                {style === "numbered" ? (
                  <h3>
                    <Link field={item.fields.actionLink}>
                      <Text tag="span" field={item.fields.heading} />
                    </Link>
                  </h3>
                ) : (
                  <Text tag="h3" field={item.fields.heading} />
                )}
                <RichText className="public-prose" field={item.fields.body} />
                {style !== "numbered" && style !== "proof" && (
                  <Link
                    className="public-text-link"
                    field={item.fields.actionLink}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="public-card-section__action">
          <Link className="public-button" field={fields.actionLink} />
        </div>
      </div>
    </section>
  );
}

export const Default = (props: PublicSectionProps) => Section(props, "images");
export const ProofCards = (props: PublicSectionProps) =>
  Section(props, "proof");
export const NumberedLinks = (props: PublicSectionProps) =>
  Section(props, "numbered");
export const ImageCards = (props: PublicSectionProps) =>
  Section(props, "images");
export const Bundles = (props: PublicSectionProps) => Section(props, "bundles");
export const QuoteCards = (props: PublicSectionProps) =>
  Section(props, "quote");
