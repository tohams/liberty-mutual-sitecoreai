import type { Field, ImageField, Page } from "@sitecore-content-sdk/nextjs";
import { AppPlaceholder, DesignLibraryApp } from "@sitecore-content-sdk/nextjs";
import Scripts from "src/Scripts";
import SitecoreStyles from "components/content-sdk/SitecoreStyles";
import ConsentPreferences from "components/content-sdk/ConsentPreferences";
import componentMap from ".sitecore/component-map";

export interface RouteFields {
  [key: string]: unknown;
  Title?: Field<string>;
  pageTitle?: Field<string>;
  metadataTitle?: Field<string>;
  metadataKeywords?: Field<string>;
  metadataDescription?: Field<string>;
  ogTitle?: Field<string>;
  ogDescription?: Field<string>;
  ogImage?: ImageField;
  thumbnailImage?: ImageField;
}

export default function Layout({ page }: { page: Page }) {
  const { layout, mode } = page;
  const route = layout.sitecore.route;
  return (
    <>
      <Scripts />
      <SitecoreStyles layoutData={layout} />
      <div
        className={`public-site ${mode.isEditing ? "editing-mode" : "normal-mode"}`}
      >
        {mode.isDesignLibrary ? (
          route && (
            <DesignLibraryApp
              page={page}
              rendering={route}
              componentMap={componentMap}
              loadServerImportMap={() => import(".sitecore/import-map.server")}
            />
          )
        ) : (
          <>
            <a className="public-skip-link" href="#main-content">
              Skip to content
            </a>
            <header className="public-site__header">
              {route && (
                <AppPlaceholder
                  page={page}
                  componentMap={componentMap}
                  name="headless-header"
                  rendering={route}
                />
              )}
            </header>
            <main id="main-content" tabIndex={-1}>
              {route && (
                <AppPlaceholder
                  page={page}
                  componentMap={componentMap}
                  name="headless-main"
                  rendering={route}
                />
              )}
            </main>
            <footer>
              {route && (
                <AppPlaceholder
                  page={page}
                  componentMap={componentMap}
                  name="headless-footer"
                  rendering={route}
                />
              )}
            </footer>
            {mode.isNormal && <ConsentPreferences />}
          </>
        )}
      </div>
    </>
  );
}
