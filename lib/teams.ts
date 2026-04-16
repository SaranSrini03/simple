import fs from "node:fs";
import path from "node:path";

export type FeatureItem = {
  name: string;
  status: "pass" | "partial" | "fail";
  evidence: string;
};

export type ScoreBreakdown = {
  featureCompletion: number;
  codeQuality: number;
  innovation: number;
  completeness: number;
  documentation: number;
  bonus: number;
};

export type TeamReport = {
  teamName: string;
  slug: string;
  rank: number;
  score: number | null;
  percentage: number | null;
  features: FeatureItem[];
  missingFeatures: string[];
  scores: ScoreBreakdown;
  comments: string[];
  raw: string;
};

const ROOT_DIR = process.cwd();

const SCORE_DEFAULTS: ScoreBreakdown = {
  featureCompletion: 0,
  codeQuality: 0,
  innovation: 0,
  completeness: 0,
  documentation: 0,
  bonus: 0,
};

function parseFinalScore(content: string): { score: number | null; percentage: number | null } {
  const m = content.match(/Final Score:\s*(\d+)\/100\s*\((\d+)%\)/i);
  return m ? { score: Number(m[1]), percentage: Number(m[2]) } : { score: null, percentage: null };
}

function parseFeatures(content: string): FeatureItem[] {
  const section = content.match(/Feature Breakdown:\s*\n([\s\S]*?)(?=\nMissing Features:)/i);
  if (!section) return [];

  const lines = section[1].split("\n").filter((l) => l.trim().startsWith("*"));
  return lines.map((line) => {
    const raw = line.replace(/^\*\s*/, "").trim();
    let status: FeatureItem["status"] = "fail";
    if (raw.includes("\u2705") || raw.includes("✅")) status = "pass";
    else if (raw.includes("\u26A0") || raw.includes("⚠")) status = "partial";

    const nameMatch = raw.match(/^(.+?):\s*(?:✅|⚠️|❌|[\u2705\u26A0\u274C])/);
    const evidenceMatch = raw.match(/\(([^)]+)\)\s*$/);

    return {
      name: nameMatch ? nameMatch[1].trim() : raw.split(":")[0].trim(),
      status,
      evidence: evidenceMatch ? evidenceMatch[1].trim() : "",
    };
  });
}

function parseMissing(content: string): string[] {
  const section = content.match(/Missing Features:\s*\n([\s\S]*?)(?=\nScores:)/i);
  if (!section) return [];

  return section[1]
    .split("\n")
    .filter((l) => l.trim().startsWith("*"))
    .map((l) => l.replace(/^\*\s*/, "").trim())
    .filter((l) => l.toLowerCase() !== "none");
}

function parseScores(content: string): ScoreBreakdown {
  const s = { ...SCORE_DEFAULTS };
  const m = (label: string) => {
    const rx = new RegExp(`${label}:\\s*(\\d+)`, "i");
    const hit = content.match(rx);
    return hit ? Number(hit[1]) : 0;
  };
  s.featureCompletion = m("Feature Completion");
  s.codeQuality = m("Code Quality");
  s.innovation = m("Innovation");
  s.completeness = m("Completeness");
  s.documentation = m("Documentation");
  s.bonus = m("Bonus");
  return s;
}

function parseComments(content: string): string[] {
  const section = content.match(/Comments:\s*\n([\s\S]*?)$/i);
  if (!section) return [];

  return section[1]
    .split("\n")
    .filter((l) => l.trim().startsWith("*"))
    .map((l) => l.replace(/^\*\s*/, "").trim())
    .filter(Boolean);
}

function isTeamFolder(dirName: string): boolean {
  const excluded = new Set(["app", "lib", "node_modules", ".next", ".git", "repos", "public"]);
  return !excluded.has(dirName);
}

function buildReport(teamName: string, content: string): Omit<TeamReport, "rank"> {
  const { score, percentage } = parseFinalScore(content);
  return {
    teamName,
    slug: encodeURIComponent(teamName),
    score,
    percentage,
    features: parseFeatures(content),
    missingFeatures: parseMissing(content),
    scores: parseScores(content),
    comments: parseComments(content),
    raw: content,
  };
}

export function getAllTeamReports(): TeamReport[] {
  const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });

  const reports = entries
    .filter((entry) => entry.isDirectory() && isTeamFolder(entry.name))
    .map((entry) => {
      const resultPath = path.join(ROOT_DIR, entry.name, "result.md");
      if (!fs.existsSync(resultPath)) return null;
      const content = fs.readFileSync(resultPath, "utf-8");
      return buildReport(entry.name, content);
    })
    .filter((r): r is Omit<TeamReport, "rank"> => r !== null)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return reports.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function getTeamReportBySlug(slug: string): TeamReport | null {
  const all = getAllTeamReports();
  const teamName = decodeURIComponent(slug);
  return all.find((r) => r.teamName === teamName) ?? null;
}
