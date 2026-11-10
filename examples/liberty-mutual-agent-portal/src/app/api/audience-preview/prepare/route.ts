import { catalogPreparationHandlers } from "@/server/audience-preview/catalog-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const handlers = catalogPreparationHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;
