"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TeamReport } from "@/lib/teams";

type Props = {
  teams: TeamReport[];
};

function scoreColor(pct: number | null): "high" | "mid" | "low" {
  if (pct === null) return "low";
  if (pct >= 70) return "high";
  if (pct >= 45) return "mid";
  return "low";
}

export function TeamSearchGrid({ teams }: Props) {
  const [query, setQuery] = useState("");

  const filteredTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return teams;
    return teams.filter((team) => team.teamName.toLowerCase().includes(normalized));
  }, [teams, query]);

  return (
    <>
      <div className="search-wrap">
        <input
          type="text"
          className="search-input"
          placeholder="Search team name..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="search-count">{filteredTeams.length} result(s)</span>
      </div>

      <section className="grid">
        {filteredTeams.map((team) => {
          const color = scoreColor(team.percentage);
          return (
            <Link key={team.teamName} href={`/team/${team.slug}`} className="card">
              <div className="card-header">
                <h2 className="team-name">{team.teamName}</h2>
                <span className={`pct-badge ${color}`}>{team.percentage ?? 0}%</span>
              </div>

              <div className="score-track">
                <div
                  className={`score-fill ${color}`}
                  style={{ width: `${team.percentage ?? 0}%` }}
                />
              </div>

              <div className="card-footer">
                <span>{team.score ?? 0}/100</span>
                <span className="view-label">View report</span>
              </div>
            </Link>
          );
        })}
      </section>
    </>
  );
}
