"use client";
import { useEffect, useRef } from "react";
import {
  AUDIENCE_PREVIEW_AUTH_MESSAGE,
  type AudiencePreviewAuthOutcome,
} from "./sso";

export function AudiencePreviewAuthComplete({
  outcome,
}: {
  outcome: AudiencePreviewAuthOutcome;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const message = { type: AUDIENCE_PREVIEW_AUTH_MESSAGE, outcome };
    if (window.opener) {
      window.opener.postMessage(message, window.location.origin);
      window.close();
    } else if (window.parent !== window) {
      window.parent.postMessage(message, window.location.origin);
    }
  }, [outcome]);
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "80px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        color: "#252336",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 26 }}>
        {outcome === "authenticated"
          ? "Connected to SitecoreAI"
          : "Connect to SitecoreAI"}
      </h1>
      <p>
        {outcome === "authenticated"
          ? "Return to Audience Preview in Page Builder. You can close this window."
          : "Return to Audience Preview in Page Builder and select Connect to SitecoreAI to continue."}
      </p>
    </main>
  );
}
