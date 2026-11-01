import type { Field } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
export type PublicFaqProps = ComponentProps & {
  fields?: {
    heading?: Field<string>;
    items?: {
      id: string;
      fields: { question?: Field<string>; answer?: Field<string> };
    }[];
  };
};
