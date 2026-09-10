"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { StateCode } from "@/contracts/portal";
import { PortalIcon } from "@/components/ui/portal-icon";
import { PortalDialog } from "@/components/ui/portal-dialog";
import {
  dateLabel,
  lineNames,
  money,
  stateNames,
  usePortal,
} from "../portal/portal-context";
import { SubmissionForm } from "./SubmissionForm";

export function SubmissionsScreen({
  initialSelectedId,
  initialBondId,
}: {
  initialSelectedId?: string;
  initialBondId?: string;
}) {
  const searchParams = useSearchParams();
  const { data, act, busy } = usePortal();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All submissions");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId || searchParams.get("submission"),
  );
  const [newOpen, setNewOpen] = useState(
    initialSelectedId === "new" || searchParams.get("new") === "1",
  );
  const [bondOpen, setBondOpen] = useState(Boolean(initialBondId));
  const [newBondOpen, setNewBondOpen] = useState(
    searchParams.get("bond") === "1",
  );
  const [selectedBondId, setSelectedBondId] = useState<string | null>(
    initialBondId || null,
  );
  const [editing, setEditing] = useState(false);
  const selected = data.submissions.find((item) => item.id === selectedId);
  const bond = data.bondRequests.find((item) => item.id === selectedBondId);
  const visible = data.submissions.filter(
    (item) =>
      (filter === "All submissions" || item.status === filter) &&
      `${item.accountName} ${item.reference} ${data.products.find((product) => product.id === item.productId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function saveBond(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await act(
      {
        type: "save-bond-request",
        principal: String(form.get("principal")),
        obligee: String(form.get("obligee")),
        state: String(form.get("state")) as StateCode,
        bondType: String(form.get("bondType")),
        amountCents: Math.round(Number(form.get("amount")) * 100),
        notes: String(form.get("notes")),
      },
      "Bond request draft saved.",
    );
    if (result) {
      setNewBondOpen(false);
      setBondOpen(true);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="breadcrumb">MAKE YOUR NEXT MOVE</div>
          <h1>Quote & submit</h1>
          <p>From a promising opportunity to a well-prepared submission.</p>
        </div>
        <div className="heading-actions">
          {data.agency.appointedLines.includes("surety") && (
            <button
              className="button button-secondary"
              onClick={() => setNewBondOpen(true)}
            >
              New bond request
            </button>
          )}
          <button
            className="button button-primary"
            onClick={() => setNewOpen(true)}
          >
            <PortalIcon name="plus" width="17" />
            Start a submission
          </button>
        </div>
      </div>
      <div className="compact-metrics">
        <div>
          <span className="round-icon">
            <PortalIcon name="file" />
          </span>
          <div>
            <strong>
              {
                data.submissions.filter((item) => item.status === "Draft")
                  .length
              }
            </strong>
            <span>Saved drafts</span>
          </div>
        </div>
        <div>
          <span className="round-icon warm">
            <PortalIcon name="clock" />
          </span>
          <div>
            <strong>
              {
                data.submissions.filter(
                  (item) => item.status === "Information needed",
                ).length
              }
            </strong>
            <span>Need information</span>
          </div>
        </div>
        <div>
          <span className="round-icon cool">
            <PortalIcon name="shield" />
          </span>
          <div>
            <strong>
              {
                data.submissions.filter((item) =>
                  ["Submitted", "In review"].includes(item.status),
                ).length
              }
            </strong>
            <span>With your team</span>
          </div>
        </div>
        <div>
          <span className="round-icon green">
            <PortalIcon name="check" />
          </span>
          <div>
            <strong>
              {
                data.submissions.filter(
                  (item) => item.status === "Quote available",
                ).length
              }
            </strong>
            <span>Quotes available</span>
          </div>
        </div>
      </div>
      <section className="panel">
        <header className="panel-heading">
          <h2>Your submissions</h2>
          <button
            className="text-link small borderless"
            onClick={() => setBondOpen(!bondOpen)}
          >
            {bondOpen
              ? "View insurance submissions"
              : `Bond requests (${data.bondRequests.length})`}
            <PortalIcon name="arrow" width="15" />
          </button>
        </header>
        {!bondOpen ? (
          <>
            <div className="table-toolbar">
              <div className="input-with-icon">
                <PortalIcon name="search" width="17" />
                <input
                  className="filter-input"
                  placeholder="Search account or reference"
                  aria-label="Search submissions"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                className="filter-select"
                aria-label="Submission status"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                {[
                  "All submissions",
                  "Draft",
                  "Information needed",
                  "Submitted",
                  "In review",
                  "Quote available",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <span className="results-count">{visible.length} results</span>
            </div>
            <div className="table-scroll">
              <table className="portal-table responsive-records has-row-action">
                <thead>
                  <tr>
                    <th>Account / reference</th>
                    <th>Product</th>
                    <th>State</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          className="table-title"
                          onClick={() => {
                            setSelectedId(item.id);
                            setEditing(false);
                          }}
                        >
                          {item.accountName}
                        </button>
                        <small>{item.reference}</small>
                      </td>
                      <td data-label="Coverage">
                        {
                          data.products.find(
                            (product) => product.id === item.productId,
                          )?.name
                        }
                        <small>{lineNames[item.line]}</small>
                      </td>
                      <td data-label="State">{item.state}</td>
                      <td data-label="Status">
                        <span
                          className={`status status-${item.status.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td data-label="Updated">{dateLabel(item.updatedAt)}</td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Open ${item.accountName}`}
                          onClick={() => {
                            setSelectedId(item.id);
                            setEditing(false);
                          }}
                        >
                          <PortalIcon name="chevron" width="15" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <div className="empty-state">
                <PortalIcon name="file" width="30" />
                <h3>No submissions match your search.</h3>
                <p>Try another account name or clear your status filter.</p>
              </div>
            )}
          </>
        ) : (
          <div className="table-scroll">
            <table className="portal-table responsive-records">
              <thead>
                <tr>
                  <th>Principal</th>
                  <th>Bond type</th>
                  <th>Bond amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {data.bondRequests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="table-title"
                        onClick={() => setSelectedBondId(item.id)}
                      >
                        {item.principal}
                      </button>
                      <small>{item.obligee}</small>
                    </td>
                    <td data-label="Bond type">{item.bondType}</td>
                    <td data-label="Bond amount">{money(item.amountCents)}</td>
                    <td data-label="Status">
                      <span className="status">{item.status}</span>
                    </td>
                    <td data-label="Reference">{item.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.bondRequests.length && (
              <div className="empty-state">
                <h3>Your bond requests will appear here.</h3>
                <p>
                  Start with the principal, obligee, and requested bond amount.
                </p>
              </div>
            )}
          </div>
        )}
        <div className="table-footer">
          <span>Showing your agency&apos;s authorized business</span>
          <span>
            <PortalIcon name="lock" width="12" /> Secure account access
          </span>
        </div>
      </section>
      <section className="horizontal-callout">
        <span className="callout-icon">
          <PortalIcon name="shield" width="31" height="31" />
        </span>
        <div>
          <h2>The right fit starts with a conversation.</h2>
          <p>
            Explore product guidance and submission requirements before you
            begin.
          </p>
        </div>
        <Link href="/products" className="button button-secondary">
          Explore appetite
          <PortalIcon name="arrow" width="15" />
        </Link>
      </section>
      <PortalDialog
        title="Start a submission"
        eyebrow="A NEW OPPORTUNITY"
        open={newOpen}
        onClose={() => setNewOpen(false)}
        wide
      >
        <SubmissionForm
          onSaved={(id) => {
            setNewOpen(false);
            setSelectedId(id);
          }}
        />
      </PortalDialog>
      <PortalDialog
        title={selected?.accountName || "Submission details"}
        eyebrow={selected?.reference}
        open={!!selected}
        onClose={() => {
          setSelectedId(null);
          setEditing(false);
        }}
        wide
      >
        {selected &&
          (editing ? (
            <SubmissionForm
              submission={selected}
              onSaved={() => setEditing(false)}
            />
          ) : (
            <>
              <div className="detail-status">
                <span
                  className={`status status-${selected.status.toLowerCase().replaceAll(" ", "-")}`}
                >
                  {selected.status}
                </span>
                <span>Updated {dateLabel(selected.updatedAt)}</span>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Coverage</dt>
                  <dd>
                    {
                      data.products.find(
                        (item) => item.id === selected.productId,
                      )?.name
                    }
                  </dd>
                </div>
                <div>
                  <dt>Risk location / business</dt>
                  <dd>
                    {stateNames[selected.state]} · {selected.industry}
                  </dd>
                </div>
                <div>
                  <dt>Requested effective date</dt>
                  <dd>{dateLabel(selected.effectiveDate)}</dd>
                </div>
                <div>
                  <dt>Employees / annual revenue</dt>
                  <dd>
                    {selected.employeeCount} /{" "}
                    {money(selected.annualRevenueCents)}
                  </dd>
                </div>
              </dl>
              <h3>Submission checklist</h3>
              <p className="section-description">
                Review each requirement to confirm the account information is
                prepared.
              </p>
              <div className="requirement-list">
                {selected.requirements.map((requirement) => (
                  <label key={requirement}>
                    <input
                      type="checkbox"
                      checked={selected.completedRequirements.includes(
                        requirement,
                      )}
                      disabled={
                        busy ||
                        selected.completedRequirements.includes(requirement) ||
                        !["Draft", "Information needed"].includes(
                          selected.status,
                        )
                      }
                      onChange={() =>
                        act(
                          {
                            type: "complete-requirement",
                            submissionId: selected.id,
                            requirement,
                          },
                          "Requirement marked complete.",
                        )
                      }
                    />
                    <span>{requirement}</span>
                  </label>
                ))}
              </div>
              {selected.notes && (
                <div className="note-box">
                  <span className="eyebrow">ACCOUNT NOTES</span>
                  <p>{selected.notes}</p>
                </div>
              )}
              <div className="form-actions">
                {selected.status === "Draft" && (
                  <button
                    className="button button-secondary"
                    onClick={() => setEditing(true)}
                  >
                    Edit account
                  </button>
                )}
                {["Draft", "Information needed"].includes(selected.status) && (
                  <button
                    className="button button-primary"
                    disabled={
                      busy ||
                      selected.completedRequirements.length <
                        selected.requirements.length
                    }
                    onClick={() =>
                      act(
                        {
                          type: "submit-submission",
                          submissionId: selected.id,
                        },
                        "Submission sent for review.",
                      )
                    }
                  >
                    Submit for review
                    <PortalIcon name="arrow" width="16" />
                  </button>
                )}
              </div>
              <p className="form-note">
                Submission is a request for consideration and does not bind
                coverage. Track review progress in this workspace.
              </p>
            </>
          ))}
      </PortalDialog>
      <PortalDialog
        title="New bond request"
        eyebrow="SURETY"
        open={newBondOpen}
        onClose={() => setNewBondOpen(false)}
      >
        <form className="portal-form" onSubmit={saveBond}>
          <label>
            Principal legal name
            <input name="principal" required maxLength={120} />
          </label>
          <label>
            Obligee
            <input name="obligee" required maxLength={120} />
          </label>
          <div className="form-grid">
            <label>
              Bond type
              <select name="bondType">
                <option>Contract performance</option>
                <option>Payment bond</option>
                <option>License and permit</option>
                <option>Commercial surety</option>
              </select>
            </label>
            <label>
              State
              <select name="state" defaultValue={data.agent.state}>
                {data.agent.licensedStates.map((state) => (
                  <option key={state} value={state}>
                    {stateNames[state]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bond amount ($)
              <input
                name="amount"
                type="number"
                min="1"
                max="1000000000"
                required
              />
            </label>
          </div>
          <label>
            Project / request notes
            <textarea name="notes" maxLength={2000} />
          </label>
          <p className="form-note">
            A bond request does not issue a bond or establish surety credit.
          </p>
          <button className="button button-primary" disabled={busy}>
            Save bond request
          </button>
        </form>
      </PortalDialog>
      <PortalDialog
        title={bond?.principal || "Bond request"}
        eyebrow={bond?.reference}
        open={!!bond}
        onClose={() => setSelectedBondId(null)}
      >
        {bond && (
          <>
            <span className="status">{bond.status}</span>
            <dl className="detail-list">
              <div>
                <dt>Obligee</dt>
                <dd>{bond.obligee}</dd>
              </div>
              <div>
                <dt>Bond type</dt>
                <dd>{bond.bondType}</dd>
              </div>
              <div>
                <dt>Bond amount</dt>
                <dd>{money(bond.amountCents)}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{stateNames[bond.state]}</dd>
              </div>
            </dl>
            <p className="section-description">{bond.notes}</p>
            {bond.status === "Draft" && (
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() =>
                  act(
                    { type: "submit-bond-request", bondRequestId: bond.id },
                    "Bond request submitted for review.",
                  )
                }
              >
                Submit bond request
                <PortalIcon name="arrow" width="16" />
              </button>
            )}
          </>
        )}
      </PortalDialog>
    </>
  );
}
