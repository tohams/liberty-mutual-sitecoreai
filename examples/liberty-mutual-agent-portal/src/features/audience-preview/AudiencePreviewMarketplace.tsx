"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { ClientSDK, type PagesContext } from "@sitecore-marketplace-sdk/client";
import { ArrowUpRight, CircleAlert, LoaderCircle, LogIn } from "lucide-react";
import { AudiencePreviewPanel } from "./AudiencePreviewPanel";
import type {
  AudiencePreviewInput,
  AudiencePreviewPage,
  AudiencePreviewResult,
} from "./types";
import styles from "./AudiencePreviewMarketplace.module.css";

const SIGN_IN_URL = "/apps/audience-preview/auth/login";
const PREVIEW_TIMEOUT_MS = 90_000;
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

function openSignIn(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const popup = window.open(
    SIGN_IN_URL,
    "audience-preview-sign-in",
    "popup=yes,width=560,height=760",
  );
  if (popup) {
    event.preventDefault();
    popup.focus();
  }
}

export function AudiencePreviewMarketplace() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState<AudiencePreviewPage | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
  const [message, setMessage] = useState("");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const nativePage = useRef<AudiencePreviewPage | null>(null);
  const contextRequest = useRef<AbortController | null>(null);
  const previewRequest = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (selected: AudiencePreviewPage | null) => {
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
      if (response.status === 401) {
        setSignInRequired(true);
        return;
      }
      if (!response.ok || !isPage(payload)) {
        throw new Error(
          responseMessage(
            payload,
            "The selected page could not be loaded. Please try again.",
          ),
        );
      }
      setPage(payload);
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
  }, []);

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
          if (response.status === 401) {
            setSignInRequired(true);
            setContextReady(false);
            throw new Error(
              "Sign in to SitecoreAI, then continue to prepare your preview.",
            );
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
    [],
  );

  return (
    <main className={styles.app}>
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
          <LogIn size={20} aria-hidden="true" />
          <div>
            <h2 id="audience-preview-sign-in-title">Sign in to SitecoreAI</h2>
            <p>
              Use your SitecoreAI account to preview this page. After signing
              in, select Continue.
            </p>
            <div className={styles.actions}>
              <a
                href={SIGN_IN_URL}
                target="audience-preview-sign-in"
                onClick={openSignIn}
              >
                Sign in <ArrowUpRight size={15} aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => void loadPage(nativePage.current)}
                disabled={contextLoading}
              >
                {contextLoading ? "Checking sign-in…" : "Continue"}
              </button>
            </div>
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
