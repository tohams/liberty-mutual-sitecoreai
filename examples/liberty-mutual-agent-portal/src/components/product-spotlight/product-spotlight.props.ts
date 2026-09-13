import type { Field, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "@/lib/component-props";

export interface ProductSpotlightProps extends ComponentProps {
  fields?: {
    eyebrow?: Field<string>;
    headline?: Field<string>;
    body?: Field<string>;
    actionLink?: LinkField;
  };
}
