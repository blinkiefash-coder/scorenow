import { useEffect, useState, type FormEvent } from 'react'
import { Save, X } from 'lucide-react'
import './AdminCrm.css'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type Kyc = { nameAsPerPan: string; dateOfBirth: string; gender: string | null; addressLine1: string | null; addressLine2: string | null; city: string | null; state: string | null; pincode: string | null }
type Profile = { fullName: string; mobile: string; email: string | null; panLast4: string | null; kyc: Kyc | null }

export function CustomerEditDialog({ token, customerId, onClose, onSaved }: { token: string; customerId: string; onClose: () => void; onSaved: (changed: string[]) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch(`${apiUrl}/api/admin/customers/${customerId}/profile`, { headers: { Authorization: `Bearer ${token}` } })
        const body = await response.json().catch(() => ({})) as Profile & { message?: string }
        if (!active) return
        if (!response.ok) setError(body.message || 'Unable to load customer details.')
        else setProfile(body)
      } catch {
        if (active) setError('Unable to reach the server.')
      }
    })()
    return () => { active = false }
  }, [token, customerId])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return
    const form = new FormData(event.currentTarget)
    const value = (name: string) => String(form.get(name) ?? '').trim()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${apiUrl}/api/admin/customers/${customerId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: value('fullName'), mobile: value('mobile'), email: value('email') || null, reason: value('reason'),
          kyc: profile.kyc ? {
            nameAsPerPan: value('nameAsPerPan'), dateOfBirth: value('dateOfBirth'), gender: value('gender') || null,
            addressLine1: value('addressLine1') || null, addressLine2: value('addressLine2') || null,
            city: value('city') || null, state: value('state') || null, pincode: value('pincode') || null,
          } : null,
        }),
      })
      const body = await response.json().catch(() => ({})) as { message?: string; changed?: string[] }
      if (!response.ok) {
        setError(body.message || 'Unable to save customer details.')
        return
      }
      onSaved(body.changed ?? [])
    } catch {
      setError('Unable to reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const kyc = profile?.kyc
  return <div className="crm crm-modal" role="dialog" aria-modal="true" aria-label="Edit customer details" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="crm-det crm-form ce-form" onSubmit={(event) => void submit(event)}>
      <div className="crm-dh">
        <div><h2>Edit customer details</h2><p className="crm-muted">Changes are saved to the customer's account and recorded in the audit log.</p></div>
        <button className="crm-btn ghost sm" type="button" aria-label="Close" onClick={onClose}><X /></button>
      </div>
      {!profile ? <p className="crm-empty">{error || 'Loading details…'}</p> : <>
        <h3>Account</h3>
        <label>Full name<input name="fullName" defaultValue={profile.fullName} required minLength={2} maxLength={120} autoFocus /></label>
        <div className="crm-g2">
          <label>Mobile number<input name="mobile" defaultValue={profile.mobile} required inputMode="tel" pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" maxLength={10} /></label>
          <label>Email<input name="email" type="email" defaultValue={profile.email ?? ''} maxLength={200} /></label>
        </div>
        <p className="ce-hint">Changing the mobile or email marks it unverified. The customer signs in with the new mobile number and verifies it by OTP.</p>
        <h3>KYC profile {profile.panLast4 && <small className="crm-muted">PAN ••••••{profile.panLast4} (cannot be edited)</small>}</h3>
        {kyc ? <>
          <div className="crm-g2">
            <label>Name as per PAN<input name="nameAsPerPan" defaultValue={kyc.nameAsPerPan} required minLength={2} maxLength={120} style={{ textTransform: 'uppercase' }} /></label>
            <label>Date of birth<input name="dateOfBirth" type="date" defaultValue={kyc.dateOfBirth} required /></label>
          </div>
          <label>Gender<select name="gender" defaultValue={kyc.gender ?? ''}><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
          <label>Address line 1<input name="addressLine1" defaultValue={kyc.addressLine1 ?? ''} maxLength={200} /></label>
          <label>Address line 2<input name="addressLine2" defaultValue={kyc.addressLine2 ?? ''} maxLength={200} /></label>
          <div className="ce-g3">
            <label>City<input name="city" defaultValue={kyc.city ?? ''} maxLength={80} /></label>
            <label>State<input name="state" defaultValue={kyc.state ?? ''} maxLength={80} /></label>
            <label>Pincode<input name="pincode" defaultValue={kyc.pincode ?? ''} inputMode="numeric" pattern="[1-9][0-9]{5}" title="6-digit pincode" maxLength={6} /></label>
          </div>
        </> : <p className="crm-muted ce-hint">The customer hasn't completed their profile yet, so there are no KYC details to edit.</p>}
        <h3>Reason for change</h3>
        <textarea name="reason" rows={2} required minLength={3} maxLength={500} placeholder="e.g. Customer called to correct their address" />
        {error && <p className="dashboard-notice error" role="alert">{error}</p>}
        <div className="crm-acts"><button className="crm-btn ghost" type="button" onClick={onClose}>Cancel</button><button className="crm-btn" type="submit" disabled={busy}><Save /> {busy ? 'Saving…' : 'Save changes'}</button></div>
      </>}
    </form>
  </div>
}
