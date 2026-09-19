# Authenticated HTML workshop guide

The participant guide is served at `/workshops` on the existing Vercel application. It is intentionally absent from Agent Portal navigation and Sitecore content navigation. The presentation introduces the experience; the website contains the detailed walkthroughs.

## Reader experience

- **Marketing** separates **Explore the Agent Portal** from **Create and manage content in SitecoreAI**. **Development & architecture** separates **Understand the architecture** from **Develop locally**. Section headings and navigation help readers move between those tasks.
- Guide names use short actions. Suggested exercise durations are omitted; actual processing waits remain in the relevant steps.
- Shared CMS changes and approval are presenter-led. The component-content demonstration changes, previews, and restores one field. Attendees do not need author/approver pair assignments, and bulk editing and capability-boundary reviews are not participant exercises.
- Each walkthrough states its purpose, prerequisites, accounts, actions, expected observations, and cleanup.
- Guide instructions adapt shared portal account suffixes to the signed-in participant's **workshop number**. Each number identifies seven agent logins with the same suffix; **01** is reserved for presenters. Local exercises retain their isolated `.01` accounts.
- Screenshots can be enlarged.
- Portal and native Sitecore links open separately. Native Sitecore tools require the reader's own separately authorized account.
- `/workshops/reset` provides self-service workspace controls. Choose a **Workshop number** from `01`–`15`; the page initially selects the signed-in participant's number and shows the seven current profile identities associated with that number.
- Click **Reset workshop [number]** for the selected number. This single clean reset always restores starting operational work and imports and verifies seven fresh native profiles together. All seven personas with that suffix must sign in to the portal again after completion.
- Workshop number is the only setting to choose. The reset affects the current host only; production and preview have their own reset-page URLs and saved-work state. No separate operator secret, terminal command, or approval is required.
- The reset page's **Agent identity** value is the current value to copy into SitecoreAI **Performance → Profiles → Search filter → Liberty Mutual agent identity**. It is not the native profile UUID. Selecting a number or refreshing status does not request a reset.

## Access and session isolation

Use an existing assigned portal username and password. The guide issues `lm_workshop_session`, an HTTP-only, signed, eight-hour authentication cookie with a distinct issuer and audience. Reading the guide, signing in, or signing out does not establish a portal identity, clear portal cookies, import profiles, or record CDP events. An explicit reset changes the seven accounts with the selected workshop number: it restores starting work, imports and verifies new profiles, and invalidates those accounts' portal sessions when completed. The guide session remains separate.

The proxy and server-rendered pages both require a valid guide session. Authentication endpoints enforce same-origin requests and use a separate login throttle. Pages are dynamic and marked noindex. These controls, not the unlisted URL, protect the guide.

Screenshot files live in `examples/liberty-mutual-agent-portal/workshop-assets`, outside `public`. The authenticated asset route returns private, no-store responses. The Next image optimizer accepts only `/brand/**` local sources, preventing it from caching private guide images. The Vercel function trace includes the screenshot directory. Keep this repository private.

No additional environment values are required: the guide reuses the existing server-side `PORTAL_SESSION_SECRET` and credential fixtures. Never embed operator secrets, attendee contact details, or infrastructure credentials in guide content.

The reset page uses the existing hosted persistence and profile-import configuration through its authenticated server routes. Users never receive those credentials. Earlier native profiles and analytics remain historical after the fresh profiles are activated. Reset does not edit CMS content, refresh Search, remove media, restore Brand Kits or Agentic artifacts, erase webhook receipts, or reset experiment history. Saved work has no automatic expiry.

The isolated local-development workshop keeps tracking disabled and uses local JSON state. It does not have the connected native-import configuration required by this clean reset. Its component exercise finishes by restoring the edited heading and stopping the local development server; no shared reset is needed.

## Editing and verification

- `src/features/workshops/content/marketing.ts`: marketing walkthroughs.
- `src/features/workshops/content/development.ts`: development, architecture, and self-service reset walkthroughs.
- `src/features/workshops/content/screenshots.ts`: screenshot placement and explanatory captions.
- `src/features/workshops/types.ts`: typed authoring contract.
- `src/app/workshops`: server routes; `src/features/workshops`: shared UI.
- `src/server/workshops` and `src/app/api/workshops`: access and private asset delivery.

Walkthrough prose supports `**named entity**` for bold emphasis on the exact views, controls, fields, apps, components, usernames, and files that readers need to find. Use this only in summaries, outcomes, prerequisites, actions, expected observations, notes, and cleanup prose. Keep titles, headings, metadata, link labels, URLs, image alt text, and copyable code free of these markers. This is limited inline emphasis, not a general Markdown renderer; preserve the original instructions and command text.

The initial content was reconciled against a read-only download of the canonical 149-slide SharePoint deck on 18 September 2026. Hidden facilitator slides and attendee personal information were excluded. `sourceSlides` records coverage without adding slide dependencies to the reader experience. HTML corrections include current account suffixes, date-independent instructions, and the verified tenant-scoped Agentic Studio workspace link.

Run `npm test`, `npm run lint`, `npm run type-check`, and `npm run build` from the app directory. Content tests check procedure coverage, links, complete steps, cleanup, protected screenshots, the actual local-development contract, reset-page instructions, and current profile lookup. Authentication tests verify cross-purpose token rejection and safe return paths.

Before releasing, also verify anonymous deep-link redirects, screenshot denial, authenticated images, separate portal identity, guide search, assigned workshop-number headings, screenshot enlargement, code copy, and logout. Verify the single reset action, workshop-number selector, current-host scope, restored saved work, fresh profiles, required portal sign-in, progress/resume behavior, and unaffected comparison workshop numbers. Record the exact workshop number and host used. Read-only screenshot capture does not prove every mutating exercise was rerun; preserve that distinction in release notes.
