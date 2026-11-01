import { RichText, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicArticleProps } from "./public-article.props";
export const Default = ({ fields, params }: PublicArticleProps) =>
  fields ? (
    <section
      className={`component public-section public-article ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-container public-prose public-article__body">
        <Text tag="h2" field={fields.heading} />
        <RichText field={fields.body} />
      </div>
    </section>
  ) : null;
export const TrustStrip = ({ fields, params }: PublicArticleProps) =>
  fields ? (
    <div
      className={`component public-trust-strip ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-container">
        <RichText field={fields.body} />
      </div>
    </div>
  ) : null;
export const Centered = ({ fields, params }: PublicArticleProps) =>
  fields ? (
    <section
      className={`component public-section public-article public-article--centered ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-container">
        <Text tag="h2" field={fields.heading} />
        <RichText className="public-prose" field={fields.body} />
      </div>
    </section>
  ) : null;
export const CoverageTable = ({ fields, params }: PublicArticleProps) =>
  fields ? (
    <section
      className={`component public-section public-article public-article--table ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-container">
        <Text tag="h2" field={fields.heading} />
        <RichText className="public-prose" field={fields.body} />
      </div>
    </section>
  ) : null;
