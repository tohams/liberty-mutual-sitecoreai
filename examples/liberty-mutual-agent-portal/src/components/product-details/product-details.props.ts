import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

export interface ProductDetailsProps extends ComponentProps {
  fields?: {
    Title?: Field<string>;
    catalogSummary?: Field<string>;
    catalogImage?: ImageField;
    catalogBody?: Field<string>;
  };
}
