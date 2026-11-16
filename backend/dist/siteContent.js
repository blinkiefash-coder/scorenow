import { SUBSCRIPTION_PLANS } from "./subscriptions.js";
export const SITE_CONTENT_KEYS = ["subscription_plans", "report_price", "service_plans", "fd_plans", "business_plan_prices"];
export const DEFAULT_REPORT_PRICE_RUPEES = 99;
export const MAX_SITE_CONTENT_BYTES = 100_000;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const wholeNumber = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const list = (value, min, max, check) => Array.isArray(value) && value.length >= min && value.length <= max && value.every(check);
const subscriptionPlanOk = (plan) => isRecord(plan)
    && typeof plan.id === "string" && /^[a-z0-9-]{1,40}$/.test(plan.id)
    && text(plan.name, 80)
    && wholeNumber(plan.months, 1, 120)
    && wholeNumber(plan.price, 1, 1_000_000)
    && typeof plan.note === "string" && plan.note.length <= 200
    && (plan.featured === undefined || typeof plan.featured === "boolean")
    && list(plan.features, 0, 20, (item) => typeof item === "string" && item.length <= 200);
const validators = {
    subscription_plans: (value) => {
        if (!list(value, 1, 10, subscriptionPlanOk))
            return { ok: false, error: "Provide 1 to 10 subscription plans with valid id, name, months (1-120), whole-rupee price, note and features." };
        const plans = value;
        if (new Set(plans.map((plan) => plan.id)).size !== plans.length)
            return { ok: false, error: "Subscription plan ids must be unique." };
        return { ok: true, value };
    },
    report_price: (value) => {
        if (!isRecord(value) || !wholeNumber(value.amount, 1, 100_000))
            return { ok: false, error: "Report price must be a whole-rupee amount between 1 and 100000." };
        return { ok: true, value: { amount: value.amount } };
    },
    service_plans: (value) => list(value, 1, 10, (item) => isRecord(item)
        && text(item.name, 120) && text(item.audience, 300) && text(item.duration, 60)
        && text(item.originalPrice, 60) && text(item.offerPrice, 60)
        && list(item.features, 0, 20, (feature) => typeof feature === "string" && feature.length <= 200)
        && (item.featured === undefined || typeof item.featured === "boolean"))
        ? { ok: true, value }
        : { ok: false, error: "Provide 1 to 10 service plans with name, audience, duration, originalPrice, offerPrice and features." },
    fd_plans: (value) => list(value, 1, 30, (item) => isRecord(item)
        && text(item.bank, 120) && typeof item.rate === "number" && item.rate >= 0 && item.rate <= 30
        && typeof item.min === "number" && item.min >= 0 && text(item.max, 60)
        && wholeNumber(item.minMonths, 1, 600) && wholeNumber(item.maxMonths, 1, 600)
        && text(item.tenure, 120) && text(item.payout, 200))
        ? { ok: true, value }
        : { ok: false, error: "Provide 1 to 30 FD plans with bank, rate (0-30), min, max, minMonths, maxMonths, tenure and payout." },
    business_plan_prices: (value) => {
        const priceOk = (item) => isRecord(item) && text(item.original, 60) && text(item.offer, 60) && typeof item.suffix === "string" && item.suffix.length <= 60;
        if (!isRecord(value) || !priceOk(value.cmr) || !priceOk(value.shield)) {
            return { ok: false, error: "Provide cmr and shield prices, each with original, offer and suffix." };
        }
        return { ok: true, value };
    },
};
export const isSiteContentKey = (key) => SITE_CONTENT_KEYS.includes(key);
export const validateSiteContent = (key, value) => {
    if (JSON.stringify(value ?? null).length > MAX_SITE_CONTENT_BYTES)
        return { ok: false, error: "Content is too large." };
    return validators[key](value);
};
// Stored values are re-validated on read, so a bad row falls back to the built-in default instead of breaking the site.
export const resolveSubscriptionPlans = (stored) => {
    const result = validateSiteContent("subscription_plans", stored);
    return result.ok ? result.value : SUBSCRIPTION_PLANS;
};
export const resolveReportPrice = (stored) => {
    const result = validateSiteContent("report_price", stored);
    return result.ok ? result.value.amount : DEFAULT_REPORT_PRICE_RUPEES;
};
