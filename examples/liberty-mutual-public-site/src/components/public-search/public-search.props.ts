import type { Field } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
export type PublicSearchConfiguration = {
  searchIndex: string;
  fieldsMapping: Record<string, string>;
};
export type PublicSearchProps = ComponentProps & {
  fields?: {
    heading?: Field<string>;
    introduction?: Field<string>;
    search?: Field<string>;
  };
};
