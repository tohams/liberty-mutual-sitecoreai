import type { Field, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
import type { PublicCard } from "src/features/insurance/public-content";

export type PublicSectionProps = ComponentProps & {
  fields?: {
    heading?: Field<string>;
    introduction?: Field<string>;
    items?: PublicCard[];
    actionLink: LinkField;
  };
};
