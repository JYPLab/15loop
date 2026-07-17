import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const curriculumUrl = new URL("../data/curriculum/ko-2022-basic-words.json", import.meta.url);

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
