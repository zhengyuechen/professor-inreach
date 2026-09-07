import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { createHttpApp } from "./http.js";

/** Start a local stdio plugin or an HTTP endpoint for ChatGPT development. */
async function main() {
  if (process.argv.includes("--stdio")) {
    await createServer().connect(new StdioServerTransport());
    return;
  }
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid port number.");
  const allowedHosts = (process.env.ALLOWED_HOSTS ?? `127.0.0.1:${port},localhost:${port}`).split(",").map(h => h.trim()).filter(Boolean);
  const listener = createHttpApp(allowedHosts).listen(port, host, () => {
    console.error(`Professor InReach ready at http://${host}:${port}/mcp`);
  });
  listener.on("error", () => { console.error("Server could not start. Check HOST and whether PORT is already in use."); process.exitCode = 1; });
  process.on("SIGTERM", () => listener.close());
  process.on("SIGINT", () => listener.close());
}

main().catch(() => { console.error("Professor InReach could not start; check the configuration."); process.exitCode = 1; });
