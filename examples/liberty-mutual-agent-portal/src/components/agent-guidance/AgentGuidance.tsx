'use client';

import { Text, RichText, Link, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { AgentGuidanceProps } from './agent-guidance.props';

/** Reusable editorial guidance. Sitecore owns every field and audience variant. */
export function Default({ fields, params }: AgentGuidanceProps) {
  const { page } = useSitecore();
  if (!fields) {
    return page.mode.isEditing ? <p className="cms-empty">Select an Agent Guidance content item.</p> : null;
  }
  return (
    <aside id={params?.RenderingIdentifier || undefined} className={["cms-guidance", params?.styles].filter(Boolean).join(" ")} aria-label="Agent guidance">
      <div>
        <Text field={fields.eyebrow} tag="p" className="cms-eyebrow" />
        <Text field={fields.headline} tag="h2" />
        <RichText field={fields.body} className="cms-rich-text" />
      </div>
      {(fields.actionLink?.value?.href || page.mode.isEditing) &&
        <Link field={fields.actionLink ?? { value: {} }} className="cms-action" />}
    </aside>
  );
}

export function Highlight(props: AgentGuidanceProps) {
  return <div className="cms-highlight"><Default {...props} /></div>;
}
