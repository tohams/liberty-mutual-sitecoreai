import { Link, RichText, Text } from "@sitecore-content-sdk/nextjs";
import PublicationDate from "components/content-sdk/PublicationDate";
import { serializeJsonLd } from "src/features/structured-data/serialize-json-ld";
import type { PublicApprovedAnswerProps } from "./public-approved-answer.props";

export const Default = ({
  fields,
  params,
  rendering,
}: PublicApprovedAnswerProps) => {
  if (!fields) return null;
  const schema =
    fields.question?.value && fields.answer?.value
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          ...(fields.canonicalUrl?.value
            ? { "@id": fields.canonicalUrl.value }
            : {}),
          mainEntity: [
            {
              "@type": "Question",
              name: fields.question.value,
              acceptedAnswer: { "@type": "Answer", text: fields.answer.value },
            },
          ],
        }
      : null;
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
          <Text tag="h2" field={fields.question} />
          <Text
            tag="p"
            className="public-answer__summary public-prose"
            field={fields.answer}
          />
          <RichText className="public-prose" field={fields.explanation} />
          <details className="public-answer__wording">
            <summary>Coverage and policy details</summary>
            <RichText className="public-prose" field={fields.formalWording} />
          </details>
          <div className="public-actions">
            <Link className="public-button" field={fields.nextStep} />
          </div>
        </div>
        <aside
          className="public-answer__source"
          aria-label="Source information"
        >
          <h3>More information</h3>
          <Link className="public-text-link" field={fields.sourceLink} />
          <div className="public-answer__metadata">
            <Text tag="p" field={fields.owner} />
            <PublicationDate label="Effective" field={fields.effectiveDate} />
            <PublicationDate label="Review date" field={fields.reviewDate} />
          </div>
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
