export type FdPlan = { bank: string; rate: number; min: number; max: string; minMonths: number; maxMonths: number; tenure: string; payout: string }

// Indicative rates for display only; they are not live bank offers.
export const fdPlans: FdPlan[] = [
  { bank: 'ICICI Bank', rate: 7.25, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'At maturity / Monthly' },
  { bank: 'SBI', rate: 7.1, min: 5000, max: '₹5 Crore', minMonths: 0, maxMonths: 120, tenure: '7 days – 10 years', payout: 'Monthly / Quarterly' },
  { bank: 'HDFC Bank', rate: 7.4, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'Monthly / At maturity' },
  { bank: 'Axis Bank', rate: 7.3, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'Monthly / Quarterly' },
  { bank: 'Kotak Mahindra Bank', rate: 7.2, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'At maturity' },
  { bank: 'IndusInd Bank', rate: 7.15, min: 5000, max: '₹5 Crore', minMonths: 6, maxMonths: 120, tenure: '6 months – 10 years', payout: 'Monthly / At maturity' },
]

export const fdTenures = [
  { label: '6 Months', months: 6 }, { label: '1 Year', months: 12 }, { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 }, { label: '5 Years', months: 60 }, { label: '10 Years', months: 120 },
]

export type CardCategory = 'all' | 'rupay' | 'free' | 'fd'
export type CardOffer = { bank: string; name: string; network: 'Visa' | 'Mastercard' | 'RuPay'; perk: string; tags: string[]; blurb: string; categories: CardCategory[]; colors: [string, string] }

// Sample catalogue for display only; fees, rewards and eligibility are set by each issuer.
export const cardOffers: CardOffer[] = [
  { bank: 'HDFC Bank', name: 'HDFC Millennia Credit Card', network: 'Visa', perk: '5% Cashback', tags: ['Lifestyle'], blurb: '5% cashback on top brands, dining, travel and more.', categories: ['all'], colors: ['#0d2a5c', '#2d6bbd'] },
  { bank: 'SBI', name: 'SBI Cashback Card', network: 'Visa', perk: '5% Cashback', tags: ['Online Shopping'], blurb: '5% cashback on online spends, no annual fee.', categories: ['all'], colors: ['#3b1a6e', '#8a3fb8'] },
  { bank: 'Axis Bank', name: 'Axis ACE Credit Card', network: 'Visa', perk: '2% Cashback', tags: ['Fuel & Utilities'], blurb: '2% cashback on fuel, utilities and Google Pay bill payments.', categories: ['all'], colors: ['#8a1538', '#d63a63'] },
  { bank: 'ICICI Bank', name: 'ICICI Coral Credit Card', network: 'Visa', perk: '4X Rewards', tags: ['Dining & Travel'], blurb: 'Get 4X rewards on dining, travel and entertainment.', categories: ['all'], colors: ['#a3201b', '#e4572e'] },
  { bank: 'Utkarsh SFB', name: 'Utkarsh SuperMoney RuPay Credit Card', network: 'RuPay', perk: 'UPI Enabled', tags: ['RuPay'], blurb: 'Link to UPI and earn rewards on everyday payments.', categories: ['rupay'], colors: ['#2a2370', '#5b4bd6'] },
  { bank: 'Kotak Mahindra Bank', name: 'Kotak 811 #DreamDifferent Card', network: 'Visa', perk: 'Lifetime Free', tags: ['No annual fee'], blurb: 'No joining or annual fee, with rewards on everyday spends.', categories: ['free'], colors: ['#7a1020', '#c8283f'] },
  { bank: 'IDFC FIRST Bank', name: 'IDFC FIRST Wow! Credit Card', network: 'Visa', perk: 'Against FD', tags: ['FD-backed'], blurb: 'Get a credit card against your fixed deposit, no income proof needed.', categories: ['fd'], colors: ['#6b1230', '#b8264f'] },
]

export const cardCategories: { id: CardCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rupay', label: 'RuPay' },
  { id: 'free', label: 'Lifetime free' },
  { id: 'fd', label: 'Against FD' },
]

export type CreditGuide = {
  slug: string
  title: string
  description: string
  readTime: string
  icon: 'trending-up-outline' | 'speedometer-outline' | 'search-outline'
  sections: { title: string; paragraphs: string[]; points?: string[] }[]
}

export const creditGuides: CreditGuide[] = [
  {
    slug: 'improve-credit-score',
    title: '5 Ways to Improve Your Credit Score',
    description: 'Build healthy credit habits over time, understand the options available, and choose borrowing only when it fits your needs.',
    readTime: '5 min read',
    icon: 'trending-up-outline',
    sections: [
      {
        title: 'Start with the habits that matter',
        paragraphs: ['Improving a credit profile is usually a gradual process. Focus on accurate reporting and steady repayment habits rather than quick fixes or promises of a particular score.'],
        points: [
          'Pay every loan and card instalment by its due date.',
          'Keep card balances manageable and avoid using all available credit.',
          'Check your report for accounts, balances, or enquiries you do not recognise.',
          'Apply for new credit only when you have a clear need.',
          'Keep well-managed accounts open unless there is a good reason to close them.',
        ],
      },
      {
        title: 'Choose credit carefully',
        paragraphs: ['A new credit product is not required for everyone. Consider the total cost, repayment commitment, and whether the lender reports account activity to the credit bureaus before applying.'],
      },
    ],
  },
  {
    slug: 'good-credit-score',
    title: 'What is a Good Credit Score?',
    description: 'Learn how to read your score in context and why lenders look at more than one number.',
    readTime: '4 min read',
    icon: 'speedometer-outline',
    sections: [
      {
        title: 'A score is a snapshot, not a guarantee',
        paragraphs: ['Credit bureaus generally show a score on a 300–900 scale, but score bands and lender criteria can differ. A higher score is often viewed positively, but it does not guarantee loan or card approval.'],
        points: [
          'Lenders may also consider income, existing obligations, employment, and their own policies.',
          'Different bureaus can show different scores because their report data or scoring models may vary.',
          'Use the score together with the report details to understand your credit health.',
        ],
      },
      {
        title: 'Look beyond the score',
        paragraphs: ['Review the payment history, balances, account status, and recent enquiries shown on the report. Correct any inaccurate details with the bureau or lender that supplied them.'],
      },
    ],
  },
  {
    slug: 'credit-enquiries',
    title: 'How Credit Enquiries Affect Your Score',
    description: 'Understand what happens when you apply for credit and how to keep track of applications on your report.',
    readTime: '6 min read',
    icon: 'search-outline',
    sections: [
      {
        title: 'What is a credit enquiry?',
        paragraphs: ['When a lender checks your credit report as part of a credit application, that check may appear as an enquiry. The exact score impact depends on bureau methods and lender context. Checking your own report is different from applying for new credit.'],
      },
      {
        title: 'Manage applications thoughtfully',
        paragraphs: ['Several applications in a short period can signal increased borrowing activity. Before applying, compare the product terms and check whether you meet the provider’s stated criteria.'],
        points: [
          'Avoid submitting multiple applications just to compare offers.',
          'Ask a lender whether an initial eligibility check is a soft enquiry or a full credit application.',
          'Review enquiry entries and contact the lender or bureau if you see one you do not recognise.',
          'Keep records of applications and consent you provide.',
        ],
      },
    ],
  },
]

export const chatConcerns = ['Improve my credit score', 'Fix a report error', 'Loan application rejected', 'Business CMR support']
export const scoreRanges = ['Below 600', '600 - 699', '700 - 749', '750+', "I don't know"]

export function getChatSuggestion(concern: string, scoreRange: string) {
  if (concern === 'Fix a report error') return 'Start with your latest bureau report. Note the account name, disputed entry, and supporting proof before raising a correction. Our expert can help you organise the right documents.'
  if (concern === 'Loan application rejected') return 'Avoid making several new applications immediately. First review recent enquiries, overdue accounts, utilisation, and lender remarks to identify the likely reason for rejection.'
  if (concern === 'Business CMR support') return 'Review payment behaviour, credit exposure, trade lines, and lender-reported errors in your Commercial CIBIL report. A focused CMR review is the right next step.'
  if (scoreRange === 'Below 600') return 'Prioritise overdue payments, settled or written-off accounts, and report errors. Keep every current payment on time while working through the highest-impact issues first.'
  if (scoreRange === '600 - 699') return 'Focus on on-time payments and bringing credit utilisation below 30%. Avoid unnecessary enquiries while older positive payment history builds.'
  if (scoreRange === '700 - 749') return 'You are close to a strong lending profile. Keep utilisation low, preserve older accounts, and check your report for small errors before applying for new credit.'
  if (scoreRange === '750+') return 'Your score is already strong. Protect it with timely payments, low utilisation, and limited hard enquiries, and review your report periodically for unexpected changes.'
  return 'Begin with a current credit report from a recognised bureau. Once you know your score and key factors, an expert can help prioritise the actions with the most impact.'
}
