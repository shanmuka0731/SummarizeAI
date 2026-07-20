import { useState } from "react";
import { Link } from "react-router-dom";
import { askBrain } from "../lib/brainApi";
import "../styles/brain.css";

const MODES = [
  {
    key: "ask",
    label: "Ask a question",
    placeholder: "e.g. What did I learn about RAG last month?",
  },
  {
    key: "compare",
    label: "Compare my uploads",
    placeholder: "e.g. Compare these papers on transformer efficiency",
  },
  {
    key: "whats_new",
    label: "Tell me what's new",
    placeholder: "(optional) focus on a specific topic...",
  },
];

export default function AskBrainPage() {
  const [mode, setMode] = useState("ask");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const currentMode = MODES.find((m) => m.key === mode);

  const handleAsk = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await askBrain(question, mode);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || "Something went wrong asking your Brain."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brain-page">
      <div className="brain-shell">
        <div className="brain-hero">
          <span className="brain-eyebrow">Memory + Context</span>
          <h1>Your knowledge base talks back.</h1>
          <p>
            Most summarizers forget everything after each upload. This
            doesn't. Ask questions across everything you've added, compare
            sources against each other, or simply ask what's new since you
            last checked in.
          </p>
        </div>

        <div className="brain-tabs">
          <Link to="/brain" className="brain-tab">
            Library
          </Link>
          <Link to="/brain/ask" className="brain-tab active">
            Ask your Brain
          </Link>
          <Link to="/brain/progress" className="brain-tab">
            Progress Tracker
          </Link>
        </div>

        <div className="brain-upload-panel">
          <div className="ask-modes">
            {MODES.map((m) => (
              <button
                key={m.key}
                className={`ask-mode ${mode === m.key ? "active" : ""}`}
                onClick={() => setMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <textarea
            className="brain-textarea"
            rows="3"
            placeholder={currentMode.placeholder}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button className="brain-btn" onClick={handleAsk} disabled={loading}>
            {loading ? "Thinking..." : "Ask"}
          </button>

          {error && <div className="brain-feedback error">{error}</div>}

          {result && (
            <div className="ask-answer">
              {result.answer}

              {result.sources && result.sources.length > 0 && (
                <div className="ask-sources">
                  {result.sources.map((s) => (
                    <span className="brain-tag" key={s.id}>
                      {s.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
