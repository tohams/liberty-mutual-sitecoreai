import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

export const HEALTH_KEY = "lm-public:health:v1:redis";
export const HEALTH_TTL_SECONDS = 172800;
const MAX_RESPONSE_BYTES = 4096;
const HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type HealthEnvironment = Pick<
  NodeJS.ProcessEnv,
  "CRON_SECRET" | "KV_REST_API_URL" | "KV_REST_API_TOKEN"
>;
type HealthDependencies = {
  transport?: typeof fetch;
  now?: () => Date;
  nonce?: () => string;
  reportFailure?: () => void;
};

function authorized(header: string | null, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header || ""), digest(`Bearer ${secret}`));
}

function redisEndpoint(raw?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.port && url.port !== "443") ||
      url.pathname !== "/" ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+upstash\.io$/i.test(
        url.hostname,
      )
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function boundedJson(
  response: Response,
): Promise<Record<string, unknown>> {
  if (!response.ok || response.redirected || !response.body)
    throw new Error("Unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error("Unavailable");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const result: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result) ||
    !Object.hasOwn(result, "result") ||
    ("error" in result && result.error)
  )
    throw new Error("Unavailable");
  return result as Record<string, unknown>;
}

/** Authenticated diagnostic only. It never reads or changes portal workspace records. */
export async function redisHealthGet(
  request: Request,
  environment: HealthEnvironment,
  dependencies: HealthDependencies = {},
): Promise<Response> {
  const secret = environment.CRON_SECRET;
  if (!secret?.trim())
    return Response.json({ ok: false }, { status: 503, headers: HEADERS });
  if (!authorized(request.headers.get("authorization"), secret))
    return Response.json({ ok: false }, { status: 401, headers: HEADERS });
  const endpoint = redisEndpoint(environment.KV_REST_API_URL);
  const token = environment.KV_REST_API_TOKEN;
  if (!endpoint || !token?.trim() || /[\r\n]/.test(token))
    return Response.json({ ok: false }, { status: 503, headers: HEADERS });
  const transport = dependencies.transport || fetch;
  const checkedAt = (dependencies.now || (() => new Date()))().toISOString();
  const value = JSON.stringify({
    checkedAt,
    nonce: (dependencies.nonce || randomUUID)(),
  });
  const deadline = AbortSignal.timeout(4500);
  const command = async (args: (string | number)[]) => {
    const response = await transport(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.any([deadline, AbortSignal.timeout(1500)]),
    });
    return (await boundedJson(response)).result;
  };
  try {
    if (
      (await command(["SET", HEALTH_KEY, value, "EX", HEALTH_TTL_SECONDS])) !==
      "OK"
    )
      throw new Error("Unavailable");
    if ((await command(["GET", HEALTH_KEY])) !== value)
      throw new Error("Unavailable");
    return Response.json({ ok: true, checkedAt }, { headers: HEADERS });
  } catch {
    dependencies.reportFailure?.();
    return Response.json({ ok: false }, { status: 503, headers: HEADERS });
  }
}
