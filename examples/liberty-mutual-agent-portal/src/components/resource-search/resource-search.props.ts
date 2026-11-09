import type { Field } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "@/lib/component-props";

export interface ResourceSearchProps extends ComponentProps {
  fields?: { search?: Field<string> };
}

export interface ResourceSearchConfiguration {
  searchIndex: string;
  facetMapping?: Partial<
    Record<
      | "Risk state"
      | "Business family"
      | "Product"
      | "Distribution channel"
      | "Resource type",
      string
    >
  >;
  fieldsMapping: {
    title?: string;
    description?: string;
    summary?: string;
    state?: string;
    type?: string;
    resourceType?: string;
    businessFamily?: string;
  };
}
