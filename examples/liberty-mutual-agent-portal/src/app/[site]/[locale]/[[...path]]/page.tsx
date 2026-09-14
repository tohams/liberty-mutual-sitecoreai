import { isDesignLibraryPreviewData } from "@sitecore-content-sdk/nextjs/editing";
import {
  AppPlaceholder,
  DesignLibraryApp,
  EditingScripts,
  getPersonalizedRewriteData,
} from "@sitecore-content-sdk/nextjs";
import { notFound, redirect } from "next/navigation";
import { draftMode, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import client from "@/lib/sitecore-client";
import { getSession } from "@/server/auth/session";
import { getPortalBootstrap, getEditorBootstrap } from "@/server/data/portal";
import { PortalError } from "@/server/errors";
import { PortalApp } from "@/features/portal/PortalApp";
import { PortalEditorProvider } from "@/features/portal/PortalEditorProvider";
import components from ".sitecore/component-map";
import Providers from "@/Providers";
import scConfig from "sitecore.config";
import { PortalTracking } from "@/features/analytics/PortalTracking";
import { portalContentPath } from "@/features/portal/content-routes";
import {
  getPortalPlaceholders,
  type PortalPlaceholderPlacement,
} from "@/features/portal/portal-placeholders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ site: string; locale: string; path?: string[] }>;
};

// Identity-dependent page variants must not be cached across agents.
const uncachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

export default async function PortalPage({ params }: PageProps) {
  const { site, locale, path = [] } = await params;
  if (site !== scConfig.defaultSite || locale !== scConfig.defaultLanguage)
    notFound();
  const draft = await draftMode();
  const session = await getSession();
  if (!draft.isEnabled && !session) redirect("/login");

  // Draft Mode is minted by the SDK editing handler after it verifies the editing secret.
  // A query-string switch alone cannot grant editor access to agency records.
  const previewData = draft.isEnabled
    ? client.getPreviewData(await headers())
    : undefined;
  const route = "/" + client.parsePath(path).replace(/^\/+/, "");
  const contentPath = portalContentPath(route, path);
  // Operational aliases change the CMS path, but must retain the SDK's native variant selection.
  const personalize = getPersonalizedRewriteData(path.join("/"));
  const page = draft.isEnabled
    ? isDesignLibraryPreviewData(previewData)
      ? await client.getDesignLibraryData(previewData, { fetch: uncachedFetch })
      : await client.getPreview(previewData, { fetch: uncachedFetch })
    : await client.getPage(
        contentPath,
        { site, locale, personalize },
        { fetch: uncachedFetch },
      );
  if (!page) notFound();
  if (!page.layout?.sitecore?.route) {
    throw new Error(
      "Sitecore did not return a published layout for this portal route.",
    );
  }

  let data;
  try {
    data = draft.isEnabled
      ? getEditorBootstrap()
      : await getPortalBootstrap(session!);
  } catch (error) {
    if (error instanceof PortalError && error.status === 401)
      redirect("/login");
    throw error;
  }
  const placements = getPortalPlaceholders(
    route,
    page.layout.sitecore.route,
    page.mode,
  );
  const renderPlaceholder = (placement?: PortalPlaceholderPlacement) =>
    placement ? (
      <AppPlaceholder page={page} componentMap={components} {...placement} />
    ) : undefined;
  const guidance = renderPlaceholder(placements.guidance);
  const resourcesSearch = placements.resourceSearch ? (
    <>
      {renderPlaceholder(placements.resourceSearch)}
      {guidance}
    </>
  ) : undefined;
  const pageContent = placements.resourceArticle
    ? renderPlaceholder(placements.resourceArticle)
    : /^\/products\/.+/.test(route)
      ? guidance
      : undefined;
  return (
    <NextIntlClientProvider locale={locale} messages={{}}>
      <Providers page={page}>
        <EditingScripts />
        <PortalTracking
          identity={data.udlIdentity}
          runId={data.session.runId}
          path={route}
        />
        {page.mode.isDesignLibrary ? (
          <PortalEditorProvider data={data}>
            <DesignLibraryApp
              page={page}
              rendering={page.layout.sitecore.route}
              componentMap={components}
              loadServerImportMap={() => import(".sitecore/import-map.server")}
            />
          </PortalEditorProvider>
        ) : (
          <PortalApp
            initialData={data}
            isEditing={draft.isEnabled}
            route={route === "/" ? "/workspace" : route}
            workspaceEditorial={resourcesSearch ? undefined : guidance}
            resourcesSearch={resourcesSearch}
            productsSpotlight={renderPlaceholder(placements.productSpotlight)}
            pageContent={pageContent}
          />
        )}
      </Providers>
    </NextIntlClientProvider>
  );
}
