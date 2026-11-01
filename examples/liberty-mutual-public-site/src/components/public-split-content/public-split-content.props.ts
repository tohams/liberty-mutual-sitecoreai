import type {
  Field,
  ImageField,
  LinkField,
} from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
export type PublicSplitContentProps = ComponentProps & {
  fields?: {
    heading?: Field<string>;
    body?: Field<string>;
    image?: ImageField;
    primaryLink: LinkField;
    secondaryLink: LinkField;
  };
};
