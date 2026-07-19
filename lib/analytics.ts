export type AnalyticsEventMap = {
  diagnosis_started: { placement: "hero" | "offer" };
  diagnosis_completed: {
    item_count: number;
    recommended_level: string;
    weakest_skill: "see" | "hear" | "context" | "recall";
  };
  parent_connect_clicked: { source: "diagnosis_result" };
  signup_started: { method: "google" | "email"; has_diagnostic: boolean };
  parent_session_started: { has_diagnostic: boolean };
  guardian_consent_completed: Record<string, never>;
  learner_created: Record<string, never>;
  price_viewed: { eligible_learning_days: number };
  price_intent_answered: { answer: "yes" | "unsure" | "no" };
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackAnalyticsEvent<Name extends keyof AnalyticsEventMap>(
  name: Name,
  properties: AnalyticsEventMap[Name],
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, properties);
}
