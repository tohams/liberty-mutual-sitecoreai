import type {
  Field,
  ImageField,
  LinkField,
} from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
import type {
  PublicFooterColumn,
  PublicLinkItem,
} from "src/features/insurance/public-content";
export type PublicFooterProps = ComponentProps & {
  fields?: {
    logo?: ImageField;
    mobileLogo?: ImageField;
    body?: Field<string>;
    contactLink: LinkField;
    privacyLink: LinkField;
    termsLink: LinkField;
    columns?: PublicFooterColumn[];
    socialLinks?: PublicLinkItem[];
    legalLinks?: PublicLinkItem[];
    disclaimer?: Field<string>;
  };
};
