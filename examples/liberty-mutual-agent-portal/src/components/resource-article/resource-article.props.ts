import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

export interface ResourceArticleProps extends ComponentProps {
  fields?: {
    Title?: Field<string>;
    title?: Field<string>;
    summary?: Field<string>;
    body?: Field<string>;
    resourceType?: Field<string>;
    state?: Field<string>;
    reviewedAt?: Field<string>;
    sourceLink?: LinkField;
  };
}
