"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Search } from "lucide-react";
import { GuideText } from "./GuideText";
import { plainGuideText } from "./guide-text";
import type { WorkshopAudience, WorkshopGuide } from "./types";
import type { WorkshopFocus } from "./content/priorities";
export type GuideSummary = Pick<
  WorkshopGuide,
  "slug" | "audience" | "category" | "title" | "summary" | "duration"
> & { stepCount: number; focus: WorkshopFocus };
export function GuideDirectory({
  guides,
  audience,
}: {
  guides: GuideSummary[];
  audience: WorkshopAudience;
}) {
  const [query, setQuery] = useState("");
  const sections = Array.from(
    new Map(
      guides.map((guide) => [guide.focus.section.id, guide.focus.section]),
    ).values(),
  );
  const matches = guides.filter((guide) =>
    plainGuideText(
      `${guide.title} ${guide.summary} ${guide.category} ${guide.focus.priority.label} ${guide.focus.relevance}`,
    )
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="workshop-directory-tools">
        <label>
          <Search size={19} />
          <input
            aria-label="Find a walkthrough"
            placeholder="Find a capability or walkthrough"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span>
          {matches.length}{" "}
          {matches.length === 1 ? "walkthrough" : "walkthroughs"}
        </span>
      </div>
      <div className="workshop-directory-layout">
        <aside>
          <span className="workshop-eyebrow">IN THIS SECTION</span>
          <nav aria-label={`${audience} categories`}>
            {sections.map(
              (section) =>
                matches.some(
                  (guide) => guide.focus.section.id === section.id,
                ) && (
                  <a key={section.id} href={`#section-${section.id}`}>
                    {section.label}
                  </a>
                ),
            )}
          </nav>
          <div className="workshop-side-note">
            <strong>Follow at your own pace</strong>
            <p>
              Start with your priorities. Each guide includes accounts, exact
              steps, expected results, and cleanup instructions. Optional
              scenarios and support follow the main walkthroughs.
            </p>
          </div>
        </aside>
        <div>
          {sections.map((section) => {
            const selected = matches.filter(
              (guide) => guide.focus.section.id === section.id,
            );
            return selected.length ? (
              <section
                key={section.id}
                id={`section-${section.id}`}
                className="workshop-guide-group"
              >
                <h2>{section.label}</h2>
                <p className="workshop-group-description">
                  {section.description}
                </p>
                <div>
                  {selected.map((guide) => (
                    <Link
                      className="workshop-guide-row"
                      key={guide.slug}
                      href={`/workshops/guide/${guide.slug}`}
                    >
                      <div>
                        <h3>{guide.title}</h3>
                        <p className="workshop-guide-priority">
                          Your priority:{" "}
                          <strong>{guide.focus.priority.label}</strong>
                        </p>
                        <p>
                          <GuideText text={guide.summary} />
                        </p>
                        <span>
                          <Clock3 size={14} />
                          {guide.duration}
                          <i />
                          {guide.stepCount} steps
                        </span>
                      </div>
                      <ArrowRight size={21} />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null;
          })}
          {matches.length === 0 && (
            <div className="workshop-empty">
              <h2>No matching walkthroughs</h2>
              <p>
                Try a capability or priority such as Search, personalization,
                content, or faster delivery.
              </p>
              <button type="button" onClick={() => setQuery("")}>
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
