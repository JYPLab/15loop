import type { VocaWord } from "../data/words";

export type VerifiableChoiceSkill = "see" | "hear" | "context";

function normalizedChoice(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

export function evaluateChoice(input: {
  word: VocaWord;
  skill: VerifiableChoiceSkill;
  locale: "ko" | "en";
  answer: string;
}) {
  const expected = input.skill === "see"
    ? (input.locale === "ko" ? input.word.meaningKo : input.word.definitionEn)
    : input.skill === "context"
      ? input.word.contextChoices[0]
      : input.word.word;
  const correct = normalizedChoice(input.answer) === normalizedChoice(expected);
  return { correct, score: correct ? 92 : 42 };
}

export function allowedHeartbeatSeconds(input: {
  requestedSeconds: number;
  lastHeartbeatAt: string | null;
  now: Date;
  firstHeartbeatLimit?: number;
  clockGraceSeconds?: number;
}) {
  const firstHeartbeatLimit = input.firstHeartbeatLimit ?? 30;
  const clockGraceSeconds = input.clockGraceSeconds ?? 0;
  const lastHeartbeatMs = input.lastHeartbeatAt ? Date.parse(input.lastHeartbeatAt) : Number.NaN;
  const elapsedSeconds = Number.isFinite(lastHeartbeatMs)
    ? Math.max(0, Math.floor((input.now.getTime() - lastHeartbeatMs) / 1000))
    : firstHeartbeatLimit;
  return Math.max(0, Math.min(
    60,
    input.requestedSeconds,
    elapsedSeconds + (Number.isFinite(lastHeartbeatMs) ? clockGraceSeconds : 0),
  ));
}
