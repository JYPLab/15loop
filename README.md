# 15Loop

15Loop is an adaptive English vocabulary learning engine for Korean students who have limited English exposure. Instead of asking only whether a learner memorized a definition, it evaluates four separate memory connections:

1. Recognition — can the learner connect the written word to its meaning?
2. Listening — can the learner identify the word from sound alone?
3. Context — can the learner use the word naturally in a sentence?
4. Active recall — can the learner retrieve the full expression without a hint?

The MVP provides a bilingual Korean/English experience, an adaptive 20–25 word free diagnostic, a 15-minute active learning session, browser speech, randomized review, parent-owned family accounts, up to three child profiles, a seven-day trial, Toss Payments-ready 30-day passes, privacy-first friend challenges, and GPT-5.6-powered recall evaluation.

**Brand promise:** 15 minutes. Words that stay. The proposed canonical domain is `15loop.com`; availability checks do not reserve a domain, so it must be registered before public deployment.

## Why it exists

15Loop began with a simple parent story: a father realized that his child entered middle school without years of English pre-study. The problem was not effort alone. Printed vocabulary books separated spelling, sound, meaning, context, and retrieval. 15Loop reconnects those pieces and evaluates which connection is actually weak.

## Product loop

- A 30-word school-level library feeds a 15-minute daily session; the outcome is how many distinct words the learner connected during that focused time.
- Focus time counts only while the learning tab is visible, focused, and recently active. It pauses after 60 seconds without interaction and resumes from the saved daily total.
- Every word passes through recognition, listening, context, and active recall.
- Missed words are inserted back into the queue after other words, rather than repeated mechanically in place.
- Each evaluation updates a learner-specific connection profile.
- D1 stores skill scores, word mastery, review intervals, due times, and event history.
- GPT-5.6 evaluates semantic recall with structured bilingual feedback.
- A deterministic local evaluator keeps the demo usable if the API is temporarily unavailable and clearly labels that fallback in the interface.
- Learners can share a lightweight achievement message or invite a friend to a five-word listening challenge through a private URL. No public ranking, real name, school detail, or open chat is required.

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

## Commercial local setup

Copy `.env.example` to `.env.local` and configure:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
APP_ORIGIN=http://localhost:3000
```

- **Parent authentication:** Create a Supabase project, enable Google and email authentication, and allow `http://localhost:3000/auth/callback` as a redirect URL. Email magic links require a production SMTP provider before public launch; Supabase's default sender is intended only for limited testing.
- **Payments:** Use Toss Payments test client and secret keys locally. The browser opens Toss Standard Payments v2, while the server creates the authoritative order, verifies the returned amount, and confirms the payment using the secret key. The current products are non-renewing 30-day passes; automatic recurring billing is intentionally excluded until a separate billing contract is approved.
- **Pricing:** KRW 12,900 for one learner and KRW 19,900 for up to three learners are initial beta hypotheses, not validated final prices.
- **Legal launch gate:** Before collecting real customer data or money, add reviewed terms, privacy policy, refund policy, explicit consent, business/merchant information, and the required child-data safeguards.

## Persistence

The Sites project declares a D1 binding named `DB`. Schema definitions live in `db/schema.ts`, and generated SQL migrations are stored in `drizzle/`. The browser stores only an anonymous device identifier and language preference; learning records remain authoritative in D1.

## Parent and child flow

- A student completes a free 20-word diagnostic without registration. If a connection score is 60 or lower, five additional questions focus on the weakest connection.
- The parent—not the student—creates the account through Google OAuth or an email magic link.
- The first authenticated request creates a seven-day trial without card details. A parent can create up to three separate child profiles and attach the diagnostic to one child.
- Child learning URLs require both a valid parent session and parent-child ownership. The server also rejects learning writes after the trial or paid access expires.
- The server derives identity from a verified Supabase access token and never trusts a client-supplied parent email.
- Anonymous users receive one learning sample and are then directed to the free diagnostic or parent account.

## Payment safety

- Product names and amounts come from server-owned plan definitions.
- A payment order belongs to the authenticated parent and stores its expected amount before the payment window opens.
- Confirmation verifies ownership, stored amount, Toss response order ID, total amount, and `DONE` status.
- Toss secret keys never reach the browser, and the confirmation request uses an idempotency key.
- An individual pass cannot be purchased while more than one child profile is linked.
- The OpenAI evaluator accepts only server-known curriculum sentences. Daily AI-call quotas are enforced per anonymous network or authenticated family, with a local evaluator fallback when the quota or storage is unavailable.

## Deployment path

The current implementation is intentionally local. Once authentication, test payments, migrations, and legal copy are accepted, the next phase is to push the repository to GitHub, configure production secrets in the hosting provider, run the D1 migrations, deploy, and then attach the custom domain. No production domain or live payment key should be used before that checklist is complete.

## Verification

```bash
npm test
npm run lint
```

## How Codex and GPT-5.6 were used

This project was built during OpenAI Build Week through a continuous Codex collaboration.

- **Problem framing:** The founder described the real learning gap from a parent's point of view. Codex helped turn that story into a testable four-connection learning model.
- **Product decisions:** The founder chose the 15Loop name, the Korean middle-school audience, evaluation as the core differentiator, and randomized repetition as the long-term engine.
- **Engineering acceleration:** Codex created the responsive vinext application, learning state machine, bilingual interface, word dataset, D1 data model, API routes, tests, and Sites deployment workflow.
- **Human judgment:** The founder decided to preserve Korean as the authentic learner interface while adding a complete English mode for international judges.
- **GPT-5.6 contribution:** GPT-5.6 is the runtime evaluator for active recall. It judges semantic equivalence more intelligently than string matching and produces structured bilingual feedback. GPT-5.6 was also the reasoning model used with Codex for architecture and implementation decisions.

The git history and the Build Week Codex session provide timestamped evidence of the implementation completed during the submission period.
