import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { AudiencePreviewInput } from "@/features/audience-preview/types";
import type { AudiencePreviewPage } from "@/server/marketplace/audience-preview-pages";
import { AudiencePreviewError } from "@/server/marketplace/audience-preview-config";
import { getStateStore, stateNamespace, type StateStore } from "../state/store";
import type { AudiencePreviewDecisions } from "./decisions";

export const PREVIEW_SESSION_SECONDS = 5 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface AudiencePreviewViewSession {
  actorHash: string;
  createdAt: number;
  expiresAt: number;
  page: AudiencePreviewPage;
  input: AudiencePreviewInput;
  decisions: AudiencePreviewDecisions;
}

export interface PreviewSessionDependencies {
  store: StateStore;
  namespace: string;
  now?: () => number;
  token?: () => string;
}

export function previewActorHash(actor: string): string {
  if (!actor || actor.length > 512) {
    throw new AudiencePreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI to preview this page.",
      401,
    );
  }
  return createHash("sha256").update(actor).digest("hex");
}

function sessionKey(token: string, namespace: string) {
  return `${namespace}:audience-preview:view:${createHash("sha256").update(token).digest("hex")}`;
}

const dependencies = (): PreviewSessionDependencies => ({
  store: getStateStore(),
  namespace: stateNamespace(),
});

export async function createAudiencePreviewViewSession(
  actor: string,
  page: AudiencePreviewPage,
  input: AudiencePreviewInput,
  decisions: AudiencePreviewDecisions,
  deps: PreviewSessionDependencies = dependencies(),
): Promise<string> {
  const token = (deps.token || (() => randomBytes(32).toString("base64url")))();
  if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid preview token.");
  const createdAt = (deps.now || Date.now)();
  const session: AudiencePreviewViewSession = {
    actorHash: previewActorHash(actor),
    createdAt,
    expiresAt: createdAt + PREVIEW_SESSION_SECONDS * 1000,
    page,
    input,
    decisions,
  };
  const saved = await deps.store.compareAndSet(
    sessionKey(token, deps.namespace),
    null,
    session,
    PREVIEW_SESSION_SECONDS,
  );
  if (!saved) {
    throw new AudiencePreviewError(
      "PREVIEW_UNAVAILABLE",
      "The preview could not be opened. Please try again.",
      503,
    );
  }
  return token;
}

/** The URL contains no selectors, profile IDs, content IDs, or authorization data. */
export async function readAudiencePreviewViewSession(
  token: string,
  actor: string,
  deps: PreviewSessionDependencies = dependencies(),
): Promise<AudiencePreviewViewSession> {
  const invalid = () => {
    throw new AudiencePreviewError(
      "PREVIEW_EXPIRED",
      "This preview has expired. Return to Audience Preview in Page Builder to prepare another.",
      404,
    );
  };
  if (!TOKEN_PATTERN.test(token)) return invalid();
  const stored = await deps.store.read<AudiencePreviewViewSession>(
    sessionKey(token, deps.namespace),
  );
  const now = (deps.now || Date.now)();
  if (
    !stored ||
    stored.value.actorHash !== previewActorHash(actor) ||
    stored.value.expiresAt <= now ||
    stored.value.createdAt > now ||
    stored.value.expiresAt - stored.value.createdAt !==
      PREVIEW_SESSION_SECONDS * 1000
  )
    return invalid();
  return stored.value;
}

/** Per-actor request buckets include pending polling, with enough room for a full preparation. */
export async function limitAudiencePreviewRequests(
  actor: string,
  deps: PreviewSessionDependencies = dependencies(),
): Promise<void> {
  const windowSeconds = 60;
  const bucket = Math.floor((deps.now || Date.now)() / (windowSeconds * 1000));
  const key = `${deps.namespace}:audience-preview:rate:${previewActorHash(actor)}:${bucket}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await deps.store.read<{ count: number }>(key);
    if ((current?.value.count || 0) >= 60) break;
    if (
      await deps.store.compareAndSet(
        key,
        current?.version ?? null,
        {
          count: (current?.value.count || 0) + 1,
        },
        windowSeconds * 2,
      )
    )
      return;
  }
  throw new AudiencePreviewError(
    "RATE_LIMITED",
    "Please wait a minute before preparing another preview.",
    429,
  );
}
