import type { Field } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
export type PublicArticleProps = ComponentProps & {
  fields?: { heading?: Field<string>; body?: Field<string> };
};
