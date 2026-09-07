import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { OpenAlex } from "../src/openalex.js";
import { readPage } from "../src/pages.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/** Exercise real research discovery, source reading, and a separate MCP server process. */
async function smokeTest() {
  const client = new OpenAlex(process.env.OPENALEX_API_KEY);
  const discovery = await client.search("spiral spin liquid", [], new Date().getUTCFullYear() - 5, 5);
  if (!discovery.candidates.length) throw new Error("Live discovery returned no candidates; inspect the provider response.");
  const researcher = await client.researcher(discovery.candidates[0]!.id, "spin liquid");
  const page = await readPage("https://help.openalex.org/data/authors/");
  if (!page.text.includes("Authors")) throw new Error("The live source reader did not return expected text.");
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("../dist/index.js", import.meta.url)), "--stdio"], stderr: "pipe" });
  const mcpClient = new Client({ name: "inreach-live-check", version: "0.1.0" });
  let toolNames: string[];
  try {
    await mcpClient.connect(transport);
    toolNames = (await mcpClient.listTools()).tools.map(t => t.name);
    const guide = await mcpClient.callTool({ name: "get_workflow_guide", arguments: {} });
    if (guide.isError) throw new Error("MCP workflow tool failed.");
  } finally { await mcpClient.close(); }
  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 10)}_${now.toISOString().slice(11, 19).replaceAll(":", "")}_live-smoke`;
  const directory = new URL(`../results/${stamp}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("research-results.json", directory), JSON.stringify({ checked_at: now.toISOString(), discovery, researcher, page_check: { url: page.source_url, title: page.title, characters: page.text.length }, mcp_tools: toolNames }, null, 2));
  console.log(JSON.stringify({ status: "passed", candidates: discovery.candidates.length, first_researcher: researcher.name, source_reader: "passed", stdio_mcp: "passed", tools: toolNames, results: fileURLToPath(directory) }, null, 2));
}

await smokeTest();
