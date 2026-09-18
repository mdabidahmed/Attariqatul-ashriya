#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Insert or replace one lesson in data/lessons.json, atomically.

The file is fetched live by the running web app, so it is written to a temp
file alongside the target and moved into place with os.replace(), which never
exposes a half-written document to a reader.

Usage: python3 scripts/add_lesson.py .work/parts/_61.json [...]
"""
from __future__ import unicode_literals

import io
import json
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = os.path.join(ROOT, "data/lessons.json")

ARRAY_KEYS = [
    "vocabulary",
    "sentences",
    "qaPairs",
    "translateToArabic",
    "translateToEnglish",
    "notesEn",
]
KEY_ORDER = ["id", "titleEn", "titleAr", "topicEn", "scanPages", "bookPages"] + ARRAY_KEYS


def normalise(raw, index_by_id):
    lid = raw["id"]
    entry = index_by_id[lid]
    lesson = {
        "id": lid,
        "titleEn": entry["titleEn"],
        "titleAr": (raw.get("titleAr") or "").strip(),
        "topicEn": entry["topicEn"],
        "scanPages": raw["scanPages"],
        "bookPages": raw["bookPages"],
    }
    for key in ARRAY_KEYS:
        value = raw.get(key) or []
        lesson[key] = value if isinstance(value, list) else []
    return dict((k, lesson[k]) for k in KEY_ORDER)


def write_atomic(doc):
    directory = os.path.dirname(TARGET)
    fd, tmp = tempfile.mkstemp(dir=directory, prefix=".lessons.", suffix=".json")
    os.close(fd)
    try:
        with io.open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp, TARGET)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def main():
    paths = sys.argv[1:]
    if not paths:
        print("usage: add_lesson.py LESSON.json [...]")
        return 1

    with io.open(TARGET, encoding="utf-8") as f:
        doc = json.load(f)
    index_by_id = dict((c["id"], c) for c in doc["contents"])
    before = len(doc["lessons"])

    for path in paths:
        with io.open(path, encoding="utf-8") as f:
            raw = json.load(f)
        lesson = normalise(raw, index_by_id)
        doc["lessons"] = [l for l in doc["lessons"] if l["id"] != lesson["id"]]
        doc["lessons"].append(lesson)
        doc["lessons"].sort(key=lambda l: l["id"])
        counts = " ".join(
            "%s=%d" % (k[:4], len(lesson[k])) for k in ARRAY_KEYS if lesson[k]
        )
        print("lesson %-3d %s" % (lesson["id"], counts))

    if len(doc["contents"]) != 75:
        raise SystemExit("refusing to write: contents is %d entries, not 75"
                         % len(doc["contents"]))
    if len(doc["lessons"]) < before:
        raise SystemExit("refusing to write: lesson count would regress")

    write_atomic(doc)
    print("wrote data/lessons.json: %d lessons (was %d)" % (len(doc["lessons"]), before))
    return 0


if __name__ == "__main__":
    sys.exit(main())
