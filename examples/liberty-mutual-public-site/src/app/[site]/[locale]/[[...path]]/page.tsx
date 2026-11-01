import { isDesignLibraryPreviewData } from "@sitecore-content-sdk/nextjs/editing";
import { notFound } from "next/navigation";
import { draftMode, headers as nextHeaders } from "next/headers";
import { SiteInfo } from "@sitecore-content-sdk/nextjs";
import sites from ".sitecore/sites.json";
import { routing } from "src/i18n/routing";
import scConfig from "sitecore.config";
import previewClient from "src/lib/sitecore-client";
import deliveryClient from "src/lib/delivery-client";
import Layout, { RouteFields } from "src/Layout";
import components from ".sitecore/component-map";
import Providers from "src/Providers";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { getBaseUrl } from "lib/utils";

type PageProps = {
  params: Promise<{
    site: string;
    locale: string;
    path?: string[];
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { site, locale, path } = await params;
  if (site !== scConfig.defaultSite) notFound();
  const draft = await draftMode();

  // Set site and locale to be available in src/i18n/request.ts for fetching the dictionary
  setRequestLocale(`${site}_${locale}`);

  // Fetch the page data from Sitecore
  let page;
  if (draft.isEnabled) {
    const headers = await nextHeaders();
    const previewData = previewClient.getPreviewData(headers);
    if (isDesignLibraryPreviewData(previewData)) {
      page = await previewClient.getDesignLibraryData(previewData);
    } else {
      page = await previewClient.getPreview(previewData);
    }
  } else {
    page = await deliveryClient.getPage(path ?? [], { site, locale });
  }

  // If the page is not found, return a 404
  if (!page) {
    notFound();
  }

  // Resolve component data against the same source used for the page.
  const contentClient = draft.isEnabled ? previewClient : deliveryClient;
  const componentProps = await contentClient.getComponentData(
    page.layout,
    {},
    components,
  );

  return (
    <NextIntlClientProvider>
      <Providers page={page} componentProps={componentProps}>
        <Layout page={page} />
      </Providers>
    </NextIntlClientProvider>
  );
}

// This function gets called at build and export time to determine
// pages for SSG ("paths", as tokenized array).
export const generateStaticParams = async () => {
  if (process.env.NODE_ENV !== "development" && scConfig.generateStaticPaths) {
    // Filter sites to only include the sites this starter is designed to serve.
    // This prevents cross-site build errors when multiple starters share the same XM Cloud instance.
    const defaultSite = scConfig.defaultSite;
    const allowedSites = defaultSite
      ? sites
          .filter((site: SiteInfo) => site.name === defaultSite)
          .map((site: SiteInfo) => site.name)
      : sites.map((site: SiteInfo) => site.name);
    return await deliveryClient.getAppRouterStaticParams(
      allowedSites,
      routing.locales.slice(),
    );
  }
  return [];
};

// Metadata fields for the page.
export const generateMetadata = async ({ params }: PageProps) => {
  const baseUrl = getBaseUrl();

  const { path, site, locale } = await params;
  if (site !== scConfig.defaultSite) return {};

  // Canonical URL: base URL + content path only (no site/locale segments)
  const pathSegment = path?.length ? `/${path.join("/")}` : "";
  const canonicalUrl = baseUrl ? `${baseUrl}${pathSegment}` : undefined;

  // The same call as for rendering the page. Should be cached by default react behavior
  const page = await deliveryClient.getPage(path ?? [], { site, locale });
  const fields = page?.layout.sitecore.route?.fields as RouteFields;

  // Parse keywords from comma-separated string to array
  const keywordsString = fields?.metadataKeywords?.value?.toString() || "";
  const keywords = keywordsString
    ? keywordsString.split(",").map((k: string) => k.trim())
    : [];

  return {
    ...(process.env.VERCEL_ENV === "preview" && {
      robots: { index: false, follow: false },
    }),
    title:
      fields?.metadataTitle?.value?.toString() ||
      fields?.pageTitle?.value?.toString() ||
      fields?.Title?.value?.toString() ||
      undefined,
    description:
      fields?.ogDescription?.value?.toString() ||
      fields?.metadataDescription?.value?.toString() ||
      undefined,
    keywords,
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
    openGraph: {
      title:
        fields?.ogTitle?.value?.toString() ||
        fields?.metadataTitle?.value?.toString() ||
        fields?.pageTitle?.value?.toString() ||
        undefined,
      description:
        fields?.ogDescription?.value?.toString() ||
        fields?.metadataDescription?.value?.toString() ||
        undefined,
      url: canonicalUrl,
      images: fields?.ogImage?.value?.src || fields?.thumbnailImage?.value?.src,
    },
  };
};
