import fs from "node:fs";
import path from "node:path";

export type TeamReport = {
  teamName: string;
  slug: string;
  score: number | null;
  percentage: number | null;
  content: string;
};

const ROOT_DIR = process.cwd();

function parseScore(content: string): { score: number | null; percentage: number | null } {
  const scoreMatch = content.match(/Final Score:\s*(\d+)\/100/i);
  const pctMatch = content.match(/Final Score:\s*\d+\/100\s*\((\d+)%\)/i);

  return {
    score: scoreMatch ? Number(scoreMatch[1]) : null,
    percentage: pctMatch ? Number(pctMatch[1]) : null,
  };
}

function isTeamFolder(dirName: string): boolean {
  const excluded = new Set([
    "app",
    "lib",
    "node_modules",
    ".next",
    ".git",
    "repos",
  ]);
  return !excluded.has(dirName);
}

export function getAllTeamReports(): TeamReport[] {
  const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });

  const reports: TeamReport[] = entries
    .filter((entry) => entry.isDirectory() && isTeamFolder(entry.name))
    .map((entry) => {
      const teamName = entry.name;
      const resultPath = path.join(ROOT_DIR, teamName, "result.md");

      if (!fs.existsSync(resultPath)) {
        return null;
      }

      const content = fs.readFileSync(resultPath, "utf-8");
      const { score, percentage } = parseScore(content);

      return {
        teamName,
        slug: encodeURIComponent(teamName),
        score,
        percentage,
        content,
      } satisfies TeamReport;
    })
    .filter((item): item is TeamReport => item !== null)
    .sort((a, b) => {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      return sb - sa;
    });

  return reports;
}

export function getTeamReportBySlug(slug: string): TeamReport | null {
  const teamName = decodeURIComponent(slug);
  const resultPath = path.join(ROOT_DIR, teamName, "result.md");

  if (!fs.existsSync(resultPath)) {
    return null;
  }

  const content = fs.readFileSync(resultPath, "utf-8");
  const { score, percentage } = parseScore(content);

  return {
    teamName,
    slug: encodeURIComponent(teamName),
    score,
    percentage,
    content,
  };
}
