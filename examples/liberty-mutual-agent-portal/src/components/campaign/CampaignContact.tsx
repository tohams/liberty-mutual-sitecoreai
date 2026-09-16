"use client";

import { useState, type FormEvent } from "react";
import { Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { PortalLink } from "@/components/ui/portal-link";
import { PortalDialog } from "@/components/ui/portal-dialog";
import { PortalIcon } from "@/components/ui/portal-icon";
import { usePortal } from "@/features/portal/portal-context";
import type { CampaignProps } from "./campaign.props";

export function Default({ fields, params }: CampaignProps) {
  const { page } = useSitecore();
  const { data, act, busy } = usePortal();
  const [open, setOpen] = useState(false);
  const contact = data.contacts.find((item) =>
    item.lines.includes("small-commercial"),
  );
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact || page.mode.isEditing) return;
    const form = new FormData(event.currentTarget);
    const result = await act(
      {
        type: "request-contact",
        contactId: contact.id,
        topic: String(form.get("topic") ?? "").trim(),
      },
      "Your growth conversation has been saved to your agency priorities.",
    );
    if (result) {
      setSaved(true);
      setOpen(false);
    }
  }
  if (!fields)
    return page.mode.isEditing ? (
      <p className="cms-empty">Select a Campaign Contact content item.</p>
    ) : null;
  return (
    <section
      className="cms-campaign-contact"
      id={params?.RenderingIdentifier || undefined}
    >
      <span className="round-icon">
        <PortalIcon name="headset" width="26" />
      </span>
      <Text field={fields.title} tag="h2" />
      <Text field={fields.summary} tag="p" />
      {contact || page.mode.isEditing ? (
        <button
          type="button"
          className="button button-primary cms-action"
          onClick={() => {
            setSaved(false);
            setOpen(true);
          }}
        >
          <Text field={fields.buttonLabel} />
          <PortalIcon name="arrow" width="16" />
        </button>
      ) : (
        <PortalLink
          href="/support"
          className="button button-primary cms-action"
        >
          Meet your relationship team
          <PortalIcon name="arrow" width="16" />
        </PortalLink>
      )}
      {saved && (
        <p className="cms-campaign-contact-success" role="status">
          <PortalIcon name="check" width="17" />
          Request saved.{" "}
          <PortalLink href="/support">View your requests</PortalLink>
        </p>
      )}
      <PortalDialog
        title="Plan your next growth conversation"
        eyebrow={
          contact
            ? `YOUR RELATIONSHIP TEAM · ${contact.name}`
            : "YOUR RELATIONSHIP TEAM"
        }
        open={open}
        onClose={() => setOpen(false)}
      >
        <form className="portal-form" onSubmit={submit}>
          <p className="lead-description">
            Share the opportunity you have in mind so your team has the context
            to help.
          </p>
          <label>
            What would you like to discuss?
            <textarea
              name="topic"
              required
              minLength={3}
              maxLength={1000}
              placeholder="For example, preparing the next small-business account or building a focused growth plan."
            />
          </label>
          <p className="form-note">
            Your request is saved with your agency priorities. You can return to
            it in Support.
          </p>
          <button
            className="button button-primary"
            disabled={busy || page.mode.isEditing}
          >
            Save conversation request
            <PortalIcon name="arrow" width="16" />
          </button>
        </form>
      </PortalDialog>
    </section>
  );
}
