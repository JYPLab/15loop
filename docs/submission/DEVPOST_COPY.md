# 15Loop — Devpost Submission Copy

Status: copy-ready except for the public YouTube URL and the verified Codex `/feedback` Session ID.

## Submission fields

**Project name**

15Loop

**Track**

Education

**Tagline**

Find the connection a word is missing—then rebuild it in 15 focused minutes.

**Short description**

15Loop is an adaptive English vocabulary coach for Korean upper-elementary and first-year middle-school learners. It checks four separate connections—written word to meaning, sound to word, word in context, and meaning to active recall—then uses the learner's evidence to decide what should be reviewed next.

**Production demo**

https://15loop.com

**Source repository**

https://github.com/JYPLab/15loop

**Public demo video**

`[ADD PUBLIC YOUTUBE URL]`

**Codex Session ID**

`[ADD EXACT /feedback SESSION ID]`

## Inspiration

15Loop started with a parent problem.

My child entered middle school without years of English pre-study or long stays abroad. He was working, but a printed vocabulary book still left several tasks disconnected: seeing a word, knowing how it sounds, understanding it in a sentence, and retrieving it without a hint. A correct Korean translation did not always mean the word was available when he needed it.

I found other Korean families facing the same gap. They did not need another instruction to “memorize harder.” They needed a way to see which connection was missing and to practice that connection often enough for the word to become usable.

That became 15Loop.

## What it does

A learner can begin with a free diagnostic without creating an account. The diagnostic checks 20 words and can add five focused questions when one connection is especially weak.

15Loop measures four connections:

1. **Recognition:** connect the written word to its meaning.
2. **Listening:** identify the word from sound alone.
3. **Context:** understand the word inside a sentence.
4. **Active recall:** retrieve the missing word from a meaning and sentence cue.

The result does not label a child as “bad at vocabulary.” It shows the connection that should be strengthened first. A parent can then attach that result to a child profile and continue with a seven-day open-beta program built around 15 minutes of active learning per day.

During continued learning, 15Loop stores connection scores, word mastery, review intervals, and due times. Its adaptive queue gives priority to overdue weak words, then due-soon words, then unseen words. Missed items return after other questions instead of repeating immediately. The goal is not a fixed number of words; it is the number of distinct words the learner actually reconnects during 15 focused minutes.

## How we built it

15Loop is a bilingual responsive web application built with TypeScript, Next.js-compatible vinext, React, Cloudflare D1, Drizzle ORM, Supabase authentication, browser speech synthesis, and the OpenAI Responses API.

The product includes:

- a no-sign-up adaptive diagnostic;
- Korean and English interfaces;
- parent-owned accounts with up to three child profiles;
- Google OAuth and email magic-link paths;
- a 15-minute activity-aware learning timer;
- a learner-specific spaced-review queue;
- four-connection progress data and parent reporting;
- a private five-word friend challenge without public rankings or child identity;
- a deterministic local evaluation fallback when the OpenAI API is unavailable;
- privacy-conscious analytics that exclude child names, answers, studied words, and account identifiers.

The public beta currently uses a human-reviewed 30-word learning set. A larger curriculum map and candidate catalog are kept behind review and publication gates rather than being exposed automatically.

## How GPT-5.6 is used

GPT-5.6 is used at runtime where simple string matching is not enough: evaluating a learner's optional original sentence or semantic recall response.

The evaluation endpoint uses the OpenAI Responses API with strict Structured Outputs. It returns correctness, a score, an error type, a canonical answer, and concise feedback in Korean and English. The server accepts only known curriculum items, treats learner text as untrusted input, does not send names or email addresses, and enforces daily usage limits. If the API is unavailable, the product returns a clearly labeled deterministic fallback so the learning flow does not break.

The AI is not asked to predict grades or certify mastery. It makes one bounded judgment from the learner evidence: whether the intended meaning and target use were preserved, and what feedback will help next.

## How Codex was used

15Loop was built through a continuous collaboration with Codex during OpenAI Build Week.

I supplied the founder story, learner problem, product priorities, Korean parent perspective, and final product decisions. Codex helped turn those decisions into a working system: the learning state machine, bilingual interface, adaptive queue, D1 schema and APIs, authentication flow, GPT-5.6 evaluator, safety constraints, automated tests, mobile fixes, analytics, SEO foundations, deployment, and handoff documentation.

Codex also accelerated review cycles. We inspected real mobile screenshots, changed recall from a burdensome full-sentence requirement to a word-focused cloze with an optional AI sentence challenge, made the free diagnostic the first guest experience, and verified the production path with automated and live checks.

The repository history from July 15–19, 2026 and the submitted Codex Session ID distinguish the Build Week work and provide timestamped evidence of the implementation.

## Challenges we ran into

### Evaluation had to affect the next lesson

Saving scores was not enough. The product promise became real only when due time, mastery, and the learner's weakest connection changed the next queue. We built and tested an adaptive priority model that keeps the session finite and prevents the same missed word from appearing immediately again.

### A technically complete flow could still feel like homework

Our first recall interaction asked learners to write too much. A real child interpreted the four repeated stages as the whole product and found the last step heavy. We changed the primary recall task to one missing word, kept listening and the complete sentence visible after success, and moved open-ended sentence generation into an optional GPT-5.6 challenge.

### The product serves children, but the account belongs to a parent

We separated the learner's low-friction first experience from parental identity and consent. The child can try the diagnostic without an email or password; continued records are attached only after a parent signs in, confirms guardian consent, and creates the child profile.

## Accomplishments we are proud of

- Turned a specific family problem into a complete, mobile-first product rather than a static prototype.
- Made the diagnostic available before sign-up while preserving a parent-owned data model.
- Connected stored learning evidence to the next review queue.
- Added a real GPT-5.6 evaluation path with structured output, allowlisted curriculum inputs, quotas, and a safe fallback.
- Shipped a live bilingual product with automated tests, responsive checks, search foundations, and privacy-conscious funnel analytics.

## What we learned

The most useful question is not “Does the learner know this word?” It is “Which connection to this word is available, and which one disappears under pressure?”

We also learned that AI is strongest here as an evaluator inside a constrained learning system—not as an unlimited content generator. The deterministic product controls the curriculum, timing, identity, and review policy. GPT-5.6 handles the bounded language judgment that benefits from semantic understanding.

## What's next

After the hackathon, we will run the open beta with Korean families, measure completion and repeat use before claiming learning outcomes, expand the learner-visible vocabulary only after human review, and validate whether parents will pay for continued 15-minute practice. Payment, public rankings, pronunciation scoring, and broad curriculum expansion are intentionally outside this submission.

## Build Week evidence

The repository history begins with the working MVP on July 15, 2026 and records meaningful additions during the submission period, including the adaptive review engine, production authentication, data-integrity controls, GPT-5.6 evaluation hardening, the open-beta diagnostic funnel, mobile optimization, analytics, and search infrastructure.

Before final submission, add:

- the exact Session ID returned by `/feedback` in the core Codex task;
- the final public YouTube URL;
- the owner-approved repository license.
