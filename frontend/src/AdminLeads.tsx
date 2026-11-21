import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Check, Clock3, Phone, Plus, X } from 'lucide-react'
import './AdminCrm.css'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type LeadStatus = 'new' | 'contacted' | 'follow_up' | 'converted' | 'lost'
type Lead = {
  id: string; name: string; phone: string; email: string | null; product: string; source: string
  partnerEmail: string | null; partnerName: string | null; partnerStage: string | null
  status: LeadStatus; step: number; nextCall: string; received: string; due: boolean
  disputeStage: number | null; stageStarted: string | null; disputeEta: string | null; disputeBureau: string | null
  scores: Record<string, { from: number; to: number }>; targetScore: number; cmrRank: number | null; paymentPending: number
  acceptance: 'pending' | 'accepted' | 'rejected' | null; acceptanceReason: string | null; userId: string | null
}
type LogEntry = { id: number; body: string; createdBy: string; date: string }
type Options = {
  sources: string[]; products: string[]; statuses: LeadStatus[]; steps: string[]; disputeStages: string[]; disputeSla: number[]
  disputeHow: string[]; bureaus: string[]; partnerStages: string[]; outcomes: string[]
}
type LeadData = {
  today: string; leads: Lead[]; filteredTotal: number
  summary: {
    total: number; due: number; converted: number; byStatus: Record<LeadStatus, number>
    bySource: { source: string; count: number }[]; byDispute: { stage: string; count: number }[]; disputeCases: number; openCases: number; casesDueSoon: number
    paymentPending: { amount: number; customers: number }; dueLeads: Lead[]; pendingAcceptance: number
  }
  partners: { email: string; name: string; area: string | null; total: number; open: number; converted: number; pending: number }[]
  notifications: { id: number; leadId: string | null; leadName: string; toEmail: string | null; body: string; delivery: string; createdAt: string }[]
  permissions: { canDecide: boolean; canDelete: boolean; canEditPartners: boolean; partnerScoped: boolean }
  options: Options
}

const STATUS_LABEL: Record<LeadStatus, string> = { new: 'New', contacted: 'Contacted', follow_up: 'Follow-up', converted: 'Converted', lost: 'Lost' }
const STATUS_TONE: Record<LeadStatus, string> = { new: 's-new', contacted: 's-contacted', follow_up: 's-interested', converted: 's-paid', lost: 's-lost' }
const STATUS_ICON = { new: Plus, contacted: Phone, follow_up: Clock3, converted: Check, lost: X }
const DONUT_COLORS = ['#0b5fd1', '#0f3d9c', '#27a3e8', '#f2b01e', '#d9951a', '#b3261e', '#13795b']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (date: string | null) => { if (!date) return '—'; const [, m, d] = date.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]}` }
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5)
const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}/api/admin/crm/leads${path}`, { ...init, headers: headers(token) })
  const data = await response.json().catch(() => ({})) as T & { message?: string }
  if (!response.ok) throw new Error(data.message || 'Request failed.')
  return data
}

export function LeadDesk({ token, refreshKey = 0, title = 'Agent dashboard' }: { token: string; refreshKey?: number; title?: string }) {
  const [data, setData] = useState<LeadData | null>(null)
  const [version, setVersion] = useState(0)
  const [filters, setFilters] = useState({ q: '', source: '', partner: '', status: '', dispute: '' })
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
    const timer = window.setTimeout(() => {
      api<LeadData>(token, `?${params}`)
        .then((result) => { if (!cancelled) setData(result) })
        .catch((error: Error) => { if (!cancelled) setNotice({ tone: 'error', text: error.message }) })
    }, filters.q ? 250 : 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [token, filters, version, refreshKey])

  const reload = () => setVersion((value) => value + 1)
  const setFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }))
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const filterStatus = (status: LeadStatus) => { setFilter('status', filters.status === status ? '' : status); scrollTo('ld-leads') }
  const filterCase = (value: string) => { setFilter('dispute', filters.dispute === value ? '' : value); scrollTo('ld-leads') }

  if (!data) return <div className="crm"><header className="crm-top" id="ld-top"><div><h1>{title}</h1><p>{notice?.text ?? 'Loading leads…'}</p></div></header></div>

  const { summary, options, permissions } = data
  const maxSource = Math.max(1, ...summary.bySource.map((item) => item.count))

  return (
    <div className="crm">
      <header className="crm-top" id="ld-top">
        <div><h1>{title}</h1><p>{permissions.partnerScoped ? 'Leads you send to Scorenow, with today’s follow-ups and conversions.' : 'Leads received by source, including franchise partners, plus today’s follow-ups and conversions.'}</p></div>
        <button className="crm-btn" type="button" onClick={() => setAdding(true)}>Add lead</button>
      </header>
      {notice && <p className={`dashboard-notice ${notice.tone === 'error' ? 'error' : ''}`} role="status">{notice.text}</p>}

      <div className="crm-actions">
        <button className="crm-act" type="button" onClick={() => setAdding(true)}><span>Add a <b>new lead</b></span><i><ArrowRight /></i></button>
        <button className="crm-act" type="button" onClick={() => scrollTo('ld-partners')}><span>See <b>franchise partner</b> leads{summary.pendingAcceptance ? ` (${summary.pendingAcceptance} to review)` : ''}</span><i><ArrowRight /></i></button>
        <button className="crm-act" type="button" onClick={() => { setFilter('status', 'follow_up'); scrollTo('ld-leads') }}><span>Work on <b>follow-up calls</b></span><i><ArrowRight /></i></button>
      </div>

      <section className="crm-kpis" aria-label="Summary">
        <div className="crm-kpi"><b>{summary.total}</b><small>Leads received</small></div>
        <div className="crm-kpi"><b>{summary.due}</b><small>Need a call today</small></div>
        <div className="crm-kpi gold"><b>{summary.total ? Math.round(summary.converted / summary.total * 100) : 0}%</b><small>Conversion rate</small></div>
      </section>

      <section className="crm-card">
        <h2>Cases by dispute stage</h2>
        <p className="crm-muted ops-hint">Total cases: {summary.disputeCases} · <button type="button" className="ld-link" onClick={() => filterCase('pay')} aria-pressed={filters.dispute === 'pay'}>Customer payment pending: {rupees(summary.paymentPending.amount)} ({summary.paymentPending.customers} customers)</button></p>
        {summary.disputeCases > 0 && <div className="crm-seg ld-cases">
          <button type="button" className={filters.dispute === 'open' ? 'on' : ''} onClick={() => filterCase('open')}>{summary.openCases} open</button>
          {summary.casesDueSoon > 0 && <span className="crm-tag ld-soon">{summary.casesDueSoon} move up within 3 days</span>}
        </div>}
        <DisputeDonut stages={summary.byDispute} total={summary.disputeCases} active={filters.dispute} onPick={(index) => filterCase(String(index))} />
        {!summary.disputeCases && <p className="crm-muted ld-sub">No dispute cases yet. Open a lead, choose the bureau and click <b>Raise dispute</b> to start a case. New leads for credit products start a case automatically.</p>}
      </section>

      <section className="crm-row">
        <div className="crm-card">
          <h2>Leads by receiving source</h2>
          {summary.bySource.map((item, index) => <button type="button" key={item.source} className={`crm-src ld-src${index === 0 && item.count ? ' top' : ''}`} onClick={() => { setFilter('source', filters.source === item.source ? '' : item.source); scrollTo('ld-leads') }}>
            <span>{item.source}</span><span className="crm-bar"><i style={{ width: `${item.count / maxSource * 100}%` }} /></span><span>{item.count} lead{item.count === 1 ? '' : 's'}</span>
          </button>)}
        </div>
        <div className="crm-card" id="ld-pipeline">
          <h2>Pipeline</h2>
          <div className="crm-pipe">
            {options.statuses.map((status) => { const Icon = STATUS_ICON[status]; return <button key={status} type="button" className={`crm-tile${filters.status === status ? ' on' : ''}`} aria-pressed={filters.status === status} onClick={() => filterStatus(status)}>
              <span className="crm-tile-ic"><Icon /></span><b>{summary.byStatus[status]}</b><small>{STATUS_LABEL[status]}</small>
            </button> })}
          </div>
          <ul className="crm-fu">
            {summary.dueLeads.length ? summary.dueLeads.map((lead) => <li key={lead.id}>
              <span>{lead.name}<small>{lead.product} · {options.steps[lead.step]}</small></span>
              <button className="crm-btn ghost sm" type="button" onClick={() => setOpenId(lead.id)}>Follow up</button>
            </li>) : <li className="crm-muted">No calls due today.</li>}
          </ul>
        </div>
      </section>

      <section className="crm-card" id="ld-notif">
        <h2>Notifications and emails</h2>
        <p className="crm-muted ld-sub ld-lead">Every case update and escalation is logged here with the customer email it is meant for.</p>
        <ul className="crm-fu">
          {data.notifications.length ? data.notifications.map((item) => <li key={item.id}>
            <span><b>{item.leadName}</b><small>{item.body}</small></span>
            <span className="crm-muted ld-right">{item.toEmail ? `Email to ${item.toEmail}` : 'No email on file'}{item.toEmail && item.delivery !== 'sent' ? ` (${item.delivery.replace('_', ' ')})` : ''}<br />{fmt(item.createdAt.slice(0, 10))}</span>
          </li>) : <li className="crm-muted">No updates yet.</li>}
        </ul>
      </section>

      <section className="crm-card" id="ld-partners">
        <h2>Leads from franchise partners</h2>
        <p className="crm-muted ld-sub ld-lead">Leads your franchise partners send to you. Each lead also shows the stage it reached at the partner.</p>
        {data.partners.length ? <div className="crm-wrap"><table className="crm-table ld-ptable">
          <thead><tr><th>Partner</th><th>Area</th><th>Leads sent</th><th>In progress</th><th>Converted</th><th>Conversion</th></tr></thead>
          <tbody>{data.partners.map((partner) => <tr key={partner.email}>
            <td><button type="button" className="crm-open" onClick={() => { setFilters((current) => ({ ...current, partner: partner.email, source: '' })); scrollTo('ld-leads') }}>{partner.name}</button>
              <small>{partner.email}</small>{partner.pending > 0 && <small className="crm-overdue">{partner.pending} waiting for accept or reject</small>}</td>
            <td>{permissions.canEditPartners ? <AreaField token={token} partner={partner} onDone={(text, tone) => { setNotice({ tone, text }); reload() }} /> : partner.area || '—'}</td>
            <td>{partner.total}</td><td>{partner.open}</td><td>{partner.converted}</td>
            <td><b>{partner.total ? Math.round(partner.converted / partner.total * 100) : 0}%</b></td>
          </tr>)}</tbody>
        </table></div> : <p className="crm-empty">No active franchise partners yet.</p>}
      </section>

      <section className="crm-card" id="ld-leads">
        <h2>All leads</h2>
        <div className="crm-tools">
          <input type="search" placeholder="Search name, phone or product" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} aria-label="Search leads" />
          {!permissions.partnerScoped && <select value={filters.source} onChange={(event) => setFilter('source', event.target.value)} aria-label="Filter by source"><option value="">All sources</option>{options.sources.map((source) => <option key={source}>{source}</option>)}</select>}
          {!permissions.partnerScoped && <select value={filters.partner} onChange={(event) => setFilter('partner', event.target.value)} aria-label="Filter by partner"><option value="">All partners</option>{data.partners.map((partner) => <option key={partner.email} value={partner.email}>{partner.name}</option>)}</select>}
          <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{options.statuses.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select>
          <select value={filters.dispute} onChange={(event) => setFilter('dispute', event.target.value)} aria-label="Filter by dispute case"><option value="">All cases</option><option value="open">Open cases</option>{options.disputeStages.map((stage, index) => <option key={stage} value={index}>{stage}</option>)}<option value="pay">Payment pending</option><option value="none">No case</option></select>
        </div>
        {data.leads.length ? <div className="crm-wrap"><table className="crm-table">
          <thead><tr><th>Customer</th><th>Product</th><th>Source</th><th>Received</th><th>Next call and step</th><th>Status</th></tr></thead>
          <tbody>{data.leads.map((lead) => <tr key={lead.id}>
            <td><button type="button" className="crm-open" onClick={() => setOpenId(lead.id)}>{lead.name}</button><small>{lead.phone}{lead.partnerStage ? ` · At partner: ${lead.partnerStage}` : ''}</small></td>
            <td>{lead.product}</td>
            <td><span className="crm-tag">{lead.source}</span>{lead.partnerName && <small>Partner {lead.partnerName}</small>}{lead.acceptance === 'pending' && <small className="crm-overdue">Awaiting accept or reject</small>}</td>
            <td>{fmt(lead.received)}</td>
            <td>{lead.due ? <b className="crm-due">Today</b> : fmt(lead.nextCall)}<small>{options.steps[lead.step]}</small>{lead.disputeStage !== null && <small className={lead.disputeStage < 6 && lead.disputeEta && daysBetween(data.today, lead.disputeEta) <= 3 ? 'crm-overdue' : undefined}>{lead.disputeStage < 6 ? `${options.disputeStages[lead.disputeStage]} ETA ${fmt(lead.disputeEta)}` : 'Case resolved'}{lead.disputeBureau ? ` · ${lead.disputeBureau}` : ''}</small>}{lead.paymentPending > 0 && lead.status !== 'lost' && <small>Pending {rupees(lead.paymentPending)}</small>}</td>
            <td><StatusSelect lead={lead} token={token} options={options} onDone={(text, tone) => { setNotice({ tone, text }); reload() }} /></td>
          </tr>)}</tbody>
        </table></div> : <p className="crm-empty">No leads match. Clear the filters or add a new lead.</p>}
        {data.filteredTotal > data.leads.length && <p className="crm-muted ops-hint">Showing the latest {data.leads.length} of {data.filteredTotal}. Use search to narrow down.</p>}
      </section>

      {adding && <AddLeadDialog token={token} options={options} partners={data.partners} partnerScoped={permissions.partnerScoped}
        onClose={() => setAdding(false)} onSaved={() => { setAdding(false); setNotice({ tone: 'ok', text: 'Lead added.' }); reload() }} />}
      {openId && <LeadDetail token={token} id={openId} options={options} today={data.today} permissions={permissions}
        onClose={() => setOpenId(null)} onChanged={reload} onDeleted={() => { setOpenId(null); setNotice({ tone: 'ok', text: 'Lead deleted.' }); reload() }} />}
    </div>
  )
}

function AreaField({ token, partner, onDone }: { token: string; partner: { email: string; area: string | null }; onDone: (text: string, tone: 'ok' | 'error') => void }) {
  const [busy, setBusy] = useState(false)
  const save = (value: string) => {
    if (value.trim() === (partner.area ?? '')) return
    setBusy(true)
    api<{ message: string }>(token, `/partners/${encodeURIComponent(partner.email)}/area`, { method: 'PUT', body: JSON.stringify({ area: value }) })
      .then((result) => onDone(result.message, 'ok')).catch((error: Error) => onDone(error.message, 'error')).finally(() => setBusy(false))
  }
  return <input className="ld-area" key={partner.area ?? ''} defaultValue={partner.area ?? ''} placeholder="Add area" disabled={busy} maxLength={80} aria-label={`Area for ${partner.email}`}
    onBlur={(event) => save(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
}

const DASHBOARD_TITLE: Record<string, string> = { owner: 'Superadmin dashboard', manager: 'Admin dashboard', support: 'Support dashboard', agent: 'Agent dashboard', partner: 'Partner dashboard' }
const DESK_LABEL: Record<string, string> = { owner: 'Superadmin desk', manager: 'Admin desk', support: 'Support desk', agent: 'Agent desk', partner: 'Partner desk' }

type HubTab = 'dashboard' | 'leads' | 'partners' | 'customers'
const anchor: Record<Exclude<HubTab, 'customers'>, string> = { dashboard: 'ld-top', leads: 'ld-leads', partners: 'ld-partners' }

// The CRM page: the reference "Agent dashboard" layout with pill navigation; Customers holds the customer-account CRM for staff.
export function CrmHub({ token, refreshKey = 0, role, who, customers }: { token: string; refreshKey?: number; role: string; who: string; customers?: ReactNode }) {
  const [tab, setTab] = useState<HubTab>('dashboard')
  useEffect(() => {
    if (tab === 'customers') return
    const frame = window.requestAnimationFrame(() => document.getElementById(anchor[tab])?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => window.cancelAnimationFrame(frame)
  }, [tab])
  const tabs: [HubTab, string][] = [['dashboard', 'Dashboard'], ['leads', 'Leads'], ['partners', role === 'partner' ? 'My leads' : 'Partners'], ...(customers ? [['customers', 'Customers'] as [HubTab, string]] : [])]
  return <div className="crm crm-hub">
    <div className="crm-stripe" aria-hidden="true" />
    <div className="crm-hubbar">
      <nav className="crm-nav" aria-label="CRM sections">
        {tabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined}
          onClick={() => { if (tab === id && id !== 'customers') document.getElementById(anchor[id])?.scrollIntoView({ behavior: 'smooth' }); setTab(id) }}>{label}</button>)}
      </nav>
      <div className="crm-agent"><b>{DESK_LABEL[role] ?? 'CRM desk'}</b><span>{who}</span></div>
    </div>
    {tab === 'customers' ? customers : <LeadDesk token={token} refreshKey={refreshKey} title={DASHBOARD_TITLE[role] ?? 'Agent dashboard'} />}
  </div>
}

function DisputeDonut({ stages, total, active, onPick }: { stages: { stage: string; count: number }[]; total: number; active: string; onPick: (index: number) => void }) {
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const lengths = stages.map((item) => total ? item.count / total * circumference : 0)
  const offsets = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, value) => sum + value, 0))
  return <div className="ld-donut">
    <svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label="Round chart of cases by dispute stage">
      <circle cx="110" cy="110" r={radius} fill="none" stroke="#eef1f8" strokeWidth="34" />
      {stages.map((item, index) => {
        if (!item.count || !total) return null
        const length = lengths[index]
        return <circle key={item.stage} cx="110" cy="110" r={radius} fill="none" stroke={DONUT_COLORS[index]} strokeWidth="34"
          strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offsets[index]} transform="rotate(-90 110 110)" opacity={active && active !== String(index) ? .35 : 1} onClick={() => onPick(index)} style={{ cursor: 'pointer' }}><title>{item.stage}: {item.count}</title></circle>
      })}
      <text x="110" y="106" textAnchor="middle" fontSize="30" fontWeight="600" fill="#0c1f55">{total}</text>
      <text x="110" y="126" textAnchor="middle" fontSize="12" fill="#5e6a85">Total cases</text>
    </svg>
    <ul>{stages.map((item, index) => <li key={item.stage}><button type="button" className={active === String(index) ? 'on' : ''} aria-pressed={active === String(index)} onClick={() => onPick(index)} title={`Show ${item.stage} cases`}><i style={{ background: DONUT_COLORS[index] }} /><span>{item.stage}</span><b>{item.count}</b><span className="crm-muted">{Math.round(item.count / (total || 1) * 100)}%</span></button></li>)}</ul>
  </div>
}

function StatusSelect({ lead, token, options, onDone }: { lead: Lead; token: string; options: Options; onDone: (text: string, tone: 'ok' | 'error') => void }) {
  const [busy, setBusy] = useState(false)
  return <select className={`crm-stage ${STATUS_TONE[lead.status]}`} value={lead.status} disabled={busy || lead.acceptance === 'pending' || lead.acceptance === 'rejected'} aria-label={`Status for ${lead.name}`}
    onChange={(event) => {
      setBusy(true)
      api<{ message: string }>(token, `/${lead.id}/actions`, { method: 'POST', body: JSON.stringify({ action: 'status', status: event.target.value }) })
        .then((result) => onDone(result.message, 'ok')).catch((error: Error) => onDone(error.message, 'error')).finally(() => setBusy(false))
    }}>
    {options.statuses.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
  </select>
}

function AddLeadDialog({ token, options, partners, partnerScoped, onClose, onSaved }: {
  token: string; options: Options; partners: LeadData['partners']; partnerScoped: boolean; onClose: () => void; onSaved: () => void
}) {
  const [source, setSource] = useState(options.sources[0])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError('')
    try {
      await api(token, '', { method: 'POST', body: JSON.stringify({ ...form, source }) })
      onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add the lead.')
    } finally {
      setBusy(false)
    }
  }
  const franchise = source === 'Franchise partner'
  return <div className="crm-modal" role="dialog" aria-modal="true" aria-label="Add lead" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="crm-det crm-form ld-add" onSubmit={submit}>
      <h2>Add lead</h2>
      <p className="crm-muted">{partnerScoped ? 'The Scorenow team will accept or reject the lead and keep you updated.' : 'Who is the customer and where did the lead come from?'}</p>
      <label>Customer name<input name="name" required maxLength={120} autoFocus /></label>
      <div className="crm-g2">
        <label>Mobile number<input name="phone" required inputMode="tel" placeholder="10-digit mobile" /></label>
        <label>Email (optional)<input name="email" type="email" placeholder="For updates and login" /></label>
      </div>
      <div className="crm-g2">
        <label>Product<select name="product">{options.products.map((product) => <option key={product}>{product}</option>)}</select></label>
        <label>Source<select value={source} onChange={(event) => setSource(event.target.value)} disabled={partnerScoped}>{options.sources.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {franchise && <div className="crm-g2">
        {!partnerScoped && <label>Franchise partner<select name="partnerEmail" required>{partners.map((partner) => <option key={partner.email} value={partner.email}>{partner.name}</option>)}</select></label>}
        <label>Stage at partner<select name="partnerStage">{options.partnerStages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="crm-acts"><button className="crm-btn ghost" type="button" onClick={onClose}>Cancel</button><button className="crm-btn" type="submit" disabled={busy}>Save lead</button></div>
    </form>
  </div>
}

function LeadDetail({ token, id, options, today, permissions, onClose, onChanged, onDeleted }: {
  token: string; id: string; options: Options; today: string; permissions: LeadData['permissions']
  onClose: () => void; onChanged: () => void; onDeleted: () => void
}) {
  const [detail, setDetail] = useState<{ lead: Lead; log: LogEntry[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    api<{ lead: Lead; log: LogEntry[] }>(token, `/${id}`)
      .then((result) => { if (!cancelled) setDetail(result) })
      .catch((error: Error) => { if (!cancelled) setNotice({ tone: 'error', text: error.message }) })
    return () => { cancelled = true }
  }, [token, id])

  const act = async (action: string, body: Record<string, unknown> = {}) => {
    setBusy(true)
    setNotice(null)
    try {
      const result = await api<{ message: string; lead: Lead; log: LogEntry[] }>(token, `/${id}/actions`, { method: 'POST', body: JSON.stringify({ action, ...body }) })
      setDetail({ lead: result.lead, log: result.log })
      setNotice({ tone: 'ok', text: result.message })
      onChanged()
      return true
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save.' })
      return false
    } finally {
      setBusy(false)
    }
  }
  const formAct = (action: string, reset = false) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    if (await act(action, Object.fromEntries(new FormData(formElement))) && reset) formElement.reset()
  }
  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setBusy(true)
    try { await api(token, `/${id}`, { method: 'DELETE' }); onDeleted() } catch (error) { setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to delete.' }); setBusy(false) }
  }

  const lead = detail?.lead
  const done = lead?.status === 'converted'
  const lost = lead?.status === 'lost'
  const pending = lead?.acceptance === 'pending'
  const scorePct = (value: number) => Math.max(0, Math.min(100, (value - 300) / 6))

  return <div className="crm-modal" role="dialog" aria-modal="true" aria-label={lead?.name ?? 'Lead'} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="crm-det">
      {!lead ? <p className="crm-empty">{notice?.text ?? 'Loading lead…'}</p> : <>
        <div className="crm-dh">
          <div><h2>{lead.name}</h2><p className="crm-muted"><a href={`tel:${lead.phone}`}>{lead.phone}</a> · {lead.product}{lead.email ? ` · ${lead.email}` : ''}</p></div>
          <span className={`crm-tag ${STATUS_TONE[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>
        </div>
        <p className="crm-muted ld-sub">Received via {lead.source}{lead.partnerName ? ` · Partner ${lead.partnerName}` : ''}{lead.partnerStage ? ` · ${lead.partnerStage} at partner` : ''}</p>
        {notice && <p className={`dashboard-notice ${notice.tone === 'error' ? 'error' : ''}`} role="status">{notice.text}</p>}

        <div className="crm-steps">{options.steps.map((step, index) => <span key={step} className={`crm-chip${done || index < lead.step ? ' d' : index === lead.step ? ' c' : ''}`}>{step}</span>)}</div>
        {done || lost || lead.acceptance === 'rejected'
          ? <div className="crm-acts ld-left"><span className="crm-muted">{done ? 'Work is done.' : lead.acceptance === 'rejected' ? 'Partner lead rejected.' : 'Marked not interested.'}</span><button className="crm-btn ghost sm" type="button" disabled={busy} onClick={() => void act('reopen')}>Reopen</button></div>
          : !pending && <div className="crm-acts ld-left">
            <button className="crm-btn" type="button" disabled={busy} onClick={() => void act('next_step')}>Next: {options.steps[lead.step + 1]}</button>
            <button className="crm-btn ghost" type="button" disabled={busy} onClick={() => void act('work_done')}>Mark work done</button>
          </div>}

        {pending && (permissions.canDecide
          ? <form className="crm-form ld-box" onSubmit={(event) => { event.preventDefault(); const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; void act(submitter?.value ?? 'accept', Object.fromEntries(new FormData(event.currentTarget))) }}>
            <h3>Franchise partner lead ({lead.partnerName ?? lead.partnerEmail})</h3>
            <textarea name="reason" rows={3} maxLength={500} placeholder="Notepad: reason to accept or reject this lead (required to reject)" />
            <div className="crm-acts"><button className="crm-btn ghost" type="submit" value="reject" disabled={busy}>Reject</button><button className="crm-btn" type="submit" value="accept" disabled={busy}>Accept</button></div>
          </form>
          : <p className="crm-note ld-wait">Waiting for the Scorenow team to accept this lead.</p>)}
        {!pending && lead.acceptanceReason && <p className="crm-muted ld-sub">Partner lead {lead.acceptance}. Reason: {lead.acceptanceReason}</p>}

        {lead.disputeStage !== null && <>
          <h3>Dispute case{lead.disputeBureau ? ` · ${lead.disputeBureau}` : ''}</h3>
          <div className="crm-steps">{options.disputeStages.map((stage, index) => <span key={stage} className={`crm-chip${index < lead.disputeStage! ? ' d' : index === lead.disputeStage ? ' c' : ''}`}>{stage}</span>)}</div>
          {lead.disputeStage < 6 && !pending && lead.acceptance !== 'rejected' && <form className="crm-form" onSubmit={(event) => { event.preventDefault(); const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; const formElement = event.currentTarget; void act(submitter?.value ?? 'dispute_next', Object.fromEntries(new FormData(formElement))).then((ok) => { if (ok) formElement.reset() }) }}>
            <p className="crm-muted ld-how"><b>Do now:</b> {options.disputeHow[lead.disputeStage]}<br /><b>ETA:</b> {fmt(lead.disputeEta)} ({Math.max(0, daysBetween(today, lead.disputeEta ?? today))} days left, then it moves up automatically){lead.paymentPending ? <><br /><b>Payment pending:</b> {rupees(lead.paymentPending)}</> : null}</p>
            <input name="note" maxLength={500} placeholder="Note for this stage" />
            <div className="crm-acts"><button className="crm-btn ghost" type="submit" value="dispute_resolve" disabled={busy}>Mark resolved</button>{lead.disputeStage < 5 && <button className="crm-btn" type="submit" value="dispute_next" disabled={busy}>Next: {options.disputeStages[lead.disputeStage + 1]}</button>}</div>
          </form>}
          {lead.disputeStage === 6 && <p className="crm-note">Case resolved. Raise a dispute below to open a new case.</p>}
        </>}

        <h3>4 bureau scores (red line = target)</h3>
        <form className="crm-form" onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void act('scores', { scores: Object.fromEntries(options.bureaus.map((bureau) => [bureau, form.get(`score-${bureau}`)])), targetScore: form.get('targetScore'), cmrRank: form.get('cmrRank'), paymentPending: form.get('paymentPending'), email: form.get('email') })
        }}>
          {options.bureaus.map((bureau) => { const score = lead.scores[bureau]; return <div key={bureau} className="crm-src ld-score">
            <span>{bureau}</span>
            <span className="crm-bar ld-target"><i style={{ width: `${score ? scorePct(score.to) : 0}%` }} /><u style={{ left: `${scorePct(lead.targetScore)}%` }} /></span>
            <span>{score ? `${score.from} → ` : ''}<input name={`score-${bureau}`} type="number" min="300" max="900" defaultValue={score?.to ?? ''} aria-label={`${bureau} score`} /></span>
          </div> })}
          <div className="crm-g2">
            <label>Target score<input name="targetScore" type="number" min="300" max="900" defaultValue={lead.targetScore} /></label>
            <label>CMR rank (1 best to 10)<input name="cmrRank" type="number" min="1" max="10" defaultValue={lead.cmrRank ?? ''} /></label>
            <label>Payment pending (₹)<input name="paymentPending" type="number" min="0" defaultValue={lead.paymentPending} /></label>
            <label>Customer email<input name="email" type="email" defaultValue={lead.email ?? ''} /></label>
          </div>
          <div className="crm-acts"><button className="crm-btn" type="submit" disabled={busy || pending}>Save scores and details</button></div>
        </form>

        <h3>{lead.disputeStage === null || lead.disputeStage === 6 ? 'Open a dispute case' : 'Raise another dispute'}</h3>
        <form className="crm-form ld-raise" onSubmit={formAct('raise_dispute', true)}>
          <div className="crm-g2">
            <select name="bureau" aria-label="Bureau" defaultValue={lead.disputeBureau ?? options.bureaus[0]}>{[...options.bureaus, 'CMR report'].map((bureau) => <option key={bureau}>{bureau}</option>)}</select>
            <input name="note" maxLength={500} placeholder="What is wrong in the report (optional)" />
          </div>
          <div className="crm-acts"><button className={lead.disputeStage === null || lead.disputeStage === 6 ? 'crm-btn' : 'crm-btn ghost'} type="submit" disabled={busy || pending || lead.acceptance === 'rejected'}>Raise dispute</button></div>
        </form>

        <h3>Log follow-up</h3>
        <form className="crm-form" onSubmit={formAct('follow_up', true)}>
          <div className="crm-g2">
            <select name="outcome" aria-label="Call outcome">{options.outcomes.map((outcome) => <option key={outcome}>{outcome}</option>)}</select>
            <input name="nextCall" type="date" defaultValue={lead.nextCall} aria-label="Next call date" />
          </div>
          <input name="note" maxLength={500} placeholder="Note (optional)" />
          <div className="crm-acts"><button className="crm-btn" type="submit" disabled={busy}>Save follow-up</button></div>
        </form>

        <h3>Edit details</h3>
        <form className="crm-form" key={`${lead.name}-${lead.phone}-${lead.product}`} onSubmit={formAct('edit')}>
          <div className="crm-g2">
            <input name="name" defaultValue={lead.name} aria-label="Name" required />
            <input name="phone" defaultValue={lead.phone} aria-label="Phone" required />
            <select name="product" defaultValue={lead.product} aria-label="Product">{options.products.map((product) => <option key={product}>{product}</option>)}</select>
            <input name="email" type="email" defaultValue={lead.email ?? ''} placeholder="Customer email" aria-label="Email" />
            {lead.partnerEmail && <select name="partnerStage" defaultValue={lead.partnerStage ?? ''} aria-label="Stage at partner">{options.partnerStages.map((stage) => <option key={stage}>{stage}</option>)}</select>}
          </div>
          <div className="crm-acts">
            {permissions.canDelete && <button className="crm-btn ghost ld-danger" type="button" disabled={busy} onClick={() => void remove()}>{confirmDelete ? 'Click again to delete' : 'Delete lead'}</button>}
            <button className="crm-btn" type="submit" disabled={busy}>Save changes</button>
          </div>
        </form>

        <h3>Activity</h3>
        <ul className="crm-fu">{detail.log.map((entry) => <li key={entry.id}><span>{entry.body}<small>{entry.createdBy}</small></span><span className="crm-muted">{fmt(entry.date)}</span></li>)}</ul>
      </>}
      <div className="crm-acts"><button className="crm-btn ghost" type="button" onClick={onClose}>Close</button></div>
    </div>
  </div>
}
