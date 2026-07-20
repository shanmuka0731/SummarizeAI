import { useState } from "react";
import axios from "axios";

export default function YoutubePage() {
  const [youtubeURL, setYoutubeURL] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!youtubeURL.trim()) {
      alert("Please enter a YouTube URL");
      return;
    }

    setLoading(true);
    setSummary("");

    try {
      const res = await axios.post(
        "http://localhost:5000/summarize/youtube",
        {
          url: youtubeURL,
        },
      );

      setSummary(res.data.summary);
    } catch (err) {
  console.error(err);

  if (err.response) {
    console.log(err.response.data);
    alert(err.response.data.error);
  } else {
    alert("Something went wrong");
  }
}
     finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-card">
        <h1>YouTube Summarizer</h1>

        <p className="page-description">
          Paste a YouTube video URL and get an AI-generated summary.
        </p>

        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeURL}
          onChange={(e) => setYoutubeURL(e.target.value)}
        />

        <button onClick={handleSummarize} disabled={loading}>
          {loading ? "Summarizing..." : "Summarize"}
        </button>

        {summary && (
          <div className="summary">
            <h2>Summary</h2>
            <p>{summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}