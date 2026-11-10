import "server-only";
import { AppPlaceholder } from "@sitecore-content-sdk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import components from ".sitecore/component-map";
import Providers from "@/Providers";
import { PortalApp } from "@/features/portal/PortalApp";
import {
  getPortalPlaceholders,
  type PortalPlaceholderPlacement,
} from "@/features/portal/portal-placeholders";
import type { AudiencePreviewPage } from "@/server/marketplace/audience-preview-pages";
import { getAudiencePreviewBootstrap } from "./bootstrap";
import type { AudiencePreviewViewSession } from "./preview-sessions";
import { getAudiencePreviewLayout } from "./preview-client";
import styles from "./view.module.css";

export async function AudiencePreviewView({
  session,
  selected,
}: {
  session: AudiencePreviewViewSession;
  selected: AudiencePreviewPage;
}) {
  const page = await getAudiencePreviewLayout(selected, session.decisions);
  const data = getAudiencePreviewBootstrap(session.input);
  const route = selected.path;
  const placements = getPortalPlaceholders(
    route,
    page.layout.sitecore.route!,
    page.mode,
  );
  const renderPlaceholder = (placement?: PortalPlaceholderPlacement) =>
    placement ? (
      <AppPlaceholder page={page} componentMap={components} {...placement} />
    ) : undefined;
  const guidance = placements.guidance ? (
    <div className="cms-component-stack">
      {renderPlaceholder(placements.guidance)}
    </div>
  ) : undefined;
  const resourcesSearch = placements.resourceSearch ? (
    <div className="cms-component-stack">
      {renderPlaceholder(placements.resourceSearch)}
      {guidance}
    </div>
  ) : undefined;
  const pageContent = placements.campaignPage
    ? renderPlaceholder(placements.campaignPage)
    : placements.resourceArticle
      ? renderPlaceholder(placements.resourceArticle)
      : /^\/products\/.+/.test(route)
        ? placements.productDetails
          ? renderPlaceholder(placements.productDetails)
          : guidance
        : undefined;
  return (
    <NextIntlClientProvider locale={selected.language} messages={{}}>
      <Providers page={page}>
        <div className={styles.preview}>
          <header className={styles.bar}>
            <strong>Audience Preview</strong>
            <span className={styles.summary}>
              {selected.name} · {data.agent.roleLabel} ·{" "}
              {session.input.licensedStates.length
                ? session.input.licensedStates.join(", ")
                : "No licensed states"}
            </span>
            <span className={styles.readOnly}>Read-only</span>
          </header>
          <div className={styles.portal} inert>
            <PortalApp
              initialData={data}
              isEditing
              route={route}
              workspaceEditorial={resourcesSearch ? undefined : guidance}
              agencyPriorities={renderPlaceholder(placements.agencyPriorities)}
              sharedDisclosure={renderPlaceholder(placements.sharedDisclosure)}
              resourcesSearch={resourcesSearch}
              productsSpotlight={renderPlaceholder(placements.productSpotlight)}
              supportForm={renderPlaceholder(placements.supportForm)}
              pageContent={pageContent}
            />
          </div>
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
