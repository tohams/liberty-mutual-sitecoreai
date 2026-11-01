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
import { useSearchParams } from "next/navigation";
import { RichText, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { useSearch } from "@sitecore-content-sdk/nextjs/search";
import type { SearchDocument } from "@sitecore-content-sdk/search";
import {
  recordPublicEvent,
  recordSearchInteraction,
} from "src/features/analytics/public-analytics";
import { normalizeSearchQuestion } from "src/features/search/normalize-search-question";
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

function displayDate(value: string): string {
  if (!value) return "";
  const normalized = value.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z",
  );
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf())
    ? ""
    : date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
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
  const [input, setInput] = useState(searchParams.get("q") || "");
  const [query, setQuery] = useState(input);
  const [currentPage, setCurrentPage] = useState(1);
  const measured = useRef<SearchDocument[] | null>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const nativeQuery = normalizeSearchQuestion(query);
  const needsSubject = Boolean(query.trim() && !nativeQuery);
  const { results, total, totalPages, isLoading, isError, isSuccess, status } =
    useSearch<SearchDocument>({
      searchIndexId: configuration.searchIndex,
      query: nativeQuery,
      page: currentPage,
      pageSize: 6,
      locale: "en",
      enabled: !editing && !needsSubject,
      keepPreviousData: true,
    });
  const loading = !editing && !needsSubject && (isLoading || status === "idle");
  const mapping = configuration.fieldsMapping;
  const resultCards = results.flatMap((document) => {
    const href = publicHref(text(document, mapping.link));
    const title = text(document, mapping.title);
    return href && title ? [{ document, href, title }] : [];
  });
  useEffect(() => {
    if (
      editing ||
      needsSubject ||
      !isSuccess ||
      loading ||
      measured.current === results
    )
      return;
    measured.current = results;
    void recordSearchInteraction({
      query,
      componentId,
      siteName,
      interactionType: "viewed",
      nullResults: total === 0,
    });
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
  ]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(input.trim());
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
          <label htmlFor={inputId}>What would you like to know?</label>
          <input
            id={inputId}
            name="q"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about auto, home, or bundling"
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
              ? "Enter a topic, product name, or specific question to search."
              : loading
                ? "Finding helpful information…"
                : isError
                  ? "We could not complete this search."
                  : `${total} ${total === 1 ? "result" : "results"}${query ? ` for “${query}”` : ""}`}
          </p>
          {needsSubject ? (
            <div className="public-search__empty">
              <h3>Choose a subject to search</h3>
              <p>Include the topic for which you need information.</p>
            </div>
          ) : isError ? (
            <div className="public-search__empty">
              <h3>Please try again</h3>
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
              <h3>Let’s find the right information</h3>
              <p>
                Try a different question or a product name. An agent can help
                with questions about your policy or situation.
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
              {resultCards.map(({ document, href, title }, index) => {
                const source = publicHref(text(document, mapping.source));
                const description = text(document, mapping.description);
                const product = text(document, mapping.product);
                const state = text(document, mapping.state);
                const owner = text(document, mapping.owner);
                const effectiveDate = displayDate(
                  text(document, mapping.effectiveDate),
                );
                return (
                  <article
                    className="public-search-card"
                    key={`${href}-${index}`}
                  >
                    {(product || state) && (
                      <p className="public-eyebrow">
                        {[product, state].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <h3>
                      <NextLink
                        href={href}
                        onClick={() =>
                          resultClick(href, index + 1 + (currentPage - 1) * 6)
                        }
                      >
                        {title}
                      </NextLink>
                    </h3>
                    {description && <p>{description}</p>}
                    {(owner || effectiveDate) && (
                      <p className="public-search-card__metadata">
                        {[
                          owner,
                          effectiveDate ? `Effective ${effectiveDate}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <div className="public-search-card__footer">
                      <NextLink
                        className="public-text-link"
                        href={href}
                        onClick={() =>
                          resultClick(href, index + 1 + (currentPage - 1) * 6)
                        }
                      >
                        Read more <span aria-hidden="true">→</span>
                      </NextLink>
                      {source && (
                        <a
                          href={source}
                          className="public-search-card__source"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Source:{" "}
                          {new URL(
                            source,
                            "https://libertymutual.com",
                          ).hostname.replace(/^www\./, "")}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
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
