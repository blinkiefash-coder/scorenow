import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Bell, Download, RefreshCw, ShieldAlert, WalletCards } from 'lucide-react'
import './AdminCrm.css'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type ApiError = { message?: string }

const readJson = async <T,>(response: Response): Promise<T> => {
  const data = (await response.json().catch(() => ({}))) as T & ApiError
  if (!response.ok) throw new Error(data.message || 'Request failed.')
  return data
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

const CONSENT_LABELS: Record<string, string> = {
  marketing: 'Marketing offers and updates',
  data_sharing: 'Share anonymised data to improve ScoreNow',
  push_notifications: 'App push notifications',
}

// ============================================================================
// CUSTOMER: notifications, consent, and account deletion
// ============================================================================
export function CustomerPrivacyPanel({ token, onAccountDeleted }: { token: string; onAccountDeleted: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const [consentHistory, setConsentHistory] = useState<any[]>([])
  const [confirmText, setConfirmText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const [notes, consentData] = await Promise.all([
        fetch(`${apiUrl}/api/notifications`, { headers: authHeaders(token) }).then((r) => readJson<{ notifications: any[] }>(r)),
        fetch(`${apiUrl}/api/consents`, { headers: authHeaders(token) }).then((r) => readJson<{ current: Record<string, boolean>; history: any[] }>(r)),
      ])
      setNotifications(notes.notifications)
      setConsents(consentData.current)
      setConsentHistory(consentData.history)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your settings.')
    }
  }

  useEffect(() => { void load() }, [token])

  const toggleConsent = async (type: string, granted: boolean) => {
    setError(null)
    try {
      await readJson(await fetch(`${apiUrl}/api/consents`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ type, granted }) }))
      await load()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update consent.')
    }
  }

  const markAllRead = async () => {
    await fetch(`${apiUrl}/api/notifications/read`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({}) }).catch(() => null)
    await load()
  }

  const deleteAccount = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const data = await readJson<{ message: string }>(await fetch(`${apiUrl}/api/account/delete`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ confirm: confirmText }) }))
      setMessage(data.message)
      onAccountDeleted()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete your account.')
    }
  }

  return (
    <div className="privacy-panel">
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}

      <h3><Bell /> Notifications</h3>
      {notifications.length === 0 ? <p>No notifications yet.</p> : (
        <>
          <button className="button button-outline" type="button" onClick={markAllRead}>Mark all as read</button>
          <ul className="notification-list">
            {notifications.map((note) => (
              <li key={note.id} className={note.read_at ? 'read' : 'unread'}>
                <strong>{note.title}</strong>
                <span>{note.body}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Consent</h3>
      <ul className="consent-list">
        {Object.entries(CONSENT_LABELS).map(([type, label]) => (
          <li key={type}>
            <label>
              <input type="checkbox" checked={Boolean(consents[type])} onChange={(event) => toggleConsent(type, event.target.checked)} />
              {label}
            </label>
          </li>
        ))}
      </ul>
      {consentHistory.length > 0 && (
        <details>
          <summary>Consent history</summary>
          <ul>
            {consentHistory.map((entry, index) => (
              <li key={index}>{entry.consent_type} {entry.granted ? 'granted' : 'withdrawn'} on {new Date(entry.created_at).toLocaleString()}</li>
            ))}
          </ul>
        </details>
      )}

      <h3><ShieldAlert /> Delete my account</h3>
      <p>This removes your personal details and signs you out. Payment and report records are kept as required by law.</p>
      <form className="inline-form" onSubmit={deleteAccount}>
        <label>
          Type DELETE to confirm
          <input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} aria-label="Type DELETE to confirm" />
        </label>
        <button className="button button-outline" type="submit" disabled={confirmText !== 'DELETE'}>Delete account</button>
      </form>
    </div>
  )
}

// ============================================================================
// ADMIN: refunds, revenue, exports, canned replies, admin password reset
// ============================================================================
const downloadCsv = async (token: string, kind: string) => {
  const response = await fetch(`${apiUrl}/api/admin/exports/${kind}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error('Export failed.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = `scorenow-${kind}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function AdminOpsPanel({ token, role }: { token: string; role: string }) {
  const canManage = role === 'owner' || role === 'manager'
  const canSupport = canManage || role === 'support'
  const canAnalyse = canManage || role === 'analyst'
  const isOwner = role === 'owner'
  const [refunds, setRefunds] = useState<any[]>([])
  const [replies, setReplies] = useState<any[]>([])
  const [revenue, setRevenue] = useState<any | null>(null)
  const [replyTitle, setReplyTitle] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      if (canManage) {
        const data = await fetch(`${apiUrl}/api/admin/refunds`, { headers: authHeaders(token) }).then((r) => readJson<{ refunds: any[] }>(r))
        setRefunds(data.refunds)
      }
      if (canSupport) {
        const data = await fetch(`${apiUrl}/api/admin/canned-replies`, { headers: authHeaders(token) }).then((r) => readJson<{ replies: any[] }>(r))
        setReplies(data.replies)
      }
      if (canAnalyse) {
        const data = await fetch(`${apiUrl}/api/admin/revenue`, { headers: authHeaders(token) }).then((r) => readJson<any>(r))
        setRevenue(data)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load admin data.')
    }
  }

  useEffect(() => { void load() }, [token, role])

  const decideRefund = async (id: number, decision: string) => {
    const note = window.prompt(`Optional note for ${decision}`) || ''
    try {
      await readJson(await fetch(`${apiUrl}/api/admin/refunds/${id}/decision`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ decision, note }) }))
      setMessage(`Refund ${decision}.`)
      await load()
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Unable to save the decision.')
    }
  }

  const saveReply = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await readJson(await fetch(`${apiUrl}/api/admin/canned-replies`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ title: replyTitle, body: replyBody }) }))
      setReplyTitle('')
      setReplyBody('')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the reply.')
    }
  }

  const deleteReply = async (id: string) => {
    await fetch(`${apiUrl}/api/admin/canned-replies/${id}`, { method: 'DELETE', headers: authHeaders(token) }).catch(() => null)
    await load()
  }

  const issueReset = async (event: FormEvent) => {
    event.preventDefault()
    setResetLink(null)
    try {
      const data = await readJson<{ resetUrl: string; expiresInHours: number }>(await fetch(`${apiUrl}/api/admin/team/${encodeURIComponent(resetEmail)}/password-reset`, { method: 'POST', headers: authHeaders(token) }))
      setResetLink(data.resetUrl)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to create the reset link.')
    }
  }

  const rupees = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  const pendingRefunds = refunds.filter((refund) => refund.status === 'pending').length
  const daily: any[] = revenue?.daily ?? []
  const maxDaily = Math.max(1, ...daily.map((row) => Number(row.revenue)))
  const refundTone: Record<string, string> = { pending: 's-contacted', approved: 's-new', processed: 's-paid', rejected: 's-closed' }

  return (
    <div className="crm ops">
      <header className="crm-top">
        <div><span className="crm-kicker">OPERATIONS</span><h1>Operations</h1><p>Refunds, revenue, data exports, support replies and team access in one place.</p></div>
        <button className="crm-btn ghost" type="button" onClick={load}><RefreshCw /> Refresh</button>
      </header>
      {error && <p className="dashboard-notice error" role="alert">{error}</p>}
      {message && <p className="dashboard-notice" role="status">{message}</p>}

      {(canManage || (canAnalyse && revenue)) && <section className="crm-kpis" aria-label="Summary">
        {canManage && <div className="crm-kpi"><b>{pendingRefunds}</b><small>Refunds awaiting review</small></div>}
        {canAnalyse && revenue && <>
          <div className="crm-kpi"><b>{rupees(Number(revenue.totalRevenue))}</b><small>Revenue · {revenue.paidPayments} paid payments</small></div>
          <div className="crm-kpi gold"><b>{rupees(revenue.commissions.pending.amountPaise / 100)}</b><small>Commissions pending ({revenue.commissions.pending.count})</small></div>
        </>}
      </section>}

      {canManage && (
        <section className="crm-card">
          <h2>Refund requests</h2>
          {refunds.length === 0 ? <p className="crm-empty">No refund requests. You're all caught up.</p> : (
            <div className="crm-wrap"><table className="crm-table">
              <thead><tr><th>Customer</th><th>Payment</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td><b>{refund.customer_name ?? '—'}</b></td>
                    <td><code className="ops-code">{refund.payment_id}</code></td>
                    <td>{refund.reason}</td>
                    <td><span className={`crm-tag ${refundTone[refund.status] ?? ''}`}>{refund.status}</span></td>
                    <td><span className="crm-fu-actions">
                      {refund.status === 'pending' && <>
                        <button type="button" className="crm-btn sm" onClick={() => decideRefund(refund.id, 'approved')}>Approve</button>
                        <button type="button" className="crm-btn ghost sm" onClick={() => decideRefund(refund.id, 'rejected')}>Reject</button>
                      </>}
                      {refund.status === 'approved' && <button type="button" className="crm-btn ghost sm" onClick={() => decideRefund(refund.id, 'processed')}>Mark processed</button>}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          <p className="crm-muted ops-hint">Refunds are reviewed here only. Money is returned manually from the payment provider dashboard.</p>
        </section>
      )}

      {(canAnalyse && revenue) || canManage ? <section className="crm-row">
        {canAnalyse && revenue && <div className="crm-card">
          <h2>Daily revenue</h2>
          <p className="crm-muted ops-hint">{revenue.from} to {revenue.to} · Commissions paid {rupees(revenue.commissions.paid.amountPaise / 100)} ({revenue.commissions.paid.count})</p>
          {daily.length ? daily.map((row) => <div key={row.day} className="crm-src ops-day">
            <span>{row.day}</span>
            <span className="crm-bar"><i style={{ width: `${Number(row.revenue) / maxDaily * 100}%` }} /></span>
            <span>{rupees(Number(row.revenue))}<small> · {row.paidCount}</small></span>
          </div>) : <p className="crm-empty">No paid payments in this period.</p>}
        </div>}
        {canManage && <div className="crm-card">
          <h2>Exports</h2>
          <p className="crm-muted ops-hint">Download a CSV for reporting or reconciliation.</p>
          <div className="ops-exports">
            {(['customers', 'payments', 'refunds'] as const).map((kind) => (
              <button key={kind} type="button" className="crm-act" onClick={() => downloadCsv(token, kind).catch((e) => setError(e.message))}>
                <span>Export <b>{kind}</b></span><i><Download /></i>
              </button>
            ))}
          </div>
        </div>}
      </section> : null}

      {canSupport && (
        <section className="crm-card">
          <h2>Canned replies</h2>
          <ul className="crm-fu">
            {replies.length ? replies.map((reply) => <li key={reply.id}>
              <span><b>{reply.title}</b><small>{reply.body}</small></span>
              <button type="button" className="crm-btn ghost sm" onClick={() => deleteReply(reply.id)}>Delete</button>
            </li>) : <li className="crm-muted">No saved replies yet. Add one below.</li>}
          </ul>
          <form className="crm-form ops-form" onSubmit={saveReply}>
            <input placeholder="Title, e.g. Report delayed" value={replyTitle} onChange={(e) => setReplyTitle(e.target.value)} aria-label="Reply title" />
            <textarea rows={3} placeholder="Reply text" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} aria-label="Reply text" />
            <div className="crm-acts"><button className="crm-btn" type="submit" disabled={!replyTitle.trim() || !replyBody.trim()}>Save reply</button></div>
          </form>
        </section>
      )}

      {isOwner && (
        <section className="crm-card">
          <h2>Admin password reset link</h2>
          <p className="crm-muted ops-hint">Create a one-time link for a team member who can't sign in.</p>
          <form className="crm-tools" onSubmit={issueReset}>
            <input type="email" placeholder="admin@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} aria-label="Admin email" required />
            <button className="crm-btn" type="submit">Create link</button>
          </form>
          {resetLink && <p className="crm-note">Share this link privately. It expires in 2 hours:<br /><code className="ops-code">{resetLink}</code></p>}
        </section>
      )}
    </div>
  )
}

// ============================================================================
// ADMIN: session expiry warning with extend action
// ============================================================================
// ============================================================================
// CUSTOMER: payments and invoices
// ============================================================================
type CustomerPayment = {
  id: string; report_bureau: string | null; plan_id: string | null; amount: number | string; gst_amount: number | string
  status: string; created_at: string; refund_status: string | null
}

const formatRupees = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export function CustomerPaymentsPanel({ token, onBrowsePlans }: { token: string; onBrowsePlans: () => void }) {
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const data = await fetch(`${apiUrl}/api/payments`, { headers: authHeaders(token) }).then((r) => readJson<{ payments: CustomerPayment[] }>(r))
      setPayments(data.payments)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your payments.')
    }
  }

  useEffect(() => { void load() }, [token])

  // The invoice is HTML behind a bearer token, so fetch it with the header and open a blob URL.
  const openInvoice = async (id: string) => {
    setError(null)
    const win = window.open('', '_blank', 'noopener')
    try {
      const response = await fetch(`${apiUrl}/api/payments/${id}/invoice`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Unable to open the invoice.')
      const url = URL.createObjectURL(await response.blob())
      if (win) win.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (invoiceError) {
      win?.close()
      setError(invoiceError instanceof Error ? invoiceError.message : 'Unable to open the invoice.')
    }
  }

  const paidPayments = payments.filter((payment) => payment.status === 'paid')
  const totalPaid = paidPayments.reduce((sum, payment) => sum + Number(payment.amount) + Number(payment.gst_amount), 0)

  return (
    <div className="customer-payments">
      {error && <p className="form-error">{error}</p>}
      {payments.length > 0 && (
        <div className="customer-payments-summary">
          <div><small>Total paid</small><strong>{formatRupees(totalPaid)}</strong></div>
          <div><small>Paid transactions</small><strong>{paidPayments.length}</strong></div>
          <div><small>All transactions</small><strong>{payments.length}</strong></div>
        </div>
      )}
      {payments.length === 0 && !error && (
        <div className="customer-payments-empty">
          <span><WalletCards /></span>
          <strong>No payments yet</strong>
          <small>Plans and credit report purchases will appear here, with downloadable invoices.</small>
          <button type="button" className="button button-primary" onClick={onBrowsePlans}>Browse plans <ArrowRight /></button>
        </div>
      )}
      {payments.map((payment) => {
        const total = Number(payment.amount) + Number(payment.gst_amount)
        const label = payment.plan_id ? 'Subscription plan' : `Credit report${payment.report_bureau ? ` · ${payment.report_bureau}` : ''}`
        return (
          <article className="customer-payment-row" key={payment.id}>
            <div>
              <strong>{label}</strong>
              <small>{formatRupees(total)} · {new Date(payment.created_at).toLocaleDateString('en-IN')} · {payment.status}{payment.refund_status ? ` · refund ${payment.refund_status}` : ''}</small>
            </div>
            <div className="customer-payment-actions">
              {payment.status === 'paid' && <button type="button" className="button button-outline" onClick={() => void openInvoice(payment.id)}><Download size={16} /> Invoice</button>}
            </div>
          </article>
        )
      })}
    </div>
  )
}

// ============================================================================
// ADMIN: canned reply picker for ticket replies
// ============================================================================
type CannedReply = { id: number | string; title: string; body: string }

export function CannedReplyPicker({ token, targetId }: { token: string; targetId: string }) {
  const [replies, setReplies] = useState<CannedReply[]>([])

  useEffect(() => {
    fetch(`${apiUrl}/api/admin/canned-replies`, { headers: authHeaders(token) })
      .then((r) => readJson<{ replies: CannedReply[] }>(r))
      .then((data) => setReplies(data.replies))
      .catch(() => setReplies([]))
  }, [token])

  if (replies.length === 0) return null

  // The reply textarea is uncontrolled, so the chosen body is written straight into it by id.
  const pick = (id: string) => {
    const reply = replies.find((item) => String(item.id) === id)
    const field = document.getElementById(targetId) as HTMLTextAreaElement | null
    if (reply && field) {
      field.value = reply.body
      field.focus()
    }
  }

  return (
    <label className="canned-reply-picker">Canned reply
      <select value="" onChange={(event) => pick(event.target.value)}>
        <option value="">Choose a template…</option>
        {replies.map((reply) => <option key={reply.id} value={reply.id}>{reply.title}</option>)}
      </select>
    </label>
  )
}

export function AdminSessionExpiryBanner({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!token) return
    fetch(`${apiUrl}/api/admin/session`, { headers: authHeaders(token) })
      .then((r) => readJson<{ expiresAt: string }>(r))
      .then((data) => setExpiresAt(new Date(data.expiresAt).getTime()))
      .catch(() => onExpired())
  }, [token])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  if (!expiresAt) return null
  const minutesLeft = Math.floor((expiresAt - now) / 60_000)
  if (minutesLeft > 15) return null

  const extend = async () => {
    const data = await readJson<{ expiresAt: string }>(await fetch(`${apiUrl}/api/admin/session/extend`, { method: 'POST', headers: authHeaders(token) })).catch(() => null)
    if (data) setExpiresAt(new Date(data.expiresAt).getTime())
    else onExpired()
  }

  return (
    <div className="admin-attention-item warn" role="status">
      <span>Your admin session ends in {Math.max(minutesLeft, 0)} minute{minutesLeft === 1 ? '' : 's'}.</span>
      <button type="button" className="button button-outline" onClick={extend}>Stay signed in</button>
    </div>
  )
}
