import expressionJson from "../data/catalog/middle-school-daily-expressions-100.json";
import wordJson from "../data/catalog/middle-school-core-words-300.json";
import type {
  CatalogCategory,
  CatalogEntry,
  CandidateDataset,
  CoreWordCandidate,
  ExpressionCandidate,
} from "../data/catalog/types";

const wordDataset = wordJson as CandidateDataset<CoreWordCandidate>;
const expressionDataset = expressionJson as CandidateDataset<ExpressionCandidate>;

const entries: CatalogEntry[] = [...wordDataset.items, ...expressionDataset.items]
  .map((item) => ({ ...item, reviewStatus: "candidate" as const }));

const byId = new Map(entries.map((entry) => [entry.id, entry]));
const byCanonicalForm = new Map(
  entries.map((entry) => [entry.canonicalForm.trim().toLowerCase(), entry]),
);

const categoryCounts = entries.reduce<Record<CatalogCategory, number>>((counts, entry) => {
  counts[entry.category] += 1;
  return counts;
}, {
  core_word: 0,
  communicative_pattern: 0,
  phrasal_verb: 0,
  collocation: 0,
  idiom: 0,
});

export const contentCatalogSummary = {
  phase: "candidate-selection-only",
  counts: {
    total: entries.length,
    words: wordDataset.items.length,
    expressions: expressionDataset.items.length,
  },
  byCategory: categoryCounts,
  byReviewStatus: {
    candidate: entries.length,
    reviewed: 0,
    published: 0,
    rejected: 0,
  },
  learnerVisible: false,
  nextGate: "human-review-and-original-content-enrichment",
} as const;

export function listCatalogCandidates() {
  return entries;
}

export function findCatalogEntry(idOrForm: string) {
  const value = idOrForm.trim();
  return byId.get(value) ?? byCanonicalForm.get(value.toLowerCase()) ?? null;
}
