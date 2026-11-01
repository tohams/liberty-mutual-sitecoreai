"use client";

import { useId } from "react";
import {
  Image,
  RichText,
  Text,
  useSitecore,
} from "@sitecore-content-sdk/nextjs";
import { PortalContentLink } from "@/components/ui/portal-link";
import type { AgencyPrioritiesProps } from "./agency-priorities.props";
import { orderedRecommendations } from "@/features/agency-priorities/ordered-recommendations";
import styles from "./AgencyPriorities.module.css";

/** Content, order, and audience variants come from native Sitecore datasource items. */
export function Default({ fields, params, rendering }: AgencyPrioritiesProps) {
  const { page } = useSitecore();
  const headingId = useId();
  const recommendations = orderedRecommendations(fields?.Recommendations);
  if (!fields) return null;

  return (
    <section
      id={params?.RenderingIdentifier || undefined}
      className={[styles.priorities, params?.styles].filter(Boolean).join(" ")}
      aria-labelledby={headingId}
      data-content-item={rendering.dataSource || undefined}
    >
      <header className={styles.header}>
        <Text field={fields.Heading} tag="h2" id={headingId} />
        <RichText field={fields.Intro} className="cms-rich-text" />
      </header>
      {recommendations.length > 0 && (
        <ol className={styles.cards}>
          {recommendations.map((item, index) => (
            <li
              key={`${item.id}:${index}`}
              className={styles.card}
              data-content-item={item.id}
            >
              {(item.fields.Image?.value?.src || page.mode.isEditing) && (
                <Image
                  field={item.fields.Image}
                  alt={
                    typeof item.fields.Image?.value?.alt === "string"
                      ? item.fields.Image.value.alt
                      : ""
                  }
                  className={styles.image}
                  decoding="async"
                />
              )}
              <div className={styles.copy}>
                <Text
                  field={item.fields.Eyebrow}
                  tag="p"
                  className="cms-eyebrow"
                />
                <Text field={item.fields.Heading} tag="h3" />
                <RichText field={item.fields.Body} className="cms-rich-text" />
                {item.fields.Link &&
                  (item.fields.Link.value?.href || page.mode.isEditing) && (
                    <PortalContentLink
                      field={item.fields.Link}
                      className="button button-secondary cms-action"
                    />
                  )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
