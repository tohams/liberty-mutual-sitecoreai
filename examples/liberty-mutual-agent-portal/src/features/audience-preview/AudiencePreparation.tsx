"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, LoaderCircle, UsersRound } from "lucide-react";
import {
  AUDIENCE_PREVIEW_SCENARIOS,
  ROLE_OPTIONS,
  STATE_OPTIONS,
} from "./scenarios";
import { AUDIENCE_PREVIEW_LOGIN, AudiencePreviewSsoBridge } from "./sso";
import {
  isAudiencePreparationProgress,
  type AudiencePreparationProgress,
  type CatalogFailureStage,
} from "./preparation-types";
import styles from "./AudiencePreparation.module.css";

const ENDPOINT = "/api/audience-preview/prepare";
const TOTAL = AUDIENCE_PREVIEW_SCENARIOS.length;
const TIMEOUT_MS = 15 * 60_000;
const FAILURE_LABELS: Record<CatalogFailureStage, string> = {
  "profile-preparation": "Prepare the profile",
  "native-decision": "Evaluate personalization",
  "page-layout": "Load the page",
  unrecorded: "Earlier preparation attempt",
};
function scenarioLabel(index: number): string {
  const scenario = AUDIENCE_PREVIEW_SCENARIOS[index];
  const role = ROLE_OPTIONS.find(
    (option) => option.value === scenario.role,
  )!.label;
  const states = scenario.licensedStates.map(
    (state) => STATE_OPTIONS.find((option) => option.value === state)!.label,
  );
  return `${role} · ${new Intl.ListFormat("en-US", { type: "conjunction" }).format(states)}`;
}

async function payload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
function message(value: unknown): string {
  if (value && typeof value === "object" && "error" in value) {
    const error = value.error;
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    )
      return error.message;
  }
  return "Audience preparation could not be completed. Please try again.";
}
function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Cancelled", "AbortError"));
    const aborted = () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", aborted);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", aborted, { once: true });
  });
}

class PreparationConnectionRequired extends Error {}

async function requestProgress(
  method: "GET" | "POST",
  signal: AbortSignal,
): Promise<AudiencePreparationProgress> {
  const response = await fetch(ENDPOINT, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal,
    ...(method === "POST"
      ? { headers: { "Content-Type": "application/json" }, body: "{}" }
      : {}),
  });
  const value = await payload(response);
  if (response.status === 401)
    throw new PreparationConnectionRequired(
      "Connect to SitecoreAI to prepare audiences.",
    );
  if (!response.ok || !isAudiencePreparationProgress(value, TOTAL))
    throw new Error(message(value));
  return value;
}

export function AudiencePreparation() {
  const [progress, setProgress] = useState<AudiencePreparationProgress | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [error, setError] = useState("");
  const [sso] = useState(() => new AudiencePreviewSsoBridge());
  const request = useRef<AbortController | null>(null);
  const popup = useRef<Window | null>(null);

  const readProgress = useCallback(
    async (method: "GET" | "POST", signal: AbortSignal) => {
      try {
        const value = await requestProgress(method, signal);
        setNeedsConnection(false);
        setProgress(value);
        return value;
      } catch (cause) {
        if (cause instanceof PreparationConnectionRequired)
          setNeedsConnection(true);
        throw cause;
      }
    },
    [],
  );

  const checkConnection = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      await readProgress("GET", controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Audience preparation could not be loaded.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [readProgress]);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    void requestProgress("GET", controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setNeedsConnection(false);
          setProgress(value);
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof PreparationConnectionRequired)
          setNeedsConnection(true);
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Audience preparation could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => request.current?.abort();
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!sso.receive(event, window.location.origin)) return;
      // The message is only a notification; GET independently verifies the real session and Home access.
      void checkConnection();
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      sso.forget("popup");
    };
  }, [checkConnection, sso]);

  const prepare = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const expiresAt = Date.now() + TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    setBusy(true);
    setError("");
    try {
      while (Date.now() < expiresAt) {
        const current = await readProgress("POST", controller.signal);
        if (current.status === "ready") return;
        if (current.status === "failed")
          throw new Error(
            current.message ||
              "Some audiences could not be prepared. Select Prepare audiences to check again.",
          );
        await wait(
          Math.min(Math.max(1, current.retryAfterSeconds || 3), 15) * 1000,
          controller.signal,
        );
      }
    } catch (cause) {
      if (!controller.signal.aborted || Date.now() >= expiresAt)
        setError(
          Date.now() >= expiresAt
            ? "Preparation is taking longer. Select Prepare audiences to continue from the saved progress."
            : cause instanceof Error
              ? cause.message
              : "Audience preparation could not be completed.",
        );
    } finally {
      clearTimeout(timer);
      if (request.current === controller) request.current = null;
      setBusy(false);
    }
  };

  const connect = () => {
    popup.current = window.open(
      AUDIENCE_PREVIEW_LOGIN,
      "AudiencePreparationSignIn",
      "popup,width=600,height=760",
    );
    if (popup.current) sso.watch("popup", popup.current);
    else setError("Allow the SitecoreAI connection window, then try again.");
  };
  const ready = progress?.readyCount || 0;
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="preparation-title">
        <span className={styles.icon} aria-hidden="true">
          <UsersRound size={26} />
        </span>
        <h1 id="preparation-title">Prepare audiences</h1>
        <p>
          Prepare all {TOTAL} role and licensed-state combinations for Audience
          Preview.
        </p>
        <p>
          Each preview continues to use the page’s current content and
          SitecoreAI personalization.
        </p>
        {loading ? (
          <p role="status">
            <LoaderCircle
              className={styles.spinner}
              size={18}
              aria-hidden="true"
            />{" "}
            Checking your SitecoreAI connection…
          </p>
        ) : null}
        {progress ? (
          <div className={styles.progress}>
            <div className={styles.counts}>
              <strong>
                {ready} of {TOTAL} ready
              </strong>
              <span>{progress.pendingCount} pending</span>
            </div>
            <progress max={TOTAL} value={ready} aria-label="Audiences ready" />
            <p role="status" aria-live="polite" aria-atomic="true">
              {progress.status === "ready"
                ? "All audiences are ready for preview."
                : progress.status === "failed"
                  ? "Audience preparation needs attention. Review the details below before continuing."
                  : busy
                    ? "Preparing audiences. Keep this page open; progress is saved automatically."
                    : "Select Prepare audiences to begin or continue."}
            </p>
          </div>
        ) : null}
        {progress?.failedRows?.length ? (
          <section
            className={styles.failures}
            aria-labelledby="failed-audiences-title"
          >
            <h2 id="failed-audiences-title">Needs attention</h2>
            <ul>
              {progress.failedRows.map((row) => (
                <li key={row.index}>
                  <strong>{scenarioLabel(row.index)}</strong>
                  <span>{FAILURE_LABELS[row.stage]}</span>
                  <code>{row.code}</code>
                  {row.status ? <span>HTTP {row.status}</span> : null}
                  {row.source ||
                  row.profilePhase ||
                  row.profileCode ||
                  row.identitySent !== undefined ||
                  row.hasCatalogProof !== undefined ||
                  row.hasSubmissionProof !== undefined ? (
                    <dl>
                      {row.source ? (
                        <>
                          <dt>Source</dt>
                          <dd>
                            {row.source === "bulk"
                              ? "Batch preparation"
                              : "Existing audience record"}
                          </dd>
                        </>
                      ) : null}
                      {row.profilePhase ? (
                        <>
                          <dt>Stored state</dt>
                          <dd>
                            <code>{row.profilePhase}</code>
                          </dd>
                        </>
                      ) : null}
                      {row.profileCode && row.profileCode !== row.code ? (
                        <>
                          <dt>Stored code</dt>
                          <dd>
                            <code>{row.profileCode}</code>
                          </dd>
                        </>
                      ) : null}
                      {row.identitySent !== undefined ? (
                        <>
                          <dt>Identity attempt</dt>
                          <dd>
                            {row.identitySent ? "Recorded" : "Not recorded"}
                          </dd>
                        </>
                      ) : null}
                      {row.hasCatalogProof !== undefined ? (
                        <>
                          <dt>Batch verification</dt>
                          <dd>
                            {row.hasCatalogProof ? "Recorded" : "Not recorded"}
                          </dd>
                        </>
                      ) : null}
                      {row.hasSubmissionProof !== undefined ? (
                        <>
                          <dt>Import receipt</dt>
                          <dd>
                            {row.hasSubmissionProof
                              ? "Recorded"
                              : "Not recorded"}
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {error ? (
          <div className={styles.error} role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}
        {needsConnection ? (
          <button type="button" onClick={connect} disabled={loading}>
            Connect to SitecoreAI
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void prepare()}
            disabled={loading || busy}
          >
            {busy ? (
              <LoaderCircle
                className={styles.spinner}
                size={18}
                aria-hidden="true"
              />
            ) : progress?.status === "ready" ? (
              <Check size={18} aria-hidden="true" />
            ) : (
              <UsersRound size={18} aria-hidden="true" />
            )}
            {busy ? "Preparing audiences…" : "Prepare audiences"}
          </button>
        )}
      </section>
    </main>
  );
}
