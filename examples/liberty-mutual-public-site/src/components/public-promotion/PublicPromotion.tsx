import { Image, Link, RichText, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicPromotionProps } from "./public-promotion.props";

function Promotion(
  { fields, params, rendering }: PublicPromotionProps,
  compact = false,
) {
  if (!fields) return null;
  return (
    <section
      className={`component public-section public-promotion ${compact ? "public-promotion--compact" : ""} ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <div className="public-container">
        <div className="public-promotion__panel">
          <div className="public-promotion__image">
            <Image field={fields.image} loading="lazy" />
          </div>
          <div className="public-promotion__content">
            <Text tag="p" className="public-eyebrow" field={fields.eyebrow} />
            <Text tag="h2" field={fields.headline} />
            <RichText className="public-prose" field={fields.body} />
            <Link className="public-button" field={fields.actionLink} />
            {fields.disclosure?.fields && (
              <RichText
                className="public-promotion__qualification"
                field={fields.disclosure.fields.body}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export const Default = (props: PublicPromotionProps) => Promotion(props);
export const Compact = (props: PublicPromotionProps) => Promotion(props, true);
