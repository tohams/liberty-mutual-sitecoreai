"use client";

import { useState, type FormEvent } from "react";
import type { StateCode, Submission } from "@/contracts/portal";
import { PortalIcon } from "@/components/ui/portal-icon";
import { stateNames, usePortal } from "../portal/portal-context";
import {
  eligibleProductStates,
  evaluateProductEligibility,
} from "@/domain/eligibility";
import {
  initialRiskState,
  riskStateOptions,
} from "../portal/risk-state-navigation";

export function SubmissionForm({
  submission,
  productId,
  initialState,
  queryState,
  onSaved,
}: {
  submission?: Submission;
  productId?: string;
  initialState?: StateCode;
  queryState?: string | null;
  onSaved: (id: string, state: StateCode) => void;
}) {
  const { data, act, busy, notify } = usePortal();
  const products = data.products.filter(
    (product) =>
      product.line !== "surety" &&
      eligibleProductStates({
        agent: data.agent,
        agency: data.agency,
        product,
        eligibility: data.eligibility,
      }).length > 0,
  );
  const [selectedProduct, setSelectedProduct] = useState(
    submission?.productId || productId || products[0]?.id || "",
  );
  const product = data.products.find((item) => item.id === selectedProduct);
  const productOptions =
    product && !products.some((item) => item.id === product.id)
      ? [product, ...products]
      : products;
  const [selectedState, setSelectedState] = useState<StateCode | "">(() =>
    initialRiskState({
      savedState: submission?.state,
      queryState: queryState ?? initialState,
      homeState: data.agent.state,
      licensedStates: data.agent.licensedStates,
    }),
  );
  const [effectiveDate, setEffectiveDate] = useState(
    submission?.effectiveDate || data.asOfDate.slice(0, 10),
  );
  const [industry, setIndustry] = useState(submission?.industry || "");
  const decision =
    product && selectedState
      ? evaluateProductEligibility({
          agent: data.agent,
          agency: data.agency,
          product,
          state: selectedState,
          eligibility: data.eligibility,
          effectiveDate,
        })
      : {
          allowed: false,
          reason: "Choose an available product and licensed risk state.",
          requirements: [],
          industries: [],
        };
  const existingDecision = submission
    ? data.actionEligibility.submissions[submission.id]
    : undefined;
  const recordBlocked = !!submission && !existingDecision?.allowed;
  const blockReason = recordBlocked
    ? existingDecision?.reason ||
      "This saved submission is available to view, but you cannot change it. Contact your relationship team."
    : !decision.allowed
      ? decision.reason
      : undefined;
  const availableStates = product
    ? eligibleProductStates({
        agent: data.agent,
        agency: data.agency,
        product,
        eligibility: data.eligibility,
        effectiveDate,
      })
    : [];
  const industries = decision.industries;
  const canContinue = !blockReason && industries.includes(industry);
  const isPersonal = product?.line === "personal";
  const [step, setStep] = useState(1);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue || !selectedState || busy) return;
    const form = new FormData(event.currentTarget);
    const submittedDate = String(form.get("effectiveDate"));
    const submittedDecision =
      product &&
      evaluateProductEligibility({
        agent: data.agent,
        agency: data.agency,
        product,
        state: selectedState,
        eligibility: data.eligibility,
        effectiveDate: submittedDate,
      });
    if (!submittedDecision?.allowed) {
      notify(
        submittedDecision?.reason ||
          "Review the selected product and effective date.",
      );
      return;
    }
    const result = await act(
      {
        type: "save-submission",
        submissionId: submission?.id,
        accountName: String(form.get("accountName")),
        productId: selectedProduct,
        state: selectedState,
        industry,
        effectiveDate: submittedDate,
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
      if (saved) onSaved(saved.id, saved.state);
    }
  }
  if (!products.length && !submission)
    return (
      <div className="empty-state">
        <h3>Let&apos;s connect you with the right team.</h3>
        <p>
          No products are currently available for your licenses and agency
          appointments. Contact your relationship team to explore your next
          opportunity.
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
        {blockReason && (
          <p className="note-box" role="status">
            {blockReason}{" "}
            {submission && "The saved risk state has not been changed."}
          </p>
        )}
        <div hidden={step !== 1}>
          <div className="form-grid">
            <label className="full-width">
              What coverage does your client need?
              <select
                name="productId"
                value={selectedProduct}
                onChange={(event) => setSelectedProduct(event.target.value)}
              >
                {productOptions.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={!products.some((entry) => entry.id === item.id)}
                  >
                    {item.name}
                    {!products.some((entry) => entry.id === item.id)
                      ? " — unavailable"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Risk state
              <select
                name="state"
                value={selectedState}
                onChange={(event) =>
                  setSelectedState(event.target.value as StateCode)
                }
                required
              >
                {!selectedState && (
                  <option value="">Choose a licensed state</option>
                )}
                {riskStateOptions(availableStates, selectedState).map(
                  ({ state, available }) => (
                    <option key={state} value={state} disabled={!available}>
                      {stateNames[state]}
                      {!available ? " — unavailable for this submission" : ""}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              {isPersonal ? "Account type" : "Business type"}
              <select
                name="industry"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                required
              >
                {!industry && <option value="">Choose an account type</option>}
                {industry && !industries.includes(industry) && (
                  <option value={industry} disabled>
                    {industry} — review for selected state
                  </option>
                )}
                {industries.map((option) => (
                  <option key={option}>{option}</option>
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
                  {decision.requirements.slice(0, 3).map((requirement) => (
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
              disabled={!canContinue || busy}
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
                value={effectiveDate}
                onInput={(event) => setEffectiveDate(event.currentTarget.value)}
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
          {submission &&
            (selectedState !== submission.state ||
              selectedProduct !== submission.productId) && (
              <p className="form-note">
                Changing the risk state or product will require a fresh review
                of the applicable submission checklist.
              </p>
            )}
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
              disabled={busy || !canContinue}
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
