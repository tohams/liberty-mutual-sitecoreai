'use client';

import { Image, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { ResourceImageProps } from './resource-image.props';

/** Native image editing preserves the Modern Media public link and its parameters. */
export function Default({ fields, params }: ResourceImageProps) {
  const { page } = useSitecore();
  if (!fields) {
    return page.mode.isEditing ? <p className="cms-empty">Select a Resource Image content item.</p> : null;
  }
  const image = fields.image;
  const hasImage = typeof image?.value?.src === 'string' && image.value.src.trim().length > 0;
  if (!hasImage && !page.mode.isEditing) return null;

  return (
    <figure
      id={params?.RenderingIdentifier || undefined}
      className={['cms-resource-image', params?.styles].filter(Boolean).join(' ')}
    >
      {/* Modern Media URLs must not pass through the legacy media parameter transformer. */}
      <Image
        field={image}
        alt={typeof image?.value?.alt === 'string' ? image.value.alt : ''}
        className="cms-resource-image-media"
        decoding="async"
      />
      {(fields.caption?.value || page.mode.isEditing) && (
        <Text field={fields.caption} tag="figcaption" className="cms-resource-image-caption" />
      )}
    </figure>
  );
}
