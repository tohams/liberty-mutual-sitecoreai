"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { PortalAction } from "@/contracts/portal";
import { PortalDialog } from "@/components/ui/portal-dialog";
import { PortalIcon } from "@/components/ui/portal-icon";
import {
  dateLabel,
  money,
  stateNames,
  usePortal,
} from "../portal/portal-context";

export function ClientsScreen({
  initialSelectedId,
}: {
  initialSelectedId?: string;
}) {
  const { data, act, busy } = usePortal();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(
    searchParams.get("filter") === "renewal"
      ? "Renewal review"
      : "All policies",
  );
  const [selectedId, setSelectedId] = useState(initialSelectedId || "");
  const [detailTab, setDetailTab] = useState("Overview");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const selected = data.policies.find(
    (item) => item.id === selectedId || item.accountId === selectedId,
  );
  const visible = data.policies.filter(
    (item) =>
      `${item.accountName} ${item.policyNumber}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All policies" || item.status === filter),
  );
  async function saveFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const result = await act(
      {
        type: "save-follow-up",
        policyId: selected.id,
        title: String(form.get("title")),
        dueDate: String(form.get("dueDate")),
        notes: String(form.get("notes")),
      },
      "Follow-up saved to your priorities.",
    );
    if (result) setFollowUpOpen(false);
  }
  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const result = await act(
      {
        type: "create-service-request",
        policyId: selected.id,
        requestType: String(form.get("requestType")) as Extract<
          PortalAction,
          { type: "create-service-request" }
        >["requestType"],
        notes: String(form.get("notes")),
      },
      "Your service request has been saved.",
    );
    if (result) setServiceOpen(false);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="breadcrumb">RELATIONSHIPS WORTH PROTECTING</div>
          <h1>Clients & policies</h1>
          <p>Know your book. Stay ahead of your clients&apos; next chapter.</p>
        </div>
        <span className="context-chip">
          <PortalIcon name="users" width="17" />
          {data.agency.name}
        </span>
      </div>
      <section className="renewal-banner">
        <span className="round-icon">
          <PortalIcon name="clock" width="23" height="23" />
        </span>
        <div>
          <h2>A timely conversation makes a difference.</h2>
          <p>
            {
              data.policies.filter((item) => item.status === "Renewal review")
                .length
            }{" "}
            policies are ready for a renewal review. Start with what has
            changed.
          </p>
        </div>
        <button
          className="text-link"
          onClick={() => setFilter("Renewal review")}
        >
          Review renewals
          <PortalIcon name="arrow" width="17" />
        </button>
      </section>
      <section className="panel">
        <header className="panel-heading">
          <h2>
            Your client book{" "}
            <span className="count-badge">{data.policies.length}</span>
          </h2>
          <span className="subtle">As of {dateLabel(data.asOfDate)}</span>
        </header>
        <div className="table-toolbar">
          <div className="input-with-icon">
            <PortalIcon name="search" width="17" />
            <input
              className="filter-input"
              placeholder="Search client or policy number"
              aria-label="Search clients and policies"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="filter-select"
            aria-label="Policy status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {["All policies", "Active", "Renewal review"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <span className="results-count">{visible.length} results</span>
        </div>
        <div className="table-scroll">
          <table className="portal-table responsive-records has-row-action">
            <thead>
              <tr>
                <th>Client / policy</th>
                <th>Coverage</th>
                <th>State</th>
                <th>Premium</th>
                <th>Renewal date</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Open client</span>
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
                        setDetailTab("Overview");
                      }}
                    >
                      {item.accountName}
                    </button>
                    <small>{item.policyNumber}</small>
                  </td>
                  <td data-label="Coverage">
                    {data.products.find(
                      (product) => product.id === item.productId,
                    )?.name || item.line}
                  </td>
                  <td data-label="State">{item.state}</td>
                  <td data-label="Premium" className="numeric">
                    {money(item.premiumCents)}
                  </td>
                  <td data-label="Renewal date">
                    {dateLabel(item.expirationDate)}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`status status-${item.status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      onClick={() => setSelectedId(item.id)}
                      aria-label={`Open ${item.accountName}`}
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
            <PortalIcon name="search" width="30" />
            <h3>No matching policies.</h3>
            <p>Try another client name, policy number, or status.</p>
          </div>
        )}
        <div className="table-footer">
          <span>Showing policies available to your role</span>
          <span>
            <PortalIcon name="lock" width="12" /> Secure account access
          </span>
        </div>
      </section>
      <PortalDialog
        title={selected?.accountName || "Client account"}
        eyebrow={selected?.policyNumber}
        open={!!selected}
        onClose={() => setSelectedId("")}
        wide
      >
        {selected && (
          <>
            <div className="detail-status">
              <span
                className={`status status-${selected.status.toLowerCase().replaceAll(" ", "-")}`}
              >
                {selected.status}
              </span>
              <span>
                {
                  data.products.find((item) => item.id === selected.productId)
                    ?.name
                }
              </span>
            </div>
            <div className="tab-list detail-tabs">
              {["Overview", "Documents", "Renewal review"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={detailTab === tab ? "active" : ""}
                  aria-pressed={detailTab === tab}
                >
                  {tab}
                </button>
              ))}
            </div>
            {detailTab === "Overview" && (
              <>
                <dl className="detail-list">
                  <div>
                    <dt>Risk address</dt>
                    <dd>{selected.address}</dd>
                  </div>
                  <div>
                    <dt>State</dt>
                    <dd>{stateNames[selected.state]}</dd>
                  </div>
                  <div>
                    <dt>Policy period</dt>
                    <dd>
                      {dateLabel(selected.effectiveDate)} –{" "}
                      {dateLabel(selected.expirationDate)}
                    </dd>
                  </div>
                  <div>
                    <dt>Written premium</dt>
                    <dd>{money(selected.premiumCents)}</dd>
                  </div>
                </dl>
                <div className="note-box">
                  <span className="eyebrow">ACCOUNT CONTEXT</span>
                  <p>{selected.renewalNote}</p>
                </div>
                <div className="form-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => setServiceOpen(true)}
                  >
                    Request service
                  </button>
                  <button
                    className="button button-primary"
                    onClick={() => setFollowUpOpen(true)}
                  >
                    Schedule follow-up
                    <PortalIcon name="plus" width="15" />
                  </button>
                </div>
              </>
            )}
            {detailTab === "Documents" && (
              <div className="document-list">
                {selected.documents.map((document) => (
                  <a
                    href={`/api/portal/policies/${selected.id}/documents/${document.id}`}
                    key={document.id}
                    className="document-row"
                    download
                  >
                    <span className="round-icon">
                      <PortalIcon name="file" />
                    </span>
                    <div>
                      <strong>{document.name}</strong>
                      <small>{document.kind} · Account document</small>
                    </div>
                    <PortalIcon name="download" width="17" />
                  </a>
                ))}
              </div>
            )}
            {detailTab === "Renewal review" && (
              <>
                <div className="guidance-box">
                  <span className="round-icon">
                    <PortalIcon name="shield" />
                  </span>
                  <div>
                    <h3>Begin with what has changed.</h3>
                    <p>{selected.renewalNote}</p>
                  </div>
                </div>
                <h3>Make the conversation count</h3>
                <ul className="editorial-list">
                  <li>
                    Confirm current contact details, property use, and business
                    operations.
                  </li>
                  <li>
                    Review changes in vehicles, locations, values, and potential
                    exposures.
                  </li>
                  <li>
                    Use current product guidance to discuss options and next
                    steps.
                  </li>
                </ul>
                <button
                  className="button button-primary"
                  onClick={() => setFollowUpOpen(true)}
                >
                  Save a renewal follow-up
                  <PortalIcon name="arrow" width="16" />
                </button>
              </>
            )}
          </>
        )}
      </PortalDialog>
      <PortalDialog
        title="Keep the conversation moving"
        eyebrow={selected?.accountName}
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
      >
        <form className="portal-form" onSubmit={saveFollowUp}>
          <label>
            Follow-up title
            <input
              name="title"
              defaultValue={`Review ${selected?.accountName || "client"} renewal`}
              maxLength={160}
              required
            />
          </label>
          <label>
            Due date
            <input
              name="dueDate"
              type="date"
              defaultValue={data.asOfDate.slice(0, 10)}
              required
            />
          </label>
          <label>
            Notes
            <textarea
              name="notes"
              placeholder="What will you discuss with your client?"
              maxLength={2000}
            />
          </label>
          <button className="button button-primary" disabled={busy}>
            Save follow-up
          </button>
        </form>
      </PortalDialog>
      <PortalDialog
        title="How can we help?"
        eyebrow={selected?.accountName}
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
      >
        <form className="portal-form" onSubmit={saveService}>
          <label>
            Request type
            <select name="requestType">
              <option>Certificate request</option>
              <option>Policy change</option>
              <option>Billing question</option>
              <option>Claim status</option>
            </select>
          </label>
          <label>
            Request details
            <textarea
              name="notes"
              placeholder="Describe the information or assistance you need."
              required
              maxLength={2000}
            />
          </label>
          <p className="form-note">
            Your request will appear in your agency priorities. Requests do not
            change policy terms or coverage.
          </p>
          <button className="button button-primary" disabled={busy}>
            Save service request
            <PortalIcon name="arrow" width="16" />
          </button>
        </form>
      </PortalDialog>
    </>
  );
}
