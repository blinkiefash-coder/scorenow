import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { apiUrl, testimonialPhotoSrc } from './siteContent'

type AdminTestimonial = {
  id: string
  customer_name: string
  customer_image_url: string | null
  has_uploaded_photo: boolean
  rating: number
  review_text: string
  result_description: string | null
  published: boolean
  consent_obtained: boolean
  consent_note: string | null
  consent_recorded_at: string | null
  consent_recorded_by: string | null
  submitted_at: string
  published_at: string | null
}

type Notice = { tone: 'info' | 'error'; text: string }

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

const readError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({})) as { message?: string }
  return body.message || fallback
}

const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')

// Uploaded photos of unpublished entries are only available to signed-in admins, so they are fetched with the token.
function AdminPhoto({ item, token }: { item: AdminTestimonial; token: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const uploaded = item.has_uploaded_photo
  const link = uploaded ? null : testimonialPhotoSrc(item.customer_image_url)
  const version = item.customer_image_url

  useEffect(() => {
    if (!uploaded) return
    let objectUrl: string | null = null
    let active = true
    fetch(`${apiUrl}/api/admin/testimonials/${item.id}/photo`, { headers: authHeaders(token) })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!active || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => undefined)
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [uploaded, item.id, token, version])

  const shown = uploaded ? src : link
  return shown
    ? <img className="admin-testimonial-photo" src={shown} alt="" />
    : <span className="admin-testimonial-photo admin-testimonial-initials" aria-hidden="true">{initialsOf(item.customer_name)}</span>
}

function TestimonialForm({ token, editing, onSaved, onCancel }: {
  token: string
  editing: AdminTestimonial | null
  onSaved: (item: AdminTestimonial, created: boolean) => void
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(editing?.consent_obtained ?? false)
  const [publish, setPublish] = useState(editing?.published ?? false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setError('')
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('Photo must be a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Photo must be 2 MB or smaller.')
      event.target.value = ''
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    form.delete('photo')
    if (photoFile) form.set('photo', photoFile)
    form.set('consentObtained', consent ? 'true' : 'false')
    form.set('published', consent && publish ? 'true' : 'false')
    form.set('removePhoto', removePhoto ? 'true' : 'false')
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/testimonials${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: authHeaders(token),
        body: form,
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to save the testimonial.'))
      onSaved(await response.json() as AdminTestimonial, !editing)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the testimonial.')
    } finally {
      setSaving(false)
    }
  }

  const hasExistingPhoto = Boolean(editing?.has_uploaded_photo) && !removePhoto

  return (
    <form className="admin-testimonial-form" onSubmit={(event) => void submit(event)}>
      <div className="admin-testimonial-photo-field">
        {photoPreview
          ? <img className="admin-testimonial-photo large" src={photoPreview} alt="Selected customer photo" />
          : hasExistingPhoto && editing
            ? <AdminPhoto item={editing} token={token} />
            : <span className="admin-testimonial-photo large admin-testimonial-initials" aria-hidden="true">Photo</span>}
        <div>
          <label className="button button-outline admin-testimonial-upload">
            {photoPreview || hasExistingPhoto ? 'Change photo' : 'Upload photo'}
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
          </label>
          {(photoPreview || hasExistingPhoto) && <button className="admin-testimonial-link" type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); setRemovePhoto(true) }}>Remove photo</button>}
          <small>JPG, PNG or WebP, up to 2 MB. A square photo looks best.</small>
        </div>
      </div>

      <div className="admin-testimonial-fields">
        <label>Customer name<input name="customerName" defaultValue={editing?.customer_name} minLength={2} maxLength={120} required placeholder="As the customer wants it shown" /></label>
        <label>Rating<select name="rating" defaultValue={String(editing?.rating ?? 5)} required>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>)}</select></label>
        <label className="admin-form-wide">Review<textarea name="reviewText" defaultValue={editing?.review_text} minLength={10} maxLength={1000} rows={4} required placeholder="The customer's review in their own words" /></label>
        <label className="admin-form-wide">Result (optional)<input name="resultDescription" defaultValue={editing?.result_description ?? ''} maxLength={300} placeholder="e.g. Score rose from 642 to 758 in five months" /></label>
        {!editing?.has_uploaded_photo && <label className="admin-form-wide">Or photo link (optional, https)<input name="customerImageUrl" type="url" maxLength={500} defaultValue={editing && !editing.has_uploaded_photo ? editing.customer_image_url ?? '' : ''} /></label>}
      </div>

      <fieldset className="admin-testimonial-consent">
        <legend>Customer consent</legend>
        <label className="admin-checkbox"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); if (!event.target.checked) setPublish(false) }} /> The customer has agreed to Scorenow publishing their name, photo and review</label>
        <label>How consent was given (recommended)<input name="consentNote" defaultValue={editing?.consent_note ?? ''} maxLength={500} placeholder="e.g. Written consent by email on 12 Nov 2026" /></label>
        {editing?.consent_recorded_at && consent && <small>Consent recorded on {new Date(editing.consent_recorded_at).toLocaleDateString('en-IN')}{editing.consent_recorded_by ? ` by ${editing.consent_recorded_by}` : ''}.</small>}
        <label className={`admin-checkbox${consent ? '' : ' is-disabled'}`}><input type="checkbox" checked={consent && publish} disabled={!consent} onChange={(event) => setPublish(event.target.checked)} /> Publish on the website</label>
        {!consent && <small>Publishing is available once consent is recorded. Until then this is saved as a draft.</small>}
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-testimonial-actions">
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add testimonial'}</button>
        {editing && <button className="button button-outline" type="button" onClick={onCancel} disabled={saving}>Cancel</button>}
      </div>
    </form>
  )
}

export function AdminTestimonials({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [items, setItems] = useState<AdminTestimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [editing, setEditing] = useState<AdminTestimonial | null>(null)
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

  const saved = (item: AdminTestimonial, created: boolean) => {
    setItems((current) => created ? [item, ...current] : current.map((entry) => entry.id === item.id ? item : entry))
    setEditing(null)
    setFormKey((key) => key + 1)
    setNotice({ tone: 'info', text: item.published ? `${item.customer_name}'s testimonial is live on the website.` : `${item.customer_name}'s testimonial is saved as a draft.` })
  }

  const startEdit = (item: AdminTestimonial) => {
    setEditing(item)
    setFormKey((key) => key + 1)
    setNotice(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    if (!window.confirm(`Delete the testimonial from ${item.customer_name}? Their photo and review will be removed permanently.`)) return
    setBusyId(item.id)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/admin/testimonials/${item.id}`, { method: 'DELETE', headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to delete testimonial.'))
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      if (editing?.id === item.id) setEditing(null)
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to delete testimonial.' })
    } finally {
      setBusyId(null)
    }
  }

  const publishedCount = items.filter((item) => item.published).length
  const awaitingConsent = items.filter((item) => !item.consent_obtained).length

  return (
    <>
      <div className="admin-heading"><span>WEBSITE CONTENT</span><h1>Testimonials</h1><p>Add, edit and remove customer testimonials. Only entries with recorded customer consent can be published to the &ldquo;Success Stories&rdquo; section on the home page.</p></div>

      {notice && <p className={notice.tone === 'error' ? 'form-error' : 'form-success'} role="status">{notice.text}</p>}

      <article className="dashboard-card">
        <div className="dashboard-card-heading"><strong>{editing ? `Edit ${editing.customer_name}'s testimonial` : 'Add a testimonial'}</strong><small>Photo, name and review are published only with the customer&rsquo;s consent</small></div>
        <TestimonialForm key={formKey} token={token} editing={editing} onSaved={saved} onCancel={() => { setEditing(null); setFormKey((key) => key + 1) }} />
      </article>

      <article className="dashboard-card">
        <div className="dashboard-card-heading"><strong>All testimonials</strong><small>{items.length} total · {publishedCount} published{awaitingConsent ? ` · ${awaitingConsent} awaiting consent` : ''}</small></div>
        {loading ? <p>Loading testimonials…</p> : items.length === 0 ? <p>No testimonials yet. Add the first one above.</p> : (
          <div className="admin-testimonial-list">{items.map((item) => (
            <div className={`admin-testimonial-row${editing?.id === item.id ? ' is-editing' : ''}`} key={item.id}>
              <AdminPhoto item={item} token={token} />
              <div className="admin-testimonial-body">
                <div className="admin-testimonial-title">
                  <strong>{item.customer_name}</strong>
                  <span className="admin-testimonial-stars" aria-label={`${item.rating} out of 5`}>{'★'.repeat(item.rating)}</span>
                  <span className={`admin-status ${item.published ? 'success' : 'muted'}`}>{item.published ? 'Published' : 'Draft'}</span>
                  <span className={`admin-status ${item.consent_obtained ? 'success' : 'warning'}`}>{item.consent_obtained ? 'Consent recorded' : 'Awaiting consent'}</span>
                </div>
                <p>{item.review_text.length > 220 ? `${item.review_text.slice(0, 220)}…` : item.review_text}</p>
                <small>Added {new Date(item.submitted_at).toLocaleDateString('en-IN')}{item.consent_note ? ` · Consent: ${item.consent_note}` : ''}</small>
              </div>
              <div className="admin-row-actions">
                <button className="button button-outline" type="button" disabled={busyId === item.id} onClick={() => startEdit(item)}>Edit</button>
                <button className="button button-outline" type="button" disabled={busyId === item.id || (!item.published && !item.consent_obtained)} title={!item.published && !item.consent_obtained ? 'Record consent before publishing' : undefined} onClick={() => void togglePublished(item)}>{item.published ? 'Unpublish' : 'Publish'}</button>
                <button className="button button-outline" type="button" disabled={busyId === item.id} onClick={() => void removeTestimonial(item)}>Delete</button>
              </div>
            </div>
          ))}</div>
        )}
      </article>
    </>
  )
}
