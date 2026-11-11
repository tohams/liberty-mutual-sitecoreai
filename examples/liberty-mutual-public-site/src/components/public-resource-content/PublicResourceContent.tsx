import { Link, RichText } from "@sitecore-content-sdk/nextjs";
import { getBaseUrl } from "lib/utils";
import { resourceArticleSchema } from "src/features/structured-data/resource-article-schema";
import { serializeJsonLd } from "src/features/structured-data/serialize-json-ld";
import type { PublicResourceContentProps } from "./public-resource-content.props";

export const Default = ({
  fields,
  params,
  rendering,
}: PublicResourceContentProps) => {
  if (!fields) return null;
  const schema = resourceArticleSchema(
    {
      title: fields.Title?.value,
      description: fields.metadataDescription?.value,
      canonicalUrl: fields.canonicalUrl?.value,
    },
    getBaseUrl(),
  );
  return (
    <article
      className={`component public-section public-answer ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(schema),
          }}
        />
      )}
      <div className="public-container public-answer__grid">
        <div>
          <RichText className="public-prose" field={fields.explanation} />
          <details className="public-answer__wording">
            <summary>Coverage and policy details</summary>
            <RichText className="public-prose" field={fields.formalWording} />
          </details>
          <div className="public-actions">
            <Link className="public-button" field={fields.nextStep} />
          </div>
        </div>
        <aside className="public-answer__source" aria-label="More information">
          <h3>More information</h3>
          <Link
            className="public-text-link"
            field={fields.sourceLink}
            target={fields.sourceLink?.value?.target || "_blank"}
            rel="noopener noreferrer"
          />
          {fields.disclosure?.fields && (
            <RichText
              className="public-answer__disclosure"
              field={fields.disclosure.fields.body}
            />
          )}
        </aside>
      </div>
    </article>
  );
};
