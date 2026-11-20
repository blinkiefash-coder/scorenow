import { useEffect, useState, type FormEvent } from 'react'
import { subscribeAdminStream } from './adminLive'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type ActivityRow = { id: string; actor_email: string; actor_role: string; event: string; target_email: string | null; details: Record<string, unknown> | null; created_at: string }
type PortalData = { customers: PortalCustomer[]; earnings: { pending_paise: string; paid_paise: string }; commissions: CommissionRow[] }
type MonitorData = { partners: PartnerAccount[]; activity: ActivityRow[] }

const ACTIVITY_LABELS: Record<string, string> = {
  signed_in: 'signed in', signed_out: 'signed out', invited: 'was invited', invite_accepted: 'accepted invitation',
  customer_assigned: 'customer assigned', customer_unassigned: 'customer unassigned', report_completed: 'report completed',
  commission_added: 'commission added', commission_paid: 'commission paid', commission_batch_paid: 'commissions paid in batch',
  account_disabled: 'account disabled', account_enabled: 'account enabled', payout_profile_updated: 'payout details updated',
}

function ActivityFeed({ rows, showActor }: { rows: ActivityRow[]; showActor: boolean }) {
  if (!rows.length) return <p className="admin-activity-empty">No activity recorded yet.</p>
  return (
    <ul className="admin-activity-feed" aria-label="Recent activity">
      {rows.map((row) => <li key={row.id}>
        <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
        {' '}{showActor && <strong>{row.actor_email} </strong>}
        <span>{ACTIVITY_LABELS[row.event] || row.event.replace(/_/g, ' ')}</span>
        {row.target_email && row.target_email !== row.actor_email && <> · {row.target_email}</>}
        {typeof row.details?.customerName === 'string' && <> · customer <strong>{row.details.customerName}</strong></>}
      </li>)}
    </ul>
  )
}

// Keeps a dashboard in sync with the server's live stream and reports stream health.
function useLiveSnapshot<T>(url: string, token: string, enabled: boolean) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!enabled) return
    return subscribeAdminStream<T>(url, token, {
      onSnapshot: (next) => { setData(next); setError('') },
      onError: (message) => setError(message),
      onExpired: () => setError('Your session has ended. Sign in again to see live updates.'),
    })
  }, [url, token, enabled])
  return { data, error }
}

type PortalCustomer = {
  id: string; full_name: string; assigned_at: string; application_status: string | null; customer_remark: string | null
  application_timeline: { status: string | null; remark: string | null; created_at: string }[] | null
}
type AssignedCustomer = {
  id: string; full_name: string; assigned_at: string; latest_report_status: string | null; paid: boolean; owner_email?: string
}
type CommissionRow = { id: string; amount_paise: number | string; status: 'pending' | 'paid'; note: string | null; created_at: string; paid_at: string | null; razorpay_payout_id?: string | null }
type OwnerCommission = CommissionRow & { payee_email: string }
type PartnerAccount = {
  email: string; full_name: string; role: 'partner' | 'agent'; status: string; parent_email: string | null; created_at: string
  assigned_customers: string; completed_reports: string; agent_count: string; pending_paise: string; paid_paise: string; payout_ready: boolean
  last_login: string | null; signed_in: boolean; last_activity: string | null
}
type PayoutProfileForm = { upiId: string | null; bankAccountMasked: string | null; ifsc: string | null; hasBank: boolean }
type SearchCustomer = { id: string; full_name: string; mobile: string }
type Notice = { tone: 'info' | 'error'; text: string }

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })
const jsonHeaders = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const readError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({})) as { message?: string }
  return body.message || fallback
}
const formatRupees = (paise: number | string) => `₹${(Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const reportStatusLabel = (status: string | null) => status ? status.replace(/_/g, ' ') : 'Not requested'
const reportStatusClass = (status: string | null) => status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'pending'

function CommissionTable({ rows, showPayee, onMarkPaid, busy }: {
  rows: OwnerCommission[] | CommissionRow[]; showPayee: boolean; onMarkPaid?: (row: OwnerCommission) => void; busy: boolean
}) {
  if (!rows.length) return <p className="admin-activity-empty">No commissions recorded yet.</p>
  return (
    <div className="admin-table-wrap"><table className="admin-activity-table">
      <thead><tr><th>Added</th>{showPayee && <th>Payee</th>}<th>Amount</th><th>Note</th><th>Status</th>{onMarkPaid && <th>Action</th>}</tr></thead>
      <tbody>
        {(rows as OwnerCommission[]).map((row) => <tr key={row.id}>
          <td>{formatDate(row.created_at)}</td>
          {showPayee && <td>{row.payee_email}</td>}
          <td>{formatRupees(row.amount_paise)}</td>
          <td>{row.note || '—'}</td>
          <td><span className={`admin-status ${row.status === 'paid' ? 'completed' : 'pending'}`}>{row.status}{row.paid_at ? ` · ${formatDate(row.paid_at)}` : ''}</span>{row.razorpay_payout_id && <small> {row.razorpay_payout_id}</small>}</td>
          {onMarkPaid && <td>{row.status === 'pending' ? <button className="button button-outline" type="button" disabled={busy} onClick={() => onMarkPaid(row)}>Mark paid</button> : '—'}</td>}
        </tr>)}
      </tbody>
    </table></div>
  )
}

function PayoutDetailsForm({ token }: { token: string }) {
  const [profile, setProfile] = useState<PayoutProfileForm | null>(null)
  const [fullName, setFullName] = useState('')
  const [upiId, setUpiId] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    fetch(`${apiUrl}/api/admin/portal/payout-profile`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to load your payout details.'))
        setProfile(await response.json() as PayoutProfileForm)
      })
      .catch((err: unknown) => setNotice({ tone: 'error', text: errorText(err, 'Unable to load your payout details.') }))
  }, [token])

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    fetch(`${apiUrl}/api/admin/portal/payout-profile`, {
      method: 'PUT',
      headers: jsonHeaders(token),
      body: JSON.stringify({ fullName, upiId, bankAccountNumber, ifsc }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to save your payout details.'))
        setProfile(await response.json() as PayoutProfileForm)
        setBankAccountNumber('')
        setNotice({ tone: 'info', text: 'Payout details saved.' })
      })
      .catch((err: unknown) => setNotice({ tone: 'error', text: errorText(err, 'Unable to save your payout details.') }))
      .finally(() => setBusy(false))
  }

  return <article className="dashboard-card admin-management-card">
    <div className="dashboard-card-heading"><strong>Payout details</strong><small>{profile?.upiId || profile?.bankAccountMasked ? 'Saved. Enter new details to change them.' : 'Add a UPI ID or bank account to receive commissions'}</small></div>
    {notice && <p className={`dashboard-notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
    <form className="admin-management-form" onSubmit={save}>
      <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} required /></label>
      <label>UPI ID<input value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder={profile?.upiId || 'name@bank'} maxLength={256} /></label>
      <label>Bank account number<input value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)} placeholder={profile?.bankAccountMasked || ''} inputMode="numeric" maxLength={20} /></label>
      <label>IFSC<input value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} placeholder={profile?.ifsc || 'SBIN0001234'} maxLength={11} /></label>
      <button className="button button-primary" type="submit" disabled={busy}>Save payout details</button>
    </form>
  </article>
}

type PartnerPortalPage = 'refer' | 'applications' | 'earnings' | 'all'

export function PartnerPortal({
  token, role, refreshKey, page = 'all',
}: { token: string; role: 'partner' | 'agent'; refreshKey: number; page?: PartnerPortalPage }) {
  const [manualData, setManualData] = useState<PortalData | null>(null)
  const [manualError, setManualError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [applicationError, setApplicationError] = useState('')
  const [resubmitRemark, setResubmitRemark] = useState<Record<string, string>>({})
  const [busyApplicationId, setBusyApplicationId] = useState('')
  const live = useLiveSnapshot<PortalData>(`${apiUrl}/api/admin/portal/stream`, token, true)
  const data = live.data ?? manualData
  const error = live.data ? '' : (manualError || live.error)
  const label = role === 'partner' ? 'Partner' : 'Agent'
  const statusLabel = (status: string | null) => status
    ? status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Not submitted'

  const createApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setCreating(true)
    setCreateError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/crm/applications`, {
        method: 'POST', headers: authHeaders(token), body: new FormData(form),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to submit this application.'))
      form.reset()
      setCreating(false)
      setManualError('')
    } catch (error) {
      setCreateError(errorText(error, 'Unable to submit this application.'))
      setCreating(false)
    }
  }

  const resubmitApplication = async (customerId: string, form: HTMLFormElement) => {
    const body = new FormData(form)
    setBusyApplicationId(customerId)
    setApplicationError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/crm/applications/${customerId}/resubmit`, {
        method: 'POST', headers: authHeaders(token), body,
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to resubmit this application.'))
      setResubmitRemark((current) => ({ ...current, [customerId]: '' }))
      form.reset()
    } catch (error) {
      setApplicationError(errorText(error, 'Unable to resubmit this application.'))
    } finally {
      setBusyApplicationId('')
    }
  }

  // A manual refresh (for example after an assignment change) re-reads the portal immediately.
  useEffect(() => {
    if (!refreshKey) return
    let cancelled = false
    fetch(`${apiUrl}/api/admin/portal`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to load your portal.'))
        const result = await response.json() as PortalData
        if (!cancelled) { setManualData(result); setManualError('') }
      })
      .catch((err: unknown) => { if (!cancelled) setManualError(errorText(err, 'Unable to load your portal.')) })
    return () => { cancelled = true }
  }, [token, refreshKey])

  const headingCopy = page === 'refer'
    ? { eyebrow: 'REFERRALS', title: 'Refer a customer', description: "Submit a customer's credit application and required documents." }
    : page === 'applications'
      ? { eyebrow: 'APPLICATION TRACKING', title: 'Application progress', description: 'Follow customer-facing status updates and correction requests.' }
      : page === 'earnings'
        ? { eyebrow: 'PARTNER EARNINGS', title: 'Earnings', description: 'Review your commissions and manage payout details.' }
        : { eyebrow: `${label.toUpperCase()} PORTAL`, title: 'My applications', description: "Follow each customer's application status and customer-facing updates." }
  const heading = <div className="admin-heading"><span>{headingCopy.eyebrow}</span><h1>{headingCopy.title}</h1><p>{headingCopy.description}</p></div>
  if (!data) return <>{heading}{error ? <p className="dashboard-notice error" role="alert">{error}</p> : <p className="admin-activity-empty">Loading…</p>}</>

  const completedApplications = data.customers.filter((customer) => customer.application_status === 'approved').length
  const showReferrals = role === 'partner' && (page === 'refer' || page === 'all')
  const showApplications = page === 'applications' || page === 'all'
  const showEarnings = page === 'earnings' || page === 'all'
  return <>
    {heading}
    {error && <p className="dashboard-notice error" role="alert">{error}</p>}
    {showApplications && applicationError && <p className="dashboard-notice error" role="alert">{applicationError}</p>}
    {showReferrals && <article className="dashboard-card admin-management-card">
      <div className="dashboard-card-heading"><strong>Start a credit application</strong><small>Submit one application with the customer's details and required documents.</small></div>
      {createError && <p className="dashboard-notice error" role="alert">{createError}</p>}
      <form className="admin-management-form" onSubmit={(event) => void createApplication(event)}>
        <label>Full name<input name="fullName" minLength={2} maxLength={120} required /></label>
        <label>Mobile<input name="mobile" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required /></label>
        <label>Email<input name="email" type="email" maxLength={254} required /></label>
        <label>PAN<input name="pan" pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" maxLength={10} required /></label>
        <label>Date of birth<input name="dateOfBirth" type="date" required /></label>
        <label>Gender<select name="gender" defaultValue="" required><option value="" disabled>Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
        <label>Address<input name="addressLine1" maxLength={300} required /></label>
        <label>City<input name="city" maxLength={100} required /></label>
        <label>State<input name="state" maxLength={100} required /></label>
        <label>PIN code<input name="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label>
        <label>PAN document<input name="panDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required /></label>
        <label>Aadhaar document<input name="aadhaarDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required /></label>
        <label>Other documents (optional)<input name="otherDocuments" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple /></label>
        <label>Customer-facing note<input name="customerRemark" maxLength={500} placeholder="Optional update the customer may see" /></label>
        <label className="admin-consent"><input name="customerConsent" type="checkbox" required /><span>I confirm the customer has consented to this application and document processing.</span></label>
        <button className="button button-primary" type="submit" disabled={creating}>{creating ? 'Submitting…' : 'Submit application'}</button>
      </form>
      <small className="partner-referral-help">Uploaded identity documents are available only to authorised admins. Track submitted applications under Application progress.</small>
    </article>}
    {showApplications && <>
      <section className="admin-activity" aria-label="Application summary">
        <article className="dashboard-card"><strong>{data.customers.length}</strong><small>Referred customers</small></article>
        <article className="dashboard-card"><strong>{completedApplications}</strong><small>Applications approved</small></article>
      </section>
      <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>My applications</strong><small>{data.customers.length} customers</small></div>
      {data.customers.length
        ? <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Customer</th><th>Submitted</th><th>Customer-facing status</th><th>Customer-facing remark / progress</th></tr></thead><tbody>
            {data.customers.map((customer) => <tr key={customer.id}>
              <td><strong>{customer.full_name}</strong></td>
              <td>{formatDate(customer.assigned_at)}</td>
              <td><span className={`admin-status ${customer.application_status === 'approved' ? 'completed' : customer.application_status === 'rejected' ? 'failed' : 'pending'}`}>{statusLabel(customer.application_status)}</span></td>
              <td>
                {customer.customer_remark || '—'}
                {customer.application_timeline?.length ? <details><summary>Progress timeline</summary><ul className="admin-activity-list">
                  {customer.application_timeline.map((item, index) => <li key={`${customer.id}-${index}`}>
                    <strong>{statusLabel(item.status)}</strong> · {formatDate(item.created_at)}{item.remark ? ` · ${item.remark}` : ''}
                  </li>)}
                </ul></details> : null}
                {customer.application_status === 'correction_required' && role === 'partner' && <form className="admin-inline-form" onSubmit={(event) => { event.preventDefault(); void resubmitApplication(customer.id, event.currentTarget) }}>
                  <input name="customerRemark" value={resubmitRemark[customer.id] || ''} onChange={(event) => setResubmitRemark((current) => ({ ...current, [customer.id]: event.target.value }))} maxLength={500} placeholder="Customer-facing correction update" aria-label="Correction update" />
                  <input name="panDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-label="Corrected PAN document" />
                  <input name="aadhaarDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-label="Corrected Aadhaar document" />
                  <input name="otherDocuments" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple aria-label="Additional correction documents" />
                  <button className="button button-outline" type="submit" disabled={busyApplicationId === customer.id}>Resubmit</button>
                </form>}
              </td>
            </tr>)}
          </tbody></table></div>
        : <p className="admin-activity-empty">No customers have been referred to you yet.</p>}
      </article>
    </>}
    {showEarnings && <>
      <section className="admin-activity" aria-label="Earnings summary">
        <article className="dashboard-card"><strong>{formatRupees(data.earnings.pending_paise)}</strong><small>Commission pending</small></article>
        <article className="dashboard-card"><strong>{formatRupees(data.earnings.paid_paise)}</strong><small>Commission paid</small></article>
      </section>
      <article className="dashboard-card admin-activity-card">
        <div className="dashboard-card-heading"><strong>My commissions</strong><small>Your own earnings only</small></div>
        <CommissionTable rows={data.commissions} showPayee={false} busy={false} />
      </article>
      <PayoutDetailsForm token={token} />
    </>}
  </>
}

export function PartnerMonitor({ token, enabled }: { token: string; enabled: boolean }) {
  const { data, error } = useLiveSnapshot<MonitorData>(`${apiUrl}/api/admin/partner-monitor/stream`, token, enabled)
  if (!enabled) return null
  const heading = <div className="admin-heading"><span>PARTNER MONITOR</span><h1>Partners and agents</h1><p>Live view of partner sign-ins and activity. Read-only.</p></div>
  if (!data) return <>{heading}{error ? <p className="dashboard-notice error" role="alert">{error}</p> : <p className="admin-activity-empty">Connecting…</p>}</>
  const signedIn = data.partners.filter((partner) => partner.signed_in).length
  return <>
    {heading}
    {error && <p className="dashboard-notice error" role="alert">{error}</p>}
    <section className="admin-activity" aria-label="Monitor summary">
      <article className="dashboard-card"><strong>{data.partners.length}</strong><small>Partners and agents</small></article>
      <article className="dashboard-card"><strong>{signedIn}</strong><small>Signed in now</small></article>
    </section>
    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Accounts</strong><small>{data.partners.length} accounts</small></div>
      {data.partners.length
        ? <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Signed in</th><th>Last login</th><th>Last activity</th><th>Customers</th></tr></thead><tbody>
            {data.partners.map((partner) => <tr key={partner.email}>
              <td><strong>{partner.full_name}</strong><br /><small>{partner.email}</small></td>
              <td>{partner.role}</td>
              <td><span className={`admin-status ${partner.status === 'active' ? 'completed' : 'pending'}`}>{partner.status}</span></td>
              <td><span className={`admin-status ${partner.signed_in ? 'completed' : 'pending'}`}>{partner.signed_in ? 'online' : 'offline'}</span></td>
              <td>{formatDate(partner.last_login)}</td>
              <td>{formatDate(partner.last_activity)}</td>
              <td>{partner.assigned_customers}</td>
            </tr>)}
          </tbody></table></div>
        : <p className="admin-activity-empty">No partner or agent accounts yet.</p>}
    </article>
    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Activity feed</strong><small>Latest 200 events</small></div>
      <ActivityFeed rows={data.activity} showActor />
    </article>
  </>
}

const PARTNER_PAGE_LABELS: Record<string, string> = {
  analytics: 'Analytics (aggregate numbers)',
  monitor: 'Partner monitor',
  journey: 'Signup journey (aggregate funnel)',
  customers: 'Customers (personal data)',
  assessments: 'Health assessments (personal data)',
  tickets: 'Helpline tickets (personal data)',
  crm: 'CRM (personal data)',
}

function PartnerPageAccess({ token }: { token: string }) {
  const [available, setAvailable] = useState<string[]>([])
  const [pages, setPages] = useState<string[]>([])
  const [savedPages, setSavedPages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${apiUrl}/api/admin/partner-access`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to load partner page access.'))
        const result = await response.json() as { pages: string[]; available: string[] }
        if (!cancelled) { setAvailable(result.available); setPages(result.pages); setSavedPages(result.pages) }
      })
      .catch((err: unknown) => { if (!cancelled) setNotice({ tone: 'error', text: errorText(err, 'Unable to load partner page access.') }) })
    return () => { cancelled = true }
  }, [token])

  const togglePage = (page: string) => setPages((current) => current.includes(page) ? current.filter((item) => item !== page) : [...current, page])

  const savePages = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/admin/partner-access`, {
        method: 'PUT',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to save partner page access.'))
      const result = await response.json() as { pages: string[] }
      setPages(result.pages)
      setSavedPages(result.pages)
      setNotice({ tone: 'info', text: 'Saved. Partners and agents see these pages after they reload the portal.' })
    } catch (err) {
      setNotice({ tone: 'error', text: errorText(err, 'Unable to save partner page access.') })
    } finally {
      setBusy(false)
    }
  }

  const changed = pages.length !== savedPages.length || pages.some((page) => !savedPages.includes(page))

  return <article className="dashboard-card admin-management-card">
    <div className="dashboard-card-heading"><strong>Pages partners and agents can open</strong><small>Partners always see My referrals. Turn on any other page they should see. Pages with customer personal data stay off until you enable them.</small></div>
    {notice && <p className={`dashboard-notice ${notice.tone}`} role="status">{notice.text}</p>}
    <div className="partner-page-options">
      {available.map((page) => <label key={page}>
        <input type="checkbox" checked={pages.includes(page)} onChange={() => togglePage(page)} disabled={busy} />
        {PARTNER_PAGE_LABELS[page] || page}
      </label>)}
    </div>
    <button className="button button-primary" type="button" onClick={savePages} disabled={busy || !changed}>Save page access</button>
  </article>
}

export function PartnerManagement({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [accounts, setAccounts] = useState<PartnerAccount[]>([])
  const [commissions, setCommissions] = useState<OwnerCommission[]>([])
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [detail, setDetail] = useState<{ email: string; role: 'partner' | 'agent'; customers: AssignedCustomer[] } | null>(null)
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<SearchCustomer[]>([])
  const [assignTo, setAssignTo] = useState('')
  const [newRole, setNewRole] = useState<'partner' | 'agent'>('partner')
  const [inviteLink, setInviteLink] = useState('')

  const reload = () => setReloadKey((key) => key + 1)
  const activeAccounts = accounts.filter((account) => account.status === 'active')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`${apiUrl}/api/admin/partners`, { headers: authHeaders(token) }),
      fetch(`${apiUrl}/api/admin/commissions`, { headers: authHeaders(token) }),
    ])
      .then(async ([partnersResponse, commissionsResponse]) => {
        if (!partnersResponse.ok) throw new Error(await readError(partnersResponse, 'Unable to load partners and agents.'))
        if (!commissionsResponse.ok) throw new Error(await readError(commissionsResponse, 'Unable to load commissions.'))
        const partners = await partnersResponse.json() as { accounts: PartnerAccount[] }
        const ledger = await commissionsResponse.json() as { commissions: OwnerCommission[] }
        if (!cancelled) { setAccounts(partners.accounts); setCommissions(ledger.commissions); setLoadError('') }
      })
      .catch((err: unknown) => { if (!cancelled) setLoadError(errorText(err, 'Unable to load partners and agents.')) })
    return () => { cancelled = true }
  }, [token, refreshKey, reloadKey])

  const loadDetail = async (email: string, role: 'partner' | 'agent') => {
    const response = await fetch(`${apiUrl}/api/admin/partners/${encodeURIComponent(email)}/customers?role=${role}`, { headers: authHeaders(token) })
    if (!response.ok) throw new Error(await readError(response, 'Unable to load customers.'))
    const result = await response.json() as { customers: AssignedCustomer[] }
    setDetail({ email, role, customers: result.customers })
  }

  const runAction = async (action: () => Promise<void>, failure: string) => {
    setBusy(true)
    setNotice(null)
    try {
      await action()
    } catch (err) {
      setNotice({ tone: 'error', text: errorText(err, failure) })
    } finally {
      setBusy(false)
    }
  }

  const openDetail = (account: PartnerAccount) => runAction(() => loadDetail(account.email, account.role), 'Unable to load customers.')

  const searchCustomers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runAction(async () => {
      const response = await fetch(`${apiUrl}/api/admin/customers?q=${encodeURIComponent(searchText.trim())}&page=1`, { headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to search customers.'))
      const result = await response.json() as { customers?: SearchCustomer[] }
      setSearchResults(result.customers || [])
    }, 'Unable to search customers.')
  }

  const assignCustomer = (customer: SearchCustomer) => {
    if (!assignTo) {
      setNotice({ tone: 'error', text: 'Choose a partner or agent before assigning.' })
      return
    }
    void runAction(async () => {
      const response = await fetch(`${apiUrl}/api/admin/customers/${customer.id}/assignment`, {
        method: 'PUT', headers: jsonHeaders(token), body: JSON.stringify({ ownerEmail: assignTo }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to assign this customer.'))
      setNotice({ tone: 'info', text: `${customer.full_name} assigned to ${assignTo}.` })
      setSearchResults((results) => results.filter((result) => result.id !== customer.id))
      if (detail?.email === assignTo) await loadDetail(assignTo, detail.role)
      reload()
    }, 'Unable to assign this customer.')
  }

  const removeAssignment = (customerId: string) => {
    if (!detail) return
    const { email, role } = detail
    void runAction(async () => {
      const response = await fetch(`${apiUrl}/api/admin/customers/${customerId}/assignment`, { method: 'DELETE', headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to remove this assignment.'))
      setNotice({ tone: 'info', text: 'Customer removed from this partner or agent.' })
      await loadDetail(email, role)
      reload()
    }, 'Unable to remove this assignment.')
  }

  const addCommission = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    void runAction(async () => {
      const response = await fetch(`${apiUrl}/api/admin/commissions`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ payeeEmail: form.get('payeeEmail'), amountRupees: form.get('amountRupees'), note: form.get('note') }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to record this commission.'))
      formElement.reset()
      setNotice({ tone: 'info', text: 'Commission recorded as pending.' })
      reload()
    }, 'Unable to record this commission.')
  }

  const addPartnerAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const fields = Object.fromEntries(new FormData(formElement).entries())
    setInviteLink('')
    void runAction(async () => {
      const response = await fetch(`${apiUrl}/api/admin/team/invitations`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ ...fields, role: newRole }),
      })
      const result = await response.json() as { active?: boolean; invitationUrl?: string; message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to add this account.')
      const label = newRole === 'partner' ? 'Partner' : 'Agent'
      setInviteLink(result.invitationUrl ?? '')
      setNotice({ tone: 'info', text: result.active ? `${label} account created. They can sign in now with the email, password and PIN you set.` : `${label} invite link created. Share it privately.` })
      formElement.reset()
      reload()
    }, 'Unable to add this account.')
  }

  const payPending = (account: PartnerAccount) => {
    const amount = formatRupees(account.pending_paise)
    if (!window.confirm(`Send a RazorpayX payout of ${amount} to ${account.full_name} (${account.email})? All pending commissions for this person will be paid in one transfer.`)) return
    void runAction(async () => {
      const response = await fetch(`${apiUrl}/api/admin/commissions/pay-batch`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ payeeEmail: account.email }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to send this payout.'))
      const result = await response.json() as { payoutId: string; mode: string; count: number }
      setNotice({ tone: 'info', text: `Payout ${result.payoutId} sent via ${result.mode} for ${result.count} commission${result.count === 1 ? '' : 's'}.` })
      reload()
    }, 'Unable to send this payout.')
  }

  const markPaid = (commission: OwnerCommission) => {
    if (!window.confirm(`Mark ${formatRupees(commission.amount_paise)} for ${commission.payee_email} as paid? Confirm the payout has been sent first.`)) return
    void runAction(async () => {
      const response = await fetch(`${apiUrl}/api/admin/commissions/${commission.id}/paid`, { method: 'PATCH', headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to mark this commission as paid.'))
      setNotice({ tone: 'info', text: 'Commission marked as paid.' })
      reload()
    }, 'Unable to mark this commission as paid.')
  }

  if (loadError && !accounts.length) return <>
    <div className="admin-heading"><span>PARTNER ACCESS</span><h1>Partners & agents</h1></div>
    <p className="dashboard-notice error" role="alert">{loadError}</p>
  </>

  return <>
    <div className="admin-heading"><span>PARTNER ACCESS</span><h1>Partners & agents</h1><p>Create partner and agent logins, track the customers each one referred, and record commissions.</p></div>
    {loadError && <p className="dashboard-notice error" role="alert">{loadError}</p>}
    {notice && <p className={`dashboard-notice ${notice.tone}`} role="status">{notice.text}</p>}
    <article className="dashboard-card admin-management-card">
      <div className="dashboard-card-heading"><strong>Add a partner or agent</strong><small>Set email, password and PIN so they can sign in and see only their own referrals. Leave password and PIN empty to send an invite link.</small></div>
      <form className="admin-management-form" onSubmit={addPartnerAccount}>
        <label>Full name<input name="fullName" minLength={2} maxLength={120} required /></label>
        <label>Email (login ID)<input name="email" type="email" required /></label>
        <label>Type<select value={newRole} onChange={(event) => setNewRole(event.target.value as 'partner' | 'agent')}><option value="partner">Partner</option><option value="agent">Agent (under a partner)</option></select></label>
        {newRole === 'agent' && <label>Partner (optional)<select name="partnerEmail" defaultValue="">
          <option value="">No partner</option>
          {activeAccounts.filter((account) => account.role === 'partner').map((partner) => <option value={partner.email} key={partner.email}>{partner.full_name} ({partner.email})</option>)}
        </select></label>}
        <label>Password (min 12 characters, optional)<input name="password" type="password" minLength={12} autoComplete="new-password" /></label>
        <label>6-digit PIN (optional)<input name="pin" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="off" /></label>
        <button className="button button-primary" type="submit" disabled={busy}>Add {newRole}</button>
      </form>
      {inviteLink && <label className="admin-invite-link">One-time invite link<input readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} /><small>Copy and share privately. The invite is valid for 48 hours.</small></label>}
    </article>
    <PartnerPageAccess token={token} />
    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Partners and agents</strong><small>{accounts.length} accounts</small></div>
      {accounts.length
        ? <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Account</th><th>Type</th><th>Linked to</th><th>Customers</th><th>Completed reports</th><th>Pending</th><th>Paid</th><th>Status</th><th>Payout</th><th>View</th></tr></thead><tbody>
            {accounts.map((account) => <tr key={account.email}>
              <td><strong>{account.full_name}</strong><small>{account.email}</small></td>
              <td>{account.role}</td>
              <td>{account.role === 'agent' ? (account.parent_email || 'No partner') : `${account.agent_count} agent${Number(account.agent_count) === 1 ? '' : 's'}`}</td>
              <td>{account.assigned_customers}</td>
              <td>{account.completed_reports}</td>
              <td>{formatRupees(account.pending_paise)}</td>
              <td>{formatRupees(account.paid_paise)}</td>
              <td><span className={`admin-status ${account.status === 'active' ? 'completed' : account.status === 'disabled' ? 'failed' : 'pending'}`}>{account.status}</span></td>
              <td>{account.payout_ready
                ? <button className="button button-outline" type="button" disabled={busy || Number(account.pending_paise) <= 0} onClick={() => payPending(account)}>Pay pending</button>
                : <small>No payout details</small>}</td>
              <td><button className="button button-outline" type="button" disabled={busy} onClick={() => void openDetail(account)}>View customers</button></td>
            </tr>)}
          </tbody></table></div>
        : <p className="admin-activity-empty">No partners or agents yet. Add one above.</p>}
    </article>

    {detail && <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Customers of {detail.email}</strong><small>{detail.customers.length} assigned</small></div>
      {detail.customers.length
        ? <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Customer</th><th>Assigned to</th><th>Assigned on</th><th>Payment</th><th>Report</th><th>Manage</th></tr></thead><tbody>
            {detail.customers.map((customer) => <tr key={customer.id}>
              <td><strong>{customer.full_name}</strong></td>
              <td>{customer.owner_email || detail.email}</td>
              <td>{formatDate(customer.assigned_at)}</td>
              <td><span className={`admin-status ${customer.paid ? 'completed' : 'pending'}`}>{customer.paid ? 'paid' : 'not paid'}</span></td>
              <td><span className={`admin-status ${reportStatusClass(customer.latest_report_status)}`}>{reportStatusLabel(customer.latest_report_status)}</span></td>
              <td><button className="button button-outline danger" type="button" disabled={busy} onClick={() => removeAssignment(customer.id)}>Remove</button></td>
            </tr>)}
          </tbody></table></div>
        : <p className="admin-activity-empty">No customers assigned yet.</p>}
    </article>}

    <article className="dashboard-card admin-management-card">
      <div className="dashboard-card-heading"><strong>Assign a customer</strong><small>Search by name, mobile, email, or PAN</small></div>
      <form className="admin-inline-form" onSubmit={searchCustomers}>
        <label>Search<input value={searchText} onChange={(event) => setSearchText(event.target.value)} maxLength={100} required /></label>
        <label>Assign to<select value={assignTo} onChange={(event) => setAssignTo(event.target.value)} required>
          <option value="">Choose partner or agent</option>
          {activeAccounts.map((account) => <option key={account.email} value={account.email}>{account.full_name} ({account.role})</option>)}
        </select></label>
        <button className="button button-outline" type="submit" disabled={busy}>Search</button>
      </form>
      {searchResults.length > 0 && <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Customer</th><th>Mobile</th><th>Assign</th></tr></thead><tbody>
        {searchResults.map((customer) => <tr key={customer.id}>
          <td><strong>{customer.full_name}</strong></td>
          <td>{customer.mobile}</td>
          <td><button className="button button-primary" type="button" disabled={busy || !assignTo} onClick={() => assignCustomer(customer)}>Assign</button></td>
        </tr>)}
      </tbody></table></div>}
    </article>

    <article className="dashboard-card admin-management-card">
      <div className="dashboard-card-heading"><strong>Record a commission</strong><small>Set the amount manually; payouts are marked paid once sent</small></div>
      <form className="admin-management-form" onSubmit={addCommission}>
        <label>Partner or agent<select name="payeeEmail" required defaultValue=""><option value="" disabled>Choose</option>
          {activeAccounts.map((account) => <option key={account.email} value={account.email}>{account.full_name} ({account.role})</option>)}
        </select></label>
        <label>Amount (₹)<input name="amountRupees" type="number" min="1" max="1000000" step="0.01" required /></label>
        <label>Note<input name="note" maxLength={300} placeholder="e.g. Report sold for Ravi, March" /></label>
        <button className="button button-primary" type="submit" disabled={busy}>Add commission</button>
      </form>
    </article>

    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Commission ledger</strong><small>{commissions.length} entries</small></div>
      <CommissionTable rows={commissions} showPayee busy={busy} onMarkPaid={markPaid} />
    </article>
  </>
}
