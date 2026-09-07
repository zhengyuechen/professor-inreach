import { mkdir, copyFile, cp, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";

/** Package only shareable instructions and metadata, excluding secrets and local-machine MCP wiring. */
async function packagePlugin() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const stamp = new Date().toISOString().replace(/[:.-]/g, "");
  const out = path.join(root, "results", `${stamp.slice(0, 8).replace(/(....)(..)(..)/, "$1-$2-$3")}_${stamp.slice(9, 15)}_plugin-bundle`);
  const staging = path.join(out, "professor-inreach");
  await mkdir(path.join(staging, ".codex-plugin"), { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(root, ".codex-plugin/plugin.json"), "utf8"));
  delete manifest.mcpServers;
  await writeFile(path.join(staging, ".codex-plugin/plugin.json"), JSON.stringify(manifest, null, 2) + "\n");
  await cp(path.join(root, "skills"), path.join(staging, "skills"), { recursive: true });
  await copyFile(path.join(root, "summary/CONNECT-TO-CHATGPT.md"), path.join(staging, "CONNECT-TO-CHATGPT.md"));
  execFileSync("zip", ["-qr", path.join(out, "professor-inreach-skills.zip"), "professor-inreach"], { cwd: out });
  console.log(JSON.stringify({ archive: path.join(out, "professor-inreach-skills.zip"), note: "Workflow bundle only. Submit With MCP and provide the hosted server URL for the research tools." }, null, 2));
}

await packagePlugin();
