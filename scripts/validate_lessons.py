#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validate data/lessons.json. Standard library only.

Checks:
  * the file is valid UTF-8 and valid JSON with the expected top-level shape;
  * lesson ids are unique and ascending;
  * every id in `contents` is present in `lessons` (the coverage assertion);
  * every vocabulary entry has a non-empty `en` and `ar`, with no duplicate
    pairs inside a lesson;
  * Arabic fields really contain Arabic script and English fields do not;
  * every lesson has at least one usable question source.

Two fields are deliberately exempt from the "English fields hold no Arabic"
rule because the book itself mixes scripts there: `topicEn`, since the printed
index names several lessons by the Arabic particle they teach, and `notesEn`,
since the grammar rules quote Arabic examples inline. Both are counted and
reported rather than silently ignored.

Usage:
    python3 scripts/validate_lessons.py [path] [--allow-partial]

Exits non-zero if any check fails.
"""
from __future__ import unicode_literals

import io
import json
import os
import sys

ARABIC_BLOCKS = (
    (0x0600, 0x06FF),  # Arabic
    (0x0750, 0x077F),  # Arabic Supplement
    (0x08A0, 0x08FF),  # Arabic Extended-A
    (0xFB50, 0xFDFF),  # Arabic Presentation Forms-A
    (0xFE70, 0xFEFF),  # Arabic Presentation Forms-B
)
HARAKAT = set(range(0x064B, 0x0653)) | {0x0670, 0x0653, 0x0654, 0x0655}

QUESTION_SOURCES = ("vocabulary", "qaPairs", "translateToArabic", "translateToEnglish")


def usable_question_source(lesson):
    """A lesson is quizzable if it has any bilingual pair to ask about.

    Dictation lessons print no vocabulary table and no translation exercise,
    but their model sentences carry both an Arabic and an English side, which
    is just as usable as a quiz prompt.
    """
    if any(lesson.get(k) for k in QUESTION_SOURCES):
        return True
    return any(s.get("ar") and s.get("en") for s in lesson.get("sentences", []))


def has_arabic(text):
    return any(lo <= ord(c) <= hi for c in text for lo, hi in ARABIC_BLOCKS)


def has_harakat(text):
    return any(ord(c) in HARAKAT for c in text)


class Report(object):
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)


def check_arabic_field(rep, where, value):
    if not isinstance(value, str) or not value.strip():
        rep.error("%s: Arabic field is empty" % where)
        return
    if not has_arabic(value):
        rep.error("%s: Arabic field has no Arabic script: %r" % (where, value))
    elif not has_harakat(value):
        rep.warn("%s: Arabic field carries no harakat: %s" % (where, value))


def check_english_field(rep, where, value):
    if not isinstance(value, str) or not value.strip():
        rep.error("%s: English field is empty" % where)
        return
    if has_arabic(value):
        rep.error("%s: English field contains Arabic script: %r" % (where, value))


def validate(path, allow_partial=False):
    rep = Report()
    with io.open(path, encoding="utf-8") as f:
        raw = f.read()
    doc = json.loads(raw)

    for key in ("book", "contents", "lessons"):
        if key not in doc:
            rep.error("top level: missing %r" % key)
    if rep.errors:
        return rep, None, None

    contents = doc["contents"]
    lessons = doc["lessons"]

    ids = [l.get("id") for l in lessons]
    if any(not isinstance(i, int) for i in ids):
        rep.error("lessons: every id must be an integer")
    else:
        if len(set(ids)) != len(ids):
            rep.error("lessons: ids are not unique (%d ids, %d distinct)"
                      % (len(ids), len(set(ids))))
        if ids != sorted(ids):
            rep.error("lessons: ids are not in ascending order")

    have = set(ids)
    missing = [c["id"] for c in contents if c["id"] not in have]
    if missing:
        msg = "coverage: %d of %d lessons from the index are absent: %s" % (
            len(missing), len(contents), missing)
        (rep.warn if allow_partial else rep.error)(msg)
    extra = sorted(have - set(c["id"] for c in contents))
    if extra:
        rep.error("coverage: lesson ids not present in the index: %s" % extra)

    mixed_topic = mixed_notes = 0
    for lesson in lessons:
        lid = lesson.get("id")
        tag = "lesson %s" % lid
        check_english_field(rep, "%s.titleEn" % tag, lesson.get("titleEn", ""))
        check_arabic_field(rep, "%s.titleAr" % tag, lesson.get("titleAr", ""))
        if has_arabic(lesson.get("topicEn", "")):
            mixed_topic += 1

        seen = set()
        for n, row in enumerate(lesson.get("vocabulary", [])):
            where = "%s.vocabulary[%d]" % (tag, n)
            check_english_field(rep, where + ".en", row.get("en", ""))
            check_arabic_field(rep, where + ".ar", row.get("ar", ""))
            pair = (row.get("en", ""), row.get("ar", ""))
            if pair in seen:
                rep.error("%s: duplicate vocabulary pair %r" % (where, pair))
            seen.add(pair)

        for n, row in enumerate(lesson.get("sentences", [])):
            where = "%s.sentences[%d]" % (tag, n)
            check_arabic_field(rep, where + ".ar", row.get("ar", ""))
            if row.get("en"):
                check_english_field(rep, where + ".en", row["en"])

        for n, row in enumerate(lesson.get("qaPairs", [])):
            where = "%s.qaPairs[%d]" % (tag, n)
            check_arabic_field(rep, where + ".questionAr", row.get("questionAr", ""))
            check_arabic_field(rep, where + ".answerAr", row.get("answerAr", ""))

        for key in ("translateToArabic", "translateToEnglish"):
            for n, row in enumerate(lesson.get(key, [])):
                where = "%s.%s[%d]" % (tag, key, n)
                check_english_field(rep, where + ".en", row.get("en", ""))
                check_arabic_field(rep, where + ".ar", row.get("ar", ""))
                if "derived" not in row:
                    rep.error("%s: missing 'derived' flag" % where)

        for n, note in enumerate(lesson.get("notesEn", [])):
            if not (note or "").strip():
                rep.error("%s.notesEn[%d]: empty note" % (tag, n))
            elif has_arabic(note):
                mixed_notes += 1

        if not usable_question_source(lesson):
            rep.error("%s: no usable question source (no vocabulary, no printed "
                      "Q&A, no translation items and no bilingual sentence)" % tag)

    return rep, (mixed_topic, mixed_notes), (contents, lessons)


def print_report(doc_path, rep, mixed, data):
    contents, lessons = data
    by_id = dict((l["id"], l) for l in lessons)
    cols = ("vocabulary", "sentences", "qaPairs", "translateToArabic", "translateToEnglish")
    totals = dict((c, 0) for c in cols)
    derived = printed = 0

    print("Coverage of the book's 75-lesson index")
    print("-" * 96)
    print("%-4s %-22s %-34s %5s %5s %5s %5s %5s" % (
        "id", "title", "topic", "voc", "sent", "qa", "->ar", "->en"))
    print("-" * 96)
    for entry in contents:
        lesson = by_id.get(entry["id"])
        topic = entry["topicEn"]
        topic = topic if len(topic) <= 33 else topic[:30] + "..."
        if lesson is None:
            print("%-4d %-22s %-34s %s" % (
                entry["id"], entry["titleEn"], topic, "   -- NOT EXTRACTED --"))
            continue
        counts = [len(lesson.get(c, [])) for c in cols]
        for c, n in zip(cols, counts):
            totals[c] += n
        for key in ("sentences", "translateToArabic", "translateToEnglish", "qaPairs"):
            for row in lesson.get(key, []):
                if row.get("derived"):
                    derived += 1
                else:
                    printed += 1
        print("%-4d %-22s %-34s %5d %5d %5d %5d %5d" % (
            entry["id"], entry["titleEn"], topic, counts[0], counts[1],
            counts[2], counts[3], counts[4]))
    print("-" * 96)
    print("%-62s %5d %5d %5d %5d %5d" % (
        "TOTAL over %d extracted lessons" % len(lessons),
        totals["vocabulary"], totals["sentences"], totals["qaPairs"],
        totals["translateToArabic"], totals["translateToEnglish"]))
    print("")
    print("grand total of teaching items : %d" % (sum(totals.values())))
    print("  vocabulary pairs            : %d" % totals["vocabulary"])
    print("  model sentences             : %d" % totals["sentences"])
    print("  printed question/answer     : %d" % totals["qaPairs"])
    print("  translate-into-Arabic       : %d" % totals["translateToArabic"])
    print("  translate-into-English      : %d" % totals["translateToEnglish"])
    print("non-vocabulary items with a supplied side (derived=true) : %d" % derived)
    print("non-vocabulary items printed verbatim  (derived=false)   : %d" % printed)
    print("topicEn values carrying Arabic (index names the particle): %d" % mixed[0])
    print("notesEn entries quoting Arabic inline                    : %d" % mixed[1])
    print("")

    if rep.warnings:
        print("%d warning(s):" % len(rep.warnings))
        for w in rep.warnings[:25]:
            print("  - %s" % w)
        if len(rep.warnings) > 25:
            print("  ... and %d more" % (len(rep.warnings) - 25))
        print("")
    if rep.errors:
        print("%d ERROR(s):" % len(rep.errors))
        for e in rep.errors[:50]:
            print("  - %s" % e)
        if len(rep.errors) > 50:
            print("  ... and %d more" % (len(rep.errors) - 50))
        print("")
        print("FAILED: %s" % doc_path)
        return 1
    print("PASSED: %s" % doc_path)
    return 0


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    allow_partial = "--allow-partial" in sys.argv[1:]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = args[0] if args else os.path.join(root, "data/lessons.json")

    rep, mixed, data = validate(path, allow_partial)
    if data is None:
        for e in rep.errors:
            print("  - %s" % e)
        print("FAILED: %s" % path)
        return 1
    return print_report(path, rep, mixed, data)


if __name__ == "__main__":
    sys.exit(main())
