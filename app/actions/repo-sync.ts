"use server";

import { revalidatePath } from "next/cache";
import { fetchRemote, pullRepo, resolveRepoDirForTeam } from "@/lib/git-stats";
import { getAllTeamReports } from "@/lib/teams";

export type RepoSyncResult = {
  team: string;
  ok: boolean;
  message: string;
};

export async function syncTeamRepository(teamName: string): Promise<{ ok: boolean; message: string }> {
  const repo = resolveRepoDirForTeam(teamName);
  if (!repo) {
    return { ok: false, message: "No local clone under repos/. Add or clone the repository first." };
  }
  const fetched = fetchRemote(repo);
  if (!fetched.ok) {
    return { ok: false, message: fetched.message };
  }
  const pulled = pullRepo(repo);
  revalidatePath("/");
  revalidatePath(`/team/${encodeURIComponent(teamName)}`);
  return pulled;
}

export async function syncAllTeamRepositories(): Promise<{
  ok: boolean;
  results: RepoSyncResult[];
}> {
  const teams = getAllTeamReports();
  const results: RepoSyncResult[] = [];

  for (const t of teams) {
    const repo = resolveRepoDirForTeam(t.teamName);
    if (!repo) {
      results.push({
        team: t.teamName,
        ok: false,
        message: "No local clone under repos/.",
      });
      continue;
    }
    const fetched = fetchRemote(repo);
    if (!fetched.ok) {
      results.push({ team: t.teamName, ok: false, message: fetched.message });
      continue;
    }
    const pulled = pullRepo(repo);
    results.push({
      team: t.teamName,
      ok: pulled.ok,
      message: pulled.message,
    });
  }

  revalidatePath("/");
  for (const t of teams) {
    revalidatePath(`/team/${encodeURIComponent(t.teamName)}`);
  }

  const allOk = results.length > 0 && results.every((r) => r.ok);
  return { ok: allOk, results };
}
