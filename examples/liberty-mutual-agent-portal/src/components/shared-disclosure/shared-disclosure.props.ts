import type { Field, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "@/lib/component-props";

/** Shared with the public-site Disclosure template; never a portal-owned copy. */
export interface SharedDisclosureProps extends ComponentProps {
  fields?: {
    title?: Field<string>;
    body?: Field<string>;
    sourceLink?: LinkField;
    owner?: Field<string>;
    effectiveDate?: Field<string>;
    reviewDate?: Field<string>;
  };
}
