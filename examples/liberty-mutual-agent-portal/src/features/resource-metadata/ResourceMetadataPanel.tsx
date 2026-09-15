"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Info,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { METADATA_FIELDS, type MetadataField } from "./metadata-contract";
import { useResourceMetadataPanel } from "./useResourceMetadataPanel";
import styles from "./ResourceMetadataPanel.module.css";

const FIELD_HELP: Record<MetadataField, string> = {
  state:
    "Choose the state this resource applies to, or Cross-state guidance for material that applies across supported states.",
  businessFamily:
    "Choose the line-of-business family used to organize this resource.",
  product: "Choose the product this resource supports.",
  channel: "Choose the distribution channel this resource is written for.",
  resourceType: "Choose the kind of material agents will find.",
};

export default function ResourceMetadataPanel() {
  const panel = useResourceMetadataPanel();
  const busy = panel.status === "connecting" || panel.status === "loading";
  const disabled = panel.saving || panel.stale || !panel.snapshot?.editable;

  return (
    <main className={styles.panel} aria-labelledby="metadata-panel-title">
      <header className={styles.header}>
        <div className={styles.headingIcon} aria-hidden="true">
          <SlidersHorizontal size={21} strokeWidth={1.8} />
        </div>
        <div>
          <h1 id="metadata-panel-title">Resource metadata</h1>
          <p>Choose how this resource is found and filtered.</p>
        </div>
      </header>

      {panel.status === "standalone" && (
        <section className={styles.emptyState} aria-labelledby="open-in-pages">
          <Info size={25} aria-hidden="true" />
          <h2 id="open-in-pages">Open Resource metadata from Page Builder</h2>
          <p>
            In SitecoreAI Page Builder, select the Liberty Mutual Agent Portal and open a resource article. Then select{" "}
            <strong>Apps → Resource metadata</strong>.
          </p>
          <p>The panel uses your current page, language, and version.</p>
        </section>
      )}

      {busy && (
        <div className={styles.loading} role="status">
          <LoaderCircle
            className={styles.spinner}
            size={22}
            aria-hidden="true"
          />
          <p>
            {panel.status === "connecting"
              ? "Connecting to Page Builder…"
              : "Loading resource and managed choices…"}
          </p>
        </div>
      )}

      {panel.notice && (
        <div
          className={`${styles.notice} ${styles[panel.notice.kind]}`}
          role={panel.notice.kind === "error" ? "alert" : "status"}
        >
          {panel.notice.kind === "success" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <AlertCircle size={18} aria-hidden="true" />
          )}
          <div>
            <p>{panel.notice.text}</p>
            {(panel.stale || panel.status === "error") && (
              <button
                className={styles.inlineButton}
                type="button"
                onClick={panel.refresh}
                disabled={panel.saving}
              >
                <RefreshCw size={14} aria-hidden="true" />
                {panel.changedCount > 0
                  ? "Discard selections and refresh"
                  : "Refresh saved values"}
              </button>
            )}
          </div>
        </div>
      )}

      {panel.snapshot && panel.values && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void panel.save();
          }}
          aria-busy={panel.saving}
        >
          <section className={styles.resource} aria-label="Selected resource">
            <p className={styles.eyebrow}>Selected resource</p>
            <h2>{panel.snapshot.title}</h2>
            <div className={styles.resourceDetails}>
              <span>
                {panel.snapshot.context.language.toUpperCase()} · Version{" "}
                {panel.snapshot.context.version}
              </span>
              <span
                className={
                  panel.snapshot.editable && !panel.stale
                    ? styles.draftBadge
                    : styles.readOnlyBadge
                }
              >
                {panel.stale ? (
                  <>
                    <RefreshCw size={12} aria-hidden="true" /> Refresh required
                  </>
                ) : panel.snapshot.editable ? (
                  "Draft"
                ) : (
                  <>
                    <LockKeyhole size={12} aria-hidden="true" /> Read only
                  </>
                )}
              </span>
              <button
                className={styles.refreshButton}
                type="button"
                onClick={panel.refresh}
                disabled={panel.saving || panel.changedCount > 0}
                aria-label="Refresh resource and managed choices"
                title={
                  panel.changedCount > 0
                    ? "Save or discard your changes before refreshing"
                    : undefined
                }
              >
                <RefreshCw size={13} aria-hidden="true" /> Refresh
              </button>
            </div>
          </section>

          {!panel.snapshot.editable && (
            <div className={`${styles.notice} ${styles.neutral}`} role="status">
              <LockKeyhole size={18} aria-hidden="true" />
              <p>
                {panel.snapshot.blockedReason ||
                  "You cannot edit metadata for this resource in its current state."}
              </p>
            </div>
          )}

          <fieldset className={styles.fields} disabled={disabled}>
            <legend className={styles.visuallyHidden}>
              Resource search metadata
            </legend>
            {METADATA_FIELDS.map(({ name, label }) => {
              const value = panel.values![name];
              const choices = panel.snapshot!.options[name];
              const selected = choices.find((option) => option.value === value);
              const invalid = !selected;
              return (
                <div className={styles.field} key={name}>
                  <label htmlFor={`metadata-${name}`}>
                    {label}
                    <span className={styles.required}>Required</span>
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id={`metadata-${name}`}
                      value={value}
                      onChange={(event) =>
                        panel.update(name, event.target.value)
                      }
                      aria-invalid={invalid}
                      aria-describedby={`metadata-${name}-help${invalid ? ` metadata-${name}-error` : ""}`}
                      required
                    >
                      {invalid && (
                        <option value={value} disabled>
                          {value
                            ? `${value} — not in the managed list`
                            : "Choose an option"}
                        </option>
                      )}
                      {choices.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </div>
                  <p id={`metadata-${name}-help`} className={styles.help}>
                    {selected?.description || FIELD_HELP[name]}
                  </p>
                  {invalid && (
                    <p
                      id={`metadata-${name}-error`}
                      className={styles.fieldError}
                    >
                      {choices.length === 0
                        ? "No choices are available. Ask a content administrator to update this managed list."
                        : value
                          ? "The saved value is no longer in the managed list. Choose a valid option before saving."
                          : "Choose an option before saving."}
                    </p>
                  )}
                </div>
              );
            })}
          </fieldset>

          <footer className={styles.actions}>
            <p className={styles.changeCount} role="status">
              {panel.saving
                ? "Verifying and saving metadata…"
                : panel.changedCount > 0
                  ? `${panel.changedCount} unsaved ${panel.changedCount === 1 ? "change" : "changes"}`
                  : "No unsaved changes"}
            </p>
            <div className={styles.actionButtons}>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={!panel.canSave}
              >
                {panel.saving && (
                  <LoaderCircle
                    className={styles.spinner}
                    size={16}
                    aria-hidden="true"
                  />
                )}
                {panel.saving ? "Saving…" : "Save metadata"}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={panel.discard}
                disabled={panel.saving || panel.changedCount === 0}
              >
                Discard changes
              </button>
            </div>
            <p className={styles.saveHelp}>
              Saves to this resource version. After review and publication, open
              Content → Search Sources → Liberty Mutual Agent Resources and
              select Reindex Content to update search.
            </p>
          </footer>
        </form>
      )}
    </main>
  );
}
