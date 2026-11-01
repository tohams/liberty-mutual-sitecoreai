import { createSitemapRouteHandler } from "@sitecore-content-sdk/nextjs/route-handler";
import generatedSites from ".sitecore/sites.json";
import config from "sitecore.config";
const sites = generatedSites.filter((site) => site.name === config.defaultSite);
import client from "lib/delivery-client";

export const dynamic = "force-dynamic";

/**
 * API route for generating sitemap.xml
 *
 * This Next.js API route handler dynamically generates and serves the sitemap XML for your site.
 * The sitemap configuration can be managed within XM Cloud.
 */

export const { GET } = createSitemapRouteHandler({
  client,
  sites,
});
