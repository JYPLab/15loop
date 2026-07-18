"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { authNextStorageKey, getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase-browser";

type Learner = {
  id: string;
  displayName: string;
  grade: string;
  streak: number;
  completedLearningDays: number;
  completedToday: number;
  studySecondsToday: number;
  dailySessionCompleted: boolean;
  scores: Record<"see" | "hear" | "context" | "recall", number>;
};

type ParentProfile = {
  account: {
    email: string;
    displayName: string;
    trialEndsAt: string;
    planCode: string;
    planStatus: string;
    paidUntil: string | null;
    termsVersion: string;
    privacyVersion: string;
    guardianConfirmed: boolean;
    consentAcceptedAt: string | null;
    hasAcceptedPolicies: boolean;
  };
  learners: Learner[];
  diagnostics: Array<{
    id: string;
    learnerId: string | null;
    itemCount: number;
    seeScore: number;
    hearScore: number;
    contextScore: number;
    recallScore: number;
    recommendedLevel: string;
    completedAt: string;
  }>;
  orders: Array<{ id: string; orderName: string; amount: number; status: string; receiptUrl: string | null; createdAt: string }>;
  pricePresented: boolean;
  priceIntentAnswered: boolean;
  createdLearnerId?: string | null;
};

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

function gradeLabel(grade: string) {
  const values: Record<string, string> = {
    "elementary-5": "초등 5학년",
    "elementary-6": "초등 6학년",
    "middle-1": "중학교 1학년",
    "middle-2": "중학교 2학년",
    "middle-3": "중학교 3학년",
  };
  return values[grade] ?? grade;
}

export default function ParentPage() {
  const configured = isSupabaseConfigured();
  const googleAuthEnabled = configured;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(configured);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("middle-1");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [diagnosticId] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("diagnostic") || window.localStorage.getItem("loopvoca-latest-diagnostic") || "";
  });
  const [renderedAt] = useState(() => Date.now());

  const fetchProfile = useCallback(async (activeSession: Session) => {
    const response = await fetch("/api/commercial/profile", { headers: authHeaders(activeSession) });
    const data = await response.json() as ParentProfile & { error?: string };
    if (!response.ok) throw new Error(data.error || "부모 계정을 불러오지 못했습니다.");
    setProfile(data);
    return data;
  }, []);

  const claimDiagnostic = useCallback(async (activeSession: Session, id: string, learnerId?: string) => {
    const localRaw = window.localStorage.getItem(`loopvoca-diagnostic:${id}`);
    if (!localRaw) return;
    const local = JSON.parse(localRaw) as {
      sessionId: string;
      guestLearnerId: string;
      answers: unknown[];
      scores: Record<string, number>;
      level: string;
    };
    await fetch("/api/diagnosis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: local.sessionId,
        guestLearnerId: local.guestLearnerId,
        answers: local.answers,
        scores: local.scores,
        recommendedLevel: local.level,
      }),
    });
    const response = await fetch("/api/commercial/profile", {
      method: "POST",
      headers: authHeaders(activeSession),
      body: JSON.stringify({ action: "claimDiagnostic", diagnosticId: id, guestLearnerId: local.guestLearnerId, learnerId }),
    });
    const data = await response.json() as ParentProfile & { error?: string };
    if (!response.ok) throw new Error(data.error || "진단 결과를 연결하지 못했습니다.");
    setProfile(data);
  }, []);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    const params = new URLSearchParams(window.location.search);
    const requestedDiagnostic = params.get("diagnostic") || window.localStorage.getItem("loopvoca-latest-diagnostic") || "";
    if (!client) return;

    let active = true;
    void client.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        try {
          const loaded = await fetchProfile(data.session);
          if (requestedDiagnostic && loaded.account.hasAcceptedPolicies) {
            await claimDiagnostic(data.session, requestedDiagnostic);
          }
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "계정을 불러오지 못했습니다.");
        }
      }
      setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) void fetchProfile(nextSession).catch((error) => setMessage(error.message));
      else setProfile(null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [claimDiagnostic, fetchProfile]);

  const signInWithGoogle = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusy("google");
    const next = `/parent${diagnosticId ? `?diagnostic=${encodeURIComponent(diagnosticId)}` : ""}`;
    window.localStorage.setItem(authNextStorageKey, next);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setMessage(error.message);
      setBusy("");
    }
  };

  const signInWithEmail = async (event: FormEvent) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client || !email.trim()) return;
    setBusy("email");
    const next = `/parent${diagnosticId ? `?diagnostic=${encodeURIComponent(diagnosticId)}` : ""}`;
    window.localStorage.setItem(authNextStorageKey, next);
    const emailRedirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo, shouldCreateUser: true } });
    setBusy("");
    if (error) setMessage(error.message);
    else setEmailSent(true);
  };

  const addLearner = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !nickname.trim()) return;
    setBusy("learner");
    setMessage("");
    const response = await fetch("/api/commercial/profile", {
      method: "POST",
      headers: authHeaders(session),
      body: JSON.stringify({ action: "addLearner", nickname, grade }),
    });
    const data = await response.json() as ParentProfile & { error?: string };
    setBusy("");
    if (!response.ok) {
      setMessage(data.error || "아이 프로필을 추가하지 못했습니다.");
      return;
    }
    setProfile(data);
    setNickname("");
    if (diagnosticId) {
      const createdLearnerId = data.createdLearnerId;
      if (createdLearnerId) {
        try {
          await claimDiagnostic(session, diagnosticId, createdLearnerId);
          setMessage("진단과 가입 전 학습 기록을 이 아이에게 연결했습니다.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "진단 결과를 연결하지 못했습니다.");
        }
      }
    }
  };

  const acceptPolicies = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !termsAccepted || !privacyAccepted || !guardianConfirmed) return;
    setBusy("consent");
    setMessage("");
    const response = await fetch("/api/commercial/profile", {
      method: "POST",
      headers: authHeaders(session),
      body: JSON.stringify({
        action: "acceptPolicies",
        termsAccepted,
        privacyAccepted,
        guardianConfirmed,
      }),
    });
    const data = await response.json() as ParentProfile & { error?: string };
    setBusy("");
    if (!response.ok) {
      setMessage(data.error || "보호자 동의를 저장하지 못했습니다.");
      return;
    }
    setProfile(data);
    if (diagnosticId) {
      try {
        await claimDiagnostic(session, diagnosticId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "진단 결과를 연결하지 못했습니다.");
      }
    }
  };

  useEffect(() => {
    if (!session || !profile?.account.hasAcceptedPolicies || profile.pricePresented) return;
    void fetch("/api/commercial/profile", {
      method: "POST",
      headers: authHeaders(session),
      body: JSON.stringify({ action: "pricePresented" }),
    }).then(async (response) => {
      if (response.ok) setProfile(await response.json() as ParentProfile);
    }).catch(() => {});
  }, [session, profile?.account.hasAcceptedPolicies, profile?.pricePresented]);

  const answerPriceIntent = async (answer: "yes" | "unsure" | "no") => {
    if (!session) return;
    setBusy("priceIntent");
    setMessage("");
    const response = await fetch("/api/commercial/profile", {
      method: "POST",
      headers: authHeaders(session),
      body: JSON.stringify({ action: "priceIntent", priceIntent: answer }),
    });
    const data = await response.json() as ParentProfile & { error?: string };
    setBusy("");
    if (!response.ok) {
      setMessage(data.error || "답변을 저장하지 못했습니다.");
      return;
    }
    setProfile(data);
    setMessage("답변을 저장했습니다. 베타 운영에 큰 도움이 됩니다.");
  };

  const submitFeedback = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || feedbackMessage.trim().length < 5) return;
    setBusy("feedback");
    setMessage("");
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: authHeaders(session),
      body: JSON.stringify({ category: feedbackCategory, message: feedbackMessage }),
    });
    const data = await response.json() as { error?: string };
    setBusy("");
    if (!response.ok) {
      setMessage(data.error || "피드백을 저장하지 못했습니다.");
      return;
    }
    setFeedbackMessage("");
    setMessage("피드백을 저장했습니다. 오픈 베타 개선에 반영하겠습니다.");
  };

  if (loading) {
    return <main className="commerce-shell commerce-centered"><section className="commerce-message-card"><span className="commerce-spinner" /><h1>가족 계정을 준비하고 있어요…</h1></section></main>;
  }

  if (!session) {
    return (
      <main className="commerce-shell">
        <header className="commerce-topbar">
          <Link className="brand" href="/"><span className="brand-mark">15</span><span>15LOOP</span></Link>
          <Link className="commerce-text-link" href="/diagnosis">무료 진단</Link>
        </header>
        <section className="parent-auth-grid">
          <div className="parent-auth-copy">
            <span className="commerce-kicker">OPEN BETA · 초5·6 · 중1</span>
            <h1>{diagnosticId
              ? <>방금 확인한 진단 결과를<br /><em>저장하고 7일 학습</em>을 시작하세요.</>
              : <>아이의 영어 연결을<br /><em>7일 동안</em> 확인해보세요.</>}</h1>
            <p>초등 5·6학년과 중학교 1학년을 위한 첫 오픈 베타입니다. 가입 즉시 결제정보 없이 무료 프로그램이 시작됩니다.</p>
            <ul><li>아이 최대 3명까지 분리 관리</li><li>진단부터 매일 15분 맞춤 학습</li><li>베타 기간 결제·자동 결제 없음</li><li>7일 무료 · 정식 출시 예정: 30일 이용권 12,900원</li></ul>
          </div>
          <section className="parent-auth-card">
            <h2>부모 계정 만들기</h2>
            <p>아이에게 계정을 만들게 하지 않습니다.</p>
            {!configured && <div className="commerce-setup-note"><b>로컬 인증 설정 필요</b><span>.env.local에 Supabase URL과 공개 키를 입력하면 실제 가입이 활성화됩니다.</span></div>}
            <button className="google-button" onClick={signInWithGoogle} disabled={!configured || !googleAuthEnabled || Boolean(busy)}><span>G</span>{busy === "google" ? "Google 연결 중…" : googleAuthEnabled ? "Google로 계속" : "Google 가입 준비 중"}</button>
            <div className="auth-divider"><span>또는</span></div>
            {emailSent ? (
              <div className="email-sent"><b>이메일을 확인해주세요.</b><p>{email}로 로그인 링크를 보냈습니다.</p><button onClick={() => setEmailSent(false)}>다른 이메일 사용</button></div>
            ) : (
              <form className="email-auth-form" onSubmit={signInWithEmail}>
                <label htmlFor="parent-email">이메일</label>
                <input id="parent-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="parent@example.com" autoComplete="email" disabled={!configured} required />
                <button disabled={!configured || !email.trim() || Boolean(busy)}>{busy === "email" ? "링크 보내는 중…" : "이메일 링크 받기"}</button>
              </form>
            )}
            <small>현재 베타 운영 중입니다. 가입 전 <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보 처리방침</Link>을 확인해주세요.</small>
            {message && <p className="commerce-error">{message}</p>}
          </section>
        </section>
      </main>
    );
  }

  if (!profile) {
    return <main className="commerce-shell commerce-centered"><section className="commerce-message-card"><span className="commerce-spinner" /><h1>가족 학습 공간을 불러오고 있어요…</h1></section></main>;
  }

  if (!profile.account.hasAcceptedPolicies) {
    return (
      <main className="commerce-shell">
        <header className="commerce-topbar">
          <Link className="brand" href="/"><span className="brand-mark">15</span><span>15LOOP</span></Link>
          <button className="commerce-text-link" onClick={() => getSupabaseBrowserClient()?.auth.signOut()}>로그아웃</button>
        </header>
        <section className="consent-shell">
          <div><span className="commerce-kicker">PARENT FIRST</span><h1>아이의 학습 정보를 연결하기 전에<br />보호자 확인이 필요해요.</h1><p>아이에게 이메일이나 비밀번호를 요구하지 않습니다. 닉네임·학년·진단·학습 기록만 부모 계정 아래에서 관리합니다.</p></div>
          <form className="consent-card" onSubmit={acceptPolicies}>
            <h2>보호자 동의</h2>
            <label><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span><Link href="/terms" target="_blank">이용약관</Link>을 확인하고 동의합니다.</span></label>
            <label><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} /><span><Link href="/privacy" target="_blank">개인정보 처리방침</Link>과 수집·이용 내용을 확인하고 동의합니다.</span></label>
            <label><input type="checkbox" checked={guardianConfirmed} onChange={(event) => setGuardianConfirmed(event.target.checked)} /><span>본인은 등록할 아이의 보호자이며 학습 정보 처리에 동의할 권한이 있음을 확인합니다.</span></label>
            <button disabled={!termsAccepted || !privacyAccepted || !guardianConfirmed || busy === "consent"}>{busy === "consent" ? "동의 저장 중…" : "동의하고 가족 학습 시작"}</button>
            <small>동의하지 않으면 부모 계정에 아이 프로필과 진단 결과를 연결하지 않습니다.</small>
            {message && <p className="commerce-error">{message}</p>}
          </form>
        </section>
      </main>
    );
  }

  const trialDays = profile ? Math.max(0, Math.ceil((new Date(profile.account.trialEndsAt).getTime() - renderedAt) / 86_400_000)) : 0;
  const accessUntil = profile?.account.paidUntil || profile?.account.trialEndsAt;

  return (
    <main className="commerce-shell parent-dashboard">
      <header className="commerce-topbar">
        <Link className="brand" href="/"><span className="brand-mark">15</span><span>15LOOP</span></Link>
        <div className="commerce-header-actions"><span>{profile?.account.email}</span><button onClick={() => getSupabaseBrowserClient()?.auth.signOut()}>로그아웃</button></div>
      </header>
      {message && <button className="commerce-banner" onClick={() => setMessage("")}>{message} ×</button>}

      <section className="parent-summary">
        <div><span className="commerce-kicker">OPEN BETA · 초5·6 · 중1</span><h1>{profile?.account.displayName || "보호자"}님의<br />가족 학습 공간</h1></div>
        <div className="access-card"><span>{profile?.account.planStatus === "active" ? "이용권 사용 중" : "무료 체험"}</span><strong>{profile?.account.planStatus === "active" ? profile.account.planCode.replace("_30", "") : `${trialDays}일 남음`}</strong><small>{accessUntil ? `${new Date(accessUntil).toLocaleDateString("ko-KR")}까지 이용` : ""}</small></div>
      </section>

      <section className="parent-section">
        <div className="parent-section-head"><div><span>LEARNERS</span><h2>아이 프로필</h2></div><small>{profile?.learners.length || 0} / 3명</small></div>
        <div className="learner-grid">
          {profile?.learners.map((learner) => (
            <article className="learner-card" key={learner.id}>
              <div className="learner-avatar">{learner.displayName.slice(0, 1)}</div>
              <div><h3>{learner.displayName}</h3><p>{gradeLabel(learner.grade)} · {learner.streak}일 연속</p></div>
              <p className="learner-today">오늘 {learner.completedToday}단어 · {Math.floor(learner.studySecondsToday / 60)}분{learner.dailySessionCompleted ? " 완료" : " 학습"}</p>
              <Link href={`/?learner=${encodeURIComponent(learner.id)}`}>이 아이로 학습 →</Link>
            </article>
          ))}
          {(profile?.learners.length || 0) < 3 && (
            <form className="add-learner-card" onSubmit={addLearner}>
              <b>아이 추가</b>
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="닉네임" maxLength={24} required />
              <select value={grade} onChange={(event) => setGrade(event.target.value)}>
                <option value="elementary-5">초등 5학년</option><option value="elementary-6">초등 6학년</option><option value="middle-1">중학교 1학년</option>
              </select>
              <button disabled={busy === "learner"}>{busy === "learner" ? "추가 중…" : "프로필 만들기"}</button>
            </form>
          )}
        </div>
      </section>

      {!profile.priceIntentAnswered && profile.learners.some((learner) => learner.completedLearningDays >= 3) && (
        <section className="parent-section price-intent-section">
          <div className="parent-section-head"><div><span>PRICE CHECK</span><h2>3일 학습을 완료했어요</h2></div><small>1문항 · 결제 아님</small></div>
          <p className="price-intent-question">15Loop가 정식 출시되면 30일 이용권은 12,900원입니다. 출시되면 결제를 검토하시겠어요?</p>
          <div className="price-intent-actions">
            <button className="commerce-primary" onClick={() => answerPriceIntent("yes")} disabled={busy === "priceIntent"}>네, 검토하겠습니다</button>
            <button className="price-intent-ghost" onClick={() => answerPriceIntent("unsure")} disabled={busy === "priceIntent"}>아직 모르겠어요</button>
            <button className="price-intent-ghost" onClick={() => answerPriceIntent("no")} disabled={busy === "priceIntent"}>아니요</button>
          </div>
          <small>답변은 베타 운영 참고용이며, 어떤 결제도 발생하지 않습니다.</small>
        </section>
      )}

      <section className="parent-section">
        <div className="parent-section-head"><div><span>BETA ACCESS</span><h2>7일 무료 오픈 베타</h2></div><small>결제정보를 받지 않습니다</small></div>
        <div className="plan-grid">
          <article className="plan-card recommended">
            <span className="plan-label">FIRST OPEN BETA</span>
            <h3>초5·6 · 중1 무료 프로그램</h3><p>학습자 최대 3명 · 가입일부터 7일</p>
            <strong>0<small>원</small></strong>
            <ul><li>무료 연결 진단</li><li>매일 15분 맞춤 학습</li><li>GPT 기반 인출 평가와 부모 리포트</li></ul>
            <Link className="commerce-primary" href="/diagnosis">무료 진단 다시 보기 <span>→</span></Link>
          </article>
        </div>
        <p className="payment-note">이번 오픈 베타에서는 결제수단을 등록하거나 자동 결제하지 않습니다. 정식 출시 예정: 30일 이용권 12,900원 — 베타 참여 가정에는 별도로 안내드립니다.</p>
      </section>

      <section className="parent-section">
        <div className="parent-section-head"><div><span>HISTORY</span><h2>진단과 베타 기록</h2></div></div>
        <div className="history-grid">
          <article><h3>최근 진단</h3>{profile?.diagnostics.length ? profile.diagnostics.map((item) => <p key={item.id}>{item.itemCount}단어 · 듣기 {item.hearScore} · 인출 {item.recallScore}<span>{new Date(item.completedAt).toLocaleDateString("ko-KR")}</span></p>) : <small>아직 연결된 진단이 없습니다.</small>}</article>
          <article><h3>현재 모집 대상</h3><p>초등 5·6학년 · 중학교 1학년<span>7일 무료</span></p><small>학생 연락처나 학교명은 수집하지 않습니다.</small></article>
        </div>
      </section>

      <section className="parent-section">
        <div className="parent-section-head"><div><span>OPEN BETA</span><h2>사용하면서 불편했던 점</h2></div><small>부모 의견만 저장합니다</small></div>
        <form className="beta-feedback-form" onSubmit={submitFeedback}>
          <select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)} aria-label="피드백 종류">
            <option value="suggestion">개선 제안</option><option value="bug">오류</option><option value="learning">학습 내용</option><option value="account">계정</option>
          </select>
          <textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} minLength={5} maxLength={2000} placeholder="어떤 부분이 불편했는지 알려주세요. 아이의 실명·학교·연락처는 적지 마세요." required />
          <button disabled={busy === "feedback" || feedbackMessage.trim().length < 5}>{busy === "feedback" ? "저장 중…" : "피드백 보내기"}</button>
        </form>
      </section>
    </main>
  );
}
