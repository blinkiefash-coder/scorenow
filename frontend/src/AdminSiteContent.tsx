import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_REPORT_PRICE, apiUrl, effectiveBusinessPrices, effectiveFdPlans, effectiveServicePlans, effectiveSubscriptionPlans,
  invalidateSiteContent, type SiteContent, type SiteContentKey,
} from './siteContent'

type Notice = { tone: 'info' | 'error'; text: string }

const SECTIONS: { key: SiteContentKey; title: string; hint: string }[] = [
  { key: 'report_price', title: 'Credit report price', hint: 'Amount in whole rupees, GST-inclusive. Applies to new report orders.' },
  { key: 'subscription_plans', title: 'Subscription plans', hint: 'Keep each id unchanged; payments use it to find the plan. months is 1–120 and price is GST-inclusive whole rupees.' },
  { key: 'service_plans', title: 'Service plans', hint: 'Prices are display text, for example "₹10,999". Up to 10 plans.' },
  { key: 'fd_plans', title: 'Fixed deposit rates', hint: 'Indicative rates only. rate is percent per year (0–30). min is in rupees; minMonths and maxMonths are whole months.' },
  { key: 'business_plan_prices', title: 'Business plan prices', hint: 'Prices shown on the Business page. Plan descriptions and features stay in the code.' },
]

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })
const jsonHeaders = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const readError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({})) as { message?: string }
  return body.message || fallback
}

// Mirrors the values the public site uses, so admins edit what is currently shown.
const effectiveValue = (content: SiteContent | null, key: SiteContentKey): unknown => {
  switch (key) {
    case 'report_price': return content?.report_price ?? { amount: DEFAULT_REPORT_PRICE }
    case 'subscription_plans': return effectiveSubscriptionPlans(content)
    case 'service_plans': return effectiveServicePlans(content)
    case 'fd_plans': return effectiveFdPlans(content)
    case 'business_plan_prices': return effectiveBusinessPrices(content)
  }
}
const toDraft = (value: unknown) => JSON.stringify(value, null, 2)

export function AdminSiteContent({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [content, setContent] = useState<SiteContent | null>(null)
  const [drafts, setDrafts] = useState<Partial<Record<SiteContentKey, string>>>({})
  const [busyKey, setBusyKey] = useState<SiteContentKey | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loadError, setLoadError] = useState('')

  // Only the section that was just saved or reset is refreshed, so unsaved edits elsewhere are kept.
  const loadContent = useCallback(async (changedKey?: SiteContentKey) => {
    try {
      const response = await fetch(`${apiUrl}/api/site-content`)
      if (!response.ok) throw new Error('Unable to load site content.')
      const next = await response.json() as SiteContent
      setContent(next)
      setDrafts((current) => {
        const updated = { ...current }
        for (const { key } of SECTIONS) {
          if (!changedKey || changedKey === key) updated[key] = toDraft(effectiveValue(next, key))
        }
        return updated
      })
      setLoadError('')
    } catch (error) {
      setLoadError(errorText(error, 'Unable to load site content.'))
    }
  }, [])

  useEffect(() => {
    void loadContent()
  }, [loadContent, refreshKey])

  const save = async (key: SiteContentKey, title: string) => {
    let value: unknown
    try {
      value = JSON.parse(drafts[key] ?? '')
    } catch {
      setNotice({ tone: 'error', text: `${title}: the JSON is not valid. Check commas, quotes and brackets.` })
      return
    }
    setBusyKey(key)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/admin/site-content/${key}`, {
        method: 'PUT', headers: jsonHeaders(token), body: JSON.stringify({ value }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Unable to save.'))
      invalidateSiteContent()
      await loadContent(key)
      setNotice({ tone: 'info', text: `${title} saved. The website now shows the new values.` })
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to save.') })
    } finally {
      setBusyKey(null)
    }
  }

  const resetToDefault = async (key: SiteContentKey, title: string) => {
    if (!window.confirm(`Reset ${title} to the built-in default? Any unsaved edits in this section will be lost.`)) return
    setBusyKey(key)
    setNotice(null)
    try {
      const response = await fetch(`${apiUrl}/api/admin/site-content/${key}`, { method: 'DELETE', headers: authHeaders(token) })
      if (!response.ok) throw new Error(await readError(response, 'Unable to reset.'))
      invalidateSiteContent()
      await loadContent(key)
      setNotice({ tone: 'info', text: `${title} reset to the default.` })
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error, 'Unable to reset.') })
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <>
      <div className="admin-heading"><span>SITE CONTENT</span><h1>Plans & prices</h1><p>Changes here update the Scorenow website and the mobile app. New orders use the new prices; paid orders keep the amount they were paid at.</p></div>
      {notice && <p className={`site-content-notice ${notice.tone}`} role="status">{notice.text}</p>}
      {loadError && <p className="site-content-notice error" role="alert">{loadError}</p>}
      {!content && !loadError && <p role="status">Loading site content…</p>}
      {content && SECTIONS.map(({ key, title, hint }) => (
        <article className="dashboard-card site-content-card" key={key}>
          <div className="dashboard-card-heading"><strong>{title}</strong><small>{hint}</small></div>
          <textarea
            className="site-content-editor"
            aria-label={`${title} (JSON)`}
            spellCheck={false}
            value={drafts[key] ?? ''}
            onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
          />
          <div className="site-content-actions">
            <button className="button button-primary" type="button" disabled={busyKey !== null} onClick={() => void save(key, title)}>
              {busyKey === key ? 'Saving…' : 'Save changes'}
            </button>
            <button className="button button-outline" type="button" disabled={busyKey !== null} onClick={() => void resetToDefault(key, title)}>
              Reset to default
            </button>
          </div>
        </article>
      ))}
    </>
  )
}
