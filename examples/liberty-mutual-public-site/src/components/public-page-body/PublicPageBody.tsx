import { AppPlaceholder } from "@sitecore-content-sdk/nextjs";
import componentMap from ".sitecore/component-map";
import type { ComponentProps } from "lib/component-props";

export const Default = ({ rendering, page, params }: ComponentProps) => (
  <div
    className={`component public-page-body ${params.styles || ""}`}
    id={params.RenderingIdentifier}
  >
    <AppPlaceholder
      name={`headless-public-hero-${params.DynamicPlaceholderId}`}
      rendering={rendering}
      page={page}
      componentMap={componentMap}
    />
    <div className="public-page-content">
      <AppPlaceholder
        name={`headless-public-content-${params.DynamicPlaceholderId}`}
        rendering={rendering}
        page={page}
        componentMap={componentMap}
      />
    </div>
  </div>
);
