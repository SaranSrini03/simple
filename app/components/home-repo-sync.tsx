"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncAllTeamRepositories } from "@/app/actions/repo-sync";

export function HomeRepoSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <div className="home-sync-panel">
      <button
        type="button"
        className="theme-toggle"
        disabled={pending}
        onClick={() => {
          setSummary(null);
          startTransition(async () => {
            const res = await syncAllTeamRepositories();
            const failed = res.results.filter((r) => !r.ok);
            const okCount = res.results.filter((r) => r.ok).length;
            setSummary(
              failed.length === 0
                ? `Updated ${okCount} repo(s).`
                : `${okCount} ok, ${failed.length} failed. First error: ${failed[0]?.message ?? ""}`,
            );
            router.refresh();
          });
        }}
      >
        {pending ? "Pulling all repos" : "Pull all repositories"}
      </button>
      {summary && <p className="home-sync-summary">{summary}</p>}
    </div>
  );
}
