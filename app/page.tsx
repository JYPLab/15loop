"use client";

import { FormEvent, useMemo, useState } from "react";

type SkillKey = "see" | "hear" | "context" | "recall";

type Step = {
  key: SkillKey;
  eyebrow: string;
  title: string;
  helper: string;
};

const steps: Step[] = [
  {
    key: "see",
    eyebrow: "01 · 보고 알기",
    title: "borrow의 뜻은 무엇일까요?",
    helper: "생각나는 답을 골라보세요. 틀려도 다음 루프에 다시 나와요.",
  },
  {
    key: "hear",
    eyebrow: "02 · 듣고 알기",
    title: "방금 들은 단어를 골라보세요.",
    helper: "글자를 보지 않고 소리만으로 구별할 수 있는지 확인해요.",
  },
  {
    key: "context",
    eyebrow: "03 · 문맥 이해",
    title: "Can I ___ your pencil?",
    helper: "문장 속에서 자연스럽게 이어지는 단어를 골라보세요.",
  },
  {
    key: "recall",
    eyebrow: "04 · 직접 인출",
    title: "‘네 연필을 빌려도 될까?’를 영어로 써보세요.",
    helper: "힌트 없이 직접 꺼낼 수 있어야 오래 기억돼요.",
  },
];

const choices: Record<Exclude<SkillKey, "recall">, string[]> = {
  see: ["빌리다", "돌려주다", "필요하다", "도착하다"],
  hear: ["borrow", "bring", "break", "buy"],
  context: ["borrow", "keep", "show", "find"],
};

const answers: Record<Exclude<SkillKey, "recall">, string> = {
  see: "빌리다",
  hear: "borrow",
  context: "borrow",
};

const initialScores: Record<SkillKey, number> = {
  see: 74,
  hear: 52,
  context: 68,
  recall: 41,
};

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

export default function Home() {
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [recall, setRecall] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "retry">("idle");
  const [scores, setScores] = useState(initialScores);
  const [completed, setCompleted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const step = steps[stepIndex];

  const weakest = useMemo(() => {
    return (Object.entries(scores) as [SkillKey, number][]).sort((a, b) => a[1] - b[1])[0];
  }, [scores]);

  const applyResult = (correct: boolean) => {
    setFeedback(correct ? "correct" : "retry");
    setScores((current) => ({
      ...current,
      [step.key]: Math.min(96, Math.max(20, current[step.key] + (correct ? 7 : -4))),
    }));
  };

  const chooseAnswer = (choice: string) => {
    if (feedback !== "idle") return;
    setSelected(choice);
    applyResult(choice === answers[step.key as Exclude<SkillKey, "recall">]);
  };

  const checkRecall = async (event: FormEvent) => {
    event.preventDefault();
    if (!recall.trim() || isChecking) return;
    setIsChecking(true);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "Can I borrow your pencil?",
          answer: recall,
          meaning: "네 연필을 빌려도 될까?",
        }),
      });
      const result = (await response.json()) as { correct?: boolean };
      applyResult(Boolean(result.correct));
    } catch {
      const normalized = recall.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
      applyResult(normalized === "can i borrow your pencil");
    } finally {
      setIsChecking(false);
    }
  };

  const advance = () => {
    if (feedback === "retry") {
      setFeedback("idle");
      setSelected("");
      return;
    }

    if (stepIndex === steps.length - 1) {
      setCompleted(true);
      return;
    }

    setStepIndex((current) => current + 1);
    setSelected("");
    setFeedback("idle");
  };

  const restart = () => {
    setStepIndex(0);
    setSelected("");
    setRecall("");
    setFeedback("idle");
    setCompleted(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LoopVoca 홈">
          <span className="brand-mark">L</span>
          <span>LOOPVOCA</span>
        </a>
        <div className="topbar-actions">
          <div className="streak"><span>●</span> 12일째 루프 중</div>
          <button className="profile" aria-label="학습자 프로필">JY</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <div className="kicker"><span>AI EVALUATION</span> 오늘의 맞춤 루프</div>
          <h1>외웠는지가 아니라,<br /><em>정말 아는지</em> 확인해요.</h1>
        </div>
        <div className="today-stat" aria-label="오늘 학습 진행률">
          <span>오늘</span>
          <strong>08 <small>/ 30</small></strong>
          <div className="mini-progress"><i style={{ width: "27%" }} /></div>
        </div>
      </section>

      <section className="workspace">
        <div className="learn-column">
          <div className="step-tabs" aria-label="평가 단계">
            {steps.map((item, index) => (
              <div
                className={`step-tab ${index === stepIndex && !completed ? "active" : ""} ${index < stepIndex || completed ? "done" : ""}`}
                key={item.key}
              >
                <span>{index < stepIndex || completed ? "✓" : index + 1}</span>
                <b>{item.eyebrow.split("·")[1]}</b>
              </div>
            ))}
          </div>

          {!completed ? (
            <article className="quiz-card">
              <div className="quiz-heading">
                <div>
                  <p>{step.eyebrow}</p>
                  <h2>{step.title}</h2>
                </div>
                {(step.key === "hear" || step.key === "context") && (
                  <button className="sound-button" onClick={() => speak(step.key === "context" ? "Can I borrow your pencil?" : "borrow")} aria-label="영어 발음 듣기">
                    <span className="sound-bars"><i /><i /><i /></span>
                    다시 듣기
                  </button>
                )}
              </div>

              {step.key === "see" && (
                <button className="word-stage" onClick={() => speak("borrow")} aria-label="borrow 발음 듣기">
                  <span className="phonetic">/ˈbɑːroʊ/</span>
                  <strong>borrow</strong>
                  <span className="listen-chip">▶ 발음 듣기</span>
                </button>
              )}

              {step.key === "hear" && (
                <button className="audio-stage" onClick={() => speak("borrow")} aria-label="단어 듣기">
                  <span className="audio-ring"><span>▶</span></span>
                  <b>눌러서 단어 듣기</b>
                  <small>몇 번을 들어도 괜찮아요</small>
                </button>
              )}

              {step.key === "context" && (
                <div className="context-stage">
                  <span className="quote-mark">“</span>
                  <p>Can I <b>_____</b> your pencil?</p>
                  <small>친구에게 연필을 부탁하는 상황</small>
                </div>
              )}

              {step.key !== "recall" ? (
                <div className="choice-grid">
                  {choices[step.key as Exclude<SkillKey, "recall">].map((choice, index) => (
                    <button
                      key={choice}
                      className={`${selected === choice ? "selected" : ""} ${feedback !== "idle" && choice === answers[step.key as Exclude<SkillKey, "recall">] ? "answer" : ""}`}
                      onClick={() => chooseAnswer(choice)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>{choice}
                    </button>
                  ))}
                </div>
              ) : (
                <form className="recall-form" onSubmit={checkRecall}>
                  <label htmlFor="recall-answer">영어 문장</label>
                  <div className="recall-input-row">
                    <input
                      id="recall-answer"
                      value={recall}
                      onChange={(event) => setRecall(event.target.value)}
                      placeholder="Can I ..."
                      autoComplete="off"
                      disabled={feedback !== "idle"}
                    />
                    <button type="submit" disabled={!recall.trim() || feedback !== "idle" || isChecking}>
                      {isChecking ? "평가 중" : "AI 평가"}
                    </button>
                  </div>
                </form>
              )}

              <div className="feedback-row">
                <p className={`feedback ${feedback}`} aria-live="polite">
                  {feedback === "idle" && step.helper}
                  {feedback === "correct" && "좋아요! 소리와 의미가 정확히 연결됐어요."}
                  {feedback === "retry" && "괜찮아요. 한 번 더 연결하면 더 오래 기억돼요."}
                </p>
                {feedback !== "idle" && (
                  <button className="next-button" onClick={advance}>
                    {feedback === "retry" ? "다시 해보기" : stepIndex === steps.length - 1 ? "결과 보기" : "다음 단계"} <span>→</span>
                  </button>
                )}
              </div>
            </article>
          ) : (
            <article className="result-card">
              <div className="result-badge">LOOP COMPLETE</div>
              <p className="result-number">1</p>
              <h2>borrow의 첫 번째 루프를 마쳤어요.</h2>
              <p>보고 듣는 힘은 좋아요. 직접 문장을 꺼내는 연습을 조금 더 하면 오래 기억할 수 있어요.</p>
              <div className="result-actions">
                <button className="primary-button" onClick={restart}>다음 단어 시작하기 <span>→</span></button>
                <button className="ghost-button" onClick={() => setCompleted(false)}>학습 결과 다시 보기</button>
              </div>
            </article>
          )}
        </div>

        <aside className="insight-panel">
          <div className="panel-header">
            <div>
              <span>LIVE PROFILE</span>
              <h2>나의 영어 연결도</h2>
            </div>
            <span className="live-dot">LIVE</span>
          </div>

          <div className="skill-list">
            {(Object.entries(scores) as [SkillKey, number][]).map(([key, score]) => {
              const labels: Record<SkillKey, string> = { see: "보고 알기", hear: "듣고 알기", context: "문맥 이해", recall: "직접 인출" };
              return (
                <div className="skill-row" key={key}>
                  <div><span>{labels[key]}</span><b>{score}</b></div>
                  <div className="skill-track"><i className={key} style={{ width: `${score}%` }} /></div>
                </div>
              );
            })}
          </div>

          <div className="ai-note">
            <span className="ai-glyph">✦</span>
            <div>
              <b>AI가 발견한 오늘의 빈틈</b>
              <p><strong>{weakest[0] === "recall" ? "직접 인출" : "소리 연결"}</strong>이 가장 약해요. 다음 루프에서는 같은 단어를 새로운 문장으로 다시 만나요.</p>
            </div>
          </div>

          <div className="next-loop">
            <span>NEXT LOOP</span>
            <div>
              <b>오늘 저녁 7:30</b>
              <small>기억이 흐려지기 직전에 알려드릴게요.</small>
            </div>
          </div>
        </aside>
      </section>

      <footer>
        <span>LoopVoca Learning Loop Engine</span>
        <p>평가하고 · 연결하고 · 기억할 때까지</p>
      </footer>
    </main>
  );
}
