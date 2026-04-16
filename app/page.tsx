import Link from "next/link";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { getAllTeamReports } from "@/lib/teams";

export default function HomePage() {
  const teams = getAllTeamReports();

  return (
    <main className="container">
      <header className="header-row">
        <div>
          <h1 className="title">Team analysis dashboard</h1>
          <p className="subtitle">
            Click any team card to open its full evaluation report.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="grid">
        {teams.map((team) => (
          <Link key={team.teamName} href={`/team/${team.slug}`} className="card">
            <h2 className="team-name">{team.teamName}</h2>
            <p className="score">
              Score: {team.score ?? "N/A"} / 100
            </p>
            <p className="meta">Percentage: {team.percentage ?? "N/A"}%</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
