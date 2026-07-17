import type { CatalogEntry } from "../data/catalog/types";

export type GeneratedLearningContent = {
  canonicalForm: string;
  itemType: "word" | "expression";
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other";
  pronunciationGuide: string;
  meaningKo: string;
  definitionEn: string;
  exampleEn: string;
  exampleKo: string;
  contextKo: string;
  contextEn: string;
  distractorsKo: string[];
  distractorsEn: string[];
};

type ValidationCheck = { code: string; passed: boolean; message: string };

export const contentPromptVersion = "middle-school-content-v1";

export const generatedContentSchema = {
  type: "object",
  properties: {
    canonicalForm: { type: "string", minLength: 1, maxLength: 120 },
    itemType: { type: "string", enum: ["word", "expression"] },
    partOfSpeech: {
      type: "string",
      enum: ["noun", "verb", "adjective", "adverb", "phrase", "other"],
    },
    pronunciationGuide: { type: "string", minLength: 1, maxLength: 160 },
    meaningKo: { type: "string", minLength: 1, maxLength: 120 },
    definitionEn: { type: "string", minLength: 1, maxLength: 220 },
    exampleEn: { type: "string", minLength: 1, maxLength: 220 },
    exampleKo: { type: "string", minLength: 1, maxLength: 220 },
    contextKo: { type: "string", minLength: 1, maxLength: 180 },
    contextEn: { type: "string", minLength: 1, maxLength: 180 },
    distractorsKo: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 100 },
    },
    distractorsEn: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 140 },
    },
  },
  required: [
    "canonicalForm",
    "itemType",
    "partOfSpeech",
    "pronunciationGuide",
    "meaningKo",
    "definitionEn",
    "exampleEn",
    "exampleKo",
    "contextKo",
    "contextEn",
    "distractorsKo",
    "distractorsEn",
  ],
  additionalProperties: false,
} as const;

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const hasKorean = (value: string) => /[가-힣]/.test(value);
const hasEnglish = (value: string) => /[a-z]/i.test(value);
const hasUrl = (value: string) => /https?:\/\/|www\./i.test(value);

function stringCheck(code: string, value: unknown, min: number, max: number): ValidationCheck {
  const valid = typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
  return { code, passed: valid, message: valid ? "ok" : `must be ${min}-${max} characters` };
}

export function validateGeneratedContent(entry: CatalogEntry, value: GeneratedLearningContent) {
  const expectedType = entry.category === "core_word" ? "word" : "expression";
  const checks: ValidationCheck[] = [
    {
      code: "canonical_form",
      passed: normalize(value.canonicalForm) === normalize(entry.canonicalForm),
      message: "canonical form must match the selected catalog entry",
    },
    {
      code: "item_type",
      passed: value.itemType === expectedType,
      message: `item type must be ${expectedType}`,
    },
    stringCheck("pronunciation", value.pronunciationGuide, 1, 160),
    stringCheck("meaning_ko", value.meaningKo, 1, 120),
    stringCheck("definition_en", value.definitionEn, 1, 220),
    stringCheck("example_en", value.exampleEn, 1, 220),
    stringCheck("example_ko", value.exampleKo, 1, 220),
    stringCheck("context_ko", value.contextKo, 1, 180),
    stringCheck("context_en", value.contextEn, 1, 180),
    {
      code: "korean_fields",
      passed: [value.meaningKo, value.exampleKo, value.contextKo].every(hasKorean),
      message: "Korean learning fields must contain Korean text",
    },
    {
      code: "english_fields",
      passed: [value.definitionEn, value.exampleEn, value.contextEn].every(hasEnglish),
      message: "English learning fields must contain English text",
    },
    {
      code: "distractor_counts",
      passed: value.distractorsKo?.length === 3 && value.distractorsEn?.length === 3,
      message: "exactly three Korean and three English distractors are required",
    },
    {
      code: "distractor_uniqueness",
      passed: new Set(value.distractorsKo?.map(normalize)).size === 3
        && new Set(value.distractorsEn?.map(normalize)).size === 3,
      message: "distractors must be unique",
    },
    {
      code: "no_urls",
      passed: !Object.values(value).flat().some((item) => typeof item === "string" && hasUrl(item)),
      message: "generated learning content must not contain URLs",
    },
    {
      code: "filled_expression_frame",
      passed: expectedType === "word" || !/[\[\]]/.test(value.exampleEn),
      message: "expression examples must replace template placeholders",
    },
  ];

  return { passed: checks.every((check) => check.passed), checks };
}

export async function generateLearningContent(entry: CatalogEntry) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const model = process.env.OPENAI_CONTENT_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.6";
  const itemType = entry.category === "core_word" ? "word" : "expression";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 1200,
      instructions: [
        "You create original English learning drafts for Korean middle-school students.",
        "Return only the requested structured content for one item and one common sense.",
        "Use short, natural, age-appropriate language and an ordinary school or daily-life context.",
        "Do not quote or imitate textbooks, tests, dictionaries, publishers, or third-party examples.",
        "Do not include personal data, URLs, brands, violence, sexual content, or risky instructions.",
        "Korean fields must be natural Korean; English fields must be natural English.",
        "Distractors must be plausible but clearly incorrect and distinct from one another.",
        "For an expression template, replace every bracketed placeholder in the example.",
        "This is a draft for human review, never a publication decision.",
      ].join(" "),
      input: [
        `Catalog ID: ${entry.id}`,
        `Item type: ${itemType}`,
        `Category: ${entry.category}`,
        `Canonical form: ${entry.canonicalForm}`,
        `Grade band: ${entry.gradeBand}`,
        `Function hint: ${"functionTag" in entry ? entry.functionTag : "general vocabulary"}`,
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "fifteenloop_learning_content_draft",
          strict: true,
          schema: generatedContentSchema,
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`OpenAI content generation failed (${response.status})`);
  const data = (await response.json()) as {
    output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
  };
  const content = data.output?.flatMap((item) => item.content ?? []) ?? [];
  const refusal = content.find((item) => item.type === "refusal")?.refusal;
  if (refusal) throw new Error("OpenAI declined to generate this learning draft");
  const outputText = content.find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("OpenAI returned no structured learning draft");

  const generated = JSON.parse(outputText) as GeneratedLearningContent;
  return { generated, model, validation: validateGeneratedContent(entry, generated) };
}
