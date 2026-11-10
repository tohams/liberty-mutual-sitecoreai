import "server-only";
import { readPortalBrowserProfileRef } from "@/lib/portal-identity-link";

export interface AudiencePreviewBindingResult {
  category:
    | "matched"
    | "mismatched"
    | "not-found"
    | "http-failure"
    | "invalid-response"
    | "transport-failure"
    | "timeout";
  status?: number;
}

/** Classify the existing strict native read without exposing references or making additional requests. */
export async function inspectAudiencePreviewBinding(
  browser: { edgeUrl: string; contextId: string; browserId: string },
  expectedProfileId: string,
  signal: AbortSignal,
  transport: typeof fetch = fetch,
  readProfileRef: typeof readPortalBrowserProfileRef = readPortalBrowserProfileRef,
): Promise<AudiencePreviewBindingResult> {
  let status: number | undefined;
  let timedOut = signal.aborted;
  const observedTransport: typeof fetch = async (input, init) => {
    try {
      const response = await transport(input, init);
      status = response.status;
      return response;
    } catch (error) {
      timedOut =
        signal.aborted ||
        (error instanceof DOMException &&
          ["AbortError", "TimeoutError"].includes(error.name));
      throw error;
    }
  };
  let reference: string | null = null;
  try {
    reference = await readProfileRef(browser, signal, observedTransport);
  } catch {
    // Injected readers follow the same bounded, non-disclosing error policy.
  }
  const receipt = status === undefined ? {} : { status };
  if (timedOut || signal.aborted) return { category: "timeout", ...receipt };
  if (reference)
    return {
      category:
        reference.toLowerCase() === expectedProfileId.toLowerCase()
          ? "matched"
          : "mismatched",
      ...receipt,
    };
  if (status === 404) return { category: "not-found", ...receipt };
  if (status === undefined) return { category: "transport-failure" };
  return {
    category:
      status >= 200 && status < 300 ? "invalid-response" : "http-failure",
    ...receipt,
  };
}
