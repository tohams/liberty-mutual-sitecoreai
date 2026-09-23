"use client";

import { useState, type ReactNode } from "react";
import { Image } from "@sitecore-content-sdk/nextjs";
import { PortalLink as Link } from "@/components/ui/portal-link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PortalIcon, type IconName } from "@/components/ui/portal-icon";
import { PortalDialog } from "@/components/ui/portal-dialog";
import type { BusinessLine, ProductCatalogPage } from "@/contracts/portal";
import { lineNames, stateNames, usePortal } from "../portal/portal-context";
import { SubmissionForm } from "../submissions/SubmissionForm";
import {
  initialRiskState,
  readRiskState,
  withRiskState,
} from "../portal/risk-state-navigation";
import { productPagesForState } from "./product-catalog";
import { ProductSpotlightFallback } from "./product-spotlight-view";

const lineIcons: Record<BusinessLine, IconName> = {
  personal: "home",
  "small-commercial": "briefcase",
  commercial: "building",
  specialty: "shield",
  surety: "file",
};

export function ProductsScreen({
  spotlight,
  catalog,
}: {
  spotlight?: ReactNode;
  catalog?: ProductCatalogPage[] | null;
}) {
  const { data, busy } = usePortal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [line, setLine] = useState<BusinessLine | "all">("all");
  const queryState = searchParams.get("state");
  const state = initialRiskState({
    queryState,
    homeState: data.agent.state,
    licensedStates: data.agent.licensedStates,
  });
  const [intake, setIntake] = useState<{
    productId: string;
    state: string;
  } | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const visible = productPagesForState(catalog ?? [], data, state, line);
  const activeIntake =
    intake?.state === state &&
    visible.some(({ eligibleProducts }) =>
      eligibleProducts.some((product) => product.id === intake.productId),
    )
      ? intake.productId
      : "";
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="breadcrumb">A SOLUTION FOR WHAT&apos;S NEXT</div>
          <h1>Products & appetite</h1>
          <p>Bring your clients&apos; ambitions. Find a way forward.</p>
        </div>
        <div className="heading-actions">
          <label className="inline-label">
            <PortalIcon name="pin" width="16" />
            Risk state
            <select
              value={state}
              onChange={(event) => {
                const nextState = readRiskState(
                  event.target.value,
                  data.agent.licensedStates,
                );
                if (nextState) {
                  setIntake(null);
                  router.replace(
                    withRiskState(`${pathname}?${searchParams}`, nextState),
                    { scroll: false },
                  );
                }
              }}
            >
              {!state && <option value="">Choose a licensed state</option>}
              {data.agent.licensedStates.map((code) => (
                <option key={code} value={code}>
                  {stateNames[code]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {!state && (
        <p className="note-box" role="status">
          {data.agent.licensedStates.length
            ? "The requested state is not available for your license. Choose a licensed state to continue."
            : "No licensed states are available. Contact your relationship team to review your access."}
        </p>
      )}
      <div className="cms-component-stack">
        {spotlight ?? <ProductSpotlightFallback />}
      </div>
      <div
        className="catalog-filter"
        aria-label="Filter products by business line"
      >
        <button
          className={line === "all" ? "active" : ""}
          onClick={() => {
            setIntake(null);
            setLine("all");
          }}
          aria-pressed={line === "all"}
        >
          All solutions
        </button>
        {Object.entries(lineNames).map(([key, name]) => (
          <button
            key={key}
            className={line === key ? "active" : ""}
            onClick={() => {
              setIntake(null);
              setLine(key as BusinessLine);
            }}
            aria-pressed={line === key}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="catalog-summary">
        <p>
          <strong>{visible.length}</strong>{" "}
          {visible.length === 1 ? "solution" : "solutions"} to explore
        </p>
        <span>
          <PortalIcon name="pin" width="14" />
          {state
            ? `Product preparation for ${stateNames[state]}`
            : "Choose a risk state"}
        </span>
      </div>
      {catalog == null ? (
        <p className="note-box" role="status">
          Product pages are temporarily unavailable. Please try again shortly.
        </p>
      ) : state && visible.length === 0 ? (
        <p className="note-box" role="status">
          No product pages are available for this state and business line.
        </p>
      ) : null}
      <div className="product-grid">
        {visible.map(({ page, products, eligibleProducts }) => {
          const lines = [...new Set(products.map((product) => product.line))];
          const selectedProduct =
            eligibleProducts.length === 1
              ? eligibleProducts[0]
              : eligibleProducts.find(
                  (product) => product.id === selections[page.id],
                );
          return (
            <article className="product-card" key={page.id}>
              {page.image && (
                <Image
                  field={{ value: page.image }}
                  alt={page.image.alt}
                  className="product-card-image"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <header>
                {!page.image && (
                  <span className={`product-icon product-icon-${lines[0]}`}>
                    <PortalIcon
                      name={lineIcons[lines[0]]}
                      width="28"
                      height="28"
                    />
                  </span>
                )}
                <span className="eyebrow">
                  {lines.map((value) => lineNames[value]).join(" · ")}
                </span>
              </header>
              <h2>{page.title}</h2>
              <p>{page.summary}</p>
              <ul aria-label="Products available in this state">
                {products.map((product) => (
                  <li key={product.id}>
                    <PortalIcon name="check" width="13" />
                    {product.name}
                  </li>
                ))}
              </ul>
              <footer>
                <Link
                  className="text-link"
                  href={withRiskState(page.href, state || undefined)}
                >
                  Explore coverage
                  <PortalIcon name="arrow" width="17" />
                </Link>
                {eligibleProducts.length > 1 && (
                  <label className="product-preparation-picker">
                    Product to prepare
                    <select
                      value={selectedProduct?.id ?? ""}
                      onChange={(event) =>
                        setSelections({
                          ...selections,
                          [page.id]: event.target.value,
                        })
                      }
                      disabled={busy}
                    >
                      <option value="">Choose a product</option>
                      {eligibleProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {eligibleProducts.length > 0 && (
                  <button
                    type="button"
                    className="product-availability borderless"
                    disabled={busy || !selectedProduct}
                    aria-label={
                      selectedProduct
                        ? `Prepare account for ${selectedProduct.name}`
                        : `Prepare account from ${page.title}`
                    }
                    onClick={() => {
                      if (selectedProduct && state)
                        setIntake({ productId: selectedProduct.id, state });
                    }}
                  >
                    Prepare account
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </div>
      <div className="source-note">
        <PortalIcon name="info" width="15" />
        <p>
          Product overviews are a starting point. Coverage, eligibility, and
          terms depend on the account, state, applicable forms, and underwriting
          review.
        </p>
      </div>
      <PortalDialog
        title="Prepare your submission"
        eyebrow="FROM OPPORTUNITY TO ACTION"
        open={!!activeIntake}
        onClose={() => setIntake(null)}
        wide
      >
        {activeIntake && (
          <SubmissionForm
            productId={activeIntake}
            initialState={state || undefined}
            key={`${activeIntake}:${state}`}
            onSaved={(id, savedState) =>
              router.push(withRiskState(`/quote?submission=${id}`, savedState))
            }
          />
        )}
      </PortalDialog>
    </>
  );
}
