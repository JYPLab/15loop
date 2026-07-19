# 15Loop 개발기 소스팩

> 조사 기준 시점: 2026-07-19 23:32:19 KST, `main` = `0cff5c7d59a126c18caa2d8b4379a618067e12d8`
>
> 이 문서는 연재 문안이 아니라 1차 재료다. Git 커밋과 현재 저장소 파일에서 확인되는 사실만 적고, 저장소가 주장하는 내용과 코드로 직접 확인되는 내용을 구분했다.

## 조사 범위와 판독 기준

- Git은 `git log --all`로 로컬·원격 refs의 고유 커밋을 조사했다. `main` 커밋 수와 전체 refs 커밋 수를 따로 쓴다.
- 파일 근거는 조사 시점의 현재 작업트리다. `OPEN_BETA_KPI.md`, `docs/codex/landing-funnel-phase1.md`, `docs/BUILD_STORY_BRIEF.md`는 **미추적 파일**이므로 역사적 커밋 근거로 취급하지 않고, 현재 기획 근거로만 표시한다.
- 커밋의 파일 증감은 `git log --all --stat`과 `git show <hash> --stat`로 확인했다. 병합 커밋은 기본 `--stat`에서 별도 증감이 표시되지 않을 수 있다.
- “기능 수”는 정의에 따라 달라져 단일 숫자로 만들지 않았다. 대신 빌드 결과로 확인되는 API 라우트·페이지, 테스트, DB 테이블 수를 대리 지표로 제시한다.
- 명시적 `Revert` 커밋은 없다. 따라서 아래 “실패·수정 로그”는 되돌림이라고 단정하지 않고, 삭제·교체·하드닝·연속 수정이 diff로 확인되는 장면을 기록한다.

## 1. 타임라인

### 전체 요약

- 첫 커밋: `729218d` — 커미터 시각 2026-07-15 23:15:30 KST, **Build LoopVoca learning loop MVP**.
- 조사 시점 마지막 커밋: `0cff5c7` — 커미터 시각 2026-07-19 23:32:19 KST, **Merge pull request #4 from JYPLab/agent/seo-analytics-foundation**.
- 첫 커밋부터 마지막 커밋까지 정확히 346,609초, 약 96시간 17분, 즉 **4.01일 경과**했다. 날짜를 포함해 세면 **5개 달력일**, 실제 커밋이 발생한 날도 **5일**이다.
- `main`은 36커밋, `--all`의 고유 커밋은 37개다. 차이 1개는 PR #1에 대응하는 `agent/cloze-recall-mobile`의 원 커밋 `2eddb42`다. 이 커밋과 `main`의 `50c511a`는 트리 diff가 동일하다(`git diff --quiet 2eddb42 50c511a` = 0).
- 전체 기간은 한 주 안에 끝났으므로 “주차별”로는 **1주차에 MVP→상용 구조→오픈 베타→제출 패키지까지 진행**된 기록이다.

### 2026-07-15 — 2커밋: 작동하는 MVP와 학습 루프

- `729218d`에서 LoopVoca MVP가 한 번에 들어왔다. 앱, GPT 평가 API, D1 스키마, Sites/Vite 설정, 테스트까지 30파일·12,370줄 추가였다. 근거: `app/page.tsx`, `app/api/evaluate/route.ts`, `db/schema.ts`, `.openai/hosting.json`, `tests/rendered-html.test.mjs`.
- 19분 뒤 `726e22e`에서 30단어 데이터, 진도 API, 네 연결 점수와 이중언어 적응형 루프가 추가됐다. 14파일, +1,607/-184줄. 근거: `data/words.ts`, `app/api/progress/route.ts`, `drizzle/0000_parallel_reaper.sql`.

### 2026-07-16 — 5커밋: 계정·친구 기능·결제 구조·15분·리브랜딩

- `2ec7d21`: 첫 단어 뒤 선택적으로 ChatGPT 로그인을 제안하고 익명 기록을 계정으로 합치는 “progressive account flow”를 만들었다. 당시 근거: `app/chatgpt-auth.ts`, `app/api/account/route.ts`, 해당 커밋의 `README.md`.
- `826d33a`: 공개 랭킹 대신 비공개 URL 기반 5단어 듣기 친구 도전과 가벼운 성취 공유를 추가했다. 근거: `app/page.tsx`, 커밋 메시지.
- `461c209`: 학생 개인 계정 흐름을 부모 소유 가족 계정으로 교체하고, Supabase Auth·Toss Payments 준비·20~25단어 진단·최대 3명 자녀 구조를 만들었다. 이때 `app/chatgpt-auth.ts`가 삭제됐다. 근거: `lib/auth.ts`, `lib/commercial.ts`, `lib/plans.ts`, `app/parent/page.tsx`, `app/api/payments/*`, `drizzle/0001_*`, `drizzle/0002_*`.
- `58930fb`: “하루 30단어 완료”를 “실제 활동 15분 동안 연결한 단어 수”로 바꿨다. 30초 heartbeat, 탭 이탈·60초 비활동 정지, 900초 완료 상태가 생겼다. 근거: `app/page.tsx`, `app/api/progress/route.ts`, `drizzle/0003_confused_starfox.sql`.
- `21d90bb`: 제품명을 LoopVoca에서 15Loop로 바꿨다. 12파일 +36/-34줄. 근거: `README.md`, `package.json`, `app/layout.tsx`, `public/*`.

### 2026-07-17 — 8커밋: 적응형 엔진·교육과정·오픈 베타 운영 기반

- `e3eb150`: 만기/임박/신규/미래 복습 우선순위, 가장 약한 연결 우선, 세 단어 뒤 제한 재출제를 구현했다. 근거: `lib/adaptive-queue.ts`, `tests/adaptive-queue.test.mjs`, `drizzle/0004_pretty_leo.sql`.
- `3dbc4f7`, `9e792ac`, `0a5c21a`: 운영 인증 UI를 단단하게 만들고, Supabase 설정 시 Google 로그인을 열었으며, OAuth 콜백의 세션 handoff를 수정했다. 근거: `app/parent/page.tsx`, `lib/supabase-browser.ts`, `app/auth/callback/page.tsx`.
- `a2e8723`: README의 제품 설명을 한 줄 수정했다.
- `b670814`: 문장 인출에서 정확한 한국어 cue를 사용하도록 수정했다. 근거: `app/api/evaluate/route.ts`, `app/page.tsx`, `data/words.ts`.
- `3d2c44a`: 교육부 2022 개정 기본 어휘 3,000개 지도와 추출·가공 스크립트, 검증 테스트를 추가했다. 12파일, +31,113/-2줄. 근거: `data/curriculum/ko-2022-basic-words.json`, `scripts/*curriculum*`, `lib/curriculum.ts`, `tests/curriculum-data.test.mjs`.
- `46cfef3`: 300개 중학교 핵심 단어와 100개 생활 표현을 **학습자 비노출 candidate**로 추가하고, 인간 review/publish 게이트, 보호자 동의, 약관·개인정보, 피드백, 베타 이벤트를 만들었다. 35파일, +9,755/-22줄. 근거: `data/catalog/*`, `lib/content-catalog.ts`, `lib/content-pipeline.ts`, `lib/policies.ts`, `drizzle/0005_*`, `drizzle/0006_*`.

### 2026-07-18 — `main` 9커밋, 전체 refs 10커밋: 신뢰성·대상 축소·아동 UX·무가입 진입

- `2ad76a2`, `93be5de`, `3bd61ce`: 가족 AI 평가 인증, 서버 검증 기반 학습 데이터 무결성, 화면의 AI/로컬 fallback 출처 명시가 연달아 들어왔다. `93be5de`만 14파일 +1,573/-59줄이다. 근거: `lib/learning-integrity.ts`, `app/api/evaluate/route.ts`, `app/api/progress/route.ts`, `drizzle/0007_handy_spencer_smythe.sql`.
- `b50174e`: 오픈 베타 대상을 초5·6·중1로 좁히고, 부모 화면의 Toss 결제 호출 UI를 제거해 7일 무료 베타로 전환했다. 5파일 +37/-97줄. 결제 서버 라우트는 남았지만 사용자 베타 경로에서는 감췄다. 근거: `app/diagnosis/page.tsx`, `app/parent/page.tsx`의 해당 커밋 diff.
- `50c511a`(PR #1): 필수 전체 문장 쓰기를 빈칸 단어 인출로 바꾸고, 자유 문장 쓰기와 GPT 평가는 선택 도전으로 옮겼다. 근거: `app/page.tsx`, `app/api/evaluate/route.ts`, `tests/rendered-html.test.mjs`. 동일 트리의 브랜치 원 커밋은 `2eddb42`.
- `3258b1b`, `3c1c20d`, `c848233`: 모바일 보조문구 크기→학습 단계 라벨→탭 시 단계 상세 표시를 차례로 손봤다. 근거: `app/globals.css`, `app/page.tsx`.
- `1a237d4`: 게스트의 첫 진입을 학습 데모가 아니라 무가입 무료 진단으로 바꿨다. 근거: `lib/entry-routing.ts`, `tests/entry-routing.test.mjs`, `app/page.tsx`.

### 2026-07-19 — 12커밋: 부모 의도 퍼널·가격 검증·모바일·검색·제출

- `422c1e5`: 진단 첫 화면을 “한 아빠의 발견” 중심 랜딩으로 다시 만들었다. 2파일 +111/-16줄. 근거: `app/diagnosis/page.tsx`, `app/globals.css`.
- `a92ce41`, `26dbc80`, `692be86`: 연속출석(streak)이 아니라 실제 15분 완료일을 세고, 3일 이상 완료한 부모에게만 12,900원 가격 의향을 묻고, 7일 진행점을 표시했다. 근거: `app/api/commercial/profile/route.ts`, `app/api/progress/route.ts`, `app/parent/page.tsx`, `lib/beta-ops.ts`, `app/page.tsx`.
- `035e6dd`: 저장된 데이터만 사용하는 오픈 베타 이메일 템플릿을 추가했다. 근거: `docs/OPEN_BETA_EMAILS.md`.
- `e707bc2`와 병합 `50ee3c9`(PR #2): 랜딩·가격 퍼널 동작을 테스트로 잠갔다. 근거: `tests/rendered-html.test.mjs`.
- `8b276e1`과 병합 `b08cc4e`(PR #3): 모바일 오픈 베타 여정을 다시 다듬었다. 근거: `app/globals.css`, `app/layout.tsx`, `tests/rendered-html.test.mjs`.
- `4120fec`: GA4 퍼널 이벤트, 검색 메타데이터, `robots.txt`, sitemap, canonical을 추가했다. 근거: `lib/analytics.ts`, `app/robots.ts`, `app/sitemap.ts`, `docs/ANALYTICS_TRACKING_PLAN.md`.
- `181527a`와 병합 `0cff5c7`(PR #4): 데모 대본·촬영 목록·Devpost 문안·심사 가이드를 추가했다. 근거: `docs/submission/*`.

## 2. 결정의 순간들

### 2.1 “뜻을 아는가” 대신 네 연결을 따로 본다

- 최초 README부터 recognition/listening/context/active recall 네 축을 제품 정의로 삼았다. 현재 진단 코드는 `see`, `hear`, `context`, `recall`을 별도 점수로 계산하고 가장 낮은 축을 찾는다.
- 장면의 핵심: 문제를 “외웠나/못 외웠나”가 아니라 “어느 연결이 끊겼나”로 재정의한 순간.
- 근거: `729218d`; `README.md`; `app/diagnosis/page.tsx`의 `skillOrder`, `scoreAnswers`, `weakest`; `db/schema.ts`의 네 score 컬럼.

### 2.2 먼저 써보게 하고, 가입은 결과 뒤로 미룬다

- `1a237d4`는 비인증·비챌린지 방문자를 `/diagnosis`로 보낸다. 진단 화면은 localStorage의 익명 learner ID로 20문항을 시작하고, 결과 뒤에야 `/parent?diagnostic=...`으로 연결한다.
- 현재 랜딩은 “가입 없이 시작”, 결과는 “부모에게 결과 연결”이라고 명시한다.
- 근거: `1a237d4`; `lib/entry-routing.ts`; `app/diagnosis/page.tsx`; `tests/entry-routing.test.mjs`.

### 2.3 아이에게 계정을 만들게 하지 않고 부모가 계정을 소유한다

- `2ec7d21`의 ChatGPT 기반 학습자 계정은 다음날이 아니라 같은 날 `461c209`에서 삭제됐다. 현재는 Supabase bearer token으로 부모를 확인하고 부모-아이 매핑을 D1에 저장한다.
- 랜딩 FAQ는 아이에게 이메일·비밀번호를 요구하지 않는다고 적고, 부모가 Google 또는 이메일로 로그인한 뒤 동의와 프로필 연결을 수행한다.
- 근거: `2ec7d21`, `461c209`; 삭제된 `app/chatgpt-auth.ts`; 현재 `lib/auth.ts`, `db/schema.ts`의 `guardian_accounts`/`guardian_learners`, `app/diagnosis/page.tsx`.

### 2.4 하루 목표를 “30단어”에서 “실제 집중 15분”으로 바꾼다

- `58930fb` 이전 README와 UI는 30단어 완료를 목표로 했고, 이후 900초 활동을 완료 기준으로 바뀌었다. 탭이 보이고 포커스가 있으며 최근 60초 안에 상호작용한 시간만 센다.
- `93be5de`에서는 클라이언트 heartbeat 요청값을 그대로 믿지 않고 서버 경과시간 이내만 인정하도록 다시 강화했다.
- 근거: `58930fb`, `93be5de`; `app/page.tsx`; `app/api/progress/route.ts`; `lib/learning-integrity.ts`; `drizzle/0003_confused_starfox.sql`, `drizzle/0007_handy_spencer_smythe.sql`.

### 2.5 7일 무료와 12,900원은 “검증 중인 가격 가설”로 둔다

- 코드의 상품 정의는 1명 30일 12,900원, 최대 3명 30일 19,900원이다. 첫 부모 요청 때 카드 없이 7일 trial을 만든다.
- 그러나 `b50174e`에서 베타 UI의 Toss 결제 호출을 제거했고, 현재 README는 가격을 “initial beta hypotheses, not validated final prices”라고 명시한다. 랜딩도 베타 중 결제수단·자동결제가 없다고 밝힌다.
- 현재 미추적 `OPEN_BETA_KPI.md`는 12,900원을 먼저 본 뒤 실제 3일/45분 행동과 가격 의향을 모두 보인 가정을 WPA로 정의한다. 이는 커밋 이력이 아니라 조사 시점의 기획 근거다.
- 근거: `461c209`, `58930fb`, `b50174e`, `26dbc80`; `lib/plans.ts`; `lib/commercial.ts`; `app/diagnosis/page.tsx`; `README.md`; 미추적 `OPEN_BETA_KPI.md`.

### 2.6 Next.js UI + Cloudflare D1 + Supabase Auth를 혼합한다

- UI/라우팅은 Next.js 16 계열과 React 19, 실행·빌드는 vinext/Vite, 배포 데이터는 Cloudflare D1+Drizzle, 인증은 Supabase Auth다.
- D1은 학습·가족·결제·평가·콘텐츠·베타 이벤트의 권위 저장소이고, Supabase는 부모 신원 확인에만 쓰인다.
- 근거: `729218d`, `461c209`; `package.json`; `.openai/hosting.json`; `db/index.ts`; `drizzle.config.ts`; `lib/auth.ts`.

### 2.7 공개 단어는 30개로 작게, 확장 풀은 보이지 않게 시작한다

- 학습자에게 보이는 `dailyWords`는 30개다. 랜딩은 이 30개를 뜻·발음·예문 검수 완료 풀이라고 설명한다.
- 별도로 공식 교육과정 3,000개 지도와 300단어+100표현 candidate가 있지만, `learnerVisible: false`, reviewed/published 0으로 고정돼 있다. AI 생성 초안도 검증→인간 review→publish를 통과하기 전에는 큐에 들어가지 않는다.
- “30개가 실제로 누가 어떻게 검수했는지”에 대한 별도 검수 로그는 저장소에 없다. 확인 가능한 사실은 30개 데이터의 존재와 UI의 검수 완료 표기까지다.
- 근거: `726e22e`, `3d2c44a`, `46cfef3`; `data/words.ts`; `lib/content-catalog.ts`; `lib/content-pipeline.ts`; `README.md`; `app/diagnosis/page.tsx`.

### 2.8 틀린 단어를 즉시 반복시키지 않는다

- 적응형 큐는 overdue→due-soon→new→future 순으로 정렬하고 가장 약한 연결부터 시작한다. 틀린 단어는 같은 자리에서 기계적으로 반복하지 않고 서로 다른 세 단어 뒤에 최대 두 번까지 넣는다.
- 근거: `e3eb150`; `lib/adaptive-queue.ts`; `tests/adaptive-queue.test.mjs`.

### 2.9 아이의 부담을 줄이기 위해 필수 인출과 AI 자유문장을 분리한다

- `50c511a`에서 전체 영어 문장을 필수로 쓰던 recall을 빈칸의 한 단어 입력으로 바꿨다. 정답 뒤 완성 문장을 듣고 따라 말하게 하고, 자유문장은 “선택” GPT 도전으로 옮겼다.
- 커밋된 제출 문서는 실제 아이가 반복 4단계와 마지막 쓰기를 무겁게 느꼈다는 배경을 기록한다. 이 부분은 코드가 아니라 프로젝트 문서의 진술로 인용해야 한다.
- 근거: `50c511a`; `app/page.tsx`; `app/api/evaluate/route.ts`; `docs/submission/DEVPOST_COPY.md`; `docs/submission/DEMO_SCRIPT.md`.

### 2.10 가격 의향은 streak가 아니라 실제 완료일 뒤에 묻는다

- `a92ce41`은 `daily_session_completed`의 서로 다른 날짜 수를 센다. `26dbc80`은 이 수가 3 이상인 부모에게만 가격 질문을 보여준다.
- 미추적 Codex 지시서는 streak를 가격 판정에 쓰지 말고 `completedLearningDays`만 쓰라고 명시한다. 실제 커밋과 코드가 이 지시를 구현했다.
- 근거: `a92ce41`, `26dbc80`, `692be86`; `app/api/commercial/profile/route.ts`; `app/parent/page.tsx`; 미추적 `docs/codex/landing-funnel-phase1.md`.

## 3. 실패·수정 로그

| 장면 | 처음 상태 | 수정된 상태 | 근거 |
|---|---|---|---|
| 학습자 로그인 구조를 하루 안에 폐기 | `2ec7d21`: 첫 단어 뒤 ChatGPT 로그인, 이메일 기반 learner ID | `461c209`: `app/chatgpt-auth.ts` 삭제, 부모 소유 Supabase 계정+자녀 프로필 | `2ec7d21`, `461c209`, `lib/auth.ts`, `db/schema.ts` |
| 30단어 할당량을 버림 | 30개를 모두 연결하면 하루 완료 | 실제 활동 900초를 완료 기준으로 변경 | `58930fb`, `app/page.tsx`, `drizzle/0003_confused_starfox.sql` |
| 결제 준비를 했지만 베타에서는 감춤 | Toss SDK를 불러와 12,900/19,900원 패스를 결제하는 부모 UI | 결제 버튼·SDK 호출 삭제, 7일 0원 베타 카드로 대체; 서버 결제 라우트는 잔존 | `461c209`, `b50174e`, `app/parent/page.tsx`, `app/api/payments/*` |
| 전체 문장 쓰기가 너무 무거워짐 | 필수 recall이 한국어 cue를 보고 영어 문장 전체 쓰기 | 필수는 빈칸 한 단어, 자유 문장은 선택 AI 도전 | `b670814`, `50c511a`, `app/page.tsx`, `docs/submission/DEVPOST_COPY.md` |
| OAuth 콜백 handoff 수정 | 콜백 query의 `next`만 읽음 | localStorage의 안전한 next 경로도 회수하고 `//` 경로를 거부 | `0a5c21a`, `app/auth/callback/page.tsx`, `lib/supabase-browser.ts` |
| 클라이언트 점수·시간을 믿던 구조 강화 | 클라이언트가 `correct`, `score`, heartbeat 초를 전송 | 선택지는 서버 정답으로 평가, recall은 일회성 receipt 사용, heartbeat는 서버 경과시간으로 제한 | `93be5de`, `lib/learning-integrity.ts`, `app/api/progress/route.ts`, `drizzle/0007_handy_spencer_smythe.sql` |
| AI처럼 보이는 fallback을 구분 | 평가 출처 설명이 불명확 | OpenAI 평가와 deterministic local fallback을 화면·문서에서 명시 | `3bd61ce`, `app/page.tsx`, `worker/index.ts`, `README.md` |
| 모바일에서 한 번에 끝나지 않음 | 기본 모바일 화면 | 보조문구 확대→단계 라벨→탭 상세→오픈 베타 전체 polish를 연속 적용 | `3258b1b`, `3c1c20d`, `c848233`, `8b276e1`, `b08cc4e` |
| 첫 진입 순서가 제품 가설과 어긋남 | 게스트가 기본 학습 데모로 진입 | 무가입 진단을 첫 경험으로 라우팅 | `1a237d4`, `lib/entry-routing.ts`, `tests/entry-routing.test.mjs` |
| 기능 설명형 진단 화면을 다시 만듦 | 진단 기능·교육과정 사실 중심 인트로 | “한 아빠의 발견”→예시 결과→7일 제안→FAQ 순서의 부모 의도 랜딩 | `422c1e5`, `app/diagnosis/page.tsx`, `app/globals.css` |
| 허영 지표를 판정 기준에서 배제 | streak는 활동만 해도 오르고 중간 결석 시 리셋 | 15분 완료 이벤트의 고유 날짜로 가격 질문·7일 진행 판정 | `a92ce41`, `26dbc80`, 미추적 `docs/codex/landing-funnel-phase1.md` |

**명시적 리버트 여부:** `git log --all --format='%h|%s' | rg -i '\|(revert)'` 결과는 0건이다. 수정 흔적은 `Fix` 1건(`0a5c21a`), `Harden` 2건(`3dbc4f7`, `93be5de`), `Clarify` 1건(`3bd61ce`), `Rebuild` 1건(`422c1e5`), 그리고 여러 `Improve/Polish` 커밋으로 남아 있다.

## 4. 숫자 팩트 시트

| 항목 | 검증값 | 재현 명령/근거 | 주의 |
|---|---:|---|---|
| `main` 커밋 | 36 | `git rev-list main --count` | 병합 커밋 포함 |
| 전체 refs 고유 커밋 | 37 | `git rev-list --all --count` | PR #1 원 커밋 1개가 `main` 밖에 추가 |
| 개발 경과시간 | 346,609초 = 96.28시간 = 4.01일 | `git log --all --format='%ct' \| sort -n`의 첫·끝 epoch 차이 | 달력 날짜 포함 5일 |
| 커밋 발생일 | 5일 | `git log --all --format=%ad --date=short \| sort -u \| wc -l` | 7/15~7/19 모두 커밋 있음 |
| 날짜별 전체 refs 커밋 | 2 / 5 / 8 / 10 / 12 | `git log --all --format=%ad --date=short \| sort \| uniq -c` | 7/18의 10개 중 1개는 PR #1 원 브랜치 커밋 |
| SQL 마이그레이션 | 8 | `find drizzle -maxdepth 1 -name '*.sql' -print \| wc -l` | `0000`~`0007` |
| 현재 DB 테이블 | 13 | `rg -c '^export const .*sqliteTable' db/schema.ts` | Drizzle 선언 수 |
| API 라우트 | 11 | `find app/api -name route.ts -print \| wc -l` | 빌드 결과에도 11개 표시 |
| 페이지 | 8 | `find app -name page.tsx -print \| wc -l` | `/`, auth callback, checkout 2, diagnosis, parent, privacy, terms |
| 테스트 파일 | 6 | `find tests -name '*.test.mjs' -print \| wc -l` | Node test 파일 |
| 이름 붙은 테스트 | 42 | `rg -c 'test\(' tests/*.test.mjs` 합계; `npm test` 결과 `tests 42` | 조사 시점 42/42 통과 |
| 학습자 공개 단어 | 30 | `rg -c '^    id: "' data/words.ts` | 현재 `dailyWords` |
| 무료 진단 문항 | 기본 20, 조건부 최대 25 | `app/diagnosis/page.tsx`; `app/api/diagnosis/route.ts` | 최약 연결 점수 ≤60이면 5개 추가 |
| 교육과정 지도 | 3,000 headwords | JSON의 `words.length`; `tests/curriculum-data.test.mjs` | `data/curriculum/ko-2022-basic-words.json` |
| 확장 후보 | 400 = 단어 300 + 표현 100 | 두 catalog JSON의 `items.length`; `lib/content-catalog.ts` | 전부 candidate, 학습자 비노출 |
| 상품 정의 | 12,900원/1명, 19,900원/최대3명, 각 30일 | `lib/plans.ts` | README상 미검증 베타 가설; 베타 UI 결제 비활성 |
| 무료 기간 | 7일 | `lib/commercial.ts`의 `7 * 24 * 60 * 60 * 1000` | 카드 없이 첫 부모 요청 때 생성 |
| 일일 집중 목표 | 900초 | `app/page.tsx`, `app/api/progress/route.ts` | 탭/포커스/최근 활동 조건 적용 |
| 네 연결 완료 mask | 15 | `lib/adaptive-queue.ts` | 비트 1+2+4+8 |
| 재출제 간격 | 서로 다른 3단어 뒤, 최대 2회 | `insertBoundedRetry`와 테스트 | 같은 자리 즉시 반복 아님 |
| 1차 베타 KPI 목표 | WPA 5가정/4주 | 미추적 `OPEN_BETA_KPI.md` | 제품 실적이 아니라 계획값 |

검증 시 실행한 `npm test`는 vinext production build 후 42개 테스트가 모두 통과했고, 실패·스킵·todo는 0이었다. “매출”, “유료 고객”, “학습 성과 향상률”, “실사용 유지율” 수치는 저장소에 없으므로 팩트 시트에 넣을 수 없다.

## 5. AI 협업 흔적

### 강한 근거

- 커밋된 `README.md`는 “continuous Codex collaboration”을 명시하고, Codex가 반응형 vinext 앱, 상태머신, 이중언어 UI, 단어 데이터, D1 모델, API, 테스트, 배포 흐름을 만들었다고 기록한다. 근거가 들어간 커밋은 적어도 조사 시점 `main`에 존재한다. 파일: `README.md`의 **How Codex and GPT-5.6 were used**.
- 커밋된 `docs/submission/DEVPOST_COPY.md`는 사람이 founder story·문제·우선순위·최종 결정을 제공하고 Codex가 구현·디버깅·테스트·모바일·분석·SEO·배포·문서화를 지원했다고 역할을 구분한다. 근거: `181527a`.
- Git refs에 `agent/cloze-recall-mobile`, `agent/improve-landing-funnel`, `agent/mobile-open-beta-polish`, `origin/agent/seo-analytics-foundation`이 남아 있다. 커밋 메시지에 저장된 PR 제목은 #1 **Improve cloze recall and mobile learning**, #2 **Reframe the landing and qualify the beta funnel**, #3 **Polish the mobile open-beta journey**, #4 **Prepare search analytics and Build Week submission**이다. 근거: `git show -s --format='%B' 50c511a 50ee3c9 b08cc4e 0cff5c7`.
- `docs/codex/landing-funnel-phase1.md`는 요구사항·금지 약속·파일별 작업·테스트까지 적힌 자체완결형 Codex 지시서이고, 실제 `1a237d4`~`e707bc2`의 구현 순서와 대응한다. 다만 이 파일은 조사 시점 **미추적**이므로 커밋 시각 증거는 아니다.
- `docs/build_story_run.log`에는 Codex CLI 실행 헤더와 이번 소스팩 채굴 명령이 남아 있다. 역시 **미추적 실행 로그**라 제품 개발 전 과정의 저자 증거로 과장하면 안 된다.

### 런타임 AI의 코드 근거

- `app/api/evaluate/route.ts`는 OpenAI Responses API와 `OPENAI_MODEL` 기본값 `gpt-5.6`을 사용해 제한된 curriculum item의 의미·사용을 structured output으로 평가한다.
- 키·할당량·스토리지 문제가 있으면 deterministic local fallback을 사용하고 source를 구분한다. `93be5de`는 평가 receipt와 입력 allowlist를 강화했고, `3bd61ce`는 출처 설명을 명확히 했다.
- 콘텐츠 생성은 서버 전용이며 자동 공개되지 않는다. `lib/content-pipeline.ts`, `lib/content-admin.ts`, `content_drafts`/`content_reviews` 테이블이 deterministic validation과 인간 게이트를 강제한다. 근거: `46cfef3`.

### 확인되지 않는 것

- 브랜치 이름 `agent/*`는 에이전트 워크플로의 강한 정황이지만, 각 줄을 어떤 모델이 작성했는지를 Git만으로 입증하지는 못한다.
- 저장소에는 Claude가 제품 구현에 참여했다는 커밋된 증거가 없다. `docs/BUILD_STORY_BRIEF.md`의 “다음 단계(Claude+사람)” 언급은 향후 각색 단계 설명일 뿐이다.
- 제출 문서의 Codex `/feedback` Session ID는 아직 placeholder다. 정확한 세션 ID가 기록되기 전에는 특정 Codex 세션과 커밋을 일대일로 연결했다고 주장할 수 없다. 근거: `docs/submission/JUDGE_TESTING.md`, `docs/submission/DEVPOST_COPY.md`.

## 6. 아빠 서사 연결점

### 6.1 “뜻은 외웠는데 읽거나 들으면 모른다” → 네 축 진단

- 랜딩의 아빠 서사는 뜻 암기와 발음·청취의 단절을 말한다. 구현은 한 단어를 `see`, `hear`, `context`, `recall` 네 문제 유형으로 나눠 별도 점수를 낸다.
- `see`: 철자→한국어 뜻 선택. `hear`: 글자를 숨기고 browser speech를 들은 뒤 단어 선택. `context`: 문장 빈칸에 자연스러운 단어 선택. `recall`: 한국어 뜻 cue로 영어 단어 직접 입력.
- 근거: `422c1e5`; `app/diagnosis/page.tsx`의 랜딩 story, `choiceValues`, `correctValue`, 질문 렌더링; `data/words.ts`.

### 6.2 “아이가 부족한 게 아니라 연결이 아직 없다” → 결과 언어와 최약축

- 결과 화면은 네 점수 평균과 가장 낮은 축을 계산하지만, “아이는 단어를 모르는 게 아니라, 아직 연결되지 않았을 뿐”이라고 재해석한다.
- 낮은 점수 축은 단순 리포트에 그치지 않고 다음 큐의 `focusSkill`이 된다.
- 근거: `422c1e5`; `app/diagnosis/page.tsx`; `lib/adaptive-queue.ts`의 `weakestSkill`, `buildAdaptiveQueue`; `tests/adaptive-queue.test.mjs`.

### 6.3 “몇 개 외웠나보다 어디서 끊겼나” → 30개 할당량 폐기와 15분

- 제품은 완료 기준을 30단어 수에서 실제 활동 15분으로 바꿨고, 그 시간 동안 네 연결을 완료한 **고유 단어 수**를 결과로 보여준다.
- 근거: `58930fb`; `app/page.tsx`; `app/api/progress/route.ts`; `db/schema.ts`의 `studySecondsToday`, `dailySessionCompleted`.

### 6.4 “끊긴 연결부터” → 약한 축 우선·지연 반복

- 가장 낮은 score 축이 새 큐의 첫 focus가 된다. 놓친 단어는 즉시 다시 나오지 않고 세 단어 뒤 재등장하며, 완료된 네 축 cycle의 오류 여부가 mastery와 다음 due time에 반영된다.
- 근거: `e3eb150`; `lib/adaptive-queue.ts`; `db/schema.ts`의 `mastery`, `intervalHours`, `dueAt`, `cycleSkillMask`, `cycleHadError`.

### 6.5 “아이 혼자 시작하되 책임은 부모가” → 익명 진단과 부모 소유 데이터

- 아이는 이메일·비밀번호 없이 익명 ID로 진단한다. 계속 보관하려면 부모가 로그인하고 동의한 뒤 정확한 child profile에 진단을 claim한다.
- 근거: `461c209`, `1a237d4`, `93be5de`; `app/diagnosis/page.tsx`; `app/api/diagnosis/route.ts`; `app/api/commercial/profile/route.ts`; `lib/auth.ts`; `db/schema.ts`.

### 6.6 아빠의 관찰을 과장된 성과 주장으로 바꾸지 않는다

- 랜딩은 “학교 성적을 예측하는 시험이 아니라 학습 연결을 찾는 도구”라고 선을 긋는다. KPI 문서도 초기 목표를 시장 규모 예측으로 보지 않고, 제출 문서는 성적 향상·기억 효과가 이미 입증됐다고 말하지 말라고 한다.
- 근거: `app/diagnosis/page.tsx`; 미추적 `OPEN_BETA_KPI.md`; `docs/submission/DEVPOST_COPY.md`; 미추적 `docs/HACKATHON_SUBMISSION_HANDOFF.md`.

## 7. 에피소드 후보 리스트

1. **96시간 17분 — MVP에서 제출 패키지까지**: 7월 15일 `729218d`에서 7월 19일 `0cff5c7`까지 346,609초, 한 주 안에 36개 `main` 커밋.
2. **이름을 바꾼 날 — LoopVoca가 15Loop가 되다**: `21d90bb`가 README·앱·패키지·브랜드 자산 12개 파일을 교체.
3. **아이 로그인 코드를 지운 날**: `2ec7d21`의 ChatGPT 학습자 계정 뒤 `461c209`에서 `app/chatgpt-auth.ts`를 삭제하고 부모 소유 Supabase 구조로 전환.
4. **30단어를 포기하고 15분을 택하다**: `58930fb`가 수량 완료를 활동시간 900초와 실제 연결 단어 수로 교체.
5. **결제 버튼까지 만들고 베타에서 숨기다**: `461c209`의 Toss 결제 UI를 `b50174e`가 제거하고 초5·6·중1 7일 무료로 범위를 축소.
6. **가입 버튼을 뒤로 보낸 날**: `1a237d4`가 게스트 첫 화면을 학습 데모에서 무가입 진단으로 변경.
7. **한 아빠의 발견이 랜딩이 되다**: `422c1e5`가 기능 설명형 진단 인트로를 아빠 이야기→예시 결과→7일 제안으로 재구성.
8. **20문항으로 시작해 약한 곳만 5문항 더 묻다**: `app/diagnosis/page.tsx`가 20개 후 최약축 ≤60일 때 5개를 같은 축으로 추가.
9. **아이의 한숨이 필수 문장을 선택 도전으로 바꾸다**: 커밋 문서의 사용자 관찰과 `50c511a`의 전체 문장→cloze+선택 AI 문장 전환.
10. **틀린 단어를 바로 다시 내지 않기로 하다**: `e3eb150`의 `insertBoundedRetry`가 서로 다른 세 단어 뒤에만 재삽입.
11. **3,000개를 넣고도 30개만 보여주다**: `3d2c44a`의 교육과정 지도, `46cfef3`의 400 candidate, 현재 30개 learner-visible 풀과 인간 publication gate.
12. **클라이언트를 믿지 않기로 한 커밋**: `93be5de`가 점수·정답·heartbeat를 서버 검증과 일회성 receipt로 교체.
13. **AI가 답했는지 로컬 코드가 답했는지 밝히다**: `3bd61ce`가 평가 source를 명확히 하고 fallback을 숨기지 않음.
14. **모바일은 한 번에 완성되지 않았다**: `3258b1b`→`3c1c20d`→`c848233`→`8b276e1`의 연속 보정과 PR #3.
15. **유료의향을 묻기 전에 3일을 기다리다**: `a92ce41`과 `26dbc80`이 streak 대신 실제 15분 완료일 3일을 가격 질문 조건으로 사용.

## 재현 명령 모음

```bash
git rev-list main --count
git rev-list --all --count
git log --all --reverse --date=iso-strict --format='%H|%ad|%s'
git log --all --format=%ad --date=short | sort | uniq -c
git log --graph --all --decorate --oneline
git log --all --stat
git log --all --format='%h|%s' | rg -i '\|(revert|fix|harden|improve|rebuild|polish|clarify)'
git diff --quiet 2eddb42 50c511a
find drizzle -maxdepth 1 -name '*.sql' -print | wc -l
rg -c '^export const .*sqliteTable' db/schema.ts
find app/api -name route.ts -print | wc -l
find app -name page.tsx -print | wc -l
find tests -name '*.test.mjs' -print | wc -l
rg -c 'test\(' tests/*.test.mjs
rg -c '^    id: "' data/words.ts
npm test
```

JSON 배열 수는 다음 세 필드로 재현한다: `data/curriculum/ko-2022-basic-words.json`의 `words.length` = 3,000, `data/catalog/middle-school-core-words-300.json`의 `items.length` = 300, `data/catalog/middle-school-daily-expressions-100.json`의 `items.length` = 100.
