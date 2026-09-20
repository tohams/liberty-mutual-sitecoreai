# Portal and workshop spacing review

## Cause and correction

The Resource Search and Agent Guidance renderings were adjacent children without a composition gap. Search pagination contributed its own bottom margin, concealing the defect until a search returned only one page. The filtered results grid then touched the guidance card (measured gap: 0 px).

Authored component stacks now own a shared 24 px gap. This covers Resource Search, guidance, and repeated product spotlights without adding margins to individual guidance components. Empty stacks do not reserve space. Terminal search panels and pagination do not add a second bottom margin. Page Builder metadata stays in the DOM but does not occupy grid tracks.

Workshop corrections preserve inline links inside prose, separate the preparation block from the following introduction, stack attendee columns at tablet widths, and wrap reset identity details on narrow screens.

## Browser verification

Verified against the connected local application with the unassigned `avery.15` account. No submissions, form requests, resets, or attendee content changes were made.

| Surface | Coverage and result |
| --- | --- |
| Workspace | Desktop and 375 px mobile: 24 px between priorities, guidance, and recent activity. |
| Resource Search | Desktop and mobile filtered results: 24 px before guidance. Desktop empty results and page 2 of paginated results: 24 px. No horizontal overflow. |
| Main portal screens | Workspace, Quote & submit, Clients & policies, Products & appetite, Agency growth, and Support inspected at desktop and 375 px widths. Component sections remain separated; no page overflow. |
| Product detail pages | All seven product families opened; content rendered, shared stack gap present, and no horizontal overflow. |
| Resource articles | All 12 search-index articles opened at desktop width. Shared article layout also inspected at 375 px. No horizontal overflow. |
| Campaign page | Small-business page inspected at desktop and mobile widths. Main and sidebar components retain their existing internal gaps. |
| Submission dialog | Existing draft inspected at desktop and mobile widths without saving changes. Content and actions remain within the scrollable dialog. |
| Native contact form | Waited for the external form to finish loading. The form retains a 30 px gap before the following service section at desktop and mobile widths. No request submitted. |
| Workshop guides | All 24 current guides opened at desktop and 375 px widths. No horizontal page overflow or overlapping numbered steps. |
| Workshop navigation and accounts | Overview, both audience directories, attendee assignments, and reset page checked. Attendee columns stack at 768 px; usernames fit at 375 px. Overview inline links remain inline, and the following introduction has a 28 px gap. |

This is a layout review, not a repetition of every workflow's functional acceptance test. Native editor metadata was inspected in the installed SDK; no shared Page Builder content was changed.

## Repeat when changing page composition

- Check resource results with pagination, a single page, no matches, and a loading/error state.
- Inspect component boundaries, including repeated components and empty authored placeholders.
- Check the workspace with guidance between priorities and recent activity.
- Inspect desktop, tablet, and mobile widths. Check both page overflow and intended scrollable tables or dialogs.
- Verify workshop prose links, preparation sections, attendee assignments, and long reset identifiers.
- Run lint, type checking, domain tests, and the connected production build before release.
