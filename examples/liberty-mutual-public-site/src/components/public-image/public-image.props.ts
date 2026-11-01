import type { Field, ImageField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
export type PublicImageProps = ComponentProps & {
  fields?: { image?: ImageField; caption?: Field<string> };
};
