#!/usr/bin/env python3
"""Turn .work/pagemap/map.json into one image manifest per extraction worker.

Each lesson is listed with the exact half-page images that hold it, so a worker
never has to guess which half of which spread belongs to its lessons.
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PAGES = os.path.join(ROOT, ".work/pages")

# (worker id, first lesson, last lesson)
CHUNKS = [
    (1, 1, 6),
    (2, 7, 12),
    (3, 13, 18),
    (4, 19, 24),
    (5, 25, 30),
    (6, 31, 36),
    (7, 37, 42),
    (8, 43, 48),
    (9, 49, 54),
    (10, 55, 60),
    (11, 61, 66),
    (12, 67, 72),
    (13, 73, 75),
]


def main():
    m = json.load(open(os.path.join(ROOT, ".work/pagemap/map.json")))
    spreads = {int(k): v for k, v in m["spreads"].items()}
    b2s = {}
    for n, d in spreads.items():
        b2s[d["left"]] = (n, "L")
        b2s[d["right"]] = (n, "R")

    briefs = {}
    for wid, lo, hi in CHUNKS:
        lines = []
        for L in m["lessons"]:
            if not (lo <= L["id"] <= hi):
                continue
            lines.append("### Lesson %d  (topic from Contents: %s)" % (L["id"], L["topicEn"]))
            lines.append("Book pages %s. Images to read:" % (
                ", ".join(str(b) for b in L["bookPages"]),))
            for b in L["bookPages"]:
                if b not in b2s:
                    lines.append("- book page %d: **NOT IN SCAN** (skip)" % b)
                    continue
                n, side = b2s[b]
                tag = "p%03d" % n
                lines.append(
                    "- book page %d  ->  half `%s/half/%s_%s.jpg`  "
                    "detail `%s/detail/%s_%s1.jpg` (top) + `%s/detail/%s_%s2.jpg` (bottom)"
                    % (b, PAGES, tag, side, PAGES, tag, side, PAGES, tag, side)
                )
            lines.append("")
        briefs[wid] = "\n".join(lines)

    outdir = os.path.join(ROOT, ".work/pagemap/briefs")
    os.makedirs(outdir, exist_ok=True)
    for wid, text in briefs.items():
        with open(os.path.join(outdir, "worker_%02d.md" % wid), "w") as f:
            f.write(text)
        print("worker_%02d.md  %d chars" % (wid, len(text)))


if __name__ == "__main__":
    main()
