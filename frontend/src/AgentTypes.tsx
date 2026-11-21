import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Share2, Trash2 } from 'lucide-react'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4100'
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
const readMessage = async (response: Response, fallback: string) =>
  ((await response.json().catch(() => ({}))) as { message?: string }).message || fallback

export type AgentType = { key: string; label: string; can_check_bureau: boolean; built_in: boolean; agent_count: number }
type AgentRow = { email: string; full_name: string; status: string; parent_email: string | null; agent_type: string | null }

function useAgentTypes(token: string) {
  const [types, setTypes] = useState<AgentType[]>([])
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    fetch(`${apiUrl}/api/admin/agent-types`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readMessage(response, 'Unable to load agent types.'))
        const result = await response.json() as { types: AgentType[]; agents: AgentRow[] }
        if (cancelled) return
        setTypes(result.types)
        setAgents(result.agents)
        setError('')
      })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load agent types.') })
    return () => { cancelled = true }
  }, [token, version])
  const reload = useCallback(() => setVersion((current) => current + 1), [])
  return { types, agents, error, reload }
}

export function AgentTypeSelect({ token }: { token: string }) {
  const { types } = useAgentTypes(token)
  return <label>Agent type<select name="agentType" defaultValue="">
    <option value="">Not set</option>
    {types.map((type) => <option key={type.key} value={type.key}>{type.label}{type.can_check_bureau ? ' · bureau checks' : ''}</option>)}
  </select></label>
}

export function AgentTypesManager({ token, canEditTypes }: { token: string; canEditTypes: boolean }) {
  const { types, agents, error, reload } = useAgentTypes(token)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState('')

  const run = async (key: string, request: () => Promise<Response>, success: string) => {
    setBusy(key)
    setNotice(null)
    try {
      const response = await request()
      if (!response.ok) throw new Error(await readMessage(response, 'Unable to save this change.'))
      setNotice({ tone: 'success', text: success })
      reload()
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Unable to save this change.' })
    } finally {
      setBusy('')
    }
  }

  const addType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    void run('new', () => fetch(`${apiUrl}/api/admin/agent-types`, {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ label: data.get('label'), canCheckBureau: data.get('canCheckBureau') === 'on' }),
    }), 'Agent type added.').then(() => form.reset())
  }

  const typeLabel = (key: string | null) => types.find((type) => type.key === key)?.label ?? 'Not set'

  return <>
    <div className="admin-heading"><span>TEAM STRUCTURE</span><h1>Agent types</h1><p>Group agents by department and control which departments may run credit bureau checks and share results with customers.</p></div>
    {error && <p className="dashboard-notice error" role="alert">{error}</p>}
    {notice && <p className={`dashboard-notice ${notice.tone}`} role="status">{notice.text}</p>}

    <article className="dashboard-card admin-management-card">
      <div className="dashboard-card-heading"><strong>Departments</strong><small>{canEditTypes ? 'Built-in types can be renamed or re-permissioned; custom types can also be removed.' : 'Only the Super Admin can change departments.'}</small></div>
      <div className="admin-table-wrap"><table className="admin-activity-table">
        <thead><tr><th>Agent type</th><th>Agents</th><th>Bureau checks &amp; sharing</th>{canEditTypes && <th />}</tr></thead>
        <tbody>{types.map((type) => <tr key={type.key}>
          <td><strong>{type.label}</strong>{!type.built_in && <small className="agent-type-custom">Custom</small>}</td>
          <td>{type.agent_count}</td>
          <td>{canEditTypes
            ? <label className="agent-type-toggle"><input type="checkbox" checked={type.can_check_bureau} disabled={busy === type.key}
                onChange={(event) => void run(type.key, () => fetch(`${apiUrl}/api/admin/agent-types/${type.key}`, {
                  method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ canCheckBureau: event.target.checked }),
                }), `${type.label} updated.`)} /><span>{type.can_check_bureau ? 'Allowed' : 'Not allowed'}</span></label>
            : <span className={`admin-status ${type.can_check_bureau ? 'success' : ''}`}>{type.can_check_bureau ? 'Allowed' : 'Not allowed'}</span>}</td>
          {canEditTypes && <td>{!type.built_in && <button type="button" className="admin-icon-button" aria-label={`Remove ${type.label}`} disabled={busy === type.key}
            onClick={() => { if (window.confirm(`Remove "${type.label}"? Agents with this type will become "Not set".`)) void run(type.key, () => fetch(`${apiUrl}/api/admin/agent-types/${type.key}`, { method: 'DELETE', headers: authHeaders(token) }), `${type.label} removed.`) }}><Trash2 /></button>}</td>}
        </tr>)}</tbody>
      </table></div>
      {canEditTypes && <form className="admin-management-form" onSubmit={addType}>
        <label>New agent type<input name="label" minLength={2} maxLength={60} placeholder="e.g. Collections – North" required /></label>
        <label className="agent-type-toggle"><input name="canCheckBureau" type="checkbox" /><span>Can run bureau checks</span></label>
        <button className="button button-primary" type="submit" disabled={busy === 'new'}>Add agent type</button>
      </form>}
    </article>

    <article className="dashboard-card admin-activity-card">
      <div className="dashboard-card-heading"><strong>Agents</strong><small>{agents.length} agents</small></div>
      {agents.length ? <div className="admin-table-wrap"><table className="admin-activity-table">
        <thead><tr><th>Agent</th><th>Partner</th><th>Status</th><th>Agent type</th></tr></thead>
        <tbody>{agents.map((agent) => <tr key={agent.email}>
          <td><strong>{agent.full_name}</strong><br /><small>{agent.email}</small></td>
          <td>{agent.parent_email || 'Scorenow team'}</td>
          <td><span className="admin-status">{agent.status}</span></td>
          <td><select aria-label={`Agent type for ${agent.full_name}`} value={agent.agent_type ?? ''} disabled={busy === agent.email}
            onChange={(event) => void run(agent.email, () => fetch(`${apiUrl}/api/admin/agents/${encodeURIComponent(agent.email)}/type`, {
              method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ agentType: event.target.value || null }),
            }), `${agent.full_name} is now: ${typeLabel(event.target.value || null)}.`)}>
            <option value="">Not set</option>
            {types.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
          </select></td>
        </tr>)}</tbody>
      </table></div> : <p className="admin-activity-empty">No agents yet. Add one from Manage admins.</p>}
    </article>
  </>
}

// Shares a completed bureau check with the customer, creating their login when needed.
export function ShareReportButton({ token, auditId }: { token: string; auditId: string }) {
  const [state, setState] = useState<{ busy: boolean; tone?: 'success' | 'error'; text?: string }>({ busy: false })
  const share = async () => {
    setState({ busy: true })
    try {
      const response = await fetch(`${apiUrl}/api/admin/reports/${auditId}/share`, { method: 'POST', headers: authHeaders(token) })
      const result = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to share this report.')
      setState({ busy: false, tone: 'success', text: result.message || 'Shared with the customer.' })
    } catch (err) {
      setState({ busy: false, tone: 'error', text: err instanceof Error ? err.message : 'Unable to share this report.' })
    }
  }
  return <>
    <button className="button button-outline" type="button" onClick={() => void share()} disabled={state.busy || !auditId || state.tone === 'success'}>
      <Share2 /> {state.busy ? 'Sharing…' : state.tone === 'success' ? 'Shared with customer' : 'Share with customer'}
    </button>
    {state.text && <p className={`dashboard-notice ${state.tone}`} role="status">{state.text}</p>}
  </>
}

// Shares application progress (and matching bureau checks) to the customer's dashboard.
export function ShareProgressButton({ token, customerId, compact = false }: { token: string; customerId: string; compact?: boolean }) {
  const [state, setState] = useState<{ busy: boolean; tone?: 'success' | 'error'; text?: string }>({ busy: false })
  const share = async () => {
    setState({ busy: true })
    try {
      const response = await fetch(`${apiUrl}/api/admin/crm/applications/${customerId}/share`, { method: 'POST', headers: authHeaders(token) })
      const result = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to share progress.')
      setState({ busy: false, tone: 'success', text: result.message || 'Progress shared.' })
    } catch (err) {
      setState({ busy: false, tone: 'error', text: err instanceof Error ? err.message : 'Unable to share progress.' })
    }
  }
  return <span className={`share-progress${compact ? ' compact' : ''}`}>
    <button className="button button-outline" type="button" onClick={() => void share()} disabled={state.busy}>
      <Share2 /> {state.busy ? 'Sharing…' : state.tone === 'success' ? 'Shared · share again' : 'Share progress with customer'}
    </button>
    {state.text && <small className={state.tone === 'error' ? 'share-error' : 'share-ok'} role="status">{state.text}</small>}
  </span>
}
