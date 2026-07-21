# 15Loop

15Loop is an adaptive English vocabulary learning engine for Korean students who have limited English exposure. Instead of asking only whether a learner memorized a definition, it evaluates four separate memory connections:

1. Recognition — can the learner connect the written word to its meaning?
2. Listening — can the learner identify the word from sound alone?
3. Context — can the learner use the word naturally in a sentence?
4. Active recall — can the learner retrieve the full expression without a hint?

The MVP provides a bilingual Korean/English experience, an adaptive 20–25 word free diagnostic, a 15-minute active learning session, browser speech, randomized review, parent-owned family accounts, up to three child profiles, a seven-day trial, Toss Payments-ready 30-day passes, privacy-first friend challenges, and GPT-5.6-powered recall evaluation.

**Brand promise:** 15 minutes. Words that stay. The canonical domain is `15loop.com`.

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
OPENAI_CONTENT_MODEL=gpt-5.6
CONTENT_ADMIN_TOKEN=long_random_secret
```

`POST /api/evaluate` uses the OpenAI Responses API with strict Structured Outputs. The model returns correctness, a score, an error category, a canonical answer, and feedback in both Korean and English. Prompts contain only the submitted learning sentence and do not request personal information.

The server-only content pipeline also uses strict Structured Outputs to create original drafts for catalog candidates. A draft must pass deterministic validation, then move through separate human `reviewed` and `published` gates. Generated content is never added to the learner queue automatically.

## Commercial local setup

Copy `.env.example` to `.env.local` and configure:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
APP_ORIGIN=http://localhost:3000
GA_MEASUREMENT_ID=
GOOGLE_SITE_VERIFICATION=
NAVER_SITE_VERIFICATION=
```

- **Parent authentication:** Create a Supabase project, enable Google and email authentication, and allow `http://localhost:3000/auth/callback` as a redirect URL. Email magic links require a production SMTP provider before public launch; Supabase's default sender is intended only for limited testing.
- **Payments:** Use Toss Payments test client and secret keys locally. The browser opens Toss Standard Payments v2, while the server creates the authoritative order, verifies the returned amount, and confirms the payment using the secret key. The current products are non-renewing 30-day passes; automatic recurring billing is intentionally excluded until a separate billing contract is approved.
- **Pricing:** KRW 12,900 for one learner and KRW 19,900 for up to three learners are initial beta hypotheses, not validated final prices.
- **Legal launch gate:** The beta includes versioned guardian consent, terms, and a privacy notice. Before collecting real payments, a qualified reviewer must still approve the documents, add the operator/merchant contact details and refund policy, and confirm the guardian-verification method for learners under 14.

## Search and analytics setup

The public diagnostic is the canonical, indexable landing page. `robots.txt` and `sitemap.xml` allow the landing and legal pages while excluding account, authentication, checkout, and API routes.

Configure these runtime values before registering the site with search providers:

```bash
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_SITE_VERIFICATION=
NAVER_SITE_VERIFICATION=
```

GA4 records acquisition and onboarding steps only. Analytics events never include parent email, child nickname, learner identifiers, answers, or studied words. Product retention and learning completion remain authoritative in the first-party `beta_events` data.

- Google Search Console: add the `15loop.com` domain property, verify it by DNS when possible, then submit `https://15loop.com/sitemap.xml`.
- Naver Search Advisor: add `https://15loop.com`, use the verification meta value when needed, then submit the same sitemap.
- Daum Search Registration: submit the public diagnostic as the representative site after the production SEO files are live.

## Persistence

The Sites project declares a D1 binding named `DB`. Schema definitions live in `db/schema.ts`, and generated SQL migrations are stored in `drizzle/`. The browser stores only an anonymous device identifier and language preference; learning records remain authoritative in D1.

## Parent and child flow

- A student completes a free 20-word diagnostic without registration. If a connection score is 60 or lower, five additional questions focus on the weakest connection.
- The parent—not the student—creates the account through Google OAuth or an email magic link.
- The first authenticated request creates a seven-day trial without card details. A parent can create up to three separate child profiles and attach the diagnostic to one child.
- The current policy versions and guardian confirmation are stored before child data is linked. Pre-signup diagnostic and learning progress are migrated to the exact child profile created by the parent.
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

## Content catalog

- The official 2022 revised Korean curriculum vocabulary coverage map contains 3,000 headwords.
- A server-only beta candidate catalog contains 300 middle-school core words and 100 daily expressions.
- All 400 candidates begin as non-learner-visible `candidate` records. Rights metadata and source boundaries are stored with the catalog.
- The current learner-facing set remains the separately reviewed 30-word beta set.

## Deployment path

The app is deployed through Sites and backed by D1. GitHub `main` is the source of record. Production Supabase values are configured; OpenAI and Toss runtime keys must be added before live AI generation or test payments can be exercised. The custom domain may remain unavailable while its TLS certificate is being issued.

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


## License

Copyright (C) 2026 JYPLab.

The 15Loop source code is licensed under the [GNU Affero General Public License v3.0 only](LICENSE). If you run a modified version as a network service, you must offer its corresponding source code as required by the license.

The 15Loop name, logo, domain, and other brand identifiers are not licensed for reuse. Third-party dependencies remain subject to their own licenses.
