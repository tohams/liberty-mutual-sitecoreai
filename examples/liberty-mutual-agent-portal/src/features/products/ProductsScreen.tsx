"use client";

import { useState, type ReactNode } from "react";
import { PortalLink as Link } from "@/components/ui/portal-link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PortalIcon, type IconName } from "@/components/ui/portal-icon";
import { PortalDialog } from "@/components/ui/portal-dialog";
import type { BusinessLine } from "@/contracts/portal";
import { lineNames, stateNames, usePortal } from "../portal/portal-context";
import { SubmissionForm } from "../submissions/SubmissionForm";
import { productHref } from "../portal/content-routes";
import {
  initialRiskState,
  readRiskState,
  withRiskState,
} from "../portal/risk-state-navigation";
import {
  evaluateProductAvailability,
  evaluateProductEligibility,
} from "@/domain/eligibility";
import { ProductSpotlightFallback } from "./product-spotlight-view";

const lineIcons: Record<BusinessLine, IconName> = {
  personal: "home",
  "small-commercial": "briefcase",
  commercial: "building",
  specialty: "shield",
  surety: "file",
};

export function ProductsScreen({ spotlight }: { spotlight?: ReactNode }) {
  const { data } = usePortal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [line, setLine] = useState("all");
  const queryState = searchParams.get("state");
  const state = initialRiskState({
    queryState,
    homeState: data.agent.state,
    licensedStates: data.agent.licensedStates,
  });
  const [intakeId, setIntakeId] = useState("");
  const visible = data.products.filter(
    (product) =>
      (line === "all" || product.line === line) &&
      !!state &&
      evaluateProductAvailability({
        product,
        state,
        eligibility: data.eligibility,
      }).allowed,
  );
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
                if (nextState)
                  router.replace(
                    withRiskState(`${pathname}?${searchParams}`, nextState),
                    { scroll: false },
                  );
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
          onClick={() => setLine("all")}
          aria-pressed={line === "all"}
        >
          All solutions
        </button>
        {Object.entries(lineNames).map(([key, name]) => (
          <button
            key={key}
            className={line === key ? "active" : ""}
            onClick={() => setLine(key)}
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
      <div className="product-grid">
        {visible.map((product) => (
          <article className="product-card" key={product.id}>
            <header>
              <span className={`product-icon product-icon-${product.line}`}>
                <PortalIcon
                  name={lineIcons[product.line]}
                  width="28"
                  height="28"
                />
              </span>
              <span className="eyebrow">{lineNames[product.line]}</span>
            </header>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <ul>
              {product.highlights.slice(0, 2).map((highlight) => (
                <li key={highlight}>
                  <PortalIcon name="check" width="13" />
                  {highlight}
                </li>
              ))}
            </ul>
            <footer>
              <Link
                className="text-link"
                href={withRiskState(
                  productHref(product, data.agency.channel),
                  state || undefined,
                )}
              >
                Explore coverage
                <PortalIcon name="arrow" width="17" />
              </Link>
              {product.line !== "surety" &&
                state &&
                evaluateProductEligibility({
                  agent: data.agent,
                  agency: data.agency,
                  product,
                  state,
                  eligibility: data.eligibility,
                }).allowed && (
                  <button
                    type="button"
                    className="product-availability borderless"
                    onClick={() => setIntakeId(product.id)}
                  >
                    Prepare account
                  </button>
                )}
            </footer>
          </article>
        ))}
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
        open={!!intakeId}
        onClose={() => setIntakeId("")}
        wide
      >
        <SubmissionForm
          productId={intakeId}
          initialState={state || undefined}
          key={`${intakeId}:${state}`}
          onSaved={(id, savedState) =>
            router.push(withRiskState(`/quote?submission=${id}`, savedState))
          }
        />
      </PortalDialog>
    </>
  );
}
