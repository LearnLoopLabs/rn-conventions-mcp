import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", "dist", "index.js");

async function connect(cwd) {
  const transport = new StdioClientTransport({ command: "node", args: [serverPath], cwd });
  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

test("server starts and responds to tools/list and resources/list", async () => {
  const client = await connect();
  try {
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((t) => t.name).sort(),
      ["get_convention", "inspect_project", "list_conventions"],
    );

    const resources = await client.listResources();
    assert.ok(resources.resources.length > 0, "expected at least one resource");
  } finally {
    await client.close();
  }
});

test("get_convention returns content for a valid id and an error for an unknown one", async () => {
  const client = await connect();
  try {
    const ok = await client.callTool({
      name: "get_convention",
      arguments: { id: "docs/architecture-baseline.md" },
    });
    assert.ok(!ok.isError);
    assert.match(ok.content[0].text, /New Architecture/);

    const bad = await client.callTool({ name: "get_convention", arguments: { id: "docs/does-not-exist.md" } });
    assert.equal(bad.isError, true);
  } finally {
    await client.close();
  }
});

test("list_conventions filters by category", async () => {
  const client = await connect();
  try {
    const result = await client.callTool({ name: "list_conventions", arguments: { category: "ci" } });
    const lines = result.content[0].text.split("\n").filter(Boolean);
    assert.ok(lines.length > 0);
    assert.ok(lines.every((line) => line.startsWith("- ci/")));
  } finally {
    await client.close();
  }
});

test("inspect_project responds without throwing", async () => {
  const client = await connect();
  try {
    const result = await client.callTool({ name: "inspect_project", arguments: {} });
    const parsed = JSON.parse(result.content[0].text);
    assert.ok("framework" in parsed);
    assert.ok("packageManager" in parsed);
  } finally {
    await client.close();
  }
});

test("inspect_project degrades to unknown/false on a project dir with no recognizable files, instead of crashing the server", async () => {
  // inspect_project reads files it's never seen before (arbitrary
  // target-project configs) — an empty/malformed project shouldn't take
  // the whole server connection down with it.
  const emptyDir = mkdtempSync(join(tmpdir(), "rn-conventions-smoke-"));
  const client = await connect(emptyDir);
  try {
    const result = await client.callTool({ name: "inspect_project", arguments: {} });
    const parsed = JSON.parse(result.content[0].text);
    assert.equal(parsed.framework, "unknown");
    assert.equal(parsed.newArchitecture, "unknown");
    assert.equal(parsed.packageManager, "unknown");
  } finally {
    await client.close();
    rmSync(emptyDir, { recursive: true, force: true });
  }
});
