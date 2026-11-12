"use client";

import {
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import NextLink from "next/link";
import config from "sitecore.config";
import { usePathname, useSearchParams } from "next/navigation";
import { RichText, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { useSearch } from "@sitecore-content-sdk/nextjs/search";
import type { SearchDocument } from "@sitecore-content-sdk/search";
import {
  recordPublicEvent,
  recordSearchInteraction,
} from "src/features/analytics/public-analytics";
import { normalizeSearchQuestion } from "src/features/search/normalize-search-question";
import { supportedQuestionResults } from "src/features/search/question-evidence";
import { createSearchViewTracker } from "src/features/search/search-view-tracking";
import { CONSENT_EVENT } from "src/features/consent/consent";
import type {
  PublicSearchConfiguration,
  PublicSearchProps,
} from "./public-search.props";

function parseConfiguration(value?: string): PublicSearchConfiguration | null {
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

function text(document: SearchDocument, name?: string): string {
  if (!name) return "";
  const value = document[name];
  if (Array.isArray(value))
    return value.filter((part) => typeof part === "string").join(" · ");
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function publicHref(value: string): string | null {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export const Default = ({ fields, params, rendering }: PublicSearchProps) => {
  const { page } = useSitecore();
  const configuration = useMemo(
    () => parseConfiguration(fields?.search?.value),
    [fields?.search?.value],
  );
  return (
    <section
      className={`component public-section public-search ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-container">
        <div className="public-search__heading">
          <Text tag="h2" field={fields?.heading} />
          <RichText className="public-prose" field={fields?.introduction} />
        </div>
        {configuration ? (
          <Suspense fallback={<p role="status">Loading search…</p>}>
            <SearchExperience
              key={configuration.searchIndex}
              configuration={configuration}
              editing={!page.mode.isNormal}
              componentId={rendering.uid || ""}
              siteName={page.siteName || config.defaultSite}
            />
          </Suspense>
        ) : (
          <p role="status">
            Search is temporarily unavailable. Please try again shortly, or{" "}
            <NextLink href="/contact-an-agent">speak with an agent</NextLink>.
          </p>
        )}
      </div>
    </section>
  );
};

function SearchExperience({
  configuration,
  editing,
  componentId,
  siteName,
}: {
  configuration: PublicSearchConfiguration;
  editing: boolean;
  componentId: string;
  siteName: string;
}) {
  const inputId = useId();
  const searchParams = useSearchParams();
  const pathname = usePathname().replace(/\/$/, "");
  const [input, setInput] = useState(searchParams.get("q") || "");
  const [query, setQuery] = useState(input);
  const [searchRun, setSearchRun] = useState(0);
  const [consentRevision, setConsentRevision] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewTracker] = useState(createSearchViewTracker);
  const [resultsBeforeQuery, setResultsBeforeQuery] = useState<
    SearchDocument[] | null
  >(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const nativeQuery = normalizeSearchQuestion(query);
  const needsSubject = Boolean(query.trim() && !nativeQuery);
  const {
    results,
    total: nativeTotal,
    isLoading,
    isError,
    isSuccess,
    status,
  } = useSearch<SearchDocument>({
    searchIndexId: configuration.searchIndex,
    query: nativeQuery,
    // Retrieve native ranked candidates once, then page the evidence-supported results.
    page: 1,
    pageSize: 100,
    locale: "en",
    enabled: !editing && !needsSubject,
    keepPreviousData: true,
  });
  // The SDK retains the old array until its effect starts the next request.
  // Keep that array hidden and unmeasured for a different native query.
  const awaitingCurrentResults = resultsBeforeQuery === results;
  const loading =
    !editing &&
    !needsSubject &&
    (isLoading || status === "idle" || awaitingCurrentResults);
  const mapping = configuration.fieldsMapping;
  const supported = supportedQuestionResults(
    query,
    results,
    (document) =>
      [
        mapping.title,
        mapping.description,
        "question",
        "body",
        mapping.product,
        mapping.state,
      ]
        .map((name) => text(document, name))
        .join("\n"),
    (document) => {
      const value = mapping.state ? document[mapping.state] : undefined;
      return Array.isArray(value)
        ? value.filter((part) => typeof part === "string")
        : text(document, mapping.state);
    },
  );
  const browsing = !query.trim();
  const browseCandidates = browsing
    ? supported.filter((document) => !text(document, "question").trim())
    : supported;
  const allCards = browseCandidates.flatMap((document) => {
    const href = publicHref(text(document, mapping.link));
    const title = text(document, mapping.title);
    return href && title ? [{ document, href, title }] : [];
  });
  if (browsing)
    allCards.sort((left, right) => left.title.localeCompare(right.title, "en"));
  // A collection page browses its own descendants; typed searches remain site-wide.
  const collectionCards = browsing
    ? allCards.filter(({ href }) =>
        new URL(href, "https://content.invalid").pathname.startsWith(
          `${pathname}/`,
        ),
      )
    : [];
  const displayCards = collectionCards.length ? collectionCards : allCards;
  const total = displayCards.length;
  const totalPages = Math.ceil(total / 6);
  const resultCards = displayCards.slice(
    (currentPage - 1) * 6,
    currentPage * 6,
  );
  useEffect(() => {
    const consentChanged = () => setConsentRevision((value) => value + 1);
    window.addEventListener(CONSENT_EVENT, consentChanged);
    return () => window.removeEventListener(CONSENT_EVENT, consentChanged);
  }, []);
  const viewKey = JSON.stringify([searchRun, query, siteName, componentId]);
  useEffect(() => {
    if (editing || needsSubject || !isSuccess || loading) return;
    void viewTracker.record(viewKey, () =>
      recordSearchInteraction({
        query,
        componentId,
        siteName,
        interactionType: "viewed",
        nullResults: total === 0,
      }),
    );
  }, [
    editing,
    needsSubject,
    isSuccess,
    loading,
    results,
    query,
    total,
    componentId,
    siteName,
    viewTracker,
    viewKey,
    consentRevision,
  ]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = input.trim();
    setResultsBeforeQuery(
      normalizeSearchQuestion(nextQuery) === nativeQuery ? null : results,
    );
    setQuery(nextQuery);
    setSearchRun((value) => value + 1);
    setCurrentPage(1);
    const url = new URL(window.location.href);
    if (input.trim()) url.searchParams.set("q", input.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };
  const resultClick = (href: string, rank: number) => {
    void recordSearchInteraction({
      query,
      componentId,
      siteName,
      interactionType: "clicked",
      nullResults: false,
    });
    void recordPublicEvent("SEARCH_RESULT_CLICK", {
      query,
      destination: href,
      rank,
      componentId,
    });
  };
  const changePage = (value: number) => {
    setCurrentPage(value);
    summaryRef.current?.focus();
  };
  return (
    <>
      <form className="public-search__form" onSubmit={submit} role="search">
        <div>
          <label htmlFor={inputId}>keyword(s)</label>
          <input
            id={inputId}
            name="q"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search"
            maxLength={250}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="public-button">
          Search
        </button>
      </form>
      {editing ? (
        <p className="public-search__status">
          Search results are available on the website.
        </p>
      ) : (
        <>
          <p
            className="public-search__status"
            ref={summaryRef}
            tabIndex={-1}
            aria-live="polite"
          >
            {needsSubject
              ? "Enter a search term."
              : loading
                ? "Searching…"
                : isError
                  ? "We could not complete this search."
                  : `${total} ${total === 1 ? "result" : "results"}${query ? ` for “${query}”` : ""}`}
          </p>
          {needsSubject ? (
            <div className="public-search__empty">
              <h2>Enter a search term</h2>
              <p>Try a topic or product name.</p>
            </div>
          ) : isError ? (
            <div className="public-search__empty">
              <h2>Please try again</h2>
              <p>
                You can search again, or{" "}
                <NextLink
                  href={`/contact-an-agent?question=${encodeURIComponent(query)}`}
                >
                  ask an agent for help
                </NextLink>
                .
              </p>
            </div>
          ) : !loading && total === 0 ? (
            <div className="public-search__empty">
              <h2>No results found</h2>
              <p>
                We couldn’t find information matching your search. Try another
                search term, or browse our{" "}
                <NextLink href="/insurance-resources">
                  insurance resources
                </NextLink>
                .
              </p>
              <NextLink
                className="public-button"
                href={`/contact-an-agent?question=${encodeURIComponent(query)}`}
              >
                Contact an agent
              </NextLink>
            </div>
          ) : (
            <div className="public-search__results" aria-busy={loading}>
              {!loading &&
                resultCards.map(({ document, href, title }, index) => {
                  const description = text(document, mapping.description);
                  const isAnswer = Boolean(text(document, "question").trim());
                  return (
                    <article
                      className={`public-search-card${isAnswer ? " public-search-card--answer" : ""}`}
                      key={`${href}-${index}`}
                    >
                      {isAnswer && (
                        <p className="public-eyebrow public-search-card__answer-label">
                          Answer
                        </p>
                      )}
                      <h2>
                        <NextLink
                          href={href}
                          onClick={() =>
                            resultClick(href, index + 1 + (currentPage - 1) * 6)
                          }
                        >
                          {title}
                        </NextLink>
                      </h2>
                      {description && <p>{description}</p>}
                    </article>
                  );
                })}
            </div>
          )}
          {!loading && !isError && nativeTotal > 100 && (
            <p className="public-search__status">
              Try a more specific search term.
            </p>
          )}
          {!needsSubject && !loading && !isError && totalPages > 1 && (
            <nav
              className="public-search__pagination"
              aria-label="Search result pages"
            >
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => changePage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => changePage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
