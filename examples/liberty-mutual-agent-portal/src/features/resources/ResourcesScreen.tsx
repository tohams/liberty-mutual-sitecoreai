"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resourceHref } from "../portal/content-routes";
import { PortalIcon } from "@/components/ui/portal-icon";
import { PortalDialog } from "@/components/ui/portal-dialog";
import { stateNames, usePortal } from "../portal/portal-context";

export function ResourcesScreen({
  search,
  initialCourseId,
}: {
  search?: ReactNode;
  initialCourseId?: string;
}) {
  const { data, act, busy } = usePortal();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [filter, setFilter] = useState("All resources");
  const [courseId, setCourseId] = useState(
    initialCourseId || searchParams.get("course") || "",
  );
  const [showSaved, setShowSaved] = useState(false);
  const course = data.learning.find((item) => item.id === courseId);
  const visible = data.resources.filter(
    (resource) =>
      `${resource.title} ${resource.description} ${resource.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All resources" ||
        (filter === "Saved"
          ? data.favorites.includes(resource.id)
          : filter === "Your state"
            ? resource.states.includes(data.agent.state)
            : filter === "Guide"
              ? resource.type.toLowerCase().endsWith("guide")
              : resource.type === filter)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="breadcrumb">KNOW MORE. DO MORE.</div>
          <h1>Learning & resources</h1>
          <p>
            Practical answers. Fresh perspectives. More confidence for the next
            conversation.
          </p>
        </div>
        <button
          type="button"
          className="context-chip borderless"
          onClick={() => setShowSaved(!showSaved)}
          aria-expanded={showSaved}
        >
          <PortalIcon name="bookmark" width="16" />
          {data.favorites.length} saved{" "}
          {data.favorites.length === 1 ? "resource" : "resources"}
        </button>
      </div>
      {showSaved && (
        <section className="panel saved-resources">
          <header className="panel-heading">
            <h2>Saved for your next conversation</h2>
            <button
              className="icon-button"
              onClick={() => setShowSaved(false)}
              aria-label="Close saved resources"
            >
              <PortalIcon name="close" width="17" />
            </button>
          </header>
          {data.favorites.length ? (
            <div className="saved-resource-list">
              {data.resources
                .filter((resource) => data.favorites.includes(resource.id))
                .map((resource) => (
                  <Link href={resourceHref(resource)} key={resource.id}>
                    <PortalIcon name="bookmark" width="19" />
                    <span>
                      {resource.title}
                      <small>
                        {resource.type} · {resource.readMinutes} min read
                      </small>
                    </span>
                    <PortalIcon name="arrow" width="16" />
                  </Link>
                ))}
            </div>
          ) : (
            <p className="section-description">
              Save a guide, checklist, or article to keep it close at hand.
            </p>
          )}
        </section>
      )}
      {search ? (
        <section className="native-resource-library">{search}</section>
      ) : (
        <>
          <section className="resource-search-hero">
            <span className="eyebrow">YOUR KNOWLEDGE ADVANTAGE</span>
            <h2>What can we help you find?</h2>
            <p>
              Explore product guides, state information, checklists, and
              learning.
            </p>
            {search || (
              <div className="large-search input-with-icon">
                <PortalIcon name="search" width="21" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “workers compensation” or “renewal checklist”"
                  aria-label="Search resource library"
                />
              </div>
            )}
            <div className="suggested-searches">
              <span>Popular:</span>
              {["Workers compensation", "Renewal", "Small business"].map(
                (term) => (
                  <button key={term} onClick={() => setQuery(term)}>
                    {term}
                  </button>
                ),
              )}
            </div>
          </section>
          <div className="catalog-filter" aria-label="Resource filters">
            {[
              "All resources",
              "Your state",
              "Guide",
              "Checklist",
              "State guidance",
              "Saved",
            ].map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item === "Your state"
                  ? `${stateNames[data.agent.state]} guidance`
                  : item}
              </button>
            ))}
          </div>
          {query && (
            <div className="active-filter">
              Results for <strong>“{query}”</strong>
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <PortalIcon name="close" width="14" />
              </button>
            </div>
          )}
          <div className="resource-grid">
            {visible.map((resource, index) => (
              <article className="library-card" key={resource.id}>
                <div className={`library-art library-art-${index % 4}`}>
                  <PortalIcon
                    name={
                      resource.type === "State guidance"
                        ? "pin"
                        : resource.type === "Checklist"
                          ? "file"
                          : "book"
                    }
                    width="45"
                    height="45"
                  />
                  <span>
                    {resource.type === "State guidance"
                      ? "A local perspective."
                      : index % 2
                        ? "Knowledge that works."
                        : "Ready for what’s next."}
                  </span>
                  <button
                    className={`save-button ${data.favorites.includes(resource.id) ? "saved" : ""}`}
                    onClick={() =>
                      act(
                        { type: "toggle-favorite", resourceId: resource.id },
                        data.favorites.includes(resource.id)
                          ? "Resource removed from saved items."
                          : "Resource saved.",
                      )
                    }
                    disabled={busy}
                    aria-label={`${data.favorites.includes(resource.id) ? "Unsave" : "Save"} ${resource.title}`}
                    aria-pressed={data.favorites.includes(resource.id)}
                  >
                    <PortalIcon name="bookmark" width="17" />
                  </button>
                </div>
                <div className="library-copy">
                  <span className="eyebrow">
                    {resource.type} · {resource.readMinutes} MIN READ
                  </span>
                  <h2>
                    <Link href={resourceHref(resource)}>{resource.title}</Link>
                  </h2>
                  <p>{resource.description}</p>
                  <footer>
                    <span>
                      {resource.states.length === 3
                        ? "All states"
                        : resource.states.join(" · ")}
                    </span>
                    <Link
                      className="text-link small"
                      href={resourceHref(resource)}
                    >
                      Read resource
                      <PortalIcon name="arrow" width="15" />
                    </Link>
                  </footer>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="panel empty-state">
              <PortalIcon name="search" width="32" />
              <h3>Let&apos;s try another angle.</h3>
              <p>
                No resources match this search. Try a broader term or a
                different filter.
              </p>
              <button
                className="button button-secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("All resources");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}
      <section className="learning-section">
        <header className="section-heading">
          <div>
            <span className="eyebrow">INVEST IN YOUR EXPERTISE</span>
            <h2>Your next learning opportunity</h2>
          </div>
          <span className="subtle">Built for busy insurance professionals</span>
        </header>
        <div className="learning-grid">
          {data.learning.map((item) => (
            <article className="learning-card" key={item.id}>
              <span className="learning-icon">
                <PortalIcon name="book" width="22" />
              </span>
              <div>
                <span className="eyebrow">
                  {item.format} · {item.durationMinutes} MIN
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <button
                  className="text-link small"
                  onClick={() => setCourseId(item.id)}
                >
                  {data.registrations.includes(item.id)
                    ? "View your learning plan"
                    : "Explore learning"}
                  <PortalIcon name="arrow" width="15" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <PortalDialog
        title={course?.title || "Learning"}
        eyebrow={
          course ? `${course.format} · ${course.durationMinutes} MIN` : ""
        }
        open={!!course}
        onClose={() => setCourseId("")}
      >
        {course && (
          <>
            <p className="lead-description">{course.description}</p>
            <h3 className="spaced-heading">What you&apos;ll cover</h3>
            <ol className="lesson-list">
              {course.lessons.map((lesson) => (
                <li key={lesson}>{lesson}</li>
              ))}
            </ol>
            {data.registrations.includes(course.id) ? (
              <div className="success-panel">
                <PortalIcon name="check" />
                <div>
                  <strong>You&apos;re registered.</strong>
                  <p>
                    This learning opportunity is saved to your agency learning
                    plan.
                  </p>
                </div>
              </div>
            ) : (
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() =>
                  act(
                    { type: "register-learning", courseId: course.id },
                    "You are registered. This course is now in your learning plan.",
                  )
                }
              >
                Add to my learning plan
                <PortalIcon name="arrow" width="16" />
              </button>
            )}
          </>
        )}
      </PortalDialog>
    </>
  );
}
