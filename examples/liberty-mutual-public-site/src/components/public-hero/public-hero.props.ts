import type {
  Field,
  ImageField,
  LinkField,
} from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";

export type PublicHeroProps = ComponentProps & {
  fields?: {
    eyebrow?: Field<string>;
    heading?: Field<string>;
    quoteHeading?: Field<string>;
    summary?: Field<string>;
    image?: ImageField;
    primaryLink: LinkField;
    secondaryLink: LinkField;
  };
};
