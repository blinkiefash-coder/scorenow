import { useState, type FormEvent } from 'react'
import type { PortalConfig } from './portalConfig'
import './PortalLogin.css'

type Props = {
  portal: PortalConfig
  loading: boolean
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function PortalLogin({ portal, loading, error, onSubmit }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div className="portal-login">
      <section className="portal-side">
        <a className="portal-logo" href="/"><img src="/scorenow-logo-2026.jpg" alt="Scorenow – Improve Your Credit Score" /></a>
        <div>
          <h2>{portal.headline}</h2>
          <p>{portal.description}</p>
        </div>
        <div className="portal-stats">
          {portal.stats.map((stat) => <div className="portal-stat" key={stat.value}><b>{stat.value}</b><span>{stat.label}</span></div>)}
        </div>
      </section>
      <section className="portal-main">
        <form className="portal-card" onSubmit={onSubmit}>
          <h1>{portal.title}</h1>
          <span className="portal-badge">{portal.badge}</span>
          <p className="portal-sub">{portal.subtitle}</p>
          <label htmlFor="portal-id">{portal.idLabel}</label>
          <div className="portal-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
            <input id="portal-id" name="id" autoComplete="username" placeholder={portal.idPlaceholder} required />
          </div>
          <label htmlFor="portal-password">Password</label>
          <div className="portal-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
            <input id="portal-password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter password" required />
            <button type="button" className="portal-eye" onClick={() => setShow((value) => !value)}>{show ? 'Hide' : 'Show'}</button>
          </div>
          <label htmlFor="portal-pin">Security PIN</label>
          <div className="portal-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>
            <input id="portal-pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="6-digit PIN" required />
          </div>
          <div className="portal-msg" role="alert">{error}</div>
          <button className="portal-go" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in →'}</button>
          <div className="portal-foot">{portal.footer}</div>
        </form>
      </section>
    </div>
  )
}
