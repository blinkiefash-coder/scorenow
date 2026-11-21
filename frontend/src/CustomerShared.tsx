import { useEffect, useState, type FormEvent } from 'react'
import { Download, LockKeyhole, Share2 } from 'lucide-react'
import { ApplicationProgress } from './ApplicationProgress'
import { applicationProgressLabel } from './applicationProgressUtils'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4100'

type SharedItems = {
  progress: { status: string; remark: string | null; shared_at: string; updated_at: string; timeline: { status: string; remark: string | null; created_at: string }[] } | null
  reports: { id: string; bureau: string; credit_score: number | null; report_date: string; shared_at: string }[]
}

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const bureauName = (bureau: string) => ({ cibil: 'CIBIL', experian: 'Experian', equifax: 'Equifax', crif: 'CRIF High Mark' } as Record<string, string>)[bureau] ?? bureau.toUpperCase()

// Blocks the account until a customer whose login was created by our team replaces the default password.
export function ForcePasswordReset({ token, onDone, onLogout }: { token: string; onDone: () => void; onLogout: () => void }) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const newPassword = String(data.get('newPassword') || '')
    if (newPassword !== String(data.get('confirmPassword') || '')) {
      setError('Both passwords must match.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`${apiUrl}/api/auth/password/change`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      const result = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Unable to update your password.')
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update your password.')
    } finally {
      setSaving(false)
    }
  }
  return <div className="force-reset-backdrop" role="dialog" aria-modal="true" aria-labelledby="force-reset-title">
    <form className="force-reset-card" onSubmit={(event) => void submit(event)}>
      <span className="force-reset-icon"><LockKeyhole /></span>
      <h2 id="force-reset-title">Set your new password</h2>
      <p>Your account was created by the Scorenow team with a temporary password. Choose a private password to continue.</p>
      <label>New password<input name="newPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required autoFocus /></label>
      <label>Confirm new password<input name="confirmPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></label>
      <small>At least 8 characters, with letters and numbers.</small>
      {error && <p className="dashboard-notice error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save password'}</button>
      <button className="force-reset-logout" type="button" onClick={onLogout}>Log out</button>
    </form>
  </div>
}

// Application progress and bureau reports the Scorenow team or partner chose to share with this customer.
export function SharedUpdatesCard({ token }: { token: string }) {
  const [items, setItems] = useState<SharedItems | null>(null)
  const [downloading, setDownloading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`${apiUrl}/api/shared`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => (response.ok ? await response.json() as SharedItems : null))
      .then((result) => { if (!cancelled) setItems(result) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [token])

  const download = async (id: string, bureau: string) => {
    setDownloading(id)
    setError('')
    try {
      const response = await fetch(`${apiUrl}/api/shared/reports/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { message?: string }).message || 'Unable to download this report.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `scorenow-${bureau}-report.${blob.type.includes('html') ? 'html' : 'pdf'}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download this report.')
    } finally {
      setDownloading('')
    }
  }

  if (!items || (!items.progress && !items.reports.length)) return null
  return <article className="dashboard-card shared-updates-card">
    <div className="dashboard-card-heading"><strong><Share2 /> Shared with you</strong><small>Updates from your Scorenow advisor</small></div>
    {items.progress && <section className="shared-progress">
      <div className="shared-progress-head"><strong>Application status: {applicationProgressLabel(items.progress.status)}</strong><small>Updated {formatDate(items.progress.updated_at)}</small></div>
      <ApplicationProgress status={items.progress.status} />
      {items.progress.remark && <p className="shared-remark">{items.progress.remark}</p>}
      {items.progress.timeline.length > 0 && <ol className="shared-timeline">
        {items.progress.timeline.map((event, index) => <li key={`${event.created_at}-${index}`}>
          <strong>{applicationProgressLabel(event.status)}</strong><small>{formatDate(event.created_at)}</small>{event.remark && <span>{event.remark}</span>}
        </li>)}
      </ol>}
    </section>}
    {items.reports.length > 0 && <section className="shared-reports">
      <strong>Credit bureau reports</strong>
      <ul>{items.reports.map((report) => <li key={report.id}>
        <span className="shared-report-score">{report.credit_score ?? '—'}</span>
        <div><strong>{bureauName(report.bureau)}</strong><small>Report date {formatDate(report.report_date)}</small></div>
        <button className="button button-outline" type="button" disabled={downloading === report.id} onClick={() => void download(report.id, report.bureau)}><Download /> {downloading === report.id ? 'Preparing…' : 'Download'}</button>
      </li>)}</ul>
    </section>}
    {error && <p className="dashboard-notice error" role="alert">{error}</p>}
  </article>
}
