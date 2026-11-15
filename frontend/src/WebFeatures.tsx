import { useState, useEffect, Fragment } from 'react'
import { X, Star, Check, MapPin, Phone, Mail, MessageCircle, ArrowRight } from 'lucide-react'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ============================================================================
// 1. LOGIN WELCOME POPUP
// ============================================================================
export interface LoginWelcomePopupProps {
  userName?: string
  onClose: () => void
}

export function LoginWelcomePopup({ userName = 'Customer', onClose }: LoginWelcomePopupProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog welcome-popup" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close"><X /></button>
        <div className="modal-content">
          <div className="welcome-icon"><Check /></div>
          <h2>Welcome back, {userName}!</h2>
          <p>Your account is ready and secure. You can now access your credit profile, reports, and personalized recommendations.</p>
          <div className="welcome-features">
            <div className="welcome-feature">
              <span className="feature-icon">📊</span>
              <h3>View Your Credit Profile</h3>
              <p>Track your credit score and see what's helping or holding you back</p>
            </div>
            <div className="welcome-feature">
              <span className="feature-icon">📄</span>
              <h3>Access Your Reports</h3>
              <p>Download your detailed credit reports from all major bureaus</p>
            </div>
            <div className="welcome-feature">
              <span className="feature-icon">💡</span>
              <h3>Get Personalized Guidance</h3>
              <p>Follow expert tips tailored to improve your credit health</p>
            </div>
          </div>
          <button className="button button-primary" type="button" onClick={onClose}>
            Get started <ArrowRight />
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
  customer_image_url?: string
  rating: number
  review_text: string
  result_description?: string
  published_at?: string
}

export interface TestimonialsSectionProps {
  displayLimit?: number
}

export function TestimonialsSection({ displayLimit = 6 }: TestimonialsSectionProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/testimonials`)
        if (!response.ok) throw new Error('Failed to fetch testimonials')
        const data = await response.json()
        setTestimonials(data.slice(0, displayLimit))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load testimonials')
        // Use fallback testimonials for display
        setTestimonials(DEFAULT_TESTIMONIALS.slice(0, displayLimit))
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [displayLimit])

  const displayedTestimonials = testimonials.length > 0 ? testimonials : DEFAULT_TESTIMONIALS.slice(0, displayLimit)

  return (
    <section className="testimonials-section">
      <div className="container testimonials-header">
        <p className="section-kicker">Success Stories</p>
        <h2>Trusted by Thousands of Indians</h2>
        <p>See how our clients have improved their credit profiles and achieved their financial goals.</p>
      </div>

      <div className="testimonials-grid">
        {displayedTestimonials.map((testimonial) => (
          <article key={testimonial.id} className="testimonial-card">
            <div className="testimonial-header">
              {testimonial.customer_image_url ? (
                <img src={testimonial.customer_image_url} alt={testimonial.customer_name} className="customer-image" />
              ) : (
                <div className="customer-avatar">{testimonial.customer_name.charAt(0).toUpperCase()}</div>
              )}
              <div className="customer-info">
                <h3>{testimonial.customer_name}</h3>
                <div className="rating">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < testimonial.rating ? 'filled' : ''}
                      fill={i < testimonial.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="review-text">"{testimonial.review_text}"</p>
            {testimonial.result_description && (
              <div className="result-description">
                <strong>Result:</strong> {testimonial.result_description}
              </div>
            )}
          </article>
        ))}
      </div>

      {loading && <p className="text-center">Loading testimonials...</p>}
      {error && !testimonials.length && <p className="text-center error">{error}</p>}
    </section>
  )
}

// Default testimonials for fallback display
const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    customer_name: 'Rajesh Kumar',
    rating: 5,
    review_text:
      'My credit score improved from 520 to 720 in just 6 months. The personalized guidance was exceptional and the team was always available to help.',
    result_description: 'Improved score by 200 points, approved for home loan',
  },
  {
    id: '2',
    customer_name: 'Priya Sharma',
    rating: 5,
    review_text:
      'I had multiple negative remarks on my report. ScoreNow helped me dispute them and get them removed. Highly recommended!',
    result_description: '8 incorrect remarks removed, score increased by 85 points',
  },
  {
    id: '3',
    customer_name: 'Amit Patel',
    rating: 5,
    review_text: 'The detailed report analysis showed me exactly what was affecting my score. Now I know exactly what to work on.',
    result_description: 'Identified root causes, built improvement plan',
  },
  {
    id: '4',
    customer_name: 'Neha Singh',
    rating: 5,
    review_text:
      'Professional, knowledgeable, and supportive. They treated my credit rebuild like a personal mission. Thank you!',
    result_description: 'Achieved excellent credit profile, ready for business loans',
  },
  {
    id: '5',
    customer_name: 'Vikram Desai',
    rating: 5,
    review_text:
      'As a business owner, managing personal and commercial credit seemed overwhelming. ScoreNow made it simple and effective.',
    result_description: 'Both profiles improved, secured business expansion financing',
  },
  {
    id: '6',
    customer_name: 'Anjali Gupta',
    rating: 5,
    review_text: 'Clear communication, practical advice, and consistent follow-up. They really care about your success.',
    result_description: 'Score improved to 750+, loan approved at best rates',
  },
]

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
      <div className="form-group">
        <label>Assessment Type</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="type"
              value="personal"
              checked={type === 'personal'}
              onChange={(e) => setType('personal')}
            />
            Personal Credit Health
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="business"
              checked={type === 'business'}
              onChange={(e) => setType('business')}
            />
            Business Credit Health
          </label>
        </div>
      </div>

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

  if (loading) return <div className="admin-loading">Loading health assessment requests...</div>
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
