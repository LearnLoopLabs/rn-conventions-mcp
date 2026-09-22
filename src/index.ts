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

server.registerPrompt(
  "bootstrap-new-project",
  {
    title: "Bootstrap a new RN/Expo project",
    description:
      "Checklist for scaffolding conventions, tooling, and CI onto a brand-new React Native or Expo project.",
    argsSchema: {
      projectType: z
        .enum(["expo-router", "classic-expo", "bare-rn-cli"])
        .describe("Expo Router, classic Expo (no Router), or bare React Native CLI"),
    },
  },
  ({ projectType }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Set up this new ${projectType} project using the rn-conventions MCP server:

1. Read rn-conventions://docs/architecture-baseline.md first. New
   Architecture is assumed on; ask whether React Compiler will be used
   before writing any memoization-related tooling or docs.
2. Pull and adapt the matching tooling templates for "${projectType}":
   eslint config, oxlintrc.json, oxfmtrc.json, and the matching knip
   config (knip.expo-router.json / knip.expo.json / knip.rn-cli.json) —
   see rn-conventions://docs/tooling-stack.md for which knip variant
   fits which project type.
3. Wire up the pre-commit formatting hook from tooling-stack.md; do not
   add a format-check step to CI.
4. Add the matching CI workflow (ci.expo.yml or ci.rn-cli.yml) and, if
   this is a web-capable Expo project, deploy-web-gh-pages.yml.
5. Write CLAUDE.md following rn-conventions://docs/claude-md-style.md —
   every claim must come from this project's actual files, not assumed.
6. Apply rn-conventions://docs/commit-conventions.md and
   rn-conventions://docs/ai-attribution.md defaults unless this project
   states otherwise.
7. If react-native-web is a dependency, apply the .web.tsx split from
   rn-conventions://docs/react-native-web-platform-split.md.
8. Apply rn-conventions://docs/comment-style.md and
   rn-conventions://docs/ci-verification-policy.md as working
   conventions for this session going forward.

Call list_conventions first if you need the full current resource
list — new resources may have been added since this prompt was
written.`,
        },
      },
    ],
  }),
);

server.registerPrompt(
  "retrofit-existing-project",
  {
    title: "Retrofit conventions onto an existing project",
    description:
      "Audit an existing React Native/Expo project against these conventions and propose an additive plan, not a blind overwrite.",
    argsSchema: {},
  },
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Audit this existing project against the rn-conventions MCP server's
conventions, then propose changes — don't apply anything destructively
without confirming first.

1. Read the project's actual files first: package.json, existing lint/
   format/CI config, CLAUDE.md (or README/ARCHITECTURE.md), and any
   .cursor/rules or copilot-instructions. Don't assume anything from
   the templates that isn't grounded in what's actually here.
2. Read rn-conventions://docs/architecture-baseline.md and determine:
   is New Architecture actually on (gradle.properties/Podfile/app.json)?
   Is React Compiler present (babel.config.js, package.json)? State
   both explicitly before touching any memoization- or native-module-
   related convention.
3. Diff the project's current oxlint/eslint/oxfmt/knip/CI setup against
   this server's tooling templates (call list_conventions with category
   "tooling" and "ci"). Report gaps and divergences — don't overwrite
   an existing config that already does the same thing differently on
   purpose.
4. Check the knip entry-point config specifically against the project's
   actual navigation setup (Expo Router vs. classic vs. bare CLI) per
   rn-conventions://docs/tooling-stack.md — a mismatched entry point
   produces false dead-code reports, not a working scan.
5. Check whether CLAUDE.md exists and is current; if stale, update it
   in place per rn-conventions://docs/claude-md-style.md rather than
   replacing it wholesale.
6. Report the full list of proposed additions/changes before making
   any of them, grouped by risk (safe to add outright vs. needs a
   decision from the project owner, e.g. changing an existing CI
   check).`,
        },
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("rn-conventions MCP server failed to start:", error);
  process.exit(1);
});
