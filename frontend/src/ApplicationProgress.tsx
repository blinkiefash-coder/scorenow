import { applicationProgressLabel } from './applicationProgressUtils'

const STEPS = ['Submitted', 'Admin review', 'Verification', 'Final review', 'Approved'] as const

const stepForStatus = (status: string | null) => {
  if (status === 'approved') return 4
  if (status === 'final_review') return 3
  if (['approved_for_processing', 'verification_assigned', 'verification_in_progress', 'verification_completed'].includes(status || '')) return 2
  return status === 'rejected' ? 4 : status === 'under_review' || status === 'correction_required' ? 1 : 0
}

export function ApplicationProgress({ status, compact = false }: { status: string | null; compact?: boolean }) {
  const activeStep = stepForStatus(status)
  const rejected = status === 'rejected'
  return <div className={`application-progress ${compact ? 'compact' : ''}`} aria-label={`Application progress: ${applicationProgressLabel(status)}`}>
    <div className="application-progress-track" aria-hidden="true"><i style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }} /></div>
    <ol>
      {STEPS.map((step, index) => <li className={`${index < activeStep ? 'complete' : ''} ${index === activeStep ? 'active' : ''} ${rejected && index === activeStep ? 'rejected' : ''}`} key={step}>
        <span>{index < activeStep ? '✓' : index + 1}</span><small>{step}</small>
      </li>)}
    </ol>
    {(status === 'correction_required' || rejected) && <strong className="application-progress-warning">{rejected ? 'Application rejected' : 'Correction required'}</strong>}
  </div>
}
