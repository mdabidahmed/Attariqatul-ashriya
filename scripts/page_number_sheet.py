#!/usr/bin/env python3
"""Build contact sheets of the printed book-page-number boxes.

Each scan page is a spread whose two blue page-number boxes sit in a narrow
band at the bottom centre. Stacking that band for many spreads into one image
lets the scan-page -> book-page map be read in a handful of looks instead of
100.

Usage: python3 scripts/page_number_sheet.py 1 25 .work/pagemap/sheet_01.png
"""
import os
import sys

import fitz

PDF = os.environ.get(
    "ASRIYYAH_PDF",
    "/Users/ssh169/Downloads/68ae14da862de_Tariqatul_Asriyyah_Volume_1.pdf",
)

BAND_X0, BAND_X1 = 0.40, 0.62
BAND_Y0, BAND_Y1 = 0.895, 0.995
ROW_H = 42.0
LABEL_W = 46.0
ROW_W = 320.0


def main():
    start, end, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    src = fitz.open(PDF)
    n = end - start + 1
    dst = fitz.open()
    page = dst.new_page(width=LABEL_W + ROW_W, height=ROW_H * n)
    for i, pno in enumerate(range(start, end + 1)):
        sp = src[pno - 1]
        r = sp.rect
        clip = fitz.Rect(
            r.x0 + r.width * BAND_X0,
            r.y0 + r.height * BAND_Y0,
            r.x0 + r.width * BAND_X1,
            r.y0 + r.height * BAND_Y1,
        )
        target = fitz.Rect(LABEL_W, i * ROW_H + 2, LABEL_W + ROW_W, (i + 1) * ROW_H - 2)
        # get_pixmap honours page rotation; show_pdf_page's clip does not.
        pix = sp.get_pixmap(matrix=fitz.Matrix(4, 4), clip=clip, alpha=False)
        page.insert_image(target, pixmap=pix, keep_proportion=False)
        page.insert_text(
            fitz.Point(4, i * ROW_H + ROW_H * 0.65), "%d" % pno, fontsize=13
        )
        page.draw_line(
            fitz.Point(0, (i + 1) * ROW_H), fitz.Point(LABEL_W + ROW_W, (i + 1) * ROW_H),
            width=0.4,
        )
    pix = page.get_pixmap(matrix=fitz.Matrix(3.2, 3.2), alpha=False)
    pix.save(out)
    print(out, pix.width, pix.height)


if __name__ == "__main__":
    main()
