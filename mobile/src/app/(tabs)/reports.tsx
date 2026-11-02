import { BureauCard } from '../../components/BureauCard'
import { ErrorBanner, FullScreenLoader, Screen, ScreenHeader } from '../../components/ui'
import { useDashboard } from '../../lib/dashboard'

export default function ReportsScreen() {
  const { dashboard, loading, refreshing, error, refresh, reload } = useDashboard()
  if (loading && !dashboard) return <FullScreenLoader label="Loading your reports…" />
  return (
    <Screen onRefresh={refresh} refreshing={refreshing} header={<ScreenHeader title="Reports" subtitle="Tap a completed report for full details" />}>
      <ErrorBanner message={error} onRetry={reload} />
      {(['cibil', 'equifax', 'experian', 'crif'] as const).map((bureau) => (
        <BureauCard key={bureau} bureau={bureau} report={dashboard?.reports.find((report) => report.bureau === bureau)} />
      ))}
    </Screen>
  )
}
