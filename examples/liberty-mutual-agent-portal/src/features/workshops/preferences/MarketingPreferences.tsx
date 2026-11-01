"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Database,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShieldMinus,
  TriangleAlert,
  UserRoundMinus,
} from "lucide-react";
import type {
  MarketingPreferenceAction,
  MarketingPreferenceStatus,
} from "./preferences.types";
import {
  preferenceAutomaticCheckAllowed,
  preferenceIsProcessing,
  preferenceOptOutAllowed,
  preferenceRecoveryAllowed,
  preferenceSubmissionAllowed,
} from "./preference-state";
import {
  fetchPreferenceStatus,
  recoverPreferenceImport,
} from "./preference-request";
import styles from "./Preferences.module.css";

const STATUS_LABELS = {
  idle: "Ready to load the preference examples",
  uploading: "Sending the preference input",
  queued: "SitecoreAI has queued the import",
  pending: "SitecoreAI is processing the import",
  verified: "SitecoreAI confirmed the imported records",
  rejected: "SitecoreAI rejected this import",
  "upload-uncertain": "Check the recorded import before continuing",
  failed: "The preference import needs attention",
} as const;
function nativeProfileUrl(profileId: string): string {
  return `https://app.sitecorecloud.io/optimization/profiles/${encodeURIComponent(profileId)}?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df`;
}

export function MarketingPreferences() {
  const [status, setStatus] = useState<MarketingPreferenceStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unknownSubmission, setUnknownSubmission] = useState(false);
  const [recoveryBatchId, setRecoveryBatchId] = useState("");
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const automaticChecks = useRef(0);
  const currentRequest = useRef<AbortController | null>(null);

  const request = useCallback(
    async (
      action?: MarketingPreferenceAction,
      inspect = false,
      completedBatchId?: string,
    ) => {
      if (inFlight.current || !mounted.current) return;
      inFlight.current = true;
      const controller = new AbortController();
      currentRequest.current = controller;
      setBusy(true);
      setSending(Boolean(action));
      setError("");
      try {
        const body = completedBatchId
          ? await recoverPreferenceImport(completedBatchId, controller.signal)
          : await fetchPreferenceStatus(action, inspect, controller.signal);
        if (!mounted.current || controller.signal.aborted) return;
        setStatus(body);
        setUnknownSubmission(false);
      } catch (failure) {
        if (!mounted.current || controller.signal.aborted) return;
        if (action) setUnknownSubmission(true);
        setError(
          failure instanceof Error
            ? failure.message
            : "The preference status could not be confirmed.",
        );
      } finally {
        if (currentRequest.current === controller) {
          inFlight.current = false;
          currentRequest.current = null;
          if (mounted.current) setBusy(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    mounted.current = true;
    inFlight.current = true;
    const controller = new AbortController();
    currentRequest.current = controller;
    void fetchPreferenceStatus(undefined, false, controller.signal)
      .then((body) => {
        if (mounted.current && !controller.signal.aborted) setStatus(body);
      })
      .catch((failure: unknown) => {
        if (mounted.current && !controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "The preference status could not be confirmed.",
          );
      })
      .finally(() => {
        if (currentRequest.current === controller) {
          currentRequest.current = null;
          inFlight.current = false;
          if (mounted.current) setBusy(false);
        }
      });
    return () => {
      mounted.current = false;
      controller.abort();
      currentRequest.current?.abort();
      inFlight.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      !preferenceAutomaticCheckAllowed(
        status,
        busy,
        error,
        automaticChecks.current,
      )
    )
      return;
    const timer = setTimeout(
      () => {
        automaticChecks.current++;
        void request(undefined, true);
      },
      Math.max(2, Math.min(status?.retryAfterSeconds ?? 4, 10)) * 1_000,
    );
    return () => clearTimeout(timer);
  }, [busy, error, request, status]);

  const canSubmit = preferenceSubmissionAllowed(
    status,
    busy,
    unknownSubmission,
  );
  const canOptOut = preferenceOptOutAllowed(status, busy, unknownSubmission);
  const canRecover = preferenceRecoveryAllowed(status, busy, recoveryBatchId);
  const verified = status?.status === "verified";
  const needsAttention = Boolean(
    error ||
    unknownSubmission ||
    (status &&
      ["rejected", "upload-uncertain", "failed"].includes(status.status)),
  );

  function submit(action: MarketingPreferenceAction) {
    if (!canSubmit) return;
    automaticChecks.current = 0;
    void request(action);
  }

  return (
    <section className={styles.controls} aria-labelledby="preference-examples">
      <span className="workshop-eyebrow">A CONTROLLED COMPARISON</span>
      <h2 id="preference-examples">Start with two matched agent profiles</h2>
      <p className={styles.controlsIntro}>
        The two comparison records have the same agency, role, and Texas state
        attributes. Their marketing suppression choice differs. Load the
        examples, inspect both native profiles, then opt out the initially
        eligible Cameron to observe the changed exclusion.{" "}
        <strong>Restore preferences</strong> returns the pair to the starting
        choices. The names identify their starting choices; the preference
        beneath each name shows its current state.
      </p>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.primary}
          disabled={!canSubmit}
          onClick={() => submit("baseline")}
        >
          <Database size={16} /> Load preference examples
        </button>
        <button
          type="button"
          disabled={!canOptOut}
          onClick={() => submit("optout")}
        >
          <UserRoundMinus size={16} /> Opt out Cameron
        </button>
        <button
          type="button"
          disabled={!canSubmit || !status?.operationId}
          onClick={() => submit("baseline")}
        >
          <RotateCcw size={16} /> Restore preferences
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            automaticChecks.current = 0;
            void request(undefined, true);
          }}
        >
          <RefreshCw size={16} className={busy ? styles.spinning : undefined} />
          {busy ? "Checking preference import…" : "Check import status"}
        </button>
      </div>

      <div
        className={`${styles.status} ${verified && !busy && !needsAttention ? styles.success : ""} ${needsAttention ? styles.attention : ""}`}
        role="status"
        aria-live="polite"
      >
        {needsAttention ? (
          <TriangleAlert size={22} />
        ) : busy || (status && preferenceIsProcessing(status)) ? (
          <Clock3 size={22} />
        ) : verified ? (
          <CheckCircle2 size={22} />
        ) : (
          <CircleDashed size={22} />
        )}
        <div>
          <strong>
            {busy
              ? sending
                ? "Sending the preference input"
                : "Checking the recorded import"
              : error
                ? "The request is not yet confirmed"
                : status
                  ? STATUS_LABELS[status.status]
                  : "Loading the current preference status"}
          </strong>
          <p>
            {busy
              ? sending
                ? "The source choices are being sent once. Accepted imports are processed asynchronously by SitecoreAI."
                : "Reading the current import receipt. This status check does not submit another preference change."
              : error ||
                status?.message ||
                "This reads the current import receipt. Loading the page does not submit a preference change."}
          </p>
          {unknownSubmission && (
            <p>
              Use <strong>Check import status</strong> to recover the recorded
              outcome. This page will not automatically send the change again.
            </p>
          )}
          {status && preferenceIsProcessing(status) && !error && (
            <p>
              Imports are asynchronous. This page checks their status a limited
              number of times. You can use <strong>Check import status</strong>{" "}
              if processing continues.
            </p>
          )}
        </div>
      </div>

      {status?.operationId && (
        <div className={styles.operation}>
          <span>
            Preference operation: <code>{status.operationId}</code>
          </span>
          {status.batchId && (
            <span>
              Native import batch: <code>{status.batchId}</code>
            </span>
          )}
          {status.counts && (
            <span>
              Created: <strong>{status.counts.CREATED}</strong> · Updated:{" "}
              <strong>{status.counts.UPDATED}</strong> · Failed:{" "}
              <strong>{status.counts.FAILED}</strong>
            </span>
          )}
        </div>
      )}

      {status?.status === "upload-uncertain" && (
        <section
          className={styles.recovery}
          aria-labelledby="recover-preference-import"
        >
          <h3 id="recover-preference-import">
            Recover the recorded native import
          </h3>
          <p id="recover-preference-import-help">
            Open{" "}
            <a
              href="https://app.sitecorecloud.io/optimization/settings/profile-import?organization=org_XqL3u1MSNVuubOTb&tenantId=97eea84c-ac47-4d91-7e4f-08defdaaa7df"
              target="_blank"
              rel="noopener noreferrer"
            >
              Profile import history
            </a>
            . Select the current preference import and wait until its status is{" "}
            <strong>Completed</strong>, then copy its <strong>batch ID</strong>.
            Recovery verifies the import time, source data, and individual
            results against this recorded operation. Older or unrelated batches
            are rejected. It does not upload the preferences again.
          </p>
          <label htmlFor="preference-native-batch-id">
            Native import batch ID
          </label>
          <div className={styles.recoveryInput}>
            <input
              id="preference-native-batch-id"
              value={recoveryBatchId}
              onChange={(event) => setRecoveryBatchId(event.target.value)}
              disabled={busy}
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="recover-preference-import-help"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <button
              type="button"
              disabled={!canRecover}
              onClick={() => {
                if (!canRecover) return;
                automaticChecks.current = 0;
                void request(undefined, false, recoveryBatchId.trim());
              }}
            >
              <CheckCircle2 size={16} /> Recover completed import
            </button>
          </div>
        </section>
      )}

      {status && status.profiles.length > 0 && (
        <div className={styles.profiles}>
          {status.profiles.map((profile) => (
            <article className={styles.profile} key={profile.identifier}>
              <div className={styles.profileHeading}>
                <span className={styles.avatar} aria-hidden="true">
                  CE
                </span>
                <div>
                  <h3>{profile.displayName}</h3>
                  <p>{profile.agencyName} · Texas · Producer</p>
                </div>
              </div>
              <div
                className={`${styles.choice} ${profile.marketingSuppressed ? styles.suppressed : ""}`}
              >
                {profile.marketingSuppressed ? (
                  <ShieldMinus size={18} />
                ) : (
                  <ShieldCheck size={18} />
                )}
                <div>
                  <strong>
                    {profile.marketingSuppressed
                      ? "Exclude from marketing"
                      : "Eligible for marketing"}
                  </strong>
                  <span>
                    {status.status === "idle"
                      ? "Preference to send"
                      : "Submitted preference"}
                    : marketingSuppressed ={" "}
                    {String(profile.marketingSuppressed)}
                  </span>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Source identifier</dt>
                  <dd>
                    <code>{profile.identifier}</code>
                  </dd>
                </div>
                {profile.profileId && (
                  <div>
                    <dt>Native profile ID</dt>
                    <dd>
                      <code>{profile.profileId}</code>
                    </dd>
                  </div>
                )}
              </dl>
              {profile.profileId && profile.verifiedAt && verified && (
                <a
                  href={nativeProfileUrl(profile.profileId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open native profile in SitecoreAI <ArrowUpRight size={15} />
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      <p className={styles.note}>
        These actions update two dedicated comparison records shared by this
        exercise. Their import receipt confirms native processing; open the
        native profiles and Audience to inspect the stored values and exclusion
        rule. The comparison records are separate from the numbered portal
        logins.
      </p>
    </section>
  );
}
