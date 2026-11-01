import { Link, RichText, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicCtaProps } from "./public-cta.props";
export const Default = ({ fields, params }: PublicCtaProps) =>
  fields ? (
    <section
      className={`component public-section public-cta ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-container public-cta__panel">
        <div>
          <Text tag="h2" field={fields.heading} />
          <RichText className="public-prose" field={fields.body} />
        </div>
        <Link className="public-button" field={fields.actionLink} />
      </div>
    </section>
  ) : null;
