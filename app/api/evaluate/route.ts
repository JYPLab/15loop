import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { dailyWords } from "../../../data/words";
import { getOptionalParent } from "../../../lib/auth";
import { guardianHasAccess } from "../../../lib/commercial";

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

function usageDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeAiAllowance(request: NextRequest, learnerId: string) {
  const [{ getDb }, schema] = await Promise.all([import("../../../db"), import("../../../db/schema")]);
  const db = getDb();
  let actorType = "guest";
  let actorId = "";
  let limit = 2;

  if (/^child-[0-9a-f-]{36}$/i.test(learnerId)) {
    const parent = await getOptionalParent(request);
    if (!parent) return false;
    const [ownership] = await db.select().from(schema.guardianLearners).where(and(
      eq(schema.guardianLearners.guardianId, parent.id),
      eq(schema.guardianLearners.learnerId, learnerId),
    )).limit(1);
    const [account] = await db.select().from(schema.guardianAccounts)
      .where(eq(schema.guardianAccounts.id, parent.id)).limit(1);
    if (!ownership || !account || !guardianHasAccess(account)) return false;
    actorType = "guardian";
    actorId = parent.id;
    limit = 200;
  } else if (/^learner-[0-9a-f-]{36}$/i.test(learnerId)) {
    const clientIp = request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    actorId = await sha256(clientIp);
  } else {
    return false;
  }

  const date = usageDate();
  const id = `${date}:${actorType}:${actorId}`;
  const [usage] = await db.insert(schema.aiEvaluationUsage).values({ id, actorType, usageDate: date })
    .onConflictDoUpdate({
      target: schema.aiEvaluationUsage.id,
      set: {
        requestCount: sql`${schema.aiEvaluationUsage.requestCount} + 1`,
        updatedAt: new Date().toISOString(),
      },
    }).returning({ requestCount: schema.aiEvaluationUsage.requestCount });
  return usage.requestCount <= limit;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as EvaluationRequest;
  const submittedTarget = body.target?.trim() ?? "";
  const answer = body.answer?.trim() ?? "";
  const learnerId = body.learnerId?.trim() ?? "";

  if (!submittedTarget || !answer) {
    return NextResponse.json({ error: "target and answer are required" }, { status: 400 });
  }

  if (submittedTarget.length > 300 || answer.length > 500) {
    return NextResponse.json({ error: "evaluation input is too long" }, { status: 400 });
  }

  const curriculumItem = dailyWords.find((item) => normalize(item.example) === normalize(submittedTarget));
  if (!curriculumItem) {
    return NextResponse.json({ error: "only LoopVoca curriculum items can be evaluated" }, { status: 400 });
  }
  const target = curriculumItem.example;
  const meaning = curriculumItem.contextKo;
  const word = curriculumItem.word;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json(localEvaluation(target, answer));

  try {
    const allowed = await consumeAiAllowance(request, learnerId);
    if (!allowed) return NextResponse.json({ ...localEvaluation(target, answer), limited: true });
  } catch {
    return NextResponse.json({ ...localEvaluation(target, answer), limited: true });
  }

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
