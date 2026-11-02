import { StyleSheet, View } from 'react-native'
import { Text } from '../../../components/Text'
import { Card, EmptyState, ErrorBanner, FullScreenLoader, Screen, ScreenHeader, SectionTitle, StatTile } from '../../../components/ui'
import { formatMoney } from '../../../lib/format'
import { colors } from '../../../lib/theme'
import type { AdminAnalytics } from '../../../lib/types'
import { useApi } from '../../../lib/useApi'

const funnelLabels: Record<string, string> = {
  signed_up: 'Signed up',
  profile_complete: 'Profile complete',
  payment_started: 'Payment started',
  payment_paid: 'Payment paid',
}

export default function AdminAnalyticsScreen() {
  const { data, loading, refreshing, error, refresh, reload } = useApi<AdminAnalytics>('/api/admin/analytics', 'admin')
  const s = data?.summary ?? {}
  const maxSignups = Math.max(1, ...(data?.trend.map((day) => Number(day.signups)) ?? [1]))
  const funnelMax = Math.max(1, ...(data?.funnel.map((step) => Number(step.count)) ?? [1]))

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} header={<ScreenHeader title="Analytics" subtitle="Last 14 days" />}>
      <ErrorBanner message={error} onRetry={reload} />
      {loading && !data ? <FullScreenLoader /> : null}
      {data ? (
        <>
          <View style={styles.tiles}>
            <StatTile label="Revenue" value={formatMoney(Number(s.revenue ?? 0))} tone={colors.green} />
            <StatTile label="Customers" value={String(s.total_users ?? 0)} />
          </View>
          <View style={[styles.tiles, { marginTop: 10 }]}>
            <StatTile label="Active" value={String(s.active_users ?? 0)} />
            <StatTile label="Open tickets" value={String(s.open_tickets ?? 0)} />
          </View>
          <View style={[styles.tiles, { marginTop: 10 }]}>
            <StatTile label="Paid orders" value={String(s.paid_payments ?? 0)} />
            <StatTile label="Failed" value={String(s.failed_payments ?? 0)} tone={Number(s.failed_payments) ? colors.red : colors.navy} />
          </View>

          <SectionTitle title="Signups per day" />
          <Card>
            <View style={styles.bars}>
              {data.trend.map((day) => (
                <View key={day.day} style={styles.barCol}>
                  <View style={[styles.bar, { height: 6 + (Number(day.signups) / maxSignups) * 74 }]} />
                  <Text style={styles.barLabel}>{day.day.slice(8)}</Text>
                </View>
              ))}
            </View>
          </Card>

          <SectionTitle title="Conversion funnel" />
          {data.funnel.length === 0 ? <EmptyState title="No data yet" /> : (
            <Card>
              {data.funnel.map((step) => (
                <View key={step.step} style={{ marginBottom: 12 }}>
                  <View style={styles.funnelTop}>
                    <Text style={styles.funnelName}>{funnelLabels[step.step] ?? step.step}</Text>
                    <Text style={styles.funnelCount}>{step.count}</Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${(Number(step.count) / funnelMax) * 100}%` }]} /></View>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100 },
  barCol: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  bar: { width: 8, borderRadius: 4, backgroundColor: colors.blue },
  barLabel: { fontSize: 9, color: colors.muted, marginTop: 4 },
  funnelTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  funnelName: { fontSize: 13, fontWeight: '700', color: colors.navy },
  funnelCount: { fontSize: 13, fontWeight: '800', color: colors.navy },
  track: { height: 8, borderRadius: 4, backgroundColor: '#e8edf7', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.blue },
})
