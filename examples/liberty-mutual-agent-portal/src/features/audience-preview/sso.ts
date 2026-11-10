export const AUDIENCE_PREVIEW_LOGIN = "/apps/audience-preview/auth/login";
export const AUDIENCE_PREVIEW_SILENT_LOGIN =
  "/apps/audience-preview/auth/silent";
export const AUDIENCE_PREVIEW_COMPLETE = "/apps/audience-preview/auth/complete";
export const AUDIENCE_PREVIEW_SILENT_RETURN = `${AUDIENCE_PREVIEW_COMPLETE}?flow=silent`;
export const AUDIENCE_PREVIEW_AUTH_MESSAGE = "audience-preview-auth-complete";
export type AudiencePreviewAuthOutcome =
  "authenticated" | "interaction_required" | "failed";
export type AudiencePreviewAuthFlow = "silent" | "popup";

/** Callback query parameters cannot turn a missing server session into success. */
export function audiencePreviewCompletionOutcome(
  sessionVerified: boolean,
  requested: unknown,
): AudiencePreviewAuthOutcome {
  return sessionVerified
    ? "authenticated"
    : requested === "interaction_required"
      ? "interaction_required"
      : "failed";
}

/** Completion is only a notification; the caller must verify its server session. */
export class AudiencePreviewSsoBridge {
  private silentAttempted = false;
  private sources = new Map<MessageEventSource, AudiencePreviewAuthFlow>();

  takeSilentAttempt(): boolean {
    if (this.silentAttempted) return false;
    this.silentAttempted = true;
    return true;
  }

  watch(flow: AudiencePreviewAuthFlow, source: MessageEventSource) {
    this.forget(flow);
    this.sources.set(source, flow);
  }

  forget(flow: AudiencePreviewAuthFlow) {
    for (const [source, pending] of this.sources)
      if (pending === flow) this.sources.delete(source);
  }

  receive(
    event: Pick<MessageEvent, "origin" | "source" | "data">,
    origin: string,
  ): AudiencePreviewAuthFlow | null {
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
      data.type !== AUDIENCE_PREVIEW_AUTH_MESSAGE ||
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
