import type { Field } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
import type { PublicLinkItem } from "src/features/insurance/public-content";
export type PublicBreadcrumbsProps = ComponentProps & {
  fields?: { items?: PublicLinkItem[]; currentLabel?: Field<string> };
};
