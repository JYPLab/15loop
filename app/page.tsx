"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dailyWords, shuffledDailyWords, type VocaWord } from "../data/words";
import { insertBoundedRetry, prioritizedSkillOrder, type AdaptiveQueueItem } from "../lib/adaptive-queue";
import { entryDestination } from "../lib/entry-routing";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { speakEnglish } from "../lib/speech";

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
    studySecondsToday: number;
    dailySessionCompleted: boolean;
    completedLearningDays?: number;
    scores: Record<SkillKey, number>;
    nextDueAt?: string | null;
  };
  learningQueue?: AdaptiveQueueItem[];
};
type AccountResponse = {
  authenticated: boolean;
  user?: {
    displayName: string;
    email: string;
  };
};

type ChallengeState = "intro" | "playing" | "complete";

const DAILY_SESSION_SECONDS = 15 * 60;
const HEARTBEAT_SECONDS = 30;
const IDLE_PAUSE_SECONDS = 60;
const skillOrder: SkillKey[] = ["see", "hear", "context", "recall"];
const initialScores: Record<SkillKey, number> = {
  see: 50,
  hear: 50,
  context: 50,
  recall: 50,
};

const copy = {
  ko: {
    home: "15Loop 홈",
    streak: (days: number) => `${days}일째 루프 중`,
    kicker: "초5·6 · 중1 오늘의 맞춤 루프",
    headlineA: "외웠는지가 아니라,",
    headlineB: "정말 아는지",
    headlineC: "확인해요.",
    today: "오늘의 집중시간",
    wordsToday: (count: number) => `${count}단어 연결`,
    timerRunning: "집중 시간 기록 중",
    timerPaused: "탭 이탈·60초 미활동 시 자동 일시정지",
    timerReady: "부모 계정의 아이 프로필에서 시작",
    timerDone: "오늘의 집중 학습 완료",
    stages: ["보고 알기", "듣고 알기", "문맥 이해", "빈칸 인출"],
    eyebrows: ["01 · 보고 알기", "02 · 듣고 알기", "03 · 문맥 이해", "04 · 빈칸 인출"],
    seeTitle: (word: string) => `${word}의 뜻은 무엇일까요?`,
    hearTitle: "방금 들은 단어를 골라보세요.",
    recallTitle: (word: string) => `문장 속 ‘${word}’를 직접 꺼내보세요.`,
    helpers: [
      "생각나는 답을 골라보세요. 틀린 단어는 다음 루프에 다시 나와요.",
      "글자를 보지 않고 소리만으로 구별할 수 있는지 확인해요.",
      "문장 속에서 자연스럽게 이어지는 단어를 골라보세요.",
      "문장 전체가 아니라 빈칸의 단어만 쓰면 돼요. 맞히면 완성 문장을 듣고 따라 말해요.",
    ],
    listen: "발음 듣기",
    listenAgain: "다시 듣기",
    tapToListen: "눌러서 단어 듣기",
    listenAnytime: "몇 번을 들어도 괜찮아요",
    sentenceLabel: "빈칸에 들어갈 단어",
    evaluating: "평가 중",
    evaluate: "확인하기",
    listenAndRepeat: "완성 문장 듣고 따라 말하기",
    optionalChallenge: "내 문장 만들어보기 (선택)",
    optionalChallengeBody: "배운 단어를 사용해 짧은 문장을 써보세요. 건너뛰어도 학습 결과에는 영향이 없어요.",
    optionalSentenceLabel: "나만의 영어 문장",
    optionalSentencePlaceholder: (word: string) => `${word}를 넣어 짧게 써보세요.`,
    optionalEvaluate: "AI로 문장 확인",
    optionalEvaluating: "AI가 확인 중",
    optionalClose: "도전 접기",
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
    dayComplete: "오늘의 15분 학습을 마쳤어요.",
    dayCompleteBody: (count: number) => `${count}개 단어의 네 가지 연결을 확인했어요. AI가 약해지기 직전의 단어부터 다음 학습을 준비합니다.`,
    journey: (day: number) => `7일 여정 ${day} / 7일차`,
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
    engine: "AI EVALUATION",
    saveProfile: "결과 저장",
    account: "학습 계정",
    saveTitle: "방금 발견한 영어 연결도를 저장할까요?",
    saveBody: "부모가 Google 또는 이메일로 가입하면 약한 단어와 다음 복습 시점이 가족 계정에 이어집니다.",
    savePrimary: "부모 계정으로 결과 연결",
    saveLater: "무료 진단 먼저 하기",
    saveTrust: "학생에게 이메일이나 비밀번호를 요구하지 않아요.",
    accessExpiredTitle: "무료 체험 또는 이용권이 끝났어요.",
    accessExpiredBody: "부모 대시보드에서 이용권을 확인하면 같은 학습 기록으로 계속할 수 있어요.",
    accessExpiredAction: "이용권 확인",
    accountTitle: "학습 기록이 계정에 저장되고 있어요.",
    accountBody: "이 기기에서 시작한 기록도 안전하게 연결했습니다.",
    signOut: "부모 대시보드",
    close: "닫기",
    claimed: "학습 기록을 가족 계정에 연결했어요.",
    shareAchievement: "오늘의 성장 공유",
    sendChallenge: "친구에게 5단어 챌린지",
    shareSuccess: "공유할 준비가 됐어요.",
    copySuccess: "링크를 복사했어요.",
    challengeBadge: "FRIEND CHALLENGE",
    challengeTitle: "친구가 5단어 챌린지를 보냈어요!",
    challengeBody: "실력 순위가 아니에요. 소리를 듣고 오늘의 나를 가볍게 시험해 보세요.",
    challengeStart: "챌린지 시작",
    challengeLater: "나중에 할게요",
    challengeListen: "단어 소리 듣기",
    challengePrompt: "방금 들은 단어의 뜻을 골라보세요.",
    challengeNext: "다음 단어",
    challengeFinish: "결과 확인",
    challengeCorrect: "정확해요! 소리와 의미가 연결됐어요.",
    challengeRetry: "괜찮아요. 정답을 듣고 다음 단어로 가볼까요?",
    challengeComplete: "5단어 챌린지 완료!",
    challengeScore: (score: number) => `${score} / 5 연결 성공`,
    friendScore: (score: number) => `친구 기록 ${score} / 5`,
    challengeShareBack: "내 결과로 다시 도전 보내기",
    challengeClose: "학습으로 돌아가기",
    challengePrivacy: "닉네임·학교·채팅 없이 링크로만 함께해요.",
  },
  en: {
    home: "15Loop home",
    streak: (days: number) => `${days}-day learning streak`,
    kicker: "Open beta for grades 5–7",
    headlineA: "Do not just memorize it.",
    headlineB: "Prove you know it",
    headlineC: "in four connections.",
    today: "Today’s focus time",
    wordsToday: (count: number) => `${count} words connected`,
    timerRunning: "Focus time is running",
    timerPaused: "Pauses off-tab or after 60 seconds idle",
    timerReady: "Start from a child profile in the parent account",
    timerDone: "Today’s focus session is complete",
    stages: ["Recognition", "Listening", "Context", "Cloze recall"],
    eyebrows: ["01 · RECOGNITION", "02 · LISTENING", "03 · CONTEXT", "04 · CLOZE RECALL"],
    seeTitle: (word: string) => `What does “${word}” mean?`,
    hearTitle: "Choose the word you just heard.",
    recallTitle: (word: string) => `Retrieve “${word}” inside the sentence.`,
    helpers: [
      "Choose the answer you remember. Missed words return in a later loop.",
      "Test whether sound alone is enough to recognize the word.",
      "Choose the word that naturally completes the sentence.",
      "Write only the missing word. Then hear and repeat the complete sentence.",
    ],
    listen: "Hear pronunciation",
    listenAgain: "Listen again",
    tapToListen: "Tap to hear the word",
    listenAnytime: "Replay it as many times as you need",
    sentenceLabel: "Missing word",
    evaluating: "Evaluating",
    evaluate: "Check",
    listenAndRepeat: "Hear and repeat the complete sentence",
    optionalChallenge: "Make my own sentence (optional)",
    optionalChallengeBody: "Use the word in one short sentence. Skipping this does not affect your learning result.",
    optionalSentenceLabel: "My English sentence",
    optionalSentencePlaceholder: (word: string) => `Write a short sentence with ${word}.`,
    optionalEvaluate: "Check with AI",
    optionalEvaluating: "AI is checking",
    optionalClose: "Close challenge",
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
    dayComplete: "You completed today’s 15-minute session.",
    dayCompleteBody: (count: number) => `You checked four memory connections across ${count} words. The next session starts with memories closest to fading.`,
    journey: (day: number) => `Day ${day} of 7`,
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
    engine: "AI EVALUATION",
    saveProfile: "Save results",
    account: "Learning account",
    saveTitle: "Save the English connections you just discovered?",
    saveBody: "A parent can continue weak words and review timing with Google or email sign-in.",
    savePrimary: "Connect a parent account",
    saveLater: "Take the free diagnostic first",
    saveTrust: "Students never need an email address or password.",
    accessExpiredTitle: "Your trial or access pass has ended.",
    accessExpiredBody: "Check access in the parent dashboard to continue with the same learning record.",
    accessExpiredAction: "View access passes",
    accountTitle: "Your learning record is saving to your account.",
    accountBody: "The progress you started on this device is connected too.",
    signOut: "Parent dashboard",
    close: "Close",
    claimed: "Your learning record is connected to the family account.",
    shareAchievement: "Share today’s growth",
    sendChallenge: "Send a 5-word challenge",
    shareSuccess: "Ready to share.",
    copySuccess: "Challenge link copied.",
    challengeBadge: "FRIEND CHALLENGE",
    challengeTitle: "A friend sent you a 5-word challenge!",
    challengeBody: "This is not a leaderboard. Listen and test today’s connections at your own pace.",
    challengeStart: "Start challenge",
    challengeLater: "Maybe later",
    challengeListen: "Hear the word",
    challengePrompt: "Choose the meaning of the word you just heard.",
    challengeNext: "Next word",
    challengeFinish: "See result",
    challengeCorrect: "Correct! Sound and meaning are connected.",
    challengeRetry: "That’s okay. Hear the answer and move to the next word.",
    challengeComplete: "5-word challenge complete!",
    challengeScore: (score: number) => `${score} / 5 connected`,
    friendScore: (score: number) => `Friend’s score ${score} / 5`,
    challengeShareBack: "Send a rematch with my result",
    challengeClose: "Back to learning",
    challengePrivacy: "No names, school details, or chat—just a private link.",
  },
} as const;

function speak(text: string) {
  speakEnglish(text);
}

function rotateChoices(values: string[], wordIndex: number, stepIndex: number) {
  const offset = (wordIndex + stepIndex) % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function dateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function formatRemainingTime(studySeconds: number) {
  const remaining = Math.max(0, DAILY_SESSION_SECONDS - studySeconds);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getLearnerId() {
  const existing = window.localStorage.getItem("loopvoca-learner-id");
  if (existing) return existing;
  const next = `learner-${crypto.randomUUID()}`;
  window.localStorage.setItem("loopvoca-learner-id", next);
  return next;
}

function buildChallengeWords(anchorId: string) {
  const start = Math.max(0, dailyWords.findIndex((item) => item.id === anchorId));
  return Array.from({ length: 5 }, (_, offset) => dailyWords[(start + offset) % dailyWords.length]);
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [learnerId, setLearnerId] = useState("");
  const [queue, setQueue] = useState<AdaptiveQueueItem[]>(() => shuffledDailyWords(dateKey()).map((item) => ({
    wordId: item.id,
    focusSkill: "see",
    reason: "new",
    mastery: null,
    dueAt: null,
  })));
  const [queueIndex, setQueueIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [stageInfo, setStageInfo] = useState<SkillKey | null>(null);
  const [entryReady, setEntryReady] = useState(false);
  const [selected, setSelected] = useState("");
  const [recall, setRecall] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>({ status: "idle", text: "" });
  const [optionalSentenceOpen, setOptionalSentenceOpen] = useState(false);
  const [optionalSentence, setOptionalSentence] = useState("");
  const [optionalFeedback, setOptionalFeedback] = useState<FeedbackState>({ status: "idle", text: "" });
  const [isCheckingOptional, setIsCheckingOptional] = useState(false);
  const [scores, setScores] = useState(initialScores);
  const [completed, setCompleted] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [completedToday, setCompletedToday] = useState(0);
  const [studySecondsToday, setStudySecondsToday] = useState(0);
  const [completedLearningDays, setCompletedLearningDays] = useState(0);
  const [dayCompletedAtLoad, setDayCompletedAtLoad] = useState(false);
  const [timerPaused, setTimerPaused] = useState(true);
  const [streak, setStreak] = useState(1);
  const [wordHadError, setWordHadError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);
  const [account, setAccount] = useState<AccountResponse>({ authenticated: false });
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNotice, setAccountNotice] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeState, setChallengeState] = useState<ChallengeState>("intro");
  const [challengeWords, setChallengeWords] = useState<VocaWord[]>([]);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeChoice, setChallengeChoice] = useState("");
  const [friendScore, setFriendScore] = useState<number | null>(null);
  const pendingStudySeconds = useRef(0);
  const heartbeatInFlight = useRef(false);
  const retryCounts = useRef(new Map<string, number>());
  const lastInteractionAt = useRef(0);
  const studySecondsRef = useRef(0);

  const t = copy[locale];
  const queueItem = queue[queueIndex] ?? queue[0];
  const word = useMemo<VocaWord>(() => {
    return dailyWords.find((item) => item.id === queueItem?.wordId) ?? dailyWords[0];
  }, [queueItem?.wordId]);
  const activeSkillOrder = useMemo(() => {
    return prioritizedSkillOrder(queueItem?.focusSkill ?? "see");
  }, [queueItem?.focusSkill]);
  const stepKey = activeSkillOrder[stepIndex];
  const copySkillIndex = skillOrder.indexOf(stepKey);
  const isDayComplete = studySecondsToday >= DAILY_SESSION_SECONDS;
  const isFamilyLearner = account.authenticated && !accessBlocked && /^child-[0-9a-f-]{36}$/i.test(learnerId);

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

  const challengeWord = challengeWords[challengeIndex];
  const challengeChoices = useMemo(() => {
    if (!challengeWord) return [];
    const values = locale === "ko"
      ? [challengeWord.meaningKo, ...challengeWord.distractorsKo]
      : [challengeWord.definitionEn, ...challengeWord.distractorsEn];
    return rotateChoices(values, challengeIndex, 1);
  }, [challengeIndex, challengeWord, locale]);
  const challengeAnswer = challengeWord
    ? (locale === "ko" ? challengeWord.meaningKo : challengeWord.definitionEn)
    : "";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const queryLocale = params.get("lang");
      const storedLocale = window.localStorage.getItem("loopvoca-locale");
      const initialLocale = queryLocale === "en" || queryLocale === "ko"
        ? queryLocale
        : storedLocale === "en"
          ? "en"
          : "ko";
      setLocale(initialLocale);
      document.documentElement.lang = initialLocale;
      const requestedLearner = params.get("learner")?.trim() ?? "";
      setLearnerId(/^child-[0-9a-f-]{36}$/i.test(requestedLearner) ? requestedLearner : getLearnerId());

      const challengeIds = params.get("challenge")?.split(",").slice(0, 5) ?? [];
      const incomingWords = challengeIds
        .map((id) => dailyWords.find((item) => item.id === id))
        .filter((item): item is VocaWord => Boolean(item));
      if (incomingWords.length === 5) {
        setChallengeWords(incomingWords);
        setChallengeState("intro");
        setChallengeOpen(true);
        const sharedScoreParam = params.get("score");
        const sharedScore = sharedScoreParam === null ? null : Number(sharedScoreParam);
        if (sharedScore !== null && Number.isInteger(sharedScore) && sharedScore >= 0 && sharedScore <= 5) setFriendScore(sharedScore);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!learnerId) return;
    let active = true;

    const loadAccountAndProgress = async () => {
      const hasChallenge = new URLSearchParams(window.location.search).has("challenge");
      let hasSession = false;
      try {
        const supabase = getSupabaseBrowserClient();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        hasSession = Boolean(session);
        const sessionDestination = entryDestination({ authenticated: hasSession, learnerId, hasChallenge });
        if (!session && sessionDestination !== "learn") {
          window.location.replace(sessionDestination === "diagnosis" ? "/diagnosis" : "/parent");
          return;
        }
        const token = session?.access_token ?? "";
        setAuthToken(token);
        const accountResponse = await fetch("/api/account", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        const accountData = accountResponse.ok
          ? await accountResponse.json() as AccountResponse
          : { authenticated: false };

        if (!active) return;
        setAccount(accountData);

        const destination = entryDestination({
          authenticated: accountData.authenticated,
          learnerId,
          hasChallenge,
        });
        if (destination !== "learn") {
          window.location.replace(destination === "diagnosis" ? "/diagnosis" : "/parent");
          return;
        }
        setEntryReady(true);

        const welcome = new URLSearchParams(window.location.search).get("welcome") === "1";
        if (accountData.authenticated && welcome) {
          setAccountNotice(true);
          const url = new URL(window.location.href);
          url.searchParams.delete("welcome");
          window.history.replaceState({}, "", url);
        }

        const progressResponse = await fetch(`/api/progress?learnerId=${encodeURIComponent(learnerId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if ([401, 403].includes(progressResponse.status) && /^child-[0-9a-f-]{36}$/i.test(learnerId)) {
          setAccountOpen(true);
          return;
        }
        if (progressResponse.status === 402) {
          setAccessBlocked(true);
          setAccountOpen(true);
        }
        const progressData = progressResponse.ok
          ? await progressResponse.json() as ProgressResponse
          : null;
        if (!active || !progressData?.profile) return;
        if (progressData.learningQueue?.length) {
          setQueue(progressData.learningQueue);
          setQueueIndex(0);
          setStepIndex(0);
        }
        setScores(progressData.profile.scores);
        setCompletedToday(Math.min(dailyWords.length, progressData.profile.completedToday));
        const savedStudySeconds = Math.min(DAILY_SESSION_SECONDS, progressData.profile.studySecondsToday);
        studySecondsRef.current = savedStudySeconds;
        setStudySecondsToday(savedStudySeconds);
        setCompletedLearningDays(progressData.profile.completedLearningDays ?? 0);
        setDayCompletedAtLoad(Boolean(progressData.profile.dailySessionCompleted));
        if (progressData.profile.dailySessionCompleted) setCompleted(true);
        setStreak(progressData.profile.streak);
      } catch {
        if (!active) return;
        const destination = entryDestination({ authenticated: hasSession, learnerId, hasChallenge });
        if (destination !== "learn") {
          window.location.replace(destination === "diagnosis" ? "/diagnosis" : "/parent");
          return;
        }
        setEntryReady(true);
      } finally {
        if (active) setIsProgressLoaded(true);
      }
    };

    void loadAccountAndProgress();

    return () => { active = false; };
  }, [learnerId]);

  useEffect(() => {
    if (!accountOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [accountOpen]);

  const flushStudyTime = useCallback(async (keepalive = false) => {
    if (!isFamilyLearner || heartbeatInFlight.current || pendingStudySeconds.current < 1) return;
    const seconds = Math.min(60, pendingStudySeconds.current);
    pendingStudySeconds.current -= seconds;
    heartbeatInFlight.current = true;
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ action: "heartbeat", learnerId, studySeconds: seconds, locale }),
        keepalive,
      });
      if (response.status === 402) {
        setAccessBlocked(true);
        setAccountOpen(true);
        return;
      }
      if (!response.ok) throw new Error("Study heartbeat failed");
      const data = await response.json() as ProgressResponse & { acceptedStudySeconds?: number };
      const acceptedStudySeconds = Math.max(0, Math.min(seconds, data.acceptedStudySeconds ?? seconds));
      if (acceptedStudySeconds < seconds) pendingStudySeconds.current += seconds - acceptedStudySeconds;
      if (data.profile) {
        const saved = Math.min(DAILY_SESSION_SECONDS, data.profile.studySecondsToday);
        const current = Math.max(studySecondsRef.current, saved);
        studySecondsRef.current = current;
        setStudySecondsToday(current);
      }
    } catch {
      pendingStudySeconds.current += seconds;
    } finally {
      heartbeatInFlight.current = false;
    }
  }, [authToken, isFamilyLearner, learnerId, locale]);

  useEffect(() => {
    if (!isProgressLoaded || !isFamilyLearner || isDayComplete) return;

    const markActive = () => { lastInteractionAt.current = Date.now(); };
    markActive();
    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);
    window.addEventListener("focus", markActive);

    const interval = window.setInterval(() => {
      const visible = document.visibilityState === "visible" && document.hasFocus();
      const recentlyActive = Date.now() - lastInteractionAt.current < IDLE_PAUSE_SECONDS * 1000;
      const active = visible && recentlyActive && !accountOpen && !challengeOpen;
      setTimerPaused(!active);
      if (!active || studySecondsRef.current >= DAILY_SESSION_SECONDS) return;

      const next = Math.min(DAILY_SESSION_SECONDS, studySecondsRef.current + 1);
      studySecondsRef.current = next;
      pendingStudySeconds.current += 1;
      setStudySecondsToday(next);
      if (pendingStudySeconds.current >= HEARTBEAT_SECONDS) void flushStudyTime();
    }, 1000);

    const flushBeforeLeave = () => { void flushStudyTime(true); };
    window.addEventListener("pagehide", flushBeforeLeave);
    document.addEventListener("visibilitychange", flushBeforeLeave);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("focus", markActive);
      window.removeEventListener("pagehide", flushBeforeLeave);
      document.removeEventListener("visibilitychange", flushBeforeLeave);
      void flushStudyTime(true);
    };
  }, [accountOpen, challengeOpen, flushStudyTime, isDayComplete, isFamilyLearner, isProgressLoaded]);

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    window.localStorage.setItem("loopvoca-locale", nextLocale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLocale);
    window.history.replaceState({}, "", url);
  };

  const saveResult = async (
    skill: SkillKey,
    verification: { answer?: string; evaluationReceiptId?: string } = {},
  ) => {
    if (!learnerId) return;
    setLastSaved(false);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ learnerId, wordId: word.id, skill, locale, ...verification }),
      });
      if (response.status === 402) {
        setAccessBlocked(true);
        setAccountOpen(true);
        return;
      }
      if (!response.ok) return;
      const data = (await response.json()) as ProgressResponse;
      if (data.profile) {
        setScores(data.profile.scores);
        setCompletedToday(Math.min(dailyWords.length, data.profile.completedToday));
        const savedStudySeconds = Math.min(DAILY_SESSION_SECONDS, data.profile.studySecondsToday);
        studySecondsRef.current = savedStudySeconds;
        setStudySecondsToday(savedStudySeconds);
        setStreak(data.profile.streak);
      }
      setLastSaved(true);
    } catch {
      // The learning interaction remains usable while persistence reconnects.
    }
  };

  const applyResult = (
    correct: boolean,
    evaluationScore = correct ? 92 : 42,
    text?: string,
    source?: FeedbackState["source"],
    verification: { answer?: string; evaluationReceiptId?: string } = {},
  ) => {
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
    void saveResult(stepKey, verification);
  };

  const chooseAnswer = (choice: string) => {
    if (feedback.status !== "idle") return;
    setSelected(choice);
    applyResult(choice === correctChoice, choice === correctChoice ? 92 : 42, undefined, undefined, { answer: choice });
  };

  const checkRecall = async (event: FormEvent) => {
    event.preventDefault();
    if (!recall.trim() || isChecking) return;
    setIsChecking(true);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          learnerId,
          word: word.word,
          target: word.example,
          answer: recall,
          meaning: word.exampleKo,
          locale,
          mode: "cloze",
        }),
      });
      const result = (await response.json()) as {
        correct?: boolean;
        score?: number;
        feedbackKo?: string;
        feedbackEn?: string;
        source?: "openai" | "local-fallback";
        evaluationReceiptId?: string;
      };
      if (!response.ok) throw new Error("Recall evaluation failed");
      applyResult(
        Boolean(result.correct),
        result.score ?? (result.correct ? 92 : 42),
        locale === "ko" ? result.feedbackKo : result.feedbackEn,
        result.source,
        { evaluationReceiptId: result.evaluationReceiptId },
      );
    } catch {
      const normalized = recall.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
      const target = word.contextChoices[0].toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
      applyResult(normalized === target, normalized === target ? 92 : 42, undefined, "local-fallback");
    } finally {
      setIsChecking(false);
    }
  };

  const checkOptionalSentence = async () => {
    if (!optionalSentence.trim() || isCheckingOptional || optionalFeedback.status !== "idle") return;
    setIsCheckingOptional(true);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          learnerId,
          word: word.word,
          target: word.example,
          answer: optionalSentence,
          meaning: word.meaningKo,
          locale,
          mode: "challenge",
        }),
      });
      const result = (await response.json()) as {
        correct?: boolean;
        feedbackKo?: string;
        feedbackEn?: string;
        source?: "openai" | "local-fallback";
      };
      if (!response.ok) throw new Error("Optional sentence evaluation failed");
      setOptionalFeedback({
        status: result.correct ? "correct" : "retry",
        text: (locale === "ko" ? result.feedbackKo : result.feedbackEn) || (result.correct ? t.correct : t.retry),
        source: result.source,
      });
    } catch {
      const normalized = optionalSentence.toLowerCase().replace(/[^a-z\s']/g, " ").replace(/\s+/g, " ").trim();
      const variants = [word.word, word.contextChoices[0]].map((value) => value.toLowerCase());
      const tokens = normalized.split(" ");
      const correct = tokens.length >= 3 && variants.some((variant) => tokens.includes(variant));
      setOptionalFeedback({
        status: correct ? "correct" : "retry",
        text: correct
          ? (locale === "ko" ? "배운 단어를 문장에 넣었어요. 소리 내어 읽어보세요." : "You used the word in a sentence. Read it aloud once.")
          : (locale === "ko" ? `‘${word.word}’를 넣은 짧은 문장으로 다시 써보세요.` : `Try one short sentence that includes “${word.word}”.`),
        source: "local-fallback",
      });
    } finally {
      setIsCheckingOptional(false);
    }
  };

  const advance = () => {
    if (feedback.status === "retry") {
      setFeedback({ status: "idle", text: "" });
      setSelected("");
      setRecall("");
      setOptionalSentenceOpen(false);
      setOptionalSentence("");
      setOptionalFeedback({ status: "idle", text: "" });
      return;
    }

    if (stepIndex === activeSkillOrder.length - 1) {
      if (!completedIds.has(word.id)) {
        setCompletedIds((current) => new Set(current).add(word.id));
        if (!isFamilyLearner) setCompletedToday((current) => Math.min(dailyWords.length, current + 1));
      }
      setCompleted(true);
      if (!isFamilyLearner) setAccountOpen(true);
      return;
    }

    setStepIndex((current) => current + 1);
    setSelected("");
    setFeedback({ status: "idle", text: "" });
  };

  const nextWord = () => {
    if (!isFamilyLearner) {
      setAccountOpen(true);
      return;
    }
    let nextQueue = queue;
    if (wordHadError) {
      const retryCount = retryCounts.current.get(word.id) ?? 0;
      const retry = insertBoundedRetry(queue, queueIndex, retryCount);
      nextQueue = retry.queue;
      if (retry.inserted) retryCounts.current.set(word.id, retryCount + 1);
    }
    if (queueIndex >= nextQueue.length - 1) {
      setQueue(shuffledDailyWords(`${dateKey()}-${completedToday}`).map((item) => ({
        wordId: item.id,
        focusSkill: weakest[0],
        reason: "future",
        mastery: null,
        dueAt: null,
      })));
      setQueueIndex(0);
    } else {
      setQueue(nextQueue);
      setQueueIndex((current) => current + 1);
    }
    setStepIndex(0);
    setSelected("");
    setRecall("");
    setOptionalSentenceOpen(false);
    setOptionalSentence("");
    setOptionalFeedback({ status: "idle", text: "" });
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
        : t.recallTitle(word.word);

  const focusProgressPercent = Math.round((studySecondsToday / DAILY_SESSION_SECONDS) * 100);
  const remainingTime = formatRemainingTime(studySecondsToday);
  const timerCaption = isDayComplete
    ? t.timerDone
    : !isFamilyLearner
      ? t.timerReady
      : timerPaused
        ? t.timerPaused
        : t.timerRunning;
  const displayName = account.user?.displayName || account.user?.email || "JY";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "JY";

  const shareContent = async (title: string, text: string, url: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShareNotice(t.shareSuccess);
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShareNotice(t.copySuccess);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setShareNotice(t.copySuccess);
      } catch {
        setShareNotice(url);
      }
    }
    window.setTimeout(() => setShareNotice(""), 2800);
  };

  const shareAchievement = () => {
    const title = locale === "ko" ? "15Loop 오늘의 성장" : "My 15Loop growth";
    const text = locale === "ko"
      ? `오늘 ${Math.floor(studySecondsToday / 60)}분 동안 ${completedToday}개 단어를 연결하고 ${streak}일째 학습 중이에요.`
      : `I connected ${completedToday} words in ${Math.floor(studySecondsToday / 60)} focused minutes and kept a ${streak}-day learning streak.`;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("lang", locale);
    void shareContent(title, text, url.toString());
  };

  const shareChallenge = (score?: number) => {
    const words = challengeWords.length === 5 ? challengeWords : buildChallengeWords(word.id);
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("challenge", words.map((item) => item.id).join(","));
    url.searchParams.set("lang", locale);
    if (typeof score === "number") url.searchParams.set("score", String(score));
    const title = locale === "ko" ? "15Loop 5단어 챌린지" : "15Loop 5-word challenge";
    const text = locale === "ko"
      ? "소리만 듣고 5단어를 맞혀볼래? 실력 순위 없이 가볍게 도전해 봐!"
      : "Can you connect 5 words from sound alone? No leaderboard—just a friendly challenge!";
    void shareContent(title, text, url.toString());
  };

  const startChallenge = () => {
    setChallengeIndex(0);
    setChallengeScore(0);
    setChallengeChoice("");
    setChallengeState("playing");
    if (challengeWords[0]) speak(challengeWords[0].word);
  };

  const chooseChallengeAnswer = (choice: string) => {
    if (challengeChoice || !challengeWord) return;
    setChallengeChoice(choice);
    if (choice === challengeAnswer) setChallengeScore((current) => current + 1);
    speak(challengeWord.word);
  };

  const advanceChallenge = () => {
    if (challengeIndex >= challengeWords.length - 1) {
      setChallengeState("complete");
      return;
    }
    const nextIndex = challengeIndex + 1;
    setChallengeIndex(nextIndex);
    setChallengeChoice("");
    speak(challengeWords[nextIndex].word);
  };

  const closeChallenge = () => {
    setChallengeOpen(false);
    if (!account.authenticated) {
      window.location.replace("/diagnosis");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("challenge");
    url.searchParams.delete("score");
    window.history.replaceState({}, "", url);
  };

  if (!entryReady) {
    return (
      <main className="entry-gate" aria-live="polite">
        <div className="brand"><span className="brand-mark">15</span><span>15LOOP</span></div>
        <p>{locale === "ko" ? "무료 진단으로 연결하고 있어요." : "Opening your free diagnostic."}</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={t.home}>
          <span className="brand-mark">15</span>
          <span>15LOOP</span>
        </a>
        <div className="topbar-actions">
          <div className="engine-pill">
            <span>✦</span>{" "}
            {feedback.source === "openai" ? t.model : feedback.source === "local-fallback" ? t.local : t.engine}
          </div>
          <a className="topbar-link" href="/diagnosis">{locale === "ko" ? "무료 진단" : "Free check"}</a>
          <div className="language-toggle" role="group" aria-label="Language">
            <button className={locale === "ko" ? "active" : ""} onClick={() => changeLocale("ko")}>KO</button>
            <button className={locale === "en" ? "active" : ""} onClick={() => changeLocale("en")}>EN</button>
          </div>
          <div className="streak"><span>●</span> {t.streak(streak)}</div>
          <button className="account-trigger" onClick={() => setAccountOpen(true)} aria-label={t.account}>
            <span className="account-label">{account.authenticated ? displayName : t.saveProfile}</span>
            <span className="profile">{initials}</span>
          </button>
        </div>
      </header>

      {accountNotice && (
        <button className="account-notice" onClick={() => setAccountNotice(false)} aria-label={t.close}>
          <span>✓</span> {t.claimed}
        </button>
      )}

      {shareNotice && (
        <button className="share-notice" onClick={() => setShareNotice("")} aria-label={t.close}>
          <span>✓</span> {shareNotice}
        </button>
      )}

      <section className="hero" id="top">
        <div>
          <div className="kicker"><span>AI EVALUATION</span> {t.kicker}</div>
          <h1>{t.headlineA}<br /><em>{t.headlineB}</em> {t.headlineC}</h1>
        </div>
        <div className="today-stat" aria-label={`${t.today} ${remainingTime}, ${t.wordsToday(completedToday)}`}>
          <span>{t.today}</span>
          <strong>{remainingTime}</strong>
          <small className="timer-caption">{t.wordsToday(completedToday)} · {timerCaption}</small>
          <div className="mini-progress"><i style={{ width: `${focusProgressPercent}%` }} /></div>
        </div>
      </section>

      <section className="workspace">
        <div className="learn-column">
          <div className="step-tabs" aria-label="Evaluation stages">
            {activeSkillOrder.map((item, index) => (
              <button
                type="button"
                className={`step-tab ${index === stepIndex && !completed ? "active" : ""} ${index < stepIndex || completed ? "done" : ""} ${stageInfo === item ? "explaining" : ""}`}
                aria-current={index === stepIndex && !completed ? "step" : undefined}
                aria-expanded={stageInfo === item}
                aria-controls="stage-explanation"
                onClick={() => setStageInfo((current) => current === item ? null : item)}
                key={item}
              >
                <span>{index < stepIndex || completed ? "✓" : index + 1}</span>
                <b>{skillLabels[item]}</b>
              </button>
            ))}
          </div>
          {stageInfo ? (
            <div className="step-explanation" id="stage-explanation" aria-live="polite">
              <b>{skillLabels[stageInfo]}</b>
              <span>{t.helpers[skillOrder.indexOf(stageInfo)]}</span>
            </div>
          ) : null}

          {isDayComplete && completed ? (
            <article className="result-card day-complete-card">
              <div className="result-badge">DAILY LOOP COMPLETE</div>
              <p className="result-number">{String(completedToday).padStart(2, "0")}</p>
              {(() => {
                const journeyDays = Math.min(7, completedLearningDays + (isDayComplete && !dayCompletedAtLoad ? 1 : 0));
                return (
                  <div className="journey-dots" aria-label={t.journey(journeyDays)}>
                    {Array.from({ length: 7 }, (_, index) => (
                      <i key={index} className={index < journeyDays ? "filled" : ""} />
                    ))}
                    <span>{t.journey(journeyDays)}</span>
                  </div>
                );
              })()}
              <h2>{t.dayComplete}</h2>
              <p>{t.dayCompleteBody(completedToday)}</p>
              <div className="result-actions">
                <button className="primary-button" onClick={shareAchievement}>{t.shareAchievement} <span>↗</span></button>
                <button className="ghost-button light-button" onClick={() => shareChallenge()}>{t.sendChallenge}</button>
              </div>
            </article>
          ) : !completed ? (
            <article className="quiz-card">
              <div className="quiz-heading">
                <div>
                  <p>{t.eyebrows[copySkillIndex]}</p>
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
                  <div className="recall-cloze">
                    <p>{word.exampleBlank.split("_____")[0]}<b>_____</b>{word.exampleBlank.split("_____")[1]}</p>
                    <small>{locale === "ko" ? word.exampleKo : word.contextEn}</small>
                  </div>
                  <label htmlFor="recall-answer">{t.sentenceLabel}</label>
                  <div className="recall-input-row">
                    <input
                      id="recall-answer"
                      value={recall}
                      onChange={(event) => setRecall(event.target.value)}
                      placeholder="_____"
                      autoComplete="off"
                      disabled={feedback.status !== "idle"}
                    />
                    <button type="submit" disabled={!recall.trim() || feedback.status !== "idle" || isChecking}>
                      {isChecking ? t.evaluating : t.evaluate}
                    </button>
                  </div>
                  {feedback.status === "correct" && (
                    <div className="recall-complete">
                      <p>{word.example}</p>
                      <button type="button" onClick={() => speak(word.example)}>▶ {t.listenAndRepeat}</button>
                    </div>
                  )}
                  {feedback.status === "correct" && !optionalSentenceOpen && (
                    <button className="optional-challenge-trigger" type="button" onClick={() => setOptionalSentenceOpen(true)}>
                      ✦ {t.optionalChallenge}
                    </button>
                  )}
                  {feedback.status === "correct" && optionalSentenceOpen && (
                    <div className="optional-sentence-panel">
                      <div className="optional-sentence-heading">
                        <div><b>{t.optionalChallenge}</b><p>{t.optionalChallengeBody}</p></div>
                        <button type="button" onClick={() => setOptionalSentenceOpen(false)}>{t.optionalClose}</button>
                      </div>
                      <label htmlFor="optional-sentence">{t.optionalSentenceLabel}</label>
                      <div className="optional-sentence-row">
                        <textarea
                          id="optional-sentence"
                          value={optionalSentence}
                          onChange={(event) => {
                            setOptionalSentence(event.target.value);
                            setOptionalFeedback({ status: "idle", text: "" });
                          }}
                          placeholder={t.optionalSentencePlaceholder(word.word)}
                          maxLength={300}
                          disabled={optionalFeedback.status === "correct"}
                        />
                        <button type="button" onClick={checkOptionalSentence} disabled={!optionalSentence.trim() || isCheckingOptional || optionalFeedback.status === "correct"}>
                          {isCheckingOptional ? t.optionalEvaluating : t.optionalEvaluate}
                        </button>
                      </div>
                      {optionalFeedback.status !== "idle" && (
                        <p className={`optional-sentence-feedback ${optionalFeedback.status}`} aria-live="polite">
                          {optionalFeedback.text}
                          {optionalFeedback.source && <small>{optionalFeedback.source === "openai" ? t.model : t.local}</small>}
                        </p>
                      )}
                    </div>
                  )}
                </form>
              )}

              <div className="feedback-row">
                <div>
                  <p className={`feedback ${feedback.status}`} aria-live="polite">
                    {feedback.status === "idle" ? t.helpers[copySkillIndex] : feedback.text}
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
                    {feedback.status === "retry" ? t.retryButton : stepIndex === activeSkillOrder.length - 1 ? t.seeResult : t.nextStage} <span>→</span>
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
                <button className="ghost-button" onClick={shareAchievement}>{t.shareAchievement}</button>
                <button className="ghost-button challenge-button" onClick={() => shareChallenge()}>{t.sendChallenge}</button>
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
        <span>15Loop Learning Loop Engine · GPT-5.6</span>
        <p>{t.footer}</p>
      </footer>

      {accountOpen && (
        <div className="account-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAccountOpen(false);
        }}>
          <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button className="modal-close" onClick={() => setAccountOpen(false)} aria-label={t.close}>×</button>
            <span className="modal-kicker">15LOOP PROFILE</span>
            {isFamilyLearner ? (
              <>
                <div className="modal-avatar">{initials}</div>
                <h2 id="account-title">{t.accountTitle}</h2>
                <p>{t.accountBody}</p>
                <div className="account-identity">
                  <strong>{displayName}</strong>
                  <span>{account.user?.email}</span>
                </div>
                <a className="modal-secondary" href="/parent">{t.signOut}</a>
              </>
            ) : (
              <>
                <div className="modal-symbol">↻</div>
                <h2 id="account-title">{accessBlocked ? t.accessExpiredTitle : t.saveTitle}</h2>
                <p>{accessBlocked ? t.accessExpiredBody : t.saveBody}</p>
                <a className="modal-primary" href="/parent">{accessBlocked ? t.accessExpiredAction : t.savePrimary} <span>→</span></a>
                {!accessBlocked && <a className="modal-secondary" href="/diagnosis">{t.saveLater}</a>}
                <small>{t.saveTrust}</small>
              </>
            )}
          </section>
        </div>
      )}


      {challengeOpen && (
        <div className="challenge-backdrop" role="presentation">
          <section className="challenge-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
            {challengeState === "intro" && (
              <>
                <span className="challenge-kicker">{t.challengeBadge}</span>
                <div className="challenge-orbit"><span>5</span></div>
                <h2 id="challenge-title">{t.challengeTitle}</h2>
                <p>{t.challengeBody}</p>
                {friendScore !== null && <div className="friend-score">{t.friendScore(friendScore)}</div>}
                <div className="challenge-facts"><span>5 WORDS</span><span>≈ 2 MIN</span><span>NO RANKING</span></div>
                <button className="modal-primary" onClick={startChallenge}>{t.challengeStart} <span>→</span></button>
                <button className="modal-secondary" onClick={closeChallenge}>{t.challengeLater}</button>
                <small>{t.challengePrivacy}</small>
              </>
            )}

            {challengeState === "playing" && challengeWord && (
              <>
                <div className="challenge-progress-row">
                  <span>{t.challengeBadge}</span>
                  <b>{challengeIndex + 1} / {challengeWords.length}</b>
                </div>
                <div className="challenge-progress"><i style={{ width: `${((challengeIndex + 1) / challengeWords.length) * 100}%` }} /></div>
                <button className="challenge-audio" onClick={() => speak(challengeWord.word)} aria-label={t.challengeListen}>
                  <span className="audio-ring"><span>▶</span></span>
                  <b>{t.challengeListen}</b>
                </button>
                <h2 id="challenge-title">{t.challengePrompt}</h2>
                <div className="challenge-choices">
                  {challengeChoices.map((choice) => (
                    <button
                      key={choice}
                      className={`${challengeChoice === choice ? "selected" : ""} ${challengeChoice && choice === challengeAnswer ? "answer" : ""}`}
                      onClick={() => chooseChallengeAnswer(choice)}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                {challengeChoice && (
                  <div className={`challenge-feedback ${challengeChoice === challengeAnswer ? "correct" : "retry"}`}>
                    <div>
                      <b>{challengeWord.word}</b>
                      <span>{challengeAnswer}</span>
                      <p>{challengeChoice === challengeAnswer ? t.challengeCorrect : t.challengeRetry}</p>
                    </div>
                    <button onClick={advanceChallenge}>
                      {challengeIndex === challengeWords.length - 1 ? t.challengeFinish : t.challengeNext} →
                    </button>
                  </div>
                )}
              </>
            )}

            {challengeState === "complete" && (
              <>
                <span className="challenge-kicker">{t.challengeBadge}</span>
                <p className="challenge-score-number">{challengeScore}</p>
                <h2 id="challenge-title">{t.challengeComplete}</h2>
                <div className="challenge-result-line">{t.challengeScore(challengeScore)}</div>
                {friendScore !== null && <div className="friend-score">{t.friendScore(friendScore)}</div>}
                <button className="modal-primary" onClick={() => shareChallenge(challengeScore)}>{t.challengeShareBack} <span>↗</span></button>
                <button className="modal-secondary" onClick={closeChallenge}>{t.challengeClose}</button>
                <small>{t.challengePrivacy}</small>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
