"use client";

import { useState, type FormEvent } from "react";
import { PortalLink as Link } from "@/components/ui/portal-link";
import { PortalDialog } from "@/components/ui/portal-dialog";
import { PortalIcon } from "@/components/ui/portal-icon";
import { dateLabel, lineNames, usePortal } from "../portal/portal-context";

export function SupportScreen() {
  const { data, act, busy } = usePortal();
  const [contactId, setContactId] = useState("");
  const contact = data.contacts.find((item) => item.id === contactId);
  const supportTasks = data.tasks.filter((item) =>
    ["service", "follow-up"].includes(item.kind),
  );
  async function requestContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact) return;
    const form = new FormData(event.currentTarget);
    const result = await act(
      {
        type: "request-contact",
        contactId: contact.id,
        topic: String(form.get("topic")),
      },
      "Your contact request has been added to your priorities.",
    );
    if (result) setContactId("");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="breadcrumb">PEOPLE IN YOUR CORNER</div>
          <h1>Let&apos;s move forward, together.</h1>
          <p>The right expertise, when you need a little direction.</p>
        </div>
      </div>
      <section className="support-banner">
        <div>
          <span className="eyebrow">YOUR LIBERTY MUTUAL TEAM</span>
          <h2>
            Real partnership.
            <br />
            Personal attention.
          </h2>
          <p>
            From an unfamiliar risk to an opportunity you can&apos;t wait to
            pursue, your team is here to help you find the next step.
          </p>
        </div>
        <div className="support-banner-art" aria-hidden="true">
          <span />
          <span />
          <span />
          <PortalIcon name="headset" width="100" height="100" />
        </div>
      </section>
      <div className="contact-grid">
        {data.contacts.map((item) => (
          <article className="contact-card" key={item.id}>
            <div className="contact-card-heading">
              <span className="avatar avatar-large">{item.initials}</span>
              <span className="status status-active">
                Your relationship team
              </span>
            </div>
            <h2>{item.name}</h2>
            <p className="contact-role">{item.title}</p>
            <div className="contact-lines">
              {item.lines.map((line) => (
                <span key={line}>{lineNames[line]}</span>
              ))}
            </div>
            <p className="contact-hours">
              <PortalIcon name="clock" width="15" />
              {item.availability}
            </p>
            <button
              className="button button-secondary"
              onClick={() => setContactId(item.id)}
            >
              Request a conversation
              <PortalIcon name="arrow" width="16" />
            </button>
          </article>
        ))}
      </div>
      <div className="support-columns">
        <section className="panel">
          <header className="panel-heading">
            <h2>Your service & follow-up requests</h2>
          </header>
          <div className="priority-list">
            {supportTasks.length ? (
              supportTasks.map((task) => (
                <div className="priority-row" key={task.id}>
                  <span className="round-icon">
                    <PortalIcon name="headset" width="18" />
                  </span>
                  <div className="priority-description">
                    <strong>{task.title}</strong>
                    <span>{task.description}</span>
                    <small>Due {dateLabel(task.dueDate)}</small>
                  </div>
                  <span
                    className={`status ${task.status === "Completed" ? "status-completed" : ""}`}
                  >
                    {task.status}
                  </span>
                  {task.status === "Open" && (
                    <button
                      className="icon-button complete-task"
                      disabled={busy}
                      onClick={() =>
                        act(
                          { type: "complete-task", taskId: task.id },
                          "Request marked complete.",
                        )
                      }
                      aria-label={`Complete ${task.title}`}
                    >
                      <PortalIcon name="check" width="17" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <PortalIcon name="check" width="30" />
                <h3>You&apos;re all caught up.</h3>
                <p>
                  Your saved service requests and follow-ups will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
        <aside className="helpful-card">
          <span className="eyebrow">A GOOD PLACE TO START</span>
          <h2>An answer may be a click away.</h2>
          <Link href="/resources">
            Find a guide or checklist
            <PortalIcon name="arrow" width="16" />
          </Link>
          <Link href="/products">
            Explore product guidance
            <PortalIcon name="arrow" width="16" />
          </Link>
          <Link href="/clients">
            Request help with a policy
            <PortalIcon name="arrow" width="16" />
          </Link>
          <Link href="/quote">
            Check a submission&apos;s progress
            <PortalIcon name="arrow" width="16" />
          </Link>
        </aside>
      </div>
      <PortalDialog
        title={`Connect with ${contact?.name || "your team"}`}
        eyebrow={contact?.title}
        open={!!contact}
        onClose={() => setContactId("")}
      >
        <form className="portal-form" onSubmit={requestContact}>
          <p className="lead-description">
            Let us know what you&apos;re working on so your team has the context
            to help.
          </p>
          <label>
            What would you like to discuss?
            <textarea
              name="topic"
              placeholder="Tell us about the account, product, or opportunity."
              required
              maxLength={1000}
            />
          </label>
          <p className="form-note">
            Your request will be saved with your agency priorities.
          </p>
          <button className="button button-primary" disabled={busy}>
            Save contact request
            <PortalIcon name="arrow" width="16" />
          </button>
        </form>
      </PortalDialog>
    </>
  );
}
