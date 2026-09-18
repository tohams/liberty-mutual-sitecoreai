"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Copy,
  RefreshCw,
  RotateCcw,
  Users,
} from "lucide-react";
import type {
  WorkshopResetOperation,
  WorkshopResetRequest,
  WorkshopResetStatus,
} from "./reset.types";

import { parsePersistedResetIntent, recoverResetState } from "./reset-recovery";

const intentKey = (pack: string) => `lm-workshop-reset:v1:${pack}`;

function savedIntent(pack: string): WorkshopResetRequest | null {
  try {
    return parsePersistedResetIntent(
      pack,
      sessionStorage.getItem(intentKey(pack)),
    );
  } catch {
    /* Read-only status can recover a pending native reset without browser storage. */
  }
  return null;
}

function storeIntent(pack: string, request: WorkshopResetRequest | null) {
  try {
    if (request)
      sessionStorage.setItem(intentKey(pack), JSON.stringify(request));
    else sessionStorage.removeItem(intentKey(pack));
  } catch {
    /* The server still protects every submitted request against duplicate resets. */
  }
}

function requestFor(operation: WorkshopResetOperation): WorkshopResetRequest {
  return {
    reviewerPack: operation.reviewerPack,
    mode: operation.mode,
    requestId: operation.requestId,
    expectedRunId: operation.expectedRunId,
    ...(operation.canResumeVerification ? { resumeVerification: true } : {}),
  };
}

function Identifier({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="workshop-reset-identifier">
      <code>{value}</code>
      <button
        type="button"
        aria-label={`Copy agent identity ${value}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setError(false);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? "Copied" : "Copy"}
      </button>
      {error && (
        <span role="status">Select the identity to copy it manually.</span>
      )}
    </div>
  );
}

export function WorkshopReset({
  defaultPack,
  packs,
  environment,
}: {
  defaultPack: string;
  packs: string[];
  environment: string;
}) {
  const [pack, setPack] = useState(defaultPack);
  const [status, setStatus] = useState<WorkshopResetStatus | null>(null);
  const [intent, setIntent] = useState<WorkshopResetRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [success, setSuccess] = useState<WorkshopResetOperation | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const active = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const stored = savedIntent(pack);
    async function load() {
      setLoading(true);
      setStatus(null);
      setError("");
      setNotice("");
      setBlocked(false);
      setSuccess(null);
      try {
        const params = new URLSearchParams({ reviewerPack: pack });
        if (stored) params.set("requestId", stored.requestId);
        const response = await fetch(`/api/workshops/reset?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.message || "Unable to load reset status.",
          );
        if (controller.signal.aborted) return;
        const next = body as WorkshopResetStatus;
        setStatus(next);
        setNeedsRefresh(false);
        const recovered = recoverResetState(next, stored);
        setIntent(recovered.intent);
        storeIntent(pack, recovered.intent);
        setSuccess(recovered.success);
        setError(recovered.error);
        setNotice(recovered.notice);
        setBlocked(recovered.blockNewRequest);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load reset status.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [pack, refresh]);

  const operation = status?.pendingOperation || status?.operation;
  const pending = operation?.status === "pending";
  const resumable = Boolean(
    intent || pending || operation?.canResumeVerification,
  );

  async function reset() {
    if (
      !status ||
      status.reviewerPack !== pack ||
      !status.restartAvailable ||
      blocked ||
      busy ||
      inFlight.current ||
      needsRefresh
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setSuccess(null);
    const request =
      intent ||
      (pending || operation?.canResumeVerification
        ? requestFor(operation!)
        : {
            reviewerPack: pack,
            mode: "restart" as const,
            requestId: crypto.randomUUID(),
            expectedRunId: status.runId,
          });
    setIntent(request);
    storeIntent(pack, request);
    const started = Date.now();
    try {
      while (active.current) {
        const response = await fetch("/api/workshops/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(65_000),
        });
        const body = await response.json();
        if (!active.current) return;
        if (!body.operation)
          throw new Error(
            body.error?.message ||
              "The reset could not be completed. Refresh status before retrying.",
          );
        const next = body as WorkshopResetStatus;
        setStatus(next);
        const result = next.operation!;
        if (result.status === "completed" || result.status === "failed") {
          const recovered = recoverResetState(next, request);
          setSuccess(recovered.success);
          setIntent(recovered.intent);
          storeIntent(pack, recovered.intent);
          setError(recovered.error);
          setNotice(recovered.notice);
          setBlocked(recovered.blockNewRequest);
          return;
        }
        if (Date.now() - started > 150_000) return;
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.min(60, Math.max(2, result.retryAfterSeconds || 3)) * 1000,
          ),
        );
      }
    } catch (failure) {
      if (active.current) {
        setError(
          `${failure instanceof Error ? failure.message : "The connection was interrupted."} Use Refresh status to check the same request before continuing.`,
        );
        setNeedsRefresh(true);
      }
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }

  return (
    <div className="workshop-reset-layout">
      <section className="workshop-reset-form" aria-label="Reset controls">
        <div className="workshop-reset-environment">
          <span className="workshop-tag">{environment}</span>
          <span>This website only</span>
        </div>
        <label
          className="workshop-reset-select-label"
          htmlFor="reviewer-number"
        >
          Reviewer number
        </label>
        <select
          id="reviewer-number"
          value={pack}
          disabled={busy}
          onChange={(event) => {
            setPack(event.target.value);
            setIntent(null);
            setSuccess(null);
          }}
        >
          {packs.map((number) => (
            <option key={number} value={number}>
              {number}
              {number === "01" ? " · workshop presenters" : ""}
              {number === defaultPack ? " · your sign-in" : ""}
            </option>
          ))}
        </select>
        <p className="workshop-reset-scope">
          This resets all seven <strong>.{pack}</strong> accounts together.
          Other reviewer numbers are unchanged. Choose the number you intend to
          reset; anyone using it will need to sign in again.
        </p>
        <div className="workshop-reset-explanation">
          <h2>A clean start, every time</h2>
          <p>
            Restore tasks, bookmarks and submissions to their starting state and
            create seven new, verified SitecoreAI profiles with no earlier
            browsing behavior.
          </p>
          <p>
            Sign in again afterward to repeat the walkthrough with fresh
            profiles.
          </p>
        </div>
        {status && !status.restartAvailable && (
          <p className="workshop-reset-error" role="status">
            Fresh-profile resets are not configured on this website. Use the
            reset page on the live portal or editing preview for a clean
            workshop reset.
          </p>
        )}
        <div className="workshop-reset-status" role="status" aria-live="polite">
          {loading && <p>Loading reviewer {pack}…</p>}
          {(busy || pending) && (
            <>
              <strong>Reset in progress</strong>
              <p>
                {operation?.phase === "verifying"
                  ? "Verifying all seven profiles in SitecoreAI before activating them."
                  : "Preparing the reviewer pack. Fresh profiles can take a few minutes."}{" "}
                {busy
                  ? "You can leave this page and use Continue reset when you return."
                  : "Select Continue reset to finish the existing request."}
              </p>
            </>
          )}
          {success && (
            <div className="workshop-reset-success">
              <Check size={22} />
              <div>
                <strong>Reviewer {pack} is ready</strong>
                <p>
                  Seven new profiles are verified and active. Saved work is back
                  at its starting state. Sign out of the Agent Portal, then sign
                  in again with the same username and password.
                </p>
              </div>
            </div>
          )}
        </div>
        {notice && (
          <p role="status" className="workshop-reset-notice">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="workshop-reset-error">
            {error}
          </p>
        )}
        <div className="workshop-reset-actions">
          <button
            type="button"
            className="workshop-reset-primary"
            disabled={
              busy ||
              loading ||
              !status ||
              !status.restartAvailable ||
              blocked ||
              status.reviewerPack !== pack ||
              needsRefresh
            }
            onClick={() => void reset()}
          >
            <RotateCcw size={17} />
            {busy
              ? "Reset in progress…"
              : resumable
                ? "Continue reset"
                : `Reset reviewer ${pack}`}
          </button>
          <button
            type="button"
            className="workshop-reset-secondary"
            disabled={busy || loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw size={16} />
            Refresh status
          </button>
        </div>
        <a
          className="workshop-reset-portal"
          href="/login"
          target="_blank"
          rel="noreferrer"
        >
          Open this Agent Portal <ArrowUpRight size={15} />
        </a>
      </section>
      <aside className="workshop-reset-help">
        <section>
          <Users size={23} />
          <h2>Seven personas. One number.</h2>
          <p>
            Resetting {pack} includes every account listed below. Usernames and
            the password <strong>Sitecore</strong> stay the same.
          </p>
          <ul className="workshop-reset-users">
            {status?.profiles.map((profile) => (
              <li key={profile.username}>{profile.username}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>What stays in place</h2>
          <ul>
            <li>Authored content, Search configuration and published pages.</li>
            <li>
              Agentic Studio work, Forms submissions already sent to the
              webhook, and experiment settings.
            </li>
            <li>
              Other reviewer numbers, other website environments and guide
              checkmarks.
            </li>
          </ul>
        </section>
        <section>
          <h2>A fresh profile is a fresh start</h2>
          <p>
            Earlier profiles and their history remain in SitecoreAI. New
            profiles begin without that browsing history; the next portal
            sign-in uses their new identities.
          </p>
          <p>
            A fresh start does not delete experiment results or guarantee a
            particular A/B test variant.
          </p>
        </section>
        <Link href="/workshops/guide/saved-work-reset">
          Read the reset walkthrough →
        </Link>
      </aside>
      <section className="workshop-reset-profiles">
        <span className="workshop-eyebrow">
          FOR THE SITECOREAI PROFILE WALKTHROUGH
        </span>
        <h2>Current profile identities for {pack}</h2>
        <p>
          In SitecoreAI, open <strong>Performance → Profiles</strong> and search
          using <strong>Search filter → Liberty Mutual agent identity</strong>{" "}
          and an identity below. These are the currently active identities for
          this website. After a fresh-profile reset, refresh your profile
          search.
        </p>
        {status && (
          <div className="workshop-reset-table">
            <table>
              <thead>
                <tr>
                  <th>Portal username</th>
                  <th>Agent identity</th>
                </tr>
              </thead>
              <tbody>
                {status.profiles.map((profile) => (
                  <tr key={profile.username}>
                    <th scope="row">
                      {profile.username}
                      <span>{profile.name}</span>
                    </th>
                    <td>
                      <Identifier
                        key={profile.identifier}
                        value={profile.identifier}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {status && (
          <details className="workshop-reset-details">
            <summary>Reset details</summary>
            <dl>
              <dt>Saved-work run</dt>
              <dd>
                <code>{status.runId}</code>
              </dd>
              <dt>Profile generation</dt>
              <dd>{status.profileGeneration}</dd>
              <dt>Last reset status</dt>
              <dd>{operation ? operation.status : "No reset recorded"}</dd>
              {operation && (
                <>
                  <dt>Reset request</dt>
                  <dd>
                    <code>{operation.requestId}</code>
                  </dd>
                </>
              )}
            </dl>
            <p>
              These values help connect the reset to the current profile set.
              They are information only; reading them does not change anything.
            </p>
          </details>
        )}
      </section>
    </div>
  );
}
