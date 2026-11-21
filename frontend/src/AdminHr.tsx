import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Printer } from 'lucide-react'
import './AdminCrm.css'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled'
type Leave = { id: string; email: string; name: string; role: string; type: string; from: string; to: string; halfDay: boolean; days: number; reason: string; status: Status; decidedBy: string | null; decisionNote: string | null; createdBy: string; createdOn: string }
type HrRequest = { id: string; email: string; name: string; role: string; kind: string; title: string; amount: number | null; details: string; status: Status; decidedBy: string | null; decisionNote: string | null; settledMonth: string | null; createdOn: string }
type Employee = {
  email: string; name: string; role: string; accountStatus: string; agentType: string | null; employeeCode: string | null; designation: string | null; department: string | null
  phone: string | null; joinedOn: string | null; employmentType: string | null; reportsTo: string | null; monthlySalary: number | null; bankAccount: string | null; ifsc: string | null; pan: string | null
  hrStatus: 'active' | 'notice' | 'exited'; exitOn: string | null; todayStatus: string | null; todayMode: string | null; checkIn: string | null; checkOut: string | null; onLeave: string | null
}
type Payslip = { month: string; email: string; name: string; salary: number; daysInMonth: number; paidDays: number; earned: number; lopDays: number; lopAmount: number; reimbursements: number; advances: number; bonus: number; otherDeductions: number; net: number; note: string | null; status: 'draft' | 'paid'; paidOn: string | null; bankAccount?: string | null; ifsc?: string | null; designation?: string | null; employeeCode?: string | null }
type Balance = { key: string; label: string; quota: number; paid: boolean; used: number; pending: number; left: number | null }
type Holiday = { day: string; name: string }
type Announcement = { id: string; title: string; body: string; createdBy: string; date: string }
type HrData = {
  today: string
  viewer: { email: string; role: string; isAdmin: boolean; isOwner: boolean; isEmployee: boolean }
  me: null | {
    profile: { name: string; role: string; agentType: string | null; employeeCode: string | null; designation: string | null; department: string | null; joinedOn: string | null; employmentType: string | null; monthlySalary: number; hrStatus: string }
    attendance: { status: string; mode: string; checkIn: string | null; checkOut: string | null } | null
    balances: Balance[]; leaves: Leave[]; requests: HrRequest[]; payslips: Payslip[]; presentDays: number
  }
  team: null | {
    employees: Employee[]; pendingLeaves: Leave[]; pendingRequests: HrRequest[]; recentLeaves: Leave[]; recentRequests: HrRequest[]; upcomingLeaves: Leave[]
    kpis: { headcount: number; present: number; onLeave: number; notMarked: number; pendingApprovals: number; monthlyPayroll: number | null; payrollStatus: { status: string; net: number; n: number }[] | null; isHoliday: boolean }
    byDepartment: { name: string; count: number }[]
  }
  holidays: Holiday[]; announcements: Announcement[]
  options: { leaveTypes: { key: string; label: string; quota: number; paid: boolean }[]; requestKinds: { key: string; label: string }[]; employmentTypes: string[]; departments: string[]; modes: string[] }
}
type Register = { month: string; days: string[]; today: string; rows: { email: string; name: string; department: string | null; codes: string[]; present: number; leave: number; absent: number }[] }
type Payroll = { month: string; rows: Payslip[]; totals: { earned: number; lop: number; reimbursements: number; advances: number; bonus: number; deductions: number; net: number }; status: 'none' | 'draft' | 'paid' }
type Say = (text: string, tone?: 'ok' | 'error') => void
type Tab = 'overview' | 'employees' | 'attendance' | 'leave' | 'requests' | 'payroll' | 'company' | 'me'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (date: string | null) => { if (!date) return '—'; const [y, m, d] = date.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` }
const monthName = (month: string) => { const [y, m] = month.split('-'); return `${MONTHS[Number(m) - 1]} ${y}` }
const range = (leave: Leave) => leave.from === leave.to ? fmt(leave.from) : `${fmt(leave.from)} – ${fmt(leave.to)}`
const rupees = (value: number | null) => value === null ? '—' : `₹${Number(value).toLocaleString('en-IN')}`
const clock = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—'
const ROLE: Record<string, string> = { owner: 'Superadmin', manager: 'Admin', support: 'Support', analyst: 'Analyst', agent: 'Agent' }
const MODE: Record<string, string> = { office: 'Office', wfh: 'Work from home', field: 'Field' }
const TONE: Record<string, string> = { pending: 's-interested', approved: 's-paid', rejected: 's-lost', cancelled: 's-contacted', active: 's-paid', notice: 's-interested', exited: 's-lost', draft: 's-interested', paid: 's-paid' }
const CODE_LABEL: Record<string, string> = { P: 'Present', W: 'Work from home', H: 'Half day', A: 'Absent', L: 'On leave', O: 'Holiday', S: 'Sunday', '-': 'Not marked' }

async function hrApi<T = { message?: string }>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${apiUrl}/api/admin/hr${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await response.json().catch(() => ({})) as T & { message?: string }
  if (!response.ok) throw new Error(data.message || 'Request failed.')
  return data
}
const form = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); return Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string> }

// People & HR: the company's employee desk. Superadmin and Admin manage the team; every employee also gets "My HR" self-service.
export function PeopleHub({ token, role, who, refreshKey = 0 }: { token: string; role: string; who: string; refreshKey?: number }) {
  const [data, setData] = useState<HrData | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<Tab | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    hrApi<HrData>(token, '').then((result) => { if (!cancelled) { setData(result); setError('') } }).catch((err: Error) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [token, version, refreshKey])

  const reload = () => setVersion((value) => value + 1)
  const say: Say = (text, tone = 'ok') => { setNotice({ tone, text }); if (tone === 'ok') reload() }
  const run = (promise: Promise<{ message?: string }>) => promise.then((result) => say(result.message ?? 'Saved.')).catch((err: Error) => say(err.message, 'error'))

  if (!data) return <div className="crm crm-hub"><div className="crm-stripe" aria-hidden="true" /><header className="crm-top"><div><h1>People &amp; HR</h1><p>{error || 'Loading the employee desk…'}</p></div></header></div>

  const { viewer, team } = data
  const tabs: [Tab, string, number?][] = viewer.isAdmin && team
    ? [['overview', 'Overview'], ['employees', 'Employees'], ['attendance', 'Attendance'], ['leave', 'Leave', team.pendingLeaves.length], ['requests', 'Requests', team.pendingRequests.length],
      ...(viewer.isOwner ? [['payroll', 'Payroll'] as [Tab, string]] : []), ['company', 'Holidays & policy'], ...(viewer.isEmployee ? [['me', 'My HR'] as [Tab, string]] : [])]
    : [['me', 'My HR'], ['company', 'Holidays & notices']]
  const current = tab && tabs.some(([id]) => id === tab) ? tab : tabs[0][0]
  const go = (next: Tab) => { setTab(next); setNotice(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <div className="crm crm-hub">
    <div className="crm-stripe" aria-hidden="true" />
    <div className="crm-hubbar">
      <nav className="crm-nav" aria-label="People and HR sections">
        {tabs.map(([id, label, count]) => <button key={id} type="button" className={current === id ? 'on' : ''} aria-current={current === id ? 'page' : undefined} onClick={() => go(id)}>
          {label}{count ? <span className="hr-count">{count}</span> : null}
        </button>)}
      </nav>
      <div className="crm-agent"><b>{viewer.isOwner ? 'Superadmin' : viewer.isAdmin ? 'Admin' : ROLE[role] ?? 'Employee'} · HR desk</b><span>{who}</span></div>
    </div>
    {notice && <p className={`dashboard-notice ${notice.tone === 'error' ? 'error' : ''}`} role="status">{notice.text}</p>}
    {current === 'overview' && team && <Overview data={data} team={team} go={go} token={token} say={say} />}
    {current === 'employees' && team && <Employees data={data} team={team} token={token} say={say} />}
    {current === 'attendance' && team && <Attendance data={data} team={team} token={token} say={say} version={version} />}
    {current === 'leave' && team && <LeaveDesk data={data} team={team} token={token} say={say} run={run} />}
    {current === 'requests' && team && <RequestDesk data={data} team={team} token={token} say={say} run={run} />}
    {current === 'payroll' && viewer.isOwner && <PayrollDesk token={token} today={data.today} say={say} version={version} />}
    {current === 'company' && <Company data={data} token={token} run={run} />}
    {current === 'me' && data.me && <MyHr data={data} me={data.me} token={token} run={run} />}
  </div>
}

function Header({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <header className="crm-top"><div><h1>{title}</h1><p>{text}</p></div>{action}</header>
}

// Approve, or reject with a reason the employee will see.
function Decide({ token, kind, id, say }: { token: string; kind: 'leaves' | 'requests'; id: string; say: Say }) {
  const [rejecting, setRejecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const decide = (decision: 'approved' | 'rejected', note = '') => {
    setBusy(true)
    hrApi<{ message: string }>(token, `/${kind}/${id}/decision`, 'POST', { decision, note }).then((result) => say(result.message)).catch((err: Error) => say(err.message, 'error')).finally(() => setBusy(false))
  }
  if (rejecting) return <form className="hr-reject" onSubmit={(event) => { const { note } = form(event); decide('rejected', note) }}>
    <input name="note" required maxLength={500} placeholder="Reason for rejecting" autoFocus aria-label="Reason for rejecting" />
    <button className="crm-btn sm hr-danger" type="submit" disabled={busy}>Reject</button>
    <button className="crm-btn ghost sm" type="button" onClick={() => setRejecting(false)}>Back</button>
  </form>
  return <span className="hr-decide">
    <button className="crm-btn sm" type="button" disabled={busy} onClick={() => decide('approved')}>Approve</button>
    <button className="crm-btn ghost sm" type="button" disabled={busy} onClick={() => setRejecting(true)}>Reject</button>
  </span>
}

function Overview({ data, team, go, token, say }: { data: HrData; team: NonNullable<HrData['team']>; go: (tab: Tab) => void; token: string; say: Say }) {
  const { kpis } = team
  const leaveLabel = (key: string) => data.options.leaveTypes.find((item) => item.key === key)?.label ?? key
  const maxDept = Math.max(1, ...team.byDepartment.map((item) => item.count))
  const upcomingHolidays = data.holidays.filter((holiday) => holiday.day >= data.today).slice(0, 5)
  const paidThisMonth = kpis.payrollStatus?.find((item) => item.status === 'paid')
  return <div className="crm">
    <Header title={data.viewer.isOwner ? 'Superadmin HR dashboard' : 'Admin HR dashboard'} text={`Your company at a glance for ${fmt(data.today)}${kpis.isHoliday ? ' (holiday)' : ''}: who is in, who is out and what needs your approval.`}
      action={<button className="crm-btn" type="button" onClick={() => go('employees')}>Manage employees</button>} />
    <div className="crm-actions">
      <button className="crm-act" type="button" onClick={() => go('leave')}><span>Review <b>leave requests</b>{team.pendingLeaves.length ? ` (${team.pendingLeaves.length})` : ''}</span><i><ArrowRight /></i></button>
      <button className="crm-act" type="button" onClick={() => go('attendance')}><span>Mark <b>today’s attendance</b>{kpis.notMarked ? ` (${kpis.notMarked} left)` : ''}</span><i><ArrowRight /></i></button>
      {data.viewer.isOwner
        ? <button className="crm-act" type="button" onClick={() => go('payroll')}><span>Run <b>monthly payroll</b></span><i><ArrowRight /></i></button>
        : <button className="crm-act" type="button" onClick={() => go('requests')}><span>Review <b>employee requests</b></span><i><ArrowRight /></i></button>}
    </div>
    <section className="crm-kpis hr-kpis" aria-label="Team summary">
      <div className="crm-kpi"><b>{kpis.headcount}</b><small>Employees</small></div>
      <div className="crm-kpi"><b>{kpis.present}</b><small>Present today</small></div>
      <div className="crm-kpi"><b>{kpis.onLeave}</b><small>On leave today</small></div>
      <div className="crm-kpi"><b>{kpis.notMarked}</b><small>Attendance not marked</small></div>
      <div className="crm-kpi"><b>{kpis.pendingApprovals}</b><small>Waiting for approval</small></div>
      {kpis.monthlyPayroll !== null && <div className="crm-kpi gold"><b>{rupees(kpis.monthlyPayroll)}</b><small>{paidThisMonth ? `Monthly payroll · ${rupees(paidThisMonth.net)} paid` : 'Monthly payroll'}</small></div>}
    </section>

    <section className="crm-card">
      <h2>Approvals inbox</h2>
      {team.pendingLeaves.length + team.pendingRequests.length ? <ul className="crm-fu">
        {team.pendingLeaves.map((leave) => <li key={`l${leave.id}`}>
          <span><b>{leave.name}</b> · {leaveLabel(leave.type)} for {leave.days} day{leave.days === 1 ? '' : 's'}<small>{range(leave)} · {leave.reason}</small></span>
          {leave.email === data.viewer.email ? <span className="crm-muted">Superadmin will review</span> : <Decide token={token} kind="leaves" id={leave.id} say={say} />}
        </li>)}
        {team.pendingRequests.map((item) => <li key={`r${item.id}`}>
          <span><b>{item.name}</b> · {item.title}{item.amount !== null ? ` · ${rupees(item.amount)}` : ''}<small>{item.details || 'No details'} · Raised {fmt(item.createdOn)}</small></span>
          {item.email === data.viewer.email ? <span className="crm-muted">Superadmin will review</span> : <Decide token={token} kind="requests" id={item.id} say={say} />}
        </li>)}
      </ul> : <p className="crm-empty">Nothing waiting. New leave and requests from employees appear here.</p>}
    </section>

    <section className="crm-row">
      <div className="crm-card">
        <h2>Who is out (next 14 days)</h2>
        <ul className="crm-fu">{team.upcomingLeaves.length ? team.upcomingLeaves.map((leave) => <li key={leave.id}><span>{leave.name}<small>{leaveLabel(leave.type)}</small></span><span className="crm-muted">{range(leave)}</span></li>)
          : <li className="crm-muted">Everyone is in.</li>}</ul>
      </div>
      <div className="crm-card">
        <h2>Team by department</h2>
        {team.byDepartment.length ? team.byDepartment.map((item) => <div key={item.name} className="crm-src"><span>{item.name}</span><span className="crm-bar"><i style={{ width: `${item.count / maxDept * 100}%` }} /></span><span>{item.count}</span></div>)
          : <p className="crm-empty">Add employees to see departments.</p>}
      </div>
    </section>
    <section className="crm-row">
      <div className="crm-card">
        <h2>Upcoming holidays</h2>
        <ul className="crm-fu">{upcomingHolidays.length ? upcomingHolidays.map((holiday) => <li key={holiday.day}><span>{holiday.name}</span><span className="crm-muted">{fmt(holiday.day)}</span></li>) : <li className="crm-muted">No holidays added yet.</li>}</ul>
      </div>
      <div className="crm-card">
        <h2>Announcements</h2>
        <ul className="crm-fu">{data.announcements.length ? data.announcements.slice(0, 3).map((item) => <li key={item.id}><span><b>{item.title}</b><small>{item.body}</small></span><span className="crm-muted">{fmt(item.date)}</span></li>) : <li className="crm-muted">No announcements yet.</li>}</ul>
      </div>
    </section>
  </div>
}

function Employees({ data, team, token, say }: { data: HrData; team: NonNullable<HrData['team']>; token: string; say: Say }) {
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [editing, setEditing] = useState<Employee | null>(null)
  const owner = data.viewer.isOwner
  const list = team.employees.filter((employee) => (!dept || (employee.department ?? '') === dept)
    && (!q || `${employee.name} ${employee.email} ${employee.designation ?? ''} ${employee.employeeCode ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  return <div className="crm">
    <Header title="Employees" text="Every Scorenow staff account is an employee here. Add job, joining and contact details; the Superadmin also keeps salary and bank details." />
    <section className="crm-card">
      <div className="crm-tools">
        <input type="search" placeholder="Search name, email, code or designation" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search employees" />
        <select value={dept} onChange={(event) => setDept(event.target.value)} aria-label="Filter by department"><option value="">All departments</option>{data.options.departments.map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      {list.length ? <div className="crm-wrap"><table className="crm-table">
        <thead><tr><th>Employee</th><th>Job</th><th>Joined</th><th>Today</th><th>Status</th>{owner && <th>Monthly salary</th>}<th /></tr></thead>
        <tbody>{list.map((employee) => <tr key={employee.email}>
          <td><button type="button" className="crm-open" onClick={() => setEditing(employee)}>{employee.name}</button><small>{employee.email}{employee.employeeCode ? ` · ${employee.employeeCode}` : ''}</small></td>
          <td>{employee.designation || ROLE[employee.role]}<small>{employee.department || 'No department'} · {ROLE[employee.role]}{employee.agentType ? ` (${employee.agentType})` : ''}</small></td>
          <td>{fmt(employee.joinedOn)}<small>{employee.employmentType ?? ''}</small></td>
          <td><TodayTag employee={employee} /></td>
          <td><span className={`crm-tag ${TONE[employee.hrStatus]}`}>{employee.hrStatus === 'notice' ? 'On notice' : employee.hrStatus === 'exited' ? `Left ${fmt(employee.exitOn)}` : 'Active'}</span></td>
          {owner && <td>{employee.monthlySalary ? rupees(employee.monthlySalary) : <span className="crm-overdue">Not set</span>}</td>}
          <td><button className="crm-btn ghost sm" type="button" onClick={() => setEditing(employee)}>Edit</button></td>
        </tr>)}</tbody>
      </table></div> : <p className="crm-empty">{team.employees.length ? 'No employees match.' : 'No employees yet. Add staff from Manage admins and they appear here.'}</p>}
    </section>
    {editing && <EmployeeDialog employee={editing} data={data} token={token} onClose={() => setEditing(null)} onSaved={(text) => { setEditing(null); say(text) }} />}
  </div>
}

function TodayTag({ employee }: { employee: Employee }) {
  if (employee.onLeave) return <span className="crm-tag s-interested">On leave</span>
  if (!employee.todayStatus) return <span className="crm-muted">Not marked</span>
  if (employee.todayStatus === 'absent') return <span className="crm-tag s-lost">Absent</span>
  return <><span className="crm-tag s-paid">{employee.todayStatus === 'half_day' ? 'Half day' : MODE[employee.todayMode ?? 'office']}</span>{employee.checkIn && <small>In {clock(employee.checkIn)}{employee.checkOut ? ` · Out ${clock(employee.checkOut)}` : ''}</small>}</>
}

function EmployeeDialog({ employee, data, token, onClose, onSaved }: { employee: Employee; data: HrData; token: string; onClose: () => void; onSaved: (text: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hrStatus, setHrStatus] = useState(employee.hrStatus)
  const owner = data.viewer.isOwner
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const values = form(event)
    setBusy(true)
    hrApi<{ message: string }>(token, `/employees/${encodeURIComponent(employee.email)}`, 'PUT', values).then((result) => onSaved(result.message)).catch((err: Error) => setError(err.message)).finally(() => setBusy(false))
  }
  return <div className="crm-modal" role="dialog" aria-modal="true" aria-label={`Edit ${employee.name}`} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="crm-det crm-form" onSubmit={submit}>
      <h2>{employee.name}</h2>
      <p className="crm-muted">{employee.email} · {ROLE[employee.role]}{employee.agentType ? ` (${employee.agentType})` : ''}</p>
      {error && <p className="dashboard-notice error" role="alert">{error}</p>}
      <div className="crm-g2">
        <label>Employee code<input name="employeeCode" defaultValue={employee.employeeCode ?? ''} maxLength={20} placeholder="SN-001" /></label>
        <label>Designation<input name="designation" defaultValue={employee.designation ?? ''} maxLength={80} placeholder="Credit advisor" /></label>
      </div>
      <div className="crm-g2">
        <label>Department<select name="department" defaultValue={employee.department ?? ''}><option value="">Choose…</option>{data.options.departments.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Employment type<select name="employmentType" defaultValue={employee.employmentType ?? ''}><option value="">Choose…</option>{data.options.employmentTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="crm-g2">
        <label>Joining date<input name="joinedOn" type="date" defaultValue={employee.joinedOn ?? ''} /></label>
        <label>Mobile number<input name="phone" inputMode="tel" defaultValue={employee.phone ?? ''} placeholder="10-digit mobile" /></label>
      </div>
      <div className="crm-g2">
        <label>Reports to<select name="reportsTo" defaultValue={employee.reportsTo ?? ''}><option value="">Superadmin</option>{data.team?.employees.filter((item) => item.email !== employee.email && item.role === 'manager').map((item) => <option key={item.email} value={item.email}>{item.name}</option>)}</select></label>
        <label>Employment status<select name="hrStatus" value={hrStatus} onChange={(event) => setHrStatus(event.target.value as Employee['hrStatus'])}><option value="active">Active</option><option value="notice">On notice</option><option value="exited">Left the company</option></select></label>
      </div>
      {hrStatus !== 'active' && <label>Last working day<input name="exitOn" type="date" defaultValue={employee.exitOn ?? ''} required={hrStatus === 'exited'} /></label>}
      {owner && <fieldset className="hr-private">
        <legend>Salary and bank (only you can see this)</legend>
        <div className="crm-g2">
          <label>Monthly salary (₹)<input name="monthlySalary" type="number" min={0} step={1} defaultValue={employee.monthlySalary || ''} placeholder="30000" /></label>
          <label>PAN<input name="pan" defaultValue={employee.pan ?? ''} maxLength={10} placeholder="ABCDE1234F" /></label>
        </div>
        <div className="crm-g2">
          <label>Bank account number<input name="bankAccount" inputMode="numeric" defaultValue={employee.bankAccount ?? ''} /></label>
          <label>IFSC<input name="ifsc" defaultValue={employee.ifsc ?? ''} maxLength={11} placeholder="SBIN0001234" /></label>
        </div>
      </fieldset>}
      <div className="crm-acts"><button className="crm-btn ghost" type="button" onClick={onClose}>Cancel</button><button className="crm-btn" type="submit" disabled={busy}>Save employee</button></div>
    </form>
  </div>
}

function Attendance({ data, team, token, say, version }: { data: HrData; team: NonNullable<HrData['team']>; token: string; say: Say; version: number }) {
  const [day, setDay] = useState(data.today)
  const [month, setMonth] = useState(data.today.slice(0, 7))
  const [register, setRegister] = useState<Register | null>(null)
  const [busy, setBusy] = useState('')
  useEffect(() => {
    let cancelled = false
    hrApi<Register>(token, `/attendance?month=${month}`).then((result) => { if (!cancelled) setRegister(result) }).catch((err: Error) => { if (!cancelled) say(err.message, 'error') })
    return () => { cancelled = true }
    // say is recreated every render; reloading on version is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month, version])
  const working = team.employees.filter((employee) => employee.hrStatus !== 'exited')
  const codeFor = (email: string) => {
    if (!register || register.month !== day.slice(0, 7)) return null
    const row = register.rows.find((item) => item.email === email)
    return row?.codes[Number(day.slice(8)) - 1] ?? null
  }
  const mark = (email: string, status: string, mode = 'office') => {
    setBusy(email)
    hrApi<{ message: string }>(token, '/attendance', 'PUT', { email, day, status, mode }).then((result) => say(result.message)).catch((err: Error) => say(err.message, 'error')).finally(() => setBusy(''))
  }
  const isToday = day === data.today
  return <div className="crm">
    <Header title="Attendance" text="Employees check in and out from My HR. Mark or correct anyone’s day here, and see the full month at a glance." />
    <section className="crm-card">
      <div className="hr-head"><h2>Mark attendance</h2><label className="hr-inline">Date<input type="date" value={day} max={data.today} onChange={(event) => { setDay(event.target.value); if (event.target.value) setMonth(event.target.value.slice(0, 7)) }} /></label></div>
      {working.length ? <div className="crm-wrap"><table className="crm-table">
        <thead><tr><th>Employee</th><th>{isToday ? 'Today' : fmt(day)}</th><th>Mark as</th></tr></thead>
        <tbody>{working.map((employee) => { const code = isToday ? null : codeFor(employee.email); return <tr key={employee.email}>
          <td><b>{employee.name}</b><small>{employee.designation || ROLE[employee.role]}</small></td>
          <td>{isToday ? <TodayTag employee={employee} /> : code ? <span className={`hr-code c-${code === '-' ? 'n' : code}`} title={CODE_LABEL[code]}>{CODE_LABEL[code] ?? code}</span> : '—'}</td>
          <td><span className="hr-marks">
            <button className="crm-btn ghost sm" type="button" disabled={busy === employee.email} onClick={() => mark(employee.email, 'present')}>Present</button>
            <button className="crm-btn ghost sm" type="button" disabled={busy === employee.email} onClick={() => mark(employee.email, 'present', 'wfh')}>WFH</button>
            <button className="crm-btn ghost sm" type="button" disabled={busy === employee.email} onClick={() => mark(employee.email, 'half_day')}>Half day</button>
            <button className="crm-btn ghost sm hr-danger-ghost" type="button" disabled={busy === employee.email} onClick={() => mark(employee.email, 'absent')}>Absent</button>
            <button className="crm-btn ghost sm" type="button" disabled={busy === employee.email} onClick={() => mark(employee.email, 'clear')} title="Remove the mark">Clear</button>
          </span></td>
        </tr> })}</tbody>
      </table></div> : <p className="crm-empty">No employees yet.</p>}
    </section>
    <section className="crm-card">
      <div className="hr-head"><h2>Monthly register</h2><label className="hr-inline">Month<input type="month" value={month} max={data.today.slice(0, 7)} onChange={(event) => event.target.value && setMonth(event.target.value)} /></label></div>
      <p className="hr-legend">{Object.entries(CODE_LABEL).map(([code, label]) => <span key={code}><i className={`hr-code c-${code === '-' ? 'n' : code}`}>{code}</i>{label}</span>)}</p>
      {register ? <div className="crm-wrap"><table className="crm-table hr-register">
        <thead><tr><th>Employee</th>{register.days.map((d) => <th key={d} className={d === register.today ? 'today' : undefined}>{Number(d.slice(8))}</th>)}<th>Present</th><th>Leave</th><th>Absent</th></tr></thead>
        <tbody>{register.rows.map((row) => <tr key={row.email}>
          <td><b>{row.name}</b></td>
          {row.codes.map((code, index) => <td key={index}>{code && <i className={`hr-code c-${code === '-' ? 'n' : code}`} title={`${fmt(register.days[index])}: ${CODE_LABEL[code]}`}>{code}</i>}</td>)}
          <td><b>{row.present}</b></td><td>{row.leave}</td><td>{row.absent}</td>
        </tr>)}</tbody>
      </table></div> : <p className="crm-muted">Loading register…</p>}
    </section>
  </div>
}

function LeaveDesk({ data, team, token, say, run }: { data: HrData; team: NonNullable<HrData['team']>; token: string; say: Say; run: (promise: Promise<{ message?: string }>) => void }) {
  const leaveLabel = (key: string) => data.options.leaveTypes.find((item) => item.key === key)?.label ?? key
  const [half, setHalf] = useState(false)
  const others = team.employees.filter((employee) => employee.hrStatus !== 'exited' && employee.email !== data.viewer.email && (data.viewer.isOwner || employee.role !== 'manager'))
  return <div className="crm">
    <Header title="Leave" text="Approve or reject leave, record leave on someone’s behalf, and keep the full history. Sundays and holidays are never counted." />
    <section className="crm-card">
      <h2>Waiting for approval</h2>
      {team.pendingLeaves.length ? <div className="crm-wrap"><table className="crm-table">
        <thead><tr><th>Employee</th><th>Leave</th><th>Dates</th><th>Reason</th><th>Decision</th></tr></thead>
        <tbody>{team.pendingLeaves.map((leave) => <tr key={leave.id}>
          <td><b>{leave.name}</b><small>{ROLE[leave.role]} · Applied {fmt(leave.createdOn)}</small></td>
          <td>{leaveLabel(leave.type)}<small>{leave.days} working day{leave.days === 1 ? '' : 's'}{leave.halfDay ? ' (half day)' : ''}</small></td>
          <td>{range(leave)}</td><td>{leave.reason}</td>
          <td>{leave.email === data.viewer.email ? <span className="crm-muted">Superadmin will review</span> : <Decide token={token} kind="leaves" id={leave.id} say={say} />}</td>
        </tr>)}</tbody>
      </table></div> : <p className="crm-empty">No leave waiting for approval.</p>}
    </section>
    <section className="crm-row">
      <form className="crm-card crm-form" onSubmit={(event) => { const values = form(event); const target = event.currentTarget; run(hrApi(token, '/leaves', 'POST', { ...values, halfDay: half }).then((result) => { target.reset(); setHalf(false); return result })) }}>
        <h2>Record leave for an employee</h2>
        <p className="crm-muted">Use this when someone tells you about a leave. It is approved straight away.</p>
        <div className="crm-g2">
          <label>Employee<select name="email" required><option value="">Choose…</option>{others.map((employee) => <option key={employee.email} value={employee.email}>{employee.name}</option>)}</select></label>
          <label>Leave type<select name="type">{data.options.leaveTypes.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        </div>
        <div className="crm-g2">
          <label>From<input name="from" type="date" required /></label>
          {!half && <label>To<input name="to" type="date" /></label>}
        </div>
        <label className="hr-check"><input type="checkbox" checked={half} onChange={(event) => setHalf(event.target.checked)} /> Half day</label>
        <label>Reason<input name="reason" required maxLength={300} placeholder="Family function, fever…" /></label>
        <div className="crm-acts"><button className="crm-btn" type="submit">Record leave</button></div>
      </form>
      <div className="crm-card">
        <h2>Leave policy (per year)</h2>
        <ul className="crm-fu">{data.options.leaveTypes.map((item) => <li key={item.key}><span>{item.label}<small>{item.paid ? 'Paid' : 'Salary is cut for these days'}</small></span><b>{item.paid ? `${item.quota} days` : 'No limit'}</b></li>)}</ul>
      </div>
    </section>
    <section className="crm-card">
      <h2>Leave history</h2>
      <LeaveTable leaves={team.recentLeaves} label={leaveLabel} showName action={(leave) => leave.status === 'approved' && leave.to >= data.today
        ? <button className="crm-btn ghost sm" type="button" onClick={() => run(hrApi(token, `/leaves/${leave.id}/cancel`, 'POST'))}>Cancel</button> : null} />
    </section>
  </div>
}

function LeaveTable({ leaves, label, showName, action }: { leaves: Leave[]; label: (key: string) => string; showName?: boolean; action?: (leave: Leave) => ReactNode }) {
  if (!leaves.length) return <p className="crm-empty">No leave yet.</p>
  return <div className="crm-wrap"><table className="crm-table">
    <thead><tr>{showName && <th>Employee</th>}<th>Leave</th><th>Dates</th><th>Status</th>{action && <th />}</tr></thead>
    <tbody>{leaves.map((leave) => <tr key={leave.id}>
      {showName && <td><b>{leave.name}</b><small>{leave.reason}</small></td>}
      <td>{label(leave.type)}<small>{leave.days} day{leave.days === 1 ? '' : 's'}{showName ? '' : ` · ${leave.reason}`}</small></td>
      <td>{range(leave)}</td>
      <td><span className={`crm-tag ${TONE[leave.status]}`}>{leave.status}</span>{leave.decisionNote && <small>{leave.decisionNote}</small>}{leave.decidedBy && <small>By {leave.decidedBy}</small>}</td>
      {action && <td>{action(leave)}</td>}
    </tr>)}</tbody>
  </table></div>
}

function RequestDesk({ data, team, token, say, run }: { data: HrData; team: NonNullable<HrData['team']>; token: string; say: Say; run: (promise: Promise<{ message?: string }>) => void }) {
  return <div className="crm">
    <Header title="Requests" text="Reimbursements, salary advances, equipment, work from home and letters. Approved money claims are added to or recovered in the next payroll." />
    <section className="crm-card">
      <h2>Waiting for approval</h2>
      {team.pendingRequests.length ? <div className="crm-wrap"><table className="crm-table">
        <thead><tr><th>Employee</th><th>Request</th><th>Amount</th><th>Raised</th><th>Decision</th></tr></thead>
        <tbody>{team.pendingRequests.map((item) => <tr key={item.id}>
          <td><b>{item.name}</b><small>{ROLE[item.role]}</small></td>
          <td>{item.title}<small>{item.details || 'No details'}</small></td>
          <td>{rupees(item.amount)}</td><td>{fmt(item.createdOn)}</td>
          <td>{item.email === data.viewer.email ? <span className="crm-muted">Superadmin will review</span> : <Decide token={token} kind="requests" id={item.id} say={say} />}</td>
        </tr>)}</tbody>
      </table></div> : <p className="crm-empty">No requests waiting for approval.</p>}
    </section>
    <section className="crm-card">
      <h2>Request history</h2>
      <RequestTable requests={team.recentRequests} showName action={(item) => item.status === 'approved' && !item.settledMonth
        ? <button className="crm-btn ghost sm" type="button" onClick={() => run(hrApi(token, `/requests/${item.id}/cancel`, 'POST'))}>Cancel</button> : null} />
    </section>
  </div>
}

function RequestTable({ requests, showName, action }: { requests: HrRequest[]; showName?: boolean; action?: (item: HrRequest) => ReactNode }) {
  if (!requests.length) return <p className="crm-empty">No requests yet.</p>
  return <div className="crm-wrap"><table className="crm-table">
    <thead><tr>{showName && <th>Employee</th>}<th>Request</th><th>Amount</th><th>Status</th>{action && <th />}</tr></thead>
    <tbody>{requests.map((item) => <tr key={item.id}>
      {showName && <td><b>{item.name}</b><small>Raised {fmt(item.createdOn)}</small></td>}
      <td>{item.title}<small>{item.details || (showName ? '' : `Raised ${fmt(item.createdOn)}`)}</small></td>
      <td>{rupees(item.amount)}{item.settledMonth && <small>In {monthName(item.settledMonth)} payroll</small>}</td>
      <td><span className={`crm-tag ${TONE[item.status]}`}>{item.status}</span>{item.decisionNote && <small>{item.decisionNote}</small>}</td>
      {action && <td>{action(item)}</td>}
    </tr>)}</tbody>
  </table></div>
}

function PayrollDesk({ token, today, say, version }: { token: string; today: string; say: Say; version: number }) {
  const [month, setMonth] = useState(today.slice(0, 7))
  const [payroll, setPayroll] = useState<Payroll | null>(null)
  const [busy, setBusy] = useState(false)
  const [slip, setSlip] = useState<Payslip | null>(null)
  const [local, setLocal] = useState(0)
  useEffect(() => {
    let cancelled = false
    hrApi<Payroll>(token, `/payroll?month=${month}`).then((result) => { if (!cancelled) setPayroll(result) }).catch((err: Error) => { if (!cancelled) say(err.message, 'error') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month, version, local])
  const act = (path: string, method = 'POST', body?: unknown, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true)
    hrApi<{ message: string }>(token, path, method, body).then((result) => say(result.message)).catch((err: Error) => say(err.message, 'error')).finally(() => setBusy(false))
  }
  const draft = payroll?.status === 'draft'
  return <div className="crm">
    <Header title="Payroll" text="Generate the month’s salary from each employee’s salary, joining date, unpaid leave and approved claims. Add bonus or deductions, then mark it paid to release payslips."
      action={<label className="hr-inline">Month<input type="month" value={month} max={today.slice(0, 7)} onChange={(event) => event.target.value && setMonth(event.target.value)} /></label>} />
    {payroll && <>
      <section className="crm-kpis hr-kpis" aria-label="Payroll totals">
        <div className="crm-kpi"><b>{payroll.rows.length}</b><small>Employees in {monthName(month)}</small></div>
        <div className="crm-kpi"><b>{rupees(payroll.totals.earned)}</b><small>Salary earned</small></div>
        <div className="crm-kpi"><b>{rupees(payroll.totals.reimbursements + payroll.totals.bonus)}</b><small>Claims and bonus</small></div>
        <div className="crm-kpi"><b>{rupees(payroll.totals.lop + payroll.totals.advances + payroll.totals.deductions)}</b><small>Deductions</small></div>
        <div className="crm-kpi gold"><b>{rupees(payroll.totals.net)}</b><small>{payroll.status === 'paid' ? 'Paid' : payroll.status === 'draft' ? 'Net to pay (draft)' : 'Not generated'}</small></div>
      </section>
      <section className="crm-card">
        <div className="hr-head">
          <h2>{monthName(month)} salary sheet {payroll.status !== 'none' && <span className={`crm-tag ${TONE[payroll.status]}`}>{payroll.status}</span>}</h2>
          <span className="hr-decide">
            {payroll.status !== 'paid' && <button className="crm-btn ghost" type="button" disabled={busy} onClick={() => act(`/payroll/${month}/generate`)}>{draft ? 'Recalculate' : 'Generate payroll'}</button>}
            {draft && <button className="crm-btn" type="button" disabled={busy} onClick={() => act(`/payroll/${month}/pay`, 'POST', undefined, `Mark ${monthName(month)} payroll of ${rupees(payroll.totals.net)} as paid? Employees will get their payslips and this cannot be undone.`)}>Mark as paid</button>}
          </span>
        </div>
        {payroll.rows.length ? <div className="crm-wrap"><table className="crm-table hr-pay">
          <thead><tr><th>Employee</th><th>Salary</th><th>Paid days</th><th>Unpaid leave</th><th>Claims</th><th>Advance</th><th>Bonus</th><th>Deduction</th><th>Net pay</th><th /></tr></thead>
          <tbody>{payroll.rows.map((row) => <PayRow key={`${row.month}-${row.email}`} row={row} draft={draft} busy={busy} onSave={(body) => act(`/payroll/${month}/${encodeURIComponent(row.email)}`, 'PUT', body)} onSlip={() => setSlip(row)} />)}</tbody>
        </table></div> : <p className="crm-empty">No payroll for {monthName(month)} yet. Set monthly salaries in Employees, then click <b>Generate payroll</b>.</p>}
        {draft && <p className="crm-muted hr-foot">Bonus, deduction and note can be changed until the payroll is marked paid. Recalculating keeps them.</p>}
      </section>
    </>}
    {slip && <PayslipView slip={slip} onClose={() => { setSlip(null); setLocal((value) => value + 1) }} />}
  </div>
}

function PayRow({ row, draft, busy, onSave, onSlip }: { row: Payslip; draft: boolean; busy: boolean; onSave: (body: { bonus: string; otherDeductions: string; note: string }) => void; onSlip: () => void }) {
  const [bonus, setBonus] = useState(String(row.bonus || ''))
  const [deduction, setDeduction] = useState(String(row.otherDeductions || ''))
  const [note, setNote] = useState(row.note ?? '')
  const changed = bonus !== String(row.bonus || '') || deduction !== String(row.otherDeductions || '') || note !== (row.note ?? '')
  return <tr>
    <td><b>{row.name}</b><small>{row.designation || row.email}</small>{!row.bankAccount && <small className="crm-overdue">No bank account</small>}</td>
    <td>{rupees(row.salary)}</td>
    <td>{row.paidDays}/{row.daysInMonth}</td>
    <td>{row.lopDays ? <>{row.lopDays} day{row.lopDays === 1 ? '' : 's'}<small>−{rupees(row.lopAmount)}</small></> : '—'}</td>
    <td>{row.reimbursements ? `+${rupees(row.reimbursements)}` : '—'}</td>
    <td>{row.advances ? `−${rupees(row.advances)}` : '—'}</td>
    {draft && row.status === 'draft' ? <>
      <td><input className="hr-num" type="number" min={0} value={bonus} onChange={(event) => setBonus(event.target.value)} aria-label={`Bonus for ${row.name}`} placeholder="0" /></td>
      <td><input className="hr-num" type="number" min={0} value={deduction} onChange={(event) => setDeduction(event.target.value)} aria-label={`Deduction for ${row.name}`} placeholder="0" />
        <input className="hr-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Note" aria-label={`Note for ${row.name}`} /></td>
    </> : <><td>{row.bonus ? `+${rupees(row.bonus)}` : '—'}</td><td>{row.otherDeductions ? `−${rupees(row.otherDeductions)}` : '—'}{row.note && <small>{row.note}</small>}</td></>}
    <td><b>{rupees(row.net)}</b></td>
    <td>{changed ? <button className="crm-btn sm" type="button" disabled={busy} onClick={() => onSave({ bonus, otherDeductions: deduction, note })}>Save</button>
      : <button className="crm-btn ghost sm" type="button" onClick={onSlip}>Payslip</button>}</td>
  </tr>
}

function PayslipView({ slip, onClose }: { slip: Payslip; onClose: () => void }) {
  const lines: [string, number, 1 | -1][] = [['Salary earned', slip.earned, 1], ['Unpaid leave', slip.lopAmount, -1], ['Reimbursements', slip.reimbursements, 1], ['Salary advance recovered', slip.advances, -1], ['Bonus', slip.bonus, 1], ['Other deductions', slip.otherDeductions, -1]]
  return <div className="crm-modal" role="dialog" aria-modal="true" aria-label={`Payslip for ${slip.name}`} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="crm-det hr-slip">
      <div className="crm-dh"><div><h2>Payslip · {monthName(slip.month)}</h2><p className="crm-muted">Scorenow</p></div><span className={`crm-tag ${TONE[slip.status]}`}>{slip.status === 'paid' ? `Paid ${fmt(slip.paidOn)}` : 'Draft'}</span></div>
      <dl className="hr-slip-who">
        <div><dt>Employee</dt><dd>{slip.name}</dd></div>
        <div><dt>Email</dt><dd>{slip.email}</dd></div>
        {slip.employeeCode && <div><dt>Code</dt><dd>{slip.employeeCode}</dd></div>}
        {slip.designation && <div><dt>Designation</dt><dd>{slip.designation}</dd></div>}
        <div><dt>Monthly salary</dt><dd>{rupees(slip.salary)}</dd></div>
        <div><dt>Paid days</dt><dd>{slip.paidDays} of {slip.daysInMonth}{slip.lopDays ? ` · ${slip.lopDays} unpaid leave` : ''}</dd></div>
        {slip.bankAccount && <div><dt>Bank</dt><dd>A/c ending {slip.bankAccount.slice(-4)}{slip.ifsc ? ` · ${slip.ifsc}` : ''}</dd></div>}
      </dl>
      <table className="crm-table hr-slip-table"><tbody>
        {lines.filter(([, amount], index) => index === 0 || amount).map(([label, amount, sign]) => <tr key={label}><td>{label}</td><td>{sign < 0 ? '−' : ''}{rupees(amount)}</td></tr>)}
        <tr className="hr-slip-net"><td>Net pay</td><td>{rupees(slip.net)}</td></tr>
      </tbody></table>
      {slip.note && <p className="crm-muted">Note: {slip.note}</p>}
      <div className="crm-acts hr-noprint"><button className="crm-btn ghost" type="button" onClick={onClose}>Close</button><button className="crm-btn" type="button" onClick={() => window.print()}><Printer /> Print or save PDF</button></div>
    </div>
  </div>
}

function Company({ data, token, run }: { data: HrData; token: string; run: (promise: Promise<{ message?: string }>) => void }) {
  const admin = data.viewer.isAdmin
  const owner = data.viewer.isOwner
  const reset = (event: FormEvent<HTMLFormElement>) => { const target = event.currentTarget; return <T,>(result: T) => { target.reset(); return result } }
  return <div className="crm">
    <Header title={admin ? 'Holidays & policy' : 'Holidays & notices'} text={admin ? 'Company holidays are skipped when counting leave. Announcements reach every employee in My HR.' : 'Company holidays and the latest announcements from Scorenow.'} />
    <section className="crm-row">
      <div className="crm-card">
        <h2>Holidays</h2>
        <ul className="crm-fu">{data.holidays.length ? data.holidays.map((holiday) => <li key={holiday.day} className={holiday.day < data.today ? 'hr-past' : undefined}>
          <span>{holiday.name}<small>{new Date(`${holiday.day}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' })}</small></span>
          <span className="hr-decide"><span className="crm-muted">{fmt(holiday.day)}</span>{admin && <button className="crm-btn ghost sm" type="button" onClick={() => run(hrApi(token, `/holidays/${holiday.day}`, 'DELETE'))}>Remove</button>}</span>
        </li>) : <li className="crm-muted">No holidays added yet.</li>}</ul>
        {admin && <form className="crm-form hr-add" onSubmit={(event) => { const values = form(event); run(hrApi(token, '/holidays', 'POST', values).then(reset(event))) }}>
          <div className="crm-g2"><label>Date<input name="day" type="date" required /></label><label>Holiday<input name="name" required maxLength={80} placeholder="Diwali" /></label></div>
          <div className="crm-acts"><button className="crm-btn sm" type="submit">Add holiday</button></div>
        </form>}
      </div>
      <div className="crm-card">
        <h2>Leave policy (per year)</h2>
        <ul className="crm-fu">{data.options.leaveTypes.map((item) => <li key={item.key}>
          <span>{item.label}<small>{item.paid ? 'Paid leave' : 'Unpaid; salary is cut for these days'}</small></span>
          {owner && item.paid ? <form className="hr-decide" onSubmit={(event) => { const { quota } = form(event); run(hrApi(token, `/policy/${item.key}`, 'PUT', { quota })) }}>
            <input className="hr-num" name="quota" type="number" min={0} max={365} step={0.5} defaultValue={item.quota} aria-label={`${item.label} days per year`} /><button className="crm-btn ghost sm" type="submit">Save</button>
          </form> : <b>{item.paid ? `${item.quota} days` : 'No limit'}</b>}
        </li>)}</ul>
      </div>
    </section>
    <section className="crm-card">
      <h2>Announcements</h2>
      {admin && <form className="crm-form hr-add" onSubmit={(event) => { const values = form(event); run(hrApi(token, '/announcements', 'POST', values).then(reset(event))) }}>
        <label>Title<input name="title" required maxLength={120} placeholder="Office closed on Saturday" /></label>
        <label>Message<textarea name="body" required maxLength={2000} rows={3} /></label>
        <div className="crm-acts"><button className="crm-btn sm" type="submit">Post to all employees</button></div>
      </form>}
      <ul className="crm-fu">{data.announcements.length ? data.announcements.map((item) => <li key={item.id}>
        <span><b>{item.title}</b><small className="hr-pre">{item.body}</small><small>{fmt(item.date)} · {item.createdBy}</small></span>
        {admin && <button className="crm-btn ghost sm" type="button" onClick={() => run(hrApi(token, `/announcements/${item.id}`, 'DELETE'))}>Remove</button>}
      </li>) : <li className="crm-muted">No announcements yet.</li>}</ul>
    </section>
  </div>
}

function MyHr({ data, me, token, run }: { data: HrData; me: NonNullable<HrData['me']>; token: string; run: (promise: Promise<{ message?: string }>) => void }) {
  const [mode, setMode] = useState('office')
  const [half, setHalf] = useState(false)
  const [kind, setKind] = useState('reimbursement')
  const [slip, setSlip] = useState<Payslip | null>(null)
  const leaveLabel = (key: string) => data.options.leaveTypes.find((item) => item.key === key)?.label ?? key
  const { profile, attendance } = me
  const needsAmount = kind === 'reimbursement' || kind === 'advance'
  const nextHoliday = data.holidays.find((holiday) => holiday.day >= data.today)
  return <div className="crm">
    <Header title={`Hi ${profile.name.split(' ')[0]}`} text={`${profile.designation || ROLE[profile.role] || 'Employee'}${profile.department ? ` · ${profile.department}` : ''}${profile.joinedOn ? ` · Joined ${fmt(profile.joinedOn)}` : ''}. Mark attendance, apply for leave, raise requests and download payslips.`} />

    <section className="crm-card hr-clock">
      <div>
        <h2>Today · {fmt(data.today)}</h2>
        <p className="crm-muted">{!attendance ? 'You have not checked in yet.' : attendance.status === 'absent' ? 'Marked absent by HR.'
          : `${attendance.status === 'half_day' ? 'Half day' : MODE[attendance.mode]}${attendance.checkIn ? ` · In ${clock(attendance.checkIn)}` : ' · Marked by HR'}${attendance.checkOut ? ` · Out ${clock(attendance.checkOut)}` : ''}`}</p>
      </div>
      {!attendance ? <span className="hr-decide">
        <select value={mode} onChange={(event) => setMode(event.target.value)} aria-label="Where are you working">{data.options.modes.map((item) => <option key={item} value={item}>{MODE[item]}</option>)}</select>
        <button className="crm-btn" type="button" onClick={() => run(hrApi(token, '/attendance/me', 'POST', { action: 'in', mode }))}>Check in</button>
      </span> : attendance.checkIn && !attendance.checkOut ? <button className="crm-btn" type="button" onClick={() => run(hrApi(token, '/attendance/me', 'POST', { action: 'out' }))}>Check out</button>
        : <span className="crm-tag s-paid">Done for today</span>}
    </section>

    <section className="crm-kpis hr-kpis" aria-label="Leave balance">
      {me.balances.map((balance) => <div key={balance.key} className="crm-kpi"><b>{balance.left ?? balance.used}</b><small>{balance.paid ? `${balance.label} left of ${balance.quota}` : `${balance.label} taken`}{balance.pending ? ` · ${balance.pending} pending` : ''}</small></div>)}
      <div className="crm-kpi gold"><b>{me.presentDays}</b><small>Days present this month</small></div>
    </section>

    <section className="crm-row">
      <form className="crm-card crm-form" onSubmit={(event) => { const values = form(event); const target = event.currentTarget; run(hrApi(token, '/leaves', 'POST', { ...values, halfDay: half }).then((result) => { target.reset(); setHalf(false); return result })) }}>
        <h2>Apply for leave</h2>
        <div className="crm-g2">
          <label>Leave type<select name="type">{data.options.leaveTypes.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label className="hr-check hr-check-mid"><input type="checkbox" checked={half} onChange={(event) => setHalf(event.target.checked)} /> Half day</label>
        </div>
        <div className="crm-g2">
          <label>From<input name="from" type="date" required min={data.today} /></label>
          {!half && <label>To<input name="to" type="date" min={data.today} /></label>}
        </div>
        <label>Reason<input name="reason" required maxLength={300} /></label>
        <div className="crm-acts"><button className="crm-btn" type="submit">Send for approval</button></div>
      </form>
      <form className="crm-card crm-form" onSubmit={(event) => { const values = form(event); const target = event.currentTarget; run(hrApi(token, '/requests', 'POST', values).then((result) => { target.reset(); setKind('reimbursement'); return result })) }}>
        <h2>Raise a request</h2>
        <div className="crm-g2">
          <label>Request<select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>{data.options.requestKinds.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          {needsAmount ? <label>Amount (₹)<input name="amount" type="number" min={1} required /></label> : <label>Title<input name="title" maxLength={120} placeholder="Optional" /></label>}
        </div>
        {needsAmount && <label>Title<input name="title" maxLength={120} placeholder={kind === 'advance' ? 'Salary advance' : 'Client visit travel'} /></label>}
        <label>Details<textarea name="details" rows={2} maxLength={1000} placeholder={kind === 'reimbursement' ? 'What was spent and when' : 'Anything HR should know'} /></label>
        <div className="crm-acts"><button className="crm-btn" type="submit">Send request</button></div>
      </form>
    </section>

    <section className="crm-card">
      <h2>My leave</h2>
      <LeaveTable leaves={me.leaves} label={leaveLabel} action={(leave) => leave.status === 'pending'
        ? <button className="crm-btn ghost sm" type="button" onClick={() => run(hrApi(token, `/leaves/${leave.id}/cancel`, 'POST'))}>Withdraw</button> : null} />
    </section>
    <section className="crm-card">
      <h2>My requests</h2>
      <RequestTable requests={me.requests} action={(item) => item.status === 'pending'
        ? <button className="crm-btn ghost sm" type="button" onClick={() => run(hrApi(token, `/requests/${item.id}/cancel`, 'POST'))}>Withdraw</button> : null} />
    </section>
    <section className="crm-row">
      <div className="crm-card">
        <h2>My payslips</h2>
        <ul className="crm-fu">{me.payslips.length ? me.payslips.map((item) => <li key={item.month}><span>{monthName(item.month)}<small>Paid {fmt(item.paidOn)}</small></span>
          <span className="hr-decide"><b>{rupees(item.net)}</b><button className="crm-btn ghost sm" type="button" onClick={() => setSlip(item)}>View</button></span></li>)
          : <li className="crm-muted">Payslips appear here once salary is paid.</li>}</ul>
      </div>
      <div className="crm-card">
        <h2>From HR</h2>
        <ul className="crm-fu">
          {nextHoliday && <li><span>Next holiday: <b>{nextHoliday.name}</b></span><span className="crm-muted">{fmt(nextHoliday.day)}</span></li>}
          {data.announcements.length ? data.announcements.map((item) => <li key={item.id}><span><b>{item.title}</b><small className="hr-pre">{item.body}</small></span><span className="crm-muted">{fmt(item.date)}</span></li>)
            : <li className="crm-muted">No announcements yet.</li>}
        </ul>
      </div>
    </section>
    {slip && <PayslipView slip={{ ...slip, designation: profile.designation, employeeCode: profile.employeeCode }} onClose={() => setSlip(null)} />}
  </div>
}
