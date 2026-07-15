import { NextRequest, NextResponse } from "next/server";

type EvaluationRequest = {
  learnerId?: string;
  word?: string;
  target?: string;
  answer?: string;
  meaning?: string;
  locale?: "ko" | "en";
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function localEvaluation(target: string, answer: string) {
  const targetNormalized = normalize(target);
  const answerNormalized = normalize(answer);
  const exact = targetNormalized === answerNormalized;
  const targetTokens = targetNormalized.split(" ");
  const answerTokens = new Set(answerNormalized.split(" "));
  const tokenCoverage = targetTokens.filter((token) => answerTokens.has(token)).length / targetTokens.length;
  const correct = exact || tokenCoverage >= 0.9;

  return {
    correct,
    score: exact ? 98 : correct ? 86 : Math.max(25, Math.round(tokenCoverage * 72)),
    feedbackKo: correct
      ? "의미와 핵심 문장을 정확하게 꺼냈어요."
      : "의미는 연결되고 있어요. 빠진 단어를 확인하고 문장 전체를 다시 꺼내 보세요.",
    feedbackEn: correct
      ? "You retrieved both the meaning and the full sentence accurately."
      : "The meaning is connecting. Check the missing words and retrieve the full sentence again.",
    errorType: correct ? "none" : tokenCoverage >= 0.55 ? "missing_words" : "meaning_gap",
    canonicalAnswer: target,
    source: "local-fallback" as const,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as EvaluationRequest;
  const target = body.target?.trim() ?? "";
  const answer = body.answer?.trim() ?? "";
  const meaning = body.meaning?.trim() ?? "";
  const word = body.word?.trim() ?? "";

  if (!target || !answer) {
    return NextResponse.json({ error: "target and answer are required" }, { status: 400 });
  }

  if (target.length > 300 || answer.length > 500 || meaning.length > 300) {
    return NextResponse.json({ error: "evaluation input is too long" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json(localEvaluation(target, answer));

  const model = process.env.OPENAI_MODEL ?? "gpt-5.6";

  try {
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
        max_output_tokens: 450,
        instructions: [
          "You are LoopVoca's English recall evaluator for a Korean middle-school learner.",
          "Evaluate whether the learner preserved the target meaning and produced a natural sentence.",
          "Ignore capitalization and punctuation. Accept harmless article or contraction variations when meaning is intact.",
          "Be strict about a missing target word or a changed core meaning.",
          "Return encouraging, specific feedback in both Korean and English. Never request personal information.",
        ].join(" "),
        input: [
          `Target word: ${word}`,
          `Korean learning context: ${meaning}`,
          `Canonical English: ${target}`,
          `Learner answer: ${answer}`,
        ].join("\n"),
        text: {
          format: {
            type: "json_schema",
            name: "loopvoca_recall_evaluation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                correct: { type: "boolean" },
                score: { type: "integer", minimum: 0, maximum: 100 },
                feedbackKo: { type: "string" },
                feedbackEn: { type: "string" },
                errorType: {
                  type: "string",
                  enum: ["none", "spelling", "grammar", "missing_words", "meaning_gap"],
                },
                canonicalAnswer: { type: "string" },
              },
              required: ["correct", "score", "feedbackKo", "feedbackEn", "errorType", "canonicalAnswer"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) return NextResponse.json(localEvaluation(target, answer));

    const data = (await response.json()) as {
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const outputText = data.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")
      ?.text;

    if (!outputText) return NextResponse.json(localEvaluation(target, answer));

    return NextResponse.json({
      ...JSON.parse(outputText),
      source: "openai",
      model,
    });
  } catch {
    return NextResponse.json(localEvaluation(target, answer));
  }
}
