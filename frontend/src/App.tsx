import { Fragment, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeIndianRupee, BarChart3,
  Building2, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, CreditCard, Download, ExternalLink,
  Eye, EyeOff, FileCheck2, FileSearch, Gift, Handshake, Headphones,
  Gauge, House, Lightbulb, LockKeyhole, Mail, MapPin, Menu, MessageCircle, Pause,
  Phone, Play, RotateCcw, Search, Settings, ShieldCheck, Smartphone, Sparkles, Star,
  TrendingUp, Users, Volume2, VolumeX, UserRound, WalletCards, X, Zap,
} from 'lucide-react'
import './App.css'
import { resetFirebaseRecaptcha, sendFirebasePhoneOtp, type ConfirmationResult } from './firebase.ts'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const insights = [
  { icon: FileSearch, tone: 'blue', title: 'Understand your credit score', text: "See what's helping or affecting your score." },
  { icon: BarChart3, tone: 'green', title: 'Know what to improve', text: 'Get clear insights on the key factors.' },
  { icon: Lightbulb, tone: 'violet', title: 'Learn how to increase your score', text: 'Get practical tips and expert guidance.' },
  { icon: Star, tone: 'gold', title: 'Discover the benefits', text: 'A stronger score can unlock better financial opportunities.' },
]

const businessBenefits = [
  { icon: FileSearch, tone: 'blue', title: 'Identify report errors', text: 'We review your commercial report for inaccuracies and discrepancies.' },
  { icon: Sparkles, tone: 'green', title: 'Correct inaccurate information', text: 'We guide you through corrections with the right documentation.' },
  { icon: BarChart3, tone: 'violet', title: 'Improve business credit profile', text: 'Build lender confidence with a clean and accurate report.' },
]

const creditBureaus = [
  { name: 'TransUnion CIBIL', logo: '/logo-cibil.png' },
  { name: 'Experian', logo: '/logo-experian-new.svg' },
  { name: 'Equifax', logo: '/logo-equifax.svg' },
  { name: 'CRIF High Mark', logo: '/logo-crif.png' },
]

const banks = [
  { name: 'State Bank of India', logo: '/bank-sbi.svg' },
  { name: 'HDFC Bank', logo: '/bank-hdfc.svg' },
  { name: 'ICICI Bank', logo: '/bank-icici.svg' },
  { name: 'Axis Bank', logo: '/bank-axis.svg' },
  { name: 'Kotak Mahindra Bank', logo: '/bank-kotak.svg' },
  { name: 'Bank of Baroda', logo: '/bank-bob.png' },
  { name: 'Punjab National Bank', logo: '/bank-pnb.svg' },
  { name: 'Canara Bank', logo: '/bank-canara.svg' },
  { name: 'Union Bank of India', logo: '/bank-union.svg' },
  { name: 'IDFC FIRST Bank', logo: '/bank-idfc.svg' },
]

const creditSituations = [
  {
    icon: FileSearch,
    label: 'I found issues in my report',
    title: 'Credit Report Issues',
    description: 'Incorrect accounts, payment remarks, duplicate entries, or unfamiliar enquiries need a structured review.',
    actions: ['Compare entries across your latest reports', 'Collect statements and closure documents', 'Raise accurate disputes with each bureau'],
    cta: 'Review my report',
  },
  {
    icon: TrendingUp,
    label: 'My score needs improvement',
    title: 'Low or Stagnant Score',
    description: 'Late payments, high utilisation, or repeated enquiries may be holding your credit profile back.',
    actions: ['Prioritise overdue and high-impact accounts', 'Build an achievable utilisation plan', 'Track improvement factors month by month'],
    cta: 'Build my score plan',
  },
  {
    icon: ShieldCheck,
    label: 'I want to protect a good score',
    title: 'Healthy Credit Profile',
    description: 'A strong score still benefits from monitoring, clean reports, and careful planning before major applications.',
    actions: ['Monitor changes and new enquiries', 'Keep utilisation and payment habits healthy', 'Prepare confidently for future borrowing'],
    cta: 'Protect my score',
  },
]

const servicePlans = [
  { name: 'Basic', audience: 'For report clarity and basic issue identification', duration: '3 months', originalPrice: '₹10,999', offerPrice: '₹7,149.35', features: ['Detailed credit report review', 'Issue and negative remark summary', 'Starter improvement checklist', 'Email guidance'] },
  { name: 'Standard', audience: 'For structured improvement with expert support', duration: '6 months', originalPrice: '₹14,999', offerPrice: '₹9,749.35', features: ['Everything in Basic', 'Correction and dispute guidance', 'One-to-one expert consultation', 'WhatsApp and email support', 'Progress review checkpoints'] },
  { name: 'Premium', audience: 'For deeper credit rebuilding and loan readiness', duration: '9 months', originalPrice: '₹19,999', offerPrice: '₹12,999.35', featured: true, features: ['Everything in Standard', 'Dedicated credit advisor', 'Personalised improvement roadmap', 'Continuous monitoring guidance', 'Loan readiness assessment', 'Priority case support'] },
  { name: 'Exquisite', audience: 'For complex personal or commercial profiles', duration: '12 months', originalPrice: '₹25,000', offerPrice: '₹16,250', features: ['Senior credit strategist', 'Personal and business report review', 'Advanced issue-resolution support', 'Priority consultation', 'Custom financial health roadmap', 'High-value loan preparation'] },
]

const planCapabilities = [
  { icon: FileSearch, title: 'Credit Report Analysis', text: 'A structured review to identify report issues and improvement opportunities.' },
  { icon: CircleHelp, title: 'Issue Resolution Guidance', text: 'Clear assistance for disputes, incorrect remarks, and documentation steps.' },
  { icon: TrendingUp, title: 'Personalised Credit Plan', text: 'Actions tailored to your current profile, priorities, and financial goals.' },
  { icon: Headphones, title: 'Expert Consultation', text: 'One-to-one explanations and guidance from a credit support specialist.' },
  { icon: BarChart3, title: 'Progress Tracking', text: 'Review important credit factors and monitor changes during the engagement.' },
  { icon: ShieldCheck, title: 'Dedicated Support', text: 'Responsive help through the support channels included in your selected plan.' },
]

const subscriptionSteps = [
  { icon: FileSearch, title: 'Choose a plan', text: 'Compare the plan options and select the support level that fits your needs.' },
  { icon: CircleHelp, title: 'Confirm your scope', text: 'Our team reviews your profile and confirms the final service scope and pricing.' },
  { icon: Headphones, title: 'Start your subscription', text: 'Once confirmed, your support period begins with the agreed plan and guidance.' },
]

const subscriptionPlans = [
  { name: 'Monthly', duration: '1 month', price: '₹99', note: 'Flexible monthly access' },
  { name: '6 Months', duration: '6 months', price: '₹499', note: 'Best for steady progress', featured: true },
  { name: '12 Months', duration: '12 months', price: '₹999', note: 'Best long-term value' },
]

const explainerScenes = [
  {
    icon: BarChart3,
    label: 'Understand',
    title: 'Know what shapes your score',
    metric: '300–900',
    metricLabel: 'Credit score range',
    narration: 'Your credit score summarises your repayment behaviour. Payment history, credit utilisation, account age, credit mix, and recent enquiries all influence the number.',
    captions: ['Every repayment becomes part of your credit history.', 'Credit utilisation shows how much available credit you use.', 'Account age, credit mix, and enquiries also influence your score.'],
    points: ['Payment history has high impact', 'Lower utilisation supports a healthier profile', 'Older, well-managed accounts build trust'],
  },
  {
    icon: TrendingUp,
    label: 'Improve',
    title: 'Build stronger credit habits',
    metric: '<30%',
    metricLabel: 'Recommended utilisation',
    narration: 'Pay every instalment on time, keep card balances low, and avoid multiple credit applications close together. Consistent habits matter more than quick fixes.',
    captions: ['Pay every EMI and card bill before its due date.', 'Keep card balances below thirty percent of the limit.', 'Space out applications and build consistent habits over time.'],
    points: ['Never miss an EMI or card due date', 'Reduce outstanding card balances', 'Apply for new credit only when needed'],
  },
  {
    icon: BadgeIndianRupee,
    label: 'Benefit',
    title: 'Unlock better financial options',
    metric: '750+',
    metricLabel: 'Strong score target',
    narration: 'A stronger credit profile can improve loan eligibility, increase lender confidence, and help you access more competitive interest rates and credit limits.',
    captions: ['A strong profile can improve your loan eligibility.', 'Lenders may offer more competitive rates and terms.', 'Healthy credit gives you more options for important goals.'],
    points: ['Stronger loan approval prospects', 'Potentially better rates and terms', 'Greater confidence when planning goals'],
  },
  {
    icon: Headphones,
    label: 'Resolve',
    title: 'Get a clear plan with Score Now',
    metric: '1:1',
    metricLabel: 'Expert guidance',
    narration: 'Score Now analyses your report, identifies high-impact issues and possible errors, and gives you a practical action plan with expert support throughout the process.',
    captions: ['We analyse your reports and identify high-impact issues.', 'Our team helps you understand errors and correction steps.', 'You receive a practical roadmap with expert support.'],
    points: ['Detailed multi-bureau report review', 'Error identification and correction guidance', 'Personalised improvement roadmap'],
  },
]

type Feature = (typeof insights)[number]

function CountUp({
  value,
  active,
  prefix = '',
  suffix = '',
  format = 'standard',
}: {
  value: number
  active: boolean
  prefix?: string
  suffix?: string
  format?: 'standard' | 'indian'
}) {
  const [count, setCount] = useState(0)
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!active) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || document.visibilityState === 'hidden') {
      const timeoutId = window.setTimeout(() => setCount(value), 0)
      return () => window.clearTimeout(timeoutId)
    }

    const startedAt = performance.now()
    let frameId = 0
    const duration = 1700
    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(value * easedProgress))
      if (progress < 1) frameId = requestAnimationFrame(update)
    }
    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [active, value])

  const formattedCount = format === 'indian'
    ? count.toLocaleString('en-IN')
    : count.toLocaleString('en-US')

  return <strong ref={elementRef}>{prefix}{formattedCount}{suffix}</strong>
}

function ImpactStats() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setActive(true)
      observer.disconnect()
    }, { threshold: 0.15, rootMargin: '-15% 0px -20%' })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className={active ? 'trust-section impact-active' : 'trust-section'} aria-label="Score Now impact">
      <div className="container stat-grid">
        <div><span className="stat-icon pink"><Users /></span><p><CountUp value={100000} active={active} suffix="+" format="indian" />Customers Helped</p></div>
        <div><span className="stat-icon green"><Handshake /></span><p><CountUp value={2500} active={active} prefix="₹" suffix="+ Cr" format="indian" />Loans Assisted</p></div>
        <div><span className="stat-icon blue"><BarChart3 /></span><p><CountUp value={99} active={active} suffix="%" />See Improvement</p></div>
        <div><span className="stat-icon violet"><Building2 /></span><p><strong>40+</strong>Bank &amp; Lender Partners</p></div>
      </div>
      <div className="credit-network">
        <div className="container partner-row">
          <div className="partner-intro"><span><ShieldCheck /></span><p><strong>Credit Bureau Network</strong><small>Reports and insights across major Indian bureaus</small></p></div>
          <div className="bureau-list">
            {creditBureaus.map((bureau) => <span key={bureau.name}><img src={bureau.logo} alt={`${bureau.name} logo`} /></span>)}
          </div>
        </div>
        <div className="bank-band">
          <div className="container bank-label"><Building2 /><span><strong>Indian Banking Network</strong><small>Commonly used banks and lenders</small></span></div>
          <div className="bank-marquee" aria-label={`Commonly used Indian banks: ${banks.map((bank) => bank.name).join(', ')}`}>
            <div className="bank-track">
              {[...banks, ...banks].map((bank, index) => <span key={`${bank.name}-${index}`} aria-hidden={index >= banks.length}><img src={bank.logo} alt="" />{bank.name}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Brand({ href = '#home' }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="Score Now home">
      <img src="/scorenow-logo-2026.jpg" alt="Score Now - Improve Your Credit Score" />
    </a>
  )
}

type AuthUser = { id: string; mobile: string; email: string | null; full_name: string; token: string }

const authHeaders = (user: AuthUser) => ({ Authorization: `Bearer ${user.token}` })

// Keeps the signed-in user in localStorage so a refresh doesn't log them out.
function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('scorenow-user')
      const stored = raw ? JSON.parse(raw) as Partial<AuthUser> : null
      return stored?.id && stored.token ? stored as AuthUser : null
    } catch {
      return null
    }
  })

  const login = (nextUser: AuthUser) => {
    setUser(nextUser)
    localStorage.setItem('scorenow-user', JSON.stringify(nextUser))
  }

  const logout = () => {
    if (user) void fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', headers: authHeaders(user) }).catch(() => undefined)
    setUser(null)
    localStorage.removeItem('scorenow-user')
  }

  return { user, login, logout }
}

// Opens the auth popup once per browser session, shortly after the visitor starts scrolling.
function useScrollAuthPrompt(enabled = true) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled || sessionStorage.getItem('scorenow-auth-prompted')) return

    const onScroll = () => {
      if (window.scrollY < 220) return
      sessionStorage.setItem('scorenow-auth-prompted', '1')
      window.removeEventListener('scroll', onScroll)
      setOpen(true)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled])

  return [open, setOpen] as const
}

type RequireLogin = (notice: string, action: (user: AuthUser) => void) => void

// Runs an action immediately for signed-in users, otherwise opens the auth popup and runs it after login.
function useLoginGate({ redirectAfterLogin, promptOnScroll = true }: { redirectAfterLogin?: string; promptOnScroll?: boolean } = {}) {
  const [authOpen, setAuthOpen] = useScrollAuthPrompt(promptOnScroll)
  const { user, login, logout } = useAuthUser()
  const [authNotice, setAuthNotice] = useState('')
  const pendingActionRef = useRef<((user: AuthUser) => void) | null>(null)

  const requireLogin: RequireLogin = (notice, action) => {
    if (user) {
      action(user)
      return
    }
    pendingActionRef.current = action
    setAuthNotice(notice)
    setAuthOpen(true)
  }

  const openAuth = () => {
    pendingActionRef.current = null
    setAuthNotice('')
    setAuthOpen(true)
  }

  const closeAuth = () => {
    pendingActionRef.current = null
    setAuthNotice('')
    setAuthOpen(false)
  }

  const handleLogin = (nextUser: AuthUser) => {
    login(nextUser)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (action) action(nextUser)
    else if (redirectAfterLogin) window.location.href = redirectAfterLogin
  }

  const authModal = <AuthModal open={authOpen} notice={authNotice} onClose={closeAuth} onSuccess={handleLogin} />

  return { user, logout, requireLogin, openAuth, authModal }
}

function AuthAvatarButton({ user, onClick, onLogout }: { user: AuthUser | null; onClick: () => void; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  if (!user) {
    return (
      <button className="auth-avatar-button" type="button" onClick={onClick} aria-label="Log in or sign up">
        <span className="avatar-icon"><UserRound /></span>
        <span className="avatar-label">Log In</span>
      </button>
    )
  }

  const firstName = user.full_name.trim().split(' ')[0] || 'Account'

  return (
    <div className="auth-user-menu" ref={containerRef}>
      <button className="auth-avatar-button is-logged-in" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={`Account menu for ${user.full_name}`}>
        <span className="avatar-icon"><UserRound /></span>
        <span className="avatar-label">{firstName}</span>
      </button>
      {menuOpen && (
        <div className="auth-user-dropdown" role="menu">
          <strong>{user.full_name}</strong>
          <small>{user.mobile ? `+91 ${user.mobile}` : user.email}</small>
          <a role="menuitem" href="/dashboard">My Dashboard</a>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onLogout() }}>Log Out</button>
        </div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.4 35.1 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.3 5.3C40.9 36.3 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  )
}

function OtpInputs({ digits, onChange }: { digits: string[]; onChange: (digits: string[]) => void }) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    onChange(next)
    if (digit && index < digits.length - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  return (
    <div className="otp-boxes">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { inputRefs.current[index] = element }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${index + 1} of 6`}
        />
      ))}
    </div>
  )
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  if (!domain) return email
  const visible = name.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(name.length - visible.length, 3))}@${domain}`
}

function AuthModal({ open, notice, onClose, onSuccess }: { open: boolean; notice?: string; onClose: () => void; onSuccess: (user: AuthUser) => void }) {
  const [view, setView] = useState<'login' | 'signup' | 'otp'>('login')
  const [loginMethod, setLoginMethod] = useState<'mobile' | 'email'>('mobile')
  const [emailLoginMode, setEmailLoginMode] = useState<'password' | 'otp'>('password')
  const [showPassword, setShowPassword] = useState(false)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [resendSeconds, setResendSeconds] = useState(28)
  const [otpOrigin, setOtpOrigin] = useState<'login' | 'signup'>('signup')
  const [otpContact, setOtpContact] = useState<{ type: 'mobile' | 'email'; value: string }>({ type: 'mobile', value: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [sampleOtp, setSampleOtp] = useState('')
  const pendingFullNameRef = useRef('')
  const pendingEmailRef = useRef('')
  const pendingPasswordRef = useRef('')
  const firebaseConfirmationRef = useRef<ConfirmationResult | null>(null)

  const usesFirebasePhoneAuth = !import.meta.env.DEV

  useEffect(() => {
    if (!open) return
    setView('login')
    setLoginMethod('mobile')
    setShowPassword(false)
    setOtpDigits(['', '', '', '', '', ''])
    setAuthError('')
    setSampleOtp('')
    firebaseConfirmationRef.current = null
    resetFirebaseRecaptcha()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (view !== 'otp') return
    setResendSeconds(28)
    const intervalId = window.setInterval(() => setResendSeconds((seconds) => (seconds > 0 ? seconds - 1 : 0)), 1000)
    return () => window.clearInterval(intervalId)
  }, [view])

  if (!open) return null

  const requestOtp = async (type: 'mobile' | 'email', value: string) => {
    if (type === 'mobile' && usesFirebasePhoneAuth) {
      resetFirebaseRecaptcha()
      firebaseConfirmationRef.current = await sendFirebasePhoneOtp(value)
      setSampleOtp('')
      return
    }
    const response = await fetch(`${apiUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value }),
    })
    const result = await response.json() as { message?: string; devCode?: string }
    if (!response.ok) throw new Error(result.message || 'Unable to send a verification code.')
    setSampleOtp(result.devCode || '')
  }

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = loginMethod === 'mobile' ? String(data.get('mobile') || '') : String(data.get('email') || '')
    pendingFullNameRef.current = ''
    pendingEmailRef.current = ''
    setAuthError('')
    setAuthLoading(true)
    try {
      if (loginMethod === 'email' && emailLoginMode === 'password') {
        const response = await fetch(`${apiUrl}/api/auth/email/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: value, password: String(data.get('password') || '') }),
        })
        const result = await response.json() as { message?: string; user?: Omit<AuthUser, 'token'>; token?: string }
        if (!response.ok) throw new Error(result.message || 'Unable to sign in.')
        if (result.user && result.token) onSuccess({ ...result.user, token: result.token })
        onClose()
        return
      }
      await requestOtp(loginMethod, value)
      setOtpContact({ type: loginMethod, value })
      setOtpOrigin('login')
      setOtpDigits(['', '', '', '', '', ''])
      setView('otp')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to send a verification code.')
    } finally {
      setAuthLoading(false)
    }
  }

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const mobile = String(data.get('mobile') || '')
    pendingFullNameRef.current = String(data.get('name') || '')
    pendingEmailRef.current = String(data.get('email') || '')
    pendingPasswordRef.current = String(data.get('password') || '')
    setAuthError('')
    setAuthLoading(true)
    try {
      await requestOtp('mobile', mobile)
      setOtpContact({ type: 'mobile', value: mobile })
      setOtpOrigin('signup')
      setOtpDigits(['', '', '', '', '', ''])
      setView('otp')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to send a verification code.')
    } finally {
      setAuthLoading(false)
    }
  }

  const resendOtp = async () => {
    if (resendSeconds > 0 || authLoading) return
    setAuthError('')
    setAuthLoading(true)
    try {
      await requestOtp(otpContact.type, otpContact.value)
      setOtpDigits(['', '', '', '', '', ''])
      setResendSeconds(28)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to resend the code.')
    } finally {
      setAuthLoading(false)
    }
  }

  const submitOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = otpDigits.join('')
    setAuthError('')
    setAuthLoading(true)
    try {
      const response = otpContact.type === 'mobile'
        && usesFirebasePhoneAuth
        ? await (async () => {
            const confirmation = firebaseConfirmationRef.current
            if (!confirmation) throw new Error('Request a new SMS code and try again.')
            const credential = await confirmation.confirm(code)
            const idToken = await credential.user.getIdToken()
            return fetch(`${apiUrl}/api/auth/firebase-session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                fullName: pendingFullNameRef.current,
                email: pendingEmailRef.current,
                password: pendingPasswordRef.current,
                intent: otpOrigin,
              }),
            })
          })()
        : await fetch(`${apiUrl}/api/auth/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: otpContact.type,
              value: otpContact.value,
              code,
              fullName: pendingFullNameRef.current,
              email: pendingEmailRef.current,
              password: pendingPasswordRef.current,
              intent: otpOrigin,
            }),
          })
      const result = await response.json() as { message?: string; user?: Omit<AuthUser, 'token'>; token?: string }
      if (!response.ok) throw new Error(result.message || 'Verification failed.')
      if (result.user && result.token) onSuccess({ ...result.user, token: result.token })
      onClose()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Incorrect code. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const maskedContact = otpContact.type === 'mobile'
    ? `+91 •••••${otpContact.value.slice(-4) || '4321'}`
    : (otpContact.value ? maskEmail(otpContact.value) : 'your email address')

  return (
    <div className="auth-overlay" role="presentation" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={view === 'login' ? 'Sign in to Score Now' : view === 'signup' ? 'Create a Score Now account' : 'Verify your mobile number'}
        onClick={(event) => event.stopPropagation()}
      >
        {view === 'otp'
          ? <button className="auth-back" type="button" onClick={() => setView(otpOrigin)} aria-label="Go back"><ArrowLeft /></button>
          : <button className="auth-close" type="button" onClick={onClose} aria-label="Close"><X /></button>}

        <img className="auth-brand" src="/scorenow-logo-hd.png" alt="Score Now" />
        <div id="firebase-recaptcha" />

        {view === 'otp' ? (
          <>
            <span className="auth-shield"><ShieldCheck /></span>
            <h3>Verify Your {otpContact.type === 'mobile' ? 'Mobile Number' : 'Email Address'}</h3>
            <p>Enter the 6-digit code sent to<br /><strong>{maskedContact}</strong></p>
            {sampleOtp && (
              <button type="button" className="auth-sample-otp" onClick={() => setOtpDigits(sampleOtp.split(''))}>
                <ShieldCheck /> Sample OTP (dev mode): <strong>{sampleOtp}</strong>
              </button>
            )}
            {authError && <p className="auth-error">{authError}</p>}
            <form className="auth-form otp-form" onSubmit={submitOtp}>
              <OtpInputs digits={otpDigits} onChange={setOtpDigits} />
              <button className="auth-resend" type="button" disabled={resendSeconds > 0 || authLoading} onClick={resendOtp}>
                {resendSeconds > 0 ? `Resend OTP in 00:${String(resendSeconds).padStart(2, '0')}` : 'Resend OTP'}
              </button>
              <button className="button button-primary" type="submit" disabled={authLoading || otpDigits.some((digit) => !digit)}>{authLoading ? 'Verifying…' : <>Verify &amp; Continue <ArrowRight /></>}</button>
              <p className="auth-security"><LockKeyhole /> Your information is protected with bank-level security.</p>
            </form>
          </>
        ) : (
          <>
            <span className="auth-avatar"><UserRound /></span>
            <h3>{view === 'login' ? 'Welcome Back' : 'Create Your Account'}</h3>
            <p>{view === 'login' ? 'Sign in to continue to Score Now.' : 'Start improving your credit profile in just a few steps.'}</p>
            {notice && <p className="auth-notice" role="alert"><LockKeyhole /> {notice}</p>}

            {view === 'login' && (
                <div className="auth-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={loginMethod === 'mobile'} className={loginMethod === 'mobile' ? 'active' : ''} onClick={() => setLoginMethod('mobile')}><Smartphone /> Mobile Number</button>
                <button type="button" role="tab" aria-selected={loginMethod === 'email'} className={loginMethod === 'email' ? 'active' : ''} onClick={() => { setLoginMethod('email'); setEmailLoginMode('password') }}><Mail /> Email</button>
              </div>
            )}

            {authError && <p className="auth-error">{authError}</p>}

            {view === 'login' ? (
              <form className="auth-form" onSubmit={submitLogin}>
                {loginMethod === 'mobile' ? (
                  <label><span>Mobile Number</span>
                    <div className="auth-phone-input"><span className="country-code">🇮🇳 +91<ChevronDown /></span><input name="mobile" type="tel" inputMode="numeric" pattern="[0-9]{10}" placeholder="Enter your mobile number" required /></div>
                  </label>
                ) : (
                  <>
                    <label><span>Email Address</span><div className="auth-input-icon"><Mail /><input name="email" type="email" placeholder="Enter your email" required autoComplete="email" /></div></label>
                    {emailLoginMode === 'password' && <label><span>Password</span><div className="auth-password-input"><LockKeyhole /><input name="password" type={showPassword ? 'text' : 'password'} maxLength={128} required placeholder="Enter your password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>}
                  </>
                )}
                {(loginMethod === 'mobile' || emailLoginMode === 'otp') && <p className="auth-otp-note"><ShieldCheck /> We'll send a one-time code to verify it's you.</p>}
                <button className="button button-primary" type="submit" disabled={authLoading}>{authLoading ? (loginMethod === 'email' && emailLoginMode === 'password' ? 'Signing in…' : 'Sending…') : loginMethod === 'email' && emailLoginMode === 'password' ? <>Sign In <ArrowRight /></> : <>Send OTP <ArrowRight /></>}</button>
                {loginMethod === 'email' && <p className="auth-switch"><button type="button" onClick={() => setEmailLoginMode((mode) => mode === 'password' ? 'otp' : 'password')}>{emailLoginMode === 'password' ? 'Sign in with an email code instead' : 'Sign in with your password instead'}</button></p>}
              </form>
            ) : (
              <form className="auth-form" onSubmit={submitSignup}>
                <label><span>Full Name</span><div className="auth-input-icon"><UserRound /><input name="name" required placeholder="Enter your full name" autoComplete="name" /></div></label>
                <label><span>Mobile Number</span><div className="auth-phone-input"><span className="country-code">🇮🇳 +91<ChevronDown /></span><input name="mobile" type="tel" inputMode="numeric" pattern="[0-9]{10}" placeholder="Enter your mobile number" required /></div></label>
                <label><span>Email Address</span><div className="auth-input-icon"><Mail /><input name="email" type="email" placeholder="Enter your email address" autoComplete="email" required /></div></label>
                <label><span>Create Password</span><div className="auth-password-input"><LockKeyhole /><input name="password" type={showPassword ? 'text' : 'password'} minLength={8} maxLength={128} required placeholder="Minimum 8 characters" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
                <label className="auth-terms"><input type="checkbox" required /><span>I agree to the <a href="#terms">Terms &amp; Conditions</a> and <a href="#privacy">Privacy Policy</a></span></label>
                <button className="button button-primary" type="submit" disabled={authLoading}>{authLoading ? 'Sending…' : <>Create Account <ArrowRight /></>}</button>
              </form>
            )}

            <div className="auth-divider"><span>or continue with</span></div>
            <button className="auth-google" type="button"><GoogleIcon /> Continue with Google</button>

            <p className="auth-switch">
              {view === 'login'
                ? <>New to Score Now? <button type="button" onClick={() => setView('signup')}>Create Account</button></>
                : <>Already registered? <button type="button" onClick={() => setView('login')}>Sign In</button></>}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function AppDownload() {
  return (
    <div className="app-download">
      <strong>Score Now on mobile</strong>
      <small>Apps coming soon</small>
      <div className="store-badges" aria-label="Score Now mobile apps coming soon">
        <span className="store-badge"><Smartphone /><span><small>Coming soon on the</small><b>App Store</b></span></span>
        <span className="store-badge"><Play /><span><small>Coming soon on</small><b>Google Play</b></span></span>
      </div>
    </div>
  )
}

function ScoreGauge({ score = 831 }: { score?: number }) {
  const scoreProgress = Math.min(Math.max((score - 300) / 600, 0), 1)
  const indicatorStyle = { '--score-angle': `${180 + scoreProgress * 180}deg` } as CSSProperties

  return (
    <div className="score-gauge" aria-label={`Credit score ${score}, ${score > 780 ? 'excellent' : 'good'}`}>
      <div className="gauge-track" />
      <span className="gauge-indicator" style={indicatorStyle} aria-hidden="true"><i /></span>
      <div className="gauge-value"><strong>{score}</strong><span>{score > 780 ? 'Excellent' : 'Good'}</span></div>
      <span className="gauge-min">300</span><span className="gauge-max">900</span>
    </div>
  )
}

function FeatureRow({ icon: Icon, tone, title, text }: Feature) {
  return (
    <div className="feature-row">
      <span className={`feature-icon ${tone}`}><Icon aria-hidden="true" /></span>
      <div><h3>{title}</h3><p>{text}</p></div>
    </div>
  )
}

function AssessmentForm({ business = false, user, requireLogin }: { business?: boolean; user: AuthUser | null; requireLogin: RequireLogin }) {
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')

  const submitAssessment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    data.set('assessmentType', business ? 'business' : 'individual')
    requireLogin('Please log in or sign up to submit your assessment.', (currentUser) => {
      void sendAssessment(form, data, currentUser)
    })
  }

  const sendAssessment = async (form: HTMLFormElement, data: FormData, currentUser: AuthUser) => {
    setSubmitStatus('sending')
    setSubmitMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/assessments`, { method: 'POST', headers: authHeaders(currentUser), body: data })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to send the assessment.')
      setSubmitStatus('success')
      setSubmitMessage(result.message || 'Your assessment was saved successfully. We will contact you shortly.')
      form.reset()
      setFileName('')
    } catch (error) {
      setSubmitStatus('error')
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to send the assessment. Please try again.')
    }
  }

  return (
    <section className="details-section section" id={business ? 'business-assessment' : 'personal-assessment'}>
      <div className="container details-heading"><p className="section-kicker">Free Assessment</p><h2>{business ? <>Check Your <span>Business Credit Health</span></> : <>Get Your Personal <span>Credit Health Assessment</span></>}</h2><p>{business ? 'Share your business credit goals and receive a clear starting point for your CMR profile.' : 'Share a few details so our team can understand what may be holding your credit profile back.'}</p></div>
      <div className="container details-layout">
        <div className="details-visual">
          <span>{business ? <Building2 /> : <UserRound />}</span>
          <h3>{business ? 'Build lender confidence' : 'Know where you stand'}</h3>
          <p>{business ? 'Review commercial credit exposure, payment behaviour, trade lines, and reported issues.' : 'Understand your report, identify important issues, and choose the right improvement path.'}</p>
          <ul><li><ShieldCheck /> Privacy-conscious handling</li><li><FileSearch /> Structured report review</li><li><Headphones /> Expert-guided next steps</li></ul>
        </div>
        <form className="assessment-form" onSubmit={submitAssessment} key={user?.id ?? 'guest'}>
          {business && <label className="field-wide"><span>Business name *</span><input name="businessName" required placeholder="Enter registered business name" autoComplete="organization" /></label>}
          <label><span>Full name *</span><input name="fullName" required defaultValue={user?.full_name ?? ''} placeholder="Enter your full name" autoComplete="name" /></label>
          <label><span>Mobile number *</span><input name="mobile" required defaultValue={user?.mobile ?? ''} pattern="[0-9]{10}" inputMode="numeric" placeholder="10-digit mobile number" autoComplete="tel-national" /></label>
          <label><span>Email address *</span><input name="email" required defaultValue={user?.email ?? ''} type="email" placeholder="you@example.com" autoComplete="email" /></label>
          {business ? <>
            <label><span>Business type *</span><select name="businessType" required defaultValue=""><option value="" disabled>Select business type</option><option>Proprietorship</option><option>Partnership</option><option>Private Limited</option><option>LLP</option><option>Other</option></select></label>
            <label><span>Current CMR rank</span><input name="cmr" placeholder="If known" /></label>
            <label className="field-wide"><span>Funding requirement</span><select name="funding" defaultValue=""><option value="">Select a range</option><option>Below ₹25 lakh</option><option>₹25 lakh – ₹1 crore</option><option>₹1 crore – ₹5 crore</option><option>Above ₹5 crore</option></select></label>
          </> : <>
            <label><span>City *</span><input name="city" required placeholder="Enter your city" autoComplete="address-level2" /></label>
            <label><span>Current credit score</span><input name="score" inputMode="numeric" placeholder="If known" /></label>
            <label><span>What would you like to improve? *</span><select name="goal" required defaultValue=""><option value="" disabled>Select a goal</option><option>Correct report errors</option><option>Improve a low score</option><option>Prepare for a loan</option><option>Maintain a healthy score</option></select></label>
          </>}
          <label className="file-field field-wide"><span>Upload credit report (optional)</span><input name="report" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 10 * 1024 * 1024) { event.target.value = ''; setFileName(''); setFileError('The selected file exceeds 10 MB.'); return } setFileError(''); setFileName(file?.name || '') }} /><span className="file-control"><FileCheck2 />{fileName || 'Choose PDF, JPG, or PNG (max 10 MB)'}</span></label>
          {fileError && <p className="file-error field-wide">{fileError}</p>}
          <p className="attachment-note field-wide"><Mail /> Your details and optional report are saved securely for our team to review.</p>
          {!user && <p className="attachment-note field-wide"><LockKeyhole /> You need to log in or sign up before submitting.</p>}
          {submitMessage && <p className={`submit-message ${submitStatus} field-wide`} role="status">{submitMessage}</p>}
          <button className="button button-primary field-wide" type="submit" disabled={submitStatus === 'sending'}>{submitStatus === 'sending' ? 'Sending Assessment…' : 'Send Assessment Securely'} <ArrowRight /></button>
        </form>
      </div>
    </section>
  )
}

function AssessmentPathways() {
  const [selectedSituation, setSelectedSituation] = useState(0)
  const situation = creditSituations[selectedSituation]
  const SituationIcon = situation.icon
  const situationMessage = encodeURIComponent(`Hello Score Now, I need help with: ${situation.title}. Please guide me on the next steps.`)

  return (
    <>
      <section className="assessment-section section reveal-section" id="assessment" data-reveal>
        <div className="container assessment-panel">
          <div className="assessment-copy"><p className="section-kicker">Free Initial Assessment</p><h2>Understand Your Credit Profile <span>In Five Clear Steps</span></h2><p>Start with a guided conversation. We review the information you choose to share and help you understand which action deserves attention first.</p><div className="assessment-badges"><span><ShieldCheck /> Secure conversation</span><span><Clock3 /> Quick first review</span></div><a className="button button-light" href="#personal-assessment"><FileCheck2 /> Start Free Assessment <ArrowRight /></a></div>
          <ol className="assessment-steps">
            <li><span>1</span><div><strong>Tell us your goal</strong><small>Share the concern you want to solve.</small></div></li>
            <li><span>2</span><div><strong>Confirm your details</strong><small>Provide only the information needed.</small></div></li>
            <li><span>3</span><div><strong>Review your profile</strong><small>Understand accounts, remarks, and enquiries.</small></div></li>
            <li><span>4</span><div><strong>Identify priorities</strong><small>See what may have the greatest impact.</small></div></li>
            <li><span>5</span><div><strong>Get an action roadmap</strong><small>Move forward with practical next steps.</small></div></li>
          </ol>
        </div>
      </section>

      <section className="situations-section section reveal-section" id="situations" data-reveal>
        <div className="container situations-heading"><p className="section-kicker">Where Do You Stand?</p><h2>Choose Your <span>Credit Situation</span></h2><p>Select the closest match to see a practical route forward.</p></div>
        <div className="container situation-layout">
          <div className="situation-tabs" role="tablist" aria-label="Credit situations">
            {creditSituations.map((item, index) => { const Icon = item.icon; return <button type="button" role="tab" aria-selected={selectedSituation === index} className={selectedSituation === index ? 'active' : ''} onClick={() => setSelectedSituation(index)} key={item.title}><span><Icon /></span><small>{item.label}</small><strong>{item.title}</strong><ArrowRight /></button> })}
          </div>
          <div className="situation-result" role="tabpanel" key={situation.title}>
            <span className="situation-result-icon"><SituationIcon /></span><div><small>Your recommended path</small><h3>{situation.title}</h3><p>{situation.description}</p><ul>{situation.actions.map((action) => <li key={action}><Check />{action}</li>)}</ul><a className="button button-primary" href={`https://wa.me/919114141011?text=${situationMessage}`} target="_blank" rel="noreferrer">{situation.cta}<ArrowRight /></a></div>
          </div>
        </div>
      </section>
    </>
  )
}

function PlansSection() {
  return (
    <section className="plans-section section reveal-section" id="plans" data-reveal>
      <div className="container plans-heading"><p className="section-kicker">35% Launch Offer</p><h2>Choose the Support That <span>Fits Your Profile</span></h2><p>Limited-period pricing across all plans. The final service scope is confirmed after reviewing your credit profile.</p></div>
      <div className="container plans-grid">
        {servicePlans.map((plan) => {
          const message = encodeURIComponent(`Hello Score Now, I am interested in the ${plan.name} plan. Please share the recommended scope and pricing for my credit profile.`)
          return <article className={plan.featured ? 'featured' : ''} key={plan.name}>{plan.featured && <span className="popular-label"><Star /> Most Popular</span>}<span className="discount-badge">35% OFF</span><p>Best for</p><h3>{plan.name}</h3><span className="plan-audience">{plan.audience}</span><ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul><div className="plan-footer"><small>{plan.duration}</small><span className="original-price">{plan.originalPrice} + GST</span><strong>{plan.offerPrice} <small>+ GST</small></strong><a className="button button-primary" href={`https://wa.me/919114141011?text=${message}`} target="_blank" rel="noreferrer">Choose {plan.name}<ArrowRight /></a></div></article>
        })}
      </div>
      <div className="container subscription-panel" id="subscription">
        <div className="subscription-heading"><p className="section-kicker">Subscription</p><h3>A plan is an option. A subscription is your <span>active support engagement.</span></h3><p>Selecting a plan does not start a subscription. We confirm your scope, pricing, and start date with you first.</p></div>
        <div className="subscription-pricing" aria-label="Score Now subscription plans">
          {subscriptionPlans.map((plan) => <article className={plan.featured ? 'featured' : ''} key={plan.name}>{plan.featured && <span className="subscription-popular">Most Popular</span>}<small>{plan.duration}</small><h4>{plan.name}</h4><strong>{plan.price}</strong><span>{plan.note}</span><a className="button button-primary" href={`https://wa.me/919114141011?text=${encodeURIComponent(`Hello Score Now, I would like to subscribe to the ${plan.name} plan for ${plan.price}. Please share the next steps.`)}`} target="_blank" rel="noreferrer"><MessageCircle /> Subscribe</a></article>)}
        </div>
        <div className="subscription-steps">
          {subscriptionSteps.map((step, index) => { const Icon = step.icon; return <article key={step.title}><span><Icon /></span><small>Step {index + 1}</small><strong>{step.title}</strong><p>{step.text}</p></article> })}
        </div>
        <a className="button button-primary subscription-cta" href={`https://wa.me/919114141011?text=${encodeURIComponent('Hello Score Now, I would like to start a subscription. Please help me choose a plan and confirm the scope, pricing, and start date.')}`} target="_blank" rel="noreferrer"><MessageCircle /> Start a subscription <ArrowRight /></a>
      </div>
      <p className="plans-note container"><ShieldCheck /> No score outcome is guaranteed. Recommendations depend on your report, repayment behaviour, and bureau updates.</p>
      <div className="container inclusions-heading"><p className="section-kicker">Included Support</p><h3>What Our Plans Can Include</h3><p>Service tenure and included support vary by selected plan.</p></div>
      <div className="container inclusions-grid">
        {planCapabilities.map((item) => { const Icon = item.icon; return <article key={item.title}><span><Icon /></span><h4>{item.title}</h4><p>{item.text}</p></article> })}
      </div>
    </section>
  )
}

function CreditJourney() {
  const [activeScene, setActiveScene] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef(0)
  const sceneDuration = 15000
  const scene = explainerScenes[activeScene]
  const SceneIcon = scene.icon
  const activeCaption = Math.min(Math.floor(elapsed / (sceneDuration / scene.captions.length)), scene.captions.length - 1)

  useEffect(() => {
    if (!isPlaying) return

    const startedAt = performance.now() - elapsedRef.current
    let frameId = 0
    const tick = (now: number) => {
      const nextElapsed = now - startedAt
      if (nextElapsed >= sceneDuration) {
        if (activeScene < explainerScenes.length - 1) {
          elapsedRef.current = 0
          setActiveScene((current) => current + 1)
          setElapsed(0)
        } else {
          elapsedRef.current = sceneDuration
          setElapsed(sceneDuration)
          setIsPlaying(false)
        }
        return
      }
      elapsedRef.current = nextElapsed
      setElapsed(nextElapsed)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [activeScene, isPlaying])

  useEffect(() => {
    window.speechSynthesis?.cancel()
    if (!isPlaying || isMuted || !('speechSynthesis' in window)) return

    const utterance = new SpeechSynthesisUtterance(scene.narration)
    utterance.rate = 0.86
    utterance.pitch = 1
    utterance.lang = 'en-IN'
    const preferredVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang === 'en-IN')
    if (preferredVoice) utterance.voice = preferredVoice
    window.speechSynthesis.speak(utterance)
    return () => window.speechSynthesis.cancel()
  }, [activeScene, isMuted, isPlaying, scene.narration])

  const selectScene = (index: number) => {
    elapsedRef.current = 0
    setActiveScene(index)
    setElapsed(0)
  }

  const replay = () => {
    elapsedRef.current = 0
    setActiveScene(0)
    setElapsed(0)
    setIsPlaying(true)
  }

  return (
    <section className="journey-section section reveal-section" id="how-it-works" data-reveal>
      <div className="container journey-heading">
        <p className="section-kicker">A 60-Second Credit Guide</p>
        <h2>See How Better Credit <span>Changes What’s Possible</span></h2>
        <p>Press play for a narrated guide, or choose any chapter to explore at your own pace.</p>
      </div>
      <div className="container journey-player">
        <div className={`journey-stage scene-${activeScene + 1} ${isPlaying ? 'playing' : ''}`} key={activeScene}>
          <div className="presentation-top"><span>Score Now Guide</span><span>{String(activeScene + 1).padStart(2, '0')} / {String(explainerScenes.length).padStart(2, '0')}</span></div>
          <div className="presentation-title"><span className="scene-icon"><SceneIcon /></span><div><p>{scene.label}</p><h3>{scene.title}</h3></div></div>
          <div className="presentation-body">
            <div className="presentation-metric"><strong>{scene.metric}</strong><small>{scene.metricLabel}</small></div>
            <div className="presentation-flow">
              {scene.captions.map((caption, index) => <div className={index <= activeCaption ? 'active' : ''} key={caption}><span>{index + 1}</span><p>{caption}</p></div>)}
            </div>
          </div>
          <div className="scene-caption" key={`${activeScene}-${activeCaption}`}><span>CC</span><p>{scene.captions[activeCaption]}</p></div>
          <div className="journey-mobile-controls">
            <button className="player-primary" type="button" onClick={() => setIsPlaying((playing) => !playing)}>{isPlaying ? <Pause /> : <Play />} {isPlaying ? 'Pause' : elapsed > 0 ? 'Continue' : 'Play with audio'}</button>
            <button type="button" onClick={replay} aria-label="Replay from beginning" title="Replay"><RotateCcw /></button>
            <button type="button" onClick={() => setIsMuted((muted) => !muted)} aria-label={isMuted ? 'Turn narration on' : 'Mute narration'} title={isMuted ? 'Unmute' : 'Mute'}>{isMuted ? <VolumeX /> : <Volume2 />}</button>
          </div>
        </div>
        <div className="journey-content">
          <div className="journey-chapter"><span>Chapter {activeScene + 1} of {explainerScenes.length}</span><span>{Math.round(elapsed / 1000)} sec</span></div>
          <h3>{scene.title}</h3>
          <p className="journey-caption"><Volume2 /> {scene.narration}</p>
          <ul>{scene.points.map((point) => <li key={point}><Check /> {point}</li>)}</ul>
          <div className="journey-controls">
            <button className="player-primary" type="button" onClick={() => setIsPlaying((playing) => !playing)}>{isPlaying ? <Pause /> : <Play />} {isPlaying ? 'Pause' : elapsed > 0 ? 'Continue' : 'Play with audio'}</button>
            <button type="button" onClick={replay} aria-label="Replay from beginning" title="Replay"><RotateCcw /></button>
            <button type="button" onClick={() => setIsMuted((muted) => !muted)} aria-label={isMuted ? 'Turn narration on' : 'Mute narration'} title={isMuted ? 'Unmute' : 'Mute'}>{isMuted ? <VolumeX /> : <Volume2 />}</button>
          </div>
        </div>
        <div className="journey-timeline" role="tablist" aria-label="Credit guide chapters">
          {explainerScenes.map((item, index) => (
            <button className={index === activeScene ? 'active' : ''} type="button" role="tab" aria-selected={index === activeScene} key={item.label} onClick={() => selectScene(index)}>
              <span>{index + 1}</span>{item.label}
            </button>
          ))}
          <div className="journey-progress"><span style={{ width: `${(elapsed / sceneDuration) * 100}%` }} /></div>
        </div>
      </div>
    </section>
  )
}

const chatConcerns = [
  'Improve my credit score',
  'Fix a report error',
  'Loan application rejected',
  'Business CMR support',
]

const scoreRanges = ['Below 600', '600 - 699', '700 - 749', '750+', "I don't know"]

const estimatorQuestions = [
  {
    icon: CalendarDays,
    title: 'How have you managed payments over the last 12 months?',
    factor: 'Payment history',
    context: 'Payment consistency is one of the strongest signals lenders look at. Choose the answer that best reflects your recent repayment pattern.',
    options: [
      { label: 'Paid every bill on time', points: 100, tip: 'Keep every EMI and card payment on time; payment history has a strong influence on credit health.' },
      { label: 'One late payment, over a year ago', points: 40, tip: 'Maintain a clean recent payment record so older late payments have less influence over time.' },
      { label: 'One late payment in the last year', points: -35, tip: 'Bring all accounts current and set reminders or autopay for upcoming due dates.' },
      { label: 'Several late or missed payments', points: -100, tip: 'Prioritise bringing overdue accounts current and avoid missing any future due dates.' },
    ],
  },
  {
    icon: BarChart3,
    title: 'About how much of your available card limit do you use?',
    factor: 'Credit utilisation',
    context: 'Utilisation compares card balances with your total available limit. Lower reported balances are generally healthier.',
    options: [
      { label: 'Less than 10%', points: 50, tip: 'Your reported utilisation is low; keep balances modest before statement dates.' },
      { label: '10% to 30%', points: 35, tip: 'This is a healthy range for many profiles; keep paying balances on time.' },
      { label: '31% to 50%', points: 5, tip: 'Gradually reducing card balances may improve your utilisation profile.' },
      { label: 'More than 50%', points: -55, tip: 'Focus on reducing outstanding card balances and avoid using most of your available limit.' },
    ],
  },
  {
    icon: Clock3,
    title: 'How long have you had your oldest active credit account?',
    factor: 'Credit age',
    context: 'A longer history of well-managed accounts gives lenders more information about how you handle credit.',
    options: [
      { label: '7 years or more', points: 35, tip: 'Keep well-managed older accounts active where practical; account age can support your profile.' },
      { label: '3 to 7 years', points: 25, tip: 'Continue building a consistent repayment history on your established accounts.' },
      { label: '1 to 3 years', points: 10, tip: 'Time and consistent account management can strengthen your credit history.' },
      { label: 'Less than 1 year or new to credit', points: -10, tip: 'Build history slowly with manageable credit and reliable on-time payments.' },
    ],
  },
  {
    icon: WalletCards,
    title: 'Which best describes the types of credit you use?',
    factor: 'Credit mix',
    context: 'Your profile may include revolving credit, such as cards, and instalment loans. Do not take new credit just to change this mix.',
    options: [
      { label: 'Cards and loans, all managed well', points: 25, tip: 'Maintain your existing mix responsibly; avoid borrowing just to change your credit mix.' },
      { label: 'Credit cards only', points: 10, tip: 'A single credit type is not automatically a problem; focus first on payment history and balances.' },
      { label: 'Loans only', points: 10, tip: 'Keep loan repayments on schedule and avoid unnecessary new credit.' },
      { label: 'I am new to credit or not sure', points: 0, tip: 'A current report can help confirm which accounts are contributing to your credit profile.' },
    ],
  },
  {
    icon: Search,
    title: 'How many credit applications have you made recently?',
    factor: 'Recent applications',
    context: 'Recent lender enquiries can affect how your profile is viewed. Checking your own report is different from applying for credit.',
    options: [
      { label: 'Zero or one in the last 6 months', points: 15, tip: 'Apply only when needed and compare options before making another application.' },
      { label: 'Two or three in the last 6 months', points: -15, tip: 'Pause non-essential applications for a while and review your report enquiries.' },
      { label: 'Four or more in the last 6 months', points: -35, tip: 'Avoid repeated applications and allow time between necessary credit requests.' },
      { label: 'I am not sure', points: 0, tip: 'Check the enquiries section of your latest credit report to see recent applications.' },
    ],
  },
  {
    icon: FileSearch,
    title: 'Do you know of any overdue, settled, or written-off accounts?',
    factor: 'Negative account remarks',
    context: 'Account status and repayment remarks matter. If you are unsure, your latest bureau report can help confirm what is recorded.',
    options: [
      { label: 'No, my accounts are up to date', points: 25, tip: 'Continue monitoring your reports for accuracy and keep current accounts up to date.' },
      { label: 'An account is currently overdue', points: -100, tip: 'Contact the lender to understand the overdue amount and discuss a manageable resolution.' },
      { label: 'A settled or written-off account appears', points: -70, tip: 'Review the account details and supporting documents; dispute any inaccurate reporting.' },
      { label: 'I do not know', points: -5, tip: 'Review your latest bureau report for account status, payment remarks, and possible errors.' },
    ],
  },
]

function getChatSuggestion(concern: string, scoreRange: string) {
  if (concern === 'Fix a report error') {
    return 'Start with your latest bureau report. Note the account name, disputed entry, and supporting proof before raising a correction. Our expert can help you organise the right documents.'
  }
  if (concern === 'Loan application rejected') {
    return 'Avoid making several new applications immediately. First review recent enquiries, overdue accounts, utilisation, and lender remarks to identify the likely reason for rejection.'
  }
  if (concern === 'Business CMR support') {
    return 'Review payment behaviour, credit exposure, trade lines, and lender-reported errors in your Commercial CIBIL report. A focused CMR review is the right next step.'
  }
  if (scoreRange === 'Below 600') {
    return 'Prioritise overdue payments, settled or written-off accounts, and report errors. Keep every current payment on time while working through the highest-impact issues first.'
  }
  if (scoreRange === '600 - 699') {
    return 'Focus on on-time payments and bringing credit utilisation below 30%. Avoid unnecessary enquiries while older positive payment history builds.'
  }
  if (scoreRange === '700 - 749') {
    return 'You are close to a strong lending profile. Keep utilisation low, preserve older accounts, and check your report for small errors before applying for new credit.'
  }
  if (scoreRange === '750+') {
    return 'Your score is already strong. Protect it with timely payments, low utilisation, and limited hard enquiries, and review your report periodically for unexpected changes.'
  }
  return 'Begin with a current credit report from a recognised bureau. Once you know your score and key factors, an expert can help prioritise the actions with the most impact.'
}

function CreditScoreEstimator() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const complete = answers.length === estimatorQuestions.length
  const question = estimatorQuestions[step]
  const QuestionIcon = question?.icon
  const rawScore = 600 + answers.reduce((total, answer, index) => total + estimatorQuestions[index].options[answer].points, 0)
  const estimatedScore = Math.max(300, Math.min(900, Math.round(rawScore / 10) * 10))
  const rangeLow = Math.max(300, estimatedScore - 30)
  const rangeHigh = Math.min(900, estimatedScore + 30)
  const scoreLabel = estimatedScore >= 750 ? 'Strong credit habits' : estimatedScore >= 680 ? 'Encouraging signals' : estimatedScore >= 600 ? 'Progress is within reach' : 'A fresh start is possible'
  const encouragement = estimatedScore >= 750
    ? 'You have a strong foundation. Keep your positive habits consistent.'
    : estimatedScore >= 600
      ? 'You have a base to build on. Small, steady steps can make a difference.'
      : 'This is only a starting point. There are practical steps to help strengthen your profile.'
  const focusAreas = answers.map((answer, index) => ({
    factor: estimatorQuestions[index].factor,
    points: estimatorQuestions[index].options[answer].points,
    tip: estimatorQuestions[index].options[answer].tip,
  })).sort((first, second) => first.points - second.points).slice(0, 2)

  const chooseAnswer = (answerIndex: number) => {
    setAnswers((current) => [...current.slice(0, step), answerIndex])
    setStep((current) => current + 1)
  }

  const goBack = () => {
    setStep((current) => Math.max(0, current - 1))
    setAnswers((current) => current.slice(0, -1))
  }

  const restart = () => {
    setAnswers([])
    setStep(0)
  }

  return (
    <section className="estimator-section section reveal-section" id="score-estimator" data-reveal>
      <div className="container estimator-heading"><p className="section-kicker">Free Educational Tool</p><h2>Estimate Your <span>Credit Score Range</span></h2><p>Six quick questions for a clearer starting point. No personal details needed.</p></div>
      <div className="container estimator-panel">
        {!complete ? <div className="estimator-quiz">
          <div className="estimator-toolbar"><span className="estimator-tool-icon"><BarChart3 /></span><span className="estimator-tool-title"><strong>Credit Score Snapshot</strong><small>About 1 minute · No personal information</small></span><span className="estimator-private"><LockKeyhole /> Private by design</span></div>
          <div className="estimator-progress-label"><span>Question {step + 1} <i>of {estimatorQuestions.length}</i></span><span>{Math.round(((step + 1) / estimatorQuestions.length) * 100)}%</span></div>
          <div className="estimator-progress"><span style={{ width: `${((step + 1) / estimatorQuestions.length) * 100}%` }} /></div>
          <div className="estimator-step-dots" aria-hidden="true">{estimatorQuestions.map((item, index) => <span className={index < step ? 'complete' : index === step ? 'current' : ''} key={item.factor} />)}</div>
          <div className="estimator-question-meta"><span><QuestionIcon /></span><div><small>FACTOR {String(step + 1).padStart(2, '0')}</small><strong>{question.factor}</strong></div></div>
          <h3>{question.title}</h3>
          <p className="estimator-question-context">{question.context}</p>
          <div className="estimator-options">{question.options.map((option, index) => <button type="button" key={option.label} onClick={() => chooseAnswer(index)}><span>{String.fromCharCode(65 + index)}</span>{option.label}<ArrowRight /></button>)}</div>
          {step > 0 && <button className="estimator-back" type="button" onClick={goBack}><ArrowLeft /> Previous question</button>}
        </div> : <div className="estimator-result">
          <div className="estimator-score"><p>Your indicative score range</p><strong>{rangeLow}–{rangeHigh}</strong><span>{scoreLabel}</span><div className="estimator-score-scale"><i style={{ left: `${((estimatedScore - 300) / 600) * 100}%` }} /></div><div className="estimator-scale-labels"><span>300</span><span>600</span><span>750</span><span>900</span></div><small>Approximate estimate only</small></div>
          <div className="estimator-advice"><span className="estimator-complete"><Check /> Your snapshot is ready</span><h3>Your next best steps</h3><p className="estimator-encouragement"><Sparkles />{encouragement}</p><div>{focusAreas.map((area) => <article key={area.factor}><strong>{area.factor}</strong><span>{area.tip}</span></article>)}</div><div className="estimator-actions"><button className="button button-outline" type="button" onClick={restart}><RotateCcw /> Try again</button><a className="button button-primary" href="#personal-assessment">Get a report review <ArrowRight /></a></div></div>
        </div>}
        <p className="estimator-disclaimer"><ShieldCheck /> This estimate uses general educational rules, not bureau data or a lender model. It is not an official score, financial advice, or a guarantee of credit eligibility.</p>
      </div>
    </section>
  )
}

const openChatEvent = 'scorenow:open-chat'

function ChatAssistant({ requireLogin, isDashboard = false }: { requireLogin: RequireLogin; isDashboard?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [concern, setConcern] = useState('')
  const [scoreRange, setScoreRange] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [isSavingInquiry, setIsSavingInquiry] = useState(false)
  const chatBodyRef = useRef<HTMLDivElement>(null)

  const suggestion = getChatSuggestion(concern, scoreRange)
  const phoneDigits = phone.replace(/\D/g, '')
  const contactPhone = phoneDigits.length === 10 ? phoneDigits : 'not provided'
  const whatsappMessage = encodeURIComponent(
    `Hello Score Now, I am ${name}. I need help with: ${concern}. My credit score range is: ${scoreRange}. My phone number is: ${contactPhone}.`,
  )

  const submitName = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) return
    setName(name.trim())
    setStep(2)
  }

  const submitPhone = (event: FormEvent) => {
    event.preventDefault()
    if (phoneDigits.length !== 10) {
      setPhoneError('Enter a valid 10-digit mobile number.')
      return
    }
    setPhoneError('')
    requireLogin('Please log in or sign up to request a callback.', (currentUser) => { void saveInquiry(currentUser) })
  }

  const saveInquiry = async (currentUser: AuthUser) => {
    setIsSavingInquiry(true)
    try {
      const response = await fetch(`${apiUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(currentUser) },
        body: JSON.stringify({ fullName: name, mobile: phoneDigits, concern, scoreRange }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to save your callback request.')
      setStep(4)
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Unable to save your callback request. Please try again.')
    } finally {
      setIsSavingInquiry(false)
    }
  }

  const resetChat = () => {
    setStep(0)
    setName('')
    setConcern('')
    setScoreRange('')
    setPhone('')
    setPhoneError('')
  }

  const goBack = () => {
    setPhoneError('')
    setStep((currentStep) => Math.max(0, currentStep - 1))
  }

  useEffect(() => {
    const open = () => setIsOpen(true)
    window.addEventListener(openChatEvent, open)
    return () => window.removeEventListener(openChatEvent, open)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const timeoutId = window.setTimeout(() => {
      chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen, step])

  return (
    <aside className={`chat-assistant${isOpen ? ' open' : ''}${isDashboard ? ' dashboard-assistant' : ''}`} aria-label="Score Now chat assistant">
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <span className="chat-avatar"><img src="/neha-avatar.svg" alt="" /></span>
            <div><strong>Neha · Credit Assistant</strong><small><i /> Online · Usually replies instantly</small></div>
            <div className="chat-header-actions">
              {step > 0 && <button type="button" onClick={goBack} aria-label="Go back one step" title="Back"><ArrowLeft /></button>}
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chat" title="Close"><X /></button>
            </div>
          </div>
          <div className="chat-progress" aria-label={`Chat progress: step ${Math.min(step + 1, 4)} of 4`}><span style={{ width: `${Math.min((step + 1) * 25, 100)}%` }} /></div>
          <div className="chat-body" ref={chatBodyRef} aria-live="polite">
            <div className="chat-bubble bot-message">Hi, I'm Neha. I'll ask three quick questions and suggest a practical next step for your credit profile.</div>
            {step === 0 && <div className="chat-direct"><a href="https://wa.me/919114141011" target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a><a href="tel:+919114141011"><Phone /> Call now</a></div>}

            {step === 0 && <div className="chat-choices">{chatConcerns.map((option) => <button type="button" key={option} onClick={() => { setConcern(option); setStep(1) }}>{option}</button>)}</div>}

            {step >= 1 && <div className="chat-bubble user-message">{concern}</div>}
            {step === 1 && (
              <form className="chat-form" onSubmit={submitName}>
                <div className="chat-bubble bot-message">Thanks. What should I call you?</div>
                <label><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" autoComplete="name" required minLength={2} /></label>
                <button type="submit">Continue <ArrowRight /></button>
              </form>
            )}

            {step >= 2 && <><div className="chat-bubble user-message">I'm {name}.</div><div className="chat-bubble bot-message">Nice to meet you, {name}. Do you know your current credit score range?</div></>}
            {step === 2 && <div className="chat-choices score-choices">{scoreRanges.map((option) => <button type="button" key={option} onClick={() => { setScoreRange(option); setStep(3) }}>{option}</button>)}</div>}

            {step >= 3 && <><div className="chat-bubble user-message">{scoreRange}</div><div className="chat-bubble bot-message recommendation"><strong>Suggested next step</strong>{suggestion}</div></>}
            {step === 3 && (
              <form className="chat-form phone-form" onSubmit={submitPhone}>
                <div className="chat-bubble bot-message">Would you like an expert to follow up? Share your mobile number, or continue directly on WhatsApp.</div>
                <label><span>Mobile number</span><div className="phone-input"><b>+91</b><input inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" autoComplete="tel-national" /></div></label>
                {phoneError && <p className="chat-error">{phoneError}</p>}
                <button type="submit" disabled={isSavingInquiry}>{isSavingInquiry ? 'Saving request…' : 'Request a callback'} <ArrowRight /></button>
                <a className="chat-whatsapp" href={`https://wa.me/919114141011?text=${whatsappMessage}`} target="_blank" rel="noreferrer"><MessageCircle /> Continue on WhatsApp</a>
                <small className="chat-privacy"><ShieldCheck /> Requesting a callback saves your name, number, and credit concern so our team can follow up.</small>
              </form>
            )}

            {step === 4 && (
              <div className="chat-complete">
                <div className="chat-bubble bot-message"><strong>Thank you, {name}.</strong>Your details are ready. Send the summary on WhatsApp to share it with our expert, or call us directly.</div>
                <a className="chat-whatsapp primary" href={`https://wa.me/919114141011?text=${whatsappMessage}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp our expert</a>
                <a className="chat-call" href="tel:+919114141011"><Phone /> Call +91 91141 41011</a>
                <button className="chat-restart" type="button" onClick={resetChat}>Start again</button>
              </div>
            )}
          </div>
        </div>
      )}
      {!isOpen && <div className="chat-presence">
        <div className="chat-invite"><strong>Hi, I'm Neha</strong><span>Need help with your credit score?</span></div>
        <button className="assistant-face" type="button" onClick={() => setIsOpen(true)} aria-label="Chat with Neha, Score Now credit assistant" title="Chat with Neha"><img src="/neha-avatar.svg" alt="" /><i /></button>
      </div>}
      <button className="chat-launcher" type="button" onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? 'Close Score Now assistant' : 'Open Score Now assistant'} aria-expanded={isOpen}>
        {isOpen ? <X /> : <MessageCircle />}{!isOpen && <span>Chat with us</span>}
      </button>
    </aside>
  )
}

type BureauId = 'cibil' | 'equifax' | 'experian' | 'crif'

type BureauReport = {
  request_id: string
  bureau: BureauId
  status: 'processing' | 'completed' | 'failed' | string
  failure_reason: string | null
  requested_at: string
  credit_score: number | null
  score_band: string | null
  report_date: string | null
  report_url: string | null
  total_accounts: number | null
  active_accounts: number | null
  overdue_accounts: number | null
  enquiries_last_6_months: number | null
  total_outstanding: string | null
  is_demo: boolean
}

type ProviderDiagnostics = {
  request: Record<string, unknown>
  response: { httpStatus: number | null; body: Record<string, unknown> | null }
}

type ReportDetail = {
  bureau: BureauId
  score: number | null
  reportDate: string | null
  reportUrl: string | null
  isDemo: boolean
  pdfAvailable: boolean
  personal: { name: string | null; pan: string | null; dateOfBirth: string | null; gender: string | null; phones: string[]; emails: string[]; addresses: string[] }
  summary: { totalAccounts: number; activeAccounts: number; closedAccounts: number; overdueAccounts: number; totalSanctioned: number; totalBalance: number; totalOverdue: number; enquiriesLast6Months: number; writtenOffAccounts?: number }
  scoreFactors?: { impact: 'positive' | 'negative'; text: string; tip: string | null }[]
  accounts: {
    lender: string; type: string; accountNumber: string | null; status: 'active' | 'closed'; openedOn: string | null; closedOn: string | null
    sanctionedAmount: number | null; creditLimit: number | null; currentBalance: number | null; overdueAmount: number | null; lastPaymentOn: string | null
    emiAmount?: number | null; interestRate?: number | null; writtenOffAmount?: number | null; settlementAmount?: number | null
    paymentHistory: { month: string; daysPastDue: number | null }[]
  }[]
  enquiries: { lender: string; purpose: string | null; date: string | null; amount: number | null }[]
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const formatMoney = (value: number | null | undefined) => (value === null || value === undefined ? '—' : rupees.format(value))
const formatDate = (value: string | null | undefined) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const formatMonth = (value: string) => new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })

type ReportAccount = ReportDetail['accounts'][number]
type AccountFilter = 'all' | 'attention' | 'active' | 'closed'

const accountKey = (account: ReportAccount, index: number) => `${account.lender}-${account.accountNumber ?? 'unknown'}-${index}`

const needsAttention = (account: ReportAccount) =>
  (account.overdueAmount ?? 0) > 0 || (account.writtenOffAmount ?? 0) > 0 || (account.settlementAmount ?? 0) > 0

const accountFlag = (account: ReportAccount) => {
  if ((account.writtenOffAmount ?? 0) > 0) return { label: 'Written off', tone: 'overdue' }
  if ((account.settlementAmount ?? 0) > 0) return { label: 'Settled', tone: 'overdue' }
  if ((account.overdueAmount ?? 0) > 0) return { label: 'Overdue', tone: 'overdue' }
  return account.status === 'active' ? { label: 'Active', tone: 'active' } : { label: 'Closed', tone: 'closed' }
}

const accountFilters: { id: AccountFilter; label: string; matches: (account: ReportAccount) => boolean }[] = [
  { id: 'all', label: 'All', matches: () => true },
  { id: 'attention', label: 'Needs attention', matches: needsAttention },
  { id: 'active', label: 'Active', matches: (account) => account.status === 'active' },
  { id: 'closed', label: 'Closed', matches: (account) => account.status === 'closed' },
]

function ReportDetailView({ user, requestId }: { user: AuthUser; requestId: string }) {
  const [detail, setDetail] = useState<ReportDetail | null>(null)
  const [error, setError] = useState('')
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all')
  const [accountSearch, setAccountSearch] = useState('')
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`${apiUrl}/api/reports/${requestId}`, { headers: authHeaders(user) })
      .then(async (response) => {
        const result = await response.json() as ReportDetail & { message?: string }
        if (!response.ok) throw new Error(result.message || 'Unable to load this report.')
        if (!cancelled) {
          setDetail(result)
          setExpandedAccount(result.accounts.length ? accountKey(result.accounts[0], 0) : null)
        }
      })
      .catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load this report.') })
    return () => { cancelled = true }
  }, [requestId, user])

  if (error) return <p className="dashboard-notice error">{error}</p>
  if (!detail) return <div className="dashboard-card report-loading"><RotateCcw /> Loading full report…</div>

  const { summary, personal } = detail
  const bureauLabel = bureauCatalog.find((item) => item.id === detail.bureau)?.name ?? detail.bureau
  const visibleAccounts = detail.accounts
    .map((account, index) => ({ account, index }))
    .filter(({ account }) => accountFilters.find((item) => item.id === accountFilter)!.matches(account))
    .filter(({ account }) => {
      const query = accountSearch.trim().toLowerCase()
      return !query || account.lender.toLowerCase().includes(query) || (account.accountNumber ?? '').toLowerCase().includes(query) || account.type.toLowerCase().includes(query)
    })

  const downloadPdf = async () => {
    setDownloading(true)
    setDownloadError('')
    try {
      const response = await fetch(`${apiUrl}/api/reports/${requestId}/pdf`, { headers: authHeaders(user) })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(result?.message || 'Unable to download the PDF.')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `ScoreNow-${detail.bureau}-report-${detail.reportDate ?? 'latest'}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (downloadFailure) {
      setDownloadError(downloadFailure instanceof Error ? downloadFailure.message : 'Unable to download the PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="report-detail">
      {detail.isDemo && <p className="dashboard-notice info">Demo report with sample data — not a real bureau report.</p>}
      <article className="dashboard-card report-toolbar">
        <div className="report-toolbar-title">
          <span><FileCheck2 /></span>
          <div><strong>{bureauLabel} credit report</strong><small>Generated {formatDate(detail.reportDate)}{personal.name ? ` · ${personal.name}` : ''}</small></div>
        </div>
        <div className="report-toolbar-actions">
          {detail.reportUrl && <a className="button button-outline" href={detail.reportUrl} target="_blank" rel="noreferrer"><ExternalLink /> View online</a>}
          {detail.pdfAvailable && <button type="button" className="button button-primary" disabled={downloading} onClick={() => void downloadPdf()}><Download /> {downloading ? 'Preparing…' : 'Download PDF'}</button>}
        </div>
      </article>
      <p className="dashboard-notice info">If a bureau-issued PDF is unavailable, the download is a Score Now-generated report copy based on the bureau data, not an official bureau document.</p>
      {downloadError && <p className="dashboard-notice error" role="alert">{downloadError}</p>}
      <div className="report-summary-strip">
        <div><small>Total accounts</small><strong>{summary.totalAccounts}</strong></div>
        <div><small>Active</small><strong>{summary.activeAccounts}</strong></div>
        <div><small>Closed</small><strong>{summary.closedAccounts}</strong></div>
        <div className={summary.overdueAccounts ? 'is-bad' : ''}><small>Overdue accounts</small><strong>{summary.overdueAccounts}</strong></div>
        <div><small>Outstanding</small><strong>{formatMoney(summary.totalBalance)}</strong></div>
        <div className={summary.totalOverdue ? 'is-bad' : ''}><small>Overdue amount</small><strong>{formatMoney(summary.totalOverdue)}</strong></div>
        <div><small>Enquiries (6 months)</small><strong>{summary.enquiriesLast6Months}</strong></div>
        {(summary.writtenOffAccounts ?? 0) > 0 && <div className="is-bad"><small>Written off / settled</small><strong>{summary.writtenOffAccounts}</strong></div>}
      </div>

      <div className="report-detail-grid">
        <article className="dashboard-card report-personal" id="personal-details">
          <div className="dashboard-card-heading"><strong><UserRound /> Personal Details</strong></div>
          <dl>
            <dt>Name</dt><dd>{personal.name || '—'}</dd>
            <dt>PAN</dt><dd>{personal.pan || '—'}</dd>
            <dt>Date of birth</dt><dd>{formatDate(personal.dateOfBirth)}</dd>
            <dt>Gender</dt><dd>{personal.gender || '—'}</dd>
            <dt>Phone</dt><dd>{personal.phones.join(', ') || '—'}</dd>
            <dt>Email</dt><dd>{personal.emails.join(', ') || '—'}</dd>
            <dt>Address</dt><dd>{personal.addresses[0] || '—'}</dd>
            <dt>Report date</dt><dd>{formatDate(detail.reportDate)}</dd>
          </dl>
        </article>

        <article className="dashboard-card report-enquiries" id="credit-enquiries">
          <div className="dashboard-card-heading"><strong><Search /> Credit Enquiries</strong><small>{detail.enquiries.length} total</small></div>
          {detail.enquiries.length ? <ul>{detail.enquiries.map((enquiry, index) => <li key={`${enquiry.lender}-${index}`}><div><strong>{enquiry.lender}</strong><small>{enquiry.purpose || 'Credit enquiry'}{enquiry.amount ? ` · ${formatMoney(enquiry.amount)}` : ''}</small></div><time>{formatDate(enquiry.date)}</time></li>)}</ul> : <p className="report-empty">No enquiries reported.</p>}
        </article>
      </div>

      <article className="dashboard-card report-accounts" id="credit-accounts">
        <div className="dashboard-card-heading">
          <div className="report-accounts-title">
            <strong><WalletCards /> Credit Accounts</strong>
            <small>View and manage all your credit accounts reported by different lenders.</small>
          </div>
          <span className="report-account-total">{detail.accounts.length} accounts</span>
        </div>
        <div className="report-account-toolbar">
          <div className="report-account-filters" role="tablist" aria-label="Filter accounts">{accountFilters.map((filter) => {
            const count = detail.accounts.filter(filter.matches).length
            return <button type="button" role="tab" aria-selected={accountFilter === filter.id} className={accountFilter === filter.id ? 'active' : ''} key={filter.id} onClick={() => setAccountFilter(filter.id)}>{filter.label} <b>{count}</b></button>
          })}</div>
          <label className="report-account-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search credit accounts</span>
            <input value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Search by lender or account number…" />
          </label>
          <div className="payment-legend" aria-label="Payment history legend"><span><i className="ontime" /> On time</span><span><i className="late" /> Days late</span><span><i className="unknown" /> Not reported</span></div>
        </div>
        {visibleAccounts.length ? <div className="credit-account-list" id="payment-history">
          {visibleAccounts.map(({ account, index }) => {
            const key = accountKey(account, index)
            const expanded = expandedAccount === key
            const flag = accountFlag(account)
            const alertText = (account.writtenOffAmount ?? 0) > 0
              ? `Lender wrote off ${formatMoney(account.writtenOffAmount)}. Review this item in your report.`
              : (account.settlementAmount ?? 0) > 0
                ? `This account was settled for ${formatMoney(account.settlementAmount)}. Review the details in your report.`
                : (account.overdueAmount ?? 0) > 0
                  ? `${formatMoney(account.overdueAmount)} is reported overdue on this account. Review the payment details in your report.`
                  : ''
            return (
              <article className={`credit-account-card${needsAttention(account) ? ' needs-attention' : ''}`} key={key}>
                <div className="credit-account-summary">
                  <div className="credit-account-lender">
                    <span className={`credit-account-avatar tone-${index % 4}`}>{account.lender.trim().charAt(0).toUpperCase() || '?'}</span>
                    <span><strong>{account.lender}</strong><small>{account.type}</small></span>
                  </div>
                  <div className="credit-account-field account-number-field"><small>Account no.</small><strong>{account.accountNumber ? `•••• ${account.accountNumber.slice(-4)}` : '—'}</strong></div>
                  <div className="credit-account-field"><small>Status</small><span className={`account-chip ${flag.tone}`}>{flag.label}</span></div>
                  <div className="credit-account-field"><small>Outstanding</small><strong>{formatMoney(account.currentBalance)}</strong></div>
                  <div className="credit-account-field"><small>Overdue</small><strong className={(account.overdueAmount ?? 0) > 0 ? 'is-bad' : 'is-good'}>{formatMoney(account.overdueAmount)}</strong></div>
                  <div className="credit-account-field"><small>Last payment</small><strong>{formatDate(account.lastPaymentOn)}</strong></div>
                  <button
                    className="credit-account-toggle"
                    type="button"
                    aria-label={`${expanded ? 'Collapse' : 'Expand'} ${account.lender} account details`}
                    aria-expanded={expanded}
                    onClick={() => setExpandedAccount(expanded ? null : key)}
                  ><ChevronDown /></button>
                </div>
                {expanded && <div className="credit-account-details">
                  {alertText && <div className="credit-account-alert"><AlertTriangle /><span>{alertText}</span></div>}
                  <dl className="credit-account-extra">
                    <div><dt>Outstanding</dt><dd>{formatMoney(account.currentBalance)}</dd></div>
                    <div><dt>Overdue</dt><dd className={(account.overdueAmount ?? 0) > 0 ? 'is-bad' : 'is-good'}>{formatMoney(account.overdueAmount)}</dd></div>
                    <div><dt>Last payment</dt><dd>{formatDate(account.lastPaymentOn)}</dd></div>
                  </dl>
                  <div className="credit-account-payment-heading"><strong>Payment history</strong><span>Most recent first</span></div>
                  {account.paymentHistory.length ? <div className="credit-account-payment-history" aria-label={`${account.lender} payment history, most recent first`}>
                    {account.paymentHistory.map((entry) => {
                      const late = (entry.daysPastDue ?? 0) > 0
                      const paymentTone = entry.daysPastDue === null ? 'unknown' : late ? 'late' : 'ontime'
                      const paymentText = entry.daysPastDue === null ? 'Not reported' : late ? `${entry.daysPastDue} days late` : 'On time'
                      return <div className="credit-account-payment" key={entry.month} title={`${formatMonth(entry.month)}: ${paymentText}`}><small>{formatMonth(entry.month)}</small><span className={paymentTone}>{late ? entry.daysPastDue : entry.daysPastDue === null ? '—' : <Check />}</span></div>
                    })}
                  </div> : <p className="report-empty credit-account-no-history">No payment history was included for this account.</p>}
                </div>}
              </article>
            )
          })}
        </div> : <p className="report-empty">{detail.accounts.length ? 'No accounts match your filters.' : 'No accounts found in this report.'}</p>}
      </article>
    </section>
  )
}

type DashboardStatus = {
  profile: { id: string; name_as_per_pan: string; date_of_birth: string; city: string | null; state?: string | null; pan_last4?: string | null; kyc_status: string } | null
  reports: BureauReport[]
}

type SupportTicketComment = {
  id: string
  author_type: 'customer' | 'admin'
  author_id: string
  author_name: string
  message: string
  created_at: string
}

type SupportTicket = {
  id: string
  requester_name: string
  requester_mobile: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
  comments: SupportTicketComment[]
}

type ReportOptions = { price: number; paymentsEnabled: boolean; demoMode: boolean; bureaus: { id: BureauId; name: string; available: boolean }[] }

const bureauCatalog: { id: BureauId; name: string; logo: string }[] = [
  { id: 'cibil', name: 'TransUnion CIBIL', logo: '/logo-cibil.png' },
  { id: 'equifax', name: 'Equifax', logo: '/logo-equifax.svg' },
  { id: 'experian', name: 'Experian', logo: '/logo-experian-new.svg' },
  { id: 'crif', name: 'CRIF', logo: '/logo-crif.png' },
]

const indianStates = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

type RazorpayCheckout = { open: () => void; on: (event: 'payment.failed', callback: (response: { error?: { description?: string } }) => void) => void }
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout
type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }

type SimulatedCheckoutState = { bureau: BureauId; orderId: string; amount: number; bureauName: string; prefill: Record<string, string>; done: () => void }

// Stand-in for Razorpay checkout while the website is under Razorpay review; payments auto-approve server-side.
function SimulatedCheckout({ checkout, onApprove, onDismiss }: { checkout: SimulatedCheckoutState; onApprove: () => void; onDismiss: () => void }) {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi')
  const [stage, setStage] = useState<'select' | 'processing' | 'approved'>('select')

  const pay = () => {
    setStage('processing')
    window.setTimeout(() => {
      setStage('approved')
      window.setTimeout(onApprove, 900)
    }, 1200)
  }

  return (
    <div className="auth-overlay" role="presentation" onClick={stage === 'select' ? onDismiss : undefined}>
      <div className="sim-checkout" role="dialog" aria-modal="true" aria-label="Payment" onClick={(event) => event.stopPropagation()}>
        <header>
          <img src="/scorenow-logo-hd.png" alt="Score Now" />
          <div><strong>Score Now</strong><small>{checkout.bureauName} credit report</small></div>
          <b>₹{(checkout.amount / 100).toFixed(2)}</b>
          {stage === 'select' && <button type="button" onClick={onDismiss} aria-label="Close"><X /></button>}
        </header>
        {stage === 'select' && <>
          <p className="sim-contact">{checkout.prefill.contact}{checkout.prefill.email ? ` · ${checkout.prefill.email}` : ''}</p>
          <div className="sim-methods" role="radiogroup" aria-label="Payment method">
            {([['upi', 'UPI', 'Google Pay, PhonePe, Paytm & more'], ['card', 'Card', 'Visa, Mastercard, RuPay'], ['netbanking', 'Netbanking', 'All major banks']] as const).map(([id, label, hint]) => (
              <button type="button" role="radio" aria-checked={method === id} className={method === id ? 'active' : ''} key={id} onClick={() => setMethod(id)}>
                <span><strong>{label}</strong><small>{hint}</small></span>{method === id && <Check />}
              </button>
            ))}
          </div>
          <button type="button" className="button button-primary sim-pay" onClick={pay}>Pay ₹{(checkout.amount / 100).toFixed(2)}</button>
          <p className="sim-note"><ShieldCheck /> Payments are auto-approved while our payment gateway is being activated. You will not be charged.</p>
        </>}
        {stage === 'processing' && <div className="sim-status"><RotateCcw className="spin" /><strong>Processing payment…</strong></div>}
        {stage === 'approved' && <div className="sim-status approved"><span><Check /></span><strong>Payment approved</strong><small>Fetching your report…</small></div>}
      </div>
    </div>
  )
}

const loadRazorpayCheckout = () => new Promise<RazorpayConstructor | null>((resolve) => {
  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay
  if (existing) {
    resolve(existing)
    return
  }
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve((window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay ?? null)
  script.onerror = () => resolve(null)
  document.body.appendChild(script)
})

function ProfileOnboarding({ user, onComplete, onLogout }: { user: AuthUser; onComplete: () => void; onLogout: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${apiUrl}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to save your profile.')
      onComplete()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-shell onboarding-shell">
      <aside className="dashboard-sidebar"><Brand href="/" /><div className="dashboard-support"><span><ShieldCheck /></span><strong>Your details stay protected</strong><p>PAN is stored encrypted and only shared with the credit bureau you choose.</p><button type="button" onClick={onLogout}>Log Out <ArrowRight /></button></div></aside>
      <main className="dashboard-main"><div className="onboarding-wrap"><div className="onboarding-intro"><span className="onboarding-kicker"><Sparkles /> Almost there</span><h1>Complete your credit profile</h1><p>We need these details to fetch your credit report from CIBIL, Equifax, or Experian.</p><div className="onboarding-steps"><span className="active"><b>1</b>Profile details</span><span><b>2</b>Choose bureau &amp; pay</span><span><b>3</b>Credit dashboard</span></div></div><form className="onboarding-form" onSubmit={submitProfile}><div className="onboarding-form-heading"><span><FileCheck2 /></span><div><h2>Verify your identity</h2><p>Use the details exactly as they appear on your PAN card.</p></div></div><div className="onboarding-form-grid"><label><span>Name as per PAN *</span><input name="nameAsPerPan" required minLength={2} placeholder="Enter your full name" autoComplete="name" /></label><label><span>PAN number *</span><input name="pan" required pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" placeholder="ABCDE1234F" autoCapitalize="characters" /></label><label><span>Date of birth *</span><input name="dateOfBirth" type="date" required /></label><label><span>Gender *</span><select name="gender" required defaultValue=""><option value="" disabled>Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label><label className="field-wide"><span>Address *</span><input name="addressLine1" required placeholder="House number and street" autoComplete="street-address" /></label><label><span>City *</span><input name="city" required placeholder="Your city" autoComplete="address-level2" /></label><label><span>State *</span><select name="state" required defaultValue=""><option value="" disabled>Select state</option>{indianStates.map((state) => <option key={state}>{state}</option>)}</select></label><label><span>PIN code *</span><input name="pincode" required inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit PIN" autoComplete="postal-code" /></label>{!user.email && <label className="field-wide"><span>Email address *</span><input name="email" type="email" required placeholder="you@example.com" autoComplete="email" /></label>}</div><label className="onboarding-consent"><input type="checkbox" required /><span>I agree to let Score Now share these details with the credit bureau I choose to fetch my credit report.</span></label>{error && <p className="auth-error">{error}</p>}<button className="button button-primary onboarding-submit" type="submit" disabled={saving}>{saving ? 'Saving profile…' : <>Save Profile &amp; Continue <ArrowRight /></>}</button></form></div></main>
    </div>
  )
}

type CreditGuideSlug = 'improve-credit-score' | 'good-credit-score' | 'credit-enquiries'
type CreditGuide = {
  title: string
  description: string
  readTime: string
  icon: typeof TrendingUp
  sections: { title: string; paragraphs: string[]; points?: string[] }[]
}

const creditGuides: Record<CreditGuideSlug, CreditGuide> = {
  'improve-credit-score': {
    title: '5 Ways to Improve Your Credit Score',
    description: 'Build healthy credit habits over time, understand the options available, and choose borrowing only when it fits your needs.',
    readTime: '5 min read',
    icon: TrendingUp,
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
  'good-credit-score': {
    title: 'What is a Good Credit Score?',
    description: 'Learn how to read your score in context and why lenders look at more than one number.',
    readTime: '4 min read',
    icon: Gauge,
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
  'credit-enquiries': {
    title: 'How Credit Enquiries Affect Your Score',
    description: 'Understand what happens when you apply for credit and how to keep track of applications on your report.',
    readTime: '6 min read',
    icon: FileSearch,
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
}

const guideProductOptions = [
  {
    icon: CreditCard,
    title: 'FD-backed secured card',
    description: 'Some providers offer a credit card secured against a fixed deposit. The deposit may be held as collateral while the card is active.',
    checks: 'Ask about the deposit lock-in, fees, interest, bureau reporting, and what happens if a payment is missed.',
    message: 'Hello Score Now, I would like to ask about FD-backed secured credit card options.',
  },
  {
    icon: WalletCards,
    title: 'Existing or standard credit card',
    description: 'If you already have a card, regular on-time payments and sensible balances may help build a positive repayment record.',
    checks: 'Compare annual charges and repayment terms. Avoid applying for a card solely to chase a score increase.',
    message: 'Hello Score Now, I would like guidance on choosing and managing a credit card responsibly.',
  },
]

function CreditGuidePage({ slug }: { slug: string }) {
  const guideSlug = Object.keys(creditGuides).find((key) => key === slug) as CreditGuideSlug | undefined
  const guide = guideSlug ? creditGuides[guideSlug] : undefined
  if (!guide) {
    return (
      <main className="guide-not-found">
        <Brand href="/" />
        <h1>Guide not found</h1>
        <p>That credit guide may have moved. You can return to your dashboard to browse the available guides.</p>
        <a className="button button-primary" href="/dashboard#credit-learning">Back to credit guides <ArrowRight /></a>
      </main>
    )
  }

  const GuideIcon = guide.icon
  const otherGuides = (Object.entries(creditGuides) as [CreditGuideSlug, CreditGuide][])
    .filter(([otherSlug]) => otherSlug !== guideSlug)

  return (
    <div className="site-shell credit-guide-page">
      <header className="site-header">
        <div className="nav-wrap">
          <Brand href="/" />
          <a className="guide-back-link" href="/dashboard#credit-learning"><ArrowLeft /> Back to dashboard</a>
        </div>
      </header>
      <main className="credit-guide-main">
        <div className="credit-guide-wrap">
          <a className="guide-breadcrumb" href="/dashboard#credit-learning">Credit workspace <ArrowRight /> Guides</a>
          <article className="credit-guide-article">
            <header className="credit-guide-title">
              <span className="credit-guide-title-icon"><GuideIcon /></span>
              <span className="credit-guide-read-time"><Clock3 /> {guide.readTime}</span>
              <h1>{guide.title}</h1>
              <p>{guide.description}</p>
            </header>

            {guide.sections.map((section) => (
              <section className="credit-guide-section" key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.points && <ul>{section.points.map((point) => <li key={point}><Check /> <span>{point}</span></li>)}</ul>}
              </section>
            ))}

            {guideSlug === 'improve-credit-score' && (
              <section className="guide-options">
                <div className="guide-options-heading">
                  <span><CreditCard /></span>
                  <div><h2>Credit options to explore</h2><p>These are general examples, not specific product offers or a recommendation to borrow.</p></div>
                </div>
                <div className="guide-option-grid">
                  {guideProductOptions.map((option) => {
                    const OptionIcon = option.icon
                    return (
                      <article className="guide-option-card" key={option.title}>
                        <span className="guide-option-icon"><OptionIcon /></span>
                        <h3>{option.title}</h3>
                        <p>{option.description}</p>
                        <small>{option.checks}</small>
                        <a href={`https://wa.me/919114141011?text=${encodeURIComponent(option.message)}`} target="_blank" rel="noreferrer">
                          Ask about this option <ArrowRight />
                        </a>
                      </article>
                    )
                  })}
                </div>
                <p className="guide-disclaimer"><ShieldCheck /> A fixed deposit by itself does not build a credit history. An FD-backed card may report repayment activity, but terms and bureau reporting vary by provider. No product can guarantee a score increase.</p>
              </section>
            )}

            <aside className="guide-help-callout">
              <span><MessageCircle /></span>
              <div><strong>Need help understanding your report?</strong><p>Ask our team about your report or general credit options.</p></div>
              <a href={`https://wa.me/919114141011?text=${encodeURIComponent(`Hello Score Now, I have a question about: ${guide.title}`)}`} target="_blank" rel="noreferrer">Talk to our team <ArrowRight /></a>
            </aside>
          </article>

          <section className="related-guides">
            <div className="related-guides-heading"><h2>Explore more guides</h2><a href="/dashboard#credit-learning">All guides <ArrowRight /></a></div>
            <div className="related-guide-grid">
              {otherGuides.map(([otherSlug, otherGuide]) => {
                const OtherIcon = otherGuide.icon
                return <a className="related-guide-card" href={`/guides/${otherSlug}`} key={otherSlug}><span><OtherIcon /></span><strong>{otherGuide.title}</strong><small>{otherGuide.readTime} <ArrowRight /></small></a>
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function DashboardPage({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [status, setStatus] = useState<DashboardStatus | null>(null)
  const [options, setOptions] = useState<ReportOptions | null>(null)
  const [providerDiagnostics, setProviderDiagnostics] = useState<Partial<Record<BureauId, ProviderDiagnostics>>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [supportLoading, setSupportLoading] = useState(true)
  const [supportRefresh, setSupportRefresh] = useState(0)
  const [supportSubmitting, setSupportSubmitting] = useState(false)
  const [supportReplying, setSupportReplying] = useState<string | null>(null)
  const [supportError, setSupportError] = useState('')
  const [supportNotice, setSupportNotice] = useState('')
  const [busyBureau, setBusyBureau] = useState<BureauId | null>(null)
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [downloadReportError, setDownloadReportError] = useState('')
  const [selectedBureau, setSelectedBureau] = useState<BureauId | null>(null)
  const [activeNav, setActiveNav] = useState('#dashboard-overview')
  const [notice, setNotice] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null)
  const [simCheckout, setSimCheckout] = useState<SimulatedCheckoutState | null>(null)
  const firstName = user.full_name.trim().split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const loadStatus = async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [statusResponse, optionsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/dashboard`, { headers: authHeaders(user) }),
        fetch(`${apiUrl}/api/reports/options`),
      ])
      if (statusResponse.status === 401) {
        onLogout()
        return
      }
      if (!statusResponse.ok) throw new Error('Unable to load dashboard')
      setStatus(await statusResponse.json() as DashboardStatus)
      if (optionsResponse.ok) setOptions(await optionsResponse.json() as ReportOptions)
      if (refresh) setNotice({ tone: 'success', text: 'Your dashboard is up to date.' })
    } catch (error) {
      if (refresh) {
        setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to refresh your dashboard.' })
      } else {
        setStatus({ profile: null, reports: [] })
      }
    } finally {
      if (refresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => { void loadStatus() }, [user.id])

  useEffect(() => {
    let cancelled = false
    fetch(`${apiUrl}/api/support/tickets`, { headers: authHeaders(user) })
      .then(async (response) => {
        const result = await response.json() as { tickets?: SupportTicket[]; message?: string }
        if (!response.ok) throw new Error(result.message || 'Unable to load your support tickets.')
        if (!cancelled) setSupportTickets(result.tickets || [])
      })
      .catch((error: unknown) => {
        if (!cancelled) setSupportError(error instanceof Error ? error.message : 'Unable to load your support tickets.')
      })
      .finally(() => { if (!cancelled) setSupportLoading(false) })
    return () => { cancelled = true }
  }, [user, supportRefresh])

  const submitSupportTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    setSupportSubmitting(true)
    setSupportError('')
    setSupportNotice('')
    const form = new FormData(formElement)
    try {
      const response = await fetch(`${apiUrl}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to submit your support ticket.')
      formElement.reset()
      setSupportNotice(result.message || 'Your support ticket was sent to our team.')
      setSupportLoading(true)
      setSupportRefresh((refresh) => refresh + 1)
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : 'Unable to submit your support ticket.')
    } finally {
      setSupportSubmitting(false)
    }
  }

  const replyToSupportTicket = async (event: FormEvent<HTMLFormElement>, ticketId: string) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const message = String(new FormData(formElement).get('message') || '').trim()
    setSupportReplying(ticketId)
    setSupportError('')
    try {
      const response = await fetch(`${apiUrl}/api/support/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
        body: JSON.stringify({ message }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to send your reply.')
      formElement.reset()
      setSupportLoading(true)
      setSupportRefresh((refresh) => refresh + 1)
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : 'Unable to send your reply.')
    } finally {
      setSupportReplying(null)
    }
  }

  if (loading) return <div className="dashboard-loading"><span><RotateCcw /></span><strong>Loading your credit workspace…</strong></div>
  if (!status?.profile) return <ProfileOnboarding user={user} onComplete={() => void loadStatus()} onLogout={onLogout} />

  const reportFor = (bureau: BureauId) => status.reports.find((report) => report.bureau === bureau)
  const bureauName = (bureau: BureauId) => bureauCatalog.find((item) => item.id === bureau)?.name ?? bureau
  const completedReports = status.reports.filter((report) => report.status === 'completed')
  const activeBureau = selectedBureau && reportFor(selectedBureau)?.status === 'completed' ? selectedBureau : completedReports[0]?.bureau ?? null
  const activeReport = activeBureau ? reportFor(activeBureau) : undefined
  const price = options?.price ?? 99
  const downloadActiveReport = async () => {
    if (!activeReport || downloadingReport) return
    setDownloadingReport(true)
    setDownloadReportError('')
    try {
      const response = await fetch(`${apiUrl}/api/reports/${activeReport.request_id}/pdf`, { headers: authHeaders(user) })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(result?.message || 'Unable to download your report.')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `ScoreNow-${activeReport.bureau}-report-${activeReport.report_date ?? 'latest'}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setDownloadReportError(error instanceof Error ? error.message : 'Unable to download your report.')
    } finally {
      setDownloadingReport(false)
    }
  }
  const sidebarItems: { icon: typeof House; label: string; href: string; external?: boolean }[] = [
    { icon: FileSearch, label: 'Credit score', href: '#dashboard-overview' },
    { icon: FileCheck2, label: 'Download report', href: activeReport ? '#my-report' : '#credit-reports' },
    { icon: Lightbulb, label: 'Report insights', href: '#score-insights' },
    { icon: TrendingUp, label: 'Improve score', href: '#credit-learning' },
    { icon: Gift, label: 'Offers', href: '/#plans', external: true },
    { icon: UserRound, label: 'My profile', href: '#my-profile' },
    { icon: Settings, label: 'Settings', href: '#settings' },
    { icon: CircleHelp, label: 'Help & support', href: '#help-support' },
  ]

  const applyReportResult = (result: DashboardStatus, bureau: BureauId) => {
    setStatus(result)
    const report = result.reports.find((item) => item.bureau === bureau)
    if (report?.status === 'completed') {
      setSelectedBureau(bureau)
      setNotice({ tone: 'success', text: `Your ${bureauName(bureau)} report is ready.` })
    } else {
      setNotice({ tone: 'error', text: `${report?.failure_reason || 'We could not fetch the report.'} Use Retry — you won't be charged again.` })
    }
  }

  const verifyPayment = async (bureau: BureauId, payment: RazorpaySuccess) => {
    setNotice({ tone: 'info', text: `Payment received. Fetching your ${bureauName(bureau)} report…` })
    try {
      const response = await fetch(`${apiUrl}/api/reports/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
        body: JSON.stringify({ orderId: payment.razorpay_order_id, paymentId: payment.razorpay_payment_id, signature: payment.razorpay_signature }),
      })
      const result = await response.json() as DashboardStatus & { message?: string; providerDiagnostics?: ProviderDiagnostics | null }
      if (!response.ok) throw new Error(result.message || 'Payment verification failed.')
      if (result.providerDiagnostics) {
        setProviderDiagnostics((previous) => ({ ...previous, [bureau]: result.providerDiagnostics! }))
      }
      applyReportResult(result, bureau)
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Payment verification failed.' })
    }
  }

  const recordPaymentFailure = async (orderId: string, failureMessage: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/reports/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
        body: JSON.stringify({ orderId }),
      })
      const result = await response.json() as { message?: string }
      if (response.status === 401) {
        onLogout()
        throw new Error('Your session expired before the failed payment could be recorded.')
      }
      if (!response.ok) throw new Error(result.message || 'Unable to record the failed payment.')
    } catch (error) {
      console.error('Payment failure history update failed', error)
      setNotice({
        tone: 'error',
        text: `${failureMessage} We could not update the payment history. Please refresh or contact support.`,
      })
    }
  }

  const buyReport = async (bureau: BureauId) => {
    setBusyBureau(bureau)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/reports/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
        body: JSON.stringify({ bureau }),
      })
      const order = await response.json() as { message?: string; simulated?: boolean; orderId: string; amount: number; currency: string; keyId: string; bureauName: string; prefill: Record<string, string> }
      if (response.status === 401) {
        onLogout()
        return
      }
      if (!response.ok) throw new Error(order.message || 'Unable to start the payment.')
      if (order.simulated) {
        await new Promise<void>((resolve) => setSimCheckout({ bureau, orderId: order.orderId, amount: order.amount, bureauName: order.bureauName, prefill: order.prefill, done: resolve }))
        return
      }
      const Razorpay = await loadRazorpayCheckout()
      if (!Razorpay) throw new Error('Unable to load Razorpay checkout. Check your connection and try again.')

      await new Promise<void>((resolve) => {
        const checkout = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'Score Now',
          description: `${order.bureauName} credit report`,
          image: '/scorenow-logo-hd.png',
          prefill: order.prefill,
          theme: { color: '#087af5' },
          handler: (payment: RazorpaySuccess) => { void verifyPayment(bureau, payment).finally(resolve) },
          modal: { ondismiss: () => resolve() },
        })
        checkout.on('payment.failed', (failure) => {
          const message = failure.error?.description || 'Payment failed. You have not been charged.'
          setNotice({ tone: 'error', text: message })
          void recordPaymentFailure(order.orderId, message)
        })
        checkout.open()
      })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to start the payment.' })
    } finally {
      setBusyBureau(null)
    }
  }

  const retryReport = async (report: BureauReport) => {
    setBusyBureau(report.bureau)
    setNotice({ tone: 'info', text: `Fetching your ${bureauName(report.bureau)} report…` })
    try {
      const response = await fetch(`${apiUrl}/api/reports/${report.request_id}/retry`, { method: 'POST', headers: authHeaders(user) })
      const result = await response.json() as DashboardStatus & { message?: string; providerDiagnostics?: ProviderDiagnostics | null }
      if (!response.ok) throw new Error(result.message || 'Unable to fetch the report.')
      if (result.providerDiagnostics) {
        setProviderDiagnostics((previous) => ({ ...previous, [report.bureau]: result.providerDiagnostics! }))
      }
      applyReportResult(result, report.bureau)
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to fetch the report.' })
    } finally {
      setBusyBureau(null)
    }
  }

  const scoreBandTone = (band: string | null) => {
    switch (band?.toLowerCase()) {
      case 'excellent': return 'excellent'
      case 'good': return 'good'
      case 'fair': return 'fair'
      case 'needs attention': return 'attention'
      default: return 'neutral'
    }
  }

  const loadDemoReport = async (bureau: BureauId) => {
    setBusyBureau(bureau)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/reports/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
        body: JSON.stringify({ bureau }),
      })
      const result = await response.json() as DashboardStatus & { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to load a demo report.')
      applyReportResult(result, bureau)
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to load a demo report.' })
    } finally {
      setBusyBureau(null)
    }
  }
  const scoreProgress = activeReport?.credit_score
    ? Math.max(0, Math.min(1, (activeReport.credit_score - 300) / 600))
    : 0.5
  const scoreMarkerPosition = {
    left: `${scoreProgress * 100}%`,
    top: `${(1 - Math.sin(Math.PI * scoreProgress)) * 100}%`,
  }

  return (
    <div className="dashboard-shell">
      <a className="dashboard-skip-link" href="#dashboard-main">Skip to dashboard content</a>
      <aside className="dashboard-sidebar">
        <Brand href="/" />
        <nav aria-label="Dashboard navigation">
          {sidebarItems.map(({ icon: Icon, label, href, external }) => (
            <Fragment key={label}>
              <a href={href} className={activeNav === href ? 'active' : ''} aria-current={activeNav === href ? 'page' : undefined} onClick={() => setActiveNav(href)}><Icon /><span>{label}</span>{!external && <ArrowRight />}</a>
              {label === 'Report insights' && <div className="dashboard-sidebar-subnav" aria-label="Report sections">
                {[
                  ['All accounts', activeReport ? '#credit-accounts' : '#credit-reports'],
                  ['Credit enquiries', activeReport ? '#credit-enquiries' : '#credit-reports'],
                  ['Payment history', activeReport ? '#payment-history' : '#credit-reports'],
                  ['Personal details', activeReport ? '#personal-details' : '#my-profile'],
                ].map(([section, target]) => <a href={target} key={section} onClick={() => setActiveNav(target)}>{section}</a>)}
              </div>}
            </Fragment>
          ))}
        </nav>
        <div className="dashboard-support">
          <span><MessageCircle /></span>
          <strong>Have questions?</strong>
          <p>Get expert support for your credit report, disputes, or loan options.</p>
          <a href="#help-support" onClick={() => setActiveNav('#help-support')}>Contact Support <ArrowRight /></a>
        </div>
      </aside>

      <main className="dashboard-main" id="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-page-heading"><span>Score Now <b>/</b> Credit workspace</span><strong>Your dashboard</strong></div>
          <div className="dashboard-top-actions">
            <span className="dashboard-updated">{activeReport ? <>Last updated <strong>{formatDate(activeReport.report_date)}</strong></> : 'Your credit workspace'}</span>
            <button className="dashboard-refresh-button" type="button" onClick={() => void loadStatus(true)} disabled={refreshing}>
              <RotateCcw className={refreshing ? 'spin' : ''} />{refreshing ? 'Refreshing…' : 'Refresh dashboard'}
            </button>
            <a className="dashboard-score-cta" href="#credit-reports">Get a credit report <ArrowRight /></a>
            <AuthAvatarButton user={user} onClick={() => undefined} onLogout={onLogout} />
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-welcome">
            <div><span className="dashboard-kicker">YOUR CREDIT WORKSPACE</span><h1>{greeting}, {firstName}! <span>👋</span></h1><p>{completedReports.length ? 'Your credit picture, with Score Now here to help you understand what comes next.' : 'Start with a report. We’ll help you understand it and guide you through what to do next.'}</p></div>
          </div>

          {notice && <p className={`dashboard-notice ${notice.tone}`} role="status">{notice.text}</p>}

          <section className="dashboard-grid dashboard-overview-grid" id="dashboard-overview">
            {activeReport
              ? <article className="dashboard-card score-card">
                  <div className="dashboard-card-heading score-card-header">
                    <strong>Your credit score</strong>
                    <span className="score-report-date"><Clock3 /> Updated {formatDate(activeReport.report_date)}{activeReport.is_demo ? ' · Sample' : ''}</span>
                  </div>
                  {completedReports.length > 1 && <div className="dashboard-bureau-tabs" role="tablist" aria-label="Choose a credit bureau">
                    {completedReports.map((report) => (
                      <button key={report.bureau} type="button" role="tab" aria-selected={report.bureau === activeBureau} className={report.bureau === activeBureau ? 'active' : ''} onClick={() => setSelectedBureau(report.bureau)}>
                        {bureauName(report.bureau)}
                      </button>
                    ))}
                  </div>}
                  <div className="score-card-body">
                    <div className={`dashboard-gauge score-band-${scoreBandTone(activeReport.score_band)}`} aria-label={`Credit score ${activeReport.credit_score ?? 'unavailable'} out of 900`}>
                      <div className="dashboard-gauge-track"><div className="dashboard-gauge-needle" style={scoreMarkerPosition} /></div>
                      <strong>{activeReport.credit_score ?? '—'}</strong>
                      <span className="gauge-min">300</span><span className="gauge-max">900</span>
                    </div>
                    <div className="dashboard-score-copy">
                      <span className={`score-status-label score-band-${scoreBandTone(activeReport.score_band)}`}>{activeReport.score_band || 'Score available'}</span>
                      <strong>{activeReport.overdue_accounts
                        ? `${activeReport.overdue_accounts} account${activeReport.overdue_accounts === 1 ? '' : 's'} need attention`
                        : activeReport.score_band?.toLowerCase().includes('needs attention')
                          ? 'Your score needs attention'
                          : 'Your credit score is ready'}</strong>
                      <p>{activeReport.overdue_accounts
                        ? 'Review your account details and payment history to see what may need action.'
                        : `Explore your ${bureauName(activeReport.bureau)} report and account details.`}</p>
                      <div className="score-card-actions">
                        <button className="dashboard-primary-action" type="button" onClick={() => void downloadActiveReport()} disabled={downloadingReport}>
                          <Download /> {downloadingReport ? 'Preparing report…' : 'Download my report'}
                        </button>
                        <a href="#my-report">Understand my report <ArrowRight /></a>
                      </div>
                      {downloadReportError && <p className="dashboard-notice error score-download-error" role="alert">{downloadReportError}</p>}
                    </div>
                  </div>
                </article>
              : <article className="dashboard-card empty-report-card">
                  <div className="empty-dashboard-state"><FileSearch /><strong>Your credit picture starts here</strong><span>Choose a bureau to securely request your report. We’ll help you understand the information and decide what to focus on.</span></div>
                </article>}
          </section>

          {activeReport && <section className="dashboard-metrics" aria-label="Credit report highlights">
            <article className="dashboard-card dashboard-metric"><span className="dashboard-metric-icon blue"><WalletCards /></span><div><small>Total accounts</small><strong>{activeReport.total_accounts ?? '—'}</strong><span>Listed on your report</span></div></article>
            <article className="dashboard-card dashboard-metric"><span className="dashboard-metric-icon green"><Check /></span><div><small>Active accounts</small><strong>{activeReport.active_accounts ?? '—'}</strong><span>Currently open</span></div></article>
            <article className="dashboard-card dashboard-metric"><span className="dashboard-metric-icon gold"><BadgeIndianRupee /></span><div><small>Outstanding balance</small><strong>{activeReport.total_outstanding === null ? '—' : formatMoney(Number(activeReport.total_outstanding))}</strong><span>Across reported accounts</span></div></article>
            <article className="dashboard-card dashboard-metric"><span className={`dashboard-metric-icon ${activeReport.overdue_accounts ? 'red' : 'green'}`}><AlertTriangle /></span><div><small>Overdue accounts</small><strong>{activeReport.overdue_accounts ?? '—'}</strong><span>As shown by {bureauName(activeReport.bureau)}</span></div></article>
          </section>}

          <section className="dashboard-card bureau-comparison" id="bureau-comparison">
            <div className="dashboard-card-heading">
              <strong><BarChart3 /> Compare your credit reports</strong>
              <small>Scores shown only for reports you’ve received</small>
            </div>
            <div className="bureau-comparison-scroll">
              <table>
                <thead><tr><th scope="col">Credit bureau</th>{bureauCatalog.map((bureau) => <th scope="col" key={bureau.id}><span>{bureau.name}</span></th>)}</tr></thead>
                <tbody>
                  <tr><th scope="row">Latest score</th>{bureauCatalog.map((bureau) => {
                    const report = reportFor(bureau.id)
                    return <td key={bureau.id}>{report?.status === 'completed' ? <button type="button" onClick={() => { setSelectedBureau(bureau.id); document.getElementById('dashboard-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{report.credit_score ?? '—'}</button> : <span>{report?.status === 'processing' ? 'Updating…' : '—'}</span>}</td>
                  })}</tr>
                  <tr><th scope="row">Report date</th>{bureauCatalog.map((bureau) => {
                    const report = reportFor(bureau.id)
                    return <td key={bureau.id}>{report?.status === 'completed' ? formatDate(report.report_date) : '—'}</td>
                  })}</tr>
                  <tr><th scope="row">Accounts</th>{bureauCatalog.map((bureau) => {
                    const report = reportFor(bureau.id)
                    return <td key={bureau.id}>{report?.status === 'completed' ? report.total_accounts ?? '—' : '—'}</td>
                  })}</tr>
                  <tr><th scope="row">Report status</th>{bureauCatalog.map((bureau) => {
                    const report = reportFor(bureau.id)
                    return <td key={bureau.id}><span className={`comparison-status ${report?.status === 'completed' ? 'ready' : report?.status === 'processing' ? 'pending' : report?.status === 'failed' ? 'failed' : ''}`}>{report?.status === 'completed' ? 'Ready' : report?.status === 'processing' ? 'Processing' : report?.status === 'failed' ? 'Unavailable' : 'Not requested'}</span></td>
                  })}</tr>
                </tbody>
              </table>
            </div>
            <a className="bureau-comparison-link" href="#credit-reports">Manage credit reports <ArrowRight /></a>
          </section>

          <section className="dashboard-card bureau-section" id="credit-reports">
            <div className="dashboard-card-heading"><strong>Your Credit Reports</strong><small><LockKeyhole /> ₹{price} per report · secure payment by Razorpay</small></div>
            <div className="bureau-grid">
              {bureauCatalog.map((bureau) => {
                const report = reportFor(bureau.id)
                const diagnostics = providerDiagnostics[bureau.id]
                const available = options?.bureaus.find((item) => item.id === bureau.id)?.available ?? false
                const busy = busyBureau === bureau.id
                const canBuy = available && Boolean(options?.paymentsEnabled) && !busyBureau && report?.status !== 'processing'
                return (
                  <article className={`bureau-card${activeBureau === bureau.id ? ' selected' : ''}`} key={bureau.id}>
                    <div className="bureau-card-heading">
                      <img src={bureau.logo} alt="" />
                      <strong>{bureau.name}</strong>
                      {activeBureau === bureau.id && <span className="bureau-selected-tag"><Check /> Selected</span>}
                    </div>
                    {report?.status === 'completed' ? <span className="bureau-status ready"><Check /> Report ready · {formatDate(report.report_date)}</span>
                      : report?.status === 'processing' ? <span className="bureau-status pending"><Clock3 /> Fetching report…</span>
                        : report?.status === 'failed' ? <span className="bureau-status failed"><AlertTriangle /> Report unavailable · retry at no extra charge</span>
                          : <span className="bureau-status">{available ? 'Not fetched yet' : 'Coming soon'}</span>}
                    <div className="bureau-actions">
                      {report?.status === 'completed' && <button type="button" className="button button-outline" onClick={() => { setSelectedBureau(bureau.id); document.getElementById('dashboard-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>View score</button>}
                      {report?.status === 'failed'
                        ? <button type="button" className="button button-primary" disabled={Boolean(busyBureau)} onClick={() => void retryReport(report)}>{busy ? 'Fetching…' : <>Retry free <RotateCcw /></>}</button>
                        : <button type="button" className="button button-primary" disabled={!canBuy} onClick={() => void buyReport(bureau.id)}>{busy ? 'Processing…' : report?.status === 'completed' ? `Refresh · ₹${price}` : `Get report · ₹${price}`}</button>}
                      {options?.demoMode && <button type="button" className="button button-outline" disabled={Boolean(busyBureau)} onClick={() => void loadDemoReport(bureau.id)}>Load demo</button>}
                    </div>
                    {diagnostics && <details className="bureau-diagnostics">
                      <summary>View API request and response</summary>
                      <p>Provider token is excluded. The request shows your report details.</p>
                      <strong>Request sent</strong>
                      <pre>{JSON.stringify(diagnostics.request, null, 2)}</pre>
                      <strong>Provider response</strong>
                      <pre>{JSON.stringify(diagnostics.response, null, 2)}</pre>
                    </details>}
                  </article>
                )
              })}
            </div>
            {options && !options.paymentsEnabled && <p className="bureau-note">Online payments are being set up. Please check back shortly.</p>}
          </section>

          {activeReport && <div id="my-report" className="dashboard-report-anchor"><ReportDetailView key={activeReport.request_id} user={user} requestId={activeReport.request_id} /></div>}

          <section className="dashboard-card learning-card" id="credit-learning">
            <div className="learning-heading">
              <div>
                <h2><BarChart3 /> Improve your credit</h2>
                <p>Explore quick guides to understand your credit better and take control of your financial future.</p>
              </div>
              <span className="learning-count">3 quick guides</span>
            </div>
            <div className="learning-guides">
              <article className="learning-guide blue">
                <div className="learning-guide-top"><span className="learning-guide-icon"><TrendingUp /></span><span className="learning-guide-time">5 min</span></div>
                <h3>5 Ways to Improve Your Credit Score</h3>
                <p>Simple tips to build a stronger credit profile.</p>
                <a href="/guides/improve-credit-score">Read guide <ArrowRight /></a>
                <TrendingUp className="learning-guide-art" aria-hidden="true" />
              </article>
              <article className="learning-guide green">
                <div className="learning-guide-top"><span className="learning-guide-icon"><Gauge /></span><span className="learning-guide-time">4 min</span></div>
                <h3>What is a Good Credit Score?</h3>
                <p>Understand score ranges and what they mean.</p>
                <a href="/guides/good-credit-score">Read guide <ArrowRight /></a>
                <Gauge className="learning-guide-art" aria-hidden="true" />
              </article>
              <article className="learning-guide amber">
                <div className="learning-guide-top"><span className="learning-guide-icon"><FileSearch /></span><span className="learning-guide-time">6 min</span></div>
                <h3>How Credit Enquiries Affect Your Score</h3>
                <p>Learn how to manage credit applications.</p>
                <a href="/guides/credit-enquiries">Read guide <ArrowRight /></a>
                <FileSearch className="learning-guide-art" aria-hidden="true" />
              </article>
            </div>
          </section>

          <section className="dashboard-account-grid">
            <article className="dashboard-card account-card" id="my-profile">
              <div className="dashboard-card-heading"><strong><UserRound /> My profile</strong><span className={`kyc-badge${status.profile.kyc_status === 'verified' ? ' verified' : ''}`}>{status.profile.kyc_status === 'verified' ? <><Check /> Verified</> : status.profile.kyc_status.replace(/_/g, ' ')}</span></div>
              <dl className="account-details">
                <dt>Account name</dt><dd>{user.full_name}</dd>
                <dt>Name as per PAN</dt><dd>{status.profile.name_as_per_pan}</dd>
                <dt>PAN</dt><dd>{status.profile.pan_last4 ? `••••••${status.profile.pan_last4}` : '—'}</dd>
                <dt>Date of birth</dt><dd>{formatDate(status.profile.date_of_birth?.slice(0, 10))}</dd>
                <dt>Location</dt><dd>{[status.profile.city, status.profile.state].filter(Boolean).join(', ') || '—'}</dd>
                <dt>Mobile</dt><dd>{user.mobile ? `+91 ${user.mobile}` : '—'}</dd>
                <dt>Email</dt><dd>{user.email || '—'}</dd>
              </dl>
              <p className="account-note"><ShieldCheck /> Your PAN is stored encrypted. Only the last four characters are shown.</p>
            </article>

            <article className="dashboard-card account-card" id="settings">
              <div className="dashboard-card-heading"><strong><Settings /> Settings</strong></div>
              <ul className="settings-list">
                <li><span><Smartphone /></span><div><strong>Sign-in method</strong><small>{user.mobile ? `Mobile OTP · +91 ${user.mobile}` : user.email ? `Email · ${user.email}` : 'Score Now account'}</small></div></li>
                <li><span><FileCheck2 /></span><div><strong>Update profile details</strong><small>To correct your PAN, name, or date of birth, contact our support team so the change can be verified.</small></div><a href="mailto:info@scorenow.in?subject=Profile%20update%20request">Request <ArrowRight /></a></li>
                <li><span><LockKeyhole /></span><div><strong>Data &amp; privacy</strong><small>Your details are shared only with the credit bureau you choose when fetching a report.</small></div></li>
              </ul>
              <button type="button" className="button button-outline account-logout" onClick={onLogout}>Log out <ArrowRight /></button>
            </article>
          </section>

          <section className="dashboard-card help-card" id="help-support">
            <div className="dashboard-card-heading"><strong><CircleHelp /> Help &amp; support</strong><small>Mon–Sat · 10 AM – 7 PM</small></div>
            <form className="customer-ticket-form" onSubmit={(event) => void submitSupportTicket(event)}>
              <h3>Send a message to our support team</h3>
              <label>What do you need help with?<input name="subject" minLength={3} maxLength={180} placeholder="Briefly describe your issue" required /></label>
              <label>Message<textarea name="message" rows={4} minLength={3} maxLength={4000} placeholder="Include details that will help us resolve this for you." required /></label>
              {supportError && <p className="dashboard-notice error" role="alert">{supportError}</p>}
              {supportNotice && <p className="dashboard-notice info" role="status">{supportNotice}</p>}
              <button type="submit" className="button button-primary" disabled={supportSubmitting}>{supportSubmitting ? <><RotateCcw className="spin" /> Sending…</> : <>Submit support ticket <ArrowRight /></>}</button>
            </form>
            <div className="customer-ticket-section">
              <div className="customer-ticket-heading"><h3>Your support tickets</h3><button type="button" className="button button-outline" onClick={() => { setSupportLoading(true); setSupportRefresh((refresh) => refresh + 1) }} disabled={supportLoading}><RotateCcw /> Refresh</button></div>
              {supportLoading && <div className="customer-ticket-loading" role="status"><RotateCcw className="spin" /> Loading your tickets…</div>}
              {!supportLoading && supportTickets.length === 0 && <p className="customer-ticket-empty">Your submitted support requests will appear here.</p>}
              <div className="customer-ticket-list">
                {supportTickets.map((ticket) => <article className="customer-ticket" key={ticket.id}>
                  <div className="customer-ticket-top"><div><strong>{ticket.subject}</strong><span className={`admin-status ${ticket.status === 'resolved' || ticket.status === 'closed' ? 'completed' : 'pending'}`}>{ticket.status.replace('_', ' ')}</span></div><time>{formatAdminTimestamp(ticket.updated_at)}</time></div>
                  <p className="customer-ticket-original">{ticket.message}</p>
                  {ticket.comments.length > 0 && <div className="customer-ticket-comments" aria-label="Ticket conversation">
                    {ticket.comments.map((comment) => <div className={`customer-ticket-comment ${comment.author_type}`} key={comment.id}><div><strong>{comment.author_type === 'admin' ? 'Score Now support' : 'You'}</strong><time>{formatAdminTimestamp(comment.created_at)}</time></div><p>{comment.message}</p></div>)}
                  </div>}
                  {ticket.status !== 'closed' && <form className="customer-ticket-reply" onSubmit={(event) => void replyToSupportTicket(event, ticket.id)}>
                    <label className="sr-only" htmlFor={`customer-ticket-reply-${ticket.id}`}>Reply to {ticket.subject}</label>
                    <input id={`customer-ticket-reply-${ticket.id}`} name="message" maxLength={4000} placeholder="Add a reply…" required />
                    <button className="button button-outline" type="submit" disabled={supportReplying === ticket.id}>{supportReplying === ticket.id ? 'Sending…' : 'Reply'}</button>
                  </form>}
                </article>)}
              </div>
            </div>
            <div className="help-options">
              <button type="button" className="help-option" onClick={() => window.dispatchEvent(new Event(openChatEvent))}><MessageCircle /><span><strong>Chat with Neha</strong><small>Get a quick suggested next step</small></span><ArrowRight /></button>
              <a className="help-option" href="https://wa.me/919114141011?text=Hello%20Score%20Now%2C%20I%20need%20help%20with%20my%20credit%20report." target="_blank" rel="noreferrer"><MessageCircle /><span><strong>WhatsApp</strong><small>+91 91141 41011</small></span><ArrowRight /></a>
              <a className="help-option" href="tel:+919114141011"><Phone /><span><strong>Call an expert</strong><small>+91 91141 41011</small></span><ArrowRight /></a>
              <a className="help-option" href="mailto:info@scorenow.in"><Mail /><span><strong>Email us</strong><small>info@scorenow.in</small></span><ArrowRight /></a>
            </div>
          </section>
        </div>
      </main>
      {simCheckout && <SimulatedCheckout
        checkout={simCheckout}
        onDismiss={() => { simCheckout.done(); setSimCheckout(null) }}
        onApprove={() => {
          const current = simCheckout
          setSimCheckout(null)
          void verifyPayment(current.bureau, { razorpay_order_id: current.orderId, razorpay_payment_id: '', razorpay_signature: '' }).finally(current.done)
        }}
      />}
    </div>
  )
}

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const { user, logout, requireLogin, openAuth, authModal } = useLoginGate({ redirectAfterLogin: '/dashboard' })

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (document.visibilityState === 'hidden') {
      elements.forEach((element) => element.classList.add('is-revealed'))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -55px' })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="nav-wrap">
          <Brand href="/" />
          <div className="nav-right">
            <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
              <a className="active" href="#home" onClick={closeMenu}>Home</a>
              <a href="#insights" onClick={closeMenu}>Credit Score</a>
              <a href="#services" onClick={closeMenu}>Services <ChevronDown /></a>
              <a href="#plans" onClick={closeMenu}>Plans</a>
              <a href="#subscription" onClick={closeMenu}>Subscription</a>
              <a href="/business" onClick={closeMenu}>For Businesses</a>
              <a href="#about" onClick={closeMenu}>About Us</a>
              <a href="#contact" onClick={closeMenu}>Contact</a>
              <a className="button button-primary nav-cta" href="#personal-assessment" onClick={closeMenu}>Free Assessment <ArrowRight /></a>
            </nav>
            <AuthAvatarButton user={user} onClick={openAuth} onLogout={logout} />
            <button className="menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-pattern" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow-pill"><ShieldCheck /> India's Credit Score Improvement Platform</div>
              <h1>Your Better <span>Credit Score</span> Starts Here.</h1>
              <p className="hero-lede">Check, understand and improve your credit with expert guidance. Take control of your financial future.</p>
              <div className="benefit-grid">
                <div><span className="mini-icon green"><LockKeyhole /></span><strong>Secure &amp;<br />Private</strong></div>
                <div><span className="mini-icon gold"><Zap /></span><strong>Fast &amp;<br />Simple</strong></div>
                <div><span className="mini-icon violet"><FileCheck2 /></span><strong>Detailed<br />Report</strong></div>
                <div><span className="mini-icon blue"><Users /></span><strong>Expert<br />Guidance</strong></div>
              </div>
              <div className="hero-actions">
                <a className="button button-outline" href="#contact"><Headphones /> Talk to an Expert <ArrowRight /></a>
                <a className="text-link" href="#how-it-works">View How It Works <ArrowRight /></a>
                <a className="text-link" href="#score-estimator">Estimate My Score <ArrowRight /></a>
              </div>
              <p className="safe-note"><ShieldCheck /> Your data is 100% safe &amp; confidential</p>
            </div>

            <div className="hero-visual" id="score" aria-label="Example Score Now mobile dashboard">
              <div className="floating-card growth-card"><BarChart3 /><span><strong>+42 points</strong> in 6 months</span></div>
              <div className="floating-card approval-card"><BadgeIndianRupee /><span><strong>Better loan</strong> approval chances</span></div>
              <div className="phone">
                <div className="phone-top" />
                <div className="phone-screen">
                  <div className="phone-brand"><ShieldCheck /><strong>Scorenow</strong><Menu /></div>
                  <p>Your Credit Score</p><ScoreGauge /><small>Last updated: 10 Apr, 2024</small>
                  <button type="button">Improve Your Score</button>
                  <div className="score-list">
                    <div><span className="list-icon green"><Check /></span><p><strong>Payment History</strong><small>100% on-time payments</small></p><b>Excellent</b></div>
                    <div><span className="list-icon gold"><BarChart3 /></span><p><strong>Credit Usage</strong><small>42% of credit limit</small></p><b>Good</b></div>
                    <div><span className="list-icon blue"><Clock3 /></span><p><strong>Credit Age</strong><small>6 years 4 months</small></p><b>Good</b></div>
                    <div><span className="list-icon green"><WalletCards /></span><p><strong>Account Mix</strong><small>8 active accounts</small></p><b>Good</b></div>
                  </div>
                </div>
              </div>
              <div className="loan-card"><strong>Multiple Loan Options</strong><span><House /> Home Loan</span><span><CreditCard /> Credit Card</span><span><BadgeIndianRupee /> Personal Loan</span></div>
            </div>
          </div>
        </section>

        <ImpactStats />

        <AssessmentPathways />

        <AssessmentForm user={user} requireLogin={requireLogin} />

        <section className="insights-section section reveal-section" id="insights" data-reveal>
          <div className="container split-grid">
            <div className="section-copy">
              <p className="section-kicker">Your Credit Insights</p><h2>We Analyse Your <span>Credit Report</span></h2>
              <div className="feature-list">{insights.map((item) => <FeatureRow key={item.title} {...item} />)}</div>
            </div>
            <div className="report-card-wrap">
              <div className="report-card">
                <div className="report-heading"><h3>Your Credit Score</h3><small>Updated: 10 Apr, 2024</small></div>
                <ScoreGauge score={728} />
                <div className="factor-panel">
                  <div className="factor-title"><strong>Key Factors</strong><a href="#resources">View Full Report <ArrowRight /></a></div>
                  <div className="factor-grid">
                    <div><CreditCard /><strong>100%</strong><span>Payment History</span></div>
                    <div><BarChart3 /><strong>62%</strong><span>Credit Utilisation</span></div>
                    <div><CalendarDays /><strong>4 yrs</strong><span>Credit Age</span></div>
                    <div><FileCheck2 /><strong>3</strong><span>Recent Enquiries</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <CreditJourney />

        <CreditScoreEstimator />

        <section className="services-section section reveal-section" id="services" data-reveal>
          <div className="container service-heading"><p className="section-kicker">Everything In One Place</p><h2>Build Better Credit With <span>Expert Support</span></h2><p>Simple tools, actionable insights, and human guidance at every step.</p></div>
          <div className="container service-grid">
            <article><span className="service-icon blue"><FileSearch /></span><h3>Credit Report Review</h3><p>Understand every part of your report and identify what needs attention.</p><details><summary>What's included <ChevronDown /></summary><ul><li>Credit account summary</li><li>Enquiry and repayment review</li><li>Error and discrepancy identification</li></ul></details></article>
            <article><span className="service-icon green"><TrendingUp /></span><h3>Score Improvement</h3><p>Follow a focused action plan designed around your unique credit profile.</p><details><summary>What's included <ChevronDown /></summary><ul><li>Personal improvement roadmap</li><li>Credit utilisation guidance</li><li>Progress checkpoints</li></ul></details></article>
            <article><span className="service-icon gold"><CircleHelp /></span><h3>Expert Consultation</h3><p>Get clear answers and personal support from experienced credit experts.</p><details><summary>What's included <ChevronDown /></summary><ul><li>One-to-one consultation</li><li>Clear answers to report questions</li><li>Next-step recommendations</li></ul></details></article>
          </div>
        </section>

        <PlansSection />

        <section className="business-section section reveal-section" id="resources" data-reveal>
          <div className="container split-grid business-grid">
            <div className="business-visual">
              <div className="business-report">
                <div className="report-heading"><div><h3>Commercial CIBIL Report</h3><small>Your Business Credit Health</small></div><span>CMR</span></div>
                <ScoreGauge score={728} />
                <div className="business-status"><div><CreditCard /><span>Payment Behaviour</span><b>Good</b></div><div><BarChart3 /><span>Credit Exposure</span><b>Moderate</b></div><div><ShieldCheck /><span>Lender Confidence</span><b>High</b></div></div>
                <div className="business-factors"><div><Building2 /><strong>Business Details</strong><small>Verified</small></div><div><FileCheck2 /><strong>Trade Lines</strong><small>12 Accounts</small></div><div><Clock3 /><strong>Payment History</strong><small>On Time</small></div></div>
              </div>
            </div>
            <div className="section-copy business-copy">
              <p className="section-kicker">For Businesses</p><h2>Commercial CIBIL Report <span>Correction (CMR)</span></h2>
              <p className="section-lede">We analyse your commercial CIBIL report, identify errors and help get them corrected so your business credit profile reflects your financial standing.</p>
              <div className="feature-list compact">{businessBenefits.map((item) => <FeatureRow key={item.title} {...item} />)}</div>
              <a className="button button-primary" href="/business#business-assessment">Check Your CMR <ArrowRight /></a>
            </div>
          </div>
        </section>

        <section className="about-section section reveal-section" id="about" data-reveal>
          <div className="container about-grid">
            <div><p className="section-kicker">About Score Now</p><h2>Credit guidance that stays <span>clear and practical.</span></h2></div>
            <div className="about-copy"><p>Score Now helps individuals and businesses understand credit reports, identify areas that need attention, and take informed steps toward a healthier credit profile.</p><p>We focus on transparent guidance, data privacy, and practical actions. Credit outcomes depend on each person's report and financial behaviour, so we never promise instant or guaranteed score changes.</p><a className="text-link" href="#contact">Speak with our team <ArrowRight /></a></div>
          </div>
        </section>

        <section className="partner-opportunity section reveal-section" id="partner-opportunity" data-reveal>
          <div className="container">
            <div className="partner-opportunity-heading">
              <p className="section-kicker">Grow with Score Now</p>
              <h2>Want to become our <span>partner?</span></h2>
              <p>Bring credit guidance closer to people in your city. Talk with us about a franchise-style partnership and how we could work together in your area.</p>
            </div>
            <div className="partner-opportunity-grid">
              <article><span><MapPin /></span><h3>Make it local</h3><p>Build relationships and connect with customers in your community.</p></article>
              <article><span><Users /></span><h3>Help more people</h3><p>Introduce individuals and businesses to practical credit support.</p></article>
              <article><span><Handshake /></span><h3>Explore partnership</h3><p>Discuss the opportunity, local fit, and possible next steps with our team.</p></article>
            </div>
            <a className="button button-primary partner-opportunity-cta" href={`https://wa.me/919114141011?text=${encodeURIComponent('Hello Score Now, I am interested in becoming a partner in my city. Please share more about the franchise-style partnership opportunity.')}`} target="_blank" rel="noreferrer">
              <MessageCircle /> Discuss a Partnership <ArrowRight />
            </a>
          </div>
        </section>

        <section className="cta-section reveal-section" id="contact" data-reveal>
          <div className="container cta-inner">
            <div className="contact-copy"><p className="section-kicker">Contact Us</p><h2>Talk to a Score Now expert</h2><p>Choose the contact method that works best for you. Our team will help you understand the next steps.</p></div>
            <div className="contact-options">
              <a className="contact-option whatsapp" href="https://wa.me/919114141011?text=Hello%20Score%20Now%2C%20I%20would%20like%20help%20with%20my%20credit%20score." target="_blank" rel="noreferrer"><MessageCircle /><span><small>Chat on WhatsApp</small><strong>+91 91141 41011</strong></span><ArrowRight /></a>
              <a className="contact-option" href="tel:+919114141011"><Phone /><span><small>Call our expert</small><strong>+91 91141 41011</strong></span><ArrowRight /></a>
              <a className="contact-option" href="mailto:info@scorenow.in"><Mail /><span><small>Send us an email</small><strong>info@scorenow.in</strong></span><ArrowRight /></a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-grid"><div><Brand /><p>Clear guidance for a stronger financial future.</p></div><div><strong>Company</strong><a href="#about">About Us</a><a href="#partner-opportunity">Partner with us</a><a href="#contact">Contact</a></div><div><strong>Services</strong><a href="#insights">Credit Report</a><a href="#services">Score Improvement</a></div><div><strong>Reach Us</strong><a href="tel:+919114141011">+91 91141 41011</a><a href="mailto:info@scorenow.in">info@scorenow.in</a></div><AppDownload /></div>
        <div className="container footer-bottom"><span>© 2026 Score Now. All rights reserved.</span><span>Privacy Policy · Terms of Use</span></div>
      </footer>
      <ChatAssistant requireLogin={requireLogin} />
      {authModal}
    </div>
  )
}

function BusinessPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout, requireLogin, openAuth, authModal } = useLoginGate()
  const businessMessage = encodeURIComponent('Hello Score Now, I would like to discuss the Business CMR Improvement Programme.')
  const shieldMessage = encodeURIComponent('Hello Score Now, I would like to discuss the Credit Shield 360 annual business membership.')

  return (
    <div className="site-shell business-page">
      <header className="site-header">
        <div className="nav-wrap">
          <Brand href="/" />
          <div className="nav-right">
            <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Business navigation">
              <a href="/">Home</a><a href="/#personal-assessment">For Individuals</a><a className="active" href="/business">For Businesses</a><a href="#business-plans">Business Plans</a><a href="/#about">About Us</a><a href="/#contact">Contact</a><a className="button button-primary nav-cta" href="#business-assessment">Free Assessment <ArrowRight /></a>
            </nav>
            <AuthAvatarButton user={user} onClick={openAuth} onLogout={logout} />
            <button className="menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
      </header>
      <main>
        <section className="business-page-hero">
          <div className="container business-page-grid">
            <div><p className="section-kicker">Commercial Credit Guidance</p><h1>Build a Stronger <span>Business Credit Profile</span></h1><p>Understand your CMR, identify lender-reported issues, and prepare your business for healthier funding conversations.</p><div className="hero-actions"><a className="button button-primary" href="#business-assessment">Check CMR Health <ArrowRight /></a><a className="button button-outline" href={`https://wa.me/919114141011?text=${businessMessage}`} target="_blank" rel="noreferrer"><MessageCircle /> Talk to an Expert</a></div><div className="business-trust"><span><ShieldCheck /> Secure handling</span><span><FileSearch /> Detailed CMR review</span><span><Headphones /> Expert support</span></div></div>
            <div className="business-hero-visual"><div className="business-dashboard"><div><Building2 /><span><small>Business credit health</small><strong>CMR 3</strong></span></div><ul><li><span>Payment behaviour</span><b>Strong</b></li><li><span>Credit exposure</span><b>Review</b></li><li><span>Trade lines</span><b>12 active</b></li><li><span>Lender confidence</span><b>Improving</b></li></ul><div className="business-rise"><BarChart3 /><span>Clearer profile. Better funding readiness.</span></div></div></div>
          </div>
        </section>

        <AssessmentForm business user={user} requireLogin={requireLogin} />

        <section className="business-plans-section section" id="business-plans">
          <div className="container plans-heading"><p className="section-kicker">Business Credit Plans</p><h2>CMR Support Built for <span>Growing Businesses</span></h2><p>Choose a structured improvement programme or request a custom advisory scope for complex profiles.</p></div>
          <div className="container business-plan-grid">
            <article className="business-plan-featured"><span className="popular-label"><Star /> CMR Programme</span><span className="business-discount">35% OFF</span><div className="business-plan-heading"><div><small>Six-month programme</small><h3>Business CMR Improvement</h3><p>Credit counselling, issue-resolution guidance, and CMR improvement support for funding readiness.</p></div><div><span>Launch offer</span><del>₹47,999 + GST</del><strong>₹31,199.35 <small>+ GST</small></strong><a className="button button-primary" href={`https://wa.me/919114141011?text=${businessMessage}`} target="_blank" rel="noreferrer">Choose CMR Plan <ArrowRight /></a></div></div><div className="business-plan-details"><div><h4>What’s included</h4><ul><li><Check />12 credit counselling sessions</li><li><Check />6 report reviews during programme</li><li><Check />Commercial report analysis</li><li><Check />Error identification guidance</li></ul></div><div><h4>Dedicated support</h4><ul><li><Check />Issue-resolution roadmap</li><li><Check />Senior credit expert access</li><li><Check />CMR improvement programme</li><li><Check />Financial health check</li></ul></div></div></article>
            <article className="enterprise-plan"><span className="business-discount">35% OFF</span><span><ShieldCheck /></span><small>12-month membership</small><h3>Credit Shield 360°</h3><p>Continuous business and promoter credit monitoring designed to keep your company funding-ready throughout the year.</p><ul><li><Check />Commercial credit monitoring</li><li><Check />Monthly CMR tracking and alerts</li><li><Check />Director and partner credit monitoring</li><li><Check />Quarterly credit health reviews</li><li><Check />Dedicated senior credit expert</li><li><Check />Funding readiness assessment</li></ul><div className="enterprise-price"><del>₹99,999 + GST onwards</del><strong>₹64,999.35 <small>+ GST onwards</small></strong></div><a className="button button-outline" href={`https://wa.me/919114141011?text=${shieldMessage}`} target="_blank" rel="noreferrer">Choose Credit Shield <ArrowRight /></a></article>
          </div>
        </section>

        <section className="business-confidence section">
          <div className="container"><p className="section-kicker">Why Score Now</p><h2>Practical Support for <span>Commercial Credit</span></h2><div className="confidence-grid"><div><ShieldCheck /><strong>Privacy first</strong><span>Business and report details are handled carefully.</span></div><div><FileSearch /><strong>Thorough review</strong><span>We examine payment behaviour, exposure, and trade lines.</span></div><div><Users /><strong>Human guidance</strong><span>Understand each issue with clear expert support.</span></div><div><TrendingUp /><strong>Actionable roadmap</strong><span>Prioritised next steps aligned to funding readiness.</span></div></div></div>
        </section>
      </main>
      <footer><div className="container footer-grid"><div><Brand href="/" /><p>Clear guidance for a stronger financial future.</p></div><div><strong>Explore</strong><a href="/">Individuals</a><a href="/business">Businesses</a></div><div><strong>Business</strong><a href="#business-assessment">Assessment</a><a href="#business-plans">Plans</a></div><div><strong>Reach Us</strong><a href="tel:+919114141011">+91 91141 41011</a><a href="mailto:info@scorenow.in">info@scorenow.in</a></div><AppDownload /></div><div className="container footer-bottom"><span>© 2026 Score Now. All rights reserved.</span><span>Privacy Policy · Terms of Use</span></div></footer>
      <ChatAssistant requireLogin={requireLogin} />
      {authModal}
    </div>
  )
}

function DashboardRoute() {
  const { user, logout, requireLogin, authModal } = useLoginGate({ promptOnScroll: false })
  useEffect(() => { if (!user) window.location.replace('/') }, [user])
  if (!user) return null
  return <>
    <DashboardPage user={user} onLogout={logout} />
    <ChatAssistant requireLogin={requireLogin} isDashboard />
    {authModal}
  </>
}

type CibilReportResponse = {
  status?: boolean
  txn_id?: string
  txn_status?: string
  message?: string
  data?: { data?: { htmlUrl?: string; cibilData?: unknown } }
}

function CreditScorePage() {
  const { requireLogin, authModal } = useLoginGate({ promptOnScroll: false })
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<CibilReportResponse | null>(null)
  const [reportHttpOk, setReportHttpOk] = useState<boolean | null>(null)

  const unlockPage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setAccessError('')
    try {
      const response = await fetch(`${apiUrl}/api/cibil-report/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const result = await response.json() as { message?: string; access?: boolean }
      if (!response.ok) throw new Error(result.message || 'Unable to verify the PIN.')
      setUnlocked(Boolean(result.access))
    } catch (unlockError) {
      setAccessError(unlockError instanceof Error ? unlockError.message : 'Unable to verify the PIN.')
    } finally {
      setLoading(false)
    }
  }

  const requestReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setReport(null)
    setReportHttpOk(null)
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${apiUrl}/api/cibil-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          first_name: data.get('first_name'),
          last_name: data.get('last_name'),
          id_number: data.get('id_number'),
          street_address: data.get('street_address'),
          city: data.get('city'),
          postal_code: data.get('postal_code'),
          region: data.get('region'),
          email: data.get('email'),
          phone: data.get('phone'),
          dob: data.get('dob'),
          gender: data.get('gender'),
          user_consent_data_share: data.get('consent') === 'on',
        }),
      })
      const result = await response.json() as CibilReportResponse
      setReport(result)
      setReportHttpOk(response.ok)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The report request could not be completed.')
    } finally {
      setLoading(false)
    }
  }

  const reportFailed = reportHttpOk === false || report?.status === false || /failed|error|declin/i.test(report?.txn_status || '')

  return (
    <main className="cibil-page">
      <header className="cibil-header"><Brand href="/" /><a href="/" aria-label="Return to Score Now"><ArrowLeft /> Home</a></header>
      <div className="cibil-layout">
        <section className="cibil-intro">
          <span className="cibil-kicker"><ShieldCheck /> Secure credit report request</span>
          <h1>Get your <span>CIBIL report</span></h1>
          <p>Enter the report details as they appear on your identity and address records. Your consent is required before data is shared with the report provider.</p>
          <div className="cibil-note"><LockKeyhole /><span><strong>Protected access</strong><small>Personal and identity details are sent securely to the provider.</small></span></div>
        </section>

        {!unlocked ? (
          <form className="cibil-panel cibil-pin-panel" onSubmit={unlockPage}>
            <span className="cibil-panel-icon"><LockKeyhole /></span>
            <h2>Enter access PIN</h2>
            <p>This page is restricted to authorised use.</p>
            <label><span>PIN</span><input type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={(event) => setPin(event.target.value)} required aria-label="Access PIN" /></label>
            {accessError && <p className="cibil-error" role="alert">{accessError}</p>}
            <button className="cibil-submit" type="submit" disabled={loading}>{loading ? 'Checking…' : <>Unlock page <ArrowRight /></>}</button>
          </form>
        ) : (
          <form className="cibil-panel cibil-request-form" onSubmit={requestReport}>
            <div className="cibil-form-heading"><div><span className="cibil-kicker">PERSONAL DETAILS</span><h2>Request a report</h2></div><button className="cibil-lock-button" type="button" onClick={() => { setUnlocked(false); setPin(''); setReport(null) }} aria-label="Lock this page"><LockKeyhole /></button></div>
            <div className="cibil-fields">
              <label><span>First name *</span><input name="first_name" required autoComplete="given-name" /></label>
              <label><span>Last name *</span><input name="last_name" required autoComplete="family-name" /></label>
              <label><span>PAN number *</span><input name="id_number" required pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" maxLength={10} placeholder="ABCDE1234F" autoCapitalize="characters" /></label>
              <label><span>Date of birth *</span><input name="dob" type="date" required /></label>
              <label><span>Gender *</span><select name="gender" defaultValue="" required><option value="" disabled>Select gender</option><option>Male</option><option>Female</option></select></label>
              <label><span>Email *</span><input name="email" type="email" required autoComplete="email" /></label>
              <label><span>Phone *</span><input name="phone" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required autoComplete="tel-national" /></label>
              <label className="cibil-wide"><span>Street address *</span><input name="street_address" required autoComplete="street-address" /></label>
              <label><span>City *</span><input name="city" required autoComplete="address-level2" /></label>
              <label><span>Postal code *</span><input name="postal_code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="postal-code" /></label>
              <label className="cibil-wide"><span>Region code *</span><input name="region" inputMode="numeric" pattern="[0-9]+" placeholder="For example: 28" required /></label>
            </div>
            <label className="cibil-consent"><input type="checkbox" name="consent" required /><span>I consent to sharing these details with the CIBIL report provider to generate my credit report.</span></label>
            {error && <p className="cibil-error" role="alert">{error}</p>}
            <button className="cibil-submit" type="submit" disabled={loading}>{loading ? 'Requesting report…' : <>Generate CIBIL report <ArrowRight /></>}</button>
          </form>
        )}

        {report && <section className="cibil-result" aria-live="polite">
          <div className="cibil-result-heading"><span className={reportFailed ? 'is-error' : ''}>{reportFailed ? <AlertTriangle /> : <Check />}</span><div><small>PROVIDER RESPONSE</small><h2>{report.message || (reportFailed ? 'Report request failed' : 'Report request received')}</h2></div></div>
          <dl><div><dt>Transaction ID</dt><dd>{report.txn_id || 'Not provided'}</dd></div><div><dt>Status</dt><dd>{report.txn_status || (reportFailed ? 'Failed' : report.status ? 'Success' : 'Received')}</dd></div></dl>
          {!reportFailed && report.data?.data?.htmlUrl && <a className="cibil-report-link" href={report.data.data.htmlUrl} target="_blank" rel="noreferrer"><FileCheck2 /> Open CIBIL report <ArrowRight /></a>}
          <details className="cibil-raw-response"><summary>View full API response</summary><pre>{JSON.stringify(report, null, 2)}</pre></details>
        </section>}
      </div>
      <footer className="cibil-footer">Score Now <span>·</span> Handle credit and identity data responsibly.</footer>
      <ChatAssistant requireLogin={requireLogin} />
      {authModal}
    </main>
  )
}

type AdminRole = 'owner' | 'manager' | 'support' | 'analyst'

type AdminActivity = {
  summary: {
    totalUsers: number
    paidPayments: number
    paymentRevenue: number
    failedPayments: number
    reportRequests: number
    failedReportRequests: number
  }
  payments: {
    id: string
    full_name: string
    mobile_last4: string
    bureau: BureauId | null
    amount: string | number
    gst_amount: string | number
    gateway: string
    status: string
    failure_reason: string | null
    created_at: string
    paid_at: string | null
    failure_at: string | null
    report_status: string | null
    report_failure_reason: string | null
  }[]
  adminReports: {
    id: string
    full_name: string | null
    mobile_last4: string
    bureau: BureauId
    status: string
    credit_score: number | null
    failure_reason: string | null
    admin_id: string
    created_at: string
    completed_at: string | null
  }[]
  pagination: {
    page: number
    pageSize: number
    totalPayments: number
    totalAdminReports: number
  }
}

type AdminCustomer = {
  id: string
  full_name: string
  mobile: string
  email: string | null
  status: string
  created_at: string
  pan_last4: string | null
  kyc_status: string | null
  total_payments: string
  paid_payments: string
  latest_report_status: string | null
  last_login: string | null
  journey_stage: string
}

type AdminTicket = SupportTicket

type AdminAnalytics = {
  summary: Record<string, number>
  trend: { day: string; signups: number; paid_orders: number; revenue: number; failed_attempts: number }[]
  funnel: { step: string; count: number }[]
}

type AdminTeamMember = { email: string; full_name: string; role: string; status: string; created_at: string }

type AdminCustomerInvitation = { id: string; full_name: string; mobile: string; email: string | null; status: string; created_at: string }

const formatAdminTimestamp = (value: string | null) => value
  ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  : '—'

function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('scorenow-admin-token') || '')
  const [adminId, setAdminId] = useState('')
  const [adminRole, setAdminRole] = useState<'owner' | 'manager' | 'support' | 'analyst'>('owner')
  const [activeSection, setActiveSection] = useState<'overview' | 'customers' | 'reports' | 'analytics' | 'tickets' | 'journey' | 'team'>('overview')
  const [authState, setAuthState] = useState<'checking' | 'signed-out' | 'signed-in'>(token ? 'checking' : 'signed-out')
  const [loginError, setLoginError] = useState('')
  const [reportError, setReportError] = useState('')
  const [reportPdfError, setReportPdfError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportPdfLoadingId, setReportPdfLoadingId] = useState('')
  const [bureau, setBureau] = useState<BureauId>('cibil')
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [reportAuditId, setReportAuditId] = useState('')
  const [activity, setActivity] = useState<AdminActivity | null>(null)
  const [activityError, setActivityError] = useState('')
  const [activityLoading, setActivityLoading] = useState(true)
  const [activitySearch, setActivitySearch] = useState('')
  const [activityRefresh, setActivityRefresh] = useState(0)
  const [activityPage, setActivityPage] = useState(1)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerPage, setCustomerPage] = useState(1)
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [customerTotal, setCustomerTotal] = useState(0)
  const [manualChecks, setManualChecks] = useState<AdminActivity['adminReports']>([])
  const [customerInvitations, setCustomerInvitations] = useState<AdminCustomerInvitation[]>([])
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [team, setTeam] = useState<AdminTeamMember[]>([])
  const [primaryAdmin, setPrimaryAdmin] = useState<string | null>(null)
  const [sectionError, setSectionError] = useState('')
  const [sectionRefresh, setSectionRefresh] = useState(0)
  const [ticketStatus, setTicketStatus] = useState('open')
  const [inviteUrl, setInviteUrl] = useState('')
  const [teamInviteToken, setTeamInviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite') || '')
  const [teamNotice, setTeamNotice] = useState('')
  const [sectionLoading, setSectionLoading] = useState(true)

  const refreshActivity = () => {
    setActivityLoading(true)
    setActivityError('')
    setActivityRefresh((refresh) => refresh + 1)
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`${apiUrl}/api/admin/session`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const result = await response.json() as { adminId?: string; role?: AdminRole }
        if (!response.ok) throw new Error('Admin session expired. Sign in again.')
        if (!cancelled) {
          setAdminId(result.adminId || 'Admin')
          setAdminRole(result.role || 'owner')
          setActiveSection(result.role === 'support' ? 'customers' : result.role === 'analyst' ? 'analytics' : 'overview')
          setAuthState('signed-in')
        }
      })
      .catch(() => {
        sessionStorage.removeItem('scorenow-admin-token')
        if (!cancelled) {
          setToken('')
          setAuthState('signed-out')
        }
      })
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    if (authState !== 'signed-in' || !token || !['owner', 'manager'].includes(adminRole)) return
    let cancelled = false
    fetch(`${apiUrl}/api/admin/activity?page=${activityPage}`, { headers: { Authorization: 'Bearer ' + token } })
      .then(async (response) => {
        const result = await response.json() as AdminActivity & { message?: string }
        if (response.status === 401) {
          sessionStorage.removeItem('scorenow-admin-token')
          if (!cancelled) {
            setToken('')
            setAuthState('signed-out')
          }
          throw new Error('Admin session expired. Sign in again.')
        }
        if (!response.ok) throw new Error(result.message || 'Unable to load admin activity.')
        if (!cancelled) setActivity(result)
      })
      .catch((error: unknown) => {
        if (!cancelled) setActivityError(error instanceof Error ? error.message : 'Unable to load admin activity.')
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => { cancelled = true }
  }, [authState, token, activityRefresh, activityPage, adminRole])

  useEffect(() => {
    if (authState !== 'signed-in' || !token || activeSection === 'overview' || activeSection === 'reports') return
    let cancelled = false
    const headers = { Authorization: `Bearer ${token}` }
    const load = async () => {
      if (activeSection === 'customers') {
        const response = await fetch(`${apiUrl}/api/admin/customers?q=${encodeURIComponent(customerSearch)}&page=${customerPage}`, { headers })
        const result = await response.json() as { customers?: AdminCustomer[]; pagination?: { total: number }; manualChecks?: AdminActivity['adminReports']; message?: string }
        if (!response.ok) throw new Error(result.message || 'Unable to load customers.')
        if (!cancelled) {
          setCustomers(result.customers || [])
          setCustomerTotal(result.pagination?.total || 0)
          setManualChecks(result.manualChecks || [])
        }
        if (adminRole === 'owner' || adminRole === 'manager') {
          const accountsResponse = await fetch(`${apiUrl}/api/admin/customer-accounts`, { headers })
          const accounts = await accountsResponse.json() as { invitations?: AdminCustomerInvitation[]; message?: string }
          if (!accountsResponse.ok) throw new Error(accounts.message || 'Unable to load customer accounts.')
          if (!cancelled) setCustomerInvitations(accounts.invitations || [])
        }
      } else if (activeSection === 'analytics' || activeSection === 'journey') {
        const response = await fetch(`${apiUrl}/api/admin/analytics`, { headers })
        const result = await response.json() as AdminAnalytics & { message?: string }
        if (!response.ok) throw new Error(result.message || 'Unable to load analytics.')
        if (!cancelled) setAnalytics(result)
        if (activeSection === 'journey') {
          const customersResponse = await fetch(`${apiUrl}/api/admin/customers?page=1`, { headers })
          const customerResult = await customersResponse.json() as { customers?: AdminCustomer[]; message?: string }
          if (!customersResponse.ok) throw new Error(customerResult.message || 'Unable to load customer journey.')
          if (!cancelled) setCustomers(customerResult.customers || [])
        }
      } else if (activeSection === 'tickets') {
        const response = await fetch(`${apiUrl}/api/admin/tickets?status=${encodeURIComponent(ticketStatus)}`, { headers })
        const result = await response.json() as { tickets?: AdminTicket[]; message?: string }
        if (!response.ok) throw new Error(result.message || 'Unable to load tickets.')
        if (!cancelled) setTickets(result.tickets || [])
      } else if (activeSection === 'team') {
        const response = await fetch(`${apiUrl}/api/admin/team`, { headers })
        const result = await response.json() as { admins?: AdminTeamMember[]; primaryAdmin?: string | null; message?: string }
        if (!response.ok) throw new Error(result.message || 'Unable to load admin team.')
        if (!cancelled) {
          setTeam(result.admins || [])
          setPrimaryAdmin(result.primaryAdmin || null)
        }
      }
    }
    void load().catch((error: unknown) => {
      if (!cancelled) setSectionError(error instanceof Error ? error.message : 'Unable to load this section.')
    }).finally(() => {
      if (!cancelled) setSectionLoading(false)
    })
    return () => { cancelled = true }
  }, [authState, token, activeSection, customerSearch, customerPage, ticketStatus, sectionRefresh, adminRole])

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setLoading(true)
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${apiUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.get('id'), password: data.get('password'), pin: data.get('pin') }),
      })
      const result = await response.json() as { token?: string; adminId?: string; role?: AdminRole; message?: string }
      if (!response.ok || !result.token) throw new Error(result.message || 'Unable to sign in.')
      sessionStorage.setItem('scorenow-admin-token', result.token)
      setAdminId(result.adminId || 'Admin')
      setAdminRole(result.role || 'owner')
      setActiveSection(result.role === 'support' ? 'customers' : result.role === 'analyst' ? 'analytics' : 'overview')
      setToken(result.token)
      setAuthState('signed-in')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    if (token) await fetch(`${apiUrl}/api/admin/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)
    sessionStorage.removeItem('scorenow-admin-token')
    setToken('')
    setAdminId('')
    setAdminRole('owner')
    setReport(null)
    setReportAuditId('')
    setActivity(null)
    setAuthState('signed-out')
  }

  const fetchReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReport(null)
    setReportAuditId('')
    setReportError('')
    setReportPdfError('')
    setLoading(true)
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${apiUrl}/api/admin/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bureau,
          fullName: data.get('fullName'),
          pan: data.get('pan'),
          dateOfBirth: data.get('dateOfBirth'),
          gender: data.get('gender'),
          mobile: data.get('mobile'),
          email: data.get('email'),
          addressLine1: data.get('addressLine1'),
          city: data.get('city'),
          state: data.get('state'),
          pincode: data.get('pincode'),
          consent: data.get('clientConsent') === 'on',
        }),
      })
      const result = await response.json() as { report?: ReportDetail; auditId?: string; message?: string }
      if (response.status === 401) {
        await signOut()
        throw new Error('Admin session expired. Sign in again.')
      }
      if (!response.ok || !result.report) throw new Error(result.message || 'Unable to fetch this report.')
      setReport(result.report)
      setReportAuditId(result.auditId || '')
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Unable to fetch this report.')
    } finally {
      setLoading(false)
      refreshActivity()
    }
  }

  const downloadAdminReportPdf = async (auditId: string, reportBureau: BureauId) => {
    if (!auditId || !token) return
    setReportPdfLoadingId(auditId)
    setReportPdfError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/reports/${auditId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(result?.message || 'Unable to generate this report PDF.')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `ScoreNow-${reportBureau}-report-copy.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setReportPdfError(error instanceof Error ? error.message : 'Unable to generate this report PDF.')
    } finally {
      setReportPdfLoadingId('')
    }
  }

  const acceptTeamInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setTeamNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${apiUrl}/api/admin/team/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: teamInviteToken, password: form.get('password'), pin: form.get('pin') }),
      })
      const result = await response.json() as { token?: string; adminId?: string; role?: AdminRole; message?: string }
      if (!response.ok || !result.token) throw new Error(result.message || 'Unable to accept this invitation.')
      sessionStorage.setItem('scorenow-admin-token', result.token)
      setAdminId(result.adminId || 'Admin')
      setAdminRole(result.role || 'support')
      setActiveSection(result.role === 'analyst' ? 'analytics' : result.role === 'support' ? 'customers' : 'overview')
      setToken(result.token)
      setTeamInviteToken('')
      window.history.replaceState(null, '', '/admin')
      setAuthState('signed-in')
    } catch (error) {
      setTeamNotice(error instanceof Error ? error.message : 'Unable to accept this invitation.')
    } finally {
      setLoading(false)
    }
  }

  const createCustomerInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    setSectionLoading(true)
    setSectionError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${apiUrl}/api/admin/customer-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: form.get('fullName'), mobile: form.get('mobile'), email: form.get('email') }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to create the customer invitation.')
      setTeamNotice(result.message || 'Customer invitation recorded.')
      formElement.reset()
      setSectionRefresh((refresh) => refresh + 1)
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : 'Unable to create the customer invitation.')
    } finally {
      setSectionLoading(false)
    }
  }

  const updateCustomerStatus = async (customer: AdminCustomer) => {
    setSectionLoading(true)
    setSectionError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/customers/${customer.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: customer.status === 'blocked' ? 'active' : 'blocked' }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to update this customer.')
      setSectionRefresh((refresh) => refresh + 1)
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : 'Unable to update this customer.')
    } finally {
      setSectionLoading(false)
    }
  }

  const updateTicket = async (ticket: AdminTicket, status: AdminTicket['status'], assignedTo: string | null = ticket.assigned_to) => {
    setSectionLoading(true)
    setSectionError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, assignedTo }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to update ticket.')
      setSectionRefresh((refresh) => refresh + 1)
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : 'Unable to update ticket.')
    } finally {
      setSectionLoading(false)
    }
  }

  const replyToAdminTicket = async (event: FormEvent<HTMLFormElement>, ticketId: string) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const message = String(new FormData(formElement).get('message') || '').trim()
    setSectionLoading(true)
    setSectionError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ message }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to send ticket reply.')
      formElement.reset()
      setSectionRefresh((refresh) => refresh + 1)
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : 'Unable to send ticket reply.')
    } finally {
      setSectionLoading(false)
    }
  }

  const inviteAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    setSectionLoading(true)
    setSectionError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${apiUrl}/api/admin/team/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      })
      const result = await response.json() as { invitationUrl?: string; message?: string }
      if (!response.ok || !result.invitationUrl) throw new Error(result.message || 'Unable to invite this admin.')
      setInviteUrl(result.invitationUrl)
      setSectionRefresh((refresh) => refresh + 1)
      formElement.reset()
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : 'Unable to invite this admin.')
    } finally {
      setSectionLoading(false)
    }
  }

  const setTeamMemberStatus = async (member: AdminTeamMember) => {
    setSectionLoading(true)
    setSectionError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/team/${encodeURIComponent(member.email)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: member.status === 'disabled' ? 'active' : 'disabled' }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to update admin status.')
      setSectionRefresh((refresh) => refresh + 1)
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : 'Unable to update admin status.')
    } finally {
      setSectionLoading(false)
    }
  }

  const searchTerm = activitySearch.trim().toLowerCase()
  const activityTotalPages = activity
    ? Math.max(1, Math.ceil(Math.max(activity.pagination.totalPayments, activity.pagination.totalAdminReports) / activity.pagination.pageSize))
    : 1
  const matchingPayments = (activity?.payments ?? []).filter((item) =>
    `${item.full_name} ${item.mobile_last4} ${item.bureau ?? ''} ${item.status} ${item.report_status ?? ''}`
      .toLowerCase().includes(searchTerm))
  const matchingAdminReports = (activity?.adminReports ?? []).filter((item) =>
    `${item.full_name ?? ''} ${item.mobile_last4} ${item.bureau} ${item.status} ${item.admin_id}`
      .toLowerCase().includes(searchTerm))

  const adminSections: {
    id: 'overview' | 'customers' | 'reports' | 'analytics' | 'tickets' | 'journey' | 'team'
    label: string
    icon: typeof House
    roles: AdminRole[]
  }[] = [
    { id: 'overview', label: 'Overview', icon: House, roles: ['owner', 'manager'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['owner', 'manager', 'support'] },
    { id: 'reports', label: 'Credit score checker', icon: FileSearch, roles: ['owner', 'manager'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['owner', 'manager', 'analyst'] },
    { id: 'tickets', label: 'Helpline tickets', icon: MessageCircle, roles: ['owner', 'manager', 'support'] },
    { id: 'journey', label: 'Signup journey', icon: TrendingUp, roles: ['owner', 'manager', 'analyst'] },
    { id: 'team', label: 'Manage admins', icon: LockKeyhole, roles: ['owner'] },
  ]
  const visibleAdminSections = adminSections.filter((section) => section.roles.includes(adminRole))
  const changeAdminSection = (section: typeof activeSection) => {
    setActiveSection(section)
    setSectionError('')
    if (section !== 'overview' && section !== 'reports') setSectionLoading(true)
    else setActivityLoading(true)
  }
  const customerTotalPages = Math.max(1, Math.ceil(customerTotal / 50))

  if (authState === 'checking') return <div className="admin-loading"><RotateCcw /> Verifying admin session…</div>

  return (
    <main className="admin-shell">
      <header className="admin-header"><Brand href="/" /><div><span>SECURE OPERATIONS</span><strong>{authState === 'signed-in' ? adminId : 'Administrator access'}</strong></div>{authState === 'signed-in' && <button className="button button-outline" type="button" onClick={() => void signOut()}><LockKeyhole /> Sign out</button>}</header>
      {authState === 'signed-out' ? <section className="admin-login-wrap">
        {teamInviteToken ? <>
          <div className="admin-heading"><span>ADMIN INVITATION</span><h1>Set up your admin account</h1><p>Create your private password and 6-digit PIN to accept this one-time invitation.</p></div>
          <form className="dashboard-card admin-login-form" onSubmit={(event) => void acceptTeamInvitation(event)}>
            <label>Password<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label>
            <label>6-digit security PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" required /></label>
            {teamNotice && <p className="dashboard-notice error" role="alert">{teamNotice}</p>}
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Activating account…' : <>Accept invitation <ArrowRight /></>}</button>
          </form>
        </> : <>
          <div className="admin-heading"><span>PRIVATE WORKSPACE</span><h1>Administrator sign in</h1><p>Use your admin email or ID, password, and PIN.</p></div>
          <form className="dashboard-card admin-login-form" onSubmit={signIn}>
            <label>Administrator email or ID<input name="id" autoComplete="username" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
            <label>Security PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required /></label>
            {loginError && <p className="dashboard-notice error" role="alert">{loginError}</p>}
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : <>Sign in <ArrowRight /></>}</button>
          </form>
        </>}
      </section> : <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-identity"><span>ADMINISTRATOR</span><strong>{adminId}</strong><small>{adminRole}</small></div>
          <nav aria-label="Admin sections">{visibleAdminSections.map((section) => { const Icon = section.icon; return <button key={section.id} type="button" className={activeSection === section.id ? 'active' : ''} onClick={() => changeAdminSection(section.id)}><Icon />{section.label}</button> })}</nav>
          <p>Private operations workspace</p>
        </aside>
        <div className="admin-content">
        {(activeSection === 'overview' ? activityLoading : activeSection === 'reports' ? loading : sectionLoading) && <div className="admin-data-loading" role="status"><RotateCcw /> Loading {activeSection === 'overview' ? 'activity' : activeSection === 'reports' ? 'the credit report' : activeSection === 'tickets' ? 'support tickets' : activeSection === 'customers' ? 'customer records' : activeSection === 'team' ? 'admin team' : 'analytics'} from the database…</div>}
        {sectionError && activeSection !== 'overview' && <p className="dashboard-notice error" role="alert">{sectionError}</p>}
        {activeSection !== 'overview' && <div className="admin-section-actions"><button className="button button-outline" type="button" onClick={() => { setSectionLoading(true); setSectionRefresh((refresh) => refresh + 1) }} disabled={sectionLoading}><RotateCcw /> {sectionLoading ? 'Refreshing…' : 'Refresh section'}</button></div>}
        {activeSection === 'overview' ? <>
        <div className="admin-heading"><span>SECURE OPERATIONS</span><h1>Admin overview</h1><p>Review customer activity, payment outcomes, and bureau report requests.</p></div>
        <section className="admin-activity" aria-label="Admin activity">
          <div className="admin-activity-toolbar">
            <label className="admin-activity-search"><Search /><input aria-label="Search admin activity on this page" type="search" value={activitySearch} onChange={(event) => { setActivitySearch(event.target.value); setActivityPage(1) }} placeholder="Search this page by name, phone, bureau, or status" /></label>
            <button className="button button-outline" type="button" onClick={refreshActivity} disabled={activityLoading}><RotateCcw /> {activityLoading ? 'Refreshing…' : 'Refresh activity'}</button>
          </div>
          {activityError && <p className="dashboard-notice error" role="alert">{activityError}</p>}
          {reportPdfError && <p className="dashboard-notice error" role="alert">{reportPdfError}</p>}
          {activity && <div className="admin-stat-grid">
            <article className="dashboard-card admin-stat"><Users /><span>Total users</span><strong>{activity.summary.totalUsers.toLocaleString('en-IN')}</strong></article>
            <article className="dashboard-card admin-stat"><BadgeIndianRupee /><span>Payments received</span><strong>{activity.summary.paidPayments.toLocaleString('en-IN')}</strong><small>{formatMoney(activity.summary.paymentRevenue)} including GST</small></article>
            <article className="dashboard-card admin-stat"><AlertTriangle /><span>Failed payment attempts</span><strong>{activity.summary.failedPayments.toLocaleString('en-IN')}</strong></article>
            <article className="dashboard-card admin-stat"><FileCheck2 /><span>Paid report requests</span><strong>{activity.summary.reportRequests.toLocaleString('en-IN')}</strong><small>{activity.summary.failedReportRequests.toLocaleString('en-IN')} report fetches failed</small></article>
          </div>}
          <article className="dashboard-card admin-activity-card">
            <div className="dashboard-card-heading"><strong>Customer payments &amp; reports</strong><small>50 per page</small></div>
            {!activity && !activityError ? <p className="admin-activity-empty">Loading customer activity…</p> : matchingPayments.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
              <thead><tr><th>Customer</th><th>Bureau</th><th>Payment</th><th>Report</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>{matchingPayments.map((item) => {
                const bureauName = bureauCatalog.find((entry) => entry.id === item.bureau)?.name ?? item.bureau ?? '—'
                const reportErrorMessage = item.report_failure_reason
                const hasFailedAttempt = item.status === 'created' && Boolean(item.failure_reason)
                const paymentStatus = hasFailedAttempt ? 'failed attempt' : item.status === 'created' ? 'pending' : item.status
                const paymentStatusClass = hasFailedAttempt ? 'failed' : item.status
                return <tr key={item.id}>
                  <td><strong>{item.full_name || 'Customer'}</strong><small>+91 ••••••{item.mobile_last4}</small></td>
                  <td>{bureauName}</td>
                  <td><span className={`admin-status ${paymentStatusClass}`}>{paymentStatus}</span><small>{item.gateway}</small>{item.failure_reason && <small className="admin-activity-error" title={item.failure_reason}>{item.failure_reason}</small>}</td>
                  <td><span className={`admin-status ${item.report_status || 'pending'}`}>{item.report_status || 'Not requested'}</span>{reportErrorMessage && <small className="admin-activity-error" title={reportErrorMessage}>{reportErrorMessage}</small>}</td>
                  <td>{formatMoney(Number(item.amount) + Number(item.gst_amount))}</td>
                  <td>{formatAdminTimestamp(item.paid_at ?? item.failure_at ?? item.created_at)}</td>
                </tr>
              })}</tbody>
            </table></div> : <p className="admin-activity-empty">{activity ? 'No matching payment activity found.' : 'Customer activity is not available yet.'}</p>}
          </article>
          <article className="dashboard-card admin-activity-card">
            <div className="dashboard-card-heading"><strong>Admin-initiated bureau checks</strong><small>50 per page</small></div>
            {!activity && !activityError ? <p className="admin-activity-empty">Loading report history…</p> : matchingAdminReports.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
              <thead><tr><th>Client</th><th>Bureau</th><th>Status</th><th>Score</th><th>Checked by</th><th>Date</th><th>PDF</th></tr></thead>
              <tbody>{matchingAdminReports.map((item) => <tr key={item.id}>
                <td><strong>{item.full_name || 'Client'}</strong><small>•••• {item.mobile_last4}</small></td>
                <td>{bureauCatalog.find((entry) => entry.id === item.bureau)?.name ?? item.bureau}</td>
                <td><span className={`admin-status ${item.status}`}>{item.status}</span>{item.failure_reason && <small className="admin-activity-error" title={item.failure_reason}>{item.failure_reason}</small>}</td>
                <td>{item.credit_score ?? '—'}</td>
                <td>{item.admin_id}</td>
                <td>{formatAdminTimestamp(item.completed_at ?? item.created_at)}</td>
                <td>{item.status === 'completed' && <button className="button button-outline admin-small-button" type="button" onClick={() => void downloadAdminReportPdf(item.id, item.bureau)} disabled={reportPdfLoadingId === item.id}><Download /> {reportPdfLoadingId === item.id ? 'Preparing…' : 'Download'}</button>}</td>
              </tr>)}</tbody>
            </table></div> : <p className="admin-activity-empty">{activity ? 'No matching admin report checks found.' : 'Report history is not available yet.'}</p>}
          </article>
          {activity && <nav className="admin-activity-pagination" aria-label="Activity pages">
            <button className="button button-outline" type="button" onClick={() => { setActivityLoading(true); setActivityPage((page) => page - 1) }} disabled={activityLoading || activity.pagination.page <= 1}><ArrowLeft /> Previous</button>
            <span>Page {activity.pagination.page} of {activityTotalPages}</span>
            <button className="button button-outline" type="button" onClick={() => { setActivityLoading(true); setActivityPage((page) => page + 1) }} disabled={activityLoading || activity.pagination.page >= activityTotalPages}>Next <ArrowRight /></button>
          </nav>}
        </section>
        </> : activeSection === 'reports' ? <>
        <div className="admin-heading admin-report-heading"><span>CLIENT REPORTS</span><h1>Credit score checker</h1><p>Fetch a client’s bureau report with their informed authorization. Bureau requests may incur provider charges.</p></div>
        <form className="dashboard-card admin-report-form" onSubmit={(event) => void fetchReport(event)}>
          <div className="admin-form-grid">
            <label>Bureau<select value={bureau} onChange={(event) => setBureau(event.target.value as BureauId)}>{bureauCatalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Full name<input name="fullName" autoComplete="name" required /></label>
            <label>PAN<input name="pan" autoCapitalize="characters" pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" maxLength={10} required /></label>
            <label>Date of birth<input name="dateOfBirth" type="date" required /></label>
            <label>Mobile number<input name="mobile" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel-national" required /></label>
            <label>Email<input name="email" type="email" autoComplete="email" /></label>
            <label className="admin-field-wide">Address<input name="addressLine1" autoComplete="street-address" required /></label>
            <label>City<input name="city" autoComplete="address-level2" required /></label>
            <label>State<select name="state" required defaultValue=""><option value="" disabled>Select state</option>{indianStates.map((state) => <option key={state}>{state}</option>)}</select></label>
            <label>PIN code<input name="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" required /></label>
            <label>Gender<select name="gender" required defaultValue=""><option value="" disabled>Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
          </div>
          <label className="admin-consent"><input type="checkbox" name="clientConsent" required /><span>I confirm the client has authorized Score Now to submit these details to the selected credit bureau for this report request.</span></label>
          {reportError && <p className="dashboard-notice error" role="alert">{reportError}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Requesting report…' : <>Fetch {bureauCatalog.find((item) => item.id === bureau)?.name} report <ArrowRight /></>}</button>
        </form>
        {report && <section className="admin-report-result" aria-live="polite">
          <div className="report-toolbar-actions"><button className="button button-primary" type="button" onClick={() => void downloadAdminReportPdf(reportAuditId, report.bureau)} disabled={reportPdfLoadingId === reportAuditId || !reportAuditId}><Download /> {reportPdfLoadingId === reportAuditId ? 'Preparing PDF…' : 'Download Score Now PDF'}</button></div>
          <p className="dashboard-notice info">This is a Score Now-generated copy based on bureau data, not an official bureau-issued report.</p>
          {reportPdfError && <p className="dashboard-notice error" role="alert">{reportPdfError}</p>}
          <div className="admin-result-heading"><div><span>{bureauCatalog.find((item) => item.id === report.bureau)?.name} REPORT</span><h2>{report.personal.name || 'Client report'}</h2></div><strong>{report.score ?? '—'}<small>{report.score ? 'Credit score' : 'Score unavailable'}</small></strong></div>
          <div className="report-summary-strip">
            <div><small>Total accounts</small><strong>{report.summary.totalAccounts}</strong></div>
            <div><small>Active</small><strong>{report.summary.activeAccounts}</strong></div>
            <div><small>Closed</small><strong>{report.summary.closedAccounts}</strong></div>
            <div><small>Overdue accounts</small><strong>{report.summary.overdueAccounts}</strong></div>
            <div><small>Outstanding</small><strong>{formatMoney(report.summary.totalBalance)}</strong></div>
            <div><small>Overdue amount</small><strong>{formatMoney(report.summary.totalOverdue)}</strong></div>
            <div><small>Enquiries (6 months)</small><strong>{report.summary.enquiriesLast6Months}</strong></div>
          </div>
          <article className="dashboard-card admin-report-personal"><div className="dashboard-card-heading"><strong>Client details</strong></div><dl><dt>PAN</dt><dd>{report.personal.pan || '—'}</dd><dt>Date of birth</dt><dd>{formatDate(report.personal.dateOfBirth)}</dd><dt>Phone</dt><dd>{report.personal.phones.join(', ') || '—'}</dd><dt>Email</dt><dd>{report.personal.emails.join(', ') || '—'}</dd><dt>Address</dt><dd>{report.personal.addresses.join('; ') || '—'}</dd></dl></article>
          <article className="dashboard-card report-enquiries"><div className="dashboard-card-heading"><strong>Credit enquiries</strong><small>{report.enquiries.length} total</small></div>{report.enquiries.length ? <ul>{report.enquiries.map((item, index) => <li key={`${item.lender}-${index}`}><div><strong>{item.lender}</strong><small>{item.purpose || 'Credit enquiry'}{item.amount ? ` · ${formatMoney(item.amount)}` : ''}</small></div><time>{formatDate(item.date)}</time></li>)}</ul> : <p className="report-empty">No enquiries reported.</p>}</article>
          <article className="dashboard-card report-accounts"><div className="dashboard-card-heading"><strong>Credit accounts</strong><small>{report.accounts.length} accounts</small></div>{report.accounts.length ? <div className="report-account-list">{report.accounts.map((account, index) => <div className={`report-account ${account.status}`} key={`${account.lender}-${account.accountNumber}-${index}`}><div className="report-account-head"><div><strong>{account.lender}</strong><small>{account.type}{account.accountNumber ? ` · ${account.accountNumber}` : ''}</small></div><span className={`account-chip ${needsAttention(account) ? 'overdue' : account.status}`}>{accountFlag(account).label}</span></div><dl className="report-account-figures"><div><dt>Balance</dt><dd>{formatMoney(account.currentBalance)}</dd></div><div><dt>Limit</dt><dd>{formatMoney(account.creditLimit)}</dd></div><div><dt>Overdue</dt><dd>{formatMoney(account.overdueAmount)}</dd></div><div><dt>Opened</dt><dd>{formatDate(account.openedOn)}</dd></div></dl></div>)}</div> : <p className="report-empty">No accounts returned by the bureau.</p>}</article>
        </section>}
        </> : activeSection === 'customers' ? <>
          <div className="admin-heading"><span>CUSTOMER CARE</span><h1>Customers</h1><p>Search verified customer accounts by name, phone, email, or an exact PAN. PAN is only shown as its last four characters.</p></div>
          <div className="admin-customer-toolbar">
            <label className="admin-activity-search"><Search /><input aria-label="Search customers by name, mobile, email, or PAN" value={customerSearch} onChange={(event) => { setCustomerSearch(event.target.value); setCustomerPage(1); setSectionLoading(true) }} placeholder="Name, mobile, email, or PAN" /></label>
            <button type="button" className="button button-outline" onClick={() => { setSectionLoading(true); setSectionRefresh((refresh) => refresh + 1) }} disabled={sectionLoading}><RotateCcw /> Refresh</button>
          </div>
          {sectionLoading && !customers.length && <p className="admin-activity-empty">Loading customer records…</p>}
          <article className="dashboard-card admin-activity-card">
            <div className="dashboard-card-heading"><strong>Registered customers</strong><small>{customerTotal.toLocaleString('en-IN')} total</small></div>
            {customers.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
              <thead><tr><th>Customer</th><th>Mobile / Email</th><th>PAN</th><th>Journey step</th><th>Reports</th><th>Account</th><th>Manage</th></tr></thead>
              <tbody>{customers.map((customer) => <tr key={customer.id}>
                <td><strong>{customer.full_name}</strong><small>Joined {formatAdminTimestamp(customer.created_at)}</small></td>
                <td>{customer.mobile}<small>{customer.email || 'No email on file'}</small></td>
                <td>{customer.pan_last4 ? `••••••${customer.pan_last4}` : 'Not provided'}</td>
                <td>{customer.journey_stage}<small>{customer.kyc_status ? `Profile: ${customer.kyc_status}` : 'Profile incomplete'}</small></td>
                <td>{customer.paid_payments} paid / {customer.total_payments} orders<small>{customer.latest_report_status || 'No report request'}</small></td>
                <td><span className={`admin-status ${customer.status === 'active' ? 'completed' : 'failed'}`}>{customer.status}</span></td>
                <td><button className="button button-outline admin-small-button" type="button" disabled={sectionLoading} onClick={() => void updateCustomerStatus(customer)}>{customer.status === 'blocked' ? 'Enable' : 'Block'}</button></td>
              </tr>)}</tbody>
            </table></div> : <p className="admin-activity-empty">{customerSearch ? 'No matching customers found.' : 'No registered customers yet.'}</p>}
          </article>
          {manualChecks.length > 0 && <article className="dashboard-card admin-activity-card">
            <div className="dashboard-card-heading"><strong>Admin report checks matching this PAN</strong><small>{manualChecks.length} checks</small></div>
            <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Client</th><th>Bureau</th><th>Status</th><th>Score</th><th>Checked by</th><th>Date</th></tr></thead><tbody>
              {manualChecks.map((check) => <tr key={check.id}><td><strong>{check.full_name || 'Client'}</strong><small>•••• {check.mobile_last4}</small></td><td>{bureauCatalog.find((item) => item.id === check.bureau)?.name ?? check.bureau}</td><td><span className={`admin-status ${check.status}`}>{check.status}</span><small className="admin-activity-error">{check.failure_reason}</small></td><td>{check.credit_score ?? '—'}</td><td>{check.admin_id}</td><td>{formatAdminTimestamp(check.completed_at ?? check.created_at)}</td></tr>)}
            </tbody></table></div>
          </article>}
          {customerTotalPages > 1 && <nav className="admin-activity-pagination" aria-label="Customer pages"><button className="button button-outline" type="button" disabled={customerPage <= 1 || sectionLoading} onClick={() => { setSectionLoading(true); setCustomerPage((page) => page - 1) }}><ArrowLeft /> Previous</button><span>Page {customerPage} of {customerTotalPages}</span><button className="button button-outline" type="button" disabled={customerPage >= customerTotalPages || sectionLoading} onClick={() => { setSectionLoading(true); setCustomerPage((page) => page + 1) }}>Next <ArrowRight /></button></nav>}
          {(adminRole === 'owner' || adminRole === 'manager') && <article className="dashboard-card admin-management-card">
            <div className="dashboard-card-heading"><strong>Invite a new customer</strong><small>They claim the account after verifying this mobile with OTP</small></div>
            <form className="admin-management-form" onSubmit={(event) => void createCustomerInvite(event)}>
              <label>Full name<input name="fullName" minLength={2} maxLength={120} required /></label>
              <label>Mobile number<input name="mobile" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required /></label>
              <label>Email (optional)<input name="email" type="email" /></label>
              <button className="button button-primary" type="submit" disabled={sectionLoading}><UserRound /> Record invitation</button>
            </form>
            {teamNotice && <p className="dashboard-notice info" role="status">{teamNotice}</p>}
            <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Invited customer</th><th>Mobile</th><th>Email</th><th>Status</th><th>Invited</th></tr></thead><tbody>
              {customerInvitations.length ? customerInvitations.map((invite) => <tr key={invite.id}><td><strong>{invite.full_name}</strong></td><td>{invite.mobile}</td><td>{invite.email || '—'}</td><td><span className={`admin-status ${invite.status === 'claimed' ? 'completed' : invite.status === 'cancelled' ? 'failed' : 'pending'}`}>{invite.status}</span></td><td>{formatAdminTimestamp(invite.created_at)}</td></tr>) : <tr><td colSpan={5}>No customer invitations yet.</td></tr>}
            </tbody></table></div>
          </article>}
        </> : activeSection === 'analytics' ? <>
          <div className="admin-heading"><span>BUSINESS INSIGHTS</span><h1>Analytics</h1><p>Database-backed totals and daily activity from registered accounts, payments, and report requests.</p></div>
          {analytics && <>
            <div className="admin-stat-grid admin-analytics-grid">
              <article className="dashboard-card admin-stat"><Users /><span>Customers</span><strong>{(analytics.summary.total_users || 0).toLocaleString('en-IN')}</strong></article>
              <article className="dashboard-card admin-stat"><UserRound /><span>Active accounts</span><strong>{(analytics.summary.active_users || 0).toLocaleString('en-IN')}</strong></article>
              <article className="dashboard-card admin-stat"><UserRound /><span>Users with valid sessions</span><strong>{(analytics.summary.signed_in_users || 0).toLocaleString('en-IN')}</strong></article>
              <article className="dashboard-card admin-stat"><BadgeIndianRupee /><span>Paid revenue</span><strong>{formatMoney(analytics.summary.revenue || 0)}</strong></article>
              <article className="dashboard-card admin-stat"><CreditCard /><span>Paid orders</span><strong>{(analytics.summary.paid_payments || 0).toLocaleString('en-IN')}</strong></article>
              <article className="dashboard-card admin-stat"><AlertTriangle /><span>Failed attempts</span><strong>{(analytics.summary.failed_payments || 0).toLocaleString('en-IN')}</strong></article>
              <article className="dashboard-card admin-stat"><FileCheck2 /><span>Completed reports</span><strong>{(analytics.summary.completed_reports || 0).toLocaleString('en-IN')}</strong></article>
              <article className="dashboard-card admin-stat"><MessageCircle /><span>Open tickets</span><strong>{(analytics.summary.open_tickets || 0).toLocaleString('en-IN')}</strong></article>
            </div>
            <article className="dashboard-card admin-activity-card">
              <div className="dashboard-card-heading"><strong>Daily activity</strong><small>Last 14 days</small></div>
              <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Date</th><th>Signups</th><th>Paid orders</th><th>Revenue</th><th>Failed payments</th></tr></thead><tbody>
                {analytics.trend.map((day) => <tr key={day.day}><td>{formatDate(day.day)}</td><td>{day.signups}</td><td>{day.paid_orders}</td><td>{formatMoney(day.revenue)}</td><td>{day.failed_attempts}</td></tr>)}
              </tbody></table></div>
            </article>
          </>}
        </> : activeSection === 'journey' ? <>
          <div className="admin-heading"><span>ONBOARDING FUNNEL</span><h1>Signup journey</h1><p>See how customers progress through account verification, profile completion, payment, and report delivery. Steps are inferred from saved records.</p></div>
          {analytics && <div className="admin-funnel">{analytics.funnel.map((item, index) => {
            const first = analytics.funnel[0]?.count || 0
            const rate = first ? Math.round((item.count / first) * 100) : 0
            return <article className="dashboard-card admin-funnel-step" key={item.step}><span>STEP {index + 1}</span><strong>{item.count.toLocaleString('en-IN')}</strong><b>{item.step}</b><div><i style={{ width: `${rate}%` }} /></div><small>{rate}% of accounts</small></article>
          })}</div>}
          <article className="dashboard-card admin-activity-card"><div className="dashboard-card-heading"><strong>Customer progress</strong><small>Latest 50</small></div>
            {customers.length ? <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Customer</th><th>Mobile</th><th>Progress</th><th>Last sign in</th><th>Reports</th></tr></thead><tbody>
              {customers.map((customer) => <tr key={customer.id}><td><strong>{customer.full_name}</strong><small>{customer.email || '—'}</small></td><td>{customer.mobile}</td><td><span className="admin-status pending">{customer.journey_stage}</span></td><td>{formatAdminTimestamp(customer.last_login)}</td><td>{customer.latest_report_status || 'No report yet'}</td></tr>)}
            </tbody></table></div> : <p className="admin-activity-empty">No customer progress records found.</p>}
          </article>
        </> : activeSection === 'tickets' ? <>
          <div className="admin-heading"><span>CUSTOMER SUPPORT</span><h1>Helpline tickets</h1><p>Review customer-submitted requests, reply in the ticket conversation, assign an owner, and update status. Website callback requests are also added here.</p></div>
          <div className="admin-ticket-toolbar"><label>Status filter<select value={ticketStatus} onChange={(event) => { setTicketStatus(event.target.value); setSectionLoading(true) }}><option value="">All tickets</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label><button className="button button-outline" type="button" onClick={() => { setSectionLoading(true); setSectionRefresh((refresh) => refresh + 1) }} disabled={sectionLoading}><RotateCcw /> Refresh</button></div>
          <div className="admin-ticket-list">{tickets.length ? tickets.map((ticket) => <article className="dashboard-card admin-ticket" key={ticket.id}>
            <div className="admin-ticket-top"><div><span className={`admin-status ${ticket.priority === 'urgent' || ticket.priority === 'high' ? 'failed' : 'pending'}`}>{ticket.priority}</span><span className={`admin-status ${ticket.status === 'resolved' || ticket.status === 'closed' ? 'completed' : 'pending'}`}>{ticket.status.replace('_', ' ')}</span></div><time>{formatAdminTimestamp(ticket.created_at)}</time></div>
            <h2>{ticket.subject}</h2><p>{ticket.message}</p><div className="admin-ticket-customer"><strong>{ticket.requester_name}</strong><span>{ticket.requester_mobile}</span><small>Created by {ticket.created_by}</small></div>
            <div className="admin-ticket-actions"><label>Assign to<input key={ticket.assigned_to || ''} defaultValue={ticket.assigned_to || ''} placeholder="Admin email or name" onBlur={(event) => { const value = event.currentTarget.value.trim() || null; if (value !== ticket.assigned_to) void updateTicket(ticket, ticket.status, value) }} /></label><label>Ticket status<select value={ticket.status} onChange={(event) => void updateTicket(ticket, event.target.value as AdminTicket['status'])}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label></div>
            <div className="admin-ticket-thread">
              <strong>Conversation</strong>
              {ticket.comments.length ? ticket.comments.map((comment) => <div className={`admin-ticket-comment ${comment.author_type}`} key={comment.id}><div><b>{comment.author_name}</b><time>{formatAdminTimestamp(comment.created_at)}</time></div><p>{comment.message}</p></div>) : <p className="admin-ticket-no-replies">No replies yet.</p>}
              <form className="admin-ticket-reply" onSubmit={(event) => void replyToAdminTicket(event, ticket.id)}>
                <label className="sr-only" htmlFor={`admin-ticket-reply-${ticket.id}`}>Reply to {ticket.subject}</label>
                <textarea id={`admin-ticket-reply-${ticket.id}`} name="message" rows={2} maxLength={4000} placeholder="Write an update for the customer…" required />
                <button className="button button-primary" type="submit" disabled={sectionLoading}><MessageCircle /> Send reply</button>
              </form>
            </div>
          </article>) : <p className="admin-activity-empty">No tickets match this status.</p>}</div>
        </> : <>
          <div className="admin-heading"><span>ACCESS CONTROL</span><h1>Manage admins</h1><p>Invite trusted teammates with role-based access. Invitations expire after 48 hours and each admin chooses a private password and PIN.</p></div>
          <article className="dashboard-card admin-management-card">
            <div className="dashboard-card-heading"><strong>Invite an admin</strong><small>Invite link shown once; share it through a secure channel</small></div>
            <form className="admin-management-form" onSubmit={(event) => void inviteAdmin(event)}>
              <label>Full name<input name="fullName" minLength={2} maxLength={120} required /></label>
              <label>Email<input name="email" type="email" required /></label>
              <label>Role<select name="role" defaultValue="support"><option value="manager">Manager — customers, analytics, tickets, reports</option><option value="support">Support — customer help and tickets</option><option value="analyst">Analyst — analytics and funnel</option></select></label>
              <button className="button button-primary" type="submit" disabled={sectionLoading}><UserRound /> Create invite</button>
            </form>
            {inviteUrl && <label className="admin-invite-link">One-time invite link<input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /><small>Copy and share privately. The invite is valid for 48 hours.</small></label>}
          </article>
          <article className="dashboard-card admin-activity-card">
            <div className="dashboard-card-heading"><strong>Admin accounts</strong><small>{team.length + (primaryAdmin ? 1 : 0)} accounts</small></div>
            <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Admin</th><th>Role</th><th>Status</th><th>Added</th><th>Manage</th></tr></thead><tbody>
              {primaryAdmin && <tr><td><strong>{primaryAdmin}</strong><small>Environment-protected primary admin</small></td><td>Owner</td><td><span className="admin-status completed">active</span></td><td>—</td><td>Protected</td></tr>}
              {team.map((member) => <tr key={member.email}><td><strong>{member.full_name}</strong><small>{member.email}</small></td><td>{member.role}</td><td><span className={`admin-status ${member.status === 'active' ? 'completed' : member.status === 'disabled' ? 'failed' : 'pending'}`}>{member.status}</span></td><td>{formatAdminTimestamp(member.created_at)}</td><td>{member.status !== 'invited' && <button className="button button-outline admin-small-button" type="button" disabled={sectionLoading || member.email === adminId} onClick={() => void setTeamMemberStatus(member)}>{member.status === 'disabled' ? 'Enable' : 'Disable'}</button>}</td></tr>)}
            </tbody></table></div>
          </article>
        </>}
      </div></div>}
    </main>
  )
}

function App() {
  const pathname = window.location.pathname.replace(/\/$/, '')
  const guideSlug = pathname.startsWith('/guides/') ? pathname.slice('/guides/'.length) : ''
  const currentGuide = creditGuides[guideSlug as CreditGuideSlug]
  useEffect(() => {
    const isBusinessPage = pathname === '/business'
    const isCreditScorePage = pathname === '/creditscore'
    const isAdminPage = pathname === '/admin'
    const title = currentGuide
      ? `${currentGuide.title} | Score Now`
      : isCreditScorePage
      ? 'Credit Score Report Request | Score Now'
      : isAdminPage
        ? 'Administrator | Score Now'
        : isBusinessPage
        ? 'Business Credit Report & CMR Guidance | Score Now'
        : 'Credit Score Guidance & Report Help in India | Score Now'
    const description = currentGuide
      ? currentGuide.description
      : isBusinessPage
      ? 'Understand your commercial credit report, identify CMR issues, and get practical business credit guidance from Score Now.'
      : isAdminPage
        ? 'Private Score Now administration workspace.'
        : isCreditScorePage
        ? 'Securely request a CIBIL credit report through Score Now. This private report request page is restricted to authorised use.'
        : 'Get practical credit score and credit report guidance in India. Score Now helps you understand CIBIL reports, identify errors, and plan next steps.'
    const canonicalUrl = `https://scorenow.in${pathname || '/'}`
    const robotsContent = isCreditScorePage || isAdminPage ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large'

    document.title = title
    const updateMeta = (selector: string, attribute: string, value: string) => {
      const element = document.querySelector<HTMLMetaElement>(selector)
      element?.setAttribute(attribute, value)
    }
    updateMeta('meta[name="description"]', 'content', description)
    updateMeta('meta[name="robots"]', 'content', robotsContent)
    updateMeta('meta[property="og:title"]', 'content', title)
    updateMeta('meta[property="og:description"]', 'content', description)
    updateMeta('meta[property="og:url"]', 'content', canonicalUrl)
    updateMeta('meta[name="twitter:title"]', 'content', title)
    updateMeta('meta[name="twitter:description"]', 'content', description)
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)
  }, [pathname, currentGuide])

  if (pathname === '/creditscore') return <CreditScorePage />
  if (pathname === '/dashboard') return <DashboardRoute />
  if (pathname === '/admin') return <AdminPage />
  if (pathname.startsWith('/guides/')) return <CreditGuidePage slug={guideSlug} />
  return pathname === '/business' ? <BusinessPage /> : <HomePage />
}

export default App
