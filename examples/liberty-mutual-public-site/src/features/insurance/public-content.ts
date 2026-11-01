import type {
  Field,
  ImageField,
  LinkField,
} from "@sitecore-content-sdk/nextjs";

export type PublicLinkItem = {
  id: string;
  fields: { link: LinkField; icon?: Field<string> };
};
export type PublicNavigationGroup = {
  id: string;
  fields: { label?: Field<string>; links?: PublicLinkItem[] };
};
export type PublicFooterColumn = {
  id: string;
  fields: {
    heading?: Field<string>;
    body?: Field<string>;
    links?: PublicLinkItem[];
  };
};
export type PublicCard = {
  id: string;
  fields: {
    value?: Field<string>;
    heading?: Field<string>;
    body?: Field<string>;
    image?: ImageField;
    actionLink: LinkField;
  };
};
