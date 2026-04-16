import { HomeRepoSyncButton } from "@/app/components/home-repo-sync";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { TeamSearchGrid } from "@/app/components/team-search-grid";
import { getGitLiteSummary } from "@/lib/git-stats";
import { getAllTeamReports } from "@/lib/teams";

export default function HomePage() {
  const teams = getAllTeamReports();
  const gitByTeam = Object.fromEntries(teams.map((t) => [t.teamName, getGitLiteSummary(t.teamName)]));

  return (
    <main className="container">
      <header className="header-row">
        <div>
          <h1 className="title">Team analysis dashboard</h1>
          <p className="subtitle">
            Click any team card to view the full evaluation report and repository commit activity.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <HomeRepoSyncButton />
      <TeamSearchGrid gitByTeam={gitByTeam} teams={teams} />
    </main>
  );
}
