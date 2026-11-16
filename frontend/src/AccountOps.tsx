import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Bell, Download, RefreshCw, ShieldAlert, WalletCards } from 'lucide-react'

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

  return (
    <div className="admin-ops-panel">
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <button className="button button-outline" type="button" onClick={load}><RefreshCw /> Refresh</button>

      {canManage && (
        <section>
          <h3>Refund requests</h3>
          {refunds.length === 0 ? <p>No refund requests.</p> : (
            <table className="admin-table">
              <thead><tr><th>Customer</th><th>Payment</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td>{refund.customer_name ?? '—'}</td>
                    <td>{refund.payment_id}</td>
                    <td>{refund.reason}</td>
                    <td>{refund.status}</td>
                    <td>
                      {refund.status === 'pending' && <>
                        <button type="button" className="button button-outline" onClick={() => decideRefund(refund.id, 'approved')}>Approve</button>
                        <button type="button" className="button button-outline" onClick={() => decideRefund(refund.id, 'rejected')}>Reject</button>
                      </>}
                      {refund.status === 'approved' && <button type="button" className="button button-outline" onClick={() => decideRefund(refund.id, 'processed')}>Mark processed</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted">Refunds are reviewed here only. Money is returned manually from the payment provider dashboard.</p>
        </section>
      )}

      {canAnalyse && revenue && (
        <section>
          <h3>Revenue and commissions ({revenue.from} to {revenue.to})</h3>
          <p>Paid payments: <strong>{revenue.paidPayments}</strong> · Revenue: <strong>₹{Number(revenue.totalRevenue).toLocaleString('en-IN')}</strong></p>
          <p>Commissions pending: ₹{(revenue.commissions.pending.amountPaise / 100).toLocaleString('en-IN')} ({revenue.commissions.pending.count}) · Paid: ₹{(revenue.commissions.paid.amountPaise / 100).toLocaleString('en-IN')} ({revenue.commissions.paid.count})</p>
          <table className="admin-table">
            <thead><tr><th>Day</th><th>Paid</th><th>Revenue</th></tr></thead>
            <tbody>{revenue.daily.map((row: any) => <tr key={row.day}><td>{row.day}</td><td>{row.paidCount}</td><td>₹{Number(row.revenue).toLocaleString('en-IN')}</td></tr>)}</tbody>
          </table>
        </section>
      )}

      {canManage && (
        <section>
          <h3>Exports</h3>
          {(['customers', 'payments', 'refunds'] as const).map((kind) => (
            <button key={kind} type="button" className="button button-outline" onClick={() => downloadCsv(token, kind).catch((e) => setError(e.message))}>
              <Download /> {kind} CSV
            </button>
          ))}
        </section>
      )}

      {canSupport && (
        <section>
          <h3>Canned replies</h3>
          <ul>{replies.map((reply) => <li key={reply.id}><strong>{reply.title}</strong>: {reply.body} <button type="button" className="button button-outline" onClick={() => deleteReply(reply.id)}>Delete</button></li>)}</ul>
          <form className="inline-form" onSubmit={saveReply}>
            <input placeholder="Title" value={replyTitle} onChange={(e) => setReplyTitle(e.target.value)} aria-label="Reply title" />
            <textarea placeholder="Reply text" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} aria-label="Reply text" />
            <button className="button button-primary" type="submit">Save reply</button>
          </form>
        </section>
      )}

      {isOwner && (
        <section>
          <h3>Issue admin password reset link</h3>
          <form className="inline-form" onSubmit={issueReset}>
            <input type="email" placeholder="admin@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} aria-label="Admin email" />
            <button className="button button-outline" type="submit">Create link</button>
          </form>
          {resetLink && <p>Share this link privately. It expires in 2 hours: <code>{resetLink}</code></p>}
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
