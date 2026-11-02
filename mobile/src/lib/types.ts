export type AuthUser = { id: string; mobile: string; email: string | null; full_name: string }

export type BureauId = 'cibil' | 'equifax' | 'experian' | 'crif'

export type BureauReport = {
  request_id: string
  bureau: BureauId
  status: 'processing' | 'completed' | 'failed' | string
  failure_reason: string | null
  requested_at: string
  credit_score: number | null
  score_band: string | null
  report_date: string | null
  total_accounts: number | null
  active_accounts: number | null
  overdue_accounts: number | null
  enquiries_last_6_months: number | null
  total_outstanding: string | null
  payment_months: { month: string; late: number; reported: number }[]
  is_demo: boolean
}

export type DashboardStatus = {
  profile: { id: string; name_as_per_pan: string; date_of_birth: string; city: string | null; state?: string | null; pan_last4?: string | null; kyc_status: string } | null
  reports: BureauReport[]
  history: { bureau: BureauId; score: number; date: string }[]
}

export type ReportAccount = {
  lender: string; type: string; accountNumber: string | null; status: 'active' | 'closed'; openedOn: string | null; closedOn: string | null
  sanctionedAmount: number | null; creditLimit: number | null; currentBalance: number | null; overdueAmount: number | null; lastPaymentOn: string | null
  emiAmount?: number | null; interestRate?: number | null
  paymentHistory: { month: string; daysPastDue: number | null }[]
}

export type ReportDetail = {
  bureau: BureauId
  score: number | null
  reportDate: string | null
  isDemo: boolean
  pdfAvailable: boolean
  personal: { name: string | null; pan: string | null; dateOfBirth: string | null; gender: string | null; phones: string[]; emails: string[]; addresses: string[] }
  summary: { totalAccounts: number; activeAccounts: number; closedAccounts: number; overdueAccounts: number; totalSanctioned: number; totalBalance: number; totalOverdue: number; enquiriesLast6Months: number }
  scoreFactors?: { impact: 'positive' | 'negative'; text: string; tip: string | null }[]
  accounts: ReportAccount[]
  enquiries: { lender: string; purpose: string | null; date: string | null; amount: number | null }[]
}

export type ReportOptions = {
  price: number
  paymentsEnabled: boolean
  paymentsMode?: 'simulated' | 'razorpay'
  demoMode: boolean
  bureaus: { id: BureauId; name: string; available: boolean }[]
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type SupportTicket = {
  id: string
  requester_name: string
  requester_mobile: string
  subject: string
  message: string
  status: TicketStatus
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to: string | null
  created_at: string
  updated_at: string
  comments: { id: string; author_type: 'customer' | 'admin'; author_name: string; message: string; created_at: string }[]
}

export type AdminRole = 'owner' | 'manager' | 'support' | 'analyst'

export type AdminCustomer = {
  id: string; full_name: string; mobile: string; email: string | null; status: string; created_at: string
  pan_last4: string | null; kyc_status: string | null; total_payments: string; paid_payments: string
  latest_report_status: string | null; last_login: string | null; journey_stage: string
}

export type AdminActivity = {
  summary: { totalUsers: number; paidPayments: number; paymentRevenue: number; failedPayments: number; reportRequests: number; failedReportRequests: number }
  payments: {
    id: string; full_name: string; mobile_last4: string; bureau: BureauId | null; amount: string | number
    gateway: string; status: string; failure_reason: string | null; created_at: string
  }[]
}

export type AdminAnalytics = {
  summary: Record<string, number>
  trend: { day: string; signups: number; paid_orders: number; revenue: number; failed_attempts: number }[]
  funnel: { step: string; count: number }[]
}

export const bureauNames: Record<BureauId, string> = {
  cibil: 'TransUnion CIBIL',
  equifax: 'Equifax',
  experian: 'Experian',
  crif: 'CRIF High Mark',
}
