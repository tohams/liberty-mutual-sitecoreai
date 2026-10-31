Liberty Mutual Agent Portal — local personalization testing

Purpose
Run the portal on your own machine in Next.js production mode and test its
existing SitecoreAI personalization in a normal browser. Sitecore supplies the
content, identity linking, and personalization decisions. The included tools
supply trusted localhost HTTPS and an isolated local workspace service.

The workspace service stores local portal work, such as saved resources. It does
not simulate SitecoreAI personalization. Browser activity still updates the
fictional agent profiles in the shared SitecoreAI environment.

This repository contains the login-readiness fix and the local testing tools.
Use the latest main branch; no separate patch or download is required. Login
obtains the agent identity independently of workspace content and waits for
Sitecore to link the browser to the known profile before opening Home.

Ordinary setup:local uses local JSON storage for development. Production mode
requires a configured workspace service. These tools provide that local service,
enable tracking for both build and runtime, and invoke npm run build and
npm run start with the same settings. They do not deploy anything.

Use your team's repository. Its URL and folder name may differ from the original
repository. Every path below is relative to the root of your team's repository.

1. Prepare your machine and application
You need Git, VS Code, Chrome, Node.js 24, npm, and mkcert. The tested Node version
was 24.19.0. Install mkcert using its official instructions:

    https://github.com/FiloSottile/mkcert#installation

Stop any existing local server using ports 3000, 3001, or 6380. Open your team's
repository in VS Code. In its terminal, change from the repository root into the
application directory and run:

    cd examples/liberty-mutual-agent-portal
    node --version
    npm run setup:local
    npm ci

node --version must show v24.x.x. Run all remaining Node and npm commands from
this application directory, which contains package.json. The repository root
does not contain the portal's package.json.

setup:local creates or completes the POC's .env.local. Its server context and
scoped public browser context must remain distinct. The local tools retain your
existing .env.local. They supply their production-test settings only to child
processes. Do not copy the hosted portal's Redis credentials into this setup.

2. Create trusted localhost HTTPS
Run the following commands from the application directory:

    mkcert -install
    node tools/local-personalization/run.mjs prepare
    mkcert -cert-file certificates/localhost.pem -key-file certificates/localhost-key.pem localhost 127.0.0.1 ::1

Complete any operating-system trust prompt from mkcert. It creates a local
certificate authority on your own machine. The prepare command records the path
to its public root certificate and creates private settings for local storage.
The final command creates the localhost certificate and its private key.

If you already have a valid trusted localhost certificate at these exact paths,
you may reuse it. For a certificate authority outside mkcert's default location:

    node tools/local-personalization/run.mjs prepare --ca-file /path/to/public-rootCA.pem

Use a public root certificate, not a root private key. Never share or commit
certificate private keys. The helper adds the certificate and local-state
directories to this checkout's Git exclusions.

3. Build and start production mode
Run:

    node tools/local-personalization/run.mjs build
    node tools/local-personalization/run.mjs start

The build command runs npm run build with tracking enabled. The start command
runs npm run start on an internal localhost port and starts the HTTPS relay and
workspace service. Keep this terminal open. Wait for:

    Ready: https://localhost:3000/login

Open https://localhost:3000/login in Chrome. Use https, not http. Browser tracking
requires HTTPS, and the session cookie is marked Secure. No deployment is needed
to test these local changes.

4. Check the first personalized page after login
Sign in with password password. Use the Sign out control before changing users.

    maya.01    Home: Connect everyday conversations to new needs
    avery.01   Home: Build your next chapter in small business
    daniel.01  Home: the default Agency Growth guidance

On My workspace, the portal's home page, scroll below Your priorities to the
Agency Growth card immediately above Recent activity. Maya and Avery should see
the headings above on the first page after login, without manually refreshing.
Daniel is the comparison persona for the default guidance. Daniel's licensed
product states are Illinois and Texas; Florida must not appear as a licensed
state choice in Products & appetite.

The original local production test also checked all seven personas for number 01.
Use numbers 01–15 for this specific local test setup. Reserve numbers 16–20 need
native profile initialization before they can be used with this local store.
For concurrent testing, choose different numbers so that participants do not
change the same shared Sitecore profile's browsing history.

5. Check behavior-driven affinity through normal browsing
To repeat the verified journey, sign in as maya.15 with password password:

    Products & appetite
    Set Risk state to Texas
    Select Personal lines
    Personal insurance — Explore coverage
    Explore the preparation guide
    Read the household-renewal article that opens
    Return to Products & appetite

The product guidance spotlight should favor household renewals, with the heading
Make the next household renewal conversation count. The verified journey changed
that spotlight through normal navigation without a manual refresh. Existing
profile history can mean the relevant spotlight is already selected. The current
risk state remains Texas; affinity does not expand the agent's licensed states.

These checks use the normal portal browser experience. This launcher is not the
Page Builder editing-host exercise. Continue using the documented development
workflow for component editing and Page Builder.

Location conditions, such as a visitor currently being in Oregon, require trusted
visitor-geolocation information. Validate those on the hosted portal. Localhost
does not supply that information, and an agent's licensed states are separate
from the visitor's physical location.

6. Stop or resume
Press Ctrl+C in the launcher terminal to stop the portal, HTTPS relay, and
workspace service. Its private local workspace data remains on disk. To resume
the same configuration:

    node tools/local-personalization/run.mjs start

After a source change, repeat build, then start. Public tracking and context
settings are compiled into the browser bundle, so changing runtime variables
alone cannot update an existing build. After stopping this launcher, npm run dev
continues to use your ordinary .env.local development settings.

Troubleshooting
- ENOENT / missing package.json: change into examples/liberty-mutual-agent-portal.
- Missing identity route: update your repository to the latest main branch.
- A port is unavailable: stop the process using that port. The helper does not
  stop another program. Before the first prepare, optional --https-port,
  --app-port, and --store-port settings can select three different free ports.
  Subsequent prepare commands must retain those choices and the same CA path.
- Certificate warning: complete mkcert's trust installation and create the
  localhost certificate from the same authority recorded by prepare. Do not
  bypass certificate verification.
- Cloud Redis setting detected: remove the cloud Redis URL and token from your
  local .env files and terminal environment before using isolated local storage.
- An old browser session returns to login: sign in again after starting this
  launcher. It uses its own local session credentials.
- Default content after editing a rule: confirm the experience and its content
  are active/published, and test the relevant agent and conditions. These tools
  configure the local runtime; they do not activate or publish Sitecore rules.

Optional check of the supplied local tools
From the application directory, run:

    node --test tools/local-personalization/run.test.mjs tools/local-personalization/local-services.test.mjs

The test suite checks trusted HTTPS, login-compatible Redis commands, isolation,
durability, cookies, origin handling, settings, and port conflicts. The HTTPS test
uses the openssl executable to generate temporary test certificates; if openssl
is not on PATH, install it before running this optional suite.
