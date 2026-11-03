export type SubscriptionPlan = { id: string; name: string; months: number; price: number; note: string; featured?: boolean; features: string[] };

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: "monthly", name: "Monthly", months: 1, price: 99, note: "Flexible monthly access", features: ["Score tracking dashboard", "Personalised next steps", "Score predictor"] },
  { id: "half-yearly", name: "6 Months", months: 6, price: 499, note: "Best for steady progress", featured: true, features: ["Everything in Monthly", "Priority support", "Progress review checkpoints"] },
  { id: "yearly", name: "12 Months", months: 12, price: 999, note: "Best long-term value", features: ["Everything in 6 Months", "Loan readiness guidance", "Dedicated advisor access"] },
];

export const findSubscriptionPlan = (id: unknown) => SUBSCRIPTION_PLANS.find((plan) => plan.id === id) ?? null;

// Prices are GST-inclusive, matching how report prices are recorded.
export const gstIncluded = (price: number) => Math.round((price - price / 1.18) * 100) / 100;
