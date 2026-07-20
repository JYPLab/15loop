# 15Loop OpenAI Build Week Submission Handoff

> **상태 안내 (2026-07-19):** 이 문서는 초기 준비 계획을 보존한다. PR #4 머지 이후의 완료 상태와 실제 남은 작업은 `docs/handoff/05_HACKATHON_AND_RELEASE_HANDOFF.md`를 정본으로 사용한다. 영문 제출 문안·대본·촬영 목록·심사 가이드는 이미 `docs/submission/`에 생성됐다.

## 1. Objective and current phase

Prepare and submit 15Loop to the OpenAI Build Week hackathon as a working Education-track product.

The product itself is already at open-beta level. This phase is **submission packaging and judge-readiness**, not a new feature sprint. Keep the live learning flow stable while producing an English Devpost entry, a public demo video under three minutes, judging instructions, and the required Codex/GPT-5.6 evidence.

Official deadline:

- July 21, 2026, 5:00 PM PDT
- July 22, 2026, 9:00 AM KST

Official references:

- Resources: https://openai.devpost.com/resources
- Rules: https://openai.devpost.com/rules

## 2. Product and submission decisions that must not change

- Product: **15Loop**
- Track: **Education**
- Production URL: https://15loop.com
- Repository: https://github.com/JYPLab/15loop
- Primary audience: Korean upper-elementary students and first-year middle-school students who have weak English word connections, plus their parents.
- Core promise: 15Loop evaluates whether a learner can connect a word's sound, spelling, meaning, and use, then uses that evidence to decide what the learner should review next.
- Primary experience for judges: the no-sign-up free diagnostic first. Parent connection and continued 15-minute learning come after the learner sees value.
- Submission language: English. Korean may appear inside the product where it is part of the authentic user experience, but English explanation or subtitles must make the demo understandable to judges.
- Do not add payment, a new social feature, a new curriculum, or a visual redesign before submission.
- Do not claim outcomes that have not been measured. Describe the evaluation mechanism and intended learning impact accurately.

## 3. Current verified state

- The repository is public and `main` contains the open-beta flow.
- The live domain responds successfully.
- The repository README explains the problem, the learning loop, local setup, deployment, and how Codex and GPT-5.6 were used.
- Mobile improvements were merged in PR #3 at commit `b08cc4e6cdd773a4821adb2085f04f4219c696ad`.
- Local verification for that commit passed `npm run lint`, `npm test`, and production-style build checks.
- Mobile browser checks already passed at 375×812 and 430×932 without horizontal overflow; inputs and primary controls met the intended mobile sizing.
- The live production bundle must still be checked after republishing because the previously observed production response appeared older than the merged mobile commit.

Known submission gaps:

- No repository license is declared.
- No final English Devpost copy exists.
- No final demo script, shot list, or judge-testing guide exists.
- No public YouTube demo URL exists.
- The required `/feedback` Codex Session ID has not been confirmed and recorded.
- The production OpenAI evaluation should be exercised once immediately before recording and once before final submission.

## 4. Scope

### In scope

1. Repository submission compliance.
2. English Devpost copy.
3. A demo script and shot list for a video under three minutes.
4. Judge-testing instructions.
5. Production mobile verification and blocker-only fixes.
6. Final end-to-end submission rehearsal.
7. Devpost form completion and final submission after human approval.

### Out of scope

- Payment integration.
- New learning modes or major content expansion.
- Community or ranking features.
- Broad refactoring or dependency upgrades.
- Landing-page strategy changes.
- Claims about retention, score improvement, or AI accuracy without evidence.

## 5. Required artifacts

Create the following files:

- `docs/submission/DEVPOST_COPY.md` — final English title, tagline, problem, solution, technology, impact, and Codex/GPT-5.6 explanation.
- `docs/submission/DEMO_SCRIPT.md` — narration, on-screen actions, and timestamps for a video below three minutes.
- `docs/submission/ASSET_SHOT_LIST.md` — exact browser states, screenshots, and screen-recording clips required.
- `docs/submission/JUDGE_TESTING.md` — production URL, recommended route, expected results, test limitations, and support/contact details.
- `LICENSE` — only after the owner approves the license choice.

Recommended repository metadata update:

- Set the GitHub homepage URL to `https://15loop.com`.

## 6. Ordered execution plan

### Step 1 — Make the repository submission-compliant

1. Confirm the repository remains publicly accessible.
2. Ask the owner to approve a license. MIT is the recommended default for a public hackathon repository, but do not add it without approval.
3. Add the approved `LICENSE`.
4. Confirm the README still includes:
   - what 15Loop does;
   - how to run it;
   - where the live demo is;
   - how Codex supported implementation and decisions;
   - how GPT-5.6 contributes to the product experience.
5. Set the GitHub homepage URL to the production domain.
6. Create `JUDGE_TESTING.md` with a route that requires no private credentials.

### Step 2 — Write the English Devpost entry

Create `DEVPOST_COPY.md` with these sections:

1. Project name and one-sentence tagline.
2. The problem: students may memorize translations while failing to connect sound, spelling, meaning, and actual use.
3. The founder story: a father built the product after seeing his first-year middle-school child struggle without early English acceleration.
4. The solution: a low-friction diagnostic followed by evidence-based, 15-minute personalized practice.
5. How it works: evaluation across four connections, weak-link identification, and randomized spaced review.
6. How GPT-5.6 is used: evaluate learner responses and produce feedback appropriate to the learner's evidence and level.
7. How Codex was used: product implementation, debugging, tests, mobile optimization, deployment work, and decision documentation.
8. Potential impact: begin with Korean upper-elementary and first-year middle-school learners, then generalize the evaluation engine to other English learners.
9. Build and learning highlights.
10. Links: live demo, repository, and public YouTube demo.

Every material claim must be visible in the product, repository, or demo. Avoid saying the AI “guarantees mastery,” “automatically improves scores,” or has already proven retention gains.

### Step 3 — Prepare the demo video

The video must be under three minutes, include audio, clearly show the working product, and explain how Codex and GPT-5.6 were used.

Recommended timeline:

- **0:00–0:20 — Problem and founder story:** memorizing a translation is not the same as truly knowing a word.
- **0:20–0:50 — Immediate entry:** open `15loop.com` on a mobile viewport and begin the free diagnostic without signing up.
- **0:50–1:20 — Evaluation:** show representative sound, spelling, meaning, and use interactions. Do not wait through unnecessary repeated screens.
- **1:20–1:45 — Result:** show how the product identifies a weak connection and explains it in parent-friendly language.
- **1:45–2:10 — Continued learning:** show the 15-minute personalized loop and how evidence determines review priority.
- **2:10–2:35 — GPT-5.6 and data:** show one real AI-evaluated response and explain how learning evidence improves the next decision.
- **2:35–2:55 — Codex and impact:** briefly show the repository or commit history, explain the Codex collaboration, and close on the target learner and expansion potential.

Recording rules:

- Record the actual production product, not a mock-up.
- Keep the mobile UI large enough to read in a desktop video player.
- Add English subtitles for Korean UI or narration.
- Display the GPT-5.6 contribution explicitly; do not merely mention “AI.”
- Do not expose API keys, cookies, personal student data, email addresses, or internal admin screens.
- Export, watch the full final file, then upload it as a public YouTube video.

### Step 4 — Capture the required Codex evidence

1. Run `/feedback` in the Codex task where most of the core work was completed.
2. Copy the exact Session ID returned by Codex.
3. Record it in `DEVPOST_COPY.md` and the Devpost form.
4. Verify the ID rather than relying on a folder or attachment identifier inferred from the filesystem.

### Step 5 — Production and mobile judge rehearsal

1. Deploy the exact validated `main` state containing commit `b08cc4e` or a later reviewed fix.
2. Confirm production serves the updated viewport configuration and current assets.
3. Test at 375×812 and 430×932.
4. Confirm:
   - no horizontal scrolling;
   - no clipped headings, helper text, or result explanations;
   - no iPhone input zoom caused by sub-16px text fields;
   - primary controls are easy to tap and do not collide with safe areas;
   - the free diagnostic begins without requiring parent sign-up;
   - each diagnostic step advances correctly;
   - audio controls work;
   - the result and parent-connection transition are understandable;
   - refresh and back navigation do not leave the learner in a broken state.
5. Exercise one real GPT-5.6 evaluation using non-sensitive test data.
6. Fix only submission-blocking mobile issues. For any fix, rerun lint, tests, and both viewport checks before merging and republishing.

### Step 6 — Final submission rehearsal

Use a fresh private/incognito browser with no existing account state:

1. Open the production URL.
2. Complete the judge route from the landing page through the diagnostic result.
3. Confirm any judge-access instructions match the live UI exactly.
4. Open every submitted URL: production, GitHub, and YouTube.
5. Confirm the repository license and README are visible.
6. Watch the YouTube video from start to finish and confirm it is public, has audio, and is under three minutes.
7. Paste the prepared English copy into Devpost.
8. Confirm the category, Session ID, repository URL, demo URL, and video URL.
9. Save a final draft or screenshot before pressing Submit.
10. The owner performs the final consent, ownership, and submission action.

## 7. Definition of done

Submission preparation is complete only when all of the following are true:

- [ ] Production serves the latest reviewed mobile build.
- [ ] The free diagnostic works on both target mobile viewports.
- [ ] One real production GPT-5.6 evaluation has been verified.
- [ ] The repository has an owner-approved license.
- [ ] The README and judge-testing guide are accurate.
- [ ] Final English Devpost copy is ready.
- [ ] The final demo is public on YouTube, includes audio, and is under three minutes.
- [ ] The exact `/feedback` Codex Session ID is recorded.
- [ ] All submitted links work in a fresh browser.
- [ ] The owner has reviewed the final Devpost preview and submitted it before the deadline.

## 8. Human decisions and approvals

The following require the owner:

- Approve the repository license; MIT is recommended.
- Choose whether the submission is entered individually or by a team representative.
- Record narration or approve an English voice and subtitles.
- Upload the final video to the owner's public YouTube channel.
- Run `/feedback` in the correct Codex task and confirm the Session ID.
- Complete Devpost consent, ownership declarations, and the final Submit action.

## 9. Evidence and rollback discipline

Useful implementation evidence:

- Landing/funnel work: https://github.com/JYPLab/15loop/pull/2
- Mobile optimization: https://github.com/JYPLab/15loop/pull/3
- Mobile merge commit: `b08cc4e6cdd773a4821adb2085f04f4219c696ad`

Keep submission work isolated from unrelated local files. Preserve existing untracked planning documents. If a production blocker requires code changes, use a small branch and focused pull request; do not mix it with submission copy or optional product ideas.
