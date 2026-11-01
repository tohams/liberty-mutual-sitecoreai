import type { Field, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
export type PublicCtaProps = ComponentProps & {
  fields?: {
    heading?: Field<string>;
    body?: Field<string>;
    actionLink: LinkField;
  };
};
