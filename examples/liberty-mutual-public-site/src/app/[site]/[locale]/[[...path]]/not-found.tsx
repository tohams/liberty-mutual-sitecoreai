import Link from "next/link";
import { ErrorPage, getCachedPageParams } from "@sitecore-content-sdk/nextjs";
import client from "lib/delivery-client";
import scConfig from "sitecore.config";
import Layout from "src/Layout";
import Providers from "src/Providers";
import { NextIntlClientProvider } from "next-intl";

export default async function NotFound() {
  const { site, locale } = getCachedPageParams();
  const page = await client
    .getErrorPage(ErrorPage.NotFound, {
      site: site || scConfig.defaultSite,
      locale: locale || scConfig.defaultLanguage,
    })
    .catch(() => null);
  if (page)
    return (
      <NextIntlClientProvider>
        <Providers page={page}>
          <Layout page={page} />
        </Providers>
      </NextIntlClientProvider>
    );
  return (
    <div className="public-container public-section">
      <h1>Page not found</h1>
      <p>We could not find this page.</p>
      <Link href="/">Return home</Link>
    </div>
  );
}
