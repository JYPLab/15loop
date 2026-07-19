# Judge Testing Guide — 15Loop

## Quick access

- Live product: https://15loop.com
- Public repository: https://github.com/JYPLab/15loop
- Recommended device: phone or browser viewport between 375 × 812 and 430 × 932
- Recommended language for international judges: switch `KO` to `EN` in the top navigation when available
- Account required for the primary test: **No**
- Payment required: **No**

## Recommended judge route

### 1. Start the free diagnostic

1. Open `https://15loop.com` in a fresh browser window.
2. The site should route to the public diagnostic landing page.
3. Select English if desired.
4. Choose the free diagnostic action.

Expected result: the learner enters the diagnostic without Google login, email, a password, or payment details.

### 2. Exercise the four connections

Complete representative questions for:

- written word → meaning;
- sound → word;
- sentence context → word;
- cue → missing word.

Expected result: questions advance normally, audio can be replayed, buttons remain usable on mobile, and no horizontal scrolling is required.

The diagnostic contains 20 questions. When a connection score is 60 or below, it can add five focused questions. A normal full run takes approximately 8–12 minutes.

### 3. Review the result

Complete the diagnostic and inspect the result.

Expected result: 15Loop displays four connection scores, identifies the first connection to strengthen, and explains the finding without claiming to predict school grades. The next action offers to connect the result to a parent account.

### 4. Optional continued-learning route

Continued records belong to a parent-owned account. Parent authentication supports Google OAuth and email magic links. A parent can confirm guardian consent, create up to three child profiles, and attach the pre-sign-up diagnostic to one child.

No payment is required during the seven-day open beta, and no automatic charge is created.

If a judge does not want to create an account, the public diagnostic is the complete credential-free judging route. The demo video shows the parent transition, adaptive 15-minute session, and GPT-5.6 evaluation.

## What to look for

### Adaptive learning

For a saved learner, the server builds the session queue from the learner's connection scores and word-review state. It prioritizes overdue weak words, then due-soon words, then unseen words. Missed words return after other items rather than repeating immediately.

### GPT-5.6

After a correct cloze recall during continued learning, open the optional sentence challenge and submit a short original sentence using the target word.

Expected result when the OpenAI path is available:

- the response includes specific Korean and English feedback;
- the interface labels the response as a GPT-5.6 evaluation;
- harmless variation is judged semantically rather than by exact string equality.

Expected result during a temporary API or quota failure:

- the learning flow continues;
- the interface clearly labels the deterministic local evaluation instead of presenting it as GPT-5.6.

## Privacy and safety notes

- Do not enter a real child's name, school, email, or personal story.
- Learner text sent for AI evaluation is limited to a known curriculum task and the submitted answer.
- The evaluation prompt does not include a parent email or child profile name.
- Public friend challenges use private links and do not expose real names, schools, public rankings, or open chat.
- The diagnostic is a learning-connection tool, not a prediction of grades or a professional educational assessment.

## Current beta boundaries

- The learner-visible beta vocabulary set contains 30 human-reviewed words.
- The larger curriculum map and candidate catalog are not automatically published to learners.
- Browser speech synthesis provides pronunciation audio; pronunciation scoring is not part of this submission.
- Payment integration is not part of the judging route.
- The product is optimized for Korean upper-elementary and first-year middle-school learners; the English mode is provided for judging and explanation.

## Technical verification

Repository checks:

```bash
npm install
npm test
npm run lint
npm run build
```

Runtime requirements and environment-variable names are documented in the repository README. Secret values are not committed.

## Support

For a judging-access problem, contact the entrant through the Devpost submission profile. Do not send child learning data in a support request.

## Submission placeholders

- Public YouTube demo: `[ADD URL]`
- Codex `/feedback` Session ID: `[ADD EXACT SESSION ID]`
- Repository license: `[ADD AFTER OWNER APPROVAL]`
