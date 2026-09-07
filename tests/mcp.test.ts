import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createServer } from "../src/server.js";
import { createHttpApp } from "../src/http.js";
import { extractPage } from "../src/pages.js";
import type { AddressInfo } from "node:net";
import { request } from "node:http";

test("MCP initialization exposes workflow and evidence tools; invalid intake evidence is rejected", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer({ page: async () => extractPage("<p>We are recruiting PhD students for Fall 2027.</p>", "https://example.edu") });
  const client = new Client({ name: "inreach-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 6);
    assert.ok(tools.tools.every(tool => tool.annotations?.readOnlyHint === true));
    const guide = await client.callTool({ name: "get_workflow_guide", arguments: {} });
    assert.match(JSON.stringify(guide), /individual contribution/i);
    const recruitment = await client.callTool({ name: "check_recruiting_statement", arguments: { url: "https://example.edu", quote: "We are recruiting PhD students for Fall 2027.", target_intake: "Fall 2028", stated_intake: "Fall 2028", scope: "specific_intake", interpreted_status: "recruiting" } });
    assert.equal((recruitment.structuredContent as { assessment: { status: string } }).assessment.status, "unknown");
    const badInput = await client.callTool({ name: "search_researchers", arguments: { topic: "spin liquid", limit: 999 } });
    assert.equal(badInput.isError, true);
  } finally { await client.close(); await server.close(); }
});

test("HTTP transport supports real client initialization and tool calls, rejecting wrong hosts and browser origins", async () => {
  const hosts: string[] = [];
  const actual = createHttpApp(hosts).listen(0, "127.0.0.1");
  await new Promise<void>(resolve => actual.once("listening", resolve));
  const port = (actual.address() as AddressInfo).port;
  hosts.push(`127.0.0.1:${port}`);
  const url = `http://127.0.0.1:${port}`;
  const client = new Client({ name: "inreach-http-test", version: "1.0.0" });
  try {
    assert.equal((await fetch(`${url}/health`)).status, 200);
    const wrongHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`${url}/health`, { headers: { Host: "attacker.example" } }, res => { res.resume(); resolve(res.statusCode); });
      req.on("error", reject);
      req.end();
    });
    assert.equal(wrongHostStatus, 403);
    assert.equal((await fetch(`${url}/mcp`, { method: "POST", headers: { Origin: "https://attacker.example" } })).status, 403);
    await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
    const result = await client.callTool({ name: "get_workflow_guide", arguments: {} });
    assert.equal(result.isError, undefined);
    assert.match(JSON.stringify(result), /Professor InReach/);
  } finally {
    await client.close();
    await new Promise<void>(resolve => actual.close(() => resolve()));
  }
});
