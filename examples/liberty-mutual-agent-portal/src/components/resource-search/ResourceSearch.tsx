"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PortalLink as Link } from "@/components/ui/portal-link";
import { useSearchParams } from "next/navigation";
import { useSitecore } from "@sitecore-content-sdk/nextjs";
import { useSearch } from "@sitecore-content-sdk/nextjs/search";
import type {
  FacetRequest,
  SearchDocument,
} from "@sitecore-content-sdk/search";
import { usePortal, stateNames } from "@/features/portal/portal-context";
import { resourceHref } from "@/features/portal/content-routes";
import { recordPortalSearch } from "@/lib/portal-analytics";
import { PortalIcon } from "@/components/ui/portal-icon";
import type {
  ResourceSearchConfiguration,
  ResourceSearchProps,
} from "./resource-search.props";

import {
  DEFAULT_RESOURCE_STATE_SCOPE,
  type ResourceStateScope,
} from "@/features/resources/resource-state-scope";
import {
  buildResourceSearchFacet,
  RESOURCE_FACET_NAMES,
  type ResourceFacetSelection,
} from "./resource-search-facets";
const normalizeId = (value: string) =>
  value.replace(/[{}-]/g, "").toLowerCase();

const FACET_LABELS: Record<string, string> = {
  All: "General guidance",
  "small-commercial": "Small business",
  "midsize-large": "Midsize & large business",
  personal: "Personal insurance",
  "farm-ranch": "Farm & ranch",
  "retail-specialty": "Retail specialty",
  "wholesale-specialty": "Wholesale specialty",
  surety: "Surety",
  "independent-agent": "Independent agent",
  wholesale: "Wholesale",
  "auto-home": "Auto & home",
  "contract-commercial-bonds": "Contract & commercial bonds",
};
function facetLabel(value: string) {
  if (value in stateNames) return stateNames[value as keyof typeof stateNames];
  return (
    FACET_LABELS[value] ??
    value.replace(/-/g, " ").replace(/^./, (first) => first.toUpperCase())
  );
}

function parseConfiguration(
  value?: string,
): ResourceSearchConfiguration | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("searchIndex" in parsed) ||
      typeof parsed.searchIndex !== "string" ||
      !parsed.searchIndex.trim()
    )
      return null;
    const mapping =
      "fieldsMapping" in parsed &&
      parsed.fieldsMapping &&
      typeof parsed.fieldsMapping === "object"
        ? parsed.fieldsMapping
        : {};
    return {
      searchIndex: parsed.searchIndex,
      fieldsMapping: Object.fromEntries(
        Object.entries(mapping).filter(
          ([, field]) => typeof field === "string",
        ),
      ),
    };
  } catch {
    return null;
  }
}

function documentText(document: SearchDocument, field: string): string {
  const value = document[field];
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value))
    return value.filter((item) => typeof item === "string").join(" · ");
  return "";
}

/** Search retrieval and facet counts come exclusively from the native SitecoreAI Search index. */
export function Default({ fields, params, rendering }: ResourceSearchProps) {
  const { page } = useSitecore();
  const { data } = usePortal();
  const configuration = useMemo(
    () => parseConfiguration(fields?.search?.value),
    [fields?.search?.value],
  );
  if (!configuration)
    return (
      <section className="panel empty-state" role="status">
        <PortalIcon name="search" width="32" />
        <h2>
          {page.mode.isEditing
            ? "Configure Resource Search"
            : "Search is temporarily unavailable."}
        </h2>
        <p>
          {page.mode.isEditing
            ? "Select a Resource Search datasource with a native index and field mapping."
            : "Please try again shortly, or ask your relationship team for help finding a resource."}
        </p>
      </section>
    );
  return (
    <ResourceSearchExperience
      key={[
        configuration.searchIndex,
        data.agent.id,
        ...data.agent.licensedStates,
      ].join(":")}
      configuration={configuration}
      editing={page.mode.isEditing || page.mode.isPreview}
      id={params?.RenderingIdentifier}
      styles={params?.styles}
      componentId={rendering?.uid ?? params?.RenderingIdentifier ?? ""}
    />
  );
}

function ResourceSearchExperience({
  configuration,
  editing,
  id,
  componentId,
  styles,
}: {
  configuration: ResourceSearchConfiguration;
  editing: boolean;
  id?: string;
  componentId: string;
  styles?: string;
}) {
  const { data, busy, act } = usePortal();
  const { page } = useSitecore();
  const lastMeasuredResults = useRef<SearchDocument[] | null>(null);
  const resultSummary = useRef<HTMLParagraphElement>(null);
  const searchParams = useSearchParams();
  const [input, setInput] = useState(searchParams.get("q") || "");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [pageNumber, setPageNumber] = useState(1);
  const [stateScope, setStateScope] = useState<ResourceStateScope>(
    DEFAULT_RESOURCE_STATE_SCOPE,
  );
  const [selection, setSelection] = useState<ResourceFacetSelection>({});
  const [facet, setFacet] = useState<FacetRequest>(() =>
    buildResourceSearchFacet(
      DEFAULT_RESOURCE_STATE_SCOPE,
      data.agent.licensedStates,
    ),
  );
  const {
    results,
    total,
    totalPages,
    facets,
    isLoading,
    isError,
    isSuccess,
    status,
  } = useSearch<SearchDocument>({
    searchIndexId: configuration.searchIndex,
    query,
    page: pageNumber,
    pageSize: 6,
    locale: "en",
    facet,
    enabled: !editing,
    keepPreviousData: true,
  });
  const mapping = configuration.fieldsMapping;
  const hasFilters =
    stateScope !== DEFAULT_RESOURCE_STATE_SCOPE ||
    Object.values(selection).some(Boolean);
  const stateSummary =
    stateScope === "licensed"
      ? data.agent.licensedStates.length
        ? `${data.agent.licensedStates.map((state) => stateNames[state]).join(", ")} + nationwide`
        : "Nationwide guidance"
      : stateScope === "all"
        ? "All states"
        : stateScope === "All"
          ? "Nationwide guidance"
          : `${stateNames[stateScope]} + nationwide`;
  const loading = !editing && (isLoading || status === "idle");

  useEffect(() => {
    // The hook keeps previous results while fetching. Measure each completed result set once.
    if (
      editing ||
      !isSuccess ||
      loading ||
      lastMeasuredResults.current === results
    )
      return;
    lastMeasuredResults.current = results;
    void recordPortalSearch({
      profile: data.udlIdentity,
      query,
      interactionType: "viewed",
      componentId,
      nullResults: total === 0,
      siteName: page.siteName,
      pageName: page.layout?.sitecore.route?.name,
      language: page.layout?.sitecore.route?.itemLanguage,
    });
  }, [
    editing,
    isSuccess,
    loading,
    results,
    data.udlIdentity,
    query,
    componentId,
    total,
    page,
  ]);

  function recordResultClick() {
    if (editing || loading) return;
    void recordPortalSearch({
      profile: data.udlIdentity,
      query,
      interactionType: "clicked",
      componentId,
      nullResults: false,
      siteName: page.siteName,
      pageName: page.layout?.sitecore.route?.name,
      language: page.layout?.sitecore.route?.itemLanguage,
    });
  }

  function search(value: string) {
    setInput(value);
    setQuery(value.trim());
    setPageNumber(1);
    setFacet((current) => ({ ...current }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(input);
  }
  function selectFacet(
    name: (typeof RESOURCE_FACET_NAMES)[number],
    value: string,
  ) {
    const next = { ...selection, [name]: value };
    setSelection(next);
    setPageNumber(1);
    setFacet(
      buildResourceSearchFacet(stateScope, data.agent.licensedStates, next),
    );
  }
  function selectStateScope(scope: ResourceStateScope) {
    setStateScope(scope);
    setPageNumber(1);
    setFacet(
      buildResourceSearchFacet(scope, data.agent.licensedStates, selection),
    );
  }
  function changePage(nextPage: number) {
    setPageNumber(nextPage);
    resultSummary.current?.focus({ preventScroll: true });
    resultSummary.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }
  function clearFilters() {
    setSelection({});
    setPageNumber(1);
    setStateScope(DEFAULT_RESOURCE_STATE_SCOPE);
    setFacet(
      buildResourceSearchFacet(
        DEFAULT_RESOURCE_STATE_SCOPE,
        data.agent.licensedStates,
      ),
    );
  }

  return (
    <div className={`resource-search-component ${styles || ""}`} id={id}>
      <section className="resource-search-hero">
        <span className="eyebrow">YOUR KNOWLEDGE ADVANTAGE</span>
        <h2>What can we help you find?</h2>
        <p>
          Find practical guidance for the accounts, industries, and states you
          work with.
        </p>
        <form className="native-search-form" onSubmit={submit} role="search">
          <div className="large-search input-with-icon">
            <PortalIcon name="search" width="20" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Try “workers compensation” or “renewal checklist”"
              aria-label="Search the resource library"
              maxLength={250}
            />
          </div>
          <button
            type="submit"
            className="button button-primary"
            disabled={editing}
          >
            Search
            <PortalIcon name="arrow" width="16" />
          </button>
        </form>
        <div className="suggested-searches">
          <span>Popular:</span>
          {["Workers compensation", "Renewal", "Small business"].map((term) => (
            <button key={term} onClick={() => search(term)} disabled={editing}>
              {term}
            </button>
          ))}
        </div>
      </section>
      <div className="native-search-filters" aria-label="Filter search results">
        <label>
          <span>Risk state</span>
          <select
            aria-label="Risk state"
            value={stateScope}
            disabled={editing || loading}
            onChange={(event) =>
              selectStateScope(event.target.value as ResourceStateScope)
            }
          >
            <option value="licensed">My licensed states</option>
            <option value="all">All states</option>
            {Object.entries(stateNames).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
            <option value="All">Nationwide guidance only</option>
          </select>
        </label>
        {RESOURCE_FACET_NAMES.map((name) => {
          const values =
            facets?.find((item) => item.name === name)?.value || [];
          return (
            <label key={name}>
              <span>{name}</span>
              <select
                aria-label={name}
                value={selection[name] || ""}
                disabled={editing || loading}
                onChange={(event) => selectFacet(name, event.target.value)}
              >
                <option value="">
                  All{" "}
                  {name === "Resource type"
                    ? "resource types"
                    : name === "Business family"
                      ? "business families"
                      : name === "Distribution channel"
                        ? "channels"
                        : "products"}
                </option>
                {selection[name] &&
                  !values.some(
                    (value) => String(value.text) === selection[name],
                  ) && (
                    <option value={selection[name]}>
                      {facetLabel(selection[name]!)}
                    </option>
                  )}
                {values.map((value) => (
                  <option key={String(value.text)} value={String(value.text)}>
                    {facetLabel(String(value.text))} ({value.count})
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <div className="native-search-summary">
        <p role="status" aria-live="polite" tabIndex={-1} ref={resultSummary}>
          {editing
            ? "Search results appear in the signed-in site."
            : loading
              ? "Finding relevant resources…"
              : isError
                ? "Search could not be completed."
                : `${total} ${total === 1 ? "resource" : "resources"}${query ? ` for “${query}”` : " to explore"}`}
        </p>
        <div>
          <span>
            <PortalIcon name="pin" width="14" />
            {stateSummary}
          </span>
          {hasFilters && (
            <button onClick={clearFilters}>
              Clear filters
              <PortalIcon name="close" width="13" />
            </button>
          )}
        </div>
      </div>
      {isError ? (
        <section className="panel empty-state" role="alert">
          <PortalIcon name="search" width="32" />
          <h3>Let&apos;s try that again.</h3>
          <p>
            The resource search could not be completed. Your saved resources are
            safe.
          </p>
          <button
            className="button button-secondary"
            onClick={() => setFacet((current) => ({ ...current }))}
          >
            Retry search
          </button>
        </section>
      ) : (
        <div className="resource-grid" aria-busy={loading}>
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <div className="search-skeleton" key={index} aria-hidden="true">
                  <div />
                  <span />
                  <span />
                  <span />
                </div>
              ))
            : results.map((result, index) => {
                const itemId = documentText(result, "sc_item_id");
                const resource = data.resources.find(
                  (item) => normalizeId(item.id) === normalizeId(itemId),
                );
                const title =
                  documentText(result, mapping.title || "Title") ||
                  resource?.title ||
                  "Resource";
                const description =
                  documentText(
                    result,
                    mapping.description || mapping.summary || "summary",
                  ) ||
                  resource?.description ||
                  "";
                const type =
                  documentText(
                    result,
                    mapping.type || mapping.resourceType || "resourceType",
                  ) ||
                  resource?.type ||
                  "Guide";
                const stateValue =
                  documentText(result, mapping.state || "state") ||
                  (resource?.states.length === 3
                    ? "All states"
                    : resource?.states.join(" · ")) ||
                  "All states";
                const state =
                  stateValue === "All" ? "All states" : facetLabel(stateValue);
                const href = resource ? resourceHref(resource) : undefined;
                const saved = resource
                  ? data.favorites.includes(resource.id)
                  : false;
                return (
                  <article
                    className="library-card"
                    key={itemId || `${title}-${index}`}
                  >
                    <div className={`library-art library-art-${index % 4}`}>
                      <PortalIcon
                        name={
                          type === "State guidance"
                            ? "pin"
                            : type === "Checklist"
                              ? "file"
                              : "book"
                        }
                        width="42"
                        height="42"
                      />
                      <span>
                        {type === "State guidance"
                          ? "A local perspective."
                          : index % 2
                            ? "Knowledge that works."
                            : "Ready for what’s next."}
                      </span>
                      {resource && (
                        <button
                          className={`save-button ${saved ? "saved" : ""}`}
                          aria-label={`${saved ? "Unsave" : "Save"} ${title}`}
                          aria-pressed={saved}
                          disabled={busy || editing}
                          onClick={() =>
                            act(
                              {
                                type: "toggle-favorite",
                                resourceId: resource.id,
                              },
                              saved
                                ? "Resource removed from saved items."
                                : "Resource saved.",
                            )
                          }
                        >
                          <PortalIcon name="bookmark" width="17" />
                        </button>
                      )}
                    </div>
                    <div className="library-copy">
                      <span className="eyebrow">
                        {type}
                        {resource ? ` · ${resource.readMinutes} MIN READ` : ""}
                      </span>
                      <h2>
                        {href ? (
                          <Link href={href} onClick={recordResultClick}>
                            {title}
                          </Link>
                        ) : (
                          title
                        )}
                      </h2>
                      <p>{description}</p>
                      <footer>
                        <span>{state}</span>
                        {href ? (
                          <Link
                            className="text-link small"
                            href={href}
                            onClick={recordResultClick}
                          >
                            Read resource
                            <PortalIcon name="arrow" width="15" />
                          </Link>
                        ) : (
                          <span>Resource details are being updated.</span>
                        )}
                      </footer>
                    </div>
                  </article>
                );
              })}
        </div>
      )}
      {!editing && !loading && isSuccess && total === 0 && (
        <section className="panel empty-state">
          <PortalIcon name="search" width="32" />
          <h3>Let&apos;s try another angle.</h3>
          <p>
            Try a broader term, a different business family, or clear a filter.
          </p>
          <button
            className="button button-secondary"
            onClick={() => {
              clearFilters();
              search("");
            }}
          >
            Reset search
          </button>
        </section>
      )}
      {!editing && isSuccess && totalPages > 1 && (
        <nav className="search-pagination" aria-label="Search result pages">
          <button
            className="button button-secondary"
            onClick={() => changePage(pageNumber - 1)}
            disabled={loading || pageNumber <= 1}
          >
            <PortalIcon name="arrow" width="15" className="back-arrow" />
            Previous
          </button>
          <span>
            Page {pageNumber} of {totalPages}
          </span>
          <button
            className="button button-secondary"
            onClick={() => changePage(pageNumber + 1)}
            disabled={loading || pageNumber >= totalPages}
          >
            Next
            <PortalIcon name="arrow" width="15" />
          </button>
        </nav>
      )}
    </div>
  );
}
