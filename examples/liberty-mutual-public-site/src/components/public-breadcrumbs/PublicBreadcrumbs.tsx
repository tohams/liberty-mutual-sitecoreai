import { Link, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicBreadcrumbsProps } from "./public-breadcrumbs.props";
export const Default = ({ fields, params }: PublicBreadcrumbsProps) => {
  if (!fields) return null;
  const items = Array.isArray(fields.items) ? fields.items : [];
  return (
    <nav
      className={`component public-breadcrumbs ${params.styles || ""}`}
      aria-label="Breadcrumbs"
      id={params.RenderingIdentifier}
    >
      <ol className="public-container">
        {items.map((item) => (
          <li key={item.id}>
            <Link field={item.fields.link} />
          </li>
        ))}
        <li aria-current="page">
          <Text tag="span" field={fields.currentLabel} />
        </li>
      </ol>
    </nav>
  );
};
