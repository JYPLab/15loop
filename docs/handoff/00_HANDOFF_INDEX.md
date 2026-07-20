# 15Loop 통합 핸드오프 인덱스

*기준 시점: 2026-07-19, GitHub `main` 머지 커밋 `0cff5c7`*

## 목적

이 인덱스는 15Loop와 관련해 지금까지 결정된 제품·사업·개발·오픈베타·마케팅·해커톤 내용을 다음 작업자가 다시 대화 전체를 읽지 않고 이어갈 수 있게 한다.

## 정본 문서

| 우선순위 | 문서 | 역할 |
|---:|---|---|
| 1 | `.agents/product-marketing-context.md` | 제품, 고객, 문제, 차별점, 표현 원칙의 마케팅 정본 |
| 2 | `docs/handoff/01_PRODUCT_AND_BUSINESS_HANDOFF.md` | 제품 구조, 사용자·구매자, 가격, 데이터, 범위 결정 |
| 3 | `docs/handoff/02_BUILD_STORY_MASTER.md` | 창업자 문제 발견부터 오픈베타까지 상세 개발기와 증거 |
| 4 | `docs/handoff/03_MARKETING_CONTENT_HANDOFF.md` | 개발기를 부모 모집과 Project JYP 리드로 전환하는 콘텐츠 시스템 |
| 5 | `docs/handoff/04_OPEN_BETA_OPERATIONS_HANDOFF.md` | 모집, 코호트, KPI, 인터뷰, 이메일, 개인정보, 주간 판정 |
| 6 | `docs/handoff/05_HACKATHON_AND_RELEASE_HANDOFF.md` | 해커톤 제출 현황, 남은 사람 작업, 출시 후 기술 작업 |
| 7 | `docs/handoff/06_DECISION_LOG_AND_OPEN_ITEMS.md` | 고정된 결정, 충돌 해소, 아직 결정할 항목 |

## 기존 실행 자료

- `docs/BUILD_STORY_SOURCE.md`: Git·코드·테스트로 재현 가능한 개발기 1차 증거 소스팩
- `docs/submission/DEVPOST_COPY.md`: 영문 Devpost 제출 문안
- `docs/submission/DEMO_SCRIPT.md`: 3분 미만 영문 데모 대본
- `docs/submission/ASSET_SHOT_LIST.md`: 촬영 컷과 이미지 목록
- `docs/submission/JUDGE_TESTING.md`: 심사위원 테스트 경로
- `docs/submission/DEMO_VIDEO_HANDOFF_KO.md`: 한국어 촬영 실행 지시서
- `docs/ANALYTICS_TRACKING_PLAN.md`: GA4와 1차 데이터 계측 분리 원칙
- `docs/OPEN_BETA_EMAILS.md`: 확인 가능한 데이터만 쓰는 수동 이메일 4통
- `OPEN_BETA_KPI.md`: 초기 KPI 문서. 아래 충돌 해소 규칙을 적용해 읽는다.

## 반드시 구분할 두 사업 목표

### 15Loop 제품 검증

- 대상: 초등 5·6학년 및 중학교 1학년 자녀를 둔 부모
- 목표: 많은 무료 가입이 아니라 실제 반복 사용과 가격 의향 검증
- 북극성: WPA 5가정
- 표준 퍼널: 가격 확인 → 무료 진단 → 부모 연결 → 첫 학습 → 완료 학습일 3일 → 가격 의향

### Project JYP 성장

- 대상: 바이브 코딩은 관심 있지만 자기 서비스를 출시·검증하지 못한 사람
- 목표: 15Loop 개발기를 증거로 프로젝트 브리프와 첫 빌드 행동을 만든다.
- 북극성: WAB 6명
- 15Loop는 Project JYP의 실제 출시 사례이지만, Project JYP 오디언스가 자동으로 15Loop 구매자가 되는 것은 아니다.

## 충돌 해소 규칙

1. **WPA 조건:** 현재 제품 구현과 최신 퍼널 기준은 `서로 다른 3일의 15분 학습 완료 + 12,900원 의향`이다. 예전 문서의 `총 45분이면 대체 가능` 조건은 사용하지 않는다.
2. **7일 효과 표현:** D0↔D7 정답률·점수 향상 비교는 아직 구현·검증되지 않았다. 마케팅 약속에 쓰지 않는다.
3. **베타 1,000명:** Project JYP의 공개 도전·상단 유입 목표일 수 있으나 15Loop의 제품 성공 KPI가 아니다. 적합 가정·반복 사용·WPA를 별도로 집계한다.
4. **결제:** 코드 기반 준비와 가격 가설은 존재하지만 오픈베타·해커톤 심사 경로에서는 결제정보를 받지 않는다.
5. **콘텐츠 규모:** 교육과정 지도 3,000개와 후보 400개가 있어도 학습자에게 자동 공개하지 않는다. 현재 공개 세트는 검수된 30개다.
6. **AI 역할:** GPT-5.6은 제품 전체를 대신 판단하는 교사가 아니라 제한된 문장·의미 평가기다.
7. **계정 소유:** 아이가 가입하지 않는다. 무가입 진단 뒤 부모가 로그인하고 아이 프로필을 만든다.

## 현재 완료 상태

- 운영 URL: https://15loop.com
- 공개 저장소: https://github.com/JYPLab/15loop
- 부모 Google·이메일 인증 흐름 구현
- 무가입 무료 진단 20~25개 구현
- 15분 학습과 적응형 복습 구현
- GPT-5.6 실제 평가와 표시된 로컬 대체 평가 구현
- 부모 계정, 최대 3명 아이 프로필, 보호자 동의 구현
- 교육과정·콘텐츠 후보 백데이터와 검수 게이트 구현
- 모바일 최적화, SEO, GA4 기반 퍼널 계측 구현
- GitHub PR #4까지 `main` 머지
- 개발기 증거 소스팩 로컬 커밋 `5c079d0` 생성
- 린트, 빌드, 자동 테스트 42개 통과

## 바로 이어서 할 일

1. 해커톤 데모 영상 촬영·편집·YouTube 업로드
2. 정확한 Codex `/feedback` Session ID 확보
3. 저장소 라이선스 선택 후 추가
4. Devpost 최종 제출
5. 부모 오픈베타 첫 코호트 모집과 데이터 기준선 기록
6. 15Loop 개발기 시즌 콘텐츠 발행
7. 실제 부모 언어·반론·아이 사용 장면을 인터뷰로 보강

## 문서 유지 규칙

- 제품 결정이 바뀌면 먼저 `.agents/product-marketing-context.md`와 `06_DECISION_LOG_AND_OPEN_ITEMS.md`를 갱신한다.
- 학습 효과 수치는 검증 전에는 추가하지 않는다.
- 외부에 공개하는 모든 숫자는 DB, Git, 테스트 또는 화면 캡처로 재현 가능해야 한다.
- 아이 실명, 학교, 부모 이메일, 자유서술 답안을 마케팅 분석 도구에 보내지 않는다.
