# Authenticated HTML workshop guide

The participant guide is served at `/workshops` on the existing Vercel application. It is intentionally absent from Agent Portal navigation and Sitecore content navigation. The PowerPoint deck is independent and was not changed by this implementation.

## Reader experience

- Marketing and development/architecture indexes contain 30 walkthroughs and 162 numbered steps.
- Each walkthrough states its purpose, prerequisites, accounts, actions, expected observations and cleanup.
- Guide instructions adapt shared portal account suffixes to the signed-in reviewer's assigned pack. Local exercises retain their isolated `.01` accounts.
- Screenshots can be enlarged. Checkmarks are stored in the current browser; clearing them never resets portal data or native profiles.
- Portal and native Sitecore links open separately. Native Sitecore tools require the reader's own separately authorized account.

## Access and session isolation

Use an existing assigned portal username and password. The guide issues `lm_workshop_session`, an HTTP-only, signed, eight-hour authentication cookie with a distinct issuer and audience. It never establishes a portal identity, clears portal cookies, imports profiles or records CDP events. Signing out of the guide leaves the portal session unchanged.

The proxy and server-rendered pages both require a valid guide session. Authentication endpoints enforce same-origin requests and use a separate login throttle. Pages are dynamic and marked noindex. These controls, not the unlisted URL, protect the guide.

Screenshot files live in `examples/liberty-mutual-agent-portal/workshop-assets`, outside `public`. The authenticated asset route returns private, no-store responses. The Next image optimizer accepts only `/brand/**` local sources, preventing it from caching private guide images. The Vercel function trace includes the screenshot directory. Keep this repository private.

No additional environment values are required: the guide reuses the existing server-side `PORTAL_SESSION_SECRET` and credential fixtures. Never embed operator secrets, attendee contact details or infrastructure credentials in guide content.

## Editing and verification

- `src/features/workshops/content/marketing.ts`: marketing walkthroughs.
- `src/features/workshops/content/development.ts`: development, architecture and coordinated reset walkthroughs.
- `src/features/workshops/content/screenshots.ts`: screenshot placement and explanatory captions.
- `src/features/workshops/types.ts`: typed authoring contract.
- `src/app/workshops`: server routes; `src/features/workshops`: shared UI.
- `src/server/workshops` and `src/app/api/workshops`: access and private asset delivery.

The initial content was reconciled against a read-only download of the canonical 149-slide SharePoint deck on 18 September 2026. Hidden facilitator slides and attendee personal information were excluded. `sourceSlides` records coverage without adding slide dependencies to the reader experience. HTML corrections include current account suffixes, date-independent instructions and the verified tenant-scoped Agentic Studio workspace link.

Run `npm test`, `npm run lint`, `npm run type-check` and `npm run build` from the app directory. Content tests check procedure coverage, links, complete steps, cleanup, protected screenshots and the actual local-development contract. Authentication tests verify cross-purpose token rejection and safe return paths.

Before releasing, also verify anonymous deep-link redirects, screenshot denial, authenticated images, separate portal identity, guide search, assigned-pack headings, progress retention, screenshot enlargement, code copy and logout. Read-only screenshot capture does not prove every mutating exercise was rerun; preserve that distinction in release notes.
