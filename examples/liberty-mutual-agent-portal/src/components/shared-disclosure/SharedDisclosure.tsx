"use client";

import { useId } from "react";
import { isFieldValueEmpty } from "@sitecore-content-sdk/content/layout";
import {
  DateField,
  RichText,
  Text,
  useSitecore,
} from "@sitecore-content-sdk/nextjs";
import { PortalContentLink } from "@/components/ui/portal-link";
import type { SharedDisclosureProps } from "./shared-disclosure.props";
import styles from "./SharedDisclosure.module.css";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Both sites assign the same public-owned native item as the rendering datasource. */
export function Default({ fields, params, rendering }: SharedDisclosureProps) {
  const { page } = useSitecore();
  const headingId = useId();
  if (!fields) return null;

  return (
    <aside
      id={params?.RenderingIdentifier || undefined}
      className={[styles.disclosure, params?.styles].filter(Boolean).join(" ")}
      aria-labelledby={headingId}
      data-content-item={rendering.dataSource || undefined}
    >
      <Text field={fields.title} tag="h2" id={headingId} />
      <RichText field={fields.body} className="cms-rich-text" />
      <dl className={styles.details}>
        {(fields.owner?.value || page.mode.isEditing) && (
          <div>
            <dt>Content owner</dt>
            <dd>
              <Text field={fields.owner} />
            </dd>
          </div>
        )}
        {fields.effectiveDate &&
          (!isFieldValueEmpty(fields.effectiveDate) || page.mode.isEditing) && (
            <div>
              <dt>Effective</dt>
              <dd>
                <DateField
                  field={fields.effectiveDate}
                  render={(date) => (date ? dateFormat.format(date) : "")}
                />
              </dd>
            </div>
          )}
        {fields.reviewDate &&
          (!isFieldValueEmpty(fields.reviewDate) || page.mode.isEditing) && (
            <div>
              <dt>Reviewed</dt>
              <dd>
                <DateField
                  field={fields.reviewDate}
                  render={(date) => (date ? dateFormat.format(date) : "")}
                />
              </dd>
            </div>
          )}
      </dl>
      {fields.sourceLink &&
        (fields.sourceLink.value?.href || page.mode.isEditing) && (
          <PortalContentLink
            field={fields.sourceLink}
            className={styles.source}
          />
        )}
    </aside>
  );
}
