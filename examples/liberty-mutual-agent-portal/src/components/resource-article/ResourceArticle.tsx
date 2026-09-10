'use client';

import { Text, RichText, Link, DateField, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { ResourceArticleProps } from './resource-article.props';

export function Default({ fields, params }: ResourceArticleProps) {
  const { page } = useSitecore();
  if (!fields) return page.mode.isEditing ? <p className="cms-empty">Select a Resource Article content item.</p> : null;
  return (
    <article id={params?.RenderingIdentifier || undefined} className={["cms-article", params?.styles].filter(Boolean).join(" ")}>
      <div className="cms-article-meta"><Text field={fields.resourceType} tag="span" /><Text field={fields.state} tag="span" /></div>
      <Text field={fields.Title ?? fields.title} tag="h1" />
      <Text field={fields.summary} tag="p" className="cms-article-summary" />
      <RichText field={fields.body} className="cms-rich-text" />
      <footer>
        {(fields.reviewedAt?.value || page.mode.isEditing) && <p>Reviewed <DateField field={fields.reviewedAt ?? { value: '' }} render={date => date ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date) : ''} /></p>}
        {(fields.sourceLink?.value?.href || page.mode.isEditing) && <Link field={fields.sourceLink ?? { value: {} }} />}
      </footer>
    </article>
  );
}
