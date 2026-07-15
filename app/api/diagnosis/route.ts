import { commercialRouteError, getCommercialStorage } from "../../../lib/commercial";

type DiagnosticAnswer = {
  wordId: string;
  skill: "see" | "hear" | "context" | "recall";
  correct: boolean;
  responseMs: number;
};

type DiagnosticRequest = {
  sessionId?: string;
  guestLearnerId?: string;
  answers?: DiagnosticAnswer[];
  scores?: Partial<Record<"see" | "hear" | "context" | "recall", number>>;
  recommendedLevel?: string;
  completedAt?: string;
};

function validScore(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100;
}

export async function POST(request: Request) {
  const body = (await request.json()) as DiagnosticRequest;
  const sessionId = body.sessionId?.trim() ?? "";
  const guestLearnerId = body.guestLearnerId?.trim() ?? "";
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const scores = body.scores ?? {};

  const validAnswers = answers.length >= 20 && answers.length <= 25 && answers.every((answer) => (
    typeof answer.wordId === "string" &&
    ["see", "hear", "context", "recall"].includes(answer.skill) &&
    typeof answer.correct === "boolean" &&
    Number.isFinite(answer.responseMs) && answer.responseMs >= 0 && answer.responseMs <= 300_000
  ));

  if (
    !/^diag-[0-9a-f-]{36}$/i.test(sessionId) ||
    !/^learner-[0-9a-f-]{36}$/i.test(guestLearnerId) ||
    !validAnswers ||
    !validScore(scores.see) ||
    !validScore(scores.hear) ||
    !validScore(scores.context) ||
    !validScore(scores.recall)
  ) {
    return Response.json({ error: "유효한 진단 결과가 필요합니다." }, { status: 400 });
  }

  const recommendedLevel = String(body.recommendedLevel || "foundation").slice(0, 40);
  const completedAt = body.completedAt && !Number.isNaN(Date.parse(body.completedAt))
    ? new Date(body.completedAt).toISOString()
    : new Date().toISOString();

  try {
    const { db, schema } = await getCommercialStorage();
    await db.insert(schema.diagnosticSessions).values({
      id: sessionId,
      guestLearnerId,
      itemCount: answers.length,
      answersJson: JSON.stringify(answers),
      seeScore: Number(scores.see),
      hearScore: Number(scores.hear),
      contextScore: Number(scores.context),
      recallScore: Number(scores.recall),
      recommendedLevel,
      completedAt,
    }).onConflictDoUpdate({
      target: schema.diagnosticSessions.id,
      set: {
        itemCount: answers.length,
        answersJson: JSON.stringify(answers),
        seeScore: Number(scores.see),
        hearScore: Number(scores.hear),
        contextScore: Number(scores.context),
        recallScore: Number(scores.recall),
        recommendedLevel,
        completedAt,
      },
    });
    return Response.json({ saved: true, sessionId });
  } catch (error) {
    return commercialRouteError(error);
  }
}
