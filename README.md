# Professor InReach

**Find your research fit. Start the conversation.**

A first working ChatGPT/Codex plugin for prospective PhD applicants:

**CV + projects + intended topic → researched professors → comparison → selected email drafts.**

## Try the local plugin

Install **Professor InReach** from your personal plugin directory, then start a new chat with it enabled. Attach your CV and project notes and say:

> Use Professor InReach to find potential PhD supervisors. My intended topic is [topic], my target intake is [term/year], and my preferred countries are [countries]. Prioritize research fit and show citations separately.

For a first test without personal documents, use `examples/sample-applicant.txt`, which is clearly fictional. The plugin reads attachments and drafts emails in the host chat. Its server receives public research queries and page URLs, not uploaded CV files. Server tools do not send email or create mailbox drafts.

## What works in version 0.1

- Discover researchers from recent papers and retrieve their OpenAlex citations, topics and paper links.
- Read public faculty, lab, people and recruiting pages, retaining URLs, retrieval dates, headings and follow-up links.
- Check a quoted recruiting statement against the source and the applicant's intended intake.
- Guide ChatGPT through confirming the applicant profile, verifying faculty identities and titles, counting listed current students, explaining fit and drafting an email.
- Use topic fit as the default discovery order, with citation counts as a separate field.
- Run locally via stdio or expose a stateless HTTP MCP endpoint for ChatGPT developer testing.

Title interpretation, student categorization, fit explanations and email composition are performed by ChatGPT following the bundled workflow. They are not independently verified by an automated faculty database. The quote checker verifies text presence and intake consistency, not the meaning of a statement.

## Data access

Basic OpenAlex discovery works without a key within its anonymous budget. Set an optional `OPENALEX_API_KEY` on the server for a larger allowance. The optional `BRAVE_SEARCH_API_KEY` enables independent website search. Without it, the workflow uses ChatGPT's own web search; if that is unavailable, supply official faculty/lab URLs. Search snippets alone are not treated as evidence.

Only the first 50 relevant papers and up to 40 author records are examined per discovery query. The workflow expands related phrases and checks university pages to improve coverage. Citation totals are **OpenAlex** counts; affiliations are publication-derived until confirmed against official sources. Unknown student counts and recruiting statuses stay unknown.

## Run the server

Use Node.js 22 or newer; `.nvmrc` selects Node 24. Run these commands from the repository root. Build before installing the local plugin so its installed copy includes `dist/` and `node_modules/`.

```sh
npm ci
npm run build
npm test
npm start
```

The HTTP endpoint is `http://127.0.0.1:8787/mcp`; `/health` reports readiness. Local stdio mode is `npm start -- --stdio`.

Copy `.env.example` to `.env` only when changing configuration. Never put real keys in the example file. No OpenAI API key is needed: ChatGPT supplies the language model.

For live provider and stdio checks:

```sh
npm run test:live
```

Run outputs are stored in dated subfolders of `results/`.

## Connect to ChatGPT

See [Connect to ChatGPT](summary/CONNECT-TO-CHATGPT.md). A ChatGPT cloud connection needs a reachable HTTPS endpoint or a supported private development tunnel; a local folder or localhost URL alone does not connect the server to ChatGPT on the web. This project has not been publicly hosted or submitted for review.

The local `.mcp.json` runs `node` from `PATH` and sets `cwd` to `.`, which Codex resolves relative to the installed plugin folder. The `.env` and `./dist/index.js` paths are relative to that folder, so the checkout can live anywhere. Ensure the host can find Node.js 22 or newer on `PATH`. Local installation copies the built plugin; rebuild and reinstall after source or `.env` changes. If your personal marketplace uses a symlink to the checkout, update that symlink when moving the checkout.

## Files

| Location | Purpose |
| --- | --- |
| `src/` | MCP tools, OpenAlex client, page reader, ranking and recruiting checks |
| `skills/phd-outreach/` | CV intake, comparison, roster/recruiting evidence rules and email drafting |
| `tests/` | Data, failure-mode, privacy boundary and MCP integration checks |
| `examples/` | Fictional applicant for manual testing |
| `summary/` | Setup, design decisions and manual evaluation scenarios |
| `scripts/` | Live smoke test and shareable workflow packaging |
| `results/` | Dated test evidence and generated bundles |

## Design choices and current boundaries

No applicant database, accounts, automatic sending, mailbox access or admission-probability scoring are included. Profiles and shortlists remain in the conversation. Static HTML/text pages are supported; blocked, JavaScript-only or PDF pages may need the host browser or uploaded text. There is no scheduled refresh of faculty data.

The HTTP server binds to loopback by default, validates Host headers, rejects browser-origin calls, limits request size/rate and refuses private-network page URLs. For deployment behind a proxy, configure the exact `ALLOWED_HOSTS`. Add suitable access controls, monitoring and provider quotas before a public rollout. A Dockerfile is supplied as a deployment starting point, not as evidence of a deployed or production-reviewed service.

Project instructions called for `organize_project.py`, but that helper is absent from the current workspace. This project uses the requested typed folders directly; it creates no loose notebook builders or LaTeX sources.

## References

- [OpenAI: plugin architecture](https://developers.openai.com/plugins/concepts/plugins)
- [OpenAI: connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [OpenAI: submit plugins](https://developers.openai.com/plugins/deploy/submission)
- [OpenAlex: author data](https://help.openalex.org/data/authors/)
- [OpenAlex: authentication](https://help.openalex.org/api/authentication/)
