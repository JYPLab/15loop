# 15Loop Submission Asset and Shot List

## Capture settings

- Production: `https://15loop.com`
- Primary mobile viewport: 430 × 932
- Secondary verification viewport: 375 × 812
- Browser: fresh Chrome profile or incognito window
- Recording: 1080p canvas with the mobile viewport large enough to read
- Captions: English, high contrast, inside title-safe margins
- Data: generic test learner only; no real child name, email, or account identifier

## Required video clips

| ID | State | Exact content to capture | Target length |
|---|---|---|---:|
| V01 | Landing | 15Loop headline, free diagnostic CTA, target grades | 6s |
| V02 | Entry | Tap free diagnostic; show no sign-up gate | 5s |
| V03 | Recognition | One written-word-to-meaning question | 5s |
| V04 | Listening | Play audio and choose the heard word | 6s |
| V05 | Context | Choose the word that fits the sentence | 5s |
| V06 | Recall | Type the missing word from the cue | 6s |
| V07 | Result | Four scores, weakest connection, parent-connect action | 12s |
| V08 | Learning | 15:00 timer and weakest connection first | 8s |
| V09 | Retry | Miss one item; later show it after other questions | 10s |
| V10 | AI evaluation | Optional sentence challenge, real loading state, GPT-5.6 feedback and source label | 18s |
| V11 | Repository | GitHub overview and July 15–19 commit history | 8s |
| V12 | Tests | Adaptive queue test names or passing test output | 6s |
| V13 | End card | Logo, tagline, production URL | 5s |

## Required still images

Create clean PNG or JPG captures with no browser bookmarks, personal avatars, or unrelated tabs.

1. **Hero image** — landing headline and free diagnostic CTA at 430 × 932.
2. **Four-connections image** — a clear composite or product result showing Recognition, Listening, Context, and Active Recall.
3. **Diagnostic result** — four scores and the weakest connection.
4. **Adaptive learning** — 15-minute timer, current learning stage, and completed-word count.
5. **GPT-5.6 evaluation** — bilingual response with the model source label visible.
6. **Parent view** — generic child profile with learning day/time/results; no real child information.

## Capture preparation

- Use a deterministic diagnostic session whose final weakest connection is Listening or Active Recall.
- Prepare one generic parent profile only if the parent dashboard appears in the video.
- Clear autofill suggestions and notifications before recording.
- Test browser speech output before starting the recording.
- Keep the correct answer and example sentence consistent with the current production curriculum.
- Do not speed up the uncut GPT-5.6 request; cut elsewhere to keep the full video under three minutes.

## Post-production checks

- [ ] Every Korean control used in the story has an English subtitle.
- [ ] No text is clipped inside the mobile frame.
- [ ] The mouse/touch indicator does not cover answers.
- [ ] Cuts do not falsely imply the full diagnostic has fewer questions.
- [ ] Model feedback is legible for at least three seconds.
- [ ] No third-party logo, music, private browser data, or secret appears.
- [ ] Exported file is watched from beginning to end before upload.
