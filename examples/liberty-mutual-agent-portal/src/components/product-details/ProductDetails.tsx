'use client';

import { Image, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { ProductDetailsProps } from './product-details.props';

/** Page fields supply both the editable detail and its published catalog card. */
export function Default({ fields, params }: ProductDetailsProps) {
  const { page } = useSitecore();
  if (!fields) {
    return page.mode.isEditing ? <p className="cms-empty">Select this Product page as the content source.</p> : null;
  }
  return (
    <article id={params?.RenderingIdentifier || undefined} className={['cms-article', params?.styles].filter(Boolean).join(' ')}>
      <p className="cms-eyebrow">Products &amp; appetite</p>
      <Text field={fields.Title} tag="h1" />
      <Text field={fields.catalogSummary} tag="p" className="cms-article-summary" />
      {(fields.catalogImage?.value?.src || page.mode.isEditing) && (
        <figure className="cms-resource-image">
          <Image field={fields.catalogImage} alt={fields.catalogImage?.value?.alt ?? ''} className="cms-resource-image-media" decoding="async" />
        </figure>
      )}
      <RichText field={fields.catalogBody} className="cms-rich-text" />
    </article>
  );
}
