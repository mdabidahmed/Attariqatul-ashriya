#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Merge the per-worker extraction parts into data/lessons.json.

Reads every `.work/parts/pages_*.json` (a worker's batch) plus any
`.work/parts/_*.json` (a single lesson object left behind by a worker that was
interrupted mid-batch), then:

  * keeps one object per lesson id, preferring whichever source carries the
    most material when two workers extracted the same lesson;
  * overwrites titleEn / topicEn / bookPages / scanPages from the book's own
    printed Contents and the scan-page map, so those are never a worker's guess;
  * normalises every lesson to the same ten keys, using [] for empty arrays;
  * drops duplicate vocabulary pairs and blank entries;
  * emits `contents`, the full 75-lesson index, alongside `lessons`.

This script rebuilds the whole file from the parts, so it can undo editing done
directly on data/lessons.json. It therefore refuses to write when any lesson
would come out with less material than the file already holds, and says which
lessons are affected; pass --allow-shrink when the loss is intended.

Usage: python3 scripts/merge_lessons.py [-o data/lessons.json] [--allow-shrink]
"""
from __future__ import unicode_literals

import argparse
import glob
import io
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_page_map import LESSONS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS = os.path.join(ROOT, ".work/parts")
MAP = os.path.join(ROOT, ".work/pagemap/map.json")
CORRECTIONS = os.path.join(ROOT, ".work/corrections.json")

ARRAY_KEYS = [
    "vocabulary",
    "sentences",
    "qaPairs",
    "translateToArabic",
    "translateToEnglish",
    "notesEn",
]
KEY_ORDER = [
    "id",
    "titleEn",
    "titleAr",
    "topicEn",
    "scanPages",
    "bookPages",
] + ARRAY_KEYS

ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
]
TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy"]


def number_word(n):
    """1 -> 'One', 34 -> 'Thirty-Four' (the hyphenation the index uses)."""
    if n < 20:
        return ONES[n]
    tens, rest = divmod(n, 10)
    return TENS[tens] + ("-" + ONES[rest] if rest else "")


def dedupe_vocab(rows, lesson_id, warnings):
    seen, out = set(), []
    for row in rows:
        en = (row.get("en") or "").strip()
        ar = (row.get("ar") or "").strip()
        if not en or not ar:
            warnings.append("lesson %d: dropped vocabulary row with an empty side (%r/%r)"
                            % (lesson_id, en, ar))
            continue
        if (en, ar) in seen:
            warnings.append("lesson %d: dropped duplicate vocabulary pair %r/%r"
                            % (lesson_id, en, ar))
            continue
        seen.add((en, ar))
        out.append({"en": en, "ar": ar})
    return out


def item_count(lesson):
    """How much teaching material a lesson object carries."""
    return sum(len(lesson.get(k) or []) for k in ARRAY_KEYS if k != "notesEn")


def content(lesson):
    """The parts of a lesson a worker actually supplies, for comparing sources."""
    return json.dumps([lesson.get(k) or [] for k in ARRAY_KEYS] +
                      [(lesson.get("titleAr") or "").strip()],
                      ensure_ascii=False, sort_keys=True)


def load_parts(warnings):
    """lesson id -> (source file, lesson object).

    Two workers extracting the same pages used to be resolved by whichever
    file sorted last, which silently threw away the better extraction. When
    more than one source offers the same lesson the fuller one now wins and
    the clash is reported, so a re-run cannot quietly undo finished work.
    """
    found = {}

    def offer(path, lesson, from_batch):
        lid = lesson.get("id")
        if lid is None:
            return
        if lid not in found:
            found[lid] = (os.path.basename(path), lesson, from_batch)
            return
        old_src, old_lesson, old_batch = found[lid]
        new_n, old_n = item_count(lesson), item_count(old_lesson)
        # Equal size does not mean equal content, and a rebuild must not churn
        # a lesson that has already been adjudicated. On a tie the per-lesson
        # file wins, because those are written one lesson at a time after the
        # page has been re-read, while pages_*.json is bulk worker output.
        new_rank, old_rank = (new_n, not from_batch), (old_n, not old_batch)
        if new_rank > old_rank:
            found[lid] = (os.path.basename(path), lesson, from_batch)
            winner = os.path.basename(path)
        elif new_rank < old_rank:
            winner = old_src
        else:
            return
        if content(lesson) != content(old_lesson):
            warnings.append(
                "lesson %d: offered by %s (%d items) and %s (%d items) with "
                "different content, keeping %s"
                % (lid, os.path.basename(path), new_n, old_src, old_n, winner))

    for path in sorted(glob.glob(os.path.join(PARTS, "pages_*.json"))):
        with io.open(path, encoding="utf-8") as f:
            doc = json.load(f)
        for lesson in doc.get("lessons", []):
            offer(path, lesson, True)
    for path in sorted(glob.glob(os.path.join(PARTS, "_*.json"))):
        with io.open(path, encoding="utf-8") as f:
            doc = json.load(f)
        singles = doc.get("lessons", [doc]) if isinstance(doc, dict) else doc
        for lesson in singles:
            offer(path, lesson, False)
    return dict((lid, (src, lesson)) for lid, (src, lesson, _) in found.items())


def load_corrections():
    if not os.path.exists(CORRECTIONS):
        return []
    with io.open(CORRECTIONS, encoding="utf-8") as f:
        return json.load(f).get("corrections", [])


def apply_corrections(lessons, corrections, warnings):
    by_id = dict((l["id"], l) for l in lessons)
    for fix in corrections:
        lesson = by_id.get(fix["lessonId"])
        if lesson is None:
            continue
        if fix["action"] == "clear":
            lesson[fix["field"]] = []
        elif fix["action"] == "replace":
            lesson[fix["field"]] = fix["value"]
        warnings.append("lesson %d: applied correction to %s (%s)"
                        % (fix["lessonId"], fix["field"], fix["reason"].split(".")[0]))


def check_no_shrink(out_path, lessons):
    """Lessons that the merge would leave with less material than they have now."""
    if not os.path.exists(out_path):
        return []
    with io.open(out_path, encoding="utf-8") as f:
        existing = dict((l["id"], l) for l in json.load(f).get("lessons", []))
    shrunk = []
    for lesson in lessons:
        old = existing.get(lesson["id"])
        if old is None:
            continue
        before, after = item_count(old), item_count(lesson)
        if after < before:
            shrunk.append((lesson["id"], before, after))
    for lid in sorted(set(existing) - set(l["id"] for l in lessons)):
        shrunk.append((lid, item_count(existing[lid]), 0))
    return shrunk


def write_atomic(out_path, doc):
    """The app fetches data/lessons.json live, so never leave it half written."""
    directory = os.path.dirname(out_path)
    fd, tmp = tempfile.mkstemp(dir=directory, prefix=".lessons.", suffix=".json")
    os.close(fd)
    try:
        with io.open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp, out_path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", default=os.path.join(ROOT, "data/lessons.json"))
    ap.add_argument("--allow-shrink", action="store_true",
                    help="write even if a lesson would lose material")
    args = ap.parse_args()

    with io.open(MAP, encoding="utf-8") as f:
        pagemap = {L["id"]: L for L in json.load(f)["lessons"]}

    index = [
        {
            "id": lid,
            "titleEn": "Lesson %s" % number_word(lid),
            "topicEn": topic,
            "startBookPage": start,
        }
        for lid, topic, start in LESSONS
    ]

    warnings = []
    found = load_parts(warnings)
    lessons = []
    for entry in index:
        lid = entry["id"]
        if lid not in found:
            continue
        src, raw = found[lid]
        lesson = {
            "id": lid,
            "titleEn": entry["titleEn"],
            "titleAr": (raw.get("titleAr") or "").strip(),
            "topicEn": entry["topicEn"],
            "scanPages": pagemap[lid]["scanPages"],
            "bookPages": pagemap[lid]["bookPages"],
        }
        if not lesson["titleAr"]:
            warnings.append("lesson %d: no Arabic title (from %s)" % (lid, src))
        for key in ARRAY_KEYS:
            value = raw.get(key) or []
            lesson[key] = value if isinstance(value, list) else []
        lesson["vocabulary"] = dedupe_vocab(lesson["vocabulary"], lid, warnings)
        lesson["notesEn"] = [n.strip() for n in lesson["notesEn"] if (n or "").strip()]
        lessons.append(dict((k, lesson[k]) for k in KEY_ORDER))

    apply_corrections(lessons, load_corrections(), warnings)

    out = {
        "book": {
            "titleEn": "At-Tareeqatul Asriyyah, Part I",
            "titleAr": "الطريقة العصرية",
            "sourcePdf": "68ae14da862de_Tariqatul_Asriyyah_Volume_1.pdf",
            "totalScanPages": 100,
        },
        "contents": index,
        "lessons": lessons,
    }

    if not os.path.isdir(os.path.dirname(args.out)):
        os.makedirs(os.path.dirname(args.out))

    shrunk = check_no_shrink(args.out, lessons)
    if shrunk and not args.allow_shrink:
        print("refusing to write %s" % os.path.relpath(args.out, ROOT))
        print("%d lesson(s) would lose material, so the parts under .work/parts "
              "are behind the file:" % len(shrunk))
        for lid, before, after in shrunk:
            print("  lesson %-3d %d items -> %d" % (lid, before, after))
        print("Bring the part files up to date, or pass --allow-shrink if the "
              "loss is intended.")
        for w in warnings:
            print("  warn: %s" % w)
        return 1

    write_atomic(args.out, out)

    have = set(l["id"] for l in lessons)
    missing = [e["id"] for e in index if e["id"] not in have]
    print("wrote %s" % os.path.relpath(args.out, ROOT))
    print("lessons: %d of %d" % (len(lessons), len(index)))
    if missing:
        print("missing ids: %s" % missing)
    for w in warnings:
        print("  warn: %s" % w)
    return 0


if __name__ == "__main__":
    sys.exit(main())
