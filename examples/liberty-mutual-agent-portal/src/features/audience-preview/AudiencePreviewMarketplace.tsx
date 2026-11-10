"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClientSDK, type PagesContext } from "@sitecore-marketplace-sdk/client";
import { ArrowUpRight, CircleAlert, LoaderCircle, LogIn } from "lucide-react";
import { AudiencePreviewPanel } from "./AudiencePreviewPanel";
import type {
  AudiencePreviewInput,
  AudiencePreviewPage,
  AudiencePreviewResult,
} from "./types";
import styles from "./AudiencePreviewMarketplace.module.css";
import {
  AUDIENCE_PREVIEW_LOGIN,
  AUDIENCE_PREVIEW_SILENT_LOGIN,
  AudiencePreviewSsoBridge,
  type AudiencePreviewAuthFlow,
} from "./sso";

// A cold audience includes import verification and a native binding window of up to two minutes.
const PREVIEW_TIMEOUT_MS = 180_000;
let marketplaceClient: Promise<ClientSDK> | null = null;

function getMarketplaceClient() {
  if (!marketplaceClient) {
    marketplaceClient = ClientSDK.init({
      target: window.parent,
      timeout: 10_000,
    }).catch((error: unknown) => {
      marketplaceClient = null;
      throw error;
    });
  }
  return marketplaceClient;
}

function pageKey(page: AudiencePreviewPage | null) {
  return page
    ? JSON.stringify([page.id, page.language, page.version ?? null])
    : "";
}

function currentPage(context: PagesContext): AudiencePreviewPage | null {
  const item = context.pageInfo;
  const site = context.siteInfo;
  const language = item?.language || site?.language;
  if (!item?.id || !language) return null;
  return {
    id: item.id,
    name: item.displayName || item.name || "Current page",
    siteName: site?.displayName || site?.name || "Current site",
    language,
    version: item.version,
    path: item.path,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPage(value: unknown): value is AudiencePreviewPage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.siteName === "string" &&
    typeof value.language === "string" &&
    (value.version === undefined ||
      (Number.isInteger(value.version) && Number(value.version) > 0))
  );
}

function isPreview(value: unknown): value is AudiencePreviewResult {
  if (
    !isRecord(value) ||
    value.status !== "ready" ||
    typeof value.previewUrl !== "string" ||
    typeof value.title !== "string" ||
    !Array.isArray(value.matchedRules) ||
    !value.matchedRules.every(
      (match: unknown) =>
        isRecord(match) &&
        typeof match.componentName === "string" &&
        typeof match.experienceName === "string",
    ) ||
    (value.description !== undefined && typeof value.description !== "string")
  ) {
    return false;
  }
  try {
    const url = new URL(value.previewUrl, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function responseMessage(payload: unknown, fallback: string) {
  if (isRecord(payload)) {
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (
      isRecord(payload.error) &&
      typeof payload.error.message === "string" &&
      payload.error.message.trim()
    ) {
      return payload.error.message;
    }
  }
  return fallback;
}

async function responsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function waitForRetry(duration: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Preview cancelled.", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Preview cancelled.", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, duration);
    signal.addEventListener("abort", abort, { once: true });
  });
}

function needsConnection(response: Response, payload: unknown) {
  return (
    response.status === 401 &&
    !(
      isRecord(payload) &&
      isRecord(payload.error) &&
      payload.error.code === "PAGE_ACCESS_DENIED"
    )
  );
}

export function AudiencePreviewMarketplace() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState<AudiencePreviewPage | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
  const [message, setMessage] = useState("");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [sso] = useState(() => new AudiencePreviewSsoBridge());
  const [authFlow, setAuthFlow] = useState<AudiencePreviewAuthFlow | null>(
    null,
  );
  const popup = useRef<Window | null>(null);
  const nativePage = useRef<AudiencePreviewPage | null>(null);
  const contextRequest = useRef<AbortController | null>(null);
  const previewRequest = useRef<AbortController | null>(null);
  const requireConnection = useCallback(() => {
    setSignInRequired(true);
    if (sso.takeSilentAttempt()) setAuthFlow("silent");
  }, [sso]);

  const loadPage = useCallback(
    async (selected: AudiencePreviewPage | null) => {
      contextRequest.current?.abort();
      previewRequest.current?.abort();
      nativePage.current = selected;
      setPage(selected);
      setContextReady(false);
      setMessage("");
      if (!selected) {
        setContextLoading(false);
        return;
      }

      const controller = new AbortController();
      contextRequest.current = controller;
      setContextLoading(true);
      const query = new URLSearchParams({
        pageId: selected.id,
        language: selected.language,
      });
      if (selected.version) query.set("version", String(selected.version));

      try {
        // The host context identifies the selected page; the server session
        // independently authorizes access and resolves its current metadata.
        const response = await fetch(`/api/audience-preview/context?${query}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await responsePayload(response);
        if (controller.signal.aborted) return;
        if (needsConnection(response, payload)) {
          requireConnection();
          return;
        }
        setSignInRequired(false);
        if (!response.ok || !isPage(payload)) {
          throw new Error(
            responseMessage(
              payload,
              "The selected page could not be loaded. Please try again.",
            ),
          );
        }
        setPage({ ...payload, siteName: selected.siteName });
        setSignInRequired(false);
        setContextReady(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "The selected page could not be loaded. Please try again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setContextLoading(false);
      }
    },
    [requireConnection],
  );

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const completed = sso.receive(event, window.location.origin);
      if (!completed) return;
      if (completed === "popup") popup.current = null;
      setAuthFlow(null);
      // A message signals completion only. The server verifies its own session
      // and the selected page's permissions before enabling the form.
      void loadPage(nativePage.current);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [loadPage, sso]);

  useEffect(() => {
    if (!authFlow) return;
    const timer = setTimeout(
      () => {
        sso.forget(authFlow);
        if (authFlow === "popup") popup.current = null;
        setAuthFlow(null);
      },
      authFlow === "silent" ? 10_000 : 120_000,
    );
    const closed =
      authFlow === "popup"
        ? setInterval(() => {
            if (!popup.current?.closed) return;
            popup.current = null;
            sso.forget("popup");
            setAuthFlow(null);
            void loadPage(nativePage.current);
          }, 500)
        : undefined;
    return () => {
      clearTimeout(timer);
      if (closed) clearInterval(closed);
    };
  }, [authFlow, loadPage, sso]);

  const silentFrame = useCallback(
    (frame: HTMLIFrameElement | null) => {
      if (frame?.contentWindow) sso.watch("silent", frame.contentWindow);
      else sso.forget("silent");
    },
    [sso],
  );

  const connectAccount = () => {
    if (popup.current && !popup.current.closed) {
      popup.current.focus();
      return;
    }
    const opened = window.open(
      AUDIENCE_PREVIEW_LOGIN,
      "audience-preview-sign-in",
      "popup=yes,width=560,height=760",
    );
    if (!opened) {
      setMessage(
        "Allow pop-up windows for this site, then select Connect to SitecoreAI.",
      );
      return;
    }
    popup.current = opened;
    sso.watch("popup", opened);
    setMessage("");
    setAuthFlow("popup");
    opened.focus();
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let lastPageKey: string | null = null;

    const connect = async () => {
      if (window.parent === window) {
        throw new Error("Open Audience Preview from a page in Page Builder.");
      }
      const client = await getMarketplaceClient();
      if (cancelled) return;
      const application = await client.query("application.context");
      if (cancelled) return;
      if (application.isError || !application.data) {
        throw new Error(
          "The Sitecore app connection could not be established. Please try again.",
        );
      }
      const expectedAppId =
        process.env.NEXT_PUBLIC_AUDIENCE_PREVIEW_MARKETPLACE_APP_ID;
      if (expectedAppId && application.data.id !== expectedAppId) {
        throw new Error(
          "Open Audience Preview from its installed app in Page Builder.",
        );
      }
      const receivePage = (context: PagesContext) => {
        if (cancelled) return;
        const selected = currentPage(context);
        const key = pageKey(selected);
        if (key === lastPageKey) return;
        lastPageKey = key;
        void loadPage(selected);
      };
      const result = await client.query("pages.context", {
        subscribe: true,
        onSuccess: receivePage,
        onError: () => {
          if (cancelled) return;
          contextRequest.current?.abort();
          previewRequest.current?.abort();
          setContextReady(false);
          setMessage(
            "The selected page could not be read from Page Builder. Please reconnect.",
          );
          setPhase("error");
        },
      });
      unsubscribe = result.unsubscribe;
      if (cancelled) {
        unsubscribe?.();
        return;
      }
      if (result.isError) {
        throw new Error(
          "The selected page could not be read from Page Builder. Please reconnect.",
        );
      }
      if (result.data) receivePage(result.data);
      setPhase("ready");
    };

    void connect().catch((error: unknown) => {
      if (cancelled) return;
      setPhase("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The Sitecore app connection could not be established. Please try again.",
      );
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      contextRequest.current?.abort();
      previewRequest.current?.abort();
    };
  }, [connectionAttempt, loadPage]);

  const preparePreview = useCallback(
    async (input: AudiencePreviewInput, selected: AudiencePreviewPage) => {
      previewRequest.current?.abort();
      const controller = new AbortController();
      previewRequest.current = controller;
      const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS);
      const expiresAt = Date.now() + PREVIEW_TIMEOUT_MS;
      const body = JSON.stringify({
        pageId: selected.id,
        language: selected.language,
        version: selected.version,
        input,
      });

      try {
        while (Date.now() < expiresAt) {
          const response = await fetch("/api/audience-preview", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body,
            signal: controller.signal,
          });
          const payload = await responsePayload(response);
          if (needsConnection(response, payload)) {
            requireConnection();
            setContextReady(false);
            throw new Error("Connect to SitecoreAI to prepare your preview.");
          }
          if (
            response.status === 202 &&
            isRecord(payload) &&
            payload.status === "pending"
          ) {
            const retryAfter =
              typeof payload.retryAfterSeconds === "number" &&
              Number.isFinite(payload.retryAfterSeconds)
                ? Math.min(15, Math.max(1, payload.retryAfterSeconds)) * 1_000
                : 3_000;
            await waitForRetry(
              Math.min(retryAfter, Math.max(0, expiresAt - Date.now())),
              controller.signal,
            );
            continue;
          }
          if (!response.ok || !isPreview(payload)) {
            throw new Error(
              responseMessage(
                payload,
                "The preview could not be prepared. Please try again.",
              ),
            );
          }
          return payload;
        }
        throw new Error(
          "Your preview is still being prepared. Select Preview audience to check again.",
        );
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error(
            Date.now() >= expiresAt
              ? "Your preview is still being prepared. Select Preview audience to check again."
              : "The selected page changed. Prepare a preview for the current page.",
          );
        }
        throw error;
      } finally {
        clearTimeout(timeout);
        if (previewRequest.current === controller)
          previewRequest.current = null;
      }
    },
    [requireConnection],
  );

  return (
    <main className={styles.app}>
      {authFlow === "silent" ? (
        <iframe
          ref={silentFrame}
          src={AUDIENCE_PREVIEW_SILENT_LOGIN}
          hidden
          aria-hidden="true"
          tabIndex={-1}
          title="Connecting to SitecoreAI"
        />
      ) : null}
      {phase === "loading" ? (
        <div className={styles.loading} role="status">
          <LoaderCircle
            size={21}
            className={styles.spinner}
            aria-hidden="true"
          />
          <span>Connecting to Page Builder…</span>
        </div>
      ) : null}

      {signInRequired ? (
        <section
          className={styles.notice}
          aria-labelledby="audience-preview-sign-in-title"
        >
          {authFlow === "silent" ? (
            <LoaderCircle
              size={20}
              className={styles.spinner}
              aria-hidden="true"
            />
          ) : (
            <LogIn size={20} aria-hidden="true" />
          )}
          <div>
            <h2 id="audience-preview-sign-in-title">
              {authFlow === "silent"
                ? "Connecting to SitecoreAI…"
                : "Connect to SitecoreAI"}
            </h2>
            <p>Use your existing Sitecore session to preview this page.</p>
            {authFlow !== "silent" ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={connectAccount}
                  disabled={contextLoading}
                >
                  Connect to SitecoreAI{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {message ? (
        <div className={styles.error} role="alert">
          <CircleAlert size={19} aria-hidden="true" />
          <div>
            <p>{message}</p>
            <button
              type="button"
              onClick={() => {
                if (phase === "error") {
                  setPhase("loading");
                  setMessage("");
                  setConnectionAttempt((attempt) => attempt + 1);
                } else void loadPage(nativePage.current);
              }}
              disabled={contextLoading}
            >
              {phase === "error" ? "Reconnect" : "Try again"}
            </button>
          </div>
        </div>
      ) : null}

      {phase !== "loading" ? (
        <AudiencePreviewPanel
          key={pageKey(page)}
          page={page}
          onPreview={preparePreview}
          disabled={
            phase !== "ready" ||
            !contextReady ||
            contextLoading ||
            signInRequired
          }
        />
      ) : null}
      {phase === "ready" && contextLoading ? (
        <p className={styles.contextLoading} role="status">
          Loading the selected page…
        </p>
      ) : null}
    </main>
  );
}
