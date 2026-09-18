#!/usr/bin/env python3
"""Derive the scan-page <-> book-page <-> lesson map and the worker chunking.

The spread numbering was read off the printed page-number boxes (see
scripts/page_number_sheet.py). It is regular apart from one gap: the spread
holding book pages 46-47 is absent from the scan.

    scan n in  1..17  -> right page 2n+10, left page 2n+11   (book 12..45)
    scan n in 18..100 -> right page 2n+12, left page 2n+13   (book 48..213)

Lesson start pages come from the printed Contents on book pages 210-213.
Writes .work/pagemap/map.json.
"""
import json
import os

# Transcribed verbatim from the printed Contents on book pages 210-213
# (re-read at high zoom). English wording and capitalisation are the book's
# own. Where the index gives only the Arabic particles/pronouns a lesson
# teaches, they are listed here in logical (right-to-left) reading order.
# (lesson id, topic as printed in the index, first book page)
LESSONS = [
    (1, u"(هذا) (ما هذا؟) (من هذا؟)", 12),
    (2, u"(هذه) (ماهذه؟) (من هذه؟)", 15),
    (3, u"(هذا) (ذاك) (هذه) (تلك)", 18),
    (4, u"(أنا) (أنتَ) (هو) (أنا) (أنتِ) (هي)", 21),
    (5, u"(كَ) (ي) (كِ) (ي)", 24),
    (6, u"Dictation and laws of Dictation", 27),
    (7, u"(ها) (ه) Absent pronouns", 29),
    (8, u"Debate", 32),
    (9, u"(في) (على) (فوق) (تحت)", 34),
    (10, u"(هٰذان) (هاتان)", 36),
    (11, u"(أنا) (نحن) (أنت) (أنتما)", 39),
    (12, u"Dictation and laws of Dictation", 42),
    (13, u"Singular, Dual, Plural", 44),
    (14, u"(أنتما) (نحن) (هو) (هما)", 47),
    (15, u"(أنتم) (نحن) (هم) (هن)", 49),
    (16, u"Big, Small and Average", 51),
    (17, u"Long, short and average", 54),
    (18, u"Dictation and laws of Dictation", 57),
    (19, u"Colours", 59),
    (20, u"Plants and animals", 61),
    (21, u"(عند) (بين) (أمام) (وراء)", 64),
    (22, u"Close and Far", 67),
    (23, u"Fi'l Mudaari, Singular Masculine", 69),
    (24, u"Dictation and laws of Dictation", 72),
    (25, u"Fi'l Mudaari, Female singular", 75),
    (26, u"Fi'l Mudaari, masculine singular", 78),
    (27, u"Fi'l Mudaari, Feminine", 81),
    (28, u"Letter, masculine", 83),
    (29, u"Letter, feminine", 86),
    (30, u"Dictation and laws of Dictation", 89),
    (31, u"Fi'l Maadi, masculine singular", 91),
    (32, u"Fi'l Maadi, feminine singular", 93),
    (33, u"Fi'l Mudaari, masculine", 96),
    (34, u"Fi'l Mudaari, feminine", 99),
    (35, u"Fi'l Maadi, masculine", 101),
    (36, u"Dictation and laws of dictation", 104),
    (37, u"Fi'l Maadi, feminine", 106),
    (38, u"The student in Madrasah", 108),
    (39, u"Two students in Madrasah", 111),
    (40, u"the Students in Madrasah", 113),
    (41, u"Dictation and laws of dictation", 116),
    (42, u"Fi'l Maadi, The Student", 118),
    (43, u"Fi'l Maadi, the two Students", 121),
    (44, u"Fi'l Maadi, the Students", 123),
    (45, u"The female student in Madrasah", 126),
    (46, u"Two female students in Madrasah", 128),
    (47, u"The female students in Madrasah", 130),
    (48, u"Dictation and laws of Dictation", 134),
    (49, u"Fi'l Maadi, the female student", 136),
    (50, u"Fi'l Maadi, the two female students", 139),
    (51, u"Fi'l Maadi, the female students", 141),
    (52, u"Walking in the garden", 145),
    (53, u"Dictation and laws of Dictation", 148),
    (54, u"Counting from 1 to 10", 150),
    (55, u"Counting, feminine", 152),
    (56, u"Counting from 11 to 20", 155),
    (57, u"Counting, feminine Tameez", 158),
    (58, u"Counting from 21 to 30", 161),
    (59, u"Counting, feminine Tameez", 164),
    (60, u"Counting in tens", 166),
    (61, u"Counting in tens", 168),
    (62, u"Counting in hundreds and the movement of numbers", 170),
    (63, u"Dictation and laws of Dictation", 174),
    (64, u"Time", 176),
    (65, u"Days of the week", 180),
    (66, u"Months of the year", 183),
    (67, u"Dictation and laws of Dictation", 185),
    (68, u"family", 187),
    (69, u"letter of permission", 191),
    (70, u"Letter to the Father", 194),
    (71, u"Letter to the Brother", 197),
    (72, u"The well-mannered student", 200),
    (73, u"Bravery of the child", 202),
    (74, u"Wisdom and advice", 204),
    (75, u"Du'aa'", 206),
]

LAST_CONTENT_PAGE = 207  # book pages 208+ are appendices / contents
N_SCANS = 100


def scan_pages():
    """scan number -> {'left': book page, 'right': book page}"""
    out = {}
    for n in range(1, N_SCANS + 1):
        base = 10 if n <= 17 else 12
        out[n] = {"right": 2 * n + base, "left": 2 * n + base + 1}
    return out


def book_to_scan(spreads):
    idx = {}
    for n, d in spreads.items():
        idx[d["left"]] = (n, "L")
        idx[d["right"]] = (n, "R")
    return idx


def main():
    spreads = scan_pages()
    b2s = book_to_scan(spreads)
    lessons = []
    for i, (lid, topic, start) in enumerate(LESSONS):
        end = LESSONS[i + 1][2] - 1 if i + 1 < len(LESSONS) else LAST_CONTENT_PAGE
        book_pages = list(range(start, end + 1))
        scans, missing = [], []
        for b in book_pages:
            if b in b2s:
                n = b2s[b][0]
                if n not in scans:
                    scans.append(n)
            else:
                missing.append(b)
        lessons.append(
            {
                "id": lid,
                "topicEn": topic,
                "bookPages": book_pages,
                "scanPages": scans,
                "missingBookPages": missing,
            }
        )

    out = {
        "spreads": {str(k): v for k, v in spreads.items()},
        "missingBookPages": [46, 47],
        "lessons": lessons,
    }
    os.makedirs(".work/pagemap", exist_ok=True)
    with open(".work/pagemap/map.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    for L in lessons:
        print(
            "L%-3d book %-10s scans %-12s %s"
            % (
                L["id"],
                "%d-%d" % (L["bookPages"][0], L["bookPages"][-1]),
                ",".join(str(s) for s in L["scanPages"]),
                "MISSING %s" % L["missingBookPages"] if L["missingBookPages"] else "",
            )
        )


if __name__ == "__main__":
    main()
