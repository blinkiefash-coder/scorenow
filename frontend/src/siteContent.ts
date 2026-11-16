import { useEffect, useState } from 'react'

export const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type ServicePlan = {
  name: string; audience: string; duration: string; originalPrice: string; offerPrice: string; featured?: boolean; features: string[]
}
export type FdPlan = { bank: string; rate: number; min: number; max: string; minMonths: number; maxMonths: number; tenure: string; payout: string }
export type SubscriptionPlan = { id: string; name: string; months: number; price: number; note: string; featured?: boolean; features: string[] }
export type BusinessPrice = { original: string; offer: string; suffix: string }
export type BusinessPrices = { cmr: BusinessPrice; shield: BusinessPrice }

// Served by GET /api/site-content. Service, FD and business values are null until an admin saves them.
export type SiteContent = {
  subscription_plans: SubscriptionPlan[]
  report_price: { amount: number }
  service_plans: ServicePlan[] | null
  fd_plans: FdPlan[] | null
  business_plan_prices: BusinessPrices | null
}

export type SiteContentKey = keyof SiteContent

// Indicative rates for display only; they are not live bank offers.
export const DEFAULT_FD_PLANS: FdPlan[] = [
  { bank: 'ICICI Bank', rate: 7.25, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'At maturity / Monthly' },
  { bank: 'SBI', rate: 7.1, min: 5000, max: '₹5 Crore', minMonths: 0, maxMonths: 120, tenure: '7 days – 10 years', payout: 'Monthly / Quarterly' },
  { bank: 'HDFC Bank', rate: 7.4, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'Monthly / At maturity' },
  { bank: 'Axis Bank', rate: 7.3, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'Monthly / Quarterly' },
  { bank: 'Kotak Mahindra Bank', rate: 7.2, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'At maturity' },
  { bank: 'IndusInd Bank', rate: 7.15, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'Monthly / At maturity' },
]

export const DEFAULT_SERVICE_PLANS: ServicePlan[] = [
  { name: 'Basic', audience: 'For report clarity and basic issue identification', duration: '3 months', originalPrice: '₹10,999', offerPrice: '₹7,149.35', features: ['Detailed credit report review', 'Issue and negative remark summary', 'Starter improvement checklist', 'Email guidance'] },
  { name: 'Standard', audience: 'For structured improvement with expert support', duration: '6 months', originalPrice: '₹14,999', offerPrice: '₹9,749.35', features: ['Everything in Basic', 'Correction and dispute guidance', 'One-to-one expert consultation', 'WhatsApp and email support', 'Progress review checkpoints'] },
  { name: 'Premium', audience: 'For deeper credit rebuilding and loan readiness', duration: '9 months', originalPrice: '₹19,999', offerPrice: '₹12,999.35', featured: true, features: ['Everything in Standard', 'Dedicated credit advisor', 'Personalised improvement roadmap', 'Continuous monitoring guidance', 'Loan readiness assessment', 'Priority case support'] },
  { name: 'Exquisite', audience: 'For complex personal or commercial profiles', duration: '12 months', originalPrice: '₹25,000', offerPrice: '₹16,250', features: ['Senior credit strategist', 'Personal and business report review', 'Advanced issue-resolution support', 'Priority consultation', 'Custom financial health roadmap', 'High-value loan preparation'] },
]

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: 'monthly', name: 'Monthly', months: 1, price: 99, note: 'Flexible monthly access', features: ['Score tracking dashboard', 'Personalised next steps', 'Score predictor'] },
  { id: 'half-yearly', name: '6 Months', months: 6, price: 499, note: 'Best for steady progress', featured: true, features: ['Everything in Monthly', 'Priority support', 'Progress review checkpoints'] },
  { id: 'yearly', name: '12 Months', months: 12, price: 999, note: 'Best long-term value', features: ['Everything in 6 Months', 'Loan readiness guidance', 'Dedicated advisor access'] },
]

export const DEFAULT_BUSINESS_PRICES: BusinessPrices = {
  cmr: { original: '₹47,999', offer: '₹31,199.35', suffix: '+ GST' },
  shield: { original: '₹99,999', offer: '₹64,999.35', suffix: '+ GST onwards' },
}

export const DEFAULT_REPORT_PRICE = 99

export const DEFAULT_SITE_CONTENT: SiteContent = {
  subscription_plans: DEFAULT_SUBSCRIPTION_PLANS,
  report_price: { amount: DEFAULT_REPORT_PRICE },
  service_plans: null,
  fd_plans: null,
  business_plan_prices: null,
}

// Effective values: the stored override when present, otherwise the built-in default.
export const effectiveServicePlans = (content: SiteContent | null) => content?.service_plans ?? DEFAULT_SERVICE_PLANS
export const effectiveFdPlans = (content: SiteContent | null) => content?.fd_plans ?? DEFAULT_FD_PLANS
export const effectiveBusinessPrices = (content: SiteContent | null) => content?.business_plan_prices ?? DEFAULT_BUSINESS_PRICES
export const effectiveSubscriptionPlans = (content: SiteContent | null) => content?.subscription_plans ?? DEFAULT_SUBSCRIPTION_PLANS

export const formatSubscriptionDuration = (months: number) => months === 1 ? '1 month' : `${months} months`
export const formatRupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

let cached: Promise<SiteContent | null> | null = null

export const invalidateSiteContent = () => {
  cached = null
}

const loadSiteContent = () => {
  if (!cached) {
    cached = fetch(`${apiUrl}/api/site-content`)
      .then((response) => {
        if (!response.ok) throw new Error('Site content unavailable.')
        return response.json() as Promise<SiteContent>
      })
      .catch(() => {
        // Allow a later mount to retry instead of caching a failure.
        cached = null
        return null
      })
  }
  return cached
}

// Returns null until the server responds; callers fall back to the defaults above.
export function useSiteContent(): SiteContent | null {
  const [content, setContent] = useState<SiteContent | null>(null)
  useEffect(() => {
    let active = true
    loadSiteContent().then((value) => {
      if (active && value) setContent(value)
    })
    return () => {
      active = false
    }
  }, [])
  return content
}
