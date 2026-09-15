import { HIDDEN_RENDERING_NAME } from '@sitecore-content-sdk/content';
import type { ComponentRendering } from '@sitecore-content-sdk/nextjs';

export const RESOURCE_IMAGE_PLACEHOLDER = 'headless-resource-image';
export const RESOURCE_IMAGE_PLACEHOLDER_PATTERN = `${RESOURCE_IMAGE_PLACEHOLDER}-{*}`;

/** Keep the nested image slot scoped to its native article instance. */
export function getResourceImagePlaceholder(rendering: ComponentRendering, isEditing: boolean) {
  const dynamicId = rendering.params?.DynamicPlaceholderId;
  // SXA supplies this parameter on the parent rendering. Never invent an instance ID.
  if (!dynamicId || !/^\d+$/.test(dynamicId)) return undefined;
  const name = `${RESOURCE_IMAGE_PLACEHOLDER}-${dynamicId}`;
  const placeholders = rendering.placeholders ?? {};
  // Layout Service may retain its wildcard key or return the resolved instance key.
  // Keep the original key so SDK metadata can identify the native editing chrome.
  const key = Object.hasOwn(placeholders, RESOURCE_IMAGE_PLACEHOLDER_PATTERN)
    ? RESOURCE_IMAGE_PLACEHOLDER_PATTERN
    : Object.hasOwn(placeholders, name)
      ? name
      : RESOURCE_IMAGE_PLACEHOLDER_PATTERN;
  const contents = (placeholders[key] ?? []).filter(
    component => component.componentName === 'ResourceImage' ||
      (isEditing && component.componentName === HIDDEN_RENDERING_NAME),
  );
  if (!isEditing && contents.length === 0) return undefined;
  return {
    name,
    rendering: {
      ...rendering,
      // An explicit empty key lets Page Builder emit the native insertion chrome.
      placeholders: { [key]: contents },
    },
  };
}
