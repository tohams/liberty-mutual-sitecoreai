import type { FieldMetadata, LinkField } from "@sitecore-content-sdk/nextjs";
import type { StateCode } from "@/contracts/portal";
import { withRiskState } from "@/features/portal/risk-state-navigation";

/** Carry operational context without changing Sitecore's authored field or editing markup. */
export function guidanceLinkWithRiskState(
  field: (LinkField & FieldMetadata) | undefined,
  state: StateCode | undefined,
  editing: boolean,
): (LinkField & FieldMetadata) | undefined {
  if (editing || !field?.value?.href || !state) return field;
  const pathname = field.value.href.split(/[?#]/, 1)[0];
  if (withRiskState(pathname, state) === pathname) return field;
  const href = withRiskState(field.value.href, state);
  const url = new URL(href, "https://portal.invalid");
  for (const [key, value] of new URLSearchParams(field.value.querystring))
    url.searchParams.set(key, value);
  url.searchParams.set("state", state);
  // Content SDK passes href as NextLink.pathname, so query/hash must stay separate.
  return {
    ...field,
    value: {
      ...field.value,
      href: url.pathname,
      querystring: url.searchParams.toString(),
      ...(field.value.anchor || url.hash
        ? { anchor: field.value.anchor || url.hash.slice(1) }
        : {}),
    },
  };
}
