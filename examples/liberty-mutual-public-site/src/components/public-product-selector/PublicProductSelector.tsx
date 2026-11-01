"use client";

import { Suspense, useId, useRef, useState, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Image,
  Link,
  RichText,
  Text,
  useSitecore,
} from "@sitecore-content-sdk/nextjs";
import {
  PRODUCT_KEYS,
  contextualInternalHref,
  productContextKey,
  productKeys,
  publicContext,
  type ProductKey,
} from "src/features/insurance/public-context";
import { recordPublicEvent } from "src/features/analytics/public-analytics";
import type { PublicProductSelectorProps } from "./public-product-selector.props";

type SelectorStyle = "default" | "quote" | "compact";
const SelectorBoundary = (
  props: PublicProductSelectorProps & { style: SelectorStyle },
) => (
  <Suspense fallback={<div className="public-section" aria-busy="true" />}>
    <Selector {...props} />
  </Suspense>
);
export const Default = (props: PublicProductSelectorProps) => (
  <SelectorBoundary {...props} style="default" />
);
export const Quote = (props: PublicProductSelectorProps) => (
  <SelectorBoundary {...props} style="quote" />
);
export const Compact = (props: PublicProductSelectorProps) => (
  <SelectorBoundary {...props} style="compact" />
);

function Selector({
  fields,
  params,
  rendering,
  style,
}: PublicProductSelectorProps & { style: SelectorStyle }) {
  const { page } = useSitecore();
  const router = useRouter();
  const query = useSearchParams();
  const incoming = publicContext(query);
  const [selected, setSelected] = useState<ProductKey[]>(() =>
    incoming.products.length
      ? incoming.products
      : productKeys(fields?.defaultProducts?.value),
  );
  const [zip, setZip] = useState(incoming.zip);
  const zipId = useId();
  const form = useRef<HTMLFormElement>(null);
  if (!fields) return null;
  const options = Array.isArray(fields.products)
    ? fields.products.filter((item) =>
        PRODUCT_KEYS.includes(item.fields.productKey?.value as ProductKey),
      )
    : [];
  const choose = (key: ProductKey, checked: boolean) => {
    if (!page.mode.isNormal) return;
    setSelected((current) => {
      if (!checked) return current.filter((part) => part !== key);
      if (!["auto", "home", "renters", "condo"].includes(key)) return [key];
      return productKeys(
        [
          ...current.filter((part) =>
            key === "auto"
              ? ["home", "renters", "condo"].includes(part)
              : part === "auto",
          ),
          key,
        ].join(","),
      );
    });
  };
  const navigate = (event: MouseEvent<HTMLAnchorElement>, quote: boolean) => {
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
    if (quote && (!selected.length || !form.current?.reportValidity())) {
      event.preventDefault();
      return;
    }
    const context = {
      ...incoming,
      products: selected,
      zip: /^\d{5}$/.test(zip) ? zip : "",
      source:
        incoming.source ||
        window.location.pathname.split("/").filter(Boolean).at(-1) ||
        "home",
    };
    const destination = contextualInternalHref(
      event.currentTarget.href,
      window.location.origin,
      context,
    );
    if (!destination) return;
    event.preventDefault();
    if (quote)
      void recordPublicEvent("QUOTE_INTEREST", {
        product: productContextKey(selected),
        state: context.state,
        source: context.source,
      });
    router.push(destination);
  };
  return (
    <section
      className={`component public-product-selector public-product-selector--${style} ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      data-content-id={rendering.dataSource}
    >
      <div className="public-container">
        {style !== "quote" && (
          <div className="public-product-selector__intro">
            <Text tag="h2" field={fields.heading} />
            <RichText className="public-prose" field={fields.introduction} />
          </div>
        )}
        {style !== "compact" && (
          <fieldset className="public-product-selector__options">
            <legend className="sr-only">Choose insurance products</legend>
            {options.map((option) => {
              const key = option.fields.productKey?.value as ProductKey;
              return (
                <label
                  className="public-product-option"
                  data-selected={selected.includes(key)}
                  key={option.id}
                >
                  <input
                    className="sr-only"
                    type="checkbox"
                    checked={selected.includes(key)}
                    onChange={(event) => choose(key, event.target.checked)}
                  />
                  <Image
                    className="public-product-option__image"
                    field={option.fields.image}
                  />
                  <Text
                    tag="span"
                    className="public-product-option__label"
                    field={option.fields.label}
                  />
                  <span
                    className="public-product-option__check"
                    aria-hidden="true"
                  >
                    {selected.includes(key) ? "✓" : "+"}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
        <form
          ref={form}
          className="public-product-selector__next"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="public-zip-field" htmlFor={zipId}>
            <Text tag="span" field={fields.postcodeLabel} />
            <input
              id={zipId}
              name="zip"
              value={zip}
              onChange={(event) =>
                setZip(event.target.value.replace(/[^0-9]/g, ""))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  form.current
                    ?.querySelector<HTMLAnchorElement>("[data-quote-action]")
                    ?.click();
                }
              }}
              placeholder=" "
              inputMode="numeric"
              autoComplete="postal-code"
              pattern="[0-9]{5}"
              maxLength={5}
              required
            />
          </label>
          <Link
            className="public-button"
            field={fields.actionLink}
            aria-disabled={!selected.length}
            data-quote-action="true"
            prefetch={false}
            onClick={(event) => navigate(event, true)}
          />
        </form>
        <div className="public-product-selector__agent">
          <Link
            className="public-text-link"
            field={fields.agentLink}
            prefetch={false}
            onClick={(event) => navigate(event, false)}
          />
        </div>
      </div>
    </section>
  );
}
