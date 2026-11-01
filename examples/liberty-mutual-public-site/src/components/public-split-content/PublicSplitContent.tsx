import { Image, Link, RichText } from "@sitecore-content-sdk/nextjs";
import type { PublicSplitContentProps } from "./public-split-content.props";

function Split(
  { fields, params, rendering }: PublicSplitContentProps,
  left = false,
  soft = false,
) {
  if (!fields) return null;
  return (
    <section
      className={`component public-section public-split-content ${left ? "public-split-content--image-left" : ""} ${soft ? "public-split-content--claims" : ""} ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <div className="public-container public-split-content__grid">
        <div className="public-split-content__copy">
          <RichText className="public-section-heading" field={fields.heading} />
          <RichText className="public-prose" field={fields.body} />
          <div className="public-actions">
            <Link className="public-button" field={fields.primaryLink} />
            <Link
              className={soft ? "public-button" : "public-text-link"}
              field={fields.secondaryLink}
            />
          </div>
        </div>
        <div className="public-split-content__image">
          <Image field={fields.image} loading="lazy" />
        </div>
      </div>
    </section>
  );
}
export const Default = (props: PublicSplitContentProps) => Split(props);
export const ImageRight = (props: PublicSplitContentProps) => Split(props);
export const ImageLeft = (props: PublicSplitContentProps) => Split(props, true);
export const ImageRightSoft = (props: PublicSplitContentProps) =>
  Split(props, false, true);
export const TextColumns = ({
  fields,
  params,
  rendering,
}: PublicSplitContentProps) =>
  fields ? (
    <section
      className={`component public-section public-text-columns ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <div className="public-container public-text-columns__grid">
        <RichText className="public-section-heading" field={fields.heading} />
        <div>
          <RichText className="public-prose" field={fields.body} />
          <div className="public-actions">
            <Link className="public-button" field={fields.primaryLink} />
            <Link className="public-text-link" field={fields.secondaryLink} />
          </div>
        </div>
      </div>
    </section>
  ) : null;
