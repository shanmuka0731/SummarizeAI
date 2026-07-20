# brain_routes.py
#
# New Flask Blueprint that adds three features on top of the existing
# Summarize AI backend, WITHOUT modifying app.py's existing routes:
#
#   1. Personal Knowledge Brain  -> persistent library of every upload
#   2. Memory + Context          -> ask questions across past uploads
#   3. Learning Progress Tracker -> mastered topics / gaps / streaks / time
#
# To wire this in, app.py only needs two new lines at the bottom:
#
#   from brain_routes import brain_bp
#   app.register_blueprint(brain_bp)
#
# Everything else in app.py stays exactly as it was.

import os
import re
import traceback

import requests
from flask import Blueprint, request, jsonify

import brain_storage as store

try:
    import fitz  # PyMuPDF, already a dependency of the existing app.py
except ImportError:
    fitz = None

try:
    from youtube_transcript_api import (
        YouTubeTranscriptApi,
        TranscriptsDisabled,
        NoTranscriptFound,
        VideoUnavailable,
    )
except ImportError:
    YouTubeTranscriptApi = None

from urllib.parse import urlparse, parse_qs

brain_bp = Blueprint("brain_bp", __name__)

CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_API_TOKEN = os.getenv("CF_API_TOKEN")


# ---------------------------------------------------------------------------
# Shared LLM helper (mirrors app.py's get_summary so we don't need to import
# from app.py and risk a circular import / coupling to its module state)
# ---------------------------------------------------------------------------

def call_llm(system_prompt, user_prompt):
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
        "Content-Type": "application/json",
    }

    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    }

    response = requests.post(url, headers=headers, json=payload, timeout=120)

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


def guess_topics(text, title=""):
    """
    Cheap, dependency-free topic tagging: ask the LLM for 2-4 short topic
    tags. Falls back to a naive keyword heuristic if the LLM call fails,
    so the feature still works even if the Cloudflare credentials are down.
    """
    snippet = text[:4000]
    try:
        raw = call_llm(
            "You output ONLY a comma-separated list of 2 to 4 short topic "
            "tags (1-3 words each) that best describe the subject matter. "
            "No explanations, no numbering, no extra words.",
            f"Title: {title}\n\nContent:\n{snippet}",
        )
        tags = [t.strip(" .") for t in re.split(r"[,\n]", raw) if t.strip()]
        tags = [t for t in tags if 0 < len(t) <= 40][:4]
        if tags:
            return tags
    except Exception:
        pass

    # Fallback heuristic: pick a few capitalized / frequent words
    words = re.findall(r"[A-Za-z][A-Za-z0-9+\-]{3,}", snippet)
    freq = {}
    for w in words:
        key = w.lower()
        freq[key] = freq.get(key, 0) + 1
    common = sorted(freq.items(), key=lambda kv: -kv[1])[:3]
    return [w.capitalize() for w, _ in common] or ["General"]


# ---------------------------------------------------------------------------
# 1. Personal Knowledge Brain — ingest endpoints
# ---------------------------------------------------------------------------

@brain_bp.route("/brain/upload/text", methods=["POST"])
def brain_upload_text():
    try:
        data = request.get_json()
        text = (data.get("text") or "").strip()
        title = (data.get("title") or "").strip() or "Untitled note"

        if not text:
            return jsonify({"error": "Text is required"}), 400

        summary = call_llm(
            "You are a helpful assistant that creates clear and concise "
            "summaries.",
            f"Summarize the following text:\n\n{text}",
        )
        topics = guess_topics(text, title)

        doc = store.add_document("text", title, text, summary, topics)
        return jsonify({"document": doc})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@brain_bp.route("/brain/upload/pdf", methods=["POST"])
def brain_upload_pdf():
    try:
        if fitz is None:
            return jsonify({"error": "PDF support is not available on the server"}), 500

        if "file" not in request.files:
            return jsonify({"error": "PDF file is required"}), 400

        file = request.files["file"]
        doc_pdf = fitz.open(stream=file.read(), filetype="pdf")

        text = ""
        for page in doc_pdf:
            text += page.get_text()

        if not text.strip():
            return jsonify({"error": "Could not extract text from PDF"}), 400

        summary = call_llm(
            "You are a helpful assistant that creates clear and concise "
            "summaries.",
            f"Summarize the following PDF:\n\n{text}",
        )
        title = file.filename or "PDF document"
        topics = guess_topics(text, title)

        doc = store.add_document("pdf", title, text, summary, topics)
        return jsonify({"document": doc})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@brain_bp.route("/brain/upload/youtube", methods=["POST"])
def brain_upload_youtube():
    try:
        if YouTubeTranscriptApi is None:
            return jsonify({"error": "YouTube support is not available on the server"}), 500

        data = request.get_json()
        video_url = data.get("url")
        target_lang = data.get("language", "en")

        if not video_url:
            return jsonify({"error": "YouTube URL is required"}), 400

        video_id = extract_video_id(video_url)
        if not video_id:
            return jsonify({"error": "Invalid YouTube URL"}), 400

        api = YouTubeTranscriptApi()
        transcript = None

        try:
            transcript = api.fetch(video_id, languages=[target_lang])
        except NoTranscriptFound:
            pass

        if transcript is None:
            transcript_list = api.list(video_id)
            for t in transcript_list:
                if t.language_code in ["hi", "en"]:
                    transcript = t.translate("en").fetch() if t.is_translatable else t.fetch()
                    break
            if transcript is None:
                first = next(iter(transcript_list))
                transcript = first.translate("en").fetch() if first.is_translatable else first.fetch()

        text = " ".join(snippet.text for snippet in transcript)

        if not text.strip():
            return jsonify({"error": "Transcript is empty"}), 400

        prompt = f"""
You are an expert summarizer.

IMPORTANT:
- The final output must be ONLY in English.
- Even if the transcript is in Hindi, Telugu, Tamil, Spanish, or any other language,
  first understand it and then provide the summary in English.

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
        summary = call_llm(
            "You are a helpful assistant that creates clear and concise "
            "summaries.",
            prompt,
        )
        topics = guess_topics(text, video_url)

        doc = store.add_document("youtube", video_url, text, summary, topics)
        return jsonify({"document": doc})

    except TranscriptsDisabled:
        return jsonify({"error": "Captions are disabled for this video."}), 400
    except VideoUnavailable:
        return jsonify({"error": "Video is unavailable."}), 400
    except NoTranscriptFound:
        return jsonify({"error": "No transcript found for this video."}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Library browsing
# ---------------------------------------------------------------------------

@brain_bp.route("/brain/documents", methods=["GET"])
def brain_documents():
    docs = store.list_documents()
    # don't ship the full raw_text to the list view, keep it light
    light = [
        {k: v for k, v in d.items() if k != "raw_text"}
        for d in docs
    ]
    return jsonify({"documents": light})


@brain_bp.route("/brain/documents/<doc_id>", methods=["DELETE"])
def brain_delete_document(doc_id):
    ok = store.delete_document(doc_id)
    if not ok:
        return jsonify({"error": "Document not found"}), 404
    return jsonify({"deleted": True})


# ---------------------------------------------------------------------------
# 2. Memory + Context — ask questions across the whole Brain
# ---------------------------------------------------------------------------

@brain_bp.route("/brain/ask", methods=["POST"])
def brain_ask():
    """
    Natural-language Q&A across everything stored in the Brain.
    Body: { "question": "...", "mode": "ask" | "compare" | "whats_new" }
    """
    try:
        data = request.get_json()
        question = (data.get("question") or "").strip()
        mode = data.get("mode", "ask")

        all_docs = store.list_documents()
        if not all_docs:
            return jsonify({
                "answer": (
                    "Your Brain is empty so far — upload a PDF, some text, "
                    "or a YouTube video first, then ask me about it."
                )
            })

        if mode == "whats_new":
            recent = store.documents_since(days=7)
            context_docs = recent or all_docs[:5]
            instruction = (
                "Using ONLY the summaries below, tell the user what is NEW "
                "or recently added to their knowledge base, organised by "
                "topic. Be concise and specific about which documents "
                "introduced which ideas."
            )
        elif mode == "compare":
            context_docs = all_docs[:4]
            instruction = (
                "Using ONLY the summaries below (each from a different "
                "uploaded document), compare and contrast them: shared "
                "themes, disagreements or contradictions, and what each "
                "one uniquely adds."
            )
        else:
            # default: targeted question against everything relevant
            if question:
                context_docs = store.documents_matching_topic(question) or all_docs
            else:
                context_docs = all_docs
            instruction = (
                "Answer the user's question using ONLY the context below, "
                "drawn from things they previously uploaded. If the answer "
                "isn't in the context, say so plainly instead of guessing."
            )

        context_docs = context_docs[:8]
        context_block = "\n\n---\n\n".join(
            f"[{d['source_type'].upper()}] {d['title']} "
            f"(added {d['created_at'][:10]})\nTopics: {', '.join(d['topics'])}\n"
            f"Summary: {d['summary']}"
            for d in context_docs
        )

        user_prompt = (
            f"{instruction}\n\nUser question: {question or '(none given)'}"
            f"\n\nContext from the user's knowledge base:\n\n{context_block}"
        )

        answer = call_llm(
            "You are the user's personal knowledge assistant. You only "
            "know what is in the provided context. Be concise, specific, "
            "and reference document titles where useful.",
            user_prompt,
        )

        return jsonify({
            "answer": answer,
            "sources": [
                {"id": d["id"], "title": d["title"], "source_type": d["source_type"]}
                for d in context_docs
            ],
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 3. Learning Progress Tracker
# ---------------------------------------------------------------------------

@brain_bp.route("/brain/progress", methods=["GET"])
def brain_progress():
    try:
        classification = store.classify_topics()
        streak = store.get_streak()
        time_per_topic = store.total_time_estimate_minutes()
        docs = store.list_documents()

        return jsonify({
            "mastered": [t["name"] for t in classification["mastered"]],
            "in_progress": [t["name"] for t in classification["in_progress"]],
            "gaps": [t["name"] for t in classification["gaps"]],
            "streak": streak,
            "time_per_topic_minutes": time_per_topic,
            "total_documents": len(docs),
            "total_topics": len(store.get_topics()),
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
