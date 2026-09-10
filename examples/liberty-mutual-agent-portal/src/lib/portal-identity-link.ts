/** Login-only readiness: observe the fresh browser's profile link, never retry a decision. */
export const PROFILE_LINK_TIMEOUT_MS = 6000;

type LinkOperations = {
  readProfileRef: (signal: AbortSignal) => Promise<string | null>;
  identify: (signal: AbortSignal) => Promise<unknown>;
};

type LinkTiming = {
  now?: () => number;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function abortable<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("Profile link deadline"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve()
      .then(operation)
      .then(resolve, reject)
      .finally(() => {
        signal.removeEventListener("abort", abort);
      });
  });
}

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new Error("Profile link deadline"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

/**
 * Use only immediately after an explicit login cleared the browser identity.
 * An existing identified browser may never change profile and must not use this gate.
 * The deadline includes baseline read, IDENTITY receipt, and profile-link polling.
 */
export async function waitForPortalProfileLink(
  operations: LinkOperations,
  timing: LinkTiming = {},
): Promise<boolean> {
  const budget = Math.min(
    timing.timeoutMs ?? PROFILE_LINK_TIMEOUT_MS,
    PROFILE_LINK_TIMEOUT_MS,
  );
  if (!Number.isFinite(budget) || budget <= 0) return false;
  const now = timing.now ?? (() => performance.now());
  const pause = timing.sleep ?? sleep;
  const deadline = now() + budget;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (timing.signal?.aborted) return false;
  timing.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), budget);
  const withinDeadline = () => !controller.signal.aborted && now() < deadline;
  try {
    const baseline = await abortable(
      () => operations.readProfileRef(controller.signal),
      controller.signal,
    );
    if (!baseline || !withinDeadline()) return false;
    const receipt = await abortable(
      () => operations.identify(controller.signal),
      controller.signal,
    );
    if (!receipt || !withinDeadline()) return false;
    let attempt = 0;
    while (withinDeadline()) {
      const current = await abortable(
        () => operations.readProfileRef(controller.signal),
        controller.signal,
      );
      if (!current || !withinDeadline()) return false;
      if (current !== baseline) return true;
      const remaining = deadline - now();
      const delay = Math.min(
        [200, 350, 500][Math.min(attempt++, 2)],
        remaining,
      );
      if (delay <= 0) return false;
      await abortable(() => pause(delay, controller.signal), controller.signal);
    }
    return false;
  } catch {
    // Analytics and readiness are optional; never expose response/identity details.
    return false;
  } finally {
    clearTimeout(timeout);
    timing.signal?.removeEventListener("abort", abort);
    controller.abort();
  }
}

/** Same public browser/show contract used by the pinned Personalize SDK 2.1.0. */
export async function readPortalBrowserProfileRef(
  browser: { edgeUrl: string; contextId: string; browserId: string },
  signal: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<string | null> {
  if (!browser.browserId || !browser.contextId) return null;
  try {
    const endpoint = new URL(
      `${browser.edgeUrl.replace(/\/$/, "")}/v1/events/v1.2/browser/${encodeURIComponent(browser.browserId)}/show.json?client_key=&api_token=`,
    );
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password
    )
      return null;
    const response = await transport(endpoint, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      signal,
      headers: {
        "x-sitecore-contextid": browser.contextId,
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("customer" in body)) return null;
    const customer = body.customer;
    if (!customer || typeof customer !== "object" || !("ref" in customer))
      return null;
    return typeof customer.ref === "string" && customer.ref.length > 0
      ? customer.ref
      : null;
  } catch {
    return null;
  }
}
