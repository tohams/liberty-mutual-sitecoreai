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
  const href = withRiskState(field.value.href, state);
  return href === field.value.href
    ? field
    : { ...field, value: { ...field.value, href } };
}
