import { NextRequest, NextResponse } from "next/server";

type EvaluationRequest = {
  target?: string;
  answer?: string;
  meaning?: string;
};

function localEvaluation(target: string, answer: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  const correct = normalize(target) === normalize(answer);
  return {
    correct,
    score: correct ? 96 : 48,
    feedback: correct
      ? "의미와 문장을 정확하게 꺼냈어요."
      : "핵심 표현 ‘Can I borrow…?’를 한 번 더 연결해 보세요.",
    source: "demo",
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as EvaluationRequest;
  const target = body.target?.trim() ?? "";
  const answer = body.answer?.trim() ?? "";
  const meaning = body.meaning?.trim() ?? "";

  if (!target || !answer) {
    return NextResponse.json({ error: "target and answer are required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json(localEvaluation(target, answer));

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
        instructions: "You evaluate beginner English recall for a Korean middle-school learner. Be encouraging, strict about meaning, tolerant of punctuation and capitalization, and concise.",
        input: `Korean meaning: ${meaning}\nTarget English: ${target}\nLearner answer: ${answer}`,
        text: {
          format: {
            type: "json_schema",
            name: "loopvoca_evaluation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                correct: { type: "boolean" },
                score: { type: "integer", minimum: 0, maximum: 100 },
                feedback: { type: "string" },
              },
              required: ["correct", "score", "feedback"],
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
    const text = data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) return NextResponse.json(localEvaluation(target, answer));

    return NextResponse.json({ ...JSON.parse(text), source: "openai" });
  } catch {
    return NextResponse.json(localEvaluation(target, answer));
  }
}
