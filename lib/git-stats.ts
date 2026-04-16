import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPOS_ROOT = path.join(ROOT, "repos");

/** Mirrors evaluate.py sanitize() for repo folder names under repos/. */
export function sanitizeTeamRepoFolder(team: string): string {
  const cleaned = team.replace(/[^a-zA-Z0-9\-_ ]/g, "").trim();
  return cleaned.replace(/\s+/g, "_");
}

function isInsideRepos(resolvedPath: string): boolean {
  const reposResolved = path.resolve(REPOS_ROOT);
  const p = path.resolve(resolvedPath);
  return p === reposResolved || p.startsWith(reposResolved + path.sep);
}

export function resolveRepoDirForTeam(teamName: string): string | null {
  if (!fs.existsSync(REPOS_ROOT)) return null;
  const target = sanitizeTeamRepoFolder(teamName);
  const exact = path.join(REPOS_ROOT, target);
  if (fs.existsSync(exact) && fs.existsSync(path.join(exact, ".git"))) {
    return path.resolve(exact);
  }
  const entries = fs.readdirSync(REPOS_ROOT, { withFileTypes: true });
  const lower = target.toLowerCase();
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.toLowerCase() !== lower) continue;
    const candidate = path.join(REPOS_ROOT, e.name);
    if (fs.existsSync(path.join(candidate, ".git"))) return path.resolve(candidate);
  }
  return null;
}

function runGit(repoPath: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  if (!isInsideRepos(repoPath)) {
    return { ok: false, stdout: "", stderr: "Invalid repository path" };
  }
  try {
    const stdout = execFileSync("git", ["-C", repoPath, ...args], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return { ok: true, stdout: stdout.trimEnd(), stderr: "" };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      stdout: typeof e.stdout === "string" ? e.stdout : "",
      stderr: typeof e.stderr === "string" ? e.stderr : e.message ?? "git failed",
    };
  }
}

export type GitCommitRow = {
  hash: string;
  author: string;
  email: string;
  dateIso: string;
  subject: string;
};

export type AuthorCommitCount = {
  author: string;
  email: string;
  commits: number;
};

export type GitRemoteDelta = {
  behind: number;
  ahead: number;
};

export type TeamGitStats = {
  teamName: string;
  repoPath: string | null;
  repoMissing: boolean;
  error?: string;
  defaultBranch?: string;
  remoteDelta?: GitRemoteDelta;
  authors: AuthorCommitCount[];
  recentCommits: GitCommitRow[];
  totalCommitsCounted: number;
};

function parseShortlogLine(line: string): AuthorCommitCount | null {
  const m = line.match(/^\s*(\d+)\s+(.+?)\s+<([^>]+)>\s*$/);
  if (!m) return null;
  return { commits: Number(m[1]), author: m[2].trim(), email: m[3].trim() };
}

function parseLogLine(line: string): GitCommitRow | null {
  const parts = line.split("\t");
  if (parts.length < 5) return null;
  const [hash, author, email, dateIso, ...rest] = parts;
  return {
    hash,
    author,
    email,
    dateIso,
    subject: rest.join("\t"),
  };
}

function detectDefaultBranch(repoPath: string): string | null {
  const sym = runGit(repoPath, ["symbolic-ref", "refs/remotes/origin/HEAD"]);
  if (sym.ok && sym.stdout) {
    const m = sym.stdout.match(/refs\/remotes\/origin\/(.+)$/);
    if (m) return m[1];
  }
  for (const b of ["main", "master"]) {
    const chk = runGit(repoPath, ["rev-parse", "--verify", `origin/${b}`]);
    if (chk.ok) return b;
  }
  return null;
}

function getRemoteDelta(repoPath: string, branch: string | null): GitRemoteDelta | undefined {
  if (!branch) return undefined;
  const upstream = `origin/${branch}`;
  const haveUp = runGit(repoPath, ["rev-parse", "--verify", upstream]);
  if (!haveUp.ok) return undefined;
  const lr = runGit(repoPath, ["rev-list", "--left-right", "--count", `HEAD...${upstream}`]);
  if (!lr.ok) return undefined;
  const nums = lr.stdout.trim().split(/\s+/);
  if (nums.length !== 2) return undefined;
  const ahead = Number(nums[0]);
  const behind = Number(nums[1]);
  if (Number.isNaN(ahead) || Number.isNaN(behind)) return undefined;
  return { ahead, behind };
}

export function fetchRemote(repoPath: string): { ok: boolean; message: string } {
  if (!isInsideRepos(repoPath)) return { ok: false, message: "Invalid path" };
  const r = runGit(repoPath, ["fetch", "origin"]);
  if (!r.ok) return { ok: false, message: r.stderr || "git fetch failed" };
  return { ok: true, message: r.stdout || "Fetched" };
}

export function pullRepo(repoPath: string): { ok: boolean; message: string } {
  if (!isInsideRepos(repoPath)) return { ok: false, message: "Invalid path" };
  const r = runGit(repoPath, ["pull", "--ff-only"]);
  if (!r.ok) return { ok: false, message: r.stderr || r.stdout || "git pull failed" };
  return { ok: true, message: r.stdout || "Already up to date." };
}

export function getTeamGitStats(teamName: string, options?: { fetchRemote?: boolean }): TeamGitStats {
  const repoPath = resolveRepoDirForTeam(teamName);
  if (!repoPath) {
    return {
      teamName,
      repoPath: null,
      repoMissing: true,
      authors: [],
      recentCommits: [],
      totalCommitsCounted: 0,
      error: "No cloned repository under repos/ for this team (run sync or clone).",
    };
  }

  if (options?.fetchRemote) {
    fetchRemote(repoPath);
  }

  const branch = detectDefaultBranch(repoPath);
  const remoteDelta = getRemoteDelta(repoPath, branch);

  const short = runGit(repoPath, ["shortlog", "-sne", "--all", "--no-merges"]);
  const authors: AuthorCommitCount[] = [];
  if (short.ok && short.stdout) {
    for (const line of short.stdout.split("\n")) {
      const row = parseShortlogLine(line);
      if (row) authors.push(row);
    }
  }

  const log = runGit(repoPath, [
    "log",
    "-n",
    "50",
    "--no-merges",
    "--pretty=format:%H\t%an\t%ae\t%ci\t%s",
  ]);
  const recentCommits: GitCommitRow[] = [];
  if (log.ok && log.stdout) {
    for (const line of log.stdout.split("\n")) {
      const row = parseLogLine(line);
      if (row) recentCommits.push(row);
    }
  }

  const totalCommitsCounted = authors.reduce((a, b) => a + b.commits, 0);

  let error: string | undefined;
  if (!short.ok && short.stderr) error = short.stderr;

  return {
    teamName,
    repoPath,
    repoMissing: false,
    error,
    defaultBranch: branch ?? undefined,
    remoteDelta,
    authors,
    recentCommits,
    totalCommitsCounted,
  };
}

export type GitLiteSummary = {
  lastCommitIso: string | null;
  authorCount: number;
  behindRemote: number | null;
};

/** Lightweight stats for the home grid (avoids full log/shortlog parse). */
export function getGitLiteSummary(teamName: string): GitLiteSummary {
  const repoPath = resolveRepoDirForTeam(teamName);
  if (!repoPath) {
    return { lastCommitIso: null, authorCount: 0, behindRemote: null };
  }
  const last = runGit(repoPath, ["log", "-1", "--format=%ci"]);
  const short = runGit(repoPath, ["shortlog", "-sn", "--all", "--no-merges"]);
  const authorCount =
    short.ok && short.stdout
      ? short.stdout.split("\n").filter((l) => l.trim().length > 0).length
      : 0;
  const branch = detectDefaultBranch(repoPath);
  const remoteDelta = getRemoteDelta(repoPath, branch);
  return {
    lastCommitIso: last.ok ? last.stdout.trim() : null,
    authorCount,
    behindRemote: remoteDelta?.behind ?? null,
  };
}
