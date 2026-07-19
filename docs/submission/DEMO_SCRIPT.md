# 15Loop Demo Script

Target runtime: **2:45–2:55**. Hard limit: under 3:00.

Format: actual production screen recording, English narration, English subtitles. Korean learner UI may remain visible because it is part of the product; translate its meaning in narration and captions.

## Recording rules

- Record `https://15loop.com` in a mobile viewport around 430 × 932.
- Use a fresh browser profile with no personal learner data.
- Use only the prepared test learner and generic answers.
- Cut between representative diagnostic questions; do not pretend the full 20-question diagnostic took seconds.
- Show one uncut GPT-5.6 request and its returned feedback.
- Do not show API keys, email addresses, cookies, admin routes, or private dashboards.
- Use no copyrighted music or third-party trademarks.

## Timed script

### 0:00–0:18 — The problem

**On screen**

Start on the 15Loop landing screen. Briefly show a printed-word-style view, then the four connection labels in the product.

**Narration**

“My son entered middle school without years of English pre-study. He could sometimes memorize a Korean definition, but that did not mean he could recognize the sound, understand the word in a sentence, or retrieve it when he needed it. Other families around us had the same problem.”

**Subtitle emphasis**

Memorized translation ≠ usable word

### 0:18–0:38 — What 15Loop changes

**On screen**

Show the headline and tap **우리 아이 무료 진단하기**. Show that no sign-up appears first.

**Narration**

“15Loop asks a more useful question: which connection is missing? A student begins with a free diagnostic before any parent account or payment.”

**Subtitle translation**

우리 아이 무료 진단하기 = Start my child’s free diagnostic

### 0:38–1:04 — The four connections

**On screen**

Use short cuts from real diagnostic questions:

1. written word → Korean meaning;
2. audio → word choice;
3. sentence context → word;
4. Korean meaning and sentence cue → missing word.

Keep the progress counter visible so the cuts are clearly excerpts from a longer diagnostic.

**Narration**

“The diagnostic checks four separate connections: recognition, listening, context, and active recall. It starts with 20 words and can add five focused questions when one connection is especially weak.”

### 1:04–1:25 — The result and parent transition

**On screen**

Show a completed diagnostic result with all four scores and the weakest connection. Show the **부모에게 결과 연결** action, but do not reveal a personal account.

**Narration**

“The result does not say that the child is bad at English. It identifies the connection to rebuild first. Only after the learner sees that value does a parent connect the result to a child profile.”

**Subtitle translation**

부모에게 결과 연결 = Connect this result to a parent account

### 1:25–1:52 — Fifteen-minute adaptive practice

**On screen**

Show the 15:00 timer, a weak-connection stage first, one correct answer, one missed answer returning after other items, and the completed-word count.

**Narration**

“Continued practice is measured by 15 minutes of real activity, not an arbitrary daily word quota. Every response updates connection scores, mastery, review interval, and due time. Overdue weak words come first, missed words return after other questions, and unseen words fill the remaining session.”

### 1:52–2:18 — GPT-5.6 in the product

**On screen**

After completing the cloze recall, open the optional sentence challenge. Enter a natural but imperfect sentence. Keep the screen recording uncut while the response returns, then show the `GPT-5.6 evaluation` source label and bilingual feedback.

**Suggested safe test**

- Target word: `borrow`
- Learner sentence: `May I use your pencil for a moment?`

**Narration**

“GPT-5.6 is used where string matching is too brittle. The Responses API evaluates whether the learner preserved the target meaning and use, then returns strict structured feedback in Korean and English. The curriculum input is allowlisted, no child identity is sent, and a labeled local fallback keeps the lesson working if the API is unavailable.”

### 2:18–2:39 — Codex collaboration

**On screen**

Show the public GitHub repository, the dated commit list from July 15–19, and a quick view of the adaptive queue test. Avoid long code scrolling.

**Narration**

“I brought the parent story, learner problem, and product decisions. Codex helped turn them into the bilingual interface, adaptive review engine, data model, authentication, safety checks, tests, mobile fixes, analytics, and deployment. Real use by my child also changed the design: open-ended writing became an optional AI challenge instead of a mandatory burden.”

### 2:39–2:53 — Close

**On screen**

Return to the result screen, then the 15Loop logo and production URL.

**Narration**

“15Loop starts with Korean upper-elementary and first-year middle-school learners. The larger idea is an evaluation engine that learns which language connection each person needs next. Fifteen minutes. Words that stay.”

**End card**

15Loop

15 minutes. Words that stay.

https://15loop.com

## Final recording checklist

- [ ] Total duration is under 3:00.
- [ ] Audio is clear and audible on a phone speaker.
- [ ] English subtitles are burned in or available as accurate YouTube captions.
- [ ] The Korean UI is translated wherever a judge needs it.
- [ ] The product shown is the live production build.
- [ ] The GPT-5.6 response and source label are readable.
- [ ] Codex and GPT-5.6 contributions are both explicitly explained.
- [ ] No sensitive information or copyrighted media is visible.
- [ ] The uploaded YouTube video is public and plays while logged out.
