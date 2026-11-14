import { useCallback, useEffect, useState, type FormEvent } from 'react'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const PAGE_SIZE = 25

const STAGES = ['new', 'contacted', 'interested', 'paid', 'closed'] as const
type Stage = (typeof STAGES)[number]
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
  profile: { stage: Stage; tags: string[]; updated_by: string | null; updated_at: string | null }
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

export function CrmManagement({ token, role, refreshKey }: { token: string; role: string; refreshKey: number }) {
  const canExport = role === 'owner' || role === 'manager'
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

  return (
    <>
      <div className="admin-heading"><span>CRM</span><h1>Customer relationships</h1><p>Move leads from signup to payment, log calls and notes, and set follow-up reminders. Support sees masked mobile numbers.</p></div>
      {notice && <p className={`dashboard-notice ${notice.tone === 'error' ? 'error' : ''}`} role="status">{notice.text}</p>}

      <article className="dashboard-card admin-activity-card">
        <h2 className="dashboard-card-heading">Pipeline</h2>
        <div className="admin-table-wrap"><table className="admin-activity-table">
          <thead><tr>{STAGES.map((stage) => <th key={stage}>{capitalise(stage)}</th>)}</tr></thead>
          <tbody><tr>{STAGES.map((stage) => <td key={stage}>
            <button className="button button-outline" type="button" onClick={() => { setStageFilter(stageFilter === stage ? '' : stage); setPage(1) }}>
              {counts ? counts[stage] : '—'}{stageFilter === stage ? ' ✓' : ''}
            </button>
          </td>)}</tr></tbody>
        </table></div>
      </article>

      <article className="dashboard-card admin-activity-card">
        <form className="admin-inline-form" onSubmit={applySearch}>
          <input type="search" placeholder="Name, email or mobile" value={searchText} onChange={(event) => setSearchText(event.target.value)} aria-label="Search CRM customers" />
          <input type="text" placeholder="Tag (exact)" value={tagText} onChange={(event) => setTagText(event.target.value)} aria-label="Filter by tag" />
          <select value={stageFilter} onChange={(event) => { setStageFilter(event.target.value as '' | Stage); setPage(1) }} aria-label="Filter by stage">
            <option value="">All stages</option>
            {STAGES.map((stage) => <option key={stage} value={stage}>{capitalise(stage)}</option>)}
          </select>
          <button className="button button-primary" type="submit">Apply</button>
          {canExport && <button className="button button-outline" type="button" disabled={busy} onClick={() => void exportCsv()}>Export CSV</button>}
        </form>

        {customers.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
          <thead><tr><th>Customer</th><th>Contact</th><th>Stage</th><th>Tags</th><th>Last activity</th><th>Open tasks</th></tr></thead>
          <tbody>
            {customers.map((customer) => <tr key={customer.id} onClick={() => selectCustomer(customer.id)} style={{ cursor: 'pointer', background: customer.id === selectedId ? 'rgba(0,0,0,0.04)' : undefined }}>
              <td>{customer.name}</td>
              <td>{customer.email || '—'}<br /><small>{customer.mobile || ''}</small></td>
              <td onClick={(event) => event.stopPropagation()}>
                <select value={customer.stage} disabled={busy} aria-label={`Stage for ${customer.name}`}
                  onChange={(event) => void saveProfile(customer.id, { stage: event.target.value as Stage }, 'Stage updated.')}>
                  {STAGES.map((stage) => <option key={stage} value={stage}>{capitalise(stage)}</option>)}
                </select>
              </td>
              <td>{customer.tags.join(', ') || '—'}</td>
              <td>{formatDate(customer.last_activity_at)}</td>
              <td>{customer.open_tasks}</td>
            </tr>)}
          </tbody>
        </table></div> : <p className="admin-activity-empty">No customers match these filters.</p>}

        {total > PAGE_SIZE && <nav className="admin-activity-pagination" aria-label="CRM pages">
          <button className="button button-outline" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="button button-outline" type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>}
      </article>

      {selectedId && timeline && <article className="dashboard-card admin-management-card">
        <h2 className="dashboard-card-heading">{selectedName}</h2>
        <div className="admin-inline-form">
          <label>Stage&nbsp;
            <select value={timeline.profile.stage} disabled={busy} onChange={(event) => void saveProfile(selectedId, { stage: event.target.value as Stage }, 'Stage updated.')}>
              {STAGES.map((stage) => <option key={stage} value={stage}>{capitalise(stage)}</option>)}
            </select>
          </label>
          <span>Tags:&nbsp;{timeline.profile.tags.map((tag) => <button key={tag} type="button" className="button button-outline" disabled={busy}
            title="Remove tag" onClick={() => void saveProfile(selectedId, { tags: timeline.profile.tags.filter((item) => item !== tag) }, 'Tag removed.')}>{tag} ×</button>)}</span>
          <input type="text" placeholder="Add tags, comma separated" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} aria-label="New tags" />
          <button className="button button-outline" type="button" disabled={busy || !tagDraft.trim()} onClick={() => void addTags(selectedId, timeline.profile.tags)}>Add tags</button>
        </div>

        <form className="admin-management-form" onSubmit={submitActivity}>
          <h3>Log activity</h3>
          <select value={activityKind} onChange={(event) => setActivityKind(event.target.value as ActivityKind)} aria-label="Activity type">
            {ACTIVITY_KINDS.map((kind) => <option key={kind} value={kind}>{capitalise(kind)}</option>)}
          </select>
          <textarea rows={3} maxLength={2000} placeholder="What happened? Keep it short." value={activityBody} onChange={(event) => setActivityBody(event.target.value)} aria-label="Activity details" required />
          <button className="button button-primary" type="submit" disabled={busy || !activityBody.trim()}>Save activity</button>
        </form>

        <form className="admin-management-form" onSubmit={submitTask}>
          <h3>Follow-up reminder</h3>
          <input type="text" maxLength={200} placeholder="Task, e.g. Call back about CIBIL report" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} aria-label="Task title" required />
          <input type="datetime-local" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} aria-label="Due date" />
          <input type="email" maxLength={200} placeholder="Assignee email (optional)" value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)} aria-label="Assignee email" />
          <button className="button button-primary" type="submit" disabled={busy || !taskTitle.trim()}>Add task</button>
        </form>

        <h3>Tasks</h3>
        {timeline.tasks.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
          <thead><tr><th>Task</th><th>Due</th><th>Assignee</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{timeline.tasks.map((task) => <tr key={task.id}>
            <td>{task.title}</td><td>{formatDate(task.due_at)}{isOverdue(task) && <span className="admin-status failed"> overdue</span>}</td>
            <td>{task.assignee_email || '—'}</td>
            <td><span className={`admin-status ${task.status === 'done' ? 'completed' : 'pending'}`}>{task.status}</span></td>
            <td><button className="button button-outline" type="button" disabled={busy} onClick={() => void toggleTask(task)}>{task.status === 'open' ? 'Mark done' : 'Reopen'}</button></td>
          </tr>)}</tbody>
        </table></div> : <p className="admin-activity-empty">No tasks yet.</p>}

        <h3>Timeline</h3>
        <ul className="admin-activity-list">
          {timeline.activities.map((item) => <li key={`a-${item.id}`}><strong>{capitalise(item.kind)}</strong> · {formatDate(item.created_at)} · {item.created_by}<br />{item.body}</li>)}
          {timeline.payments.map((item) => <li key={`p-${item.id}`}><strong>Payment</strong> · {formatDate(item.created_at)} · {item.plan_name} {formatRupees(item.amount)} · {item.status}{item.failure_reason ? ` (${item.failure_reason})` : ''}</li>)}
          {timeline.reports.map((item) => <li key={`r-${item.id}`}><strong>Report</strong> · {formatDate(item.requested_at)} · {item.bureau} · {item.status}</li>)}
          {!timeline.activities.length && !timeline.payments.length && !timeline.reports.length && <li>No activity yet.</li>}
        </ul>
        <button className="button button-outline" type="button" onClick={() => selectCustomer(null)}>Close</button>
      </article>}

      <article className="dashboard-card admin-activity-card">
        <h2 className="dashboard-card-heading">Open follow-ups</h2>
        {openTasks.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
          <thead><tr><th>Due</th><th>Task</th><th>Customer</th><th>Assignee</th><th>Action</th></tr></thead>
          <tbody>{openTasks.map((task) => <tr key={task.id}>
            <td>{formatDate(task.due_at)}{isOverdue(task) && <span className="admin-status failed"> overdue</span>}</td>
            <td>{task.title}</td>
            <td><button className="button button-outline" type="button" onClick={() => selectCustomer(task.user_id)}>{task.customer_name}</button></td>
            <td>{task.assignee_email || '—'}</td>
            <td><button className="button button-outline" type="button" disabled={busy} onClick={() => void toggleTask({ id: task.id, status: 'open' })}>Mark done</button></td>
          </tr>)}</tbody>
        </table></div> : <p className="admin-activity-empty">No open follow-ups.</p>}
      </article>
    </>
  )
}
