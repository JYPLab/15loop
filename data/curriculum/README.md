# Korean national English curriculum data

This directory contains source metadata and generated data for the official
2022 revised Korean national English curriculum vocabulary list.

## Source boundary

- Import only the official 3,000 headwords, their official `*` / `**` tier
  markers, aliases, and parenthesized related forms.
- Do not copy textbook definitions, example sentences, exercises, ordering, or
  publisher-specific annotations.
- LoopVoca meanings, examples, distractors, audio, and assessment content must
  be authored and reviewed separately.

## Generate the base dataset

The importer downloads the official PDF, reconstructs its three-column word
list with Python and `pdfplumber`, and refuses to write output unless all
official totals match:

- 800 elementary (`*`)
- 1,200 middle/high common (`**`)
- 1,000 advanced (unmarked)
- 3,000 total

```bash
python3 -m pip install pdfplumber
node scripts/import-korean-curriculum-words.mjs
```

Set `PYTHON=/path/to/python3` when `pdfplumber` is installed in a non-default
Python environment.

Generated output:

```text
data/curriculum/ko-2022-basic-words.json
```

The generated base list is curriculum coverage data, not yet learner-facing
content. Korean meanings, parts of speech, pronunciation, examples, and quiz
distractors require a separate enrichment and human-review phase.

## Runtime integration

The server-only catalog in `lib/curriculum.ts` indexes headwords, aliases, and
related forms without shipping the complete 3,000-word JSON file to the
learner's browser. `GET /api/curriculum` exposes official totals and the number
of learner-facing words that have completed content review.

The official list is a coverage map. A word must still have an authored Korean
meaning, pronunciation, example, distractors, and review status before it can
enter a learner's adaptive queue.
