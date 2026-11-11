export const PERSONALIZATION_PREVIEW_LOGIN =
  "/apps/personalization-preview/auth/login";
export const PERSONALIZATION_PREVIEW_SILENT_LOGIN =
  "/apps/personalization-preview/auth/silent";
export const PERSONALIZATION_PREVIEW_COMPLETE =
  "/apps/personalization-preview/auth/complete";
export const PERSONALIZATION_PREVIEW_SILENT_RETURN = `${PERSONALIZATION_PREVIEW_COMPLETE}?flow=silent`;
export const PERSONALIZATION_PREVIEW_AUTH_MESSAGE =
  "personalization-preview-auth-complete";
export type PersonalizationPreviewAuthOutcome =
  "authenticated" | "interaction_required" | "failed";
export type PersonalizationPreviewAuthFlow = "silent" | "popup";

/** Callback query parameters cannot turn a missing server session into success. */
export function personalizationPreviewCompletionOutcome(
  sessionVerified: boolean,
  requested: unknown,
): PersonalizationPreviewAuthOutcome {
  return sessionVerified
    ? "authenticated"
    : requested === "interaction_required"
      ? "interaction_required"
      : "failed";
}

/** Completion is only a notification; the caller must verify its server session. */
export class PersonalizationPreviewSsoBridge {
  private silentAttempted = false;
  private sources = new Map<
    MessageEventSource,
    PersonalizationPreviewAuthFlow
  >();

  takeSilentAttempt(): boolean {
    if (this.silentAttempted) return false;
    this.silentAttempted = true;
    return true;
  }

  watch(flow: PersonalizationPreviewAuthFlow, source: MessageEventSource) {
    this.forget(flow);
    this.sources.set(source, flow);
  }

  forget(flow: PersonalizationPreviewAuthFlow) {
    for (const [source, pending] of this.sources)
      if (pending === flow) this.sources.delete(source);
  }

  receive(
    event: Pick<MessageEvent, "origin" | "source" | "data">,
    origin: string,
  ): PersonalizationPreviewAuthFlow | null {
    if (
      event.origin !== origin ||
      !event.source ||
      !this.sources.has(event.source)
    )
      return null;
    const message: unknown = event.data;
    if (!message || typeof message !== "object" || Array.isArray(message))
      return null;
    const data = message as Record<string, unknown>;
    if (
      Object.keys(data).length !== 2 ||
      data.type !== PERSONALIZATION_PREVIEW_AUTH_MESSAGE ||
      typeof data.outcome !== "string" ||
      !["authenticated", "interaction_required", "failed"].includes(
        data.outcome,
      )
    )
      return null;
    const flow = this.sources.get(event.source)!;
    this.forget(flow);
    return flow;
  }
}
