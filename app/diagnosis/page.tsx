"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dailyWords, type VocaWord } from "../../data/words";
import { trackAnalyticsEvent } from "../../lib/analytics";
import { speakEnglish } from "../../lib/speech";

type SkillKey = "see" | "hear" | "context" | "recall";
type Question = { word: VocaWord; skill: SkillKey };
type Answer = { wordId: string; skill: SkillKey; correct: boolean; responseMs: number; responseKind?: "answered" | "unknown" };
type ScoreMap = Record<SkillKey, number>;
type Result = { sessionId: string; guestLearnerId: string; answers: Answer[]; scores: ScoreMap; level: string };

const skillOrder: SkillKey[] = ["see", "hear", "context", "recall"];
const labels: Record<SkillKey, string> = {
  see: "보고 의미 연결",
  hear: "듣고 단어 연결",
  context: "문맥에서 이해",
  recall: "뜻 보고 단어 떠올리기",
};

const sampleResult: Array<[string, number]> = [
  ["보고 의미 연결", 78],
  ["듣고 단어 연결", 42],
  ["문맥에서 이해", 65],
  ["뜻 보고 단어 떠올리기", 31],
];

const landingStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://15loop.com/#website",
      name: "15Loop",
      url: "https://15loop.com/diagnosis",
      inLanguage: "ko-KR",
      description: "초등 5·6학년과 중학교 1학년을 위한 AI 영어 단어 연결 진단과 15분 학습",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://15loop.com/#application",
      name: "15Loop",
      url: "https://15loop.com/diagnosis",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "ko-KR",
      isAccessibleForFree: true,
      audience: {
        "@type": "EducationalAudience",
        educationalRole: "student",
      },
      description: "영어 단어의 뜻·소리·문장·떠올리기 연결을 진단하고 약한 연결부터 복습하는 웹 학습 서비스",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
        description: "7일 오픈 베타",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "어떤 단어가 나오나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "오픈 베타 진단은 뜻·발음·예문 검수를 완료한 30단어 풀에서 아이의 응답에 따라 20~25개를 출제하며, 단어 범위는 계속 확장됩니다.",
          },
        },
        {
          "@type": "Question",
          name: "아이 혼자 할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "진단과 학습 모두 아이 혼자 진행할 수 있으며 아이에게 이메일이나 비밀번호를 요구하지 않습니다.",
          },
        },
        {
          "@type": "Question",
          name: "7일이 지나면 어떻게 되나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "베타 기간에는 결제수단을 등록하지 않으며 자동 결제가 없습니다. 정식 출시 예정 가격은 30일 이용권 12,900원입니다.",
          },
        },
      ],
    },
  ],
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
  const [lastResponseKind, setLastResponseKind] = useState<"answered" | "unknown">("answered");
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
    const weakest = [...skillOrder].sort((a, b) => scores[a] - scores[b])[0];
    const level = levelFrom(scores);
    const nextResult: Result = {
      sessionId: `diag-${crypto.randomUUID()}`,
      guestLearnerId: getGuestLearnerId(),
      answers: nextAnswers,
      scores,
      level,
    };
    trackAnalyticsEvent("diagnosis_completed", {
      item_count: nextAnswers.length,
      recommended_level: level,
      weakest_skill: weakest,
    });
    setResult(nextResult);
    setPhase("result");
    void persistResult(nextResult);
  };

  const submitAnswer = (value: string, responseKind: "answered" | "unknown" = "answered") => {
    if (!question || answered) return;
    const normalized = value.toLowerCase().replace(/[^a-z가-힣]/g, "");
    const target = correctValue(question).toLowerCase().replace(/[^a-z가-힣]/g, "");
    const correct = responseKind === "unknown" ? false : normalized === target;
    setSelected(value);
    setLastCorrect(correct);
    setLastResponseKind(responseKind);
    setAnswered(true);
    if (question.skill !== "see") speak(question.word.word);
  };

  const submitRecall = (event: FormEvent) => {
    event.preventDefault();
    if (recall.trim()) submitAnswer(recall.trim());
  };

  const markRecallUnknown = () => submitAnswer("", "unknown");

  const advance = () => {
    if (!question) return;
    const nextAnswers = [...answers, {
      wordId: question.word.id,
      skill: question.skill,
      correct: lastCorrect,
      responseMs: Math.min(300_000, Math.max(0, Date.now() - startedAt)),
      responseKind: lastResponseKind,
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
    setLastResponseKind("answered");
    setStartedAt(Date.now());
  };

  const startDiagnosis = (placement: "hero" | "offer") => {
    trackAnalyticsEvent("diagnosis_started", { placement });
    setPhase("questions");
    setStartedAt(Date.now());
  };

  if (phase === "intro") {
    return (
      <main className="commerce-shell diagnosis-intro">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(landingStructuredData) }} />
        <header className="commerce-topbar">
          <Link className="brand" href="/diagnosis"><span className="brand-mark">15</span><span>15LOOP</span></Link>
          <Link className="commerce-text-link" href="/parent">부모 로그인</Link>
        </header>

        <section className="diagnosis-hero">
          <span className="commerce-kicker">초5·6 · 중1 무료 영어 단어 진단</span>
          <h1>매일 외운 단어인데,<br /><em>왜 읽거나 들으면</em><span className="landing-headline-tail"> 모를까요?</span></h1>
          <p>아이가 단어를 모르는 게 아니라, 뜻·소리·문장이 아직 연결되지 않았을 수 있습니다. 가입 없이 8~12분 동안 어디에서 막히는지 확인해보세요.</p>
          <button className="commerce-primary" onClick={() => startDiagnosis("hero")}>우리 아이 무료 진단하기 <span>→</span></button>
          <p className="landing-facts-line">20~25개 단어 · 가입 없이 시작 · 결과 즉시 확인</p>
          <small>7일 무료 · 정식 출시 예정: 30일 이용권 12,900원</small>
        </section>

        <section className="landing-story">
          <span className="commerce-kicker">한 아빠의 발견</span>
          <blockquote>
            <p>중학생이 된 아이에게 외운 단어를 읽어보라고 했습니다.<br />뜻은 외웠다는데 발음은 낯설었고, 들려주면 알아보지 못했습니다.</p>
            <p>선행이 부족해서가 아니었습니다.<br /><b>뜻과 소리와 문장이 서로 연결되지 않았던 겁니다.</b></p>
            <p>그래서 단어를 몇 개 외웠는지가 아니라, 어디에서 연결이 끊기는지 확인하는 도구를 만들었습니다.</p>
          </blockquote>
        </section>

        <section className="landing-sample">
          <div>
            <h2>진단이 끝나면<br />이렇게 보여드려요.</h2>
            <p>네 가지 연결 점수와 가장 먼저 보강할 연결을 알려드립니다. 낮은 점수는 아이의 부족함이 아니라, 아직 만들어지지 않은 연결입니다.</p>
            <p className="landing-trust">교육부 2022 개정 교육과정 기본 어휘를 기준으로 구성했습니다.</p>
          </div>
          <aside aria-hidden="true">
            <span className="landing-sample-label">예시 결과 화면</span>
            {sampleResult.map(([label, score]) => (
              <div className="diagnosis-skill" key={label}>
                <div><span>{label}</span><b>{score}</b></div>
                <i><span style={{ width: `${score}%` }} /></i>
              </div>
            ))}
            <p className="landing-sample-focus">가장 먼저 보강할 연결: <b>듣고 단어 연결</b></p>
          </aside>
        </section>

        <section className="landing-offer">
          <span className="commerce-kicker">7일 프로그램</span>
          <h2>끊긴 연결부터, 매일 15분씩 7일.</h2>
          <p>진단에서 찾은 약한 연결부터 매일 15분씩 학습합니다. 부모 화면에서 학습일, 학습시간, 학습한 단어와 반복 결과를 확인할 수 있습니다.</p>
          <p className="landing-price-line">7일 무료 · 베타 기간 결제 없음 · 정식 출시 예정: 30일 이용권 12,900원</p>
          <button className="commerce-primary" onClick={() => startDiagnosis("offer")}>우리 아이 무료 진단하기 <span>→</span></button>
        </section>

        <section className="landing-faq">
          <h2>자주 묻는 질문</h2>
          <dl>
            <dt>어떤 단어가 나오나요?</dt>
            <dd>오픈 베타 진단은 뜻·발음·예문 검수를 완료한 30단어 풀에서 아이의 응답에 따라 20~25개를 출제합니다. 단어 범위는 베타 기간 동안 계속 확장됩니다.</dd>
            <dt>아이 혼자 할 수 있나요?</dt>
            <dd>네. 진단과 학습 모두 아이 혼자 진행할 수 있게 만들었습니다. 아이에게 이메일이나 비밀번호를 요구하지 않습니다.</dd>
            <dt>7일이 지나면 어떻게 되나요?</dt>
            <dd>베타 기간에는 결제수단을 등록하지 않으며 자동 결제가 없습니다. 정식 출시 예정: 30일 이용권 12,900원.</dd>
          </dl>
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
            <p className="diagnosis-reframe">아이는 단어를 모르는 게 아니라, 아직 연결되지 않았을 뿐이에요.</p>
            <p>교육부 2022 개정 교육과정 기본 어휘를 기준으로 {result.answers.length}단어의 실제 응답을 확인해 다음 7일 학습의 우선순위를 만들었습니다.</p>
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
              <b>부모 계정에 연결하면 이렇게 이어져요</b>
              <ul className="diagnosis-locked-list">
                <li>이 진단 결과를 아이 프로필에 저장</li>
                <li>가장 약한 연결부터 매일 15분 맞춤 학습</li>
                <li>부모 화면에서 학습일·학습시간·반복 결과 확인</li>
              </ul>
              <p>7일 무료 · 베타 기간 결제 없음 · 정식 출시 예정: 30일 이용권 12,900원</p>
            </div>
            <Link className="commerce-primary" href={`/parent?diagnostic=${encodeURIComponent(result.sessionId)}`} onClick={() => trackAnalyticsEvent("parent_connect_clicked", { source: "diagnosis_result" })}>부모에게 결과 연결 <span>→</span></Link>
            <small>{saved === "saved"
              ? "✓ 결과가 저장됐어요. 아직 이 기기에서만 볼 수 있어요 — 부모 계정에 연결하면 계속 이어집니다."
              : saved === "local"
                ? "결과가 이 기기에만 보관돼 있어요. 부모 계정에 연결하면 안전하게 저장됩니다."
                : "결과 저장 중…"}</small>
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
            <button className="diagnosis-unknown-button" type="button" onClick={markRecallUnknown} disabled={answered}>모르겠어요 · 다음</button>
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
