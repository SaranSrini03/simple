import type { TeamGitStats } from "@/lib/git-stats";
import { TeamRepoSyncButton } from "@/app/components/team-repo-sync";

type Props = {
  teamName: string;
  stats: TeamGitStats;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function GitActivitySection({ teamName, stats }: Props) {
  const maxAuthorCommits = Math.max(1, ...stats.authors.map((a) => a.commits));

  return (
    <section className="section git-section">
      <div className="git-section-head">
        <div>
          <h2 className="section-title">Repository activity</h2>
          <p className="git-sub">
            Local clone under <code className="git-path">{stats.repoPath ?? "repos/…"}</code>
            {stats.defaultBranch && (
              <span className="git-branch"> Branch: {stats.defaultBranch}</span>
            )}
          </p>
        </div>
        <TeamRepoSyncButton teamName={teamName} />
      </div>

      {stats.repoMissing && (
        <p className="git-warn">
          No matching folder in <code>repos/</code> for this team. Clone the Git URL from teams.json into
          that directory, then use Pull to sync.
        </p>
      )}

      {stats.error && !stats.repoMissing && <p className="git-warn">{stats.error}</p>}

      {!stats.repoMissing && stats.remoteDelta && (
        <div className="git-delta">
          <span>
            Compared to <code>origin/{stats.defaultBranch ?? "main"}</code>:{" "}
            <strong>{stats.remoteDelta.behind}</strong> behind, <strong>{stats.remoteDelta.ahead}</strong>{" "}
            ahead (run Pull to fast-forward if behind).
          </span>
        </div>
      )}

      {!stats.repoMissing && stats.authors.length > 0 && (
        <>
          <h3 className="git-h3">Commit frequency by contributor (all branches, no merges)</h3>
          <p className="git-meta">{stats.totalCommitsCounted} commits attributed across {stats.authors.length} identities.</p>
          <ul className="author-freq">
            {stats.authors.map((a) => (
              <li key={`${a.email}-${a.author}`} className="author-freq-row">
                <span className="author-freq-label" title={a.email}>
                  {a.author}
                </span>
                <div className="author-freq-track">
                  <div
                    className="author-freq-fill"
                    style={{ width: `${Math.round((a.commits / maxAuthorCommits) * 100)}%` }}
                  />
                </div>
                <span className="author-freq-count">{a.commits}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {!stats.repoMissing && stats.recentCommits.length > 0 && (
        <>
          <h3 className="git-h3">Recent commit history</h3>
          <div className="git-table-wrap">
            <table className="git-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Author</th>
                  <th>Subject</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCommits.map((c) => (
                  <tr key={c.hash}>
                    <td className="git-td-date">{formatDate(c.dateIso)}</td>
                    <td className="git-td-author" title={c.email}>
                      {c.author}
                    </td>
                    <td className="git-td-subj">{c.subject}</td>
                    <td className="git-td-hash">
                      <code>{c.hash.slice(0, 7)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
