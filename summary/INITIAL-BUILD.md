# Initial build — September 6, 2026, America/Chicago

The user selected the name **Professor InReach**, the directory `Research/Ran's Lab/projects/professor-inreach`, and **topic fit first with citations shown separately** as the default search order.

## Implemented

A Node/TypeScript MCP server provides six public-research tools, paired with a complete applicant workflow skill. The host ChatGPT/Codex conversation handles CV/project attachments, interpretation of official faculty pages, group-member counting, personalized matching, comparison and editable emails. The server supplies OpenAlex discovery, author details, public page reading, optional Brave search and recruiting-excerpt checks. It has no applicant database or email-sending capability.

The project has a valid local plugin manifest, personal-marketplace registration, local stdio configuration, HTTP endpoint, Dockerfile, fictional applicant example, evaluation scenarios and a shareable skills archive. Local installation is enabled. Start a new chat to load it.

## Validation

- TypeScript compilation completed.
- Automated tests passed for ranking, author identity handling, country filtering, private-network rejection, page extraction, excerpt matching, recruiting-intake qualification, missing optional provider configuration and MCP client/server communication.
- A live smoke test returned five OpenAlex author candidates, retrieved an author record, read a public source page and connected to the server in a separate stdio process.
- Live results demonstrated why citation attribution needs verification: one author record listed eight institutions. Both discovery and detail results now mark citation attribution unverified and flag records with many listed institutions for identity review.
- Plugin and skill validation passed. Local plugin inventory and MCP configuration both recognize Professor InReach.
- Actual ChatGPT web connection, full model-driven applicant evaluation and public deployment have not been completed. Manual test scenarios are documented separately and are not claimed as passed.

## Next practical step

Start a new local chat, invoke Professor InReach and attach the fictional applicant in `examples/`. Evaluate shortlist quality and an email draft, then connect a hosted or tunneled endpoint to ChatGPT for web testing. Website searches currently use host web search unless an optional Brave key is configured.

The organizer mentioned in the parent AGENTS.md is absent from this workspace; typed folders were applied directly. The local MCP configuration is intentionally machine-specific. Public distribution uses the hosted endpoint plus the shareable workflow bundle, not that local configuration.

## Relocation

Moved at the user's request to `/Users/jeremychen/My Drive/Ran's Lab/projects/research-agents/professor-inreach`. Local MCP launch paths and the personal-marketplace symlink now point to this location.

During GitHub setup the source was found at `/Users/jeremychen/My Drive/Ran's Lab/projects/professor-inreach`. Local registration was updated to this current location.
