import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { getTeamReportBySlug } from "@/lib/teams";
import type { ScoreBreakdown, FeatureItem } from "@/lib/teams";

type TeamPageProps = {
  params: Promise<{ slug: string }>;
};

const SCORE_LABELS: { key: keyof ScoreBreakdown; label: string; max: number }[] = [
  { key: "featureCompletion", label: "Feature completion", max: 20 },
  { key: "codeQuality", label: "Code quality", max: 15 },
  { key: "innovation", label: "Innovation", max: 15 },
  { key: "completeness", label: "Completeness", max: 20 },
  { key: "documentation", label: "Documentation", max: 10 },
  { key: "bonus", label: "Bonus", max: 20 },
];

function barColor(pct: number): string {
  if (pct >= 70) return "var(--green)";
  if (pct >= 45) return "var(--yellow)";
  return "var(--red)";
}

function statusIcon(status: FeatureItem["status"]): string {
  if (status === "pass") return "P";
  if (status === "partial") return "~";
  return "X";
}

export default async function TeamDetailsPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const report = getTeamReportBySlug(slug);

  if (!report) {
    notFound();
  }

  const heroColor =
    (report.percentage ?? 0) >= 70
      ? "var(--green)"
      : (report.percentage ?? 0) >= 45
        ? "var(--yellow)"
        : "var(--red)";

  return (
    <main className="container">
      <header className="header-row">
        <div>
          <Link href="/" className="back-link">
            &larr; All teams
          </Link>
          <h1 className="title">{report.teamName}</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* hero score card */}
      <section className="detail-hero">
        <div className="hero-top">
          <div>
            <p className="hero-score" style={{ color: heroColor }}>
              {report.score ?? 0}
              <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--muted)" }}>
                /100
              </span>
            </p>
            <p className="hero-rank">Rank #{report.rank} of all evaluated teams</p>
          </div>
          <span
            className={`pct-badge ${(report.percentage ?? 0) >= 70 ? "high" : (report.percentage ?? 0) >= 45 ? "mid" : "low"}`}
            style={{ fontSize: "1.1rem", padding: "6px 14px" }}
          >
            {report.percentage ?? 0}%
          </span>
        </div>

        {/* breakdown bars */}
        <div className="breakdown">
          {SCORE_LABELS.map(({ key, label, max }) => {
            const val = report.scores[key];
            const pct = Math.round((val / max) * 100);
            return (
              <div key={key} className="breakdown-item">
                <span className="breakdown-label">
                  <span>{label}</span>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>
                    {val}/{max}
                  </span>
                </span>
                <div className="breakdown-track">
                  <div
                    className="breakdown-fill"
                    style={{ width: `${pct}%`, background: barColor(pct) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* feature breakdown */}
      {report.features.length > 0 && (
        <section className="section">
          <h2 className="section-title">Feature breakdown</h2>
          <ul className="feature-list">
            {report.features.map((f, i) => (
              <li key={i} className="feature-item">
                <span className={`feature-icon ${f.status}`}>{statusIcon(f.status)}</span>
                <span className="feature-body">
                  <strong>{f.name}</strong>
                  {f.evidence && <span className="feature-evidence">{f.evidence}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* missing features */}
      {report.missingFeatures.length > 0 && (
        <section className="section">
          <h2 className="section-title">Missing features</h2>
          <ul className="missing-list">
            {report.missingFeatures.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      {/* comments */}
      {report.comments.length > 0 && (
        <section className="section">
          <h2 className="section-title">Evaluator comments</h2>
          <ul className="comment-list">
            {report.comments.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
