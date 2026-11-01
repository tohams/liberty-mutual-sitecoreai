import { type NextRequest } from "next/server";
import {
  defineProxy,
  PreviewProxy,
  AppRouterMultisiteProxy,
  PersonalizeProxy,
  RedirectsProxy,
  LocaleProxy,
} from "@sitecore-content-sdk/nextjs/proxy";
import generatedSites from ".sitecore/sites.json";
import scConfig from "sitecore.config";
import { routing } from "./i18n/routing";
import client from "./lib/sitecore-client";
import { deliveryConfig } from "./lib/delivery-client";
import { CONSENT_COOKIE } from "./features/consent/consent";

// This dedicated rendering host never resolves another site's cookies or hostname.
const sites = generatedSites.filter(
  (site) => site.name === scConfig.defaultSite,
);

const preview = new PreviewProxy({
  client,
  ...scConfig.api.edge,
});

const locale = new LocaleProxy({
  /**
   * List of sites for site resolver to work with
   */
  sites,
  /**
   * List of all supported locales configured in routing.ts
   */
  locales: routing.locales.slice(),
  // This function determines if the middleware should be turned off on per-request basis.
  // Certain paths are ignored by default (e.g. files and Next.js API routes), but you may wish to disable more.
  // This is an important performance consideration since Next.js Edge middleware runs on every request.
  // in multilanguage scenarios, we need locale middleware to always run first to ensure locale is set and used correctly by the rest of the middlewares
  skip: () => false,
});

const multisite = new AppRouterMultisiteProxy({
  /**
   * List of sites for site resolver to work with
   */
  sites,
  ...deliveryConfig.api.edge,
  ...scConfig.multisite,
  // This function determines if the middleware should be turned off on per-request basis.
  // Certain paths are ignored by default (e.g. files and Next.js API routes), but you may wish to disable more.
  // This is an important performance consideration since Next.js Edge middleware runs on every request.
  skip: () => false,
});

const redirects = new RedirectsProxy({
  /**
   * List of sites for site resolver to work with
   */
  sites,
  ...deliveryConfig.api.edge,
  ...scConfig.api.local,
  ...scConfig.redirects,
  // This function determines if the middleware should be turned off on per-request basis.
  // Certain paths are ignored by default (e.g. Next.js API routes), but you may wish to disable more.
  // By default it is disabled while in development mode.
  // This is an important performance consideration since Next.js Edge middleware runs on every request.
  skip: () => false,
});

const personalize = new PersonalizeProxy({
  /**
   * List of sites for site resolver to work with
   */
  sites,
  ...deliveryConfig.api.edge,
  ...scConfig.personalize,
  // This function determines if the middleware should be turned off on per-request basis.
  // Certain paths are ignored by default (e.g. Next.js API routes), but you may wish to disable more.
  // By default it is disabled while in development mode.
  // This is an important performance consideration since Next.js Edge middleware runs on every request.
  skip: (req) =>
    req.cookies.get(CONSENT_COOKIE)?.value !== "all" ||
    req.headers.get("sec-gpc") === "1",
});

export default function proxy(req: NextRequest) {
  return defineProxy(preview, locale, multisite, redirects, personalize).exec(
    req,
  );
}

export const config = {
  /*
   * Match all paths except for:
   * 1. API route handlers
   * 2. /_next (Next.js internals)
   * 3. /sitecore/api (Sitecore API routes)
   * 4. /- (Sitecore media)
   * 5. /healthz (Health check)
   * 7. all root files inside /public
   */
  matcher: [
    "/",
    "/((?!api/|\\.well-known/|sitemap|robots|llms|_next/|healthz|sitecore/api/|-/|favicon.ico|sc_logo.svg|ai/).*)",
  ],
};
