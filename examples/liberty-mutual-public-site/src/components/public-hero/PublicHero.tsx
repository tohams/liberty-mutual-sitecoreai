import { Image, Link, RichText, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicHeroProps } from "./public-hero.props";

function Hero({ fields, params }: PublicHeroProps, centered = false) {
  if (!fields) return null;
  return (
    <section
      className={`component public-hero ${centered ? "public-hero--centered" : ""} ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-container public-hero__grid">
        <div className="public-hero__content">
          <Text tag="p" className="public-eyebrow" field={fields.eyebrow} />
          <Text tag="h1" field={fields.heading} />
          <RichText className="public-hero__summary" field={fields.summary} />
          <div className="public-actions">
            <Link className="public-button" field={fields.primaryLink} />
            <Link className="public-text-link" field={fields.secondaryLink} />
          </div>
        </div>
        <div className="public-hero__image">
          <Image field={fields.image} loading="eager" />
        </div>
      </div>
    </section>
  );
}

export const Default = (props: PublicHeroProps) => Hero(props);
export const Centered = (props: PublicHeroProps) => Hero(props, true);
export const QuoteIntro = ({ fields, params }: PublicHeroProps) =>
  fields ? (
    <section
      className={`component public-quote-intro ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-container">
        <RichText
          className="public-quote-intro__heading"
          field={fields.quoteHeading}
        />
        <RichText
          className="public-quote-intro__summary"
          field={fields.summary}
        />
      </div>
    </section>
  ) : null;
