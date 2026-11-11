"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClientSDK, type PagesContext } from "@sitecore-marketplace-sdk/client";
import { ArrowUpRight, CircleAlert, LoaderCircle, LogIn } from "lucide-react";
import { PersonalizationPreviewPanel } from "./PersonalizationPreviewPanel";
import {
  isPersonalizationPreviewCatalog,
  isPersonalizationPreviewResult,
  personalizationPreviewPageKey,
  type PersonalizationPreviewCatalog,
  type PersonalizationPreviewPage,
  type PersonalizationPreviewSelection,
} from "./types";
import {
  PERSONALIZATION_PREVIEW_LOGIN,
  PERSONALIZATION_PREVIEW_SILENT_LOGIN,
  PersonalizationPreviewSsoBridge,
  type PersonalizationPreviewAuthFlow,
} from "./sso";
import styles from "./PersonalizationPreviewMarketplace.module.css";
import {
  PersonalizationRequestSuperseded,
  readCurrentPersonalizationResponse,
} from "./request-state";
import { startPersonalizationPreviewMeasure } from "./performance";

const REQUEST_TIMEOUT_MS = 60_000;
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

function currentPage(context: PagesContext): PersonalizationPreviewPage | null {
  const item = context.pageInfo;
  const site = context.siteInfo;
  const language = item?.language || site?.language;
  return item?.id && language
    ? {
        id: item.id,
        name: item.displayName || item.name || "Current page",
        siteName: site?.displayName || site?.name || "Current site",
        language,
        version: item.version,
        path: item.path,
      }
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    if (typeof payload.message === "string" && payload.message.trim())
      return payload.message;
    if (
      isRecord(payload.error) &&
      typeof payload.error.message === "string" &&
      payload.error.message.trim()
    )
      return payload.error.message;
  }
  return fallback;
}

function needsConnection(response: Response, payload: unknown): boolean {
  return (
    response.status === 401 &&
    !(
      isRecord(payload) &&
      isRecord(payload.error) &&
      payload.error.code === "PAGE_ACCESS_DENIED"
    )
  );
}

export function PersonalizationPreviewMarketplace() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState<PersonalizationPreviewPage | null>(null);
  const [catalog, setCatalog] = useState<PersonalizationPreviewCatalog | null>(
    null,
  );
  const [contextLoading, setContextLoading] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
  const [message, setMessage] = useState("");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [sso] = useState(() => new PersonalizationPreviewSsoBridge());
  const [authFlow, setAuthFlow] =
    useState<PersonalizationPreviewAuthFlow | null>(null);
  const popup = useRef<Window | null>(null);
  const nativePage = useRef<PersonalizationPreviewPage | null>(null);
  const contextRequest = useRef<AbortController | null>(null);
  const previewRequest = useRef<AbortController | null>(null);

  const requireConnection = useCallback(() => {
    setSignInRequired(true);
    if (sso.takeSilentAttempt()) setAuthFlow("silent");
  }, [sso]);

  const loadPage = useCallback(
    async (selected: PersonalizationPreviewPage | null) => {
      contextRequest.current?.abort();
      previewRequest.current?.abort();
      contextRequest.current = null;
      previewRequest.current = null;
      nativePage.current = selected;
      setPage(selected);
      setCatalog(null);
      setMessage("");
      if (!selected) {
        setContextLoading(false);
        return false;
      }
      const controller = new AbortController();
      contextRequest.current = controller;
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      setContextLoading(true);
      const query = new URLSearchParams({
        pageId: selected.id,
        language: selected.language,
      });
      if (selected.version) query.set("version", String(selected.version));
      const finishRoundTrip = startPersonalizationPreviewMeasure("catalog");
      let observedResponse: Response | undefined;
      try {
        const response = await fetch(
          `/api/personalization-preview/context?${query}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        observedResponse = response;
        const payload = await readCurrentPersonalizationResponse(response, {
          controller,
          activeController: () => contextRequest.current,
          expectedPageKey: personalizationPreviewPageKey(selected),
          currentPageKey: () =>
            personalizationPreviewPageKey(nativePage.current),
        });
        finishRoundTrip({
          response,
          status: response.ok ? "success" : "error",
        });
        if (needsConnection(response, payload)) {
          requireConnection();
          return false;
        }
        setSignInRequired(false);
        if (!response.ok || !isPersonalizationPreviewCatalog(payload))
          throw new Error(
            responseMessage(
              payload,
              "The page’s personalization choices could not be loaded. Please try again.",
            ),
          );
        const authorizedPage = { ...payload.page, siteName: selected.siteName };
        nativePage.current = authorizedPage;
        setPage(authorizedPage);
        setCatalog(payload);
        return true;
      } catch (error) {
        finishRoundTrip({
          response: observedResponse,
          status:
            observedResponse && !observedResponse.ok
              ? "error"
              : controller.signal.aborted
                ? "aborted"
                : "error",
        });
        if (
          contextRequest.current !== controller ||
          (error instanceof PersonalizationRequestSuperseded && !timedOut)
        )
          return false;
        setMessage(
          timedOut
            ? "SitecoreAI took too long to load the choices. Select Refresh choices to try again."
            : error instanceof Error
              ? error.message
              : "The page’s personalization choices could not be loaded.",
        );
        return false;
      } finally {
        finishRoundTrip();
        clearTimeout(timeout);
        if (contextRequest.current === controller) {
          contextRequest.current = null;
          setContextLoading(false);
        }
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
      PERSONALIZATION_PREVIEW_LOGIN,
      "personalization-preview-sign-in",
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
      if (window.parent === window)
        throw new Error(
          "Open Personalization Preview from a page in Page Builder.",
        );
      const client = await getMarketplaceClient();
      if (cancelled) return;
      const application = await client.query("application.context");
      if (cancelled) return;
      if (application.isError || !application.data)
        throw new Error(
          "The Sitecore app connection could not be established. Please reconnect.",
        );
      const expectedAppId =
        process.env.NEXT_PUBLIC_PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID;
      if (expectedAppId && application.data.id !== expectedAppId)
        throw new Error(
          "Open Personalization Preview from its installed app in Page Builder.",
        );
      const receivePage = (context: PagesContext) => {
        if (cancelled) return;
        const selected = currentPage(context);
        const key = personalizationPreviewPageKey(selected);
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
          contextRequest.current = null;
          previewRequest.current = null;
          setContextLoading(false);
          setCatalog(null);
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
      if (result.isError)
        throw new Error(
          "The selected page could not be read from Page Builder. Please reconnect.",
        );
      if (result.data) receivePage(result.data);
      setPhase("ready");
    };
    void connect().catch((error: unknown) => {
      if (cancelled) return;
      setPhase("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The Sitecore app connection could not be established. Please reconnect.",
      );
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      contextRequest.current?.abort();
      previewRequest.current?.abort();
      contextRequest.current = null;
      previewRequest.current = null;
    };
  }, [connectionAttempt, loadPage]);

  const preparePreview = useCallback(
    async (
      selections: PersonalizationPreviewSelection[],
      selectedCatalog: PersonalizationPreviewCatalog,
    ) => {
      previewRequest.current?.abort();
      const controller = new AbortController();
      previewRequest.current = controller;
      const expectedPageKey = personalizationPreviewPageKey(
        selectedCatalog.page,
      );
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const finishRoundTrip = startPersonalizationPreviewMeasure("prepare");
      let observedResponse: Response | undefined;
      try {
        const response = await fetch("/api/personalization-preview", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: selectedCatalog.page.id,
            language: selectedCatalog.page.language,
            version: selectedCatalog.page.version,
            revision: selectedCatalog.revision,
            selections,
          }),
          signal: controller.signal,
        });
        observedResponse = response;
        const payload = await readCurrentPersonalizationResponse(response, {
          controller,
          activeController: () => previewRequest.current,
          expectedPageKey,
          currentPageKey: () =>
            personalizationPreviewPageKey(nativePage.current),
        });
        finishRoundTrip({
          response,
          status: response.ok ? "success" : "error",
        });
        if (needsConnection(response, payload)) {
          requireConnection();
          setCatalog(null);
          throw new Error("Connect to SitecoreAI to preview this page.");
        }
        if (
          response.status === 409 &&
          isRecord(payload) &&
          isRecord(payload.error) &&
          payload.error.code === "CONFIGURATION_CHANGED"
        ) {
          const refreshed = await loadPage(nativePage.current);
          if (
            refreshed &&
            personalizationPreviewPageKey(nativePage.current) ===
              expectedPageKey
          )
            setMessage(
              "The page’s personalization choices changed. Review the refreshed choices, and select Preview page.",
            );
          throw new Error(
            "The choices changed. Review the refreshed choices, and try again.",
          );
        }
        if (
          !response.ok ||
          !isPersonalizationPreviewResult(payload, window.location.origin)
        )
          throw new Error(
            responseMessage(
              payload,
              "The preview could not be prepared. Please try again.",
            ),
          );
        return payload;
      } catch (error) {
        finishRoundTrip({
          response: observedResponse,
          status:
            observedResponse && !observedResponse.ok
              ? "error"
              : controller.signal.aborted
                ? "aborted"
                : "error",
        });
        if (controller.signal.aborted)
          throw new Error(
            "The preview was interrupted. Select Preview page to try again.",
          );
        throw error;
      } finally {
        finishRoundTrip();
        clearTimeout(timeout);
        if (previewRequest.current === controller)
          previewRequest.current = null;
      }
    },
    [loadPage, requireConnection],
  );

  return (
    <main className={styles.app}>
      {authFlow === "silent" ? (
        <iframe
          ref={silentFrame}
          src={PERSONALIZATION_PREVIEW_SILENT_LOGIN}
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
          aria-labelledby="personalization-preview-sign-in-title"
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
            <h2 id="personalization-preview-sign-in-title">
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
        <PersonalizationPreviewPanel
          key={`${personalizationPreviewPageKey(page)}:${catalog?.revision || "loading"}`}
          page={page}
          catalog={catalog}
          onRefresh={() => void loadPage(nativePage.current)}
          onPreview={preparePreview}
          loading={contextLoading}
          disabled={phase !== "ready" || signInRequired}
        />
      ) : null}
    </main>
  );
}
