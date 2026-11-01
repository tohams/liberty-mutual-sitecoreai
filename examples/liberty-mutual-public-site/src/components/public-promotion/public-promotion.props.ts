import type {
  Field,
  ImageField,
  Item,
  LinkField,
} from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
import type { SharedDisclosureFields } from "../shared-disclosure/shared-disclosure.props";

export type PublicPromotionProps = ComponentProps & {
  fields?: {
    eyebrow?: Field<string>;
    headline?: Field<string>;
    body?: Field<string>;
    image?: ImageField;
    actionLink: LinkField;
    disclosure?: Item & { fields?: SharedDisclosureFields };
  };
};
