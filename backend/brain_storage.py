# brain_storage.py
#
# Lightweight, dependency-free persistence layer for the "Personal Knowledge
# Brain" feature set (Memory + Context, Learning Progress Tracker).
#
# This intentionally does NOT touch app.py or any existing route. It is a
# self-contained module that the new brain_routes.py blueprint imports.
#
# Storage is a single JSON file on disk. That's enough for an internship
# project / demo; swapping this for a real database later only means
# rewriting the functions in this file — nothing else in the app needs to
# change, since brain_routes.py only talks to the functions below.

import json
import os
import threading
import uuid
from datetime import datetime, timezone

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DATA_DIR, "brain_store.json")

_lock = threading.Lock()


def _empty_db():
    return {
        "documents": [],   # every uploaded PDF / text / YouTube video
        "topics": {},       # topic_name -> aggregated stats
        "activity": []      # one entry per day the user studied (for streaks)
    }


def _ensure_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DB_PATH):
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(_empty_db(), f, indent=2)


def _read():
    _ensure_db()
    with open(DB_PATH, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return _empty_db()


def _write(db):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Documents (the actual "brain" contents)
# ---------------------------------------------------------------------------

def add_document(source_type, title, raw_text, summary, topics):
    """
    source_type: "text" | "pdf" | "youtube"
    topics: list[str] – topics this document touches
    """
    with _lock:
        db = _read()

        doc = {
            "id": str(uuid.uuid4()),
            "source_type": source_type,
            "title": title[:160],
            "raw_text": raw_text,
            "summary": summary,
            "topics": topics,
            "created_at": now_iso(),
            "word_count": len(raw_text.split()),
        }

        db["documents"].append(doc)
        _touch_topics(db, topics, doc["word_count"])
        _record_activity(db)

        _write(db)
        return doc


def list_documents():
    db = _read()
    # newest first
    return sorted(db["documents"], key=lambda d: d["created_at"], reverse=True)


def get_document(doc_id):
    db = _read()
    for d in db["documents"]:
        if d["id"] == doc_id:
            return d
    return None


def delete_document(doc_id):
    with _lock:
        db = _read()
        before = len(db["documents"])
        db["documents"] = [d for d in db["documents"] if d["id"] != doc_id]
        _write(db)
        return before != len(db["documents"])


def documents_since(days=30):
    cutoff = datetime.now(timezone.utc).timestamp() - (days * 86400)
    out = []
    for d in list_documents():
        try:
            ts = datetime.fromisoformat(d["created_at"]).timestamp()
        except ValueError:
            continue
        if ts >= cutoff:
            out.append(d)
    return out


def documents_matching_topic(topic):
    topic = topic.lower().strip()
    return [
        d for d in list_documents()
        if any(topic in t.lower() for t in d.get("topics", []))
        or topic in d.get("title", "").lower()
    ]


# ---------------------------------------------------------------------------
# Topics / progress tracking
# ---------------------------------------------------------------------------

def _touch_topics(db, topics, word_count):
    per_topic_words = max(1, word_count // max(1, len(topics or ["general"])))
    for raw in (topics or ["General"]):
        key = raw.strip()
        if not key:
            continue
        bucket = db["topics"].setdefault(key, {
            "name": key,
            "encounters": 0,
            "words_seen": 0,
            "first_seen": now_iso(),
            "last_seen": now_iso(),
        })
        bucket["encounters"] += 1
        bucket["words_seen"] += per_topic_words
        bucket["last_seen"] = now_iso()


def _record_activity(db):
    day = today_str()
    if day not in db["activity"]:
        db["activity"].append(day)
        db["activity"] = sorted(db["activity"])


def get_topics():
    db = _read()
    return db["topics"]


def get_streak():
    db = _read()
    days = sorted(db["activity"])
    if not days:
        return {"current_streak": 0, "longest_streak": 0, "total_active_days": 0}

    date_objs = sorted({datetime.strptime(d, "%Y-%m-%d").date() for d in days})

    longest = 1
    run = 1
    for i in range(1, len(date_objs)):
        delta = (date_objs[i] - date_objs[i - 1]).days
        if delta == 1:
            run += 1
        else:
            run = 1
        longest = max(longest, run)

    today = datetime.now(timezone.utc).date()
    current = 0
    cursor = today
    date_set = set(date_objs)
    # walk backwards from today while consecutive days exist
    while cursor in date_set:
        current += 1
        cursor = cursor.fromordinal(cursor.toordinal() - 1)

    return {
        "current_streak": current,
        "longest_streak": longest,
        "total_active_days": len(date_objs),
    }


def classify_topics(mastered_threshold=600, gap_threshold=150):
    """
    Very simple heuristic used purely to power the dashboard:
    - "mastered"   -> topic has been seen several times / a lot of words read
    - "in_progress"-> some exposure, but not much
    - "gap"        -> only glanced at once, barely any depth
    Word/encounter thresholds are intentionally simple and tunable.
    """
    topics = get_topics()
    mastered, in_progress, gaps = [], [], []

    for t in topics.values():
        score = t["words_seen"] + (t["encounters"] * 80)
        if score >= mastered_threshold and t["encounters"] >= 2:
            mastered.append(t)
        elif score < gap_threshold:
            gaps.append(t)
        else:
            in_progress.append(t)

    mastered.sort(key=lambda t: -t["words_seen"])
    in_progress.sort(key=lambda t: -t["words_seen"])
    gaps.sort(key=lambda t: t["words_seen"])

    return {"mastered": mastered, "in_progress": in_progress, "gaps": gaps}


def total_time_estimate_minutes():
    """
    Rough proxy for "time spent per topic": estimate reading time at
    ~200 words/minute. Not exact, but gives a meaningful comparative signal.
    """
    topics = get_topics()
    return {
        name: round(t["words_seen"] / 200, 1)
        for name, t in topics.items()
    }
