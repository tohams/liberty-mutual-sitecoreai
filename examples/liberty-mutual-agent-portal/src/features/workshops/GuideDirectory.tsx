"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Search } from "lucide-react";
import { GuideText } from "./GuideText";
import { plainGuideText } from "./guide-text";
import type { WorkshopAudience, WorkshopGuide } from "./types";
export type GuideSummary = Pick<
  WorkshopGuide,
  "slug" | "audience" | "category" | "title" | "summary" | "duration"
> & { stepCount: number };
export function GuideDirectory({
  guides,
  audience,
}: {
  guides: GuideSummary[];
  audience: WorkshopAudience;
}) {
  const [query, setQuery] = useState("");
  const categories = [...new Set(guides.map((guide) => guide.category))];
  const matches = guides.filter((guide) =>
    plainGuideText(`${guide.title} ${guide.summary} ${guide.category}`)
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
            {categories.map(
              (category, index) =>
                matches.some((guide) => guide.category === category) && (
                  <a key={category} href={`#category-${index}`}>
                    {category}
                  </a>
                ),
            )}
          </nav>
          <div className="workshop-side-note">
            <strong>Follow at your own pace</strong>
            <p>
              Each guide includes accounts, exact steps, expected results and
              cleanup instructions.
            </p>
          </div>
        </aside>
        <div>
          {categories.map((category, index) => {
            const selected = matches.filter(
              (guide) => guide.category === category,
            );
            return selected.length ? (
              <section
                key={category}
                id={`category-${index}`}
                className="workshop-guide-group"
              >
                <h2>{category}</h2>
                <div>
                  {selected.map((guide) => (
                    <Link
                      className="workshop-guide-row"
                      key={guide.slug}
                      href={`/workshops/guide/${guide.slug}`}
                    >
                      <div>
                        <h3>{guide.title}</h3>
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
                Try a capability such as Search, personalization, content or
                deployment.
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
