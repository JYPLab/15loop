export const commercialPlans = {
  individual_30: {
    code: "individual_30",
    nameKo: "개인 30일 이용권",
    nameEn: "Individual 30-day pass",
    amount: 12_900,
    learnerLimit: 1,
    durationDays: 30,
  },
  family_30: {
    code: "family_30",
    nameKo: "가족 30일 이용권",
    nameEn: "Family 30-day pass",
    amount: 19_900,
    learnerLimit: 3,
    durationDays: 30,
  },
} as const;

export type CommercialPlanCode = keyof typeof commercialPlans;

export function isCommercialPlanCode(value: string): value is CommercialPlanCode {
  return value in commercialPlans;
}
