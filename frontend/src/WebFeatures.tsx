import { useState, useEffect } from 'react'
import { BrandLoader } from './BrandLoader'
import { testimonialPhotoSrc } from './siteContent'
import { X, Star, Check, Phone, Mail, ArrowRight } from 'lucide-react'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ============================================================================
// 1. LOGIN WELCOME POPUP
// ============================================================================
export interface LoginWelcomePopupProps {
  userName?: string
  token?: string
  onClose: () => void
}

export function LoginWelcomePopup({ userName = 'Customer', token, onClose }: LoginWelcomePopupProps) {
  const [panName, setPanName] = useState<string | null>(null)
  const [ready, setReady] = useState(!token)

  useEffect(() => {
    if (!token) return
    let ignore = false
    fetch(`${apiUrl}/api/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const name = data?.profile?.name_as_per_pan?.trim()
        if (!ignore && name) setPanName(name)
      })
      .catch(() => undefined)
      .finally(() => { if (!ignore) setReady(true) })
    return () => { ignore = true }
  }, [token])

  // Wait for the PAN lookup so the greeting never swaps from account name to PAN name.
  if (!ready) return null

  const displayName = panName ?? userName
  const firstName = displayName.split(' ')[0] || 'there'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog welcome-popup" role="dialog" aria-modal="true" aria-label="Welcome" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close"><X /></button>
        <div className="modal-content welcome-hello">
          <div className="welcome-stage" aria-hidden="true">
            <span className="welcome-sparkle sparkle-1">✦</span>
            <span className="welcome-sparkle sparkle-2">✦</span>
            <span className="welcome-sparkle sparkle-3">✦</span>
            <svg className="welcome-character" viewBox="0 0 160 160">
              <g className="welcome-bob">
                <line x1="80" y1="30" x2="80" y2="40" stroke="#1d4fa8" strokeWidth="4" strokeLinecap="round" />
                <circle className="welcome-antenna" cx="80" cy="26" r="7" fill="#ffb84d" />
                <rect x="36" y="40" width="88" height="80" rx="30" fill="#2f6fdb" />
                <rect x="50" y="60" width="60" height="40" rx="18" fill="#e8f1ff" />
                <circle className="welcome-eye" cx="67" cy="79" r="6" fill="#10234e" />
                <circle className="welcome-eye" cx="93" cy="79" r="6" fill="#10234e" />
                <path d="M72 89 Q80 96 88 89" stroke="#10234e" strokeWidth="3" fill="none" strokeLinecap="round" />
                <circle cx="58" cy="91" r="4" fill="#ff8fab" opacity=".6" />
                <circle cx="102" cy="91" r="4" fill="#ff8fab" opacity=".6" />
                <rect x="54" y="116" width="52" height="24" rx="12" fill="#1d4fa8" />
                <circle cx="40" cy="104" r="9" fill="#2f6fdb" />
              </g>
              <g className="welcome-wave">
                <path d="M124 100 Q146 86 138 58" stroke="#2f6fdb" strokeWidth="13" strokeLinecap="round" fill="none" />
                <circle cx="138" cy="50" r="10" fill="#ffd9b3" />
              </g>
            </svg>
          </div>
          <div className="welcome-bubble">Hi, {firstName}! 👋</div>
          <h2>Welcome to Scorenow</h2>
          {panName && <p className="welcome-pan-name">Name as per PAN: <strong>{panName}</strong></p>}
          <p>We're glad you're here. Let's take a look at your credit health together.</p>
          <button className="button button-primary" type="button" onClick={onClose}>
            Let's go <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 2. CUSTOMER PROFILE WITH AUTO-POPULATION
// ============================================================================
export interface CustomerProfileProps {
  user?: { fullName?: string; email?: string; mobile?: string; id: string }
  token?: string
}

export function CustomerProfile({ user, token }: CustomerProfileProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${apiUrl}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Failed to fetch profile')
        const data = await response.json()
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, token])

  if (loading) return <div className="profile-loading">Loading your profile...</div>
  if (error) return <div className="profile-error">{error}</div>

  const displayName = user?.fullName || profile?.customer_name || user?.email || 'Customer'

  return (
    <div className="customer-profile-card">
      <div className="profile-header">
        <div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <div className="profile-info">
          <h2>{displayName}</h2>
          <p>{user?.email}</p>
        </div>
      </div>
      <div className="profile-details">
        <div className="profile-detail">
          <Mail size={18} />
          <span>{user?.email || 'No email'}</span>
        </div>
        <div className="profile-detail">
          <Phone size={18} />
          <span>{user?.mobile || 'No phone'}</span>
        </div>
        {profile?.score_range && (
          <div className="profile-detail">
            <span className="score-badge">Score: {profile.score_range}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 3. PLANS & SERVICES PAGE
// ============================================================================
export interface Plan {
  name: string
  audience: string
  duration: string
  originalPrice: string
  offerPrice: string
  featured?: boolean
  features: string[]
}

export const DEFAULT_PLANS: Plan[] = [
  {
    name: 'Basic',
    audience: 'For report clarity and basic issue identification',
    duration: '3 months',
    originalPrice: '₹10,999',
    offerPrice: '₹7,149.35',
    features: [
      'Detailed credit report review',
      'Issue and negative remark summary',
      'Starter improvement checklist',
      'Email guidance',
    ],
  },
  {
    name: 'Standard',
    audience: 'For structured improvement with expert support',
    duration: '6 months',
    originalPrice: '₹14,999',
    offerPrice: '₹9,749.35',
    features: [
      'Everything in Basic',
      'Correction and dispute guidance',
      'One-to-one expert consultation',
      'WhatsApp and email support',
      'Progress review checkpoints',
    ],
  },
  {
    name: 'Premium',
    audience: 'For deeper credit rebuilding and loan readiness',
    duration: '9 months',
    originalPrice: '₹19,999',
    offerPrice: '₹12,999.35',
    featured: true,
    features: [
      'Everything in Standard',
      'Dedicated credit advisor',
      'Personalised improvement roadmap',
      'Continuous monitoring guidance',
      'Loan readiness assessment',
      'Priority case support',
    ],
  },
  {
    name: 'Exquisite',
    audience: 'For complex personal or commercial profiles',
    duration: '12 months',
    originalPrice: '₹25,000',
    offerPrice: '₹16,250',
    features: [
      'Senior credit strategist',
      'Personal and business report review',
      'Advanced issue-resolution support',
      'Priority consultation',
      'Custom financial health roadmap',
      'High-value loan preparation',
    ],
  },
]

export function PlansServicesPage() {
  const [plans] = useState<Plan[]>(DEFAULT_PLANS)

  return (
    <section className="plans-services-section">
      <div className="container plans-header">
        <p className="section-kicker">Our Plans & Services</p>
        <h2>Choose the Right Support for Your Credit Goals</h2>
        <p>
          From basic report analysis to comprehensive credit rebuilding, we have a plan designed for your
          financial goals and current situation.
        </p>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.name} className={`plan-card${plan.featured ? ' featured' : ''}`}>
            {plan.featured && <span className="plan-badge">Most popular</span>}
            <div className="plan-header">
              <h3>{plan.name}</h3>
              <p className="plan-audience">{plan.audience}</p>
            </div>

            <div className="plan-pricing">
              <div className="price-row">
                <span className="label">Duration</span>
                <span className="value">{plan.duration}</span>
              </div>
              <div className="price-row">
                <span className="label">Original</span>
                <span className="original-price">{plan.originalPrice}</span>
              </div>
              <div className="price-row featured-price">
                <span className="label">Offer Price</span>
                <span className="offer-price">{plan.offerPrice}</span>
              </div>
            </div>

            <ul className="plan-features">
              {plan.features.map((feature, idx) => (
                <li key={idx}>
                  <Check size={18} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button className={`button button-${plan.featured ? 'primary' : 'outline'}`} type="button">
              Choose {plan.name} <ArrowRight size={18} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// 4. TESTIMONIALS SECTION
// ============================================================================
export interface Testimonial {
  id: string
  customer_name: string
  customer_image_url?: string | null
  rating: number
  review_text: string
  result_description?: string | null
  published_at?: string | null
}

export interface TestimonialsSectionProps {
  displayLimit?: number
}

function TestimonialPhoto({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = useState(false)
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
  return src && !failed
    ? <img className="testimonial-photo" src={src} alt={`Photo of ${name}`} width={72} height={72} loading="lazy" onError={() => setFailed(true)} />
    : <span className="testimonial-photo testimonial-initials" aria-hidden="true">{initials}</span>
}

// Shows only testimonials the server returns, which are published with recorded customer consent.
export function TestimonialsSection({ displayLimit = 6 }: TestimonialsSectionProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])

  useEffect(() => {
    let active = true
    fetch(`${apiUrl}/api/testimonials`)
      .then((response) => (response.ok ? response.json() as Promise<Testimonial[]> : []))
      .then((data) => { if (active) setTestimonials(data.slice(0, displayLimit)) })
      .catch(() => { if (active) setTestimonials([]) })
    return () => { active = false }
  }, [displayLimit])

  if (testimonials.length === 0) return null

  return (
    <section className="testimonials-section" aria-labelledby="testimonials-heading">
      <div className="container testimonials-header">
        <p className="section-kicker">Success Stories</p>
        <h2 id="testimonials-heading">What Our Customers Say</h2>
        <p>Real experiences from customers who chose to share their story with Scorenow.</p>
      </div>

      <div className="testimonials-grid">
        {testimonials.map((testimonial) => (
          <figure key={testimonial.id} className="testimonial-card">
            <div className="testimonial-rating" aria-label={`Rated ${testimonial.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} aria-hidden="true" className={value <= testimonial.rating ? 'filled' : ''} fill={value <= testimonial.rating ? 'currentColor' : 'none'} />
              ))}
            </div>
            <blockquote className="testimonial-quote"><p>{testimonial.review_text}</p></blockquote>
            {testimonial.result_description && <p className="testimonial-result"><Check aria-hidden="true" /> {testimonial.result_description}</p>}
            <figcaption className="testimonial-person">
              <TestimonialPhoto name={testimonial.customer_name} src={testimonialPhotoSrc(testimonial.customer_image_url)} />
              <span><strong>{testimonial.customer_name}</strong><small>Scorenow customer</small></span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// 5. HEALTH ASSESSMENT REQUEST FORM
// ============================================================================
export interface HealthAssessmentFormProps {
  user?: { id: string; fullName?: string; mobile?: string; email?: string }
  token?: string
  onSuccess?: () => void
}

export function HealthAssessmentForm({ user, token, onSuccess }: HealthAssessmentFormProps) {
  const [type, setType] = useState<'personal' | 'business'>('personal')
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    mobile: user?.mobile || '',
    email: user?.email || '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !user) {
      setError('Please log in to submit a request')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/health-assessment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          mobile: formData.mobile,
          email: formData.email,
          requestType: type,
          description: formData.description,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to submit request')
      }

      setSuccess(true)
      setFormData({ fullName: '', mobile: '', email: '', description: '' })
      if (onSuccess) onSuccess()

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="health-assessment-form" onSubmit={handleSubmit}>
      <fieldset className="form-group assessment-type-field">
        <legend>Assessment type</legend>
        <div className="assessment-type-options">
          <label>
            <input
              type="radio"
              name="type"
              value="personal"
              checked={type === 'personal'}
              onChange={() => setType('personal')}
            />
            Personal Credit Health
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="business"
              checked={type === 'business'}
              onChange={() => setType('business')}
            />
            Business Credit Health
          </label>
        </div>
      </fieldset>

      <div className="form-group">
        <label htmlFor="fullName">Full Name *</label>
        <input
          id="fullName"
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="mobile">Mobile Number *</label>
        <input
          id="mobile"
          type="tel"
          name="mobile"
          value={formData.mobile}
          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address *</label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Additional Details</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Tell us about your current situation or specific concerns..."
          rows={4}
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">✓ Your health assessment request has been submitted successfully!</p>}

      <button className="button button-primary" type="submit" disabled={loading || !token}>
        {loading ? 'Submitting...' : 'Submit Health Assessment Request'}
      </button>
    </form>
  )
}

// ============================================================================
// 6. ADMIN HEALTH ASSESSMENT MANAGEMENT
// ============================================================================
export interface AdminHealthAssessmentProps {
  token?: string
  adminId?: string
}

export function AdminHealthAssessmentManagement({ token, adminId }: AdminHealthAssessmentProps) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'closed'>('pending')

  const fetchRequests = async () => {
    if (!token) return
    try {
      setLoading(true)
      const response = await fetch(`${apiUrl}/api/admin/health-assessment-requests?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to fetch requests')
      const data = await response.json()
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [token, filter])

  const updateStatus = async (requestId: string, status: 'pending' | 'reviewed' | 'closed') => {
    if (!token || !adminId) return
    try {
      const response = await fetch(
        `${apiUrl}/api/admin/health-assessment-requests/${requestId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      )
      if (!response.ok) throw new Error('Failed to update status')
      fetchRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  if (loading) return <BrandLoader label="Loading health assessment requests…" />
  if (error) return <div className="admin-error">{error}</div>

  return (
    <div className="admin-health-assessments">
      <div className="admin-section-header">
        <h3>Health Assessment Requests</h3>
        <div className="filter-tabs">
          {(['pending', 'reviewed', 'closed'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-tab${filter === status ? ' active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({requests.length})
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table">
        {requests.length === 0 ? (
          <p className="no-data">No {filter} health assessment requests</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Type</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.customer_name || request.full_name}</td>
                  <td>{request.request_type}</td>
                  <td>{request.mobile}</td>
                  <td>{request.email}</td>
                  <td>{new Date(request.submitted_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${request.status}`}>{request.status}</span>
                  </td>
                  <td>
                    <select
                      value={request.status}
                      onChange={(e) =>
                        updateStatus(
                          request.id,
                          e.target.value as 'pending' | 'reviewed' | 'closed',
                        )
                      }
                      className="status-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
