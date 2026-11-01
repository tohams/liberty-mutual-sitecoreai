"use client";

import { Suspense, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Link,
  RichText,
  Text,
  useSitecore,
} from "@sitecore-content-sdk/nextjs";
import {
  contextualInternalHref,
  productContextKey,
  publicContext,
  STATE_NAMES,
} from "src/features/insurance/public-context";
import { recordPublicEvent } from "src/features/analytics/public-analytics";
import type { PublicQuoteHandoffProps } from "./public-quote-handoff.props";

export const Default = (props: PublicQuoteHandoffProps) => (
  <Suspense fallback={<div className="public-section" aria-busy="true" />}>
    <Handoff {...props} />
  </Suspense>
);
export const Agent = (props: PublicQuoteHandoffProps) => (
  <Suspense fallback={<div className="public-section" aria-busy="true" />}>
    <Handoff {...props} agent />
  </Suspense>
);

function Handoff({
  fields,
  params,
  rendering,
  agent = false,
}: PublicQuoteHandoffProps & { agent?: boolean }) {
  const { page } = useSitecore();
  const query = useSearchParams();
  const router = useRouter();
  const context = publicContext(query);
  if (!fields) return null;
  const key = productContextKey(context.products);
  const products = Array.isArray(fields.products) ? fields.products : [];
  const selected = products.find(
    (product) => product.fields.productKey?.value === key,
  );
  const navigateAgent = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      !page.mode.isNormal ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.hasAttribute("download") ||
      (event.currentTarget.target && event.currentTarget.target !== "_self")
    )
      return;
    const destination = contextualInternalHref(
      event.currentTarget.href,
      window.location.origin,
      context,
    );
    if (destination) {
      event.preventDefault();
      router.push(destination);
    }
  };
  return (
    <section
      className={`component public-section public-handoff ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <div className="public-container public-handoff__panel">
        <div>
          <Text tag="h2" field={fields.heading} />
          <RichText className="public-prose" field={fields.introduction} />
        </div>
        {(selected || context.state || context.question || context.zip) && (
          <div className="public-handoff__summary">
            {selected && (
              <div>
                <span className="public-handoff__label">Products</span>
                <Text tag="p" field={selected.fields.label} />
              </div>
            )}
            {context.state && (
              <div>
                <span className="public-handoff__label">State</span>
                <p>{STATE_NAMES[context.state]}</p>
              </div>
            )}
            {context.zip && (
              <div>
                <span className="public-handoff__label">ZIP Code</span>
                <p>{context.zip}</p>
              </div>
            )}
            {context.question && (
              <div className="public-handoff__question">
                <span className="public-handoff__label">Your question</span>
                <p>{context.question}</p>
              </div>
            )}
          </div>
        )}
        <div className="public-actions">
          {!agent && selected && (
            <Link
              className="public-button"
              field={selected.fields.quoteLink}
              prefetch={false}
              onClick={() => {
                if (page.mode.isNormal)
                  void recordPublicEvent("QUOTE_HANDOFF", {
                    product: key,
                    state: context.state,
                    source: context.source,
                  });
              }}
            />
          )}
          <Link
            className={agent ? "public-button" : "public-text-link"}
            field={fields.agentLink}
            prefetch={false}
            onClick={navigateAgent}
          />
        </div>
      </div>
    </section>
  );
}
