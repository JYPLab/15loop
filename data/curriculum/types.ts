export type CurriculumTier = "elementary" | "secondary-common" | "advanced";

export type CurriculumWord = {
  index: number;
  lemma: string;
  aliases: string[];
  relatedForms: string[];
  tier: CurriculumTier;
  marker: "*" | "**" | "";
  raw: string;
  sourceId: "ko-2022-basic-english";
};

export type CurriculumWordDataset = {
  metadata: {
    curriculum: "2022-revised";
    country: "KR";
    language: "en";
    sourceId: "ko-2022-basic-english";
    sourceUrl: string;
    generatedAt: string;
    counts: Record<CurriculumTier | "total", number>;
  };
  words: CurriculumWord[];
};
