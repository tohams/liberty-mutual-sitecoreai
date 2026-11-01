import type { ImageField, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
import type { PublicNavigationGroup } from "src/features/insurance/public-content";
export type PublicHeaderProps = ComponentProps & {
  fields?: {
    logo?: ImageField;
    homeLink: LinkField;
    autoLink: LinkField;
    homeInsuranceLink: LinkField;
    bundlingLink: LinkField;
    resourcesLink: LinkField;
    contactLink: LinkField;
    quoteLink: LinkField;
    navigation?: PublicNavigationGroup[];
    searchLink: LinkField;
    loginLink: LinkField;
  };
};
