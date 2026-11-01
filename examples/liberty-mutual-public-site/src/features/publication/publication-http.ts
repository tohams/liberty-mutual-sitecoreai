import { createHash, timingSafeEqual } from "node:crypto";
import { digest, identifier, PUBLIC_SITE, PublicationError } from "./content";
import {
  PublicationFailure,
  type PublicationService,
  type PublicationTrigger,
} from "./publication-service";
import type { PublicationStore } from "./receipt-store";
import { publicationRuntime, type PublicationEnvironment } from "./runtime";
import type { DeliveryInvalidator } from "./delivery-revalidation";

function authorized(request: Request, secret?: string): boolean {
  if (!secret || secret.length < 24)
    throw new PublicationError("PUBLICATION_AUTH_NOT_CONFIGURED");
  const candidate = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  return timingSafeEqual(
    createHash("sha256").update(candidate).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

async function boundedJson(request: Request): Promise<unknown> {
  if (
    !/^application\/json(?:;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new PublicationError("JSON_REQUIRED", 415);
  const advertised = request.headers.get("content-length");
  if (advertised && (!/^\d+$/.test(advertised) || Number(advertised) > 65536))
    throw new PublicationError("PAYLOAD_TOO_LARGE", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PublicationError("EMPTY_PAYLOAD", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 65536) {
      await reader.cancel();
      throw new PublicationError("PAYLOAD_TOO_LARGE", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PublicationError("INVALID_JSON", 400);
  }
}

export function parseTrigger(value: unknown): PublicationTrigger {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PublicationError("INVALID_TRIGGER", 400);
  const body = value as Record<string, unknown>;
  if (
    body.EventName === "publish:end" &&
    body.PublisherOptions &&
    typeof body.PublisherOptions === "object" &&
    !Array.isArray(body.PublisherOptions)
  ) {
    return { kind: "cms-publish-end", id: digest(body) };
  }
  if (
    body.schemaVersion !== 1 ||
    body.site !== PUBLIC_SITE ||
    !["edge-publish-complete", "reconcile"].includes(String(body.event)) ||
    Object.keys(body).some(
      (key) =>
        !["schemaVersion", "site", "event", "expectedRevisions"].includes(key),
    )
  )
    throw new PublicationError("OUT_OF_SCOPE_TRIGGER", 400);
  let expectedRevisions: Record<string, string> | undefined;
  if (body.expectedRevisions !== undefined) {
    if (
      !body.expectedRevisions ||
      typeof body.expectedRevisions !== "object" ||
      Array.isArray(body.expectedRevisions) ||
      Object.keys(body.expectedRevisions).length > 50
    )
      throw new PublicationError("INVALID_EXPECTED_REVISIONS", 400);
    expectedRevisions = {};
    for (const [id, revision] of Object.entries(body.expectedRevisions)) {
      if (typeof revision !== "string" || !/^[a-f0-9]{64}$/.test(revision))
        throw new PublicationError("INVALID_EXPECTED_REVISIONS", 400);
      expectedRevisions[identifier(id)] = revision;
    }
  }
  return {
    kind: body.event as PublicationTrigger["kind"],
    id: digest(body),
    ...(expectedRevisions ? { expectedRevisions } : {}),
  };
}

function failure(error: unknown): Response {
  const code =
    error instanceof PublicationError ? error.code : "PUBLICATION_FAILED";
  const status = error instanceof PublicationError ? error.status : 503;
  return Response.json(
    {
      error: { code },
      ...(error instanceof PublicationFailure
        ? { receipt: error.receipt }
        : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 503 ? { "Retry-After": "5" } : {}),
      },
    },
  );
}

type Runtime = { service: PublicationService; store: PublicationStore };
export async function publicationPost(
  request: Request,
  environment: PublicationEnvironment = process.env,
  runtime?: Runtime,
  invalidateDelivery?: DeliveryInvalidator,
): Promise<Response> {
  try {
    if (!authorized(request, environment.PUBLICATION_WEBHOOK_SECRET))
      return Response.json(
        { error: { code: "UNAUTHORIZED" } },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    const trigger = parseTrigger(await boundedJson(request));
    // An authenticated Edge OnEnd already confirms published delivery. Refresh
    // pages independently of whether the answer projection has changed or Search
    // is temporarily unavailable. Replays also refresh safely.
    let delivery =
      trigger.kind === "edge-publish-complete"
        ? invalidateDelivery?.()
        : undefined;
    const receipt = await (
      runtime || publicationRuntime(environment)
    ).service.reconcile(trigger);
    // CMS publish:end is not a completion signal until reconciliation has
    // actually observed the expected Live publication.
    if (trigger.kind !== "edge-publish-complete")
      delivery = invalidateDelivery?.();
    return Response.json(
      { receipt, ...(delivery ? { delivery } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function publicationGet(
  request: Request,
  environment: PublicationEnvironment = process.env,
  runtime?: Runtime,
): Promise<Response> {
  try {
    if (!authorized(request, environment.PUBLICATION_WEBHOOK_SECRET))
      return Response.json(
        { error: { code: "UNAUTHORIZED" } },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    const receipt = await (
      runtime || publicationRuntime(environment)
    ).store.latest();
    return Response.json(
      { receipt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
