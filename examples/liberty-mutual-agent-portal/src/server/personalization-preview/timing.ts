import "server-only";

export type PersonalizationPreviewTimingStage =
  "auth" | "limit" | "page" | "catalog" | "render" | "token" | "total";
export type PersonalizationPreviewTimingObserver = (
  stage: PersonalizationPreviewTimingStage,
  durationMs: number,
) => void;
const STAGES = new Set<PersonalizationPreviewTimingStage>([
  "auth",
  "limit",
  "page",
  "catalog",
  "render",
  "token",
  "total",
]);

/** Standard, duration-only timing headers; never include identifiers or request data. */
export class PersonalizationPreviewServerTimings {
  private readonly started: number;
  private readonly stages = new Map<
    PersonalizationPreviewTimingStage,
    number
  >();
  constructor(private readonly now: () => number = () => performance.now()) {
    this.started = now();
  }
  add: PersonalizationPreviewTimingObserver = (stage, durationMs) => {
    if (!STAGES.has(stage) || !Number.isFinite(durationMs) || durationMs < 0)
      return;
    this.stages.set(stage, (this.stages.get(stage) || 0) + durationMs);
  };
  async measure<T>(
    stage: PersonalizationPreviewTimingStage,
    operation: () => Promise<T>,
  ): Promise<T> {
    const started = this.now();
    try {
      return await operation();
    } finally {
      this.add(stage, this.now() - started);
    }
  }
  apply<T extends Response>(response: T): T {
    this.stages.set("total", Math.max(0, this.now() - this.started));
    response.headers.set(
      "Server-Timing",
      [...this.stages.entries()]
        .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
        .join(", "),
    );
    return response;
  }
}

/** Observability must not change the outcome or expose data in the response body. */
export async function observePersonalizationPreviewStage<T>(
  stage: PersonalizationPreviewTimingStage,
  operation: () => Promise<T>,
  observer?: PersonalizationPreviewTimingObserver,
): Promise<T> {
  const started = performance.now();
  try {
    return await operation();
  } finally {
    try {
      observer?.(stage, performance.now() - started);
    } catch {
      /* An observer cannot interrupt a preview. */
    }
  }
}
