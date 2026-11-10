"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, LoaderCircle, UsersRound } from "lucide-react";
import { AUDIENCE_PREVIEW_SCENARIOS } from "./scenarios";
import { AUDIENCE_PREVIEW_LOGIN, AudiencePreviewSsoBridge } from "./sso";
import {
  isAudiencePreparationProgress,
  type AudiencePreparationProgress,
} from "./preparation-types";
import styles from "./AudiencePreparation.module.css";

const ENDPOINT = "/api/audience-preview/prepare";
const TOTAL = AUDIENCE_PREVIEW_SCENARIOS.length;
const TIMEOUT_MS = 15 * 60_000;

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
                : busy
                  ? "Preparing audiences. Keep this page open; progress is saved automatically."
                  : "Select Prepare audiences to begin or continue."}
            </p>
          </div>
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
