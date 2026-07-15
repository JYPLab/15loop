# LoopVoca

LoopVoca is an adaptive English vocabulary learning engine for Korean middle-school students who have limited English exposure. Instead of asking only whether a learner memorized a definition, it evaluates four separate memory connections:

1. Recognition — can the learner connect the written word to its meaning?
2. Listening — can the learner identify the word from sound alone?
3. Context — can the learner use the word naturally in a sentence?
4. Active recall — can the learner retrieve the full expression without a hint?

The MVP provides a bilingual Korean/English experience, a 30-word daily loop, browser speech, randomized review, persistent learner profiles, progressive account creation, and GPT-5.6-powered recall evaluation.

## Why it exists

LoopVoca began with a simple parent story: a father realized that his child entered middle school without years of English pre-study. The problem was not effort alone. Printed vocabulary books separated spelling, sound, meaning, context, and retrieval. LoopVoca reconnects those pieces and evaluates which connection is actually weak.

## Product loop

- A deterministic daily set contains 30 school-level words.
- Every word passes through recognition, listening, context, and active recall.
- Missed words are inserted back into the queue after other words, rather than repeated mechanically in place.
- Each evaluation updates a learner-specific connection profile.
- D1 stores skill scores, word mastery, review intervals, due times, and event history.
- GPT-5.6 evaluates semantic recall with structured bilingual feedback.
- A deterministic local evaluator keeps the demo usable if the API is temporarily unavailable and clearly labels that fallback in the interface.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run dev
```

The local URL is printed by the development server.

## OpenAI configuration

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-5.6
```

`POST /api/evaluate` uses the OpenAI Responses API with strict Structured Outputs. The model returns correctness, a score, an error category, a canonical answer, and feedback in both Korean and English. Prompts contain only the submitted learning sentence and do not request personal information.

## Persistence

The Sites project declares a D1 binding named `DB`. Schema definitions live in `db/schema.ts`, and generated SQL migrations are stored in `drizzle/`. The browser stores only an anonymous device identifier and language preference; learning records remain authoritative in D1.

## Progressive account flow

- Learners start immediately without registration so the first value is the learning loop itself.
- After completing the first word, LoopVoca offers an optional **Sign in with ChatGPT** step to save the learner profile.
- The server derives account identity from authenticated request headers and never trusts a client-supplied email.
- Anonymous progress is merged into the signed-in profile, including connection scores, word mastery, review timing, and evaluation history.
- Returning learners continue at the learning screen without an onboarding survey. Public hackathon judging remains available without an account.
- LoopVoca does not collect a separate password or school information.

## Verification

```bash
npm test
npm run lint
```

## How Codex and GPT-5.6 were used

This project was built during OpenAI Build Week through a continuous Codex collaboration.

- **Problem framing:** The founder described the real learning gap from a parent's point of view. Codex helped turn that story into a testable four-connection learning model.
- **Product decisions:** The founder chose the LoopVoca name, the Korean middle-school audience, evaluation as the core differentiator, and randomized repetition as the long-term engine.
- **Engineering acceleration:** Codex created the responsive vinext application, learning state machine, bilingual interface, word dataset, D1 data model, API routes, tests, and Sites deployment workflow.
- **Human judgment:** The founder decided to preserve Korean as the authentic learner interface while adding a complete English mode for international judges.
- **GPT-5.6 contribution:** GPT-5.6 is the runtime evaluator for active recall. It judges semantic equivalence more intelligently than string matching and produces structured bilingual feedback. GPT-5.6 was also the reasoning model used with Codex for architecture and implementation decisions.

The git history and the Build Week Codex session provide timestamped evidence of the implementation completed during the submission period.
