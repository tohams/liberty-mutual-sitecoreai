"use client";

import { useId, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  FileText,
  LoaderCircle,
  UsersRound,
} from "lucide-react";
import type { AgentRole, StateCode } from "@/contracts/portal";
import type { AudiencePreviewPanelProps, AudiencePreviewResult } from "./types";
import styles from "./AudiencePreviewPanel.module.css";
import {
  ROLE_OPTIONS,
  STATE_OPTIONS,
  createAudiencePreviewInput,
  DEFAULT_AUDIENCE_PREVIEW_INPUT,
} from "./scenarios";

function contextKey(page: AudiencePreviewPanelProps["page"]) {
  return page
    ? JSON.stringify([page.id, page.language, page.version ?? null])
    : "";
}

export function AudiencePreviewPanel({
  page,
  onPreview,
  initialAudience = DEFAULT_AUDIENCE_PREVIEW_INPUT,
  preparationMessage,
  disabled = false,
}: AudiencePreviewPanelProps) {
  const id = useId();
  const [audience, setAudience] = useState(() => ({
    role: initialAudience.role,
    licensedStates: [...initialAudience.licensedStates],
  }));
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

  const changeRole = (role: AgentRole) => {
    setAudience((current) => ({ ...current, role }));
    setError("");
  };
  const toggleState = (state: StateCode, selected: boolean) => {
    setAudience((current) => ({
      ...current,
      licensedStates: STATE_OPTIONS.map((option) => option.value).filter(
        (code) =>
          code === state ? selected : current.licensedStates.includes(code),
      ),
    }));
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!page || busy || disabled || audience.licensedStates.length === 0)
      return;
    setBusy(true);
    setError("");
    setCompleted(null);
    try {
      const generated = await onPreview(
        createAudiencePreviewInput(audience.role, audience.licensedStates),
        page,
      );
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
                  changeRole(event.target.value as AgentRole)
                }
              >
                {ROLE_OPTIONS.map((role) => (
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
            <p id={`${id}-states-hint`} aria-live="polite">
              Select at least one licensed state.
            </p>
            <div
              className={styles.stateOptions}
              aria-describedby={`${id}-states-hint`}
            >
              {STATE_OPTIONS.map((state) => (
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
          disabled={
            !page || busy || disabled || audience.licensedStates.length === 0
          }
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
