import type { Field, Item, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "lib/component-props";
import type { SharedDisclosureFields } from "../shared-disclosure/shared-disclosure.props";

export type PublicApprovedAnswerProps = ComponentProps & {
  fields?: {
    question?: Field<string>;
    canonicalUrl?: Field<string>;
    answer?: Field<string>;
    formalWording?: Field<string>;
    explanation?: Field<string>;
    sourceLink: LinkField;
    owner?: Field<string>;
    effectiveDate?: Field<string>;
    reviewDate?: Field<string>;
    state?: Field<string>;
    product?: Field<string>;
    audience?: Field<string>;
    nextStep: LinkField;
    disclosure?: Item & { fields?: SharedDisclosureFields };
  };
};
