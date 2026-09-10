"use client";

import { useState, type FormEvent } from "react";
import type { StateCode, Submission } from "@/contracts/portal";
import { PortalIcon } from "@/components/ui/portal-icon";
import { stateNames, usePortal } from "../portal/portal-context";

export function SubmissionForm({
  submission,
  productId,
  onSaved,
}: {
  submission?: Submission;
  productId?: string;
  onSaved: (id: string) => void;
}) {
  const { data, act, busy } = usePortal();
  const products = data.products.filter(
    (product) =>
      product.line !== "surety" &&
      data.agency.appointedLines.includes(product.line) &&
      (data.agent.role === "principal" ||
        data.agent.specializations.includes(product.line)),
  );
  const [selectedProduct, setSelectedProduct] = useState(
    submission?.productId || productId || products[0]?.id || "",
  );
  const product = products.find((item) => item.id === selectedProduct);
  const isPersonal = product?.line === "personal";
  const [step, setStep] = useState(1);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await act(
      {
        type: "save-submission",
        submissionId: submission?.id,
        accountName: String(form.get("accountName")),
        productId: selectedProduct,
        state: String(form.get("state")) as StateCode,
        industry: String(form.get("industry")),
        effectiveDate: String(form.get("effectiveDate")),
        employeeCount: Number(form.get("employeeCount")),
        annualRevenueCents: Math.round(Number(form.get("annualRevenue")) * 100),
        notes: String(form.get("notes") || ""),
      },
      "Your submission draft is saved.",
    );
    if (result) {
      const saved = submission
        ? result.submissions.find((item) => item.id === submission.id)
        : result.submissions.find(
            (item) =>
              !data.submissions.some((existing) => existing.id === item.id),
          );
      if (saved) onSaved(saved.id);
    }
  }
  if (!products.length)
    return (
      <div className="empty-state">
        <h3>Let&apos;s connect you with the right team.</h3>
        <p>
          Your current agency appointments do not include this transaction.
          Contact your relationship team to explore your next opportunity.
        </p>
      </div>
    );
  return (
    <>
      <div className="step-indicator">
        <span className={step === 1 ? "current" : "complete"}>
          <b>{step > 1 ? "✓" : "1"}</b> Coverage & fit
        </span>
        <i />
        <span className={step === 2 ? "current" : ""}>
          <b>2</b> Account information
        </span>
        <i />
        <span>
          <b>3</b> Review & submit
        </span>
      </div>
      <form className="portal-form" onSubmit={submit}>
        <div hidden={step !== 1}>
          <div className="form-grid">
            <label className="full-width">
              What coverage does your client need?
              <select
                name="productId"
                value={selectedProduct}
                onChange={(event) => setSelectedProduct(event.target.value)}
              >
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Risk state
              <select
                name="state"
                defaultValue={submission?.state || data.agent.state}
              >
                {data.agent.licensedStates.map((state) => (
                  <option key={state} value={state}>
                    {stateNames[state]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {isPersonal ? "Account type" : "Business type"}
              <select
                name="industry"
                defaultValue={submission?.industry || product?.industries[0]}
                key={selectedProduct}
              >
                {product?.industries.map((industry) => (
                  <option key={industry}>{industry}</option>
                ))}
              </select>
            </label>
          </div>
          {product && (
            <div className="guidance-box">
              <span className="round-icon">
                <PortalIcon name="shield" />
              </span>
              <div>
                <h3>A good start is a prepared submission.</h3>
                <p>{product.description}</p>
                <ul>
                  {product.requirements.slice(0, 3).map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => setStep(2)}
            >
              Continue to account information
              <PortalIcon name="arrow" width="16" />
            </button>
          </div>
        </div>
        <div hidden={step !== 2}>
          <div className="form-grid">
            <label className="full-width">
              Named insured / account name
              <input
                name="accountName"
                defaultValue={submission?.accountName}
                placeholder="Business or client legal name"
                required={step === 2}
                maxLength={120}
              />
            </label>
            <label>
              Requested effective date
              <input
                name="effectiveDate"
                type="date"
                defaultValue={
                  submission?.effectiveDate || data.asOfDate.slice(0, 10)
                }
                required={step === 2}
              />
            </label>
            <label>
              {isPersonal ? "Household information" : "Number of employees"}
              <input
                name="employeeCount"
                type={isPersonal ? "hidden" : "number"}
                min="0"
                max="100000"
                defaultValue={isPersonal ? 0 : submission?.employeeCount || 1}
                key={`${selectedProduct}-employees`}
                required={!isPersonal && step === 2}
              />
              {isPersonal && (
                <span className="form-note">
                  Include relevant household changes in your account notes.
                </span>
              )}
            </label>
            <label hidden={isPersonal}>
              Annual revenue ($)
              <input
                name="annualRevenue"
                type={isPersonal ? "hidden" : "number"}
                min="0"
                max="10000000000"
                defaultValue={
                  isPersonal
                    ? 0
                    : submission
                      ? submission.annualRevenueCents / 100
                      : ""
                }
                key={`${selectedProduct}-revenue`}
                placeholder="500000"
                required={!isPersonal && step === 2}
              />
            </label>
            <label className="full-width">
              Account notes
              <textarea
                name="notes"
                defaultValue={submission?.notes}
                placeholder={
                  isPersonal
                    ? "Tell us about the household, property, vehicles, or coverage needs."
                    : "Tell us about operations, locations, or coverage needs."
                }
                maxLength={2000}
              />
            </label>
          </div>
          <p className="form-note">
            Saving creates a draft. You&apos;ll review the requirements before
            submitting your account for consideration. Coverage is not bound by
            submitting this request.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="button button-primary"
            >
              {busy ? "Saving…" : "Save & review requirements"}
              <PortalIcon name="arrow" width="16" />
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
