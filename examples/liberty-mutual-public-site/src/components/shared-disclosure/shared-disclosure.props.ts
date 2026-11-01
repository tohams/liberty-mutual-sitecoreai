import type { Field, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";

export type SharedDisclosureFields = {
  title?: Field<string>;
  body?: Field<string>;
  sourceLink: LinkField;
  owner?: Field<string>;
  effectiveDate?: Field<string>;
  reviewDate?: Field<string>;
};
export type SharedDisclosureProps = ComponentProps & {
  fields?: SharedDisclosureFields;
};
