import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchProgress } from "../lib/brainApi";
import "../styles/brain.css";

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    fetchProgress()
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((err) => {
        console.error(err);
        if (mounted) {
          setError(
            err.response?.data?.error || "Couldn't load your progress yet."
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const timeEntries = data
    ? Object.entries(data.time_per_topic_minutes || {}).sort(
        (a, b) => b[1] - a[1]
      )
    : [];

  return (
    <div className="brain-page">
      <div className="brain-shell">
        <div className="brain-hero">
          <span className="brain-eyebrow">Learning Progress Tracker</span>
          <h1>See your learning, not just your uploads.</h1>
          <p>
            Every PDF, video, and note you add quietly builds a picture of
            what you've mastered, where the gaps are, and how consistently
            you're showing up.
          </p>
        </div>

        <div className="brain-tabs">
          <Link to="/brain" className="brain-tab">
            Library
          </Link>
          <Link to="/brain/ask" className="brain-tab">
            Ask your Brain
          </Link>
          <Link to="/brain/progress" className="brain-tab active">
            Progress Tracker
          </Link>
        </div>

        {loading && <div className="brain-empty">Loading your progress...</div>}
        {error && <div className="brain-feedback error">{error}</div>}

        {data && (
          <>
            <div className="streak-row">
              <div className="brain-card" style={{ flex: 1, minWidth: 200 }}>
                <h3>
                  <span className="streak-flame">🔥</span> Current streak
                </h3>
                <div className="stat-number">
                  {data.streak.current_streak}
                </div>
                <div className="stat-label">
                  day{data.streak.current_streak === 1 ? "" : "s"} in a row
                </div>
              </div>
              <div className="brain-card" style={{ flex: 1, minWidth: 200 }}>
                <h3>🏆 Longest streak</h3>
                <div className="stat-number">{data.streak.longest_streak}</div>
                <div className="stat-label">days, all-time best</div>
              </div>
              <div className="brain-card" style={{ flex: 1, minWidth: 200 }}>
                <h3>📅 Active days</h3>
                <div className="stat-number">
                  {data.streak.total_active_days}
                </div>
                <div className="stat-label">days you've added something</div>
              </div>
            </div>

            <div className="progress-columns">
              <div className="progress-col brain-card">
                <h4>Topics mastered</h4>
                <div className="progress-pill-list">
                  {data.mastered.length === 0 && (
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                      Keep going — nothing has reached mastery depth yet.
                    </span>
                  )}
                  {data.mastered.map((t) => (
                    <div className="progress-pill mastered" key={t}>
                      <span>{t}</span>
                      <span>✓</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="progress-col brain-card">
                <h4>In progress</h4>
                <div className="progress-pill-list">
                  {data.in_progress.length === 0 && (
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                      Nothing mid-way right now.
                    </span>
                  )}
                  {data.in_progress.map((t) => (
                    <div className="progress-pill in-progress" key={t}>
                      <span>{t}</span>
                      <span>~</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="progress-col brain-card">
                <h4>Knowledge gaps</h4>
                <div className="progress-pill-list">
                  {data.gaps.length === 0 && (
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                      No shallow topics detected yet.
                    </span>
                  )}
                  {data.gaps.map((t) => (
                    <div className="progress-pill gap" key={t}>
                      <span>{t}</span>
                      <span>!</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
              Estimated time per topic
            </h2>

            {timeEntries.length === 0 ? (
              <div className="brain-empty">
                Add a few documents and this will fill in automatically.
              </div>
            ) : (
              <div className="brain-doc-list">
                {timeEntries.map(([topic, minutes]) => {
                  const max = timeEntries[0][1] || 1;
                  const pct = Math.max(6, Math.round((minutes / max) * 100));
                  return (
                    <div className="brain-doc" key={topic} style={{ alignItems: "center" }}>
                      <div className="brain-doc-main">
                        <div className="brain-doc-title">{topic}</div>
                        <div
                          style={{
                            height: "8px",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.08)",
                            marginTop: "0.5rem",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: "white",
                              borderRadius: "999px",
                            }}
                          />
                        </div>
                      </div>
                      <span className="brain-source-pill">
                        {minutes} min
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
