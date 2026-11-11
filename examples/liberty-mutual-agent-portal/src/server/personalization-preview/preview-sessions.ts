import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";
import {
  getStateStore,
  stateNamespace,
  type StateStore,
} from "@/server/state/store";
import type { AudiencePreviewDecisions } from "@/server/audience-preview/decisions";
import type {
  PersonalizationPreviewPage,
  PersonalizationPreviewSelection,
  SelectedPersonalizationExperience,
} from "./types";

export const PERSONALIZATION_PREVIEW_SESSION_SECONDS = 300;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export interface PersonalizationPreviewViewSession {
  actorHash: string;
  createdAt: number;
  expiresAt: number;
  page: PersonalizationPreviewPage;
  revision: string;
  selections: PersonalizationPreviewSelection[];
  decisions: AudiencePreviewDecisions;
  selectedExperiences: SelectedPersonalizationExperience[];
}
export interface PersonalizationPreviewSessionDependencies {
  store: StateStore;
  namespace: string;
  now?: () => number;
  token?: () => string;
}
const dependencies = (): PersonalizationPreviewSessionDependencies => ({
  store: getStateStore(),
  namespace: stateNamespace(),
});
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function actorHash(actor: string): string {
  if (!actor || actor.length > 512)
    throw new PersonalizationPreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI to preview this page.",
      401,
    );
  return hash(actor);
}
const key = (token: string, namespace: string) =>
  `${namespace}:personalization-preview:view:${hash(token)}`;
export async function createPersonalizationPreviewViewSession(
  actor: string,
  input: Omit<
    PersonalizationPreviewViewSession,
    "actorHash" | "createdAt" | "expiresAt"
  >,
  deps = dependencies(),
): Promise<string> {
  const token = (deps.token || (() => randomBytes(32).toString("base64url")))();
  if (!TOKEN.test(token)) throw new Error("Invalid preview token.");
  const createdAt = (deps.now || Date.now)();
  const session: PersonalizationPreviewViewSession = {
    ...input,
    actorHash: actorHash(actor),
    createdAt,
    expiresAt: createdAt + PERSONALIZATION_PREVIEW_SESSION_SECONDS * 1_000,
  };
  if (
    !(await deps.store.compareAndSet(
      key(token, deps.namespace),
      null,
      session,
      PERSONALIZATION_PREVIEW_SESSION_SECONDS,
    ))
  )
    throw new PersonalizationPreviewError(
      "PREVIEW_UNAVAILABLE",
      "The preview could not be opened. Please try again.",
      503,
    );
  return token;
}
export async function readPersonalizationPreviewViewSession(
  token: string,
  actor: string,
  deps = dependencies(),
): Promise<PersonalizationPreviewViewSession> {
  const expired = (): never => {
    throw new PersonalizationPreviewError(
      "PREVIEW_EXPIRED",
      "This preview has expired. Return to Personalization Preview in Page Builder to open another.",
      404,
    );
  };
  if (!TOKEN.test(token)) return expired();
  const stored = await deps.store.read<PersonalizationPreviewViewSession>(
    key(token, deps.namespace),
  );
  const now = (deps.now || Date.now)();
  if (
    !stored ||
    stored.value.actorHash !== actorHash(actor) ||
    stored.value.createdAt > now ||
    stored.value.expiresAt <= now ||
    stored.value.expiresAt - stored.value.createdAt !==
      PERSONALIZATION_PREVIEW_SESSION_SECONDS * 1_000
  )
    return expired();
  return stored.value;
}
export async function limitPersonalizationPreviewRequests(
  actor: string,
  deps = dependencies(),
): Promise<void> {
  const bucket = Math.floor((deps.now || Date.now)() / 60_000);
  const bucketKey = `${deps.namespace}:personalization-preview:rate:${actorHash(actor)}:${bucket}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await deps.store.read<{ count: number }>(bucketKey);
    if ((current?.value.count || 0) >= 40) break;
    if (
      await deps.store.compareAndSet(
        bucketKey,
        current?.version ?? null,
        { count: (current?.value.count || 0) + 1 },
        120,
      )
    )
      return;
  }
  throw new PersonalizationPreviewError(
    "RATE_LIMITED",
    "Please wait a minute before opening another preview.",
    429,
  );
}
