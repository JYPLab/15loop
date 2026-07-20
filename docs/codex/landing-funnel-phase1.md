# Codex 지시서 — 랜딩·퍼널 개선 Phase 1 (v3)

> 이 문서는 자체완결형 지시서다. 이 문서만 읽고 작업을 완료할 수 있어야 하며, 여기 없는 판단이 필요하면 임의로 결정하지 말고 중단 후 보고한다.
> 카피(한국어 문구)는 **이 문서에 적힌 그대로** 사용한다. 문구를 다듬거나 새로 짓지 않는다.
> v3 변경: ① 가격 질문·진행 점 기준을 `streak`에서 **실제 완료 학습일(`completedLearningDays`)**로 교체 ② `price_presented`를 클라이언트 렌더 시점 1회 전송 + 서버 중복 방지로 변경 ③ 이메일에서 누적 학습시간 삭제 ④ 라벨·가입·가격 문구 통일 ⑤ 테스트 강화.

## 0. 배경 (왜 이 변경인가)

15Loop 오픈 베타의 북극성 지표 WPA(유료의향 활성가정, `OPEN_BETA_KPI.md`)는 다음을 요구한다:

1. 부모가 30일 예상가격 **12,900원을 모집 전에 확인** → 랜딩 첫 화면 하단·진단 결과의 부모 연결 직전·부모 대시보드 3곳에 노출하고, 대시보드에서 실제 렌더된 시점을 `price_presented` 이벤트로 계측한다.
2. 부모가 "12,900원에 출시되면 결제를 검토하겠다"를 **선택** → **15분 학습을 실제로 완료한 날이 3일 이상**인 가정에게만 대시보드 1문항 카드로 묻고 `price_intent_answered`로 기록한다.

**용어 구분 (중요):**
- `streak` = 연속 학습 표시용. 그날 첫 정상 활동 시 +1, 하루 쉬면 1로 리셋. **가격 질문·7일 진행 판정에 사용 금지.**
- `completedLearningDays` = `daily_session_completed` 이벤트(15분 도달 시 1회 기록)의 서로 다른 `eventDate` 개수. **가격 질문 조건과 7일 진행 점은 반드시 이 값을 사용.**

랜딩의 목적은 기능 설명이 아니다. **부모가 "우리 아이 이야기인데?"라고 느끼고 무료 진단을 시작하게 만드는 것.** 핵심 메시지: "아이가 단어를 모르는 게 아니라, 뜻·소리·문장이 아직 연결되지 않았을 수 있습니다."

**가격 문구 표준 (한 글자도 다르게 쓰지 말 것):** 항목형 표기는 `정식 출시 예정: 30일 이용권 12,900원` 을 랜딩·결과·부모 페이지에서 동일하게 사용한다.

퍼널: 랜딩 방문 → 가입 없이 무료 진단 → 약한 연결 결과 확인 → 부모 계정으로 결과 저장 → 학생 프로필 연결 → 7일간 매일 15분 학습 → 완료 학습일 3일 이상 → 12,900원 가격 의향 확인. (부모 가입을 진단 전에 요구하지 않는다.)

## 1. 작업 범위

| # | 작업 | 파일 |
|---|---|---|
| 1 | 진단 인트로를 짧은 스토리 랜딩으로 재구성 (히어로 → 스토리 → 예시 결과 → 7일 안내 → FAQ) | `app/diagnosis/page.tsx`, `app/globals.css` |
| 2 | 진단 결과 페이지: 재해석 문구 + 실제 제공 항목 안내 + 가격 + 저장 문구 + 라벨 통일 | `app/diagnosis/page.tsx` |
| 3 | 부모 페이지: 진단 경유 헤드라인 연속성 + 가격 노출 | `app/parent/page.tsx` |
| 4 | `completedLearningDays` 계산·반환 (부모 API + 학습자 API) | `app/api/commercial/profile/route.ts`, `app/api/progress/route.ts` |
| 5 | 가격 계측: `price_presented`(렌더 시 1회) + `price_intent_answered` + 대시보드 1문항 카드 | `lib/beta-ops.ts`, `app/api/commercial/profile/route.ts`, `app/parent/page.tsx` |
| 6 | 학습 완료 카드에 7일 진행 점 (`completedLearningDays` 기반) | `app/page.tsx`, `app/globals.css` |
| 7 | 베타 운영 이메일 문안 문서 생성 (확인 가능한 데이터만 사용) | `docs/OPEN_BETA_EMAILS.md` (신규) |
| 8 | 테스트 갱신·추가 | `tests/rendered-html.test.mjs` |

**약속 금지 목록 (어떤 화면·문구에도 넣지 말 것):** D0↔D7 비교 리포트, 7일 뒤 향상도 분석, 첫날 대비 정답률 변화, 자동 난이도 조정, 누적 학습시간 합계. 이 기능·수치는 Phase 2에서 구현한 뒤에만 사용한다.

**범위 밖 (건드리지 말 것):** DB 스키마 변경, 이메일 발송 자동화, 기기 간 진단 연결 코드/QR, D7 미니 재진단·변화 리포트, `streak` 증가 로직 자체.

## 2. 전역 제약

- `/diagnosis` SSR HTML에 반드시 포함: `우리 아이 무료 진단하기`, `20~25`, `가입 없이 시작`, `부모 로그인`, `정식 출시 예정: 30일 이용권 12,900원`. (기존 테스트의 `무료 진단 시작` 단언은 작업 8에서 새 카피 기준으로 교체한다 — 테스트를 지우는 게 아니라 새 카피 기준으로 갱신하는 것.)
- 이 저장소 CSS는 `app/globals.css`에 압축 스타일(한 줄 다중 선언)로 작성돼 있다. 같은 스타일로 추가하고, 모바일 대응은 파일 하단의 기존 `@media` 블록 패턴을 따른다. 색상은 기존 CSS 변수(`var(--ink)`, `var(--muted)` 등)를 재사용한다.
- 요청된 변경 외 리팩터링·포매팅·주석 정리를 하지 않는다.
- 각 작업(섹션 3~10) 완료 시마다 커밋한다. 커밋 메시지는 기존 히스토리처럼 영어 명령형 한 줄 (예: `Rebuild diagnosis intro as story landing`).
- 검증 명령: `npm run lint` 와 `npm test` (test는 build 포함). 둘 다 통과해야 완료다. 완료 후 모바일 뷰(375px)에서 랜딩 전체를 확인한다.

---

## 3. 작업 1 — 진단 인트로 랜딩 재구성

`app/diagnosis/page.tsx`의 `if (phase === "intro")` 블록 전체를 아래 JSX로 교체한다.

먼저 컴포넌트 내부에 시작 핸들러를 추가한다 (기존 인라인 onClick 로직과 동일):

```tsx
const startDiagnosis = () => {
  setPhase("questions");
  setStartedAt(Date.now());
};
```

모듈 최상단(컴포넌트 밖)에 예시 결과 데이터를 추가한다:

```tsx
const sampleResult: Array<[string, number]> = [
  ["보고 의미 연결", 78],
  ["듣고 단어 연결", 42],
  ["문맥에서 이해", 65],
  ["뜻 보고 단어 떠올리기", 31],
];
```

교체할 인트로 JSX:

```tsx
if (phase === "intro") {
  return (
    <main className="commerce-shell diagnosis-intro">
      <header className="commerce-topbar">
        <Link className="brand" href="/diagnosis"><span className="brand-mark">15</span><span>15LOOP</span></Link>
        <Link className="commerce-text-link" href="/parent">부모 로그인</Link>
      </header>

      <section className="diagnosis-hero">
        <span className="commerce-kicker">초5·6 · 중1 무료 영어 단어 진단</span>
        <h1>매일 외운 단어인데,<br /><em>왜 읽거나 들으면</em> 모를까요?</h1>
        <p>아이가 단어를 모르는 게 아니라, 뜻·소리·문장이 아직 연결되지 않았을 수 있습니다. 가입 없이 8~12분 동안 어디에서 막히는지 확인해보세요.</p>
        <button className="commerce-primary" onClick={startDiagnosis}>우리 아이 무료 진단하기 <span>→</span></button>
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
        <button className="commerce-primary" onClick={startDiagnosis}>우리 아이 무료 진단하기 <span>→</span></button>
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
```

`app/globals.css`에 추가할 스타일 (기존 `.diagnosis-*` 블록 근처, 파일의 압축 스타일 관례를 따름):

```css
.landing-facts-line { margin: 14px 0 6px; color: var(--muted); font-size: 13px; }
.landing-story { max-width: 720px; padding: clamp(36px,6vw,64px) 0; }
.landing-story blockquote { margin: 18px 0 0; padding-left: 22px; border-left: 3px solid rgba(21,24,20,.18); }
.landing-story blockquote p { margin: 0 0 18px; color: var(--muted); font-size: clamp(16px,2vw,20px); line-height: 1.7; }
.landing-story blockquote b { color: var(--ink); }
.landing-sample { display: grid; grid-template-columns: 1.1fr .9fr; gap: 28px; align-items: center; max-width: 920px; padding: clamp(36px,6vw,64px) 0; }
.landing-sample h2, .landing-offer h2, .landing-faq h2 { font-size: clamp(26px,4vw,38px); margin: 0 0 14px; }
.landing-sample > div > p { color: var(--muted); line-height: 1.65; }
.landing-trust { font-size: 13px; }
.landing-sample aside { padding: 20px; border: 1px solid rgba(21,24,20,.13); border-radius: 14px; background: rgba(255,255,255,.72); }
.landing-sample-label { display: block; margin-bottom: 12px; color: var(--muted); font-size: 11px; letter-spacing: .08em; }
.landing-sample-focus { margin: 12px 0 0; font-size: 13px; color: var(--muted); }
.landing-sample-focus b { color: var(--ink); }
.landing-offer { max-width: 720px; padding: clamp(36px,6vw,64px) 0; }
.landing-offer p { color: var(--muted); line-height: 1.65; }
.landing-price-line { margin: 16px 0 20px; color: var(--ink); font-weight: 600; }
.landing-faq { max-width: 720px; padding: clamp(36px,6vw,72px) 0; }
.landing-faq dt { font-weight: 700; margin-top: 18px; }
.landing-faq dd { margin: 6px 0 0; color: var(--muted); line-height: 1.65; }
.landing-faq small { display: block; margin-top: 24px; color: var(--muted); }
```

모바일 미디어쿼리(기존 `@media` 블록 안에 추가):

```css
.landing-sample { grid-template-columns: 1fr; }
```

## 4. 작업 2 — 진단 결과 페이지 개선

같은 파일 `app/diagnosis/page.tsx`에서:

**(a) 라벨 통일.** 모듈 상단 `labels` 객체의 `recall: "뜻에서 직접 인출"`을 `recall: "뜻 보고 단어 떠올리기"`로 변경한다. (랜딩 예시 결과·실제 결과 화면·문항 헤더의 라벨이 완전히 일치해야 한다. 다른 라벨 3개는 변경하지 않는다. 내부 식별자 `recall`은 유지한다.)

**(b)** `.diagnosis-score-card` 안, `<h1>` 바로 다음의 기존 `<p>`를 아래 두 문단으로 교체:

```tsx
<p className="diagnosis-reframe">아이는 단어를 모르는 게 아니라, 아직 연결되지 않았을 뿐이에요.</p>
<p>교육부 2022 개정 교육과정 기본 어휘를 기준으로 {result.answers.length}단어의 실제 응답을 확인해 다음 7일 학습의 우선순위를 만들었습니다.</p>
```

CSS 추가: `.diagnosis-reframe { color: var(--ink); font-weight: 600; }`

**(c)** `.diagnosis-next-step` 블록을 아래로 교체. **현재 실제로 제공되는 것만 나열한다** (리포트·향상도 분석 언급 금지):

```tsx
<div className="diagnosis-next-step">
  <b>부모 계정에 연결하면 이렇게 이어져요</b>
  <ul className="diagnosis-locked-list">
    <li>이 진단 결과를 아이 프로필에 저장</li>
    <li>가장 약한 연결부터 매일 15분 맞춤 학습</li>
    <li>부모 화면에서 학습일·학습시간·반복 결과 확인</li>
  </ul>
  <p>7일 무료 · 베타 기간 결제 없음 · 정식 출시 예정: 30일 이용권 12,900원</p>
</div>
```

CSS 추가: `.diagnosis-locked-list { margin: 10px 0; padding-left: 18px; color: var(--muted); line-height: 1.8; }`

**(d)** 저장 상태 `<small>` 문구를 아래로 교체:

```tsx
<small>{saved === "saved"
  ? "✓ 결과가 저장됐어요. 아직 이 기기에서만 볼 수 있어요 — 부모 계정에 연결하면 계속 이어집니다."
  : saved === "local"
    ? "결과가 이 기기에만 보관돼 있어요. 부모 계정에 연결하면 안전하게 저장됩니다."
    : "결과 저장 중…"}</small>
```

## 5. 작업 3 — 부모 페이지 가격·연속성

`app/parent/page.tsx`에서:

**(a)** 비로그인 화면(`if (!session)`)의 `<h1>`을 진단 경유 여부로 분기:

```tsx
<h1>{diagnosticId
  ? <>방금 확인한 진단 결과를<br /><em>저장하고 7일 학습</em>을 시작하세요.</>
  : <>아이의 영어 연결을<br /><em>7일 동안</em> 확인해보세요.</>}</h1>
```

**(b)** 같은 화면의 `<ul>` 항목에 가격 한 줄 추가 (기존 3개 뒤에):

```tsx
<li>7일 무료 · 정식 출시 예정: 30일 이용권 12,900원</li>
```

**(c)** 대시보드의 `.payment-note` 문단을 아래로 교체:

```tsx
<p className="payment-note">이번 오픈 베타에서는 결제수단을 등록하거나 자동 결제하지 않습니다. 정식 출시 예정: 30일 이용권 12,900원 — 베타 참여 가정에는 별도로 안내드립니다.</p>
```

## 6. 작업 4 — `completedLearningDays` 계산·반환

`streak`는 그날 첫 활동만으로 증가하고 하루 쉬면 1로 리셋되므로, "실제 15분 학습을 완료한 날 수"는 `daily_session_completed` 이벤트의 서로 다른 `eventDate` 개수로 센다.

**(a) 부모 API** — `app/api/commercial/profile/route.ts`의 `profilePayload`에서 학습자별로 계산한다. `learnerIds` 조회 이후에 추가:

```ts
const completionEvents = learnerIds.length
  ? await db.select({
      learnerId: schema.betaEvents.learnerId,
      eventDate: schema.betaEvents.eventDate,
    }).from(schema.betaEvents)
      .where(and(
        eq(schema.betaEvents.eventName, "daily_session_completed"),
        inArray(schema.betaEvents.learnerId, learnerIds),
      ))
  : [];
const completedDaysByLearner = new Map<string, Set<string>>();
for (const event of completionEvents) {
  if (!event.learnerId) continue;
  const dates = completedDaysByLearner.get(event.learnerId) ?? new Set<string>();
  dates.add(event.eventDate);
  completedDaysByLearner.set(event.learnerId, dates);
}
```

`learners.map(...)` 반환 객체에 추가: `completedLearningDays: completedDaysByLearner.get(learner.id)?.size ?? 0,`

**(b) 학습자 API** — `app/api/progress/route.ts`의 GET 핸들러에서, `ensureProfile` 호출 이후에 추가 (`and`가 drizzle-orm import에 없으면 추가한다):

```ts
const completionRows = await db.select({ eventDate: schema.betaEvents.eventDate })
  .from(schema.betaEvents)
  .where(and(
    eq(schema.betaEvents.learnerId, learnerId),
    eq(schema.betaEvents.eventName, "daily_session_completed"),
  ));
const completedLearningDays = new Set(completionRows.map((row) => row.eventDate)).size;
```

GET 응답의 profile에 포함: `profile: { ...profilePayload(profile), completedLearningDays },` (다른 응답 지점의 `profilePayload(...)`는 변경하지 않는다 — `completedLearningDays`는 GET에서만 내려간다.)

## 7. 작업 5 — 가격 계측 (`price_presented` + `price_intent_answered`)

**(a)** `lib/beta-ops.ts`의 `BetaEventName` 유니언에 `"price_presented"`와 `"price_intent_answered"` 추가.

**(b)** `app/api/commercial/profile/route.ts`:

- `ProfileAction` 타입에 `action` 값 `"pricePresented"`, `"priceIntent"` 와 필드 `priceIntent?: string;` 추가.
- `profilePayload`에서 두 이벤트 존재 여부를 조회해 반환 객체에 포함 (`and`, `inArray`는 이미 import돼 있음):

```ts
const priceEvents = await db.select({ eventName: schema.betaEvents.eventName })
  .from(schema.betaEvents)
  .where(and(
    eq(schema.betaEvents.guardianId, account.id),
    inArray(schema.betaEvents.eventName, ["price_presented", "price_intent_answered"]),
  ));
const pricePresented = priceEvents.some((event) => event.eventName === "price_presented");
const priceIntentAnswered = priceEvents.some((event) => event.eventName === "price_intent_answered");
```

반환 객체에 `pricePresented,` 와 `priceIntentAnswered,` 추가. **GET 핸들러는 수정하지 않는다** (v2의 GET 기록 방식은 폐기 — 동의 직후 첫 대시보드는 POST 응답으로 렌더되어 GET을 타지 않기 때문).

- POST의 액션 분기(`claimDiagnostic` 브랜치 뒤)에 두 개 추가. `pricePresented`는 **기존 이벤트가 없을 때만** 기록한다:

```ts
} else if (body.action === "pricePresented") {
  const [existing] = await db.select({ id: schema.betaEvents.id })
    .from(schema.betaEvents)
    .where(and(
      eq(schema.betaEvents.guardianId, account.id),
      eq(schema.betaEvents.eventName, "price_presented"),
    ))
    .limit(1);
  if (!existing) {
    await recordBetaEvent(db, schema, {
      eventName: "price_presented",
      guardianId: account.id,
      metadata: { priceKrw: 12900, surface: "parent_dashboard" },
    });
  }
} else if (body.action === "priceIntent") {
  const answer = String(body.priceIntent || "");
  if (!["yes", "unsure", "no"].includes(answer)) {
    return Response.json({ error: "가격 의향 답변이 올바르지 않습니다." }, { status: 400 });
  }
  const eligibility = await profilePayload(db, schema, account);
  if (!eligibility.learners.some((learner) => learner.completedLearningDays >= 3)) {
    return Response.json({ error: "3일 학습 완료 후 답변할 수 있습니다." }, { status: 403 });
  }
  if (!eligibility.priceIntentAnswered) {
    await recordBetaEvent(db, schema, {
      eventName: "price_intent_answered",
      guardianId: account.id,
      metadata: { answer, priceKrw: 12900 },
    });
  }
}
```

**서버 측 자격·중복 규칙 (중요):** ① 완료 학습일 3일 미만 계정의 `priceIntent` 요청은 서버가 403으로 거부한다 — 화면 게이트만으로는 API 직접 호출을 막을 수 없다. ② `price_intent_answered`는 기존 이벤트가 없을 때만 기록한다(최초 1회) — 더블클릭·재요청으로 중복 행이 생기지 않게 한다. ③ DB에 유니크 제약이 없어 완전한 동시성에서 단일 행이 물리적으로 보장되지는 않으므로, **베타 분석 시 WPA 집계는 반드시 `guardianId` 기준 고유 부모 수로 계산한다** (이벤트 행 수로 세지 않는다).

**(c)** `app/parent/page.tsx`:

- `Learner` 타입에 `completedLearningDays: number;`, `ParentProfile` 타입에 `pricePresented: boolean;` 과 `priceIntentAnswered: boolean;` 추가.
- **가격이 표시된 대시보드가 실제 렌더됐을 때** 클라이언트에서 1회 전송 (서버가 중복을 걸러주므로 재실행돼도 안전):

```tsx
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
```

- 의향 답변 핸들러 추가:

```tsx
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
```

- 대시보드에서 **아이 프로필 섹션과 BETA ACCESS 섹션 사이**에 조건부 카드 추가. 조건은 반드시 `completedLearningDays >= 3` (streak 사용 금지):

```tsx
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
```

CSS 추가:

```css
.price-intent-question { margin: 4px 0 14px; }
.price-intent-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
.price-intent-ghost { padding: 12px 18px; border: 1px solid rgba(21,24,20,.2); border-radius: 999px; background: transparent; color: var(--ink); cursor: pointer; }
```

## 8. 작업 6 — 학습 완료 카드 7일 진행 점

진행 점은 **`completedLearningDays`** 를 사용한다 (`streak`는 하루 쉬면 1로 리셋되므로 사용 금지).

`app/page.tsx`에서:

**(a)** `ProgressResponse`의 `profile` 타입에 `completedLearningDays?: number;` 추가. 상태 추가:

```tsx
const [completedLearningDays, setCompletedLearningDays] = useState(0);
const [dayCompletedAtLoad, setDayCompletedAtLoad] = useState(false);
```

진행 로드 시(`loadAccountAndProgress`에서 `progressData.profile` 처리 부분)에 추가:

```tsx
setCompletedLearningDays(progressData.profile.completedLearningDays ?? 0);
setDayCompletedAtLoad(Boolean(progressData.profile.dailySessionCompleted));
```

**(b)** `copy.ko`에 `journey: (day: number) => `7일 여정 ${day} / 7일차`,` / `copy.en`에 `journey: (day: number) => `Day ${day} of 7`,` 추가.

**(c)** `day-complete-card` 안 `<h2>{t.dayComplete}</h2>` 위에 추가. 로드 후 이 세션에서 15분을 완료한 경우 오늘 하루를 더한다:

```tsx
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
```

**(d)** CSS 추가:

```css
.journey-dots { display: flex; align-items: center; gap: 7px; margin: 10px 0 4px; }
.journey-dots i { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.28); }
.journey-dots i.filled { background: #fff; }
.journey-dots span { margin-left: 6px; font-size: 12px; opacity: .85; }
```

주의: `day-complete-card`는 어두운 배경 카드다. 렌더 후 대비가 어색하면 dot 색만 조정하고 구조는 유지한다.

## 9. 작업 7 — 이메일 문안 문서

`docs/OPEN_BETA_EMAILS.md`를 신규 생성하고 아래 내용을 그대로 넣는다. **모든 수치·사실은 DB에서 확인 가능한 것만 인용한다** (완료 학습일 수, 학습한 단어, 진단 시 약한 연결). 누적 학습시간 합계·정답률 변화·향상도 비교는 쓰지 않는다 (현재 DB는 하루 학습시간만 보관하고 다음 날 초기화하므로 총 학습시간을 정확히 합산할 수 없다).

```markdown
# 오픈 베타 부모 이메일 4통 (수동 발송용)

발신자: 창업자 개인 이름 (회사명 아님).
치환 필드: {아이}=아이 닉네임, {약한연결}=진단에서 가장 약했던 연결 라벨, {단어}=최근 학습한 단어 하나(wordProgress에서 확인), N=완료 학습일 수(daily_session_completed 고유 날짜 수).
발송 전 부모 대시보드 또는 DB에서 실제 값을 확인하고 보낸다. 확인되지 않는 수치는 쓰지 않는다.

## D0 — 진단 연결 + 아이 프로필 생성 완료 직후 ({약한연결} 값이 확보된 뒤에만 발송)
제목: {아이}의 끊긴 연결, 오늘 첫 15분부터 시작해요
본문:
안녕하세요, 15Loop를 만든 아빠입니다.
진단에서 {아이}의 가장 약한 연결은 "{약한연결}"이었어요. 첫 15분 학습은 바로 거기서 시작합니다.
오늘 저녁, {아이}에게 15분만 자리를 만들어 주세요. 학습은 부모 대시보드의 아이 프로필에서 시작할 수 있습니다.
7일 동안은 완전히 무료이고, 결제 정보는 받지 않습니다.

## D3 — 완료 학습일 3일 도달 시
제목: {아이}가 3일 학습을 완료했어요
본문:
{아이}가 3일 학습을 완료했어요.
오늘 저녁 식탁에서 "{단어}가 무슨 뜻이야?"라고 한번 물어봐 주세요. 아이가 답하는 순간을 직접 보시는 게 어떤 숫자보다 정확합니다.
부모 대시보드에 오늘의 학습 기록이 저장되고 있습니다.

## 회복 — 연속 2일 미학습 시
제목: {아이}의 기억이 흐려지기 전에, 오늘 15분
본문:
{아이}가 이틀 학습을 쉬었어요. 괜찮습니다 — 다만 새로 만든 연결은 이맘때부터 흐려지기 시작해요.
오늘 15분이면 끊기지 않고 이어집니다. 아이가 어려워서 쉬는 것 같다면, 이 메일에 답장으로 알려주세요. 아이에게 맞는 방법을 함께 찾아보겠습니다.

## D7 — 가입 7일차 (기록 요약 + 가격 의향)
제목: {아이}의 7일 학습 기록을 정리해 드려요
본문:
{아이}의 7일이 끝났습니다.
- 지난 7일 동안 N일 학습을 완료했습니다.
- 진단에서 가장 약했던 연결: {약한연결}
- 이번 주 {아이}가 반복한 단어 중 하나: {단어}
"{단어}"를 {아이}에게 직접 물어봐 주세요. 그 답이 이번 7일의 가장 정확한 기록입니다.
마지막으로 하나만 여쭤봅니다. 15Loop가 정식 출시되면 30일 이용권은 12,900원입니다. 출시되면 결제를 검토하시겠어요? 부모 대시보드에서 한 번만 답해주시면 베타 운영에 큰 도움이 됩니다.
15분 인터뷰에 응해주실 수 있다면 이 메일에 답장 주세요.
```

## 10. 작업 8 — 테스트

`tests/rendered-html.test.mjs`에서:

**(a)** 기존 `server-renders the no-signup free diagnostic as the first experience` 테스트의 단언을 새 카피 기준으로 교체한다:

```js
assert.match(html, /우리 아이 무료 진단하기/);
assert.match(html, /20~25/);
assert.match(html, /가입 없이 시작/);
assert.match(html, /부모 로그인/);
assert.match(html, /정식 출시 예정: 30일 이용권 12,900원/);
assert.match(html, /매일 외운 단어인데/);
assert.match(html, /뜻 보고 단어 떠올리기/);
```

(기존 `/무료 진단 시작/` 단언은 삭제한다 — CTA 문구가 바뀌었기 때문이다.)

**(b)** 소스 단언(현재 `교육부 2022 개정 기본 어휘 3,000개`·`검수한 30단어`를 확인하는 부분)을 새 카피 기준으로 교체한다:

```js
const diagnosisPage = await readFile(new URL("../app/diagnosis/page.tsx", import.meta.url), "utf8");
assert.match(diagnosisPage, /교육부 2022 개정 교육과정 기본 어휘/);
assert.match(diagnosisPage, /검수를 완료한 30단어/);
assert.match(diagnosisPage, /뜻 보고 단어 떠올리기/);
assert.doesNotMatch(diagnosisPage, /뜻에서 직접 인출/);
```

**(c)** 신규 테스트 추가 (동작 기준을 소스 수준에서 고정한다):

```js
test("instruments price presentation and intent behind the parent API", async () => {
  const profileRoute = await readFile(new URL("../app/api/commercial/profile/route.ts", import.meta.url), "utf8");
  assert.match(profileRoute, /price_presented/);
  assert.match(profileRoute, /price_intent_answered/);
  assert.match(profileRoute, /12900/);
  assert.match(profileRoute, /if \(!existing\)/);
  assert.match(profileRoute, /completedLearningDays/);
  assert.match(profileRoute, /3일 학습 완료 후 답변할 수 있습니다/);
  assert.match(profileRoute, /if \(!eligibility\.priceIntentAnswered\)/);
});

test("gates the price question on completed learning days, not streak", async () => {
  const parentPage = await readFile(new URL("../app/parent/page.tsx", import.meta.url), "utf8");
  assert.match(parentPage, /completedLearningDays >= 3/);
  assert.doesNotMatch(parentPage, /streak >= 3/);
  assert.match(parentPage, /priceIntentAnswered/);
  assert.match(parentPage, /pricePresented/);
});

test("renders the 7-day journey from completed learning days", async () => {
  const appPage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(appPage, /journey-dots/);
  assert.match(appPage, /completedLearningDays/);
  const progressRoute = await readFile(new URL("../app/api/progress/route.ts", import.meta.url), "utf8");
  assert.match(progressRoute, /completedLearningDays/);
});
```

## 11. 완료기준 체크리스트

- [ ] `npm run lint` 통과
- [ ] `npm test` 통과 (build 포함, 갱신·신규 단언 포함 전체)
- [ ] `/diagnosis` SSR HTML에 포함: `우리 아이 무료 진단하기`, `20~25`, `가입 없이 시작`, `부모 로그인`, `정식 출시 예정: 30일 이용권 12,900원`, `매일 외운 단어인데`, `뜻 보고 단어 떠올리기`
- [ ] 랜딩·결과·부모 페이지 어디에도 약속 금지 목록(비교 리포트·향상도 분석·정답률 변화·자동 난이도 조정·누적 학습시간)이 등장하지 않음
- [ ] 진단 결과 화면과 랜딩 예시의 연결 라벨 4개가 완전히 일치함 (`뜻 보고 단어 떠올리기` 포함, `뜻에서 직접 인출` 잔존 금지)
- [ ] 가격 질문·7일 진행 점 모두 `completedLearningDays` 기반이고 `streak`를 사용하지 않음
- [ ] `price_presented`는 동의 완료 대시보드가 실제 렌더된 뒤 클라이언트가 1회 전송하며, 서버는 기존 이벤트가 있으면 다시 기록하지 않음 (동의 직후 POST 경로로 진입한 첫 대시보드에서도 기록됨)
- [ ] 완료 학습일 3일 이상 아이가 있고 미응답이면 가격 의향 카드 표시, 응답 후 재표시 안 됨 (서버 기준)
- [ ] 가격 의향 API는 완료 학습일 3일 미만인 계정의 요청을 서버에서 403으로 거부한다
- [ ] `price_intent_answered`는 기존 이벤트가 있으면 다시 기록하지 않는다 (최초 1회)
- [ ] `docs/OPEN_BETA_EMAILS.md` 생성됨 (누적 학습시간 문구 없음)
- [ ] 모바일(375px)에서 랜딩 전 섹션 확인 완료
- [ ] 작업별 커밋, 영어 명령형 메시지
- [ ] 이 문서에 없는 파일은 변경되지 않음

## 12. Phase 2 백로그 (이번 실행 금지 — 기록용)

구현 완료 전에는 랜딩·이메일 어디에도 아래를 약속하지 않는다. 구현 후 랜딩에 추가한다.

1. **기기 간 진단 연결 코드/QR** — 결과 페이지에서 6자리 코드 발급, 부모 폰에서 입력해 sessionId 연결 (localStorage 기기 종속 문제 해소).
2. **D7 미니 재진단 + 변화 리포트** — 첫 진단 오답 단어 5~8개를 7일차 세션 말미에 재출제, D0 vs D7 비교를 부모 대시보드에 표시. 리포트 문장은 점수가 아니라 단어 중심.
3. **학습 세션 누적 테이블** — 일자별 학습시간을 영구 보관해 "총 학습시간"을 정확히 집계 (이후 이메일·리포트에 사용 가능).
4. **이메일 발송 자동화** — Resend 등 연동, 회복 메일 트리거(연속 2일 미학습) 자동화.
5. **완료 카드 "내일 다시 나올 단어" 예고** — 재출제 큐 데이터를 완료 카드에 노출.
