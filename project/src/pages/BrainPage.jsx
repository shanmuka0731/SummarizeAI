import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  uploadText,
  uploadPdf,
  uploadYoutube,
  fetchDocuments,
  deleteDocument,
} from "../lib/brainApi";
import "../styles/brain.css";

const SOURCE_LABEL = {
  text: "Text",
  pdf: "PDF",
  youtube: "YouTube",
};

export default function BrainPage() {
  const [uploadKind, setUploadKind] = useState("text");

  // text upload state
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  // pdf upload state
  const [file, setFile] = useState(null);

  // youtube upload state
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type, message }

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const resetFeedback = () => setFeedback(null);

  const handleUpload = async () => {
    resetFeedback();
    setLoading(true);

    try {
      if (uploadKind === "text") {
        if (!text.trim()) {
          setFeedback({ type: "error", message: "Please paste some text first." });
          return;
        }
        await uploadText(title || "Untitled note", text);
      } else if (uploadKind === "pdf") {
        if (!file) {
          setFeedback({ type: "error", message: "Please choose a PDF file." });
          return;
        }
        await uploadPdf(file);
      } else if (uploadKind === "youtube") {
        if (!youtubeUrl.trim()) {
          setFeedback({ type: "error", message: "Please paste a YouTube URL." });
          return;
        }
        await uploadYoutube(youtubeUrl);
      }

      setFeedback({
        type: "success",
        message: "Added to your Brain. It's now searchable and remembered.",
      });
      setTitle("");
      setText("");
      setFile(null);
      setYoutubeUrl("");
      loadDocuments();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || "Something went wrong while saving this.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="brain-page">
      <div className="brain-shell">
        <div className="brain-hero">
          <span className="brain-eyebrow">Personal Knowledge Brain</span>
          <h1>Everything you've uploaded, remembered forever.</h1>
          <p>
            Upload PDFs, YouTube videos, and text. Unlike a one-off
            summarizer, the Brain keeps every upload so you can come back
            later and ask what you learned, compare sources, or see what's
            new.
          </p>
        </div>

        <div className="brain-tabs">
          <Link to="/brain" className="brain-tab active">
            Library
          </Link>
          <Link to="/brain/ask" className="brain-tab">
            Ask your Brain
          </Link>
          <Link to="/brain/progress" className="brain-tab">
            Progress Tracker
          </Link>
        </div>

        <div className="brain-upload-panel">
          <div className="brain-upload-tabs">
            <button
              className={uploadKind === "text" ? "active" : ""}
              onClick={() => setUploadKind("text")}
            >
              Text
            </button>
            <button
              className={uploadKind === "pdf" ? "active" : ""}
              onClick={() => setUploadKind("pdf")}
            >
              PDF
            </button>
            <button
              className={uploadKind === "youtube" ? "active" : ""}
              onClick={() => setUploadKind("youtube")}
            >
              YouTube
            </button>
          </div>

          {uploadKind === "text" && (
            <>
              <input
                className="brain-input"
                placeholder="Give it a short title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="brain-textarea"
                rows="6"
                placeholder="Paste an article, your notes, or anything you want the Brain to remember..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}

          {uploadKind === "pdf" && (
            <input
              className="brain-input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />
          )}

          {uploadKind === "youtube" && (
            <input
              className="brain-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          )}

          <button className="brain-btn" onClick={handleUpload} disabled={loading}>
            {loading ? "Adding to Brain..." : "Add to Brain"}
          </button>

          {feedback && (
            <div className={`brain-feedback ${feedback.type}`}>
              {feedback.message}
            </div>
          )}
        </div>

        <div className="brain-grid">
          <div className="brain-card">
            <h3>📚 Documents stored</h3>
            <div className="stat-number">{documents.length}</div>
            <div className="stat-label">across text, PDF, and YouTube</div>
          </div>
          <div className="brain-card">
            <h3>🧠 Distinct topics</h3>
            <div className="stat-number">
              {new Set(documents.flatMap((d) => d.topics || [])).size}
            </div>
            <div className="stat-label">auto-detected from your uploads</div>
          </div>
        </div>

        <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
          Your library
        </h2>

        {docsLoading ? (
          <div className="brain-empty">Loading your Brain...</div>
        ) : documents.length === 0 ? (
          <div className="brain-empty">
            Nothing here yet — add your first PDF, note, or video above.
          </div>
        ) : (
          <div className="brain-doc-list">
            {documents.map((doc) => (
              <div className="brain-doc" key={doc.id}>
                <div className="brain-doc-main">
                  <div className="brain-doc-title">{doc.title}</div>
                  <div className="brain-doc-meta">
                    {new Date(doc.created_at).toLocaleDateString()} ·{" "}
                    {doc.word_count} words
                  </div>
                  <div className="brain-doc-summary">{doc.summary}</div>
                  <div style={{ marginTop: "0.6rem" }}>
                    {(doc.topics || []).map((t) => (
                      <span className="brain-tag" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.6rem",
                  }}
                >
                  <span className="brain-source-pill">
                    {SOURCE_LABEL[doc.source_type] || doc.source_type}
                  </span>
                  <button
                    className="brain-doc-delete"
                    onClick={() => handleDelete(doc.id)}
                    title="Remove from Brain"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
