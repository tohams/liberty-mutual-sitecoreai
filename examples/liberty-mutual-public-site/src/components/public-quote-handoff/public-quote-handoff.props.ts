import type { Field, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
import type { PublicProductOption } from "../public-product-selector/public-product-selector.props";
export type PublicQuoteHandoffProps = ComponentProps & {
  fields?: {
    heading?: Field<string>;
    introduction?: Field<string>;
    products?: PublicProductOption[] | Record<string, never>;
    agentLink: LinkField;
  };
};
