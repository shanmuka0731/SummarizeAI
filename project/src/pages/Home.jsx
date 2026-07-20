import { Link } from "react-router-dom";
import "../styles/home.css";

const features = [
  {
    icon: "📄",
    title: "PDF Summarizer",
    desc: "Drop any research paper, report, or document and get a clean, structured summary in seconds.",
    link: "/pdf",
    label: "Upload PDF",
  },
  {
    icon: "▶️",
    title: "YouTube Analyzer",
    desc: "Paste a video URL — lectures, podcasts, interviews — and get key points without watching the whole thing.",
    link: "/youtube",
    label: "Analyze Video",
  },
  {
    icon: "✏️",
    title: "Text Summarizer",
    desc: "Paste any wall of text and get a sharp, readable summary tailored to what matters most.",
    link: "/text",
    label: "Start with Text",
  },
  {
    icon: "🧠",
    title: "Knowledge Brain",
    desc: "Upload everything. Ask questions across your entire history. Your personal AI memory layer.",
    link: "/brain",
    label: "Open Brain",
    highlight: true,
  },
];

const steps = [
  { num: "01", title: "Choose your source", body: "Pick from text, PDF, or a YouTube URL — whatever you have." },
  { num: "02", title: "Let AI read it", body: "The model processes the full content, not just a snippet." },
  { num: "03", title: "Get your summary", body: "Structured, clear, and ready to use in seconds." },
  { num: "04", title: "It remembers", body: "Every upload goes into your Brain — searchable forever." },
];

const stats = [
  { value: "3", unit: "formats", label: "Text, PDF, YouTube" },
  { value: "<5", unit: "seconds", label: "Average summary time" },
  { value: "∞", unit: "history", label: "Everything is stored" },
];

export default function Home() {
  return (
    <div className="home-page">
      <video className="bg-video" autoPlay muted loop playsInline>
        <source src="/videos/video.mp4" type="video/mp4" />
      </video>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-inner">

          <h1 className="hero-h1">
            Turn anything into
            <br />
            <span className="hero-gradient">clear insight.</span>
          </h1>

          <p className="hero-sub">
            PDFs, YouTube videos, long texts — summarized in seconds.
            <br />
            Every upload remembered, so you can ask questions later.
          </p>

          <div className="hero-cta">
            <Link to="/pdf" className="cta-primary">Get started free</Link>
            <Link to="/brain" className="cta-secondary">Explore Brain →</Link>
          </div>

          <div className="hero-stats">
            {stats.map((s) => (
              <div className="hstat" key={s.label}>
                <span className="hstat-value">{s.value}</span>
                <span className="hstat-unit">{s.unit}</span>
                <span className="hstat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="scroll-hint">
          <span>↓</span>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section">
        <div className="section-inner">
          <div className="section-eyebrow">What it does</div>
          <h2 className="section-title">One tool, four superpowers.</h2>
          <p className="section-sub">
            Everything from a quick summary to a persistent knowledge base that grows with you.
          </p>

          <div className="feature-grid">
            {features.map((f) => (
              <div className={`feature-card ${f.highlight ? "feature-card--highlight" : ""}`} key={f.title}>
                {f.highlight && <div className="feature-new-badge">New</div>}
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <Link to={f.link} className="feature-link">
                  {f.label} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section">
        <div className="section-inner">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-title">Simple by design.</h2>

          <div className="steps-row">
            {steps.map((s, i) => (
              <div className="step" key={s.num}>
                <div className="step-num">{s.num}</div>
                <div className="step-line" style={{ opacity: i < steps.length - 1 ? 1 : 0 }} />
                <h4 className="step-title">{s.title}</h4>
                <p className="step-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRAIN SPOTLIGHT ── */}
      <section className="brain-spotlight">
        <div className="section-inner">
          <div className="spotlight-card">
            <div className="spotlight-dots" aria-hidden="true" />
            <div className="spotlight-content">
              <div className="section-eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
                The feature that sets this apart
              </div>
              <h2 className="section-title" style={{ maxWidth: 540 }}>
                Your AI remembers everything you've uploaded.
              </h2>
              <p className="section-sub" style={{ maxWidth: 520 }}>
                Ask "what did I learn about RAG last month?" Compare research papers
                against each other. See what's new. Most summarizers forget after
                one session. This doesn't.
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2rem" }}>
                <Link to="/brain" className="cta-primary">Open Knowledge Brain</Link>
                <Link to="/brain/progress" className="cta-secondary">See Progress Tracker →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="footer-cta">
        <div className="section-inner" style={{ textAlign: "center" }}>
          <h2 className="section-title">Ready to stop re-reading the same things?</h2>
          <p className="section-sub" style={{ marginBottom: "2rem" }}>
            Start uploading and let the AI build your knowledge base.
          </p>
          <div className="hero-cta" style={{ justifyContent: "center" }}>
            <Link to="/pdf" className="cta-primary">Upload your first PDF</Link>
            <Link to="/text" className="cta-secondary">Try with text →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
