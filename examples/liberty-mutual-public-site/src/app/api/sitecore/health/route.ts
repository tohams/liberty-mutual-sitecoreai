import { redisHealthGet } from "@/features/health/redis-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export function GET(request: Request) {
  return redisHealthGet(
    request,
    {
      CRON_SECRET: process.env.CRON_SECRET,
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    },
    {
      reportFailure: () =>
        console.error("[Public health] Redis round-trip unavailable."),
    },
  );
}
