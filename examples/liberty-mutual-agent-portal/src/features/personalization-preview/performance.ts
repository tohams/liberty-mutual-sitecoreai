type PreviewOperation = "catalog" | "prepare";

let sequence = 0;

/** Local browser timing only: no content IDs, selected variants, or telemetry. */
export function startPersonalizationPreviewMeasure(
  operation: PreviewOperation,
) {
  const name = `personalization-preview-${operation}`;
  const key = `${name}-${++sequence}`;
  const start = `${key}-start`;
  const end = `${key}-end`;
  let finished = false;
  try {
    performance.mark(start);
  } catch {
    return () => undefined;
  }
  return () => {
    if (finished) return;
    finished = true;
    try {
      performance.mark(end);
      performance.measure(name, start, end);
      performance.clearMarks(start);
      performance.clearMarks(end);
    } catch {
      // Observability must never interrupt the preview itself.
    }
  };
}
