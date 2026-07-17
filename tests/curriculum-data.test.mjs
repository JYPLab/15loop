import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const curriculumUrl = new URL("../data/curriculum/ko-2022-basic-words.json", import.meta.url);
const candidateWordsUrl = new URL("../data/catalog/middle-school-core-words-300.json", import.meta.url);
const candidateExpressionsUrl = new URL("../data/catalog/middle-school-daily-expressions-100.json", import.meta.url);

test("ships the complete 2022 revised national curriculum vocabulary list", async () => {
  const dataset = JSON.parse(await readFile(curriculumUrl, "utf8"));
  const { counts } = dataset.metadata;

  assert.deepEqual(counts, {
    total: 3000,
    elementary: 800,
    "secondary-common": 1200,
    advanced: 1000,
  });
  assert.equal(dataset.words.length, 3000);
  assert.equal(dataset.words[0].lemma, "a");
  assert.equal(dataset.words.at(-1).lemma, "zoo");
  assert.equal(new Set(dataset.words.map((word) => word.lemma)).size, 3000);
  assert.equal(dataset.words.every((word, index) => word.index === index + 1), true);
});

test("keeps the existing learner-facing words inside the curriculum base", async () => {
  const [dataset, currentWordsSource] = await Promise.all([
    readFile(curriculumUrl, "utf8").then(JSON.parse),
    readFile(new URL("../data/words.ts", import.meta.url), "utf8"),
  ]);
  const curriculumForms = new Set(dataset.words.flatMap((word) => [
    word.lemma,
    ...word.aliases,
    ...word.relatedForms,
  ]));
  const currentWords = [...currentWordsSource.matchAll(/\n    word: "([a-z-]+)"/g)]
    .map((match) => match[1]);

  assert.equal(currentWords.length, 30);
  assert.deepEqual(currentWords.filter((word) => !curriculumForms.has(word)), []);
});

test("keeps all 300 middle-school word candidates inside the official secondary-common tier", async () => {
  const [curriculum, candidates] = await Promise.all([
    readFile(curriculumUrl, "utf8").then(JSON.parse),
    readFile(candidateWordsUrl, "utf8").then(JSON.parse),
  ]);
  const secondaryCommon = new Map(
    curriculum.words
      .filter((word) => word.tier === "secondary-common" && word.marker === "**")
      .map((word) => [word.lemma, word.index]),
  );

  assert.equal(candidates.metadata.phase, "candidate-selection-only");
  assert.equal(candidates.items.length, 300);
  assert.equal(new Set(candidates.items.map((item) => item.id)).size, 300);
  assert.equal(new Set(candidates.items.map((item) => item.canonicalForm)).size, 300);
  assert.equal(candidates.items.every((item) => (
    item.category === "core_word"
    && item.curriculumTier === "secondary-common"
    && item.officialMarker === "**"
    && secondaryCommon.get(item.canonicalForm) === item.officialIndex
  )), true);
});

test("keeps 100 expression candidates separated from the official curriculum tier", async () => {
  const dataset = JSON.parse(await readFile(candidateExpressionsUrl, "utf8"));
  const categoryCounts = Object.fromEntries(
    ["communicative_pattern", "phrasal_verb", "collocation", "idiom"]
      .map((category) => [
        category,
        dataset.items.filter((item) => item.category === category).length,
      ]),
  );

  assert.equal(dataset.metadata.phase, "candidate-selection-only");
  assert.equal(dataset.items.length, 100);
  assert.equal(new Set(dataset.items.map((item) => item.id)).size, 100);
  assert.equal(new Set(dataset.items.map((item) => item.canonicalForm)).size, 100);
  assert.deepEqual(categoryCounts, {
    communicative_pattern: 40,
    phrasal_verb: 25,
    collocation: 25,
    idiom: 10,
  });
  assert.equal(dataset.items.every((item) => (
    item.curriculumTier === "expression-extension-not-official-tier"
  )), true);
});
