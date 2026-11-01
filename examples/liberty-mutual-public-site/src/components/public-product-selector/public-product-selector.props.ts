import type {
  Field,
  ImageField,
  LinkField,
} from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";

export type PublicProductOption = {
  id: string;
  fields: {
    label?: Field<string>;
    productKey?: Field<string>;
    image?: ImageField;
    quoteLink: LinkField;
  };
};
export type PublicProductSelectorProps = ComponentProps & {
  fields?: {
    heading?: Field<string>;
    introduction?: Field<string>;
    products?: PublicProductOption[] | Record<string, never>;
    defaultProducts?: Field<string>;
    postcodeLabel?: Field<string>;
    actionLink: LinkField;
    agentLink: LinkField;
  };
};
