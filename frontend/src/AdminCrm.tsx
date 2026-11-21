import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, BadgeIndianRupee, Check, CheckCircle2, Download, Phone, Search, Star, UserPlus } from 'lucide-react'
import { subscribeAdminStream } from './adminLive'
import './AdminCrm.css'
import { ApplicationProgress } from './ApplicationProgress'
import { ShareProgressButton } from './AgentTypes'
import { applicationProgressLabel } from './applicationProgressUtils'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const PAGE_SIZE = 25

const STAGES = ['new', 'contacted', 'interested', 'paid', 'closed'] as const
type Stage = (typeof STAGES)[number]
const STAGE_ICONS: Record<Stage, typeof Phone> = { new: UserPlus, contacted: Phone, interested: Star, paid: BadgeIndianRupee, closed: CheckCircle2 }
const ACTIVITY_KINDS = ['note', 'call', 'whatsapp', 'email'] as const
type ActivityKind = (typeof ACTIVITY_KINDS)[number]

type CrmCustomer = {
  id: string; name: string; email: string | null; mobile: string | null; created_at: string
  stage: Stage; tags: string[]; last_activity_at: string | null; open_tasks: number
}
type CrmActivity = { id: string; kind: ActivityKind; body: string; created_by: string; created_at: string }
type CrmTask = {
  id: string; title: string; due_at: string | null; assignee_email: string | null; status: 'open' | 'done'
  created_by: string; created_at: string; completed_at: string | null
}
type OpenTask = CrmTask & { user_id: string; customer_name: string; mobile: string | null }
type CrmTimeline = {
  profile: {
    stage: Stage; tags: string[]; updated_by: string | null; updated_at: string | null
    partner_email: string | null; commission_amount_paise: number | null
    commission_awarded_at: string | null; commission_status: 'pending' | 'paid' | null
  }
  activities: CrmActivity[]
  payments: { id: string; plan_name: string; amount: string; status: string; failure_reason: string | null; created_at: string }[]
  reports: { id: string; bureau: string; status: string; requested_at: string }[]
  tasks: CrmTask[]
}
type Notice = { tone: 'info' | 'error'; text: string }

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })
const jsonHeaders = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const readError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({})) as { message?: string }
  return body.message || fallback
}
const request = async <T,>(path: string, token: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: init.body ? jsonHeaders(token) : authHeaders(token) })
  if (!response.ok) throw new Error(await readError(response, 'Request failed.'))
  return response.json() as Promise<T>
}
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const formatRupees = (amount: string) => `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const isOverdue = (task: { due_at: string | null; status: string }) => task.status === 'open' && Boolean(task.due_at) && new Date(task.due_at as string) < new Date()

type ApplicationRow = {
  id: string; full_name: string; email: string; mobile: string; application_status: string; customer_remark: string | null
  assigned_admin_email: string | null; application_submitted_at: string | null; partner_email: string | null
  updated_at: string; open_verifications: number
}
type ApplicationTask = {
  id: string; title: string; due_at: string | null; assignee_email: string | null; status: string; task_kind: string
  review_status: string; review_remark: string | null; result: string | null; created_by: string; created_at: string; completed_at: string | null
}
type ApplicationDetail = {
  application: ApplicationRow & {
    date_of_birth: string | null; gender: string | null; pan_last4: string | null; address_line1: string | null
    city: string | null; state: string | null; pincode: string | null
  }
  tasks: ApplicationTask[]
  events: { id: string; event_type: string; application_status: string | null; visibility: string; remark: string | null; actor_email: string; created_at: string }[]
  documents: { id: number; document_type: string; file_name: string; mime_type: string; size: number; created_at: string }[]
}
type CrmAssignee = { email: string; full_name: string }

const applicationStatusLabel = applicationProgressLabel

export function PartnerApplications({ token, role }: { token: string; role: 'owner' | 'manager' }) {
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [assignees, setAssignees] = useState<{ admins: CrmAssignee[]; agents: CrmAssignee[] }>({ admins: [], agents: [] })
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<ApplicationDetail | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [agentEmail, setAgentEmail] = useState('')
  const [taskTitle, setTaskTitle] = useState('Credit Score Verification')
  const [taskDue, setTaskDue] = useState('')
  const [customerRemark, setCustomerRemark] = useState('')
  const [reviewRemark, setReviewRemark] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const loadDetail = useCallback(async (userId: string) => {
    try {
      const next = await request<ApplicationDetail>(`/api/admin/crm/applications/${userId}`, token)
      setDetail(next)
      setCustomerRemark(next.application.customer_remark || '')
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to load this application.') })
    }
  }, [token])

  const selectApplication = (userId: string) => {
    setDetail(null)
    setSelectedId(userId)
  }

  useEffect(() => {
    let active = true
    const stop = subscribeAdminStream<ApplicationRow[]>(`${apiUrl}/api/admin/crm/applications/stream`, token, {
      onSnapshot: (next) => {
        if (!active) return
        setApplications(next)
        if (selectedId) void loadDetail(selectedId)
      },
      onError: (message) => { if (active) setNotice({ tone: 'error', text: message }) },
      onExpired: () => { if (active) setNotice({ tone: 'error', text: 'Your session has ended. Sign in again.' }) },
    })
    request<{ admins: CrmAssignee[]; agents: CrmAssignee[] }>('/api/admin/crm/application-assignees', token)
      .then((next) => { if (active) setAssignees(next) })
      .catch((error) => { if (active) setNotice({ tone: 'error', text: errorText(error, 'Unable to load assignees.') }) })
    return () => { active = false; stop() }
  }, [token, selectedId, loadDetail])

  const performAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selectedId) return
    setBusy(true)
    setNotice(null)
    try {
      await request(`/api/admin/crm/applications/${selectedId}/action`, token, {
        method: 'POST', body: JSON.stringify({ action, customerRemark, ...extra }),
      })
      setNotice({ tone: 'info', text: 'Application updated.' })
      await loadDetail(selectedId)
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to update the application.') })
    } finally {
      setBusy(false)
    }
  }

  const createVerification = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId) return
    setBusy(true)
    setNotice(null)
    try {
      await request(`/api/admin/crm/applications/${selectedId}/tasks`, token, {
        method: 'POST',
        body: JSON.stringify({ title: taskTitle, agentEmail, dueAt: taskDue }),
      })
      setNotice({ tone: 'info', text: 'Verification assigned.' })
      setTaskTitle('Credit Score Verification')
      setTaskDue('')
      await loadDetail(selectedId)
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to assign verification.') })
    } finally {
      setBusy(false)
    }
  }

  const reviewTask = async (taskId: string, action: 'approve' | 'return') => {
    setBusy(true)
    setNotice(null)
    try {
      await request(`/api/admin/crm/tasks/${taskId}/review`, token, {
        method: 'POST', body: JSON.stringify({ action, remark: reviewRemark[taskId] || '' }),
      })
      setNotice({ tone: 'info', text: action === 'approve' ? 'Verification approved.' : 'Verification returned to the agent.' })
      await loadDetail(selectedId)
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to review verification.') })
    } finally {
      setBusy(false)
    }
  }

  const downloadDocument = async (document: ApplicationDetail['documents'][number]) => {
    try {
      const response = await fetch(`${apiUrl}/api/admin/crm/applications/${selectedId}/documents/${document.id}`, { headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to download this document.'))
      const url = URL.createObjectURL(await response.blob())
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.file_name
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to download this document.') })
    }
  }

  const status = detail?.application.application_status || ''
  return <article className="dashboard-card admin-activity-card">
    <div className="dashboard-card-heading"><strong>Credit application workflow</strong><small>One application record from partner submission through final decision</small></div>
    {notice && <p className={`dashboard-notice ${notice.tone === 'error' ? 'error' : ''}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
    {applications.length
      ? <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Customer</th><th>Partner</th><th>Status</th><th>Admin</th><th>Updated</th></tr></thead><tbody>
        {applications.map((application) => <tr key={application.id} onClick={() => selectApplication(application.id)} style={{ cursor: 'pointer', background: application.id === selectedId ? 'rgba(0,0,0,0.04)' : undefined }}>
          <td>{application.full_name}<br /><small>{application.mobile} · {application.email}</small></td>
          <td>{application.partner_email || '—'}</td>
          <td>{applicationStatusLabel(application.application_status)}</td>
          <td>{application.assigned_admin_email || '—'}</td>
          <td>{formatDate(application.updated_at)}</td>
        </tr>)}
      </tbody></table></div>
      : <p className="admin-activity-empty">No submitted applications.</p>}

    {detail && <section className="admin-management-card">
      <h3>{detail.application.full_name} · {applicationStatusLabel(status)}</h3>
      <p>{detail.application.email} · {detail.application.mobile} · PAN ending {detail.application.pan_last4 || '—'}</p>
      <p>{detail.application.date_of_birth || '—'} · {detail.application.gender || '—'} · {detail.application.address_line1}, {detail.application.city}, {detail.application.state} {detail.application.pincode}</p>
      <ApplicationProgress status={status} />
      <ShareProgressButton key={selectedId} token={token} customerId={selectedId} />
      <p><strong>Customer-facing remark:</strong> {detail.application.customer_remark || '—'}</p>
      <label>Customer-facing update<textarea value={customerRemark} onChange={(event) => setCustomerRemark(event.target.value)} maxLength={500} rows={2} /></label>

      {role === 'owner' && <>
        {['submitted', 'correction_required'].includes(status) && <button className="button button-outline" disabled={busy} onClick={() => void performAction('start_review')}>Start review</button>}
        {['submitted', 'under_review', 'correction_required'].includes(status) && <>
          <button className="button button-primary" disabled={busy} onClick={() => void performAction('approve')}>Approve for processing</button>
          <button className="button button-outline" disabled={busy || !customerRemark.trim()} onClick={() => void performAction('return_for_correction')}>Return for correction</button>
          <button className="button button-outline danger" disabled={busy || !customerRemark.trim()} onClick={() => void performAction('reject')}>Reject</button>
        </>}
        {status === 'approved_for_processing' && <form className="admin-inline-form" onSubmit={(event) => { event.preventDefault(); void performAction('assign_admin', { adminEmail }) }}>
          <select value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required><option value="">Assign to admin</option>
            {assignees.admins.map((admin) => <option key={admin.email} value={admin.email}>{admin.full_name} · {admin.email}</option>)}
          </select><button className="button button-primary" type="submit" disabled={busy || !adminEmail}>Assign application</button>
        </form>}
        {status === 'final_review' && <>
          <button className="button button-primary" disabled={busy} onClick={() => void performAction('final_approve')}>Final approve</button>
          <button className="button button-outline danger" disabled={busy || !customerRemark.trim()} onClick={() => void performAction('final_reject')}>Final reject</button>
          <button className="button button-outline" disabled={busy || !customerRemark.trim()} onClick={() => void performAction('return_for_correction')}>Return for correction</button>
        </>}
      </>}

      {role === 'manager' && <>
        {['approved_for_processing', 'verification_assigned', 'verification_in_progress', 'verification_completed'].includes(status) && <>
          <form className="admin-inline-form" onSubmit={(event) => void createVerification(event)}>
            <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={200} required aria-label="Verification name" />
            <select value={agentEmail} onChange={(event) => setAgentEmail(event.target.value)} required><option value="">Assign agent</option>
              {assignees.agents.map((agent) => <option key={agent.email} value={agent.email}>{agent.full_name} · {agent.email}</option>)}
            </select>
            <input type="datetime-local" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} aria-label="Due date" />
            <button className="button button-primary" type="submit" disabled={busy || !agentEmail}>Assign verification</button>
          </form>
          <button className="button button-outline" disabled={busy || !customerRemark.trim()} onClick={() => void performAction('request_correction')}>Return application for correction</button>
          {status === 'verification_completed' && <button className="button button-primary" disabled={busy} onClick={() => void performAction('send_to_superadmin')}>Send to Super Admin</button>}
        </>}
      </>}

      <h4>Verification work</h4>
      {detail.tasks.filter((task) => task.task_kind === 'verification').length
        ? <div className="admin-table-wrap"><table className="admin-activity-table"><thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Agent findings (internal)</th><th>Review</th></tr></thead><tbody>
          {detail.tasks.filter((task) => task.task_kind === 'verification').map((task) => <tr key={task.id}>
            <td>{task.title}<br /><small>{formatDate(task.due_at)}</small></td>
            <td>{task.assignee_email || '—'}</td>
            <td>{task.review_status.replaceAll('_', ' ')}{task.review_remark && <><br /><small>Internal note: {task.review_remark}</small></>}</td>
            <td>{task.result || '—'}</td>
            <td>{task.review_status === 'submitted' && <><input value={reviewRemark[task.id] || ''} onChange={(event) => setReviewRemark((current) => ({ ...current, [task.id]: event.target.value }))} maxLength={500} placeholder="Internal review note" aria-label="Internal review note" />
              <button className="button button-primary" type="button" disabled={busy} onClick={() => void reviewTask(task.id, 'approve')}>Approve</button>
              <button className="button button-outline" type="button" disabled={busy || !(reviewRemark[task.id] || '').trim()} onClick={() => void reviewTask(task.id, 'return')}>Return</button></>}</td>
          </tr>)}
        </tbody></table></div>
        : <p className="admin-activity-empty">No verification tasks have been assigned.</p>}

      <h4>Submitted documents</h4>
      {detail.documents.length
        ? <ul>{detail.documents.map((document) => <li key={document.id}>
          {document.document_type.toUpperCase()} · {document.file_name} · {formatDate(document.created_at)}{' '}
          <button className="button button-outline" type="button" onClick={() => void downloadDocument(document)}>Download</button>
        </li>)}</ul>
        : <p className="admin-activity-empty">No documents uploaded.</p>}

      <h4>Application timeline (internal)</h4>
      <ul className="admin-activity-list">{detail.events.map((event) => <li key={event.id}>
        <strong>{applicationStatusLabel(event.application_status) || event.event_type.replaceAll('_', ' ')}</strong> · {formatDate(event.created_at)} · {event.actor_email}
        {event.remark ? ` · ${event.remark}` : ''}
      </li>)}</ul>
    </section>}
  </article>
}

type AgentWorkTask = {
  id: string; user_id: string; customer_name: string; title: string; due_at: string | null
  review_status: string; review_remark: string | null; result: string | null; application_status: string | null
}
type AgentTaskDetail = {
  task: AgentWorkTask & {
    email: string | null; mobile: string | null; full_name: string; date_of_birth: string | null
    gender: string | null; pan_last4: string | null; address_line1: string | null; city: string | null
    state: string | null; pincode: string | null; application_status: string | null
    customer_remark: string | null; partner_email: string | null
  }
  comments: { id: string; remark: string; actor_email: string; actor_role: string; created_at: string }[]
}

export function AgentWorkQueue({ token }: { token: string }) {
  const [tasks, setTasks] = useState<AgentWorkTask[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<AgentTaskDetail | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [comment, setComment] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busyId, setBusyId] = useState('')
  const loadDetail = useCallback(async (taskId: string) => {
    try {
      setDetail(await request<AgentTaskDetail>(`/api/admin/crm/my-tasks/${taskId}`, token))
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to load the customer details.') })
    }
  }, [token])

  useEffect(() => subscribeAdminStream<AgentWorkTask[]>(`${apiUrl}/api/admin/crm/my-tasks/stream`, token, {
    onSnapshot: (next) => {
      setTasks(next)
      if (selectedId && next.some((task) => task.id === selectedId)) void loadDetail(selectedId)
      else if (!selectedId && next[0]) { setSelectedId(next[0].id); void loadDetail(next[0].id) }
    },
    onError: (message) => setNotice({ tone: 'error', text: message }),
    onExpired: () => setNotice({ tone: 'error', text: 'Your session has ended. Sign in again.' }),
  }), [token, selectedId, loadDetail])

  const taskAction = async (task: AgentWorkTask, action: 'start' | 'submit') => {
    const result = results[task.id] || ''
    setBusyId(task.id)
    setNotice(null)
    try {
      const updated = await request<{ status: string }>(`/api/admin/crm/tasks/${task.id}/${action}`, token, {
        method: 'POST', ...(action === 'submit' ? { body: JSON.stringify({ result }) } : {}),
      })
      setTasks((current) => current.map((item) => item.id === task.id
        ? { ...item, review_status: updated.status, result: action === 'submit' ? result : item.result }
        : item))
      if (action === 'submit') setResults((current) => ({ ...current, [task.id]: '' }))
      await loadDetail(task.id)
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to update this task.') })
    } finally {
      setBusyId('')
    }
  }

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedId || !comment.trim()) return
    setBusyId(selectedId)
    setNotice(null)
    try {
      await request(`/api/admin/crm/tasks/${selectedId}/comments`, token, {
        method: 'POST', body: JSON.stringify({ comment }),
      })
      setComment('')
      await loadDetail(selectedId)
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to save the comment.') })
    } finally {
      setBusyId('')
    }
  }

  const selectedTask = tasks.find((task) => task.id === selectedId)
  return <>
    <div className="admin-heading"><span>AGENT WORKSPACE</span><h1>Verification desk</h1><p>Open each assigned customer, record your findings, and keep the internal conversation updated until the work is ready for admin review.</p></div>
    {notice && <p className={`dashboard-notice ${notice.tone === 'error' ? 'error' : ''}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
    {tasks.length ? <div className="admin-agent-workspace">
      <section className="dashboard-card admin-agent-task-list">
        <div className="dashboard-card-heading"><strong>Assigned verifications</strong><small>{tasks.length} open task{tasks.length === 1 ? '' : 's'}</small></div>
        <div className="admin-agent-task-items">{tasks.map((task) => <button
          className={`admin-agent-task-item ${task.id === selectedId ? 'active' : ''}`}
          key={task.id}
          type="button"
          onClick={() => { setSelectedId(task.id); setDetail(null); void loadDetail(task.id) }}
        >
          <span><strong>{task.customer_name}</strong><small>{task.title}</small></span>
          <span><em className={`admin-status ${task.review_status === 'submitted' ? 'completed' : task.review_status === 'returned' ? 'failed' : 'pending'}`}>{task.review_status.replaceAll('_', ' ')}</em><small>{task.due_at ? `Due ${formatDate(task.due_at)}` : 'No due date'}</small></span>
        </button>)}</div>
      </section>
      <section className="dashboard-card admin-agent-task-detail">
        {!detail && <div className="admin-agent-empty"><strong>Select a verification</strong><span>Customer details and the internal work thread will appear here.</span></div>}
        {detail && selectedTask && <><div className="admin-agent-detail-header">
          <div><span>VERIFICATION CASE</span><h2>{detail.task.full_name}</h2><p>{detail.task.title} · {detail.task.email || 'No email'} · {detail.task.mobile || 'No mobile'}</p></div>
          <em className={`admin-status ${detail.task.review_status === 'submitted' ? 'completed' : detail.task.review_status === 'returned' ? 'failed' : 'pending'}`}>{detail.task.review_status.replaceAll('_', ' ')}</em>
        </div>
        <ApplicationProgress status={detail.task.application_status} />
        {detail.task.review_status === 'returned' && <div className="admin-agent-returned"><strong>Admin requested changes</strong><span>{detail.task.review_remark || 'Review the case and update your findings.'}</span></div>}
        <div className="admin-agent-customer-grid">
          <div><span>Date of birth</span><strong>{detail.task.date_of_birth || '—'}</strong></div>
          <div><span>Gender</span><strong>{detail.task.gender || '—'}</strong></div>
          <div><span>PAN</span><strong>{detail.task.pan_last4 ? `Ending ${detail.task.pan_last4}` : '—'}</strong></div>
          <div><span>Partner</span><strong>{detail.task.partner_email || '—'}</strong></div>
          <div className="wide"><span>Address</span><strong>{[detail.task.address_line1, detail.task.city, detail.task.state, detail.task.pincode].filter(Boolean).join(', ') || '—'}</strong></div>
        </div>
        <div className="admin-agent-section"><div className="admin-agent-section-title"><strong>Internal work notes</strong><small>Visible to the verification team and admin only</small></div>
          <div className="admin-agent-comments">{detail.comments.length ? detail.comments.map((item) => <div className="admin-agent-comment" key={item.id}><div><strong>{item.actor_role === 'agent' ? 'You' : item.actor_email}</strong><time>{formatDate(item.created_at)}</time></div><p>{item.remark}</p></div>) : <span className="admin-muted">No comments yet. Add the first update for the admin.</span>}</div>
          <form className="admin-agent-comment-form" onSubmit={(event) => void addComment(event)}><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={2} placeholder="Add a progress update or question for the admin…" disabled={busyId === selectedId} /><button className="button button-outline" type="submit" disabled={busyId === selectedId || !comment.trim()}>Add comment</button></form>
        </div>
        <div className="admin-agent-section"><div className="admin-agent-section-title"><strong>Verification findings</strong><small>Complete this before submitting the case to admin</small></div>
          {selectedTask.review_status === 'assigned' && <button className="button button-primary" type="button" disabled={busyId === selectedTask.id} onClick={() => void taskAction(selectedTask, 'start')}>Start verification</button>}
          {['in_progress', 'returned'].includes(selectedTask.review_status) && <form className="admin-agent-findings" onSubmit={(event) => { event.preventDefault(); void taskAction(selectedTask, 'submit') }}><textarea value={results[selectedTask.id] ?? selectedTask.result ?? ''} onChange={(event) => setResults((current) => ({ ...current, [selectedTask.id]: event.target.value }))} minLength={3} maxLength={4000} rows={6} placeholder="Record what you checked, what you found, and any action required." required /><button className="button button-primary" type="submit" disabled={busyId === selectedTask.id}>Submit verification to admin</button></form>}
          {selectedTask.review_status === 'submitted' && <p className="admin-agent-submitted">Submitted to admin for review. You can continue adding internal comments until it is approved.</p>}
        </div>
        </>}
      </section>
    </div> : <p className="admin-activity-empty">No verification tasks are currently assigned to you.</p>}
  </>
}

export function CrmManagement({ token, role, refreshKey }: { token: string; role: string; refreshKey: number }) {
  const canExport = role === 'owner' || role === 'manager'
  const isOwner = role === 'owner'
  const [counts, setCounts] = useState<Record<Stage, number> | null>(null)
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [tagText, setTagText] = useState('')
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [stageFilter, setStageFilter] = useState<'' | Stage>('')
  const [openTasks, setOpenTasks] = useState<OpenTask[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<CrmTimeline | null>(null)
  const [tagDraft, setTagDraft] = useState('')
  const [activityKind, setActivityKind] = useState<ActivityKind>('note')
  const [activityBody, setActivityBody] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const fetchBoard = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) })
    if (query) params.set('q', query)
    if (stageFilter) params.set('stage', stageFilter)
    if (tagFilter) params.set('tag', tagFilter)
    return Promise.all([
      request<{ counts: Record<Stage, number> }>('/api/admin/crm/pipeline', token),
      request<{ total: number; customers: CrmCustomer[] }>(`/api/admin/crm/customers?${params}`, token),
      request<{ tasks: OpenTask[] }>('/api/admin/crm/tasks', token),
    ])
  }, [token, page, query, stageFilter, tagFilter])

  const applyBoard = useCallback(([pipeline, list, tasks]: [
    { counts: Record<Stage, number> },
    { total: number; customers: CrmCustomer[] },
    { tasks: OpenTask[] },
  ]) => {
    setCounts(pipeline.counts)
    setCustomers(list.customers)
    setTotal(list.total)
    setOpenTasks(tasks.tasks)
    setNotice(null)
  }, [])

  const loadBoard = useCallback(async () => {
    try {
      applyBoard(await fetchBoard())
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to load CRM data.') })
    }
  }, [fetchBoard, applyBoard])

  const loadTimeline = useCallback(async (userId: string) => {
    try {
      setTimeline(await request<CrmTimeline>(`/api/admin/crm/customers/${userId}`, token))
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to load this customer.') })
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    fetchBoard()
      .then((data) => { if (!cancelled) applyBoard(data) })
      .catch((error) => { if (!cancelled) setNotice({ tone: 'error', text: errorText(error, 'Unable to load CRM data.') }) })
    return () => { cancelled = true }
  }, [fetchBoard, applyBoard, refreshKey])

  const selectCustomer = (userId: string | null) => {
    setSelectedId(userId)
    setTimeline(null)
    if (userId) void loadTimeline(userId)
  }

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true)
    setNotice(null)
    try {
      await work()
      setNotice({ tone: 'info', text: success })
      await loadBoard()
      if (selectedId) await loadTimeline(selectedId)
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Something went wrong.') })
    } finally {
      setBusy(false)
    }
  }

  const saveProfile = (userId: string, changes: { stage?: Stage; tags?: string[] }, success: string) =>
    run(() => request(`/api/admin/crm/customers/${userId}/profile`, token, { method: 'PUT', body: JSON.stringify(changes) }), success)

  const closeCase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedId || !timeline) return
    const form = event.currentTarget
    const commissionAmountRupees = timeline.profile.partner_email
      ? Number(new FormData(form).get('commissionAmountRupees'))
      : undefined
    void run(async () => {
      await request(`/api/admin/crm/customers/${selectedId}/profile`, token, {
        method: 'PUT',
        body: JSON.stringify({
          stage: 'closed',
          ...(commissionAmountRupees === undefined ? {} : { commissionAmountRupees }),
        }),
      })
      form.reset()
    }, timeline.profile.partner_email ? 'Case closed and pending commission added.' : 'Case closed.')
  }

  const addTags = (userId: string, existing: string[]) => {
    const added = tagDraft.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
    setTagDraft('')
    return saveProfile(userId, { tags: [...new Set([...existing, ...added])] }, 'Tags updated.')
  }

  const submitActivity = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId) return
    void run(async () => {
      await request(`/api/admin/crm/customers/${selectedId}/activities`, token, {
        method: 'POST', body: JSON.stringify({ kind: activityKind, body: activityBody }),
      })
      setActivityBody('')
    }, 'Activity saved.')
  }

  const submitTask = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId) return
    void run(async () => {
      await request(`/api/admin/crm/customers/${selectedId}/tasks`, token, {
        method: 'POST', body: JSON.stringify({ title: taskTitle, dueAt: taskDue, assigneeEmail: taskAssignee }),
      })
      setTaskTitle('')
      setTaskDue('')
      setTaskAssignee('')
    }, 'Follow-up task created.')
  }

  const toggleTask = (task: { id: string; status: 'open' | 'done' }) =>
    run(() => request(`/api/admin/crm/tasks/${task.id}`, token, {
      method: 'PATCH', body: JSON.stringify({ status: task.status === 'open' ? 'done' : 'open' }),
    }), task.status === 'open' ? 'Task completed.' : 'Task reopened.')

  const exportCsv = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/admin/crm/export.csv`, { headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to export CRM data.'))
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `scorenow-crm-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to export CRM data.') })
    } finally {
      setBusy(false)
    }
  }

  const applySearch = (event: FormEvent) => {
    event.preventDefault()
    setQuery(searchText.trim())
    setTagFilter(tagText.trim().toLowerCase())
    setPage(1)
  }

  const selectedName = customers.find((customer) => customer.id === selectedId)?.name
    ?? openTasks.find((task) => task.user_id === selectedId)?.customer_name ?? 'Customer'
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const stageTotal = counts ? STAGES.reduce((sum, stage) => sum + counts[stage], 0) : 0
  const converted = counts ? counts.paid + counts.closed : 0
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  const dueTasks = openTasks.filter((task) => !task.due_at || new Date(task.due_at) <= endOfToday)
  const maxStage = counts ? Math.max(1, ...STAGES.map((stage) => counts[stage])) : 1
  const topStage = counts ? STAGES.reduce((best, stage) => counts[stage] > counts[best] ? stage : best, STAGES[0]) : null
  const filterStage = (stage: Stage) => {
    setStageFilter(stageFilter === stage ? '' : stage)
    setPage(1)
    document.getElementById('crm-leads')?.scrollIntoView({ behavior: 'smooth' })
  }
  const stageIndex = timeline ? STAGES.indexOf(timeline.profile.stage) : 0

  return (
    <div className="crm">
      <header className="crm-top">
        <div><span className="crm-kicker">CRM</span><h1>Customer relationships</h1><p>Move leads from signup to payment, log calls and notes, and set follow-up reminders.{role === 'support' ? ' Mobile numbers are masked for support.' : ''}</p></div>
        {canExport && <button className="crm-btn" type="button" disabled={busy} onClick={() => void exportCsv()}><Download /> Export CSV</button>}
      </header>
      {notice && <p className={`dashboard-notice ${notice.tone === 'error' ? 'error' : ''}`} role="status">{notice.text}</p>}

      <div className="crm-actions">
        <button className="crm-act" type="button" onClick={() => filterStage('new')}><span>Contact <b>new leads</b></span><i><ArrowRight /></i></button>
        <button className="crm-act" type="button" onClick={() => document.getElementById('crm-followups')?.scrollIntoView({ behavior: 'smooth' })}><span>Work on <b>follow-up calls</b></span><i><ArrowRight /></i></button>
        <button className="crm-act" type="button" onClick={() => filterStage('interested')}><span>Convert <b>interested customers</b></span><i><ArrowRight /></i></button>
      </div>

      <section className="crm-kpis" aria-label="Summary">
        <div className="crm-kpi"><b>{counts ? stageTotal : '—'}</b><small>Customers in pipeline</small></div>
        <div className="crm-kpi"><b>{dueTasks.length}</b><small>Need a call today</small></div>
        <div className="crm-kpi gold"><b>{stageTotal ? Math.round(converted / stageTotal * 100) : 0}%</b><small>Conversion rate (paid + closed)</small></div>
      </section>

      <section className="crm-row">
        <div className="crm-card">
          <h2>Customers by stage</h2>
          {STAGES.map((stage) => <button type="button" key={stage} className={`crm-src${stage === topStage ? ' top' : ''}`} onClick={() => filterStage(stage)}>
            <span>{capitalise(stage)}</span>
            <span className="crm-bar"><i style={{ width: `${counts ? counts[stage] / maxStage * 100 : 0}%` }} /></span>
            <span>{counts ? counts[stage] : '—'}</span>
          </button>)}
        </div>
        <div className="crm-card" id="crm-followups">
          <h2>Pipeline</h2>
          <div className="crm-pipe">
            {STAGES.map((stage) => { const Icon = STAGE_ICONS[stage]; return <button key={stage} type="button" className={`crm-tile${stageFilter === stage ? ' on' : ''}`} aria-pressed={stageFilter === stage} onClick={() => filterStage(stage)}>
              <span className="crm-tile-ic"><Icon /></span><b>{counts ? counts[stage] : '—'}</b><small>{capitalise(stage)}</small>
            </button> })}
          </div>
          <ul className="crm-fu">
            {openTasks.length ? openTasks.slice(0, 5).map((task) => <li key={task.id}>
              <span><button type="button" className="crm-open" onClick={() => selectCustomer(task.user_id)}>{task.customer_name}</button><small>{task.title} · {task.due_at ? formatDate(task.due_at) : 'No due date'}{isOverdue(task) && <em className="crm-overdue"> overdue</em>}</small></span>
              <span className="crm-fu-actions"><button className="crm-btn ghost sm" type="button" onClick={() => selectCustomer(task.user_id)}>Follow up</button><button className="crm-btn ghost sm" type="button" disabled={busy} onClick={() => void toggleTask({ id: task.id, status: 'open' })} aria-label={`Mark ${task.title} done`}><Check /></button></span>
            </li>) : <li className="crm-muted">No follow-ups due. You're all caught up.</li>}
            {openTasks.length > 5 && <li className="crm-muted">+{openTasks.length - 5} more open follow-ups</li>}
          </ul>
        </div>
      </section>

      <section className="crm-card" id="crm-leads">
        <h2>All customers</h2>
        <form className="crm-tools" onSubmit={applySearch}>
          <input type="search" placeholder="Search name, email or mobile" value={searchText} onChange={(event) => setSearchText(event.target.value)} aria-label="Search CRM customers" />
          <input type="text" placeholder="Tag" value={tagText} onChange={(event) => setTagText(event.target.value)} aria-label="Filter by tag" />
          <select value={stageFilter} onChange={(event) => { setStageFilter(event.target.value as '' | Stage); setPage(1) }} aria-label="Filter by stage">
            <option value="">All stages</option>
            {STAGES.map((stage) => <option key={stage} value={stage}>{capitalise(stage)}</option>)}
          </select>
          <button className="crm-btn" type="submit"><Search /> Search</button>
        </form>

        {customers.length ? <div className="crm-wrap"><table className="crm-table">
          <thead><tr><th>Customer</th><th>Email</th><th>Tags</th><th>Last activity</th><th>Open tasks</th><th>Stage</th></tr></thead>
          <tbody>
            {customers.map((customer) => <tr key={customer.id} className={customer.id === selectedId ? 'on' : undefined}>
              <td><button type="button" className="crm-open" onClick={() => selectCustomer(customer.id)}>{customer.name}</button><small>{customer.mobile || 'No mobile'}</small></td>
              <td>{customer.email || '—'}</td>
              <td>{customer.tags.length ? customer.tags.map((tag) => <span className="crm-tag" key={tag}>{tag}</span>) : <span className="crm-muted">—</span>}</td>
              <td>{formatDate(customer.last_activity_at)}</td>
              <td>{customer.open_tasks ? <b className="crm-due">{customer.open_tasks}</b> : 0}</td>
              <td>
                <select className={`crm-stage s-${customer.stage}`} value={customer.stage} disabled={busy || customer.stage === 'closed'} aria-label={`Stage for ${customer.name}`}
                  onChange={(event) => void saveProfile(customer.id, { stage: event.target.value as Stage }, 'Stage updated.')}>
                  {STAGES.filter((stage) => stage !== 'closed' || customer.stage === 'closed')
                    .map((stage) => <option key={stage} value={stage}>{capitalise(stage)}</option>)}
                </select>
              </td>
            </tr>)}
          </tbody>
        </table></div> : <p className="crm-empty">No customers match. Clear the filters to see everyone.</p>}

        {total > PAGE_SIZE && <nav className="crm-pages" aria-label="CRM pages">
          <button className="crm-btn ghost" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="crm-btn ghost" type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>}
      </section>

      {selectedId && <div className="crm-modal" role="dialog" aria-modal="true" aria-label={selectedName} onClick={(event) => { if (event.target === event.currentTarget) selectCustomer(null) }}>
        <div className="crm-det">
          {!timeline ? <p className="crm-empty">Loading customer…</p> : <>
          <div className="crm-dh">
            <div><h2>{selectedName}</h2><p className="crm-muted">Updated {formatDate(timeline.profile.updated_at)}{timeline.profile.updated_by ? ` by ${timeline.profile.updated_by}` : ''}{timeline.profile.partner_email ? ` · Partner ${timeline.profile.partner_email}` : ''}</p></div>
            <span className={`crm-tag s-${timeline.profile.stage}`}>{capitalise(timeline.profile.stage)}</span>
          </div>
          <div className="crm-steps">{STAGES.map((stage, index) => <button type="button" key={stage}
            className={`crm-chip${index < stageIndex ? ' d' : index === stageIndex ? ' c' : ''}`}
            disabled={busy || timeline.profile.stage === 'closed' || stage === 'closed' || index === stageIndex}
            onClick={() => void saveProfile(selectedId, { stage }, `Moved to ${capitalise(stage)}.`)}>{index < stageIndex ? '✓ ' : ''}{capitalise(stage)}</button>)}</div>

          <h3>Tags</h3>
          <div className="crm-tagrow">
            {timeline.profile.tags.map((tag) => <button key={tag} type="button" className="crm-tag removable" disabled={busy} title="Remove tag"
              onClick={() => void saveProfile(selectedId, { tags: timeline.profile.tags.filter((item) => item !== tag) }, 'Tag removed.')}>{tag} ×</button>)}
            <input type="text" placeholder="Add tags, comma separated" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} aria-label="New tags" />
            <button className="crm-btn ghost sm" type="button" disabled={busy || !tagDraft.trim()} onClick={() => void addTags(selectedId, timeline.profile.tags)}>Add</button>
          </div>

          <h3>Log activity</h3>
          <form className="crm-form" onSubmit={submitActivity}>
            <div className="crm-seg" role="radiogroup" aria-label="Activity type">
              {ACTIVITY_KINDS.map((kind) => <button type="button" role="radio" aria-checked={activityKind === kind} key={kind} className={activityKind === kind ? 'on' : ''} onClick={() => setActivityKind(kind)}>{capitalise(kind)}</button>)}
            </div>
            <textarea rows={3} maxLength={2000} placeholder="What happened? Keep it short." value={activityBody} onChange={(event) => setActivityBody(event.target.value)} aria-label="Activity details" required />
            <div className="crm-acts"><button className="crm-btn" type="submit" disabled={busy || !activityBody.trim()}>Save activity</button></div>
          </form>

          <h3>Follow-up reminder</h3>
          <form className="crm-form" onSubmit={submitTask}>
            <input type="text" maxLength={200} placeholder="e.g. Call back about CIBIL report" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} aria-label="Task title" required />
            <div className="crm-g2">
              <input type="datetime-local" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} aria-label="Due date" />
              <input type="email" maxLength={200} placeholder="Assignee email (optional)" value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)} aria-label="Assignee email" />
            </div>
            <div className="crm-acts"><button className="crm-btn" type="submit" disabled={busy || !taskTitle.trim()}>Add follow-up</button></div>
          </form>

          {timeline.tasks.length > 0 && <><h3>Tasks</h3><ul className="crm-fu">
            {timeline.tasks.map((task) => <li key={task.id}>
              <span><b className={task.status === 'done' ? 'crm-done' : undefined}>{task.title}</b><small>{task.due_at ? formatDate(task.due_at) : 'No due date'}{task.assignee_email ? ` · ${task.assignee_email}` : ''}{isOverdue(task) && <em className="crm-overdue"> overdue</em>}</small></span>
              <button className="crm-btn ghost sm" type="button" disabled={busy} onClick={() => void toggleTask(task)}>{task.status === 'open' ? 'Mark done' : 'Reopen'}</button>
            </li>)}
          </ul></>}

          {isOwner && timeline.profile.partner_email && timeline.profile.commission_amount_paise !== null
            ? <p className="crm-note">Closed-case commission for {timeline.profile.partner_email}: {formatRupees((timeline.profile.commission_amount_paise / 100).toString())} · {formatDate(timeline.profile.commission_awarded_at)} · {capitalise(timeline.profile.commission_status || 'pending')}</p>
            : isOwner && (timeline.profile.stage !== 'closed' || Boolean(timeline.profile.partner_email))
              ? <form className="crm-form crm-close" onSubmit={closeCase}>
                <h3>{timeline.profile.stage === 'closed' ? 'Award partner commission' : 'Close case'}</h3>
                {timeline.profile.partner_email && <label>Commission for {timeline.profile.partner_email} (₹)
                  <input name="commissionAmountRupees" type="number" min="1" max="1000000" step="0.01" required />
                </label>}
                <div className="crm-acts"><button className="crm-btn" type="submit" disabled={busy}>{timeline.profile.stage === 'closed' ? 'Add pending commission' : 'Close case'}</button></div>
              </form>
              : null}

          <h3>Activity</h3>
          <ul className="crm-fu">
            {timeline.activities.map((item) => <li key={`a-${item.id}`}><span><b>{capitalise(item.kind)}</b> · {item.body}<small>{item.created_by}</small></span><span className="crm-muted">{formatDate(item.created_at)}</span></li>)}
            {timeline.payments.map((item) => <li key={`p-${item.id}`}><span><b>Payment</b> · {item.plan_name} {formatRupees(item.amount)} · {item.status}{item.failure_reason ? ` (${item.failure_reason})` : ''}</span><span className="crm-muted">{formatDate(item.created_at)}</span></li>)}
            {timeline.reports.map((item) => <li key={`r-${item.id}`}><span><b>Report</b> · {item.bureau.toUpperCase()} · {item.status}</span><span className="crm-muted">{formatDate(item.requested_at)}</span></li>)}
            {!timeline.activities.length && !timeline.payments.length && !timeline.reports.length && <li className="crm-muted">No activity yet.</li>}
          </ul>
          </>}
          <div className="crm-acts"><button className="crm-btn ghost" type="button" onClick={() => selectCustomer(null)}>Close</button></div>
        </div>
      </div>}
    </div>
  )
}
