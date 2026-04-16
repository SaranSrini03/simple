import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { getTeamReportBySlug } from "@/lib/teams";

type TeamPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TeamDetailsPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const report = getTeamReportBySlug(slug);

  if (!report) {
    notFound();
  }

  return (
    <main className="container">
      <header className="header-row">
        <div>
          <Link href="/" className="back-link">
            Back to all teams
          </Link>
          <h1 className="title">{report.teamName}</h1>
          <p className="subtitle">
            Score: {report.score ?? "N/A"} / 100 ({report.percentage ?? "N/A"}%)
          </p>
        </div>
        <ThemeToggle />
      </header>

      <article className="analysis">{report.content}</article>
    </main>
  );
}
