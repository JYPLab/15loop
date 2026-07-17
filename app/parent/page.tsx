"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { commercialPlans, type CommercialPlanCode } from "../../lib/plans";
import { authNextStorageKey, getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase-browser";

type Learner = {
  id: string;
  displayName: string;
  grade: string;
  streak: number;
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
  createdLearnerId?: string | null;
};

type TossPaymentInstance = {
  requestPayment(options: Record<string, unknown>): Promise<void>;
};
type TossPaymentsInstance = {
  payment(options: { customerKey: string }): TossPaymentInstance;
};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

function loadTossSdk() {
  if (window.TossPayments) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.tosspayments.com/v2/standard"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("결제 모듈을 불러오지 못했습니다.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
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

  const startPayment = async (planCode: CommercialPlanCode) => {
    if (!session) return;
    setBusy(planCode);
    setMessage("");
    try {
      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: authHeaders(session),
        body: JSON.stringify({ planCode }),
      });
      const order = await orderResponse.json() as {
        error?: string;
        clientKey?: string | null;
        customerKey: string;
        orderId: string;
        orderName: string;
        amount: number;
        customerEmail: string;
        customerName: string;
      };
      if (!orderResponse.ok) throw new Error(order.error || "주문을 만들지 못했습니다.");
      if (!order.clientKey) throw new Error("토스페이먼츠 테스트 클라이언트 키를 .env.local에 설정해주세요.");
      await loadTossSdk();
      if (!window.TossPayments) throw new Error("결제 모듈을 시작하지 못했습니다.");
      const payment = window.TossPayments(order.clientKey).payment({ customerKey: order.customerKey });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "결제를 시작하지 못했습니다.");
      setBusy("");
    }
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
            <span className="commerce-kicker">PARENT ACCOUNT</span>
            <h1>아이의 영어 연결을<br /><em>7일 동안</em> 확인해보세요.</h1>
            <p>가입 즉시 결제정보 없이 무료 체험이 시작됩니다. 진단 결과, 맞춤 학습, 변화 리포트를 한 곳에서 확인하세요.</p>
            <ul><li>아이 최대 3명까지 분리 관리</li><li>이메일 링크로 간단 가입</li><li>체험 종료 전 자동 결제 없음</li></ul>
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
        <div><span className="commerce-kicker">FAMILY LEARNING</span><h1>{profile?.account.displayName || "보호자"}님의<br />가족 학습 공간</h1></div>
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
                <option value="elementary-5">초등 5학년</option><option value="elementary-6">초등 6학년</option><option value="middle-1">중학교 1학년</option><option value="middle-2">중학교 2학년</option><option value="middle-3">중학교 3학년</option>
              </select>
              <button disabled={busy === "learner"}>{busy === "learner" ? "추가 중…" : "프로필 만들기"}</button>
            </form>
          )}
        </div>
      </section>

      <section className="parent-section">
        <div className="parent-section-head"><div><span>ACCESS PASSES</span><h2>7일 후에도 계속하기</h2></div><small>초기 베타 가격 · 자동 갱신 없음</small></div>
        <div className="plan-grid">
          {(Object.values(commercialPlans)).map((plan) => (
            <article className={`plan-card ${plan.code === "family_30" ? "recommended" : ""}`} key={plan.code}>
              {plan.code === "family_30" && <span className="plan-label">다자녀 추천</span>}
              <h3>{plan.nameKo}</h3><p>학습자 {plan.learnerLimit}명 · 30일 전체 기능</p>
              <strong>{plan.amount.toLocaleString("ko-KR")}<small>원</small></strong>
              <ul><li>매일 맞춤 학습 루프</li><li>연결별 재평가</li><li>부모 변화 리포트</li></ul>
              <button onClick={() => startPayment(plan.code)} disabled={Boolean(busy)}>{busy === plan.code ? "결제 준비 중…" : "30일 이용권 결제"}</button>
            </article>
          ))}
        </div>
        <p className="payment-note">현재는 자동 갱신 없는 30일 이용권입니다. 토스 자동결제 계약이 완료되면 월 구독으로 전환할 수 있습니다.</p>
      </section>

      <section className="parent-section">
        <div className="parent-section-head"><div><span>HISTORY</span><h2>진단과 결제 기록</h2></div></div>
        <div className="history-grid">
          <article><h3>최근 진단</h3>{profile?.diagnostics.length ? profile.diagnostics.map((item) => <p key={item.id}>{item.itemCount}단어 · 듣기 {item.hearScore} · 인출 {item.recallScore}<span>{new Date(item.completedAt).toLocaleDateString("ko-KR")}</span></p>) : <small>아직 연결된 진단이 없습니다.</small>}</article>
          <article><h3>결제 내역</h3>{profile?.orders.length ? profile.orders.map((item) => <p key={item.id}>{item.orderName} · {item.amount.toLocaleString("ko-KR")}원<span>{item.status}</span></p>) : <small>아직 결제 내역이 없습니다.</small>}</article>
        </div>
      </section>

      <section className="parent-section">
        <div className="parent-section-head"><div><span>OPEN BETA</span><h2>사용하면서 불편했던 점</h2></div><small>부모 의견만 저장합니다</small></div>
        <form className="beta-feedback-form" onSubmit={submitFeedback}>
          <select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)} aria-label="피드백 종류">
            <option value="suggestion">개선 제안</option><option value="bug">오류</option><option value="learning">학습 내용</option><option value="account">계정</option><option value="payment">결제</option>
          </select>
          <textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} minLength={5} maxLength={2000} placeholder="어떤 부분이 불편했는지 알려주세요. 아이의 실명·학교·연락처는 적지 마세요." required />
          <button disabled={busy === "feedback" || feedbackMessage.trim().length < 5}>{busy === "feedback" ? "저장 중…" : "피드백 보내기"}</button>
        </form>
      </section>
    </main>
  );
}
