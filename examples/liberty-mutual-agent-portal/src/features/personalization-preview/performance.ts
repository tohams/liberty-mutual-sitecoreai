type PreviewOperation = "catalog" | "prepare";
type PreviewOutcome = "success" | "error" | "aborted";

interface PreviewMeasureMetadata {
  response?: Pick<Response, "status" | "headers">;
  status?: PreviewOutcome;
}

let sequence = 0;
const latest: Record<PreviewOperation, number> = { catalog: 0, prepare: 0 };

/** Retain only the API's known duration-only stages, never descriptions or identifiers. */
export function safePersonalizationServerTiming(value: string | null): string {
  if (!value || value.length > 2_048) return "";
  const stages = new Map<string, number>();
  for (const entry of value.split(",")) {
    const match = entry
      .trim()
      .match(
        /^(auth|limit|page|catalog|render|token|total);dur=(\d+(?:\.\d+)?)$/,
      );
    if (!match) continue;
    const duration = Number(match[2]);
    if (Number.isFinite(duration) && duration >= 0 && duration <= 300_000)
      stages.set(match[1], duration);
  }
  return [...stages]
    .map(([stage, duration]) => `${stage};dur=${duration.toFixed(1)}`)
    .join(", ");
}

/** Local browser timing only: no content IDs, selected variants, or telemetry. */
export function startPersonalizationPreviewMeasure(
  operation: PreviewOperation,
) {
  const name = `personalization-preview-${operation}`;
  const request = ++sequence;
  latest[operation] = request;
  const key = `${name}-${request}`;
  const start = `${key}-start`;
  const end = `${key}-end`;
  const began = performance.now();
  const root =
    typeof document === "undefined" ? undefined : document.documentElement;
  const attribute = `data-personalization-preview-${operation}`;
  root?.setAttribute(`${attribute}-status`, "pending");
  for (const suffix of ["ms", "http-status", "server-timing"])
    root?.removeAttribute(`${attribute}-${suffix}`);
  let finished = false;
  try {
    performance.mark(start);
  } catch {
    // Duration attributes still work if User Timing is unavailable.
  }
  return (metadata: PreviewMeasureMetadata = {}) => {
    if (!finished) {
      finished = true;
      const elapsed = Math.max(0, performance.now() - began);
      if (latest[operation] === request)
        root?.setAttribute(`${attribute}-ms`, elapsed.toFixed(1));
      try {
        performance.mark(end);
        performance.measure(name, start, end);
        performance.clearMarks(start);
        performance.clearMarks(end);
      } catch {
        // Observability must never interrupt the preview itself.
      }
    }
    if (latest[operation] !== request) return;
    if (metadata.status)
      root?.setAttribute(`${attribute}-status`, metadata.status);
    if (metadata.response) {
      root?.setAttribute(
        `${attribute}-http-status`,
        String(metadata.response.status),
      );
      root?.setAttribute(
        `${attribute}-server-timing`,
        safePersonalizationServerTiming(
          metadata.response.headers.get("server-timing"),
        ),
      );
    }
  };
}
