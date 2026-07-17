"""Extract the three-column national curriculum word list in reading order."""

from __future__ import annotations

import sys
from pathlib import Path

import pdfplumber


COLUMN_BOUNDARIES = (215.0, 360.0)
FIRST_WORD_PAGE = 6  # zero-based PDF page index
LAST_WORD_PAGE = 35


def column_index(x0: float) -> int:
    if x0 < COLUMN_BOUNDARIES[0]:
        return 0
    if x0 < COLUMN_BOUNDARIES[1]:
        return 1
    return 2


def lines_for_column(words: list[dict]) -> list[str]:
    rows: list[list[dict]] = []

    for word in sorted(words, key=lambda item: (float(item["top"]), float(item["x0"]))):
        if not rows or abs(float(rows[-1][0]["top"]) - float(word["top"])) > 2.0:
            rows.append([word])
        else:
            rows[-1].append(word)

    return [
        " ".join(str(word["text"]) for word in sorted(row, key=lambda item: float(item["x0"]))).strip()
        for row in rows
    ]


def extract_words(pdf_path: Path) -> str:
    extracted_lines: list[str] = ["기본 어휘 목록"]

    with pdfplumber.open(pdf_path) as pdf:
        for page_index in range(FIRST_WORD_PAGE, LAST_WORD_PAGE + 1):
            page = pdf.pages[page_index]
            minimum_top = 140.0 if page_index == FIRST_WORD_PAGE else 80.0
            columns: list[list[dict]] = [[], [], []]

            for word in page.extract_words(x_tolerance=1, y_tolerance=2):
                top = float(word["top"])
                if top < minimum_top or top > 780.0:
                    continue
                columns[column_index(float(word["x0"]))].append(word)

            for column in columns:
                extracted_lines.extend(lines_for_column(column))

    extracted_lines.append("II. 기본 어휘 관련 지침 개정 내용")
    return "\n".join(extracted_lines)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract-korean-curriculum-pdf.py INPUT.pdf OUTPUT.txt")

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    output_path.write_text(extract_words(input_path), encoding="utf-8")


if __name__ == "__main__":
    main()
