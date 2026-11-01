import { createRobotsRouteHandler } from "@sitecore-content-sdk/nextjs/route-handler";
import generatedSites from ".sitecore/sites.json";
import config from "sitecore.config";
import client from "lib/delivery-client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const sites = generatedSites.filter((site) => site.name === config.defaultSite);
const { GET: sitecoreGET } = createRobotsRouteHandler({ client, sites });
const disallow = "User-agent: *\nDisallow: /\n";

/** Respect the CMS crawl policy; draft editing hosts are never indexed. */
export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "preview")
    return new NextResponse(disallow, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  try {
    return await sitecoreGET(request);
  } catch {
    return new NextResponse(disallow, {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
