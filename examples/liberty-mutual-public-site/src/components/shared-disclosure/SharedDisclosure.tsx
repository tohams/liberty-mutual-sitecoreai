import { Link, RichText, Text } from "@sitecore-content-sdk/nextjs";
import type { SharedDisclosureProps } from "./shared-disclosure.props";

export const Default = ({
  fields,
  params,
  rendering,
}: SharedDisclosureProps) => {
  if (!fields) return null;
  return (
    <aside
      className={`component public-disclosure ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <div className="public-container">
        <Text tag="h2" field={fields.title} />
        <RichText field={fields.body} />
        <Link className="public-text-link" field={fields.sourceLink} />
      </div>
    </aside>
  );
};

/** The native footer placeholder selects this presentation of the shared notice. */
export const Copyright = ({
  fields,
  params,
  rendering,
}: SharedDisclosureProps) =>
  fields ? (
    <div
      className={`component public-copyright ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <RichText field={fields.body} />
    </div>
  ) : null;
