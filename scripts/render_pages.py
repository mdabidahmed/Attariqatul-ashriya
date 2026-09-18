#!/usr/bin/env python3
"""Render scanned pages of the Tariqatul Asriyyah PDF into legible PNG crops.

The scans are landscape spreads of two facing book pages. Because the vision
reader downsamples anything wider/taller than ~1568 px, we emit several sizes:

  full/pXXX.jpg        whole spread, for layout orientation
  half/pXXX_L.jpg      left  book page
  half/pXXX_R.jpg      right book page
  detail/pXXX_L1.jpg   top    ~56% of the left page, rendered larger
  detail/pXXX_L2.jpg   bottom ~56% of the left page
  detail/pXXX_R1.jpg   top    ~56% of the right page
  detail/pXXX_R2.jpg   bottom ~56% of the right page

Which side holds Arabic and which holds English is NOT constant across the
book, so callers must check each spread.

Usage:
    python3 scripts/render_pages.py [--pages 1-100] [--out .work/pages]
    python3 scripts/render_pages.py --zoom-region 12 R 0.1 0.4 --scale 3
"""
import argparse
import os
import sys

import fitz

PDF = os.environ.get(
    "ASRIYYAH_PDF",
    "/Users/ssh169/Downloads/68ae14da862de_Tariqatul_Asriyyah_Volume_1.pdf",
)

# The reader downsamples above this, so aim just under it on the long edge.
TARGET_LONG_EDGE = 1560
DETAIL_OVERLAP = 0.12  # fraction of page height shared by the two detail crops
# The book page on the left of a spread usually creeps past the geometric
# midline, so each half is widened by this fraction of the spread width.
HALF_OVERLAP = 0.04


def parse_pages(spec, page_count):
    if not spec:
        return list(range(1, page_count + 1))
    out = []
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if "-" in chunk:
            a, b = chunk.split("-")
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(chunk))
    return [p for p in out if 1 <= p <= page_count]


def save(page, clip, out_path, long_edge=TARGET_LONG_EDGE):
    """Render `clip` (page coordinates) so its long edge is ~long_edge px."""
    longest = max(clip.width, clip.height)
    zoom = long_edge / longest
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip, alpha=False)
    if out_path.endswith(".jpg"):
        pix.save(out_path, jpg_quality=92)
    else:
        pix.save(out_path)
    return pix.width, pix.height


def render_page(page, num, outdir, want=("full", "half", "detail"), ext=".jpg"):
    r = page.rect
    tag = "p%03d" % num
    made = []

    if "full" in want:
        w, h = save(page, r, os.path.join(outdir, "full", tag + ext))
        made.append(("full", w, h))

    mid = r.x0 + r.width / 2.0
    slack = r.width * HALF_OVERLAP
    halves = {
        "L": fitz.Rect(r.x0, r.y0, mid + slack, r.y1),
        "R": fitz.Rect(mid - slack, r.y0, r.x1, r.y1),
    }
    for side, rect in halves.items():
        if "half" in want:
            w, h = save(page, rect, os.path.join(outdir, "half", "%s_%s%s" % (tag, side, ext)))
            made.append((side, w, h))
        if "detail" in want:
            cut = rect.height * (0.5 + DETAIL_OVERLAP / 2)
            top = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + cut)
            bot = fitz.Rect(rect.x0, rect.y1 - cut, rect.x1, rect.y1)
            for idx, sub in ((1, top), (2, bot)):
                save(page, sub, os.path.join(outdir, "detail", "%s_%s%d%s" % (tag, side, idx, ext)))
    return made


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=PDF)
    ap.add_argument("--pages", default=None, help="e.g. 1-20,44,50-60")
    ap.add_argument("--out", default=".work/pages")
    ap.add_argument("--kinds", default="full,half,detail")
    ap.add_argument("--ext", default=".jpg", choices=[".jpg", ".png"])
    ap.add_argument(
        "--zoom-region",
        nargs=5,
        metavar=("PAGE", "SIDE", "Y0", "Y1", "NAME"),
        help="re-render a horizontal band of one half page, SIDE in L/R/A, "
        "Y0/Y1 as fractions of page height",
    )
    ap.add_argument("--scale", type=float, default=2.0, help="long edge multiplier for --zoom-region")
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    outdir = args.out
    for sub in ("full", "half", "detail", "zoom"):
        os.makedirs(os.path.join(outdir, sub), exist_ok=True)

    if args.zoom_region:
        pno, side, y0, y1, name = args.zoom_region
        page = doc[int(pno) - 1]
        r = page.rect
        mid = r.x0 + r.width / 2.0
        slack = r.width * HALF_OVERLAP
        if side.upper() == "L":
            x0, x1 = r.x0, mid + slack
        elif side.upper() == "R":
            x0, x1 = mid - slack, r.x1
        else:
            x0, x1 = r.x0, r.x1
        clip = fitz.Rect(x0, r.y0 + r.height * float(y0), x1, r.y0 + r.height * float(y1))
        path = os.path.join(outdir, "zoom", "%s%s" % (name, args.ext))
        w, h = save(page, clip, path, long_edge=TARGET_LONG_EDGE * args.scale)
        print("%s %dx%d" % (path, w, h))
        return

    want = tuple(args.kinds.split(","))
    for num in parse_pages(args.pages, doc.page_count):
        made = render_page(doc[num - 1], num, outdir, want, args.ext)
        print("p%03d %s" % (num, " ".join("%s:%dx%d" % m for m in made)))
        sys.stdout.flush()


if __name__ == "__main__":
    main()
