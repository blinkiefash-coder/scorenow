import './BrandLoader.css'

// Overlays the current page with a small branded loader while content is fetched.
export function BrandLoader({ label }: { label: string }) {
  return <div className="brand-loader" role="status" aria-live="polite">
    <div className="brand-loader-box">
      <div className="brand-loader-ring" aria-hidden="true">
        <span className="brand-loader-arc" />
        <span className="brand-loader-orbit"><i /></span>
        <span className="brand-loader-core"><img src="/scorenow-mark.png" alt="" /></span>
      </div>
      <strong>{label}</strong>
      <span className="brand-loader-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  </div>
}
