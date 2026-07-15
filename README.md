# LoopVoca

외웠는지가 아니라 정말 아는지를 평가하는 AI 영단어 학습 MVP입니다.

## MVP flow

한 단어를 네 가지 연결로 평가합니다.

1. 보고 뜻을 아는가
2. 듣고 단어를 구별하는가
3. 문맥 안에서 이해하는가
4. 힌트 없이 직접 꺼낼 수 있는가

각 결과는 학습자 프로필에 반영되고, 가장 약한 연결을 다음 반복 학습에 우선 배치합니다.

## Run locally

```bash
npm install
npm run dev
```

로컬 기본 주소는 `http://localhost:3000`입니다.

## OpenAI evaluation

환경 변수가 없을 때도 해커톤 데모가 중단되지 않도록 결정론적 평가가 동작합니다. 실제 OpenAI 평가를 연결하려면 `.env.example`을 참고해 다음 값을 설정합니다.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
```

서버의 `/api/evaluate` 경로가 Responses API의 Structured Outputs를 사용하며, 키나 네트워크에 문제가 있으면 로컬 평가로 안전하게 전환합니다.

## Verify

```bash
npm test
```

프로덕션 빌드, 첫 화면 서버 렌더링, 로컬 평가 API, 소셜 미리보기 자산을 함께 검증합니다.
