import type { Field, LinkField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "@/lib/component-props";

export interface CampaignProps extends ComponentProps {
  fields?: {
    eyebrow?: Field<string>;
    title?: Field<string>;
    summary?: Field<string>;
    icon?: Field<string>;
    body?: Field<string>;
    actionLink?: LinkField;
    startsAt?: Field<string>;
    endsAt?: Field<string>;
    link1?: LinkField;
    link2?: LinkField;
    link3?: LinkField;
    buttonLabel?: Field<string>;
  };
}
