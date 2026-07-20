from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import fitz
import os
import traceback

from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs
from brain_routes import brain_bp

from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable
)

load_dotenv()

CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_API_TOKEN = os.getenv("CF_API_TOKEN")

app = Flask(__name__)
CORS(app)
app.register_blueprint(brain_bp)


def get_summary(prompt):
    if not CF_ACCOUNT_ID or not CF_API_TOKEN:
        raise RuntimeError(
            "Cloudflare AI credentials are not configured. Set CF_ACCOUNT_ID and CF_API_TOKEN in the environment."
        )

    url = (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct"
    )

    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant that creates clear and "
                    "concise summaries."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=120
    )

    # response.raise_for_status()
    if not response.ok:
        print(response.status_code)
        print(response.text)
        response.raise_for_status()

    result = response.json()

    return result["result"]["response"]


def extract_video_id(video_url):
    if not video_url:
        return None

    parsed = urlparse(video_url)

    if "youtu.be" in parsed.netloc:
        return parsed.path.lstrip("/")

    if "youtube.com" in parsed.netloc:
        return parse_qs(parsed.query).get("v", [None])[0]

    return None


@app.route("/summarize/text", methods=["POST"])
def summarize_text():
    try:
        data = request.get_json()

        text = data.get("text", "").strip()

        if not text:
            return jsonify({"error": "Text is required"}), 400

        prompt = f"Summarize the following text:\n\n{text}"

        summary = get_summary(prompt)

        return jsonify({"summary": summary})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/summarize/pdf", methods=["POST"])
def summarize_pdf():
    try:
        if "file" not in request.files:
            return jsonify({"error": "PDF file is required"}), 400

        file = request.files["file"]

        doc = fitz.open(
            stream=file.read(),
            filetype="pdf"
        )

        text = ""

        for page in doc:
            text += page.get_text()

        if not text.strip():
            return jsonify({
                "error": "Could not extract text from PDF"
            }), 400

        prompt = f"Summarize the following PDF:\n\n{text}"

        summary = get_summary(prompt)

        return jsonify({"summary": summary})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/summarize/youtube", methods=["POST"])
def summarize_youtube():
    try:
        data = request.get_json()

        video_url = data.get("url")
        target_lang = data.get("language", "en")

        if not video_url:
            return jsonify({
                "error": "YouTube URL is required"
            }), 400

        video_id = extract_video_id(video_url)

        if not video_id:
            return jsonify({
                "error": "Invalid YouTube URL"
            }), 400

        api = YouTubeTranscriptApi()

        transcript = None

        # Try requested language directly
        try:
            transcript = api.fetch(
                video_id,
                languages=[target_lang]
            )

        except NoTranscriptFound:
            print(
                f"No transcript found for language: {target_lang}"
            )

        # Fallback to available transcripts
        if transcript is None:
            transcript_list = api.list(video_id)

            print("\nAvailable transcripts:")

            for t in transcript_list:
                print(
                    f"{t.language_code} | "
                    f"{t.language} | "
                    f"generated={t.is_generated} | "
                    f"translatable={t.is_translatable}"
                )

            # Prefer Hindi or English
            for t in transcript_list:
                if t.language_code in ["hi", "en"]:
                    if t.is_translatable:
                        transcript = t.translate("en").fetch()
                    else:
                        transcript = t.fetch()
                    break

            # Final fallback: first available transcript
            if transcript is None:
                first = next(iter(transcript_list))

                if first.is_translatable:
                    transcript = first.translate("en").fetch()
                else:
                    transcript = first.fetch()

        text = " ".join(
            snippet.text for snippet in transcript
        )

        if not text.strip():
            return jsonify({
                "error": "Transcript is empty"
            }), 400

        prompt = f"""
You are an expert summarizer.

IMPORTANT:
- The final output must be ONLY in English.
- Even if the transcript is in Hindi, Telugu, Tamil, Spanish, or any other language,
  first understand it and then provide the summary in English.
- Do not use any non-English words unless they are proper nouns.

Provide:

# Overview
A concise overview of the video.

# Key Points
Use bullet points.

# Conclusion
A short conclusion.

Transcript:


{text[:15000]}
"""

        summary = get_summary(prompt)

        return jsonify({
            "summary": summary
        })

    except TranscriptsDisabled:
        return jsonify({
            "error": "Captions are disabled for this video."
        }), 400

    except VideoUnavailable:
        return jsonify({
            "error": "Video is unavailable."
        }), 400

    except NoTranscriptFound:
        return jsonify({
            "error": "No transcript found for this video."
        }), 400

    except Exception as e:
        traceback.print_exc()

        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True)