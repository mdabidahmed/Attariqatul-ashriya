#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Split over-long passage entries in data/lessons.json into single sentences.

The app drops any item longer than about 120 characters, because a whole
reading passage cannot serve as one of four multiple-choice options. This
script replaces one such entry with the several sentences it is made of,
copying the original `group` and `derived` on to each part.

Every split is checked: the Arabic of the parts, with whitespace and sentence
punctuation removed, must equal the Arabic of the original entry. So a
boundary may be moved but no word can be dropped, added or re-spelled.

Input is a JSON file:

  {"splits": [
     {"lesson": 50, "field": "sentences", "index": 1,
      "parts": [{"ar": "...", "en": "..."}, ...]}
  ]}

Usage:
    python3 scripts/split_entries.py SPLITS.json [--target PATH]

--target defaults to data/lessons.json. Pass it again for the worker batch
file under .work/parts/ that the same lesson came from, so that re-running
scripts/merge_lessons.py does not reinstate the unsplit passage.
"""
from __future__ import unicode_literals

import io
import json
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = os.path.join(ROOT, "data/lessons.json")

# Sentence punctuation and spacing the book uses to join clauses.
DROP = " \t\n\u00a0\u060c\u061b\u061f.:?!\u2026;,\u200f\u200e"


def normalise(text):
    return "".join(c for c in text if c not in DROP)


def write_atomic(doc, target):
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(target), prefix=".lessons.", suffix=".json")
    os.close(fd)
    try:
        with io.open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp, target)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def main():
    args = [a for a in sys.argv[1:] if a != "--target"]
    targets = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--target"]
    args = [a for a in args if a not in targets]
    if not args:
        print("usage: split_entries.py SPLITS.json [--target PATH]")
        return 1
    target = targets[0] if targets else TARGET

    with io.open(args[0], encoding="utf-8") as f:
        splits = json.load(f)["splits"]
    with io.open(target, encoding="utf-8") as f:
        doc = json.load(f)
    by_id = dict((l["id"], l) for l in doc["lessons"])
    splits = [s for s in splits if s["lesson"] in by_id]
    if not splits:
        print("%s: none of the splits apply here" % os.path.relpath(target, ROOT))
        return 0

    before = dict((k, sum(len(l[k]) for l in doc["lessons"]))
                  for k in ("sentences", "translateToArabic", "translateToEnglish"))

    # Apply the highest index in each list first so earlier indices stay valid.
    splits.sort(key=lambda s: (s["lesson"], s["field"], s["index"]), reverse=True)

    applied = 0
    for split in splits:
        lesson = by_id[split["lesson"]]
        rows = lesson[split["field"]]
        original = rows[split["index"]]
        parts = split["parts"]

        want, got = normalise(original["ar"]), normalise("".join(p["ar"] for p in parts))
        if want != got:
            print("lesson %d %s[%d]: parts do not reproduce the original Arabic"
                  % (split["lesson"], split["field"], split["index"]))
            for n, (a, b) in enumerate(zip(want, got)):
                if a != b:
                    print("  first difference at character %d: %r vs %r" % (n, a, b))
                    print("  original: ...%s..." % want[max(0, n - 30):n + 30])
                    print("  parts   : ...%s..." % got[max(0, n - 30):n + 30])
                    break
            else:
                print("  original is %d characters, parts are %d" % (len(want), len(got)))
                tail = want[len(got):] if len(want) > len(got) else got[len(want):]
                print("  text only on the %s side: %s"
                      % ("original" if len(want) > len(got) else "parts", tail))
            return 1

        new_rows = []
        for part in parts:
            row = {"ar": part["ar"], "en": part["en"]}
            if "group" in original:
                row["group"] = original["group"]
            row["derived"] = original["derived"]
            # keep the original key order of this field
            new_rows.append(dict((k, row[k]) for k in original.keys() if k in row))
        rows[split["index"]:split["index"] + 1] = new_rows
        applied += 1
        longest = max(len(p["ar"]) for p in parts)
        print("lesson %-3d %s[%d]: %d chars -> %d sentences, longest %d"
              % (split["lesson"], split["field"], split["index"],
                 len(original["ar"]), len(parts), longest))

    write_atomic(doc, target)
    after = dict((k, sum(len(l[k]) for l in doc["lessons"]))
                 for k in ("sentences", "translateToArabic", "translateToEnglish"))
    print("applied %d split(s) to %s" % (applied, os.path.relpath(target, ROOT)))
    for k in sorted(before):
        if before[k] != after[k]:
            print("  %s: %d -> %d" % (k, before[k], after[k]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
