import curriculumJson from "../data/curriculum/ko-2022-basic-words.json";
import type {
  CurriculumTier,
  CurriculumWord,
  CurriculumWordDataset,
} from "../data/curriculum/types";

const curriculum = curriculumJson as CurriculumWordDataset;

const normalizedForm = (value: string) => value.trim().toLowerCase();

const curriculumByForm = new Map<string, CurriculumWord>();

for (const item of curriculum.words) {
  for (const form of [item.lemma, ...item.aliases, ...item.relatedForms]) {
    const normalized = normalizedForm(form);
    if (normalized && !curriculumByForm.has(normalized)) {
      curriculumByForm.set(normalized, item);
    }
  }
}

export const curriculumSummary = {
  curriculum: curriculum.metadata.curriculum,
  sourceId: curriculum.metadata.sourceId,
  sourceUrl: curriculum.metadata.sourceUrl,
  counts: curriculum.metadata.counts,
} as const;

export function findCurriculumWord(form: string) {
  return curriculumByForm.get(normalizedForm(form)) ?? null;
}

export function summarizeCurriculumCoverage(forms: string[]) {
  const byTier: Record<CurriculumTier, number> = {
    elementary: 0,
    "secondary-common": 0,
    advanced: 0,
  };
  const missing: string[] = [];

  for (const form of new Set(forms.map(normalizedForm).filter(Boolean))) {
    const match = findCurriculumWord(form);
    if (match) byTier[match.tier] += 1;
    else missing.push(form);
  }

  const matched = Object.values(byTier).reduce((sum, count) => sum + count, 0);
  return {
    total: matched + missing.length,
    matched,
    missing,
    byTier,
  };
}
