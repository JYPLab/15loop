# 15Loop Analytics Tracking Plan

## Purpose

Use GA4 to understand acquisition and the parent-conversion funnel. Keep learning evidence and retention metrics in the first-party database, where they can be evaluated without sending child learning data to a marketing platform.

## Tools

- GA4: page views, traffic source, diagnostic and parent onboarding funnel.
- First-party `beta_events`: guardian consent, learner creation, diagnostic claim, daily completion, price intent, and payment lifecycle.
- Google Search Console and Naver Search Advisor: search discovery, impressions, clicks, crawl, and index coverage.

## GA4 events

| Event | Decision it supports | Properties | Trigger |
| --- | --- | --- | --- |
| `diagnosis_started` | Which landing CTA creates starts? | `placement` | Hero or offer CTA starts the diagnostic |
| `diagnosis_completed` | Do starts reach an actionable result? | `item_count`, `recommended_level`, `weakest_skill` | Diagnostic result is calculated |
| `parent_connect_clicked` | Does the result motivate parent connection? | `source` | Result CTA opens the parent flow |
| `signup_started` | Which parent auth method is attempted? | `method`, `has_diagnostic` | Google or email auth begins |
| `parent_session_started` | Does authentication return to the parent flow? | `has_diagnostic` | One authenticated parent session per browser session |
| `guardian_consent_completed` | Does the authenticated parent activate the family flow? | none | Policy and guardian confirmation save succeeds |
| `learner_created` | Does an activated family create a learner profile? | none | Learner creation succeeds |
| `price_viewed` | How many parent sessions see the beta price? | `eligible_learning_days` | The authenticated parent price is first recorded |
| `price_intent_answered` | What is qualified willingness to pay? | `answer` | Price response saves successfully |

## GA4 conversions

Mark these as key events after the property begins receiving data:

1. `diagnosis_completed`
2. `parent_connect_clicked`
3. `guardian_consent_completed`
4. `learner_created`
5. `price_intent_answered` filtered to `answer=yes` in analysis

## Data rules

Never send these to GA4:

- parent email or name;
- child nickname, grade, learner ID, school, or contact details;
- diagnostic answers, individual words, sentences, scores tied to a person, or AI feedback;
- Supabase user IDs, diagnostic session IDs, order IDs, or payment identifiers.

UTM values should be lowercase and stable. Initial sources:

- `threads` / `social` / `open_beta`
- `naver` / `organic` / `brand`
- `google` / `organic` / `brand`
- `parent_referral` / `share` / `open_beta`

## Validation

- Confirm one page view per route change in GA4 DebugView.
- Confirm each event fires once on its successful trigger.
- Confirm no email, child data, answers, IDs, or word content appears in event parameters.
- Test mobile Safari and Chrome after deployment.
- Compare GA4 diagnostic completions with first-party diagnostic rows; investigate large mismatches rather than forcing the numbers to match.
