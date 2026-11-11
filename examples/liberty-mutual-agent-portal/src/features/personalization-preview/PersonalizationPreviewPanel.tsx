"use client";

import { useId, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  Eye,
  FileText,
  LoaderCircle,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  defaultPersonalizationSelections,
  type PersonalizationPreviewCatalog,
  type PersonalizationPreviewPage,
  type PersonalizationPreviewResult,
  type PersonalizationPreviewSelection,
} from "./types";
import styles from "./PersonalizationPreviewPanel.module.css";

interface PersonalizationPreviewPanelProps {
  page: PersonalizationPreviewPage | null;
  catalog: PersonalizationPreviewCatalog | null;
  onRefresh: () => void;
  onPreview: (
    selections: PersonalizationPreviewSelection[],
    catalog: PersonalizationPreviewCatalog,
  ) => Promise<PersonalizationPreviewResult>;
  loading?: boolean;
  disabled?: boolean;
}

export function PersonalizationPreviewPanel({
  page,
  catalog,
  onRefresh,
  onPreview,
  loading = false,
  disabled = false,
}: PersonalizationPreviewPanelProps) {
  const id = useId();
  const [selections, setSelections] = useState(() =>
    catalog ? defaultPersonalizationSelections(catalog) : [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<{
    selections: string;
    result: PersonalizationPreviewResult;
  } | null>(null);
  const selectionKey = JSON.stringify(selections);
  const result =
    completed?.selections === selectionKey ? completed.result : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catalog || busy || disabled || loading) return;
    setBusy(true);
    setError("");
    setCompleted(null);
    try {
      const generated = await onPreview(selections, catalog);
      setCompleted({ selections: selectionKey, result: generated });
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

  const choose = (flowId: string, optionId: string) => {
    setSelections((current) =>
      current.map((selection) =>
        selection.flowId === flowId ? { flowId, optionId } : selection,
      ),
    );
    setError("");
  };

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <span className={styles.appIcon} aria-hidden="true">
          <SlidersHorizontal size={22} strokeWidth={1.8} />
        </span>
        <div>
          <h1 id={`${id}-title`}>Personalization Preview</h1>
          <p>Choose the variants you want to see on your page.</p>
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

      <div className={styles.sectionHeading}>
        <h2>Personalizations</h2>
        <button
          type="button"
          className={styles.refresh}
          onClick={onRefresh}
          disabled={!page || busy || loading || disabled}
          title="Read the page’s latest personalization choices"
        >
          <RefreshCw
            size={14}
            className={loading ? styles.spinner : undefined}
            aria-hidden="true"
          />
          Refresh choices
        </button>
      </div>

      {loading ? (
        <div className={styles.empty} role="status">
          <LoaderCircle
            size={19}
            className={styles.spinner}
            aria-hidden="true"
          />
          <p>Loading the page’s personalization choices…</p>
        </div>
      ) : null}

      {!loading && !page ? (
        <div className={styles.empty}>
          <FileText size={21} aria-hidden="true" />
          <p>
            Choose a page in Page Builder to see its personalization choices.
          </p>
        </div>
      ) : null}

      {!loading && catalog && catalog.flows.length === 0 ? (
        <div className={styles.empty}>
          <SlidersHorizontal size={21} aria-hidden="true" />
          <div>
            <strong>
              {catalog.warnings?.length
                ? "No preview choices available"
                : "No personalization on this page"}
            </strong>
            <p>
              {catalog.warnings?.length
                ? "Review the messages below, or preview the default page."
                : "You can preview the default page. Select a personalized page in Page Builder to choose among its variants."}
            </p>
          </div>
        </div>
      ) : null}

      {catalog?.warnings?.length ? (
        <div className={styles.warning} role="status">
          <CircleAlert size={17} aria-hidden="true" />
          <div>
            {catalog.warnings.map((warning, index) => (
              <p key={`${warning}-${index}`}>{warning}</p>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={submit}>
        <fieldset
          disabled={busy || disabled || loading}
          className={styles.choices}
        >
          <legend className={styles.srOnly}>
            Choose personalization variants
          </legend>
          {!loading &&
            catalog?.flows.map((flow, index) => (
              <div className={styles.field} key={flow.id}>
                <label htmlFor={`${id}-flow-${index}`}>{flow.name}</label>
                {flow.componentName ? (
                  <span className={styles.component}>{flow.componentName}</span>
                ) : null}
                <div className={styles.selectWrap}>
                  <select
                    id={`${id}-flow-${index}`}
                    value={
                      selections.find(
                        (selection) => selection.flowId === flow.id,
                      )?.optionId || flow.defaultOptionId
                    }
                    onChange={(event) => choose(flow.id, event.target.value)}
                  >
                    {flow.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </div>
            ))}
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
          disabled={!catalog || busy || disabled || loading}
          aria-describedby={`${id}-preview-note`}
        >
          {busy ? (
            <LoaderCircle
              size={18}
              className={styles.spinner}
              aria-hidden="true"
            />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
          {busy ? "Preparing preview…" : "Preview page"}
        </button>
        <p id={`${id}-preview-note`} className={styles.previewNote}>
          Preview the selected page version without publishing or changing its
          rules.
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
            {result.selectedExperiences.length > 0 ? (
              <dl className={styles.matches}>
                {result.selectedExperiences.map((selection) => (
                  <div key={selection.flowId}>
                    <dt>{selection.flowName}</dt>
                    <dd>{selection.optionLabel}</dd>
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
