"use client";

import { PortalLink as Link } from "@/components/ui/portal-link";
import { useState, type ReactNode } from "react";
import { PortalIcon } from "@/components/ui/portal-icon";
import { resourceHref } from "../portal/content-routes";
import { selectRecommendedResources } from "../resources/resource-state-scope";
import {
  dateLabel,
  lineNames,
  money,
  stateNames,
  usePortal,
} from "../portal/portal-context";

export function WorkspaceScreen({ editorial }: { editorial?: ReactNode }) {
  const { data, busy, act } = usePortal();
  const [taskFilter, setTaskFilter] = useState("All priorities");
  const activeTasks = data.tasks.filter((task) => task.status === "Open");
  const filteredTasks = activeTasks.filter(
    (task) =>
      taskFilter === "All priorities" ||
      (taskFilter === "Renewals"
        ? task.kind === "renewal"
        : task.kind === "submission" || task.kind === "surety"),
  );
  const total = data.agency.production.reduce(
    (value, item) => value + item.writtenPremiumCents,
    0,
  );
  const priorTotal = data.agency.production.reduce(
    (value, item) => value + item.priorPeriodPremiumCents,
    0,
  );
  const growth = priorTotal
    ? (((total - priorTotal) / priorTotal) * 100).toFixed(1)
    : "0";
  const preferredResources = selectRecommendedResources(
    data.resources,
    data.agent,
  );
  const contact =
    data.contacts.find((item) =>
      item.lines.some((line) => data.agent.specializations.includes(line)),
    ) || data.contacts[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="breadcrumb">YOUR DAY, AT A GLANCE</div>
          <h1>Good to see you, {data.agent.firstName}.</h1>
          <p>You bring the expertise. We&apos;ll help with what&apos;s next.</p>
        </div>
        <div className="heading-actions">
          <span className="context-chip">
            <PortalIcon name="pin" width="15" />
            {stateNames[data.agent.state]}
          </span>
          <Link className="button button-primary" href="/quote?new=1">
            <PortalIcon name="plus" width="17" />
            Start a submission
          </Link>
        </div>
      </div>
      <section className="workspace-spotlight">
        <div className="spotlight-copy">
          <span className="eyebrow">A STRONGER TOMORROW STARTS HERE</span>
          <h2>
            More possibilities.
            <br />
            One committed partner.
          </h2>
          <p>
            Find the right fit for your next account, with guidance and people
            who know your business.
          </p>
          <Link href="/products" className="text-link">
            Explore products & appetite <PortalIcon name="arrow" />
          </Link>
        </div>
        <div className="spotlight-visual" aria-hidden="true">
          <div className="spotlight-ring" />
          <div className="spotlight-circle" />
          <div className="spotlight-insight">
            <span className="mini-icon">
              <PortalIcon name="growth" />
            </span>
            <div>
              <span>YOUR NEXT OPPORTUNITY</span>
              <strong>Built on your strengths.</strong>
              <small>
                {data.agent.specializations
                  .map((line) => lineNames[line])
                  .join(" · ")}
              </small>
            </div>
          </div>
          <div className="spotlight-line" />
          <span className="spotlight-statement">
            Moving forward.
            <br />
            <b>Together.</b>
          </span>
        </div>
      </section>
      <section className="metrics-row" aria-label="Agency overview">
        <div className="metric">
          <div className="metric-label">
            Written premium <PortalIcon name="growth" width="17" />
          </div>
          <strong>{money(total, true)}</strong>
          <span>
            <b className="positive">
              {Number(growth) >= 0 ? "+" : ""}
              {growth}%
            </b>{" "}
            vs. prior 12 months
          </span>
        </div>
        <div className="metric">
          <div className="metric-label">
            Policies in your book <PortalIcon name="shield" width="17" />
          </div>
          <strong>
            {data.agency.production
              .reduce((value, item) => value + item.policyCount, 0)
              .toLocaleString()}
          </strong>
          <span>
            Across{" "}
            {
              data.agency.production.filter((item) => item.policyCount > 0)
                .length
            }{" "}
            lines of business
          </span>
        </div>
        <div className="metric">
          <div className="metric-label">
            Renewals to review <PortalIcon name="clock" width="17" />
          </div>
          <strong>
            {data.policies
              .filter((item) => item.status === "Renewal review")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <Link href="/clients?filter=renewal">
            Get ahead of the conversation <PortalIcon name="arrow" width="14" />
          </Link>
        </div>
        <div className="metric">
          <div className="metric-label">
            Open submissions <PortalIcon name="file" width="17" />
          </div>
          <strong>
            {(data.submissions.length + data.bondRequests.length)
              .toString()
              .padStart(2, "0")}
          </strong>
          <Link href="/quote">
            Keep your business moving <PortalIcon name="arrow" width="14" />
          </Link>
        </div>
      </section>
      <p className="metrics-caption">
        {data.agent.role === "principal"
          ? "Agency production"
          : "Your business lines"}{" "}
        · {data.productionPeriod.label} · Updated {dateLabel(data.asOfDate)}
      </p>
      <div className="workspace-columns">
        <div className="workspace-primary">
          <section className="panel priority-panel">
            <header className="panel-heading">
              <div>
                <span className="eyebrow">FOCUS ON WHAT MATTERS</span>
                <h2>
                  Your priorities{" "}
                  <span className="count-badge">{activeTasks.length}</span>
                </h2>
              </div>
              <Link href="/clients" className="text-link small">
                View your book <PortalIcon name="arrow" width="16" />
              </Link>
            </header>
            <div className="tab-list" aria-label="Filter priorities">
              {["All priorities", "Renewals", "Submissions"].map((filter) => (
                <button
                  type="button"
                  key={filter}
                  className={taskFilter === filter ? "active" : ""}
                  aria-pressed={taskFilter === filter}
                  onClick={() => setTaskFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="priority-list">
              {filteredTasks.length ? (
                filteredTasks.slice(0, 5).map((task) => (
                  <div className="priority-row" key={task.id}>
                    <span
                      className={`priority-icon ${task.priority === "High" ? "priority-urgent" : ""}`}
                    >
                      <PortalIcon
                        name={
                          task.kind === "renewal"
                            ? "clock"
                            : task.kind === "learning"
                              ? "book"
                              : "file"
                        }
                      />
                    </span>
                    <Link href={task.href} className="priority-description">
                      <strong>{task.title}</strong>
                      <span>{task.description}</span>
                      <small>
                        {task.kind.replace("-", " ")} · Due{" "}
                        {dateLabel(task.dueDate)}
                      </small>
                    </Link>
                    <div className="priority-end">
                      {task.priority === "High" && (
                        <span className="status status-attention">
                          Action needed
                        </span>
                      )}
                      <button
                        type="button"
                        className="icon-button complete-task"
                        disabled={busy}
                        onClick={() =>
                          act(
                            { type: "complete-task", taskId: task.id },
                            "Priority marked complete.",
                          )
                        }
                        aria-label={`Mark ${task.title} complete`}
                      >
                        <PortalIcon name="check" width="18" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <PortalIcon name="check" width="32" />
                  <h3>All clear for now.</h3>
                  <p>
                    You have no open{" "}
                    {taskFilter === "All priorities"
                      ? "priorities"
                      : taskFilter.toLowerCase()}
                    .
                  </p>
                </div>
              )}
            </div>
          </section>
          {editorial && (
            <section className="cms-editorial-slot">{editorial}</section>
          )}
          <section className="panel activity-panel">
            <header className="panel-heading">
              <h2>Recent activity</h2>
              <span className="subtle">Your agency, in motion</span>
            </header>
            <div className="activity-list">
              {data.activity.slice(0, 3).map((item) => (
                <Link href={item.href} key={item.id} className="activity-row">
                  <span className="activity-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <time dateTime={item.createdAt}>
                    {dateLabel(item.createdAt)}
                  </time>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className="workspace-secondary">
          {contact && (
            <section className="team-card">
              <div className="team-card-top">
                <span className="eyebrow">YOUR LIBERTY MUTUAL TEAM</span>
                <PortalIcon name="headset" width="21" />
              </div>
              <h2>
                Good people.
                <br />
                On your side.
              </h2>
              <div className="contact-person">
                <span className="avatar contact-avatar">
                  {contact.initials}
                </span>
                <div>
                  <strong>{contact.name}</strong>
                  <p>{contact.title}</p>
                </div>
              </div>
              <p className="contact-availability">
                <span className="online-dot" />
                {contact.availability}
              </p>
              <Link href="/support" className="button button-secondary">
                Connect with your team <PortalIcon name="arrow" width="16" />
              </Link>
            </section>
          )}
          <section className="recommended-resources">
            <header className="compact-heading">
              <h2>Picked for your practice</h2>
              <PortalIcon name="bookmark" width="19" />
            </header>
            {preferredResources.map((resource, index) => (
              <Link
                href={resourceHref(resource)}
                className="resource-mini-card"
                key={resource.id}
              >
                <div className={`resource-art resource-art-${index}`}>
                  <PortalIcon
                    name={resource.type === "State guidance" ? "pin" : "book"}
                    width="36"
                    height="36"
                  />
                  <span>
                    {resource.type === "State guidance"
                      ? resource.states.length === 3
                        ? "Nationwide"
                        : resource.states
                            .map((state) => stateNames[state])
                            .join(" · ")
                      : "Grow what’s next"}
                  </span>
                </div>
                <div className="resource-mini-copy">
                  <span className="eyebrow">
                    {resource.type} · {resource.readMinutes} MIN READ
                  </span>
                  <h3>{resource.title}</h3>
                  <span className="text-link small">
                    Take a closer look <PortalIcon name="arrow" width="16" />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
