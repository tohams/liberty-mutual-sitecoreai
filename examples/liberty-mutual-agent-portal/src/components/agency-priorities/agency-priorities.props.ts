import type {
  Field,
  ImageField,
  LinkField,
} from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "@/lib/component-props";

export interface AgencyRecommendationFields {
  Heading?: Field<string>;
  Body?: Field<string>;
  Image?: ImageField;
  Link?: LinkField;
  Eyebrow?: Field<string>;
}

/** Native Treelist layout data contains referenced items in the author's order. */
export interface AgencyRecommendation {
  id: string;
  fields: AgencyRecommendationFields;
}

export interface AgencyPrioritiesProps extends ComponentProps {
  fields?: {
    Heading?: Field<string>;
    Intro?: Field<string>;
    Recommendations?: AgencyRecommendation[] | Record<string, never>;
  };
}
