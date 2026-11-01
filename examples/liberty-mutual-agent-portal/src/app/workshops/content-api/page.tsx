import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Globe2,
  RefreshCw,
} from "lucide-react";
import { requireWorkshopSession } from "@/server/workshops/auth";
import { WorkshopShell } from "@/features/workshops/WorkshopShell";
import {
  ANSWER_COLLECTION_URL,
  contentParagraphs,
  displayContentDate,
  loadPublishedAnswer,
  PublishedAnswerNotAvailable,
} from "@/features/workshops/content-api/published-answers";
import styles from "@/features/workshops/content-api/ContentApi.module.css";

export const metadata: Metadata = {
  title: "One approved answer, two experiences | Liberty Mutual workshop guide",
};

const PATH = "/workshops/content-api";

function applicability(state: string): string {
  return (
    {
      tx: "Texas",
      fl: "Florida",
      il: "Illinois",
      national: "All states",
      all: "All states",
    }[state.toLowerCase()] ||
    state ||
    "Not specified"
  );
}

export default async function ContentApiPage({
  searchParams,
}: {
  searchParams: Promise<{ answer?: string | string[]; check?: string }>;
}) {
  const session = await requireWorkshopSession(PATH);
  const params = await searchParams;
  let result;
  let selectedUnavailable = false;
  try {
    result = await loadPublishedAnswer(
      typeof params.answer === "string"
        ? params.answer
        : params.answer !== undefined
          ? ""
          : undefined,
      params.check === "1",
    );
  } catch (error) {
    selectedUnavailable = error instanceof PublishedAnswerNotAvailable;
    // An unavailable service never becomes fabricated or stale fallback content.
  }

  return (
    <WorkshopShell session={session} active="development">
      <main id="workshop-main" className={styles.page}>
        <Link className="workshop-back" href="/workshops/development">
          <ArrowLeft size={15} /> Development &amp; architecture
        </Link>
        <header className={styles.heading}>
          <span className="workshop-eyebrow">STRUCTURED CONTENT REUSE</span>
          <h1>One approved answer, two experiences</h1>
          <p>
            <strong>SitecoreAI</strong> manages the approved insurance guidance.
            The <strong>public website</strong> presents it as an article. This
            separate <strong>Agent Portal</strong> application retrieves that
            same published answer through a versioned{" "}
            <strong>content API</strong>
            —a structured response that another application can read.
          </p>
          <Link
            className="workshop-inline-link"
            href="/workshops/guide/publish-to-two-experiences"
          >
            Follow the publication walkthrough <ArrowRight size={15} />
          </Link>
        </header>

        <ol className={styles.flow} aria-label="The content delivery path">
          <li>
            <FileCheck2 size={23} />
            <div>
              <strong>Approve in SitecoreAI</strong>
              <span>One governed source and publishing workflow</span>
            </div>
            <ArrowRight className={styles.flowArrow} size={20} />
          </li>
          <li>
            <Database size={23} />
            <div>
              <strong>Retrieve published content</strong>
              <span>The public website’s read-only API</span>
            </div>
            <ArrowRight className={styles.flowArrow} size={20} />
          </li>
          <li>
            <Globe2 size={23} />
            <div>
              <strong>Present it in another experience</strong>
              <span>This authenticated page on the Agent Portal host</span>
            </div>
          </li>
        </ol>

        {!result ? (
          <section className={styles.unavailable} aria-labelledby="unavailable">
            <h2 id="unavailable">
              {selectedUnavailable
                ? "This answer is no longer available"
                : "The published answer is temporarily unavailable"}
            </h2>
            <p>
              {selectedUnavailable
                ? "The selected item is not in the published answer library. Choose another approved answer to continue."
                : "This page could not retrieve a complete, valid response from the public website’s content API. Refresh to try the request again."}
            </p>
            <Link className={styles.primaryLink} href={PATH}>
              <RefreshCw size={17} />
              {selectedUnavailable
                ? "Choose another approved answer"
                : "Retry published content"}
            </Link>
          </section>
        ) : (
          <>
            <section
              className={styles.selector}
              aria-labelledby="choose-answer"
            >
              <div>
                <h2 id="choose-answer">Choose an approved answer</h2>
                <p>
                  These {result.answers.length} choices come from the published
                  API collection. Loading one makes a separate request for that
                  answer’s stable item ID.
                </p>
              </div>
              <form action={PATH} method="get">
                <label htmlFor="published-answer">
                  Published insurance question
                </label>
                <div className={styles.selectRow}>
                  <select
                    id="published-answer"
                    name="answer"
                    defaultValue={result.selected.data.id}
                  >
                    {result.answers.map((answer) => (
                      <option key={answer.id} value={answer.id}>
                        {answer.question}
                      </option>
                    ))}
                  </select>
                  <button type="submit">
                    Load answer <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </section>

            <div className={styles.contentLayout}>
              <article
                className={styles.answer}
                aria-labelledby="answer-question"
              >
                <span className={styles.published}>
                  <CheckCircle2 size={16} /> Published guidance
                </span>
                <h2 id="answer-question">{result.selected.data.question}</h2>
                <p className={styles.answerText}>
                  {result.selected.data.answer}
                </p>
                {contentParagraphs(result.selected.data.explanation).map(
                  (text, index) => (
                    <p key={index}>{text}</p>
                  ),
                )}
                {result.selected.data.formalWording && (
                  <details className={styles.formal}>
                    <summary>Coverage and policy details</summary>
                    {contentParagraphs(result.selected.data.formalWording).map(
                      (text, index) => (
                        <p key={index}>{text}</p>
                      ),
                    )}
                  </details>
                )}
                <div className={styles.answerLinks}>
                  <a
                    className={styles.primaryLink}
                    href={result.selected.data.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View the public article <ArrowUpRight size={17} />
                  </a>
                  {result.selected.data.sourceLink && (
                    <a
                      href={result.selected.data.sourceLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {result.selected.data.sourceLink.text ||
                        "Read the authoritative source"}
                      <ArrowUpRight size={16} />
                    </a>
                  )}
                </div>
              </article>

              <aside
                className={styles.governance}
                aria-labelledby="governed-content"
              >
                <FileCheck2 size={24} />
                <h2 id="governed-content">
                  The governance travels with the answer
                </h2>
                <p>
                  This application receives the content’s ownership,
                  applicability, and dates alongside its answer and citation.
                  Those values come from the published source; they are not
                  re-entered here.
                </p>
                <dl>
                  <div>
                    <dt>Content owner</dt>
                    <dd>{result.selected.data.owner || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt>State</dt>
                    <dd>{applicability(result.selected.data.state)}</dd>
                  </div>
                  <div>
                    <dt>Product</dt>
                    <dd>{result.selected.data.product || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt>Audience</dt>
                    <dd>{result.selected.data.audience || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt>Effective</dt>
                    <dd>
                      {displayContentDate(result.selected.data.effectiveDate)}
                    </dd>
                  </div>
                  <div>
                    <dt>Review date</dt>
                    <dd>
                      {displayContentDate(result.selected.data.reviewDate)}
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>

            <section
              className={styles.delivery}
              aria-labelledby="inspect-delivery"
            >
              <div className={styles.deliveryHeading}>
                <span className="workshop-eyebrow">INSPECT THE DELIVERY</span>
                <h2 id="inspect-delivery">
                  A stable contract for other applications
                </h2>
                <p>
                  The page above is rendered from the API response. Its own
                  layout is independent of the public article’s layout. Approved
                  content published to <strong>Experience Edge Live</strong> is
                  exposed by this API.
                </p>
              </div>
              <dl className={styles.technical}>
                <div>
                  <dt>API contract version</dt>
                  <dd>{result.selected.schemaVersion}</dd>
                </div>
                <div>
                  <dt>Native content version</dt>
                  <dd>{result.selected.data.version}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{result.selected.data.language}</dd>
                </div>
                <div>
                  <dt>Stable item ID</dt>
                  <dd>
                    <code>{result.selected.data.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Published content fingerprint</dt>
                  <dd>
                    <code>{result.selected.data.revision}</code>
                    <span className={styles.explanation}>
                      SHA-256 of the delivered content; changes when its
                      published values change.
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Response ETag</dt>
                  <dd>
                    <code>{result.etag || "Not supplied"}</code>
                    <span className={styles.explanation}>
                      The API’s response identifier lets another request check
                      whether the response has changed.
                    </span>
                  </dd>
                </div>
              </dl>
              <div className={styles.endpoint}>
                <span>Actual single-answer request</span>
                <a
                  href={result.endpoint}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <code>GET {result.endpoint}</code> <ArrowUpRight size={16} />
                </a>
              </div>
              <div className={styles.deliveryActions}>
                <Link
                  href={`${PATH}?answer=${result.selected.data.id}&check=1`}
                >
                  <RefreshCw size={16} /> Check whether the response is
                  unchanged
                </Link>
                <a
                  href={ANSWER_COLLECTION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the published collection <ArrowUpRight size={16} />
                </a>
              </div>
              {result.conditionalStatus && (
                <div className={styles.conditional} role="status">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>
                      {result.conditionalStatus === 304
                        ? "304 Not Modified — the API confirmed an unchanged response"
                        : "200 OK — a newer response was received"}
                    </strong>
                    <p>
                      A second real request sent the response’s ETag in the
                      <code> If-None-Match </code> header.
                      {result.conditionalStatus === 304
                        ? " The API returned no duplicate response body, so this page reused the answer already received."
                        : " This page now displays the newer published answer."}
                    </p>
                  </div>
                </div>
              )}
              <p className={styles.note}>
                <strong>How to verify reuse:</strong> open the public article,
                compare its answer and citation with this page, and inspect the
                request above. After an approved source change is published,
                reload both experiences to see the updated guidance. The API
                reuses responses for up to 15 seconds after publication
                completes. Reload after that interval to retrieve the current
                published values. Draft and Preview content remain in the
                authoring environment.
              </p>
            </section>
          </>
        )}
      </main>
    </WorkshopShell>
  );
}
