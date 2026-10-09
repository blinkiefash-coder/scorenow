import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  ArrowLeft, ArrowRight, BadgeIndianRupee, BarChart3, Building2, CalendarDays,
  Check, ChevronDown, CircleHelp, Clock3, CreditCard, FileCheck2,
  FileSearch, Handshake, Headphones, House, Lightbulb, LockKeyhole,
  Mail, MapPin, Menu, MessageCircle, Pause, Phone, Play, RotateCcw, Search,
  ShieldCheck, Smartphone, Sparkles, Star, TrendingUp, Users, Volume2, VolumeX,
  UserRound, WalletCards, X, Zap,
} from 'lucide-react'
import './App.css'

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
      <img src="/scorenow-logo-hd.png" alt="Score Now - Improve Your Credit Score" />
    </a>
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

function AssessmentForm({ business = false }: { business?: boolean }) {
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')

  const submitAssessment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    data.set('assessmentType', business ? 'business' : 'individual')
    setSubmitStatus('sending')
    setSubmitMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/assessments`, { method: 'POST', body: data })
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
        <form className="assessment-form" onSubmit={submitAssessment}>
          {business && <label className="field-wide"><span>Business name *</span><input name="businessName" required placeholder="Enter registered business name" autoComplete="organization" /></label>}
          <label><span>Full name *</span><input name="fullName" required placeholder="Enter your full name" autoComplete="name" /></label>
          <label><span>Mobile number *</span><input name="mobile" required pattern="[0-9]{10}" inputMode="numeric" placeholder="10-digit mobile number" autoComplete="tel-national" /></label>
          <label><span>Email address *</span><input name="email" required type="email" placeholder="you@example.com" autoComplete="email" /></label>
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

function ChatAssistant() {
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

  const submitPhone = async (event: FormEvent) => {
    event.preventDefault()
    if (phoneDigits.length !== 10) {
      setPhoneError('Enter a valid 10-digit mobile number.')
      return
    }
    setPhoneError('')
    setIsSavingInquiry(true)
    try {
      const response = await fetch(`${apiUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (!isOpen) return
    const timeoutId = window.setTimeout(() => {
      chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen, step])

  return (
    <aside className={isOpen ? 'chat-assistant open' : 'chat-assistant'} aria-label="Score Now chat assistant">
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

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

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
          <button className="menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
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

        <AssessmentForm />

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
      <ChatAssistant />
    </div>
  )
}

function BusinessPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const businessMessage = encodeURIComponent('Hello Score Now, I would like to discuss the Business CMR Improvement Programme.')
  const shieldMessage = encodeURIComponent('Hello Score Now, I would like to discuss the Credit Shield 360 annual business membership.')

  return (
    <div className="site-shell business-page">
      <header className="site-header">
        <div className="nav-wrap">
          <Brand href="/" />
          <button className="menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button>
          <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Business navigation">
            <a href="/">Home</a><a href="/#personal-assessment">For Individuals</a><a className="active" href="/business">For Businesses</a><a href="#business-plans">Business Plans</a><a href="/#about">About Us</a><a href="/#contact">Contact</a><a className="button button-primary nav-cta" href="#business-assessment">Free Assessment <ArrowRight /></a>
          </nav>
        </div>
      </header>
      <main>
        <section className="business-page-hero">
          <div className="container business-page-grid">
            <div><p className="section-kicker">Commercial Credit Guidance</p><h1>Build a Stronger <span>Business Credit Profile</span></h1><p>Understand your CMR, identify lender-reported issues, and prepare your business for healthier funding conversations.</p><div className="hero-actions"><a className="button button-primary" href="#business-assessment">Check CMR Health <ArrowRight /></a><a className="button button-outline" href={`https://wa.me/919114141011?text=${businessMessage}`} target="_blank" rel="noreferrer"><MessageCircle /> Talk to an Expert</a></div><div className="business-trust"><span><ShieldCheck /> Secure handling</span><span><FileSearch /> Detailed CMR review</span><span><Headphones /> Expert support</span></div></div>
            <div className="business-hero-visual"><div className="business-dashboard"><div><Building2 /><span><small>Business credit health</small><strong>CMR 3</strong></span></div><ul><li><span>Payment behaviour</span><b>Strong</b></li><li><span>Credit exposure</span><b>Review</b></li><li><span>Trade lines</span><b>12 active</b></li><li><span>Lender confidence</span><b>Improving</b></li></ul><div className="business-rise"><BarChart3 /><span>Clearer profile. Better funding readiness.</span></div></div></div>
          </div>
        </section>

        <AssessmentForm business />

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
      <ChatAssistant />
    </div>
  )
}

function App() {
  return window.location.pathname.replace(/\/$/, '') === '/business' ? <BusinessPage /> : <HomePage />
}

export default App
