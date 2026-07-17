import assert from "node:assert/strict";
import test from "node:test";
import { validateGeneratedContent } from "../lib/content-pipeline.ts";

const entry = {
  id: "msw-001",
  category: "core_word",
  canonicalForm: "accept",
  gradeBand: "KR-middle-school-1-3",
  curriculumTier: "secondary-common",
  sourceBasis: ["ko-2022-basic-english"],
  selectionReason: "test",
  licenseStatus: "review-required",
  officialIndex: 19,
  officialMarker: "**",
  betaPriority: 1,
  reviewStatus: "candidate",
};

const validContent = {
  canonicalForm: "accept",
  itemType: "word",
  partOfSpeech: "verb",
  pronunciationGuide: "/əkˈsept/",
  meaningKo: "받아들이다",
  definitionEn: "to agree to receive or allow something",
  exampleEn: "I accept your kind invitation.",
  exampleKo: "나는 너의 친절한 초대를 받아들인다.",
  contextKo: "친구의 초대를 기쁘게 받아들이는 상황",
  contextEn: "Agreeing to a friend's invitation",
  distractorsKo: ["거절하다", "연습하다", "발견하다"],
  distractorsEn: ["to refuse something", "to repeat for practice", "to find something new"],
};

test("accepts a complete original learning-content draft", () => {
  const result = validateGeneratedContent(entry, validContent);
  assert.equal(result.passed, true);
  assert.equal(result.checks.every((check) => check.passed), true);
});

test("blocks a draft with the wrong item, duplicate distractors, and a URL", () => {
  const result = validateGeneratedContent(entry, {
    ...validContent,
    canonicalForm: "allow",
    distractorsKo: ["거절하다", "거절하다", "거절하다"],
    contextEn: "Read https://example.com",
  });
  assert.equal(result.passed, false);
  const failed = result.checks.filter((check) => !check.passed).map((check) => check.code);
  assert.equal(failed.includes("canonical_form"), true);
  assert.equal(failed.includes("distractor_uniqueness"), true);
  assert.equal(failed.includes("no_urls"), true);
});
