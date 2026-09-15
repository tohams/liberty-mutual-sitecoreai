import { HIDDEN_RENDERING_NAME } from '@sitecore-content-sdk/content';
import type { ComponentRendering } from '@sitecore-content-sdk/nextjs';

export const RESOURCE_IMAGE_PLACEHOLDER = 'headless-resource-image';

/** Keep the nested image slot scoped to its native article instance. */
export function getResourceImagePlaceholder(rendering: ComponentRendering, isEditing: boolean) {
  const contents = (rendering.placeholders?.[RESOURCE_IMAGE_PLACEHOLDER] ?? []).filter(
    component => component.componentName === 'ResourceImage' ||
      (isEditing && component.componentName === HIDDEN_RENDERING_NAME),
  );
  if (!isEditing && contents.length === 0) return undefined;
  return {
    name: RESOURCE_IMAGE_PLACEHOLDER,
    rendering: {
      ...rendering,
      // An explicit empty key lets Page Builder emit the native insertion chrome.
      placeholders: { [RESOURCE_IMAGE_PLACEHOLDER]: contents },
    },
  };
}
