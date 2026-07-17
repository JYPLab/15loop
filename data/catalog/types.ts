export type ContentReviewStatus = "candidate" | "reviewed" | "published" | "rejected";

export type CatalogCategory =
  | "core_word"
  | "communicative_pattern"
  | "phrasal_verb"
  | "collocation"
  | "idiom";

type CatalogCandidateBase = {
  id: string;
  category: CatalogCategory;
  canonicalForm: string;
  gradeBand: "KR-middle-school-1-3";
  curriculumTier: "secondary-common" | "expression-extension-not-official-tier";
  sourceBasis: string[];
  selectionReason: string;
  licenseStatus: string;
};

export type CoreWordCandidate = CatalogCandidateBase & {
  category: "core_word";
  curriculumTier: "secondary-common";
  officialIndex: number;
  officialMarker: "**";
  betaPriority: number;
};

export type ExpressionCandidate = CatalogCandidateBase & {
  category: Exclude<CatalogCategory, "core_word">;
  curriculumTier: "expression-extension-not-official-tier";
  functionTag: string;
};

export type CatalogCandidate = CoreWordCandidate | ExpressionCandidate;

export type CatalogEntry = CatalogCandidate & {
  reviewStatus: ContentReviewStatus;
};

export type CandidateDataset<T extends CatalogCandidate> = {
  metadata: Record<string, unknown> & {
    phase: "candidate-selection-only";
    count: number;
  };
  items: T[];
};
