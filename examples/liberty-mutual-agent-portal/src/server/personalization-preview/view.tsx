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
import type { PersonalizationPreviewPage } from "./types";
import type { PersonalizationPreviewViewSession } from "./preview-sessions";
import { getPersonalizationPreviewBootstrap } from "./bootstrap";
import { getPersonalizationPreviewLayout } from "./preview-client";
import { revalidatePersonalizationPreviewSession } from "./service";
import styles from "./view.module.css";

export async function PersonalizationPreviewView({
  session,
  selected,
  accessToken,
}: {
  session: PersonalizationPreviewViewSession;
  selected: PersonalizationPreviewPage;
  accessToken: string;
}) {
  const { decisions, selectedExperiences } =
    await revalidatePersonalizationPreviewSession(
      session,
      selected,
      accessToken,
    );
  const page = await getPersonalizationPreviewLayout(selected, decisions);
  const route = selected.path;
  const placements = getPortalPlaceholders(
    route,
    page.layout.sitecore.route!,
    page.mode,
  );
  const render = (placement?: PortalPlaceholderPlacement) =>
    placement ? (
      <AppPlaceholder page={page} componentMap={components} {...placement} />
    ) : undefined;
  const guidance = placements.guidance ? (
    <div className="cms-component-stack">{render(placements.guidance)}</div>
  ) : undefined;
  const resourcesSearch = placements.resourceSearch ? (
    <div className="cms-component-stack">
      {render(placements.resourceSearch)}
      {guidance}
    </div>
  ) : undefined;
  const pageContent = placements.campaignPage
    ? render(placements.campaignPage)
    : placements.resourceArticle
      ? render(placements.resourceArticle)
      : /^\/products\/.+/.test(route)
        ? placements.productDetails
          ? render(placements.productDetails)
          : guidance
        : undefined;
  return (
    <NextIntlClientProvider locale={selected.language} messages={{}}>
      <Providers page={page}>
        <div className={styles.preview}>
          <header className={styles.bar}>
            <div>
              <strong>Personalization Preview</strong>
              <span className={styles.page}>{selected.name}</span>
            </div>
            <span className={styles.readOnly}>Read-only</span>
            {selectedExperiences.length > 0 && (
              <ul className={styles.selections}>
                {selectedExperiences.map((experience) => (
                  <li key={experience.flowId}>
                    <strong>{experience.flowName}</strong>
                    <span>{experience.optionLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </header>
          <div className={styles.portal} inert>
            <PortalApp
              initialData={getPersonalizationPreviewBootstrap()}
              isEditing
              route={route}
              workspaceEditorial={resourcesSearch ? undefined : guidance}
              agencyPriorities={render(placements.agencyPriorities)}
              sharedDisclosure={render(placements.sharedDisclosure)}
              resourcesSearch={resourcesSearch}
              productsSpotlight={render(placements.productSpotlight)}
              supportForm={render(placements.supportForm)}
              pageContent={pageContent}
            />
          </div>
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
