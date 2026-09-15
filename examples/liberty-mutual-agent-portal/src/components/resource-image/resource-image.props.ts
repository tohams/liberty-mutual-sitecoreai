import type { Field, FieldMetadata, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

export interface ResourceImageProps extends ComponentProps {
  fields?: {
    image?: ImageField & FieldMetadata;
    caption?: Field<string>;
  };
}
