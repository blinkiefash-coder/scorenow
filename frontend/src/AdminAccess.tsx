import { useEffect, useState, type FormEvent } from 'react'
import { apiUrl } from './siteContent'
import { roleLabel } from './adminAccessShared'

type Notice = { tone: 'info' | 'error'; text: string }
type StaffRole = 'manager' | 'support' | 'analyst'
type ManagedRole = StaffRole | 'partner' | 'agent'

export type TeamMember = {
  email: string; full_name: string; role: ManagedRole; status: string; created_at: string
  parent_email?: string | null; permissions?: string[] | null; customer_scope?: 'all' | 'assigned'
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })
const jsonHeaders = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
const readError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({})) as { message?: string }
  return body.message || fallback
}
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// Mirrors the server's role ceilings; the server rejects anything outside them.
const STAFF_ROLE_MODULES: Record<StaffRole, string[]> = {
  manager: ['overview', 'customers', 'reports', 'analytics', 'tickets', 'failed', 'health', 'audit', 'crm', 'content', 'monitor', 'assessments', 'ops'],
  support: ['customers', 'tickets', 'crm', 'assessments', 'ops'],
  analyst: ['customers', 'analytics', 'ops'],
}
const MODULE_LABELS: Record<string, string> = {
  overview: 'Overview & activity', customers: 'Customers', reports: 'Credit score checker', analytics: 'Analytics & revenue',
  tickets: 'Helpline tickets', failed: 'Failed operations', health: 'System health', audit: 'Audit log', crm: 'CRM & applications',
  content: 'Site content', monitor: 'Partner monitor', assessments: 'Health assessments', ops: 'Operations (refunds, exports)',
}
const PARTNER_ABILITY_LABELS: Record<string, string> = {
  assign_agents: 'Assign their customers to their agents',
  manage_agents: 'Create, enable and disable their own agents',
}
const DEFAULT_PARTNER_ABILITIES = ['assign_agents']
const ROLE_LABELS: Record<ManagedRole, string> = { manager: 'Admin', support: 'Support', analyst: 'Analyst', partner: 'Partner', agent: 'Agent' }

// Super Admin editor for one account's role, module permissions, customer scope and parent partner.
export function AccessEditor({ token, member, partners, onSaved, onClose }: {
  token: string; member: TeamMember; partners: TeamMember[]; onSaved: () => void; onClose: () => void
}) {
  const [role, setRole] = useState<ManagedRole>(member.role)
  const [selected, setSelected] = useState<string[]>(() => member.permissions ?? (member.role === 'partner' ? DEFAULT_PARTNER_ABILITIES : STAFF_ROLE_MODULES[member.role as StaffRole] ?? []))
  const [customerScope, setCustomerScope] = useState<'all' | 'assigned'>(member.customer_scope ?? 'all')
  const [parentEmail, setParentEmail] = useState(member.parent_email ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const options = role === 'partner' ? Object.keys(PARTNER_ABILITY_LABELS) : role === 'agent' ? [] : STAFF_ROLE_MODULES[role as StaffRole]
  const changeRole = (next: ManagedRole) => {
    setRole(next)
    setSelected(next === 'partner' ? DEFAULT_PARTNER_ABILITIES : next === 'agent' ? [] : [...STAFF_ROLE_MODULES[next as StaffRole]])
  }
  const toggle = (value: string) => setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/team/${encodeURIComponent(member.email)}/access`, {
        method: 'PATCH',
        headers: jsonHeaders(token),
        body: JSON.stringify({
          role,
          permissions: role === 'agent' ? null : options.filter((option) => selected.includes(option)),
          customerScope: role === 'partner' || role === 'agent' ? 'all' : customerScope,
          parentEmail: role === 'agent' && parentEmail ? parentEmail : null,
        }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to update access.'))
      onSaved()
    } catch (saveError) {
      setError(errorText(saveError, 'Unable to update access.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-dialog-backdrop" role="presentation" onClick={onClose}>
      <form className="admin-dialog access-editor" role="dialog" aria-modal="true" aria-labelledby="access-editor-title" onClick={(event) => event.stopPropagation()} onSubmit={(event) => void save(event)}>
        <h2 id="access-editor-title">Access for {member.full_name}</h2>
        <p className="access-editor-email">{member.email}</p>
        <label>Role<select value={role} onChange={(event) => changeRole(event.target.value as ManagedRole)}>
          {(Object.keys(ROLE_LABELS) as ManagedRole[]).map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
        </select></label>

        {role === 'agent' && <label>Belongs to partner<select value={parentEmail} onChange={(event) => setParentEmail(event.target.value)}>
          <option value="">No partner (assigned by Super Admin)</option>
          {partners.map((partner) => <option key={partner.email} value={partner.email}>{partner.full_name} · {partner.email}</option>)}
        </select></label>}

        {options.length > 0 && <fieldset className="access-editor-options">
          <legend>{role === 'partner' ? 'Partner permissions' : 'Modules this account can use'}</legend>
          {options.map((option) => <label key={option} className="admin-checkbox"><input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} /> {role === 'partner' ? PARTNER_ABILITY_LABELS[option] : MODULE_LABELS[option] ?? option}</label>)}
        </fieldset>}

        {role !== 'partner' && role !== 'agent' && <fieldset className="access-editor-options">
          <legend>Customer access</legend>
          <label className="admin-checkbox"><input type="radio" name="scope" checked={customerScope === 'all'} onChange={() => setCustomerScope('all')} /> All customers</label>
          <label className="admin-checkbox"><input type="radio" name="scope" checked={customerScope === 'assigned'} onChange={() => setCustomerScope('assigned')} /> Only customers assigned to this account</label>
        </fieldset>}

        {role === 'agent' && <p className="access-editor-hint">Agents only ever see customers assigned to them and their own verification tasks.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="admin-dialog-actions">
          <button className="button button-outline" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save access'}</button>
        </div>
      </form>
    </div>
  )
}

type StaffAssignment = { admin_email: string; full_name: string | null; role: string | null; created_at: string }

// Super Admin: allocate one customer to individual Admin/Support/Analyst accounts.
export function StaffAssignmentPanel({ token, customerId }: { token: string; customerId: string }) {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([])
  const [staff, setStaff] = useState<TeamMember[]>([])
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch(`${apiUrl}/api/admin/customers/${customerId}/staff-assignments`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to load assignments.'))
        const result = await response.json() as { assignments: StaffAssignment[] }
        if (active) setAssignments(result.assignments)
      })
      .catch((loadError: unknown) => { if (active) setError(errorText(loadError, 'Unable to load assignments.')) })
    fetch(`${apiUrl}/api/admin/team`, { headers: authHeaders(token) })
      .then((response) => (response.ok ? response.json() as Promise<{ admins?: TeamMember[] }> : { admins: [] }))
      .then((result) => { if (active) setStaff((result.admins ?? []).filter((member) => ['manager', 'support', 'analyst'].includes(member.role))) })
      .catch(() => undefined)
    return () => { active = false }
  }, [token, customerId])

  const change = async (method: 'PUT' | 'DELETE', email: string) => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/customers/${customerId}/staff-assignments${method === 'DELETE' ? `/${encodeURIComponent(email)}` : ''}`, {
        method, headers: jsonHeaders(token), body: method === 'PUT' ? JSON.stringify({ adminEmail: email }) : undefined,
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to update the assignment.'))
      setAssignments((await response.json() as { assignments: StaffAssignment[] }).assignments)
      setChoice('')
    } catch (changeError) {
      setError(errorText(changeError, 'Unable to update the assignment.'))
    } finally {
      setBusy(false)
    }
  }

  const available = staff.filter((member) => member.status === 'active' && !assignments.some((item) => item.admin_email === member.email))
  return (
    <div className="staff-assignment-panel">
      <strong>Assigned admins</strong>
      <small>Admins limited to “assigned customers” can only see this customer if they are listed here.</small>
      {assignments.length ? <ul>{assignments.map((item) => <li key={item.admin_email}>
        <span>{item.full_name || item.admin_email} <small>{roleLabel(item.role ?? '')} · {item.admin_email}</small></span>
        <button className="button button-outline admin-small-button" type="button" disabled={busy} onClick={() => void change('DELETE', item.admin_email)}>Remove</button>
      </li>)}</ul> : <p className="admin-activity-empty">Not assigned to any admin.</p>}
      {available.length > 0 && <div className="staff-assignment-add">
        <select value={choice} onChange={(event) => setChoice(event.target.value)} aria-label="Admin to assign">
          <option value="">Choose an admin…</option>
          {available.map((member) => <option key={member.email} value={member.email}>{member.full_name} · {roleLabel(member.role)}</option>)}
        </select>
        <button className="button button-primary admin-small-button" type="button" disabled={busy || !choice} onClick={() => void change('PUT', choice)}>Assign</button>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}

type PartnerAgent = { email: string; full_name: string; status: string; created_at: string; assigned_customers: number; interactions_30d: number; last_interaction: string | null }
type PortalCustomerRow = { id: string; full_name: string; owner_email?: string; application_status: string | null }
type PortalSnapshot = { abilities?: string[]; agents?: PartnerAgent[]; customers: PortalCustomerRow[] }

const usePortal = (token: string, refreshKey: number) => {
  const [data, setData] = useState<PortalSnapshot | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    fetch(`${apiUrl}/api/admin/portal`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to load your portal.'))
        const result = await response.json() as PortalSnapshot
        if (active) { setData(result); setError('') }
      })
      .catch((loadError: unknown) => { if (active) setError(errorText(loadError, 'Unable to load your portal.')) })
    return () => { active = false }
  }, [token, refreshKey, reload])
  return { data, error, reload: () => setReload((value) => value + 1) }
}

// Partner: their agents, agent performance, and who holds each of their customers.
export function PartnerAgentsPanel({ token, refreshKey }: { token: string; refreshKey: number }) {
  const { data, error, reload } = usePortal(token, refreshKey)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const abilities = data?.abilities ?? []
  const canManage = abilities.includes('manage_agents')
  const canAssign = abilities.includes('assign_agents')
  const agents = data?.agents ?? []

  const request = async (url: string, method: string, body: unknown, success: string) => {
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch(url, { method, headers: jsonHeaders(token), body: JSON.stringify(body) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to save this change.'))
      setNotice({ tone: 'info', text: success })
      reload()
      return true
    } catch (requestError) {
      setNotice({ tone: 'error', text: errorText(requestError, 'Unable to save this change.') })
      return false
    } finally {
      setBusy(false)
    }
  }

  const createAgent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const created = await request(`${apiUrl}/api/admin/portal/agents`, 'POST', Object.fromEntries(form.entries()), 'Agent created. Share the email, password and PIN with them securely.')
    if (created) setFormKey((key) => key + 1)
  }

  const heading = <div className="admin-heading"><span>PARTNER TEAM</span><h1>My agents</h1><p>Manage your agents, see how they are performing, and decide which agent handles each of your customers.</p></div>
  if (!data) return <>{heading}{error ? <p className="dashboard-notice error" role="alert">{error}</p> : <p className="admin-activity-empty">Loading…</p>}</>

  return <>
    {heading}
    {notice && <p className={`dashboard-notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
    {canManage && <article className="dashboard-card admin-management-card">
      <div className="dashboard-card-heading"><strong>Add an agent</strong><small>The agent signs in at the admin login with these details</small></div>
      <form key={formKey} className="admin-management-form" onSubmit={(event) => void createAgent(event)}>
        <label>Full name<input name="fullName" minLength={2} maxLength={120} required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label>
        <label>6-digit PIN<input name="pin" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="off" /></label>
        <button className="button button-primary" type="submit" disabled={busy}>Create agent</button>
      </form>
    </article>}

    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Agents</strong><small>{agents.length} in your team{canManage ? '' : ' · Ask the Super Admin to add or remove agents'}</small></div>
      {agents.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
        <thead><tr><th>Agent</th><th>Status</th><th>Customers</th><th>Follow-ups (30 days)</th><th>Last follow-up</th>{canManage && <th>Action</th>}</tr></thead>
        <tbody>{agents.map((agent) => <tr key={agent.email}>
          <td><strong>{agent.full_name}</strong><small>{agent.email}</small></td>
          <td><span className={`admin-status ${agent.status === 'active' ? 'completed' : agent.status === 'disabled' ? 'failed' : 'pending'}`}>{agent.status}</span></td>
          <td>{agent.assigned_customers}</td>
          <td>{agent.interactions_30d}</td>
          <td>{formatDate(agent.last_interaction)}</td>
          {canManage && <td>{agent.status !== 'invited' && <button className="button button-outline admin-small-button" type="button" disabled={busy} onClick={() => void request(`${apiUrl}/api/admin/portal/agents/${encodeURIComponent(agent.email)}/status`, 'PATCH', { status: agent.status === 'disabled' ? 'active' : 'disabled' }, agent.status === 'disabled' ? 'Agent enabled.' : 'Agent disabled. They have been signed out.')}>{agent.status === 'disabled' ? 'Enable' : 'Disable'}</button>}</td>}
        </tr>)}</tbody>
      </table></div> : <p className="admin-activity-empty">No agents in your team yet.</p>}
    </article>

    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Customer allocation</strong><small>{canAssign ? 'Choose who handles each customer' : 'View only · the Super Admin controls allocation'}</small></div>
      {data.customers.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
        <thead><tr><th>Customer</th><th>Status</th><th>Handled by</th></tr></thead>
        <tbody>{data.customers.map((customer) => <tr key={customer.id}>
          <td><strong>{customer.full_name}</strong></td>
          <td>{customer.application_status ? customer.application_status.replaceAll('_', ' ') : 'Not submitted'}</td>
          <td>{canAssign
            ? <select aria-label={`Who handles ${customer.full_name}`} value={agents.some((agent) => agent.email === customer.owner_email) ? customer.owner_email : ''} disabled={busy}
                onChange={(event) => void request(`${apiUrl}/api/admin/portal/customers/${customer.id}/agent`, 'PUT', { agentEmail: event.target.value || null }, `${customer.full_name} reassigned.`)}>
                <option value="">Me (partner)</option>
                {agents.filter((agent) => agent.status === 'active' || agent.email === customer.owner_email).map((agent) => <option key={agent.email} value={agent.email}>{agent.full_name}</option>)}
              </select>
            : agents.find((agent) => agent.email === customer.owner_email)?.full_name ?? 'Me (partner)'}</td>
        </tr>)}</tbody>
      </table></div> : <p className="admin-activity-empty">No customers assigned to you yet.</p>}
    </article>
  </>
}

type Interaction = {
  id: string; user_id: string; customer_name: string; actor_email: string; actor_role: string
  channel: string; outcome: string; note: string; next_follow_up_at: string | null; created_at: string
}
const CHANNELS: Record<string, string> = { call: 'Phone call', whatsapp: 'WhatsApp', email: 'Email', visit: 'In person', note: 'Internal note' }
const OUTCOMES: Record<string, string> = {
  contacted: 'Contacted', not_reachable: 'Not reachable', interested: 'Interested', not_interested: 'Not interested',
  follow_up: 'Follow-up needed', documents_pending: 'Documents pending', converted: 'Converted',
}

// Partner and agent follow-ups: log interactions and track upcoming follow-ups for in-scope customers.
export function FollowUpsPanel({ token, refreshKey, role }: { token: string; refreshKey: number; role: 'partner' | 'agent' }) {
  const { data } = usePortal(token, refreshKey)
  const [interactions, setInteractions] = useState<Interaction[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const [formKey, setFormKey] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    fetch(`${apiUrl}/api/admin/portal/interactions`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to load follow-ups.'))
        const result = await response.json() as { interactions: Interaction[] }
        if (active) { setInteractions(result.interactions); setNow(Date.now()) }
      })
      .catch((loadError: unknown) => { if (active) setError(errorText(loadError, 'Unable to load follow-ups.')) })
    return () => { active = false }
  }, [token, refreshKey, reload])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const customerId = String(form.get('customerId') || '')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/portal/customers/${customerId}/interactions`, {
        method: 'POST', headers: jsonHeaders(token),
        body: JSON.stringify({ channel: form.get('channel'), outcome: form.get('outcome'), note: form.get('note'), nextFollowUpAt: form.get('nextFollowUpAt') || null }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to save this follow-up.'))
      setNotice('Follow-up saved.')
      setFormKey((key) => key + 1)
      setReload((value) => value + 1)
    } catch (saveError) {
      setError(errorText(saveError, 'Unable to save this follow-up.'))
    } finally {
      setBusy(false)
    }
  }

  const upcoming = (interactions ?? [])
    .filter((item) => item.next_follow_up_at)
    .filter((item, index, list) => list.findIndex((other) => other.user_id === item.user_id) === index)
    .sort((a, b) => new Date(a.next_follow_up_at!).getTime() - new Date(b.next_follow_up_at!).getTime())
  const customers = data?.customers ?? []

  return <>
    <div className="admin-heading"><span>{role === 'partner' ? 'PARTNER' : 'AGENT'} FOLLOW-UPS</span><h1>Follow-ups</h1><p>{role === 'partner' ? 'Record and review customer interactions across your team.' : 'Record every customer interaction and keep track of your next follow-ups.'}</p></div>
    {error && <p className="dashboard-notice error" role="alert">{error}</p>}
    {notice && <p className="dashboard-notice info" role="status">{notice}</p>}

    <section className="admin-activity" aria-label="Follow-up summary">
      <article className="dashboard-card"><strong>{customers.length}</strong><small>{role === 'partner' ? 'Team customers' : 'My customers'}</small></article>
      <article className="dashboard-card"><strong>{(interactions ?? []).filter((item) => now - new Date(item.created_at).getTime() < 30 * 86400000).length}</strong><small>Interactions (30 days)</small></article>
      <article className="dashboard-card"><strong>{upcoming.filter((item) => new Date(item.next_follow_up_at!).getTime() < now).length}</strong><small>Overdue follow-ups</small></article>
    </section>

    <article className="dashboard-card admin-management-card">
      <div className="dashboard-card-heading"><strong>Log an interaction</strong><small>Internal record · not visible to the customer</small></div>
      {customers.length ? <form key={formKey} className="admin-management-form" onSubmit={(event) => void save(event)}>
        <label>Customer<select name="customerId" required defaultValue=""><option value="" disabled>Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}</select></label>
        <label>Channel<select name="channel" required defaultValue="call">{Object.entries(CHANNELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Outcome<select name="outcome" required defaultValue="contacted">{Object.entries(OUTCOMES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Next follow-up (optional)<input name="nextFollowUpAt" type="datetime-local" /></label>
        <label className="admin-form-wide">Notes<textarea name="note" minLength={3} maxLength={2000} rows={3} required placeholder="What was discussed and what happens next" /></label>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save follow-up'}</button>
      </form> : <p className="admin-activity-empty">No customers are assigned to you yet.</p>}
    </article>

    {upcoming.length > 0 && <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Upcoming follow-ups</strong><small>Latest planned follow-up per customer</small></div>
      <ul className="followup-list">{upcoming.map((item) => <li key={item.id} className={new Date(item.next_follow_up_at!).getTime() < now ? 'is-overdue' : ''}>
        <strong>{item.customer_name}</strong><span>{formatDate(item.next_follow_up_at)}</span><small>{OUTCOMES[item.outcome] ?? item.outcome}{role === 'partner' ? ` · ${item.actor_email}` : ''}</small>
      </li>)}</ul>
    </article>}

    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Interaction history</strong><small>{interactions?.length ?? 0} records</small></div>
      {interactions === null ? <p className="admin-activity-empty">Loading…</p> : interactions.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
        <thead><tr><th>When</th><th>Customer</th><th>Channel</th><th>Outcome</th><th>Notes</th>{role === 'partner' && <th>By</th>}</tr></thead>
        <tbody>{interactions.map((item) => <tr key={item.id}>
          <td>{formatDate(item.created_at)}</td>
          <td><strong>{item.customer_name}</strong></td>
          <td>{CHANNELS[item.channel] ?? item.channel}</td>
          <td><span className={`admin-status ${item.outcome === 'converted' ? 'completed' : item.outcome === 'not_interested' || item.outcome === 'not_reachable' ? 'failed' : 'pending'}`}>{OUTCOMES[item.outcome] ?? item.outcome}</span></td>
          <td>{item.note}{item.next_follow_up_at && <small><br />Next: {formatDate(item.next_follow_up_at)}</small>}</td>
          {role === 'partner' && <td>{item.actor_email}</td>}
        </tr>)}</tbody>
      </table></div> : <p className="admin-activity-empty">No interactions recorded yet.</p>}
    </article>
  </>
}
