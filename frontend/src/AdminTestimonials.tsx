import { useEffect, useState, type FormEvent } from 'react'
import { apiUrl } from './siteContent'

type AdminTestimonial = {
  id: string
  customer_name: string
  customer_image_url: string | null
  rating: number
  review_text: string
  result_description: string | null
  published: boolean
  submitted_at: string
  published_at: string | null
}

type Notice = { tone: 'info' | 'error'; text: string }

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })
const jsonHeaders = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })

const readError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({})) as { message?: string }
  return body.message || fallback
}

export function AdminTestimonials({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [items, setItems] = useState<AdminTestimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    let active = true
    fetch(`${apiUrl}/api/admin/testimonials`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Unable to load testimonials.'))
        return response.json() as Promise<AdminTestimonial[]>
      })
      .then((data) => { if (active) setItems(data) })
      .catch((error: unknown) => {
        if (active) setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to load testimonials.' })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, refreshKey])

  const addTestimonial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/admin/testimonials`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({
          customerName: form.get('customerName'),
          rating: Number(form.get('rating')),
          reviewText: form.get('reviewText'),
          resultDescription: form.get('resultDescription'),
          customerImageUrl: form.get('customerImageUrl'),
          published: form.get('published') === 'on',
        }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to add testimonial.'))
      const created = await response.json() as AdminTestimonial
      setItems((current) => [created, ...current])
      setFormKey((key) => key + 1)
      setNotice({ tone: 'info', text: created.published ? 'Testimonial added and published on the website.' : 'Testimonial saved as a draft.' })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to add testimonial.' })
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async (item: AdminTestimonial) => {
    setBusyId(item.id)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/admin/testimonials/${item.id}/${item.published ? 'unpublish' : 'publish'}`, { method: 'PUT', headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to update testimonial.'))
      const updated = await response.json() as AdminTestimonial
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to update testimonial.' })
    } finally {
      setBusyId(null)
    }
  }

  const removeTestimonial = async (item: AdminTestimonial) => {
    if (!window.confirm(`Delete the testimonial from ${item.customer_name}? This cannot be undone.`)) return
    setBusyId(item.id)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/admin/testimonials/${item.id}`, { method: 'DELETE', headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to delete testimonial.'))
      setItems((current) => current.filter((entry) => entry.id !== item.id))
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to delete testimonial.' })
    } finally {
      setBusyId(null)
    }
  }

  const publishedCount = items.filter((item) => item.published).length

  return (
    <>
      <div className="admin-heading"><span>WEBSITE CONTENT</span><h1>Testimonials</h1><p>Add customer feedback, reviews, and success stories. Published entries appear in the &ldquo;Success Stories&rdquo; section on the home page.</p></div>

      {notice && <p className={notice.tone === 'error' ? 'form-error' : 'form-success'} role="status">{notice.text}</p>}

      <article className="dashboard-card">
        <div className="dashboard-card-heading"><strong>Add a testimonial</strong><small>Use the customer&rsquo;s permission before publishing their name or story</small></div>
        <form key={formKey} className="admin-management-form" onSubmit={(event) => void addTestimonial(event)}>
          <label>Customer name<input name="customerName" minLength={2} maxLength={120} required /></label>
          <label>Rating<select name="rating" defaultValue="5" required>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>)}</select></label>
          <label className="admin-form-wide">Review or feedback<textarea name="reviewText" minLength={10} maxLength={1000} rows={3} required /></label>
          <label className="admin-form-wide">Result or success story (optional)<input name="resultDescription" maxLength={300} placeholder="e.g. Score rose from 642 to 758 in five months" /></label>
          <label className="admin-form-wide">Photo link (optional, https)<input name="customerImageUrl" type="url" maxLength={500} /></label>
          <label className="admin-checkbox"><input name="published" type="checkbox" defaultChecked /> Publish on the website now</label>
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add testimonial'}</button>
        </form>
      </article>

      <article className="dashboard-card">
        <div className="dashboard-card-heading"><strong>All testimonials</strong><small>{items.length} total · {publishedCount} published</small></div>
        {loading ? <p>Loading testimonials…</p> : items.length === 0 ? <p>No testimonials yet. Add the first one above.</p> : (
          <div className="admin-table-wrap"><table className="admin-activity-table">
            <thead><tr><th>Customer</th><th>Rating</th><th>Review</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.customer_name}</strong>{item.result_description && <small><br />{item.result_description}</small>}</td>
                <td>{'★'.repeat(item.rating)}</td>
                <td>{item.review_text.length > 140 ? `${item.review_text.slice(0, 140)}…` : item.review_text}</td>
                <td><span className={`admin-status ${item.published ? 'success' : 'muted'}`}>{item.published ? 'Published' : 'Draft'}</span></td>
                <td>{new Date(item.submitted_at).toLocaleDateString('en-IN')}</td>
                <td className="admin-row-actions">
                  <button className="button button-outline" type="button" disabled={busyId === item.id} onClick={() => void togglePublished(item)}>{item.published ? 'Unpublish' : 'Publish'}</button>
                  <button className="button button-outline" type="button" disabled={busyId === item.id} onClick={() => void removeTestimonial(item)}>Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </article>
    </>
  )
}
