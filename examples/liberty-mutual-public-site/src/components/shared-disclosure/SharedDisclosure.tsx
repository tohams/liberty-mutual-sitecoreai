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
