"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncTeamRepository } from "@/app/actions/repo-sync";

type Props = {
  teamName: string;
};

export function TeamRepoSyncButton({ teamName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="repo-sync-inline">
      <button
        type="button"
        className="theme-toggle"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const res = await syncTeamRepository(teamName);
            setMessage(res.message);
            router.refresh();
          });
        }}
      >
        {pending ? "Pulling" : "Pull latest from remote"}
      </button>
      {message && <span className="repo-sync-msg">{message}</span>}
    </div>
  );
}
