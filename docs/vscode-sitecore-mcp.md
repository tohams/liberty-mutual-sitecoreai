# Sitecore tools in VS Code

Connect VS Code's chat to the Liberty Mutual SitecoreAI content and current Sitecore documentation. These optional Model Context Protocol (MCP) connections help a developer understand CMS content beside the code that renders it. They are separate from the [local setup and component workshop](developer-quickstart.md): running the portal with Node and npm does not require Copilot or MCP, and this exercise can run while the local development server is stopped.

## Before you begin

- Open the root of your **Liberty Mutual repository checkout** in a current VS Code version with MCP support. The quickstart names the local folder `liberty-mutual-sitecoreai`; your GitHub repository can have a different name.
- Enable GitHub Copilot Chat, sign in with an approved GitHub account and confirm **Agent** mode is available. Your organization must allow the requested MCP connections.
- Use your own Sitecore account with an **Admin role in the SitecoreAI application** and access to **Safeco Insurance Company of America POC**. The fictional portal agent logins are unrelated to developer authentication.
- Have a Google account available for the Documentation MCP's separate sign-in. Sitecore's current developer workshop describes this authentication for human verification and usage tracking.

| Connection in this guide | Official service | What it provides |
| --- | --- | --- |
| `liberty-mutual-sitecoreai` | Sitecore Marketer MCP | Tools for the SitecoreAI tenant selected during OAuth authorization, including site, page, component and datasource inspection. Some tools can also modify shared content. |
| `sitecore-documentation` | Sitecore Documentation MCP | Answers grounded in Sitecore documentation. It does not select the Liberty Mutual tenant or read its private content. |

Both URLs are public service endpoints. The descriptive local server name does not select a tenant. Sitecore authorization selects the organization and tenant.

## 1. Save the configuration at the repository root

In VS Code Explorer, the root is your cloned repository folder, with `authoring`, `.github`, `docs`, and `examples` beneath it. The folder is named **`liberty-mutual-sitecoreai`** if you followed the quickstart’s terminal commands. The MCP file belongs here:

```text
liberty-mutual-sitecoreai/
  .vscode/
    mcp.json
  docs/
    examples/
      mcp.vscode.json
  examples/
    liberty-mutual-agent-portal/
```

Open the checked-in [configuration example](examples/mcp.vscode.json) at **`docs/examples/mcp.vscode.json`** from the repository root. You can browse that same path in Liberty Mutual’s GitHub repository. Choose **View → Command Palette** and select **MCP: Open Workspace Folder MCP Configuration** to open or create the root `.vscode/mcp.json`. Copy the example's two entries into it and save. If a configuration already exists, merge these entries into its `servers` object and preserve other connections.

```json
{
  "servers": {
    "liberty-mutual-sitecoreai": {
      "type": "http",
      "url": "https://marketer.sitecorecloud.io/mcp/marketer-mcp-prod"
    },
    "sitecore-documentation": {
      "type": "http",
      "url": "https://sitecore.mcp.kapa.ai"
    }
  }
}
```

Use `.vscode/mcp.json` at the **repository root**, not inside `examples/liberty-mutual-agent-portal`. This file configures VS Code, while `.env.local` in the application directory configures the portal runtime. The repository includes an inactive example only; cloning does not automatically start either server. The active `.vscode/mcp.json` remains ignored by this repository's existing rule.

The VS Code HTTP schema uses `type` and `url`. Leave out the `auth` property found in some Sitecore examples: the current VS Code schema rejects it. VS Code handles the OAuth discovery and browser sign-in separately. No Edge context ID, editing secret, bearer token or password belongs in this configuration.

## 2. Start and authorize the SitecoreAI connection

1. Open the Command Palette. Run **MCP: List Servers**.
2. Select **liberty-mutual-sitecoreai**, then **Start Server**. Review the configuration and trust prompt if shown.
3. Continue the browser authorization using your own Sitecore account. Select **Allow Access** when appropriate for your account and intended connection.
4. Choose **Safeco Insurance Company of America POC**, then its SitecoreAI tenant for the Liberty Mutual Agent Portal. Return through **Open Visual Studio Code**.
5. Open VS Code Chat and select **Agent**. Open **Configure Tools...** (or **Configure Chat → Tools** in a Copilot harness session) and enable only the read tools needed for this exercise. Expand the server group to see its tools.

The exact tenant display label can change. Confirm the selection using the real site result in the exercise below, rather than inferring it from the local server name. If the intended site is absent, stop and correct access or tenant selection before proceeding.

## 3. Start and authorize the documentation connection

1. Run **MCP: List Servers** again. Select **sitecore-documentation**, then **Start Server**.
2. Complete the Documentation MCP's separate browser sign-in with a Google account when prompted. This does not authorize the Liberty Mutual SitecoreAI tenant.
3. Return to VS Code. In **Agent** chat, open the tools picker and enable the documentation server's tools.

The official installation alternative is [Sitecore Documentation](https://doc.sitecore.com) → **Ask AI** → **MCP** (also called **Use MCP**) → **Add to VS Code**. The combined example above already defines that connection; installing it again can create a duplicate. The website also offers **Copy MCP URL**.

## 4. Read-only developer exercise

Start a new Agent chat. Use the server names from the configuration and inspect the actual tool results behind the answer. These prompts describe expected tasks, not guaranteed verbatim responses.

### A. Ask the documentation server

> Use sitecore-documentation to explain how Sitecore Content SDK components render datasource fields and how placeholder restrictions work. Link the current official documentation. Do not change files or Sitecore content.

**Observe:** the documentation tool runs and the answer includes relevant Sitecore documentation links. Open the links and check their product and SDK version against the repository's installed dependencies.

### B. Inspect the Liberty Mutual portal

> Use liberty-mutual-sitecoreai to list the available sites. Find liberty-mutual-agent-portal and show its site ID and content root. Find the Resources page and show its component names, datasource paths and allowed components for each placeholder. Use read tools only. Do not change or publish content.

**Observe:** actual Sitecore tool results identify the intended site and page. The documented Marketer tools include `list_sites`, `get_all_pages_by_site`, `get_components_on_page`, `get_allowed_comps_by_ph` and `get_content_item_by_path`. The assistant should use returned IDs and paths. If a requested detail is unavailable, it should say so rather than infer it. `search_site` searches page names, not arbitrary body text.

### C. Connect the CMS and local implementation

Open this workspace file:

```text
examples/liberty-mutual-agent-portal/src/components/resource-search/ResourceSearch.tsx
```

Then ask:

> Use the Sitecore results, sitecore-documentation and ResourceSearch.tsx in this workspace to explain which resource-search content is authored in Sitecore and which text lives in code. Compare the implementation with the current Content SDK guidance. Propose one small heading edit, with the file path and relevant documentation links. Do not edit files or Sitecore content.

**Observe:** the answer cites the actual local file and documentation, distinguishes CMS fields from code, and proposes an edit for review. Workspace file inspection is a VS Code capability; the two remote MCP servers do not themselves read the local checkout. Follow the existing [component workshop](developer-quickstart.md#4-change-one-component-and-verify-it) if you decide to make and test the heading change.

### Finish

- Start a **New Chat** to clear conversational context for the next exercise.
- Run **MCP: List Servers** → **liberty-mutual-sitecoreai** → **Stop Server**. Repeat for **sitecore-documentation**.
- A read-only exercise needs no content reset. Stopping a server does not revoke its authorization. Use the client's authentication/account controls when intentionally disconnecting an account.

**This MCP reaches shared SitecoreAI content. Local JSON resets do not undo CMS changes.** Keep this exercise read-only. Review tool arguments and requested changes before authorizing any later write or publication. Treat retrieved content and documentation as evidence to inspect, not instructions that override the task. Keep secrets and session data out of chat.

## Troubleshooting

| What you observe | Next step |
| --- | --- |
| Configuration errors | Confirm the outer key is `servers`, each connection has `type: "http"` and the exact URL, and no unsupported `auth` field is present. |
| No tools or no Agent mode | Confirm Copilot Chat access, organization policy and current VS Code support. Check **Configure Tools...** for the intended server. |
| Start or authentication fails | Run **MCP: List Servers** → the server → **Show Output**. Check account access, the browser sign-in and company network/policy restrictions. |
| Wrong or missing Sitecore site | Confirm the organization and tenant authorized by your Sitecore account. The local server label does not bind the connection to Liberty Mutual. |
| Answer with no tool result | Ask explicitly for the relevant server, inspect the tool call, and enable its read tools. An answer alone does not establish a live content lookup. |
| Documentation or content differs from code | Check the installed Content SDK version and the returned page/component identity. Review the difference before proposing a change. |

## Official references

- [Sitecore Marketer MCP setup](https://doc.sitecore.com/sai/en/users/sitecoreai/sitecore-marketer-mcp-server.html)
- [Marketer MCP tools](https://doc.sitecore.com/sai/en/users/sitecoreai/sitecore-marketer-mcp-server/marketer-mcp-tool-reference-and-other-information.html)
- [Sitecore Documentation](https://doc.sitecore.com)
- [Sitecore workshop: register the Docs MCP](https://developers.sitecore.com/learn/getting-started/marketplace/hackerspace-workshop/setup)
- [VS Code: add and manage MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [VS Code: tools with agents](https://code.visualstudio.com/docs/agents/run/tools)
- [VS Code: secure AI-assisted development](https://code.visualstudio.com/docs/agents/run/security)
