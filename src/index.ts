#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const resourcesRoot = join(__dirname, "..", "resources");

const MIME_BY_EXT: Record<string, string> = {
  ".md": "text/markdown",
  ".json": "application/json",
  ".yml": "text/yaml",
  ".yaml": "text/yaml",
  ".js": "text/javascript",
};

interface ConventionResource {
  id: string;
  category: string;
  title: string;
  filePath: string;
  mimeType: string;
}

function collectResources(dir: string, baseDir: string): ConventionResource[] {
  const entries = readdirSync(dir);
  const results: ConventionResource[] = [];

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;

    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectResources(fullPath, baseDir));
      continue;
    }

    const relPath = relative(baseDir, fullPath);
    const category = relPath.split("/")[0] ?? "misc";
    const ext = extname(entry);

    results.push({
      id: relPath.replace(/\\/g, "/"),
      category,
      title: entry,
      filePath: fullPath,
      mimeType: MIME_BY_EXT[ext] ?? "text/plain",
    });
  }

  return results;
}

const resources = collectResources(resourcesRoot, resourcesRoot);

const server = new McpServer({
  name: "rn-conventions",
  version: "1.0.0",
});

for (const resource of resources) {
  const uri = `rn-conventions://${resource.id}`;

  server.registerResource(
    resource.id,
    uri,
    {
      title: resource.title,
      description: `${resource.category}/${resource.title} — React Native/Expo project convention`,
      mimeType: resource.mimeType,
    },
    async () => ({
      contents: [
        {
          uri,
          mimeType: resource.mimeType,
          text: readFileSync(resource.filePath, "utf-8"),
        },
      ],
    }),
  );
}

server.registerTool(
  "list_conventions",
  {
    title: "List available conventions",
    description:
      "List all convention resources (docs, tooling configs, CI templates) this server exposes, optionally filtered by category.",
    inputSchema: {
      category: z
        .enum(["docs", "tooling", "ci"])
        .optional()
        .describe("Filter to one category: docs, tooling, or ci"),
    },
  },
  async ({ category }) => {
    const filtered = category ? resources.filter((r) => r.category === category) : resources;
    const listing = filtered
      .map((r) => `- ${r.id} (rn-conventions://${r.id})`)
      .sort()
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: listing || "No resources found for that category.",
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("rn-conventions MCP server failed to start:", error);
  process.exit(1);
});
