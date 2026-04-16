import { ThemeToggle } from "@/app/components/theme-toggle";
import { TeamSearchGrid } from "@/app/components/team-search-grid";
import { getAllTeamReports } from "@/lib/teams";

export default function HomePage() {
  const teams = getAllTeamReports();

  return (
    <main className="container">
      <header className="header-row">
        <div>
          <h1 className="title">Team analysis dashboard</h1>
          <p className="subtitle">
            Click any team card to view the full evaluation report.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <TeamSearchGrid teams={teams} />
    </main>
  );
}
