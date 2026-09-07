import express from "express";
import { rateLimit } from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

/** Serve stateless MCP requests with host checks and bounded request size and rate. */
export function createHttpApp(allowedHosts = ["127.0.0.1:8787", "localhost:8787"]) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    if (!allowedHosts.includes(req.headers.host ?? "")) { res.status(403).json({ error: "Host not allowed" }); return; }
    if (req.headers.origin) { res.status(403).json({ error: "Browser-origin requests are not supported by this MCP endpoint" }); return; }
    next();
  });
  app.get("/health", (_req, res) => { res.json({ status: "ok", name: "Professor InReach", version: "0.1.0" }); });
  app.use("/mcp", rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false }));
  app.use(express.json({ limit: "64kb" }));
  app.post("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Request failed" }, id: null });
    }
  });
  app.all("/mcp", (_req, res) => { res.status(405).set("Allow", "POST").json({ error: "Use POST for stateless MCP" }); });
  return app;
}
