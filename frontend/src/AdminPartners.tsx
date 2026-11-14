import { useEffect, useState, type FormEvent } from 'react'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type PortalCustomer = { id: string; full_name: string; assigned_at: string; latest_report_status: string | null; paid: boolean; owner_email?: string }
type CommissionRow = { id: string; amount_paise: number | string; status: 'pending' | 'paid'; note: string | null; created_at: string; paid_at: string | null; razorpay_payout_id?: string | null }
type OwnerCommission = CommissionRow & { payee_email: string }
type PartnerAccount = {
  email: string; full_name: string; role: 'partner' | 'agent'; status: string; parent_email: string | null; created_at: string
  assigned_customers: string; completed_reports: string; agent_count: string; pending_paise: string; paid_paise: string; payout_ready: boolean
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

export function PartnerPortal({ token, role, refreshKey }: { token: string; role: 'partner' | 'agent'; refreshKey: number }) {
  const [data, setData] = useState<{ customers: PortalCustomer[]; earnings: { pending_paise: string; paid_paise: string }; commissions: CommissionRow[] } | null>(null)
  const [error, setError] = useState('')
  const label = role === 'partner' ? 'Partner' : 'Agent'

  useEffect(() => {
    let cancelled = false
    fetch(`${apiUrl}/api/admin/portal`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to load your portal.'))
        const result = await response.json() as { customers: PortalCustomer[]; earnings: { pending_paise: string; paid_paise: string }; commissions: CommissionRow[] }
        if (!cancelled) { setData(result); setError('') }
      })
      .catch((err: unknown) => { if (!cancelled) setError(errorText(err, 'Unable to load your portal.')) })
    return () => { cancelled = true }
  }, [token, refreshKey])

  const heading = <div className="admin-heading"><span>{label.toUpperCase()} PORTAL</span><h1>My customers</h1><p>Customers referred to you and the status of their credit report requests. Contact details are not shown here.</p></div>
  if (!data) return <>{heading}{error ? <p className="dashboard-notice error" role="alert">{error}</p> : <p className="admin-activity-empty">Loading…</p>}</>

  const completedReports = data.customers.filter((customer) => customer.latest_report_status === 'completed').length
  return <>
    {heading}
    {error && <p className="dashboard-notice error" role="alert">{error}</p>}
    <section className="admin-activity" aria-label="Partner summary">
      <article className="dashboard-card"><strong>{data.customers.length}</strong><small>Customers</small></article>
      <article className="dashboard-card"><strong>{completedReports}</strong><small>Reports completed</small></article>
      <article className="dashboard-card"><strong>{formatRupees(data.earnings.pending_paise)}</strong><small>Commission pending</small></article>
      <article className="dashboard-card"><strong>{formatRupees(data.earnings.paid_paise)}</strong><small>Commission paid</small></article>
    </section>
    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Referred customers</strong><small>{data.customers.length} customers</small></div>
      {data.customers.length
        ? <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Customer</th><th>Referred on</th><th>Payment</th><th>Report</th></tr></thead><tbody>
            {data.customers.map((customer) => <tr key={customer.id}>
              <td><strong>{customer.full_name}</strong></td>
              <td>{formatDate(customer.assigned_at)}</td>
              <td><span className={`admin-status ${customer.paid ? 'completed' : 'pending'}`}>{customer.paid ? 'paid' : 'not paid'}</span></td>
              <td><span className={`admin-status ${reportStatusClass(customer.latest_report_status)}`}>{reportStatusLabel(customer.latest_report_status)}</span></td>
            </tr>)}
          </tbody></table></div>
        : <p className="admin-activity-empty">No customers have been referred to you yet.</p>}
    </article>
    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>My commissions</strong><small>Your own earnings only</small></div>
      <CommissionTable rows={data.commissions} showPayee={false} busy={false} />
    </article>
    <PayoutDetailsForm token={token} />
  </>
}

export function PartnerManagement({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [accounts, setAccounts] = useState<PartnerAccount[]>([])
  const [commissions, setCommissions] = useState<OwnerCommission[]>([])
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [detail, setDetail] = useState<{ email: string; role: 'partner' | 'agent'; customers: PortalCustomer[] } | null>(null)
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<SearchCustomer[]>([])
  const [assignTo, setAssignTo] = useState('')

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
    const result = await response.json() as { customers: PortalCustomer[] }
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
    <div className="admin-heading"><span>PARTNER ACCESS</span><h1>Partners & agents</h1><p>Track the customers each partner and agent referred, and record commissions. Invite new partners and agents from Manage admins.</p></div>
    {loadError && <p className="dashboard-notice error" role="alert">{loadError}</p>}
    {notice && <p className={`dashboard-notice ${notice.tone}`} role="status">{notice.text}</p>}
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
        : <p className="admin-activity-empty">No partners or agents yet. Invite them from Manage admins.</p>}
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
