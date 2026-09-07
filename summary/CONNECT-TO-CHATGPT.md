# Connect Professor InReach to ChatGPT

## Local development

The local plugin can run in Codex using `.mcp.json`. Its absolute paths intentionally use this development checkout and Node 26. Install it from the personal marketplace, then start a new chat to load the skill and tools. The local registration is separate from public ChatGPT distribution.

For ChatGPT on the web:

1. Start the HTTP server with Node 22+ using `npm start`.
2. Make it reachable via a supported private Secure MCP Tunnel or an HTTPS development endpoint. Configure `ALLOWED_HOSTS` for the actual forwarded Host header. A cloud ChatGPT connection cannot reach your computer's localhost directly.
3. In ChatGPT, open **Settings → Security and login → Developer mode**, if available to the account/workspace.
4. Open the Plugins page, select **+**, and add the `/mcp` URL or supported tunnel connection.
5. Start a new chat, enable Professor InReach, attach a fictional test CV, and ask it to call `get_workflow_guide` and begin the workflow.

The workflow guide tool makes intake and drafting instructions available even before you upload a separate skill bundle. No server-side file-upload endpoint is required for this version; ChatGPT reads the attachments. The service has not been deployed or connected to the user's ChatGPT account as part of the initial build.

## Public distribution

1. Deploy the server at a stable public HTTPS URL with a `/mcp` route. The supplied Dockerfile runs the service on port 8787. Configure the public hostname explicitly and assess authentication, quotas and reverse-proxy settings for the hosting environment.
2. Run the live smoke check and MCP client tests against the deployed service.
3. Open the OpenAI Platform plugin submission portal and select **Create plugin → With MCP**.
4. Enter the production URL and scan tools. This version does not implement the draft MCP skills-import extension; upload the bundled skill separately.
5. Run `npm run package:plugin` to create the shareable workflow archive in `results/`. The archive intentionally excludes `.env`, machine-specific `.mcp.json`, source dependencies and personal documents. It contains instructions, not a hosted server.
6. Upload the skill bundle. Add verified publisher identity, real website/support/privacy/terms URLs, starter prompts, availability and evaluation cases from `EVALUATION.md`.
7. Submit for review. Following approval, publish from the portal.

No publisher domain, privacy-policy URL, company identity or hosting account has been invented for this prototype.

## Costs and configuration

The plugin uses the ChatGPT conversation for reasoning and writing. There is no separate OpenAI API bill from this code. Hosting and provider usage can incur costs according to the services selected. Anonymous OpenAlex use has a smaller budget than keyed use; independent Brave search requires a server-side key. Existing ChatGPT access and tool availability depend on the applicant's account and workspace.

Checked against official documentation during the initial build:

- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/plugins/deploy/submission
- https://help.openalex.org/api/authentication/
