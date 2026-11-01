import type {
  MarketingPreferenceAction,
  MarketingPreferenceStatus,
} from "./preferences.types";
import { isMarketingPreferenceStatus } from "./preference-state";

export async function fetchPreferenceStatus(
  action: MarketingPreferenceAction | undefined,
  inspect: boolean,
  signal: AbortSignal,
): Promise<MarketingPreferenceStatus> {
  const response = await fetch(
    `/api/workshops/preferences${inspect ? "?inspect=true" : ""}`,
    {
      method: action ? "POST" : "GET",
      headers: action ? { "Content-Type": "application/json" } : undefined,
      body: action ? JSON.stringify({ action }) : undefined,
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
    },
  );
  const body: unknown = await response.json();
  // A conflict can carry the recorded operation that blocks another upload.
  if (
    !isMarketingPreferenceStatus(body) ||
    (!response.ok && response.status !== 409)
  ) {
    throw new Error(
      response.status === 401
        ? "Your workshop sign-in has ended. Sign in to the workshop website again, then check the import status."
        : "The preference service could not confirm this request. Check the import status before starting another action.",
    );
  }
  return body;
}

/** Recover a known completed native batch; this never uploads another source file. */
export async function recoverPreferenceImport(
  batchId: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<MarketingPreferenceStatus> {
  const response = await fetcher("/api/workshops/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId: batchId.trim() }),
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
  });
  const body: unknown = await response.json();
  if (!response.ok || !isMarketingPreferenceStatus(body)) {
    throw new Error(
      response.status === 401
        ? "Your workshop sign-in has ended. Sign in again, then recover the recorded import."
        : "This batch could not be matched to the recorded preference input. Confirm the matching file and completed status in native Profile import history, then check the recorded import again.",
    );
  }
  return body;
}
