"use client";

import { useSyncExternalStore, useState } from "react";
import {
  CONSENT_EVENT,
  readConsent,
  saveConsent,
  type ConsentChoice,
} from "src/features/consent/consent";

const subscribe = (notify: () => void) => {
  window.addEventListener(CONSENT_EVENT, notify);
  return () => window.removeEventListener(CONSENT_EVENT, notify);
};

export default function ConsentPreferences() {
  const choice = useSyncExternalStore(
    subscribe,
    readConsent,
    () => "essential" as const,
  );
  const [open, setOpen] = useState(false);
  const choose = (value: ConsentChoice) => {
    saveConsent(value);
    setOpen(false);
  };
  return (
    <>
      <button
        className="public-cookie-settings"
        type="button"
        onClick={() => setOpen(true)}
      >
        Privacy choices
      </button>
      {(choice === null || open) && (
        <section className="public-consent" aria-label="Privacy preferences">
          <div>
            <h2>Your privacy choices</h2>
            <p>
              We use essential cookies to make this website work. With your
              permission, we also use cookies to understand how you use the site
              and personalize helpful information.
            </p>
          </div>
          <div className="public-consent__actions">
            <button
              type="button"
              className="public-button public-button--outline"
              onClick={() => choose("essential")}
            >
              Essential only
            </button>
            <button
              type="button"
              className="public-button"
              onClick={() => choose("all")}
            >
              Allow personalization
            </button>
          </div>
        </section>
      )}
    </>
  );
}
