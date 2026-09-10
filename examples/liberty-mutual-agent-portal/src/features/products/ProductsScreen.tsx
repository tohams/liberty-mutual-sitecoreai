"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PortalIcon, type IconName } from "@/components/ui/portal-icon";
import { PortalDialog } from "@/components/ui/portal-dialog";
import type { BusinessLine, StateCode } from "@/contracts/portal";
import { lineNames, stateNames, usePortal } from "../portal/portal-context";
import { SubmissionForm } from "../submissions/SubmissionForm";
import { productHref } from "../portal/content-routes";

const lineIcons: Record<BusinessLine, IconName> = {
  personal: "home",
  "small-commercial": "briefcase",
  commercial: "building",
  specialty: "shield",
  surety: "file",
};

export function ProductsScreen() {
  const { data } = usePortal();
  const router = useRouter();
  const [line, setLine] = useState("all");
  const [state, setState] = useState<StateCode>(data.agent.state);
  const [intakeId, setIntakeId] = useState("");
  const visible = data.products.filter(
    (product) =>
      (line === "all" || product.line === line) &&
      product.states.includes(state),
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
              onChange={(event) => setState(event.target.value as StateCode)}
            >
              {Object.entries(stateNames).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <section className="products-hero">
        <div>
          <span className="eyebrow">LOCAL KNOWLEDGE. BROAD POSSIBILITIES.</span>
          <h2>
            Protection built around
            <br />
            the business you know.
          </h2>
          <p>
            From the first home to a growing enterprise, explore guidance,
            prepare your account, and connect with a specialist.
          </p>
        </div>
        <div className="products-hero-art" aria-hidden="true">
          <PortalIcon name="building" width="78" height="78" />
          <PortalIcon name="home" width="61" height="61" />
          <span className="product-art-sun" />
        </div>
      </section>
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
          <strong>{visible.length}</strong> solutions to explore
        </p>
        <span>
          <PortalIcon name="pin" width="14" />
          Product preparation for {stateNames[state]}
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
                href={productHref(product, data.agency.channel)}
              >
                Explore coverage
                <PortalIcon name="arrow" width="17" />
              </Link>
              {product.line !== "surety" &&
                data.agent.licensedStates.includes(state) &&
                data.agency.appointedLines.includes(product.line) &&
                (data.agent.role === "principal" ||
                  data.agent.specializations.includes(product.line)) && (
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
          initialState={state}
          key={`${intakeId}:${state}`}
          onSaved={(id) => router.push(`/quote?submission=${id}`)}
        />
      </PortalDialog>
    </>
  );
}
