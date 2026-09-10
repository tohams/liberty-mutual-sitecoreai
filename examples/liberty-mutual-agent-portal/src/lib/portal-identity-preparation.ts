import type { analyticsBrowserAdapter } from "@sitecore-content-sdk/analytics-core";

export const LOGIN_IDENTITY_PREPARATION_TIMEOUT_MS = 5000;
export const ORDINARY_IDENTITY_TIMEOUT_MS = 2000;

/** Only wraps the public adapter contract; the supplied adapter is never mutated. */
export function prepareBrowserAdapter(
  adapter: ReturnType<typeof analyticsBrowserAdapter>,
  fresh: boolean,
): ReturnType<typeof analyticsBrowserAdapter> {
  let needsFreshBrowser = fresh;
  return {
    ...adapter,
    getClientId: () => (needsFreshBrowser ? null : adapter.getClientId()),
    setClientId: async () => {
      await adapter.setClientId();
      needsFreshBrowser = false;
    },
  };
}

/** A timeout ends the optional wait, even when an upstream SDK ignores cancellation. */
export function awaitIdentityWork<T>(
  work: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("Identity preparation ended"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    work
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

export async function boundedIdentityPreparation(
  operation: (signal: AbortSignal) => Promise<boolean>,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<boolean> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parentSignal?.aborted) return false;
  parentSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    return await awaitIdentityWork(
      Promise.resolve().then(() => {
        if (controller.signal.aborted) return false;
        return operation(controller.signal);
      }),
      controller.signal,
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", abort);
    controller.abort();
  }
}

/**
 * Retains actual SDK work, not just the timed-out caller's promise. A fresh SDK
 * cannot start while an older operation could still read or replace its cookies.
 */
export class PortalIdentityWork {
  private generation = 0;
  private pending = new Set<Promise<unknown>>();

  invalidate(): number {
    return ++this.generation;
  }
  current(): number {
    return this.generation;
  }
  isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  run<T>(
    generation: number,
    signal: AbortSignal,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!this.isCurrent(generation) || signal.aborted)
      return Promise.reject(new Error("Identity preparation superseded"));
    const actual = Promise.resolve().then(() => {
      if (!this.isCurrent(generation) || signal.aborted)
        throw new Error("Identity preparation superseded");
      return operation();
    });
    this.pending.add(actual);
    const remove = () => {
      this.pending.delete(actual);
    };
    void actual.then(remove, remove);
    return actual;
  }

  async waitUntilIdle(signal: AbortSignal): Promise<void> {
    while (this.pending.size > 0) {
      await awaitIdentityWork(Promise.allSettled([...this.pending]), signal);
    }
    if (signal.aborted) throw new Error("Identity preparation ended");
  }
}
