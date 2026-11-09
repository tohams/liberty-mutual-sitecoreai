"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  ShieldMinus,
  TriangleAlert,
} from "lucide-react";
import type { MarketingPreferenceStatus } from "./preferences.types";
import type { MarketingEligibilityResult } from "./marketing-eligibility.types";
import { fetchMarketingEligibility } from "./marketing-eligibility-request";
import styles from "./Preferences.module.css";

export function MarketingOutreachPreview({
  status,
  preferenceBusy,
}: {
  status: MarketingPreferenceStatus | null;
  preferenceBusy: boolean;
}) {
  const [initialIds, setInitialIds] = useState<Record<string, string>>({});
  const verified = status?.status === "verified" && !preferenceBusy;
  return (
    <MarketingOutreachCheck
      key={`${status?.operationId ?? "idle"}:${verified}`}
      operationId={status?.operationId}
      verified={verified}
      initialIds={initialIds}
      onFirstCheck={(result) =>
        setInitialIds((previous) =>
          Object.keys(previous).length
            ? previous
            : Object.fromEntries(
                result.profiles.map((profile) => [
                  profile.identifier,
                  profile.profileId,
                ]),
              ),
        )
      }
    />
  );
}

function MarketingOutreachCheck({
  operationId,
  verified,
  initialIds,
  onFirstCheck,
}: {
  operationId?: string;
  verified: boolean;
  initialIds: Record<string, string>;
  onFirstCheck: (result: MarketingEligibilityResult) => void;
}) {
  const [result, setResult] = useState<MarketingEligibilityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => request.current?.abort();
  }, []);

  async function check() {
    if (!verified || request.current || !operationId) return;
    const controller = new AbortController();
    request.current = controller;
    setResult(null);
    setError("");
    setBusy(true);
    try {
      const response = await fetchMarketingEligibility(controller.signal);
      if (controller.signal.aborted) return;
      if (response.preferenceOperationId !== operationId) {
        throw new Error(
          "The preference changed. Confirm its import, then run the eligibility check again.",
        );
      }
      onFirstCheck(response);
      setResult(response);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "The native eligibility check could not be confirmed.",
        );
    } finally {
      if (request.current === controller && !controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  const recipients =
    result?.profiles.filter((profile) => profile.eligible) ?? [];
  return (
    <section
      className={styles.outreach}
      aria-labelledby="marketing-outreach-preview"
    >
      <span className="workshop-eyebrow">
        THE STORED CHOICE CONTROLS MARKETING
      </span>
      <h2 id="marketing-outreach-preview">Marketing outreach preview</h2>
      <p className={styles.controlsIntro}>
        <strong>Run eligibility check</strong> asks SitecoreAI’s live{" "}
        <strong>Liberty Mutual marketing eligibility</strong> personalization to
        evaluate both stored profiles. Only a native{" "}
        <strong>marketingEligible = true</strong> response includes a recipient
        below. After each preference import is confirmed, run the check again to
        observe the change. This previews an outreach email; no email is sent.
      </p>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.primary}
          disabled={!verified || busy}
          onClick={() => void check()}
        >
          <RefreshCw size={16} className={busy ? styles.spinning : undefined} />
          {busy ? "Checking native eligibility…" : "Run eligibility check"}
        </button>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {!result && !error && !busy && (
          <p className={styles.note}>
            {verified
              ? "Ready to check the confirmed profiles. No recipient is selected until SitecoreAI responds."
              : "Wait for SitecoreAI confirmed the imported records, then run the eligibility check."}
          </p>
        )}
        {error && (
          <div className={`${styles.status} ${styles.attention}`} role="alert">
            <TriangleAlert size={22} />
            <div>
              <strong>Eligibility is not confirmed</strong>
              <p>{error} No recipient preview is available.</p>
            </div>
          </div>
        )}
        {result && (
          <>
            <div className={`${styles.status} ${styles.success}`}>
              {recipients.length ? (
                <CheckCircle2 size={22} />
              ) : (
                <ShieldMinus size={22} />
              )}
              <div>
                <strong>
                  {recipients.length
                    ? `${recipients.length} eligible recipient${recipients.length === 1 ? "" : "s"}`
                    : "No eligible recipients"}
                </strong>
                <p>
                  {recipients.length
                    ? "SitecoreAI included the recipient shown below. Profiles with a false eligibility response receive no outreach preview."
                    : "SitecoreAI returned marketingEligible = false for both profiles. The outreach is withheld."}
                </p>
              </div>
            </div>
            {recipients.map((profile) => (
              <article
                className={styles.email}
                key={profile.identifier}
                aria-label={`Outreach preview for ${profile.displayName}`}
              >
                <div className={styles.emailMeta}>
                  <strong>To:</strong> {profile.displayName} ·{" "}
                  {profile.agencyName}
                  <br />
                  <strong>Subject:</strong> Help your Texas small-business
                  clients prepare for what’s next
                </div>
                <div className={styles.emailBrand}>
                  Liberty Mutual <span>INSURANCE</span>
                </div>
                <div className={styles.emailBody}>
                  <h3>Build your next small-business conversation</h3>
                  <p>Hi Cameron,</p>
                  <p>
                    Your clients count on {profile.agencyName} for practical
                    guidance. Explore resources to help Texas business owners
                    review their protection, prepare their information, and
                    discuss their changing needs.
                  </p>
                  <span className={styles.emailCta}>
                    Explore small-business resources
                  </span>
                  <p>
                    Let’s help your clients move forward with confidence.
                    <br />
                    Your Liberty Mutual team
                  </p>
                </div>
              </article>
            ))}
            <div className={styles.receipts}>
              <h3>Native decision receipts</h3>
              <p>
                The response identifies the same native profile recorded in the
                completed import.
              </p>
              {result.profiles.map((profile) => (
                <div className={styles.receipt} key={profile.identifier}>
                  <strong>{profile.displayName}</strong>
                  <code>
                    marketingEligible ={" "}
                    {String(profile.nativeResponse.marketingEligible)}
                  </code>
                  <span>
                    Native profile ID:{" "}
                    <code>{profile.nativeResponse.profileId}</code>
                  </span>
                  {initialIds[profile.identifier] === profile.profileId && (
                    <span className={styles.idConfirmed}>
                      <CheckCircle2 size={14} /> Same profile as this session’s
                      first check
                    </span>
                  )}
                </div>
              ))}
              <p>
                Native personalization: <code>{result.nativeFriendlyId}</code> ·
                Checked {new Date(result.checkedAt).toLocaleTimeString()}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
