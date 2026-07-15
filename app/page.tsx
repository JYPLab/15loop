"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { dailyWords, shuffledDailyWords, type VocaWord } from "../data/words";

type Locale = "ko" | "en";
type SkillKey = "see" | "hear" | "context" | "recall";
type FeedbackState = {
  status: "idle" | "correct" | "retry";
  text: string;
  source?: "openai" | "local-fallback";
};

type ProgressResponse = {
  profile?: {
    streak: number;
    completedToday: number;
    scores: Record<SkillKey, number>;
    nextDueAt?: string | null;
  };
};

const skillOrder: SkillKey[] = ["see", "hear", "context", "recall"];
const initialScores: Record<SkillKey, number> = {
  see: 50,
  hear: 50,
  context: 50,
  recall: 50,
};

const copy = {
  ko: {
    home: "LoopVoca 홈",
    streak: (days: number) => `${days}일째 루프 중`,
    kicker: "오늘의 맞춤 루프",
    headlineA: "외웠는지가 아니라,",
    headlineB: "정말 아는지",
    headlineC: "확인해요.",
    today: "오늘",
    stages: ["보고 알기", "듣고 알기", "문맥 이해", "직접 인출"],
    eyebrows: ["01 · 보고 알기", "02 · 듣고 알기", "03 · 문맥 이해", "04 · 직접 인출"],
    seeTitle: (word: string) => `${word}의 뜻은 무엇일까요?`,
    hearTitle: "방금 들은 단어를 골라보세요.",
    recallTitle: (meaning: string) => `‘${meaning}’ 문장을 영어로 써보세요.`,
    helpers: [
      "생각나는 답을 골라보세요. 틀린 단어는 다음 루프에 다시 나와요.",
      "글자를 보지 않고 소리만으로 구별할 수 있는지 확인해요.",
      "문장 속에서 자연스럽게 이어지는 단어를 골라보세요.",
      "힌트 없이 직접 꺼낼 수 있어야 오래 기억돼요.",
    ],
    listen: "발음 듣기",
    listenAgain: "다시 듣기",
    tapToListen: "눌러서 단어 듣기",
    listenAnytime: "몇 번을 들어도 괜찮아요",
    sentenceLabel: "영어 문장",
    evaluating: "평가 중",
    evaluate: "AI 평가",
    correct: "좋아요! 소리와 의미가 정확히 연결됐어요.",
    retry: "괜찮아요. 한 번 더 연결하면 더 오래 기억돼요.",
    retryButton: "다시 해보기",
    nextStage: "다음 단계",
    seeResult: "결과 보기",
    loopComplete: "LOOP COMPLETE",
    resultTitle: (word: string) => `${word}의 학습 루프를 마쳤어요.`,
    resultBody: "네 가지 연결을 모두 확인했어요. 약한 연결은 잠시 뒤 새로운 문장으로 다시 만나요.",
    nextWord: "다음 단어 시작하기",
    reviewResult: "학습 결과 다시 보기",
    dayComplete: "오늘의 30단어를 모두 연결했어요.",
    dayCompleteBody: "AI가 기억 상태를 저장했어요. 약해지기 직전의 단어부터 다음 루프가 시작됩니다.",
    profile: "나의 영어 연결도",
    profileLabel: "LIVE PROFILE",
    gapTitle: "AI가 발견한 오늘의 빈틈",
    gapBody: (skill: string) => `${skill}이 가장 약해요. 다음 루프에서 같은 단어를 새로운 방식으로 다시 만나요.`,
    nextLoop: "NEXT LOOP",
    dueSoon: "기억이 흐려지기 전에",
    dueBody: "학습 결과에 따라 반복 시점이 달라져요.",
    footer: "평가하고 · 연결하고 · 기억할 때까지",
    saved: "학습 기록 저장됨",
    local: "로컬 안전 평가",
    model: "GPT-5.6 평가",
  },
  en: {
    home: "LoopVoca home",
    streak: (days: number) => `${days}-day learning streak`,
    kicker: "Your adaptive daily loop",
    headlineA: "Do not just memorize it.",
    headlineB: "Prove you know it",
    headlineC: "in four connections.",
    today: "Today",
    stages: ["Recognition", "Listening", "Context", "Recall"],
    eyebrows: ["01 · RECOGNITION", "02 · LISTENING", "03 · CONTEXT", "04 · ACTIVE RECALL"],
    seeTitle: (word: string) => `What does “${word}” mean?`,
    hearTitle: "Choose the word you just heard.",
    recallTitle: (meaning: string) => `Type the full English sentence for “${meaning}”.`,
    helpers: [
      "Choose the answer you remember. Missed words return in a later loop.",
      "Test whether sound alone is enough to recognize the word.",
      "Choose the word that naturally completes the sentence.",
      "Retrieving without a hint is what makes memory durable.",
    ],
    listen: "Hear pronunciation",
    listenAgain: "Listen again",
    tapToListen: "Tap to hear the word",
    listenAnytime: "Replay it as many times as you need",
    sentenceLabel: "English sentence",
    evaluating: "Evaluating",
    evaluate: "AI evaluate",
    correct: "Nice. Sound and meaning are connected accurately.",
    retry: "Not yet. One more connection will make this memory stronger.",
    retryButton: "Try again",
    nextStage: "Next stage",
    seeResult: "See result",
    loopComplete: "LOOP COMPLETE",
    resultTitle: (word: string) => `You completed the learning loop for “${word}”.`,
    resultBody: "All four connections were checked. Weak connections return later in a new sentence.",
    nextWord: "Start next word",
    reviewResult: "Review result",
    dayComplete: "You connected all 30 words for today.",
    dayCompleteBody: "Your memory state is saved. The next loop starts with words just before they fade.",
    profile: "My connection profile",
    profileLabel: "LIVE PROFILE",
    gapTitle: "The gap AI found today",
    gapBody: (skill: string) => `${skill} is currently weakest. The next loop will reconnect it in a new way.`,
    nextLoop: "NEXT LOOP",
    dueSoon: "Before the memory fades",
    dueBody: "Review timing changes with every evaluation.",
    footer: "Evaluate · Connect · Remember",
    saved: "Progress saved",
    local: "Local safety evaluation",
    model: "GPT-5.6 evaluation",
  },
} as const;

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

function rotateChoices(values: string[], wordIndex: number, stepIndex: number) {
  const offset = (wordIndex + stepIndex) % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function dateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function getLearnerId() {
  const existing = window.localStorage.getItem("loopvoca-learner-id");
  if (existing) return existing;
  const next = `learner-${crypto.randomUUID()}`;
  window.localStorage.setItem("loopvoca-learner-id", next);
  return next;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [learnerId, setLearnerId] = useState("");
  const [queue, setQueue] = useState(() => shuffledDailyWords(dateKey()).map((item) => item.id));
  const [queueIndex, setQueueIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [recall, setRecall] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>({ status: "idle", text: "" });
  const [scores, setScores] = useState(initialScores);
  const [completed, setCompleted] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [completedToday, setCompletedToday] = useState(0);
  const [streak, setStreak] = useState(1);
  const [wordHadError, setWordHadError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);

  const t = copy[locale];
  const word = useMemo<VocaWord>(() => {
    return dailyWords.find((item) => item.id === queue[queueIndex]) ?? dailyWords[0];
  }, [queue, queueIndex]);
  const stepKey = skillOrder[stepIndex];
  const isDayComplete = completedToday >= dailyWords.length;

  const weakest = useMemo(() => {
    return (Object.entries(scores) as [SkillKey, number][]).sort((a, b) => a[1] - b[1])[0];
  }, [scores]);

  const skillLabels = useMemo<Record<SkillKey, string>>(() => ({
    see: t.stages[0],
    hear: t.stages[1],
    context: t.stages[2],
    recall: t.stages[3],
  }), [t]);

  const choiceSet = useMemo(() => {
    if (stepKey === "see") {
      const values = locale === "ko"
        ? [word.meaningKo, ...word.distractorsKo]
        : [word.definitionEn, ...word.distractorsEn];
      return rotateChoices(values, queueIndex, stepIndex);
    }
    if (stepKey === "hear") return rotateChoices(word.soundChoices, queueIndex, stepIndex);
    if (stepKey === "context") return rotateChoices(word.contextChoices, queueIndex, stepIndex);
    return [];
  }, [locale, queueIndex, stepIndex, stepKey, word]);

  const correctChoice = stepKey === "see"
    ? (locale === "ko" ? word.meaningKo : word.definitionEn)
    : stepKey === "context"
      ? word.contextChoices[0]
      : word.word;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const queryLocale = new URLSearchParams(window.location.search).get("lang");
      const storedLocale = window.localStorage.getItem("loopvoca-locale");
      const initialLocale = queryLocale === "en" || queryLocale === "ko"
        ? queryLocale
        : storedLocale === "en"
          ? "en"
          : "ko";
      setLocale(initialLocale);
      document.documentElement.lang = initialLocale;
      setLearnerId(getLearnerId());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!learnerId) return;
    let active = true;

    fetch(`/api/progress?learnerId=${encodeURIComponent(learnerId)}`)
      .then((response) => response.ok ? response.json() as Promise<ProgressResponse> : null)
      .then((data) => {
        if (!active || !data?.profile) return;
        setScores(data.profile.scores);
        setCompletedToday(Math.min(dailyWords.length, data.profile.completedToday));
        setStreak(data.profile.streak);
      })
      .catch(() => undefined)
      .finally(() => active && setIsProgressLoaded(true));

    return () => { active = false; };
  }, [learnerId]);

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    window.localStorage.setItem("loopvoca-locale", nextLocale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLocale);
    window.history.replaceState({}, "", url);
  };

  const saveResult = async (skill: SkillKey, correct: boolean, score: number) => {
    if (!learnerId) return;
    setLastSaved(false);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId, wordId: word.id, skill, correct, score, locale }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as ProgressResponse;
      if (data.profile) {
        setScores(data.profile.scores);
        setCompletedToday(Math.min(dailyWords.length, data.profile.completedToday));
        setStreak(data.profile.streak);
      }
      setLastSaved(true);
    } catch {
      // The learning interaction remains usable while persistence reconnects.
    }
  };

  const applyResult = (correct: boolean, evaluationScore = correct ? 92 : 42, text?: string, source?: FeedbackState["source"]) => {
    setFeedback({
      status: correct ? "correct" : "retry",
      text: text || (correct ? t.correct : t.retry),
      source,
    });
    if (!correct) setWordHadError(true);
    setScores((current) => ({
      ...current,
      [stepKey]: Math.round(Math.min(98, Math.max(20, current[stepKey] * 0.78 + evaluationScore * 0.22))),
    }));
    void saveResult(stepKey, correct, evaluationScore);
  };

  const chooseAnswer = (choice: string) => {
    if (feedback.status !== "idle") return;
    setSelected(choice);
    applyResult(choice === correctChoice);
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
          learnerId,
          word: word.word,
          target: word.example,
          answer: recall,
          meaning: word.contextKo,
          locale,
        }),
      });
      const result = (await response.json()) as {
        correct?: boolean;
        score?: number;
        feedbackKo?: string;
        feedbackEn?: string;
        source?: "openai" | "local-fallback";
      };
      applyResult(
        Boolean(result.correct),
        result.score ?? (result.correct ? 92 : 42),
        locale === "ko" ? result.feedbackKo : result.feedbackEn,
        result.source,
      );
    } catch {
      const normalized = recall.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
      const target = word.example.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
      applyResult(normalized === target, normalized === target ? 92 : 42, undefined, "local-fallback");
    } finally {
      setIsChecking(false);
    }
  };

  const advance = () => {
    if (feedback.status === "retry") {
      setFeedback({ status: "idle", text: "" });
      setSelected("");
      setRecall("");
      return;
    }

    if (stepIndex === skillOrder.length - 1) {
      if (!completedIds.has(word.id)) {
        setCompletedIds((current) => new Set(current).add(word.id));
        setCompletedToday((current) => Math.min(dailyWords.length, current + 1));
      }
      setCompleted(true);
      return;
    }

    setStepIndex((current) => current + 1);
    setSelected("");
    setFeedback({ status: "idle", text: "" });
  };

  const nextWord = () => {
    setQueue((current) => {
      if (!wordHadError) return current;
      const next = [...current];
      const reviewAt = Math.min(next.length, queueIndex + 4);
      next.splice(reviewAt, 0, word.id);
      return next;
    });
    setQueueIndex((current) => Math.min(queue.length - 1, current + 1));
    setStepIndex(0);
    setSelected("");
    setRecall("");
    setFeedback({ status: "idle", text: "" });
    setCompleted(false);
    setWordHadError(false);
  };

  const stepTitle = stepKey === "see"
    ? t.seeTitle(word.word)
    : stepKey === "hear"
      ? t.hearTitle
      : stepKey === "context"
        ? word.exampleBlank
        : t.recallTitle(locale === "ko" ? word.contextKo : word.contextEn);

  const progressPercent = Math.round((completedToday / dailyWords.length) * 100);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={t.home}>
          <span className="brand-mark">L</span>
          <span>LOOPVOCA</span>
        </a>
        <div className="topbar-actions">
          <div className="engine-pill"><span>✦</span> GPT-5.6</div>
          <div className="language-toggle" role="group" aria-label="Language">
            <button className={locale === "ko" ? "active" : ""} onClick={() => changeLocale("ko")}>KO</button>
            <button className={locale === "en" ? "active" : ""} onClick={() => changeLocale("en")}>EN</button>
          </div>
          <div className="streak"><span>●</span> {t.streak(streak)}</div>
          <button className="profile" aria-label={t.profile}>JY</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <div className="kicker"><span>AI EVALUATION</span> {t.kicker}</div>
          <h1>{t.headlineA}<br /><em>{t.headlineB}</em> {t.headlineC}</h1>
        </div>
        <div className="today-stat" aria-label={`${t.today} ${completedToday} / ${dailyWords.length}`}>
          <span>{t.today}</span>
          <strong>{String(completedToday).padStart(2, "0")} <small>/ {dailyWords.length}</small></strong>
          <div className="mini-progress"><i style={{ width: `${progressPercent}%` }} /></div>
        </div>
      </section>

      <section className="workspace">
        <div className="learn-column">
          <div className="step-tabs" aria-label="Evaluation stages">
            {skillOrder.map((item, index) => (
              <div
                className={`step-tab ${index === stepIndex && !completed ? "active" : ""} ${index < stepIndex || completed ? "done" : ""}`}
                key={item}
              >
                <span>{index < stepIndex || completed ? "✓" : index + 1}</span>
                <b>{t.stages[index]}</b>
              </div>
            ))}
          </div>

          {isDayComplete && completed ? (
            <article className="result-card day-complete-card">
              <div className="result-badge">DAILY LOOP COMPLETE</div>
              <p className="result-number">30</p>
              <h2>{t.dayComplete}</h2>
              <p>{t.dayCompleteBody}</p>
            </article>
          ) : !completed ? (
            <article className="quiz-card">
              <div className="quiz-heading">
                <div>
                  <p>{t.eyebrows[stepIndex]}</p>
                  <h2>{stepTitle}</h2>
                </div>
                {(stepKey === "hear" || stepKey === "context") && (
                  <button
                    className="sound-button"
                    onClick={() => speak(stepKey === "context" ? word.example : word.word)}
                    aria-label={t.listenAgain}
                  >
                    <span className="sound-bars"><i /><i /><i /></span>
                    {t.listenAgain}
                  </button>
                )}
              </div>

              {stepKey === "see" && (
                <button className="word-stage" onClick={() => speak(word.word)} aria-label={`${word.word} ${t.listen}`}>
                  <span className="phonetic">{word.phonetic}</span>
                  <strong>{word.word}</strong>
                  <span className="listen-chip">▶ {t.listen}</span>
                </button>
              )}

              {stepKey === "hear" && (
                <button className="audio-stage" onClick={() => speak(word.word)} aria-label={t.tapToListen}>
                  <span className="audio-ring"><span>▶</span></span>
                  <b>{t.tapToListen}</b>
                  <small>{t.listenAnytime}</small>
                </button>
              )}

              {stepKey === "context" && (
                <div className="context-stage">
                  <span className="quote-mark">“</span>
                  <p>{word.exampleBlank.split("_____")[0]}<b>_____</b>{word.exampleBlank.split("_____")[1]}</p>
                  <small>{locale === "ko" ? word.contextKo : word.contextEn}</small>
                </div>
              )}

              {stepKey !== "recall" ? (
                <div className="choice-grid">
                  {choiceSet.map((choice, index) => (
                    <button
                      key={choice}
                      className={`${selected === choice ? "selected" : ""} ${feedback.status !== "idle" && choice === correctChoice ? "answer" : ""}`}
                      onClick={() => chooseAnswer(choice)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>{choice}
                    </button>
                  ))}
                </div>
              ) : (
                <form className="recall-form" onSubmit={checkRecall}>
                  <label htmlFor="recall-answer">{t.sentenceLabel}</label>
                  <div className="recall-input-row">
                    <input
                      id="recall-answer"
                      value={recall}
                      onChange={(event) => setRecall(event.target.value)}
                      placeholder={word.example.split(" ").slice(0, 2).join(" ") + " ..."}
                      autoComplete="off"
                      disabled={feedback.status !== "idle"}
                    />
                    <button type="submit" disabled={!recall.trim() || feedback.status !== "idle" || isChecking}>
                      {isChecking ? t.evaluating : t.evaluate}
                    </button>
                  </div>
                </form>
              )}

              <div className="feedback-row">
                <div>
                  <p className={`feedback ${feedback.status}`} aria-live="polite">
                    {feedback.status === "idle" ? t.helpers[stepIndex] : feedback.text}
                  </p>
                  {(feedback.source || lastSaved) && (
                    <div className="feedback-meta">
                      {feedback.source && <span>{feedback.source === "openai" ? t.model : t.local}</span>}
                      {lastSaved && <span>✓ {t.saved}</span>}
                    </div>
                  )}
                </div>
                {feedback.status !== "idle" && (
                  <button className="next-button" onClick={advance}>
                    {feedback.status === "retry" ? t.retryButton : stepIndex === skillOrder.length - 1 ? t.seeResult : t.nextStage} <span>→</span>
                  </button>
                )}
              </div>
            </article>
          ) : (
            <article className="result-card">
              <div className="result-badge">{t.loopComplete}</div>
              <p className="result-number">{String(completedToday).padStart(2, "0")}</p>
              <h2>{t.resultTitle(word.word)}</h2>
              <p>{t.resultBody}</p>
              <div className="result-actions">
                <button className="primary-button" onClick={nextWord}>{t.nextWord} <span>→</span></button>
                <button className="ghost-button" onClick={() => setCompleted(false)}>{t.reviewResult}</button>
              </div>
            </article>
          )}
        </div>

        <aside className="insight-panel">
          <div className="panel-header">
            <div>
              <span>{t.profileLabel}</span>
              <h2>{t.profile}</h2>
            </div>
            <span className="live-dot">{isProgressLoaded ? "LIVE" : "···"}</span>
          </div>

          <div className="skill-list">
            {(Object.entries(scores) as [SkillKey, number][]).map(([key, score]) => (
              <div className="skill-row" key={key}>
                <div><span>{skillLabels[key]}</span><b>{score}</b></div>
                <div className="skill-track"><i className={key} style={{ width: `${score}%` }} /></div>
              </div>
            ))}
          </div>

          <div className="ai-note">
            <span className="ai-glyph">✦</span>
            <div>
              <b>{t.gapTitle}</b>
              <p><strong>{skillLabels[weakest[0]]}</strong> — {t.gapBody(skillLabels[weakest[0]])}</p>
            </div>
          </div>

          <div className="next-loop">
            <span>{t.nextLoop}</span>
            <div>
              <b>{t.dueSoon}</b>
              <small>{t.dueBody}</small>
            </div>
          </div>
        </aside>
      </section>

      <footer>
        <span>LoopVoca Learning Loop Engine · GPT-5.6</span>
        <p>{t.footer}</p>
      </footer>
    </main>
  );
}
