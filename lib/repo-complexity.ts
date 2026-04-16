import fs from "node:fs";
import path from "node:path";
import { resolveRepoDirForTeam } from "@/lib/git-stats";

export type ComplexityLevel = "fullstack" | "frontend_only" | "backend_only" | "unknown";

export type RepoComplexity = {
  level: ComplexityLevel;
  label: string;
  hasFrontend: boolean;
  hasBackend: boolean;
  frontendSignals: number;
  backendSignals: number;
  normalizedWeight: number;
  reason: string;
};

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  "target",
  "out",
]);

const FRONTEND_FILE_HINTS = [
  "app/page.tsx",
  "src/main.tsx",
  "src/main.jsx",
  "src/app.tsx",
  "index.html",
  "vite.config.ts",
  "next.config.ts",
];

const BACKEND_PATH_HINTS = [
  "/api/",
  "/server/",
  "/backend/",
  "/controllers/",
  "/routes/",
  "/services/",
  "/middleware/",
  "/functions/",
];

const BACKEND_FILE_HINTS = ["server.ts", "server.js", "app.py", "main.py", "manage.py"];

const FRONTEND_EXTS = new Set([".tsx", ".jsx", ".vue", ".svelte", ".css", ".scss", ".html"]);
const BACKEND_EXTS = new Set([".py", ".go", ".rs", ".java", ".php", ".cs", ".sql"]);

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function getNormalizedRel(repoDir: string, filePath: string): string {
  return path.relative(repoDir, filePath).replaceAll("\\", "/").toLowerCase();
}

function walkRepoFiles(repoDir: string, limit = 3000): string[] {
  const files: string[] = [];
  const stack = [repoDir];
  while (stack.length > 0 && files.length < limit) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(path.join(current, entry.name));
        }
        continue;
      }
      if (entry.isFile()) {
        files.push(path.join(current, entry.name));
      }
      if (files.length >= limit) break;
    }
  }
  return files;
}

function hasAnyDependency(
  deps: Record<string, string> | undefined,
  names: readonly string[],
): boolean {
  if (!deps) return false;
  return names.some((name) => Object.hasOwn(deps, name));
}

function classify(frontendSignals: number, backendSignals: number): ComplexityLevel {
  if (frontendSignals > 0 && backendSignals > 0) return "fullstack";
  if (frontendSignals > 0) return "frontend_only";
  if (backendSignals > 0) return "backend_only";
  return "unknown";
}

function labelFor(level: ComplexityLevel): string {
  if (level === "fullstack") return "Full stack";
  if (level === "frontend_only") return "Frontend only (no backend found)";
  if (level === "backend_only") return "Backend only";
  return "Unknown architecture";
}

function weightFor(level: ComplexityLevel): number {
  if (level === "fullstack") return 1;
  if (level === "backend_only") return 0.78;
  if (level === "frontend_only") return 0.58;
  return 0.45;
}

const complexityCache = new Map<string, RepoComplexity>();

export function detectRepoComplexity(teamName: string): RepoComplexity {
  const cached = complexityCache.get(teamName);
  if (cached) return cached;

  const repoDir = resolveRepoDirForTeam(teamName);
  if (!repoDir) {
    const missing: RepoComplexity = {
      level: "unknown",
      label: "No local repo clone",
      hasFrontend: false,
      hasBackend: false,
      frontendSignals: 0,
      backendSignals: 0,
      normalizedWeight: weightFor("unknown"),
      reason: "Repository folder not found under repos/",
    };
    complexityCache.set(teamName, missing);
    return missing;
  }

  const files = walkRepoFiles(repoDir);
  let frontendSignals = 0;
  let backendSignals = 0;

  for (const fullPath of files) {
    const rel = getNormalizedRel(repoDir, fullPath);
    const ext = path.extname(rel);

    if (FRONTEND_EXTS.has(ext)) frontendSignals += 1;
    if (BACKEND_EXTS.has(ext)) backendSignals += 1;

    if (FRONTEND_FILE_HINTS.some((hint) => rel.endsWith(hint))) frontendSignals += 4;
    if (BACKEND_FILE_HINTS.some((hint) => rel.endsWith(hint))) backendSignals += 4;
    if (BACKEND_PATH_HINTS.some((hint) => rel.includes(hint))) backendSignals += 2;

    if (rel.endsWith("/api.ts") || rel.endsWith("/api.js")) backendSignals += 1;
  }

  type PackageJson = {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const pkg = readJsonFile<PackageJson>(path.join(repoDir, "package.json"));
  if (pkg) {
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (hasAnyDependency(deps, ["next", "react", "vue", "svelte", "angular"])) {
      frontendSignals += 6;
    }
    if (
      hasAnyDependency(deps, [
        "express",
        "fastify",
        "koa",
        "hono",
        "@nestjs/core",
        "socket.io",
        "prisma",
        "mongoose",
      ])
    ) {
      backendSignals += 8;
    }
  }

  const requirementsTxt = path.join(repoDir, "requirements.txt");
  if (fs.existsSync(requirementsTxt)) {
    const req = fs.readFileSync(requirementsTxt, "utf-8").toLowerCase();
    if (/(flask|fastapi|django|sqlalchemy|pydantic)/.test(req)) backendSignals += 8;
  }

  const level = classify(frontendSignals, backendSignals);
  const result: RepoComplexity = {
    level,
    label: labelFor(level),
    hasFrontend: frontendSignals > 0,
    hasBackend: backendSignals > 0,
    frontendSignals,
    backendSignals,
    normalizedWeight: weightFor(level),
    reason:
      level === "fullstack"
        ? "Detected frontend and backend signals in repository structure."
        : level === "frontend_only"
          ? "Detected UI/frontend stack only, backend signals missing."
          : level === "backend_only"
            ? "Detected backend stack without clear frontend app."
            : "Not enough evidence to classify repository architecture.",
  };

  complexityCache.set(teamName, result);
  return result;
}
