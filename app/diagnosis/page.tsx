"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dailyWords, type VocaWord } from "../../data/words";
import { speakEnglish } from "../../lib/speech";

type SkillKey = "see" | "hear" | "context" | "recall";
type Question = { word: VocaWord; skill: SkillKey };
type Answer = { wordId: string; skill: SkillKey; correct: boolean; responseMs: number };
type ScoreMap = Record<SkillKey, number>;
type Result = { sessionId: string; guestLearnerId: string; answers: Answer[]; scores: ScoreMap; level: string };

const skillOrder: SkillKey[] = ["see", "hear", "context", "recall"];
const labels: Record<SkillKey, string> = {
  see: "보고 의미 연결",
  hear: "듣고 단어 연결",
  context: "문맥에서 이해",
  recall: "뜻에서 직접 인출",
};

function speak(text: string) {
  speakEnglish(text);
}

function getGuestLearnerId() {
  const existing = window.localStorage.getItem("loopvoca-learner-id");
  if (existing) return existing;
  const created = `learner-${crypto.randomUUID()}`;
  window.localStorage.setItem("loopvoca-learner-id", created);
  return created;
}

function scoreAnswers(answers: Answer[]): ScoreMap {
  return skillOrder.reduce((scores, skill) => {
    const items = answers.filter((answer) => answer.skill === skill);
    scores[skill] = items.length
      ? Math.round((items.filter((answer) => answer.correct).length / items.length) * 100)
      : 0;
    return scores;
  }, { see: 0, hear: 0, context: 0, recall: 0 } as ScoreMap);
}

function levelFrom(scores: ScoreMap) {
  const overall = Math.round(skillOrder.reduce((sum, skill) => sum + scores[skill], 0) / skillOrder.length);
  if (overall < 45) return "foundation";
  if (overall < 75) return "developing";
  return "school-ready";
}

function choiceValues(question: Question) {
  if (question.skill === "see") return [question.word.meaningKo, ...question.word.distractorsKo];
  if (question.skill === "hear") return question.word.soundChoices;
  if (question.skill === "context") return question.word.contextChoices;
  return [];
}

function correctValue(question: Question) {
  if (question.skill === "see") return question.word.meaningKo;
  if (question.skill === "hear") return question.word.word;
  if (question.skill === "context") return question.word.contextChoices[0];
  return question.word.word;
}

export default function DiagnosisPage() {
  const [phase, setPhase] = useState<"intro" | "questions" | "result">("intro");
  const [questions, setQuestions] = useState<Question[]>(() => dailyWords.slice(0, 20).map((word, index) => ({
    word,
    skill: skillOrder[index % skillOrder.length],
  })));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState("");
  const [recall, setRecall] = useState("");
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [extended, setExtended] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState<"saving" | "saved" | "local">("saving");

  const question = questions[index];
  const choices = useMemo(() => {
    if (!question) return [];
    const values = choiceValues(question);
    const offset = index % values.length;
    return [...values.slice(offset), ...values.slice(0, offset)];
  }, [index, question]);
  const progress = Math.round(((index + (answered ? 1 : 0)) / questions.length) * 100);

  useEffect(() => {
    if (phase === "questions" && question?.skill === "hear" && !answered) {
      const timer = window.setTimeout(() => speak(question.word.word), 250);
      return () => window.clearTimeout(timer);
    }
  }, [answered, phase, question]);

  const persistResult = async (next: Result) => {
    window.localStorage.setItem(`loopvoca-diagnostic:${next.sessionId}`, JSON.stringify(next));
    window.localStorage.setItem("loopvoca-latest-diagnostic", next.sessionId);
    setSaved("saving");
    try {
      const response = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: next.sessionId,
          guestLearnerId: next.guestLearnerId,
          answers: next.answers,
          scores: next.scores,
          recommendedLevel: next.level,
          completedAt: new Date().toISOString(),
        }),
      });
      setSaved(response.ok ? "saved" : "local");
    } catch {
      setSaved("local");
    }
  };

  const finish = (nextAnswers: Answer[]) => {
    const scores = scoreAnswers(nextAnswers);
    const nextResult: Result = {
      sessionId: `diag-${crypto.randomUUID()}`,
      guestLearnerId: getGuestLearnerId(),
      answers: nextAnswers,
      scores,
      level: levelFrom(scores),
    };
    setResult(nextResult);
    setPhase("result");
    void persistResult(nextResult);
  };

  const submitAnswer = (value: string) => {
    if (!question || answered) return;
    const normalized = value.toLowerCase().replace(/[^a-z가-힣]/g, "");
    const target = correctValue(question).toLowerCase().replace(/[^a-z가-힣]/g, "");
    const correct = normalized === target;
    setSelected(value);
    setLastCorrect(correct);
    setAnswered(true);
    if (question.skill !== "see") speak(question.word.word);
  };

  const submitRecall = (event: FormEvent) => {
    event.preventDefault();
    if (recall.trim()) submitAnswer(recall.trim());
  };

  const advance = () => {
    if (!question) return;
    const nextAnswers = [...answers, {
      wordId: question.word.id,
      skill: question.skill,
      correct: lastCorrect,
      responseMs: Math.min(300_000, Math.max(0, Date.now() - startedAt)),
    }];
    setAnswers(nextAnswers);

    const reachedBaseEnd = index === 19 && questions.length === 20;
    if (reachedBaseEnd && !extended) {
      const scores = scoreAnswers(nextAnswers);
      const weakest = [...skillOrder].sort((a, b) => scores[a] - scores[b])[0];
      if (scores[weakest] <= 60) {
        const extra = dailyWords.slice(20, 25).map((word) => ({ word, skill: weakest }));
        setQuestions((current) => [...current, ...extra]);
        setExtended(true);
      } else {
        finish(nextAnswers);
        return;
      }
    } else if (index >= questions.length - 1) {
      finish(nextAnswers);
      return;
    }

    setIndex((current) => current + 1);
    setSelected("");
    setRecall("");
    setAnswered(false);
    setLastCorrect(false);
    setStartedAt(Date.now());
  };

  if (phase === "intro") {
    return (
      <main className="commerce-shell diagnosis-intro">
        <header className="commerce-topbar">
          <Link className="brand" href="/diagnosis"><span className="brand-mark">15</span><span>15LOOP</span></Link>
          <Link className="commerce-text-link" href="/parent">부모 로그인</Link>
        </header>
        <section className="diagnosis-hero">
          <span className="commerce-kicker">OPEN BETA · 초5·6 · 중1</span>
          <h1>단어를 외웠는지가 아니라,<br /><em>어디서 끊기는지</em> 확인해요.</h1>
          <p>초등 핵심부터 중1 과정까지, 교육부 2022 개정 기본 어휘 3,000개를 기준 지도로 사용합니다. 이번 베타 진단은 그중 뜻·발음·문장을 검수한 30단어에서 20~25개를 확인해요.</p>
          <div className="diagnosis-facts">
            <span><b>20~25</b> 단어</span><span><b>8~12</b> 분</span><span><b>가입 없이</b> 시작</span>
          </div>
          <button className="commerce-primary" onClick={() => {
            setPhase("questions");
            setStartedAt(Date.now());
          }}>무료 진단 시작 <span>→</span></button>
          <small>이 진단은 학교 성적을 예측하는 시험이 아니라 학습 연결을 찾는 도구입니다.</small>
        </section>
      </main>
    );
  }

  if (phase === "result" && result) {
    const weakest = [...skillOrder].sort((a, b) => result.scores[a] - result.scores[b])[0];
    const overall = Math.round(skillOrder.reduce((sum, skill) => sum + result.scores[skill], 0) / 4);
    return (
      <main className="commerce-shell">
        <header className="commerce-topbar">
          <Link className="brand" href="/diagnosis"><span className="brand-mark">15</span><span>15LOOP</span></Link>
          <span className="commerce-status">진단 완료</span>
        </header>
        <section className="diagnosis-result-grid">
          <article className="diagnosis-score-card">
            <span className="commerce-kicker">CONNECTION RESULT</span>
            <p className="diagnosis-big-score">{overall}</p>
            <h1>가장 먼저 보강할 연결은<br /><em>{labels[weakest]}</em>예요.</h1>
            <p>교육과정 3,000단어 지도에 연결된 {result.answers.length}단어의 실제 응답으로 다음 7일 학습의 우선순위를 만들었습니다.</p>
          </article>
          <aside className="diagnosis-report-card">
            <h2>영어 연결도</h2>
            {skillOrder.map((skill) => (
              <div className="diagnosis-skill" key={skill}>
                <div><span>{labels[skill]}</span><b>{result.scores[skill]}</b></div>
                <i><span style={{ width: `${result.scores[skill]}%` }} /></i>
              </div>
            ))}
            <div className="diagnosis-next-step">
              <b>다음 단계</b>
              <p>부모 계정에 결과를 연결하면 7일 동안 맞춤 학습과 변화 리포트를 이용할 수 있어요.</p>
            </div>
            <Link className="commerce-primary" href={`/parent?diagnostic=${encodeURIComponent(result.sessionId)}`}>부모에게 결과 연결 <span>→</span></Link>
            <small>{saved === "saved" ? "✓ 결과가 안전하게 저장됐어요." : saved === "local" ? "이 기기에 결과를 보관했어요." : "결과 저장 중…"}</small>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="commerce-shell diagnosis-session">
      <header className="commerce-topbar">
        <Link className="brand" href="/diagnosis"><span className="brand-mark">15</span><span>15LOOP</span></Link>
        <span className="commerce-status">{index + 1} / {questions.length}</span>
      </header>
      <div className="diagnosis-progress"><i style={{ width: `${progress}%` }} /></div>
      <section className="diagnosis-question-card">
        <div className="diagnosis-question-head">
          <span>{labels[question.skill]}</span>
          {extended && index >= 20 && <b>약한 연결 추가 확인</b>}
        </div>

        {question.skill === "see" && (
          <button className="diagnosis-word" onClick={() => speak(question.word.word)}>
            <small>{question.word.phonetic}</small><strong>{question.word.word}</strong><span>▶ 발음 듣기</span>
          </button>
        )}
        {question.skill === "hear" && (
          <button className="diagnosis-audio" onClick={() => speak(question.word.word)}>
            <span>▶</span><b>소리를 듣고 단어를 골라보세요</b><small>필요하면 다시 눌러도 괜찮아요</small>
          </button>
        )}
        {question.skill === "context" && (
          <div className="diagnosis-context">
            <p>{question.word.exampleBlank.split("_____")[0]}<b>_____</b>{question.word.exampleBlank.split("_____")[1]}</p>
            <small>{question.word.contextKo}</small>
          </div>
        )}
        {question.skill === "recall" && (
          <form className="diagnosis-recall" onSubmit={submitRecall}>
            <label htmlFor="diagnosis-recall">‘{question.word.meaningKo}’에 해당하는 영어 단어를 직접 써보세요.</label>
            <div><input id="diagnosis-recall" value={recall} onChange={(event) => setRecall(event.target.value)} disabled={answered} autoFocus autoComplete="off" /><button disabled={!recall.trim() || answered}>확인</button></div>
          </form>
        )}

        {question.skill !== "recall" && (
          <div className="diagnosis-choices">
            {choices.map((choice) => (
              <button
                key={choice}
                className={`${selected === choice ? "selected" : ""} ${answered && choice === correctValue(question) ? "answer" : ""}`}
                onClick={() => submitAnswer(choice)}
                disabled={answered}
              >{choice}</button>
            ))}
          </div>
        )}

        {answered && (
          <div className={`diagnosis-feedback ${lastCorrect ? "correct" : "retry"}`}>
            <div><b>{lastCorrect ? "연결됐어요!" : "이 연결을 다시 만나면 돼요."}</b><span>{question.word.word} · {question.word.meaningKo}</span></div>
            <button onClick={advance}>{index >= questions.length - 1 ? "결과 보기" : "다음"} →</button>
          </div>
        )}
      </section>
    </main>
  );
}
