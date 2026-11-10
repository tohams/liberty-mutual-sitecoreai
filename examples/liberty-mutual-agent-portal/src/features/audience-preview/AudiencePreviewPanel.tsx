"use client";

import { useId, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  FileText,
  LoaderCircle,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import type { AgentRole, StateCode } from "@/contracts/portal";
import type {
  AudiencePreviewInput,
  AudiencePreviewPanelProps,
  AudiencePreviewResult,
} from "./types";
import styles from "./AudiencePreviewPanel.module.css";

const ROLES: ReadonlyArray<{ value: AgentRole; label: string }> = [
  { value: "principal", label: "Principal" },
  { value: "producer", label: "Producer" },
  { value: "account-manager", label: "Account manager" },
  { value: "account-executive", label: "Account executive" },
  { value: "surety-specialist", label: "Surety specialist" },
  { value: "wholesale-broker", label: "Wholesale broker" },
];
const STATES: ReadonlyArray<{ value: StateCode; label: string }> = [
  { value: "TX", label: "Texas" },
  { value: "FL", label: "Florida" },
  { value: "IL", label: "Illinois" },
];
const DEFAULT_AUDIENCE: AudiencePreviewInput = {
  role: "principal",
  licensedStates: ["TX", "IL"],
  specializesInSmallCommercial: true,
  agencySmallCommercialSharePercent: 15,
  agencyTotalWrittenPremiumUsd: 1_000_000,
  agentSmallCommercialWrittenPremiumUsd: 60_000,
};

function contextKey(page: AudiencePreviewPanelProps["page"]) {
  return page
    ? JSON.stringify([page.id, page.language, page.version ?? null])
    : "";
}

function numberValue(value: number) {
  return Number.isFinite(value) ? value : "";
}

export function AudiencePreviewPanel({
  page,
  onPreview,
  initialAudience = DEFAULT_AUDIENCE,
  preparationMessage,
  disabled = false,
}: AudiencePreviewPanelProps) {
  const id = useId();
  const [audience, setAudience] =
    useState<AudiencePreviewInput>(initialAudience);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<{
    pageKey: string;
    audienceKey: string;
    result: AudiencePreviewResult;
  } | null>(null);
  const pageKey = contextKey(page);
  const audienceKey = JSON.stringify(audience);
  const result =
    completed?.pageKey === pageKey && completed.audienceKey === audienceKey
      ? completed.result
      : null;

  const change = <K extends keyof AudiencePreviewInput>(
    field: K,
    value: AudiencePreviewInput[K],
  ) => {
    setAudience((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const toggleState = (state: StateCode, selected: boolean) => {
    setAudience((current) => ({
      ...current,
      licensedStates: STATES.map((option) => option.value).filter((code) =>
        code === state ? selected : current.licensedStates.includes(code),
      ),
    }));
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!page || busy || disabled) return;
    setBusy(true);
    setError("");
    setCompleted(null);
    try {
      const generated = await onPreview(audience, page);
      setCompleted({
        pageKey,
        audienceKey,
        result: generated,
      });
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "The preview could not be opened. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <span className={styles.appIcon} aria-hidden="true">
          <UsersRound size={22} strokeWidth={1.8} />
        </span>
        <div>
          <h1 id={`${id}-title`}>Audience Preview</h1>
          <p>See your page through a different audience’s eyes.</p>
        </div>
      </header>

      <div className={styles.pageContext}>
        <FileText size={18} aria-hidden="true" />
        <div className={styles.pageIdentity}>
          <span className={styles.eyebrow}>Current page</span>
          <strong>{page?.name || "Select a page in Page Builder"}</strong>
          {page ? (
            <span className={styles.pageMeta}>
              {page.siteName} · {page.language.toUpperCase()}
              {page.version ? ` · Version ${page.version}` : ""}
            </span>
          ) : null}
        </div>
        <span className={styles.readOnly}>Read-only</span>
      </div>

      <form onSubmit={submit}>
        <fieldset disabled={busy || disabled} className={styles.audience}>
          <legend className={styles.sectionTitle}>Audience attributes</legend>

          <div className={styles.field}>
            <label htmlFor={`${id}-role`}>Role</label>
            <div className={styles.selectWrap}>
              <select
                id={`${id}-role`}
                value={audience.role}
                onChange={(event) =>
                  change("role", event.target.value as AgentRole)
                }
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          </div>

          <fieldset className={styles.states}>
            <legend>Licensed states</legend>
            <p id={`${id}-states-hint`}>Select all applicable states.</p>
            <div
              className={styles.stateOptions}
              aria-describedby={`${id}-states-hint`}
            >
              {STATES.map((state) => (
                <label key={state.value} className={styles.stateOption}>
                  <input
                    type="checkbox"
                    value={state.value}
                    checked={audience.licensedStates.includes(state.value)}
                    onChange={(event) =>
                      toggleState(state.value, event.target.checked)
                    }
                  />
                  <span>{state.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <details className={styles.businessContext}>
            <summary>
              <span>
                <SlidersHorizontal size={16} aria-hidden="true" />
                Business context
              </span>
              <ChevronDown size={17} aria-hidden="true" />
            </summary>
            <div className={styles.businessFields}>
              <label className={styles.specialization}>
                <input
                  type="checkbox"
                  checked={audience.specializesInSmallCommercial}
                  onChange={(event) =>
                    change("specializesInSmallCommercial", event.target.checked)
                  }
                />
                <span>Specializes in small commercial</span>
              </label>
              <div className={styles.field}>
                <label htmlFor={`${id}-agency-share`}>
                  Agency small-commercial share
                </label>
                <div className={styles.numberWrap}>
                  <input
                    id={`${id}-agency-share`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={numberValue(
                      audience.agencySmallCommercialSharePercent,
                    )}
                    onChange={(event) =>
                      change(
                        "agencySmallCommercialSharePercent",
                        event.target.valueAsNumber,
                      )
                    }
                    aria-describedby={`${id}-share-hint`}
                  />
                  <span aria-hidden="true">%</span>
                </div>
                <p id={`${id}-share-hint`} className={styles.fieldHint}>
                  Share of personal and small-commercial written premium.
                </p>
              </div>
              <div className={styles.field}>
                <label htmlFor={`${id}-agency-premium`}>
                  Agency written premium
                </label>
                <div className={`${styles.numberWrap} ${styles.currency}`}>
                  <span aria-hidden="true">$</span>
                  <input
                    id={`${id}-agency-premium`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="10000000000"
                    step="0.01"
                    required
                    value={numberValue(audience.agencyTotalWrittenPremiumUsd)}
                    onChange={(event) =>
                      change(
                        "agencyTotalWrittenPremiumUsd",
                        event.target.valueAsNumber,
                      )
                    }
                    aria-describedby={`${id}-agency-hint`}
                  />
                  <span aria-hidden="true">USD</span>
                </div>
                <p id={`${id}-agency-hint`} className={styles.fieldHint}>
                  Combined personal and small-commercial production.
                </p>
              </div>
              <div className={styles.field}>
                <label htmlFor={`${id}-agent-premium`}>
                  Agent small-commercial written premium
                </label>
                <div className={`${styles.numberWrap} ${styles.currency}`}>
                  <span aria-hidden="true">$</span>
                  <input
                    id={`${id}-agent-premium`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="10000000000"
                    step="0.01"
                    required
                    value={numberValue(
                      audience.agentSmallCommercialWrittenPremiumUsd,
                    )}
                    onChange={(event) =>
                      change(
                        "agentSmallCommercialWrittenPremiumUsd",
                        event.target.valueAsNumber,
                      )
                    }
                  />
                  <span aria-hidden="true">USD</span>
                </div>
              </div>
            </div>
          </details>
        </fieldset>

        {error ? (
          <div className={styles.error} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          className={styles.previewButton}
          disabled={!page || busy || disabled}
          aria-describedby={`${id}-preview-note`}
        >
          {busy ? (
            <LoaderCircle
              size={18}
              className={styles.spinner}
              aria-hidden="true"
            />
          ) : (
            <UsersRound size={18} aria-hidden="true" />
          )}
          {busy ? "Preparing preview…" : "Preview audience"}
        </button>
        <p
          id={`${id}-preview-note`}
          className={styles.previewNote}
          aria-live="polite"
          aria-atomic="true"
        >
          {busy
            ? preparationMessage ||
              "Preparing an audience for the first time can take a little longer. Keep this panel open."
            : "Previewing does not publish content or change an agent’s account."}
        </p>
      </form>

      <div aria-live="polite" aria-atomic="true">
        {result ? (
          <section className={styles.result} aria-labelledby={`${id}-result`}>
            <div className={styles.resultHeading}>
              <span className={styles.successIcon} aria-hidden="true">
                <Check size={16} strokeWidth={2.4} />
              </span>
              <h2 id={`${id}-result`}>{result.title}</h2>
            </div>
            {result.description ? <p>{result.description}</p> : null}
            {result.matchedRules.length > 0 ? (
              <dl className={styles.matches}>
                {result.matchedRules.map((match, index) => (
                  <div key={`${match.componentName}-${index}`}>
                    <dt>{match.componentName}</dt>
                    <dd>{match.experienceName}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <a
              className={styles.openPreview}
              href={result.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open preview
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </section>
        ) : null}
      </div>
    </section>
  );
}
