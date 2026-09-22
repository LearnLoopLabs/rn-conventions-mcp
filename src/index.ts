#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
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
  const entries = readdirSync(dir, { withFileTypes: true });
  const results: ConventionResource[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectResources(fullPath, baseDir));
      continue;
    }

    // Only expose recognized convention file types — anything else
    // dropped under resources/ (notes, scratch files, etc.) is skipped
    // rather than silently published as text/plain.
    const ext = extname(entry.name);
    if (!(ext in MIME_BY_EXT)) continue;

    // relative() uses the OS path separator, so this must be normalized
    // to "/" before splitting into a category — otherwise category
    // detection breaks entirely on Windows.
    const relPath = relative(baseDir, fullPath).split(sep).join("/");
    const category = relPath.split("/")[0] ?? "misc";

    results.push({
      id: relPath,
      category,
      title: entry.name,
      filePath: fullPath,
      mimeType: MIME_BY_EXT[ext],
    });
  }

  return results;
}

function readJsonSafe(path: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return undefined;
  }
}

function readTextSafe(path: string): string | undefined {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return undefined;
  }
}

function detectPackageManager(cwd: string): "npm" | "yarn" | "pnpm" | "bun" | "unknown" {
  if (existsSync(join(cwd, "bun.lockb"))) return "bun";
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(join(cwd, "package-lock.json"))) return "npm";
  return "unknown";
}

// Checked in order of how reliably each source reflects the actual
// build, not just intent: app.json/app.config are Expo's own source of
// truth; gradle.properties/Podfile are what bare RN CLI projects have
// instead.
function detectNewArchitecture(cwd: string): boolean | "unknown" {
  const appJson = readJsonSafe(join(cwd, "app.json"));
  const expoConfig = appJson?.expo as Record<string, unknown> | undefined;
  if (typeof expoConfig?.newArchEnabled === "boolean") {
    return expoConfig.newArchEnabled;
  }

  const appConfig = readTextSafe(join(cwd, "app.config.js")) ?? readTextSafe(join(cwd, "app.config.ts"));
  if (appConfig) {
    if (/newArchEnabled\s*:\s*true/.test(appConfig)) return true;
    if (/newArchEnabled\s*:\s*false/.test(appConfig)) return false;
  }

  const gradleProperties = readTextSafe(join(cwd, "android", "gradle.properties"));
  if (gradleProperties) {
    if (/newArchEnabled\s*=\s*true/.test(gradleProperties)) return true;
    if (/newArchEnabled\s*=\s*false/.test(gradleProperties)) return false;
  }

  const podfile = readTextSafe(join(cwd, "ios", "Podfile"));
  if (podfile && /RCT_NEW_ARCH_ENABLED['"]?\]?\s*\|?\|?=\s*['"]?1['"]?/.test(podfile)) {
    return true;
  }

  return "unknown";
}

function detectReactCompiler(cwd: string): boolean {
  const babelConfig =
    readTextSafe(join(cwd, "babel.config.js")) ?? readTextSafe(join(cwd, "babel.config.ts")) ?? "";
  return /react-compiler/i.test(babelConfig);
}

interface ProjectInspection {
  framework: "expo" | "bare-rn-cli" | "unknown";
  expoRouter: boolean;
  reactNativeVersion: string;
  expoVersion: string;
  newArchitecture: boolean | "unknown";
  reactCompiler: boolean;
  reactNativeWeb: boolean;
  packageManager: "npm" | "yarn" | "pnpm" | "bun" | "unknown";
  typescript: boolean;
  jest: boolean;
}

function inspectProject(cwd: string): ProjectInspection {
  const pkg = readJsonSafe(join(cwd, "package.json")) ?? {};
  const deps: Record<string, string> = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };

  const hasExpo = "expo" in deps;
  const hasReactNative = "react-native" in deps;

  return {
    framework: hasExpo ? "expo" : hasReactNative ? "bare-rn-cli" : "unknown",
    expoRouter: "expo-router" in deps,
    reactNativeVersion: deps["react-native"] ?? "unknown",
    expoVersion: deps["expo"] ?? "unknown",
    newArchitecture: detectNewArchitecture(cwd),
    reactCompiler: detectReactCompiler(cwd),
    reactNativeWeb: "react-native-web" in deps,
    packageManager: detectPackageManager(cwd),
    typescript: "typescript" in deps || existsSync(join(cwd, "tsconfig.json")),
    jest: "jest" in deps || "jest" in pkg,
  };
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

server.registerTool(
  "get_convention",
  {
    title: "Get a convention's content",
    description:
      "Return the full text of one convention resource by id, as printed by list_conventions (e.g. \"docs/architecture-baseline.md\").",
    inputSchema: {
      id: z.string().describe("Resource id, e.g. docs/architecture-baseline.md"),
    },
  },
  async ({ id }) => {
    const resource = resources.find((r) => r.id === id);

    if (!resource) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `No convention found for id "${id}". Call list_conventions to see valid ids.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: readFileSync(resource.filePath, "utf-8"),
        },
      ],
    };
  },
);

server.registerTool(
  "inspect_project",
  {
    title: "Inspect the current project",
    description:
      "Best-effort detection of the calling project's RN/Expo setup (framework, Expo Router, RN/Expo versions, New Architecture, React Compiler, package manager, TypeScript, Jest) from files in the current working directory — so conventions apply based on what's actually there instead of assumed.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(inspectProject(process.cwd()), null, 2),
      },
    ],
  }),
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

1. Call inspect_project first to establish facts about this repo
   (framework, Expo Router, RN/Expo versions, New Architecture, React
   Compiler, package manager, TypeScript, Jest). Then read
   rn-conventions://docs/architecture-baseline.md for the reasoning
   behind these; if React Compiler's presence came back unclear, ask
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

1. Call inspect_project for a quick baseline (framework, RN/Expo
   versions, New Architecture, React Compiler, TypeScript/Jest presence,
   package manager), then still read the project's actual files for
   anything it doesn't cover: existing lint/format/CI config, CLAUDE.md
   (or README/ARCHITECTURE.md), and any .cursor/rules or
   copilot-instructions. Don't assume anything from the templates that
   isn't grounded in what's actually here.
2. Read rn-conventions://docs/architecture-baseline.md for the reasoning
   behind the New Architecture / React Compiler facts inspect_project
   returned. State both explicitly before touching any memoization- or
   native-module-related convention.
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
