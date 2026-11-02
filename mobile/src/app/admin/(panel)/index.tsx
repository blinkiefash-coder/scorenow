import { Redirect } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Text } from '../../../components/Text'
import { Card, EmptyState, ErrorBanner, FullScreenLoader, Pill, Screen, ScreenHeader, SectionTitle, StatTile } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { formatDateTime, formatMoney, titleCase } from '../../../lib/format'
import { colors } from '../../../lib/theme'
import type { AdminActivity } from '../../../lib/types'
import { useApi } from '../../../lib/useApi'

const statusTone = (status: string) => (status === 'paid' ? colors.green : status === 'failed' ? colors.red : colors.gold)

export default function AdminOverview() {
  const { admin } = useAuth()
  const allowed = admin?.role === 'owner' || admin?.role === 'manager'
  const { data, loading, refreshing, error, refresh, reload } = useApi<AdminActivity>(allowed ? '/api/admin/activity' : null, 'admin')

  if (!allowed) return <Redirect href={admin?.role === 'analyst' ? '/admin/analytics' : '/admin/tickets'} />
  if (loading && !data) return <FullScreenLoader label="Loading activity…" />

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} header={<ScreenHeader title="Overview" subtitle={`Signed in as ${titleCase(admin?.role ?? '')}`} />}>
      <ErrorBanner message={error} onRetry={reload} />
      {data ? (
        <>
          <View style={styles.tiles}>
            <StatTile label="Customers" value={String(data.summary.totalUsers)} />
            <StatTile label="Revenue" value={formatMoney(data.summary.paymentRevenue)} tone={colors.green} />
          </View>
          <View style={[styles.tiles, { marginTop: 10 }]}>
            <StatTile label="Paid orders" value={String(data.summary.paidPayments)} />
            <StatTile label="Failed payments" value={String(data.summary.failedPayments)} tone={data.summary.failedPayments ? colors.red : colors.navy} />
          </View>
          <View style={[styles.tiles, { marginTop: 10, marginBottom: 6 }]}>
            <StatTile label="Report requests" value={String(data.summary.reportRequests)} />
            <StatTile label="Failed reports" value={String(data.summary.failedReportRequests)} tone={data.summary.failedReportRequests ? colors.red : colors.navy} />
          </View>

          <SectionTitle title="Recent payments" />
          {data.payments.length === 0 ? <EmptyState title="No payments yet" /> : data.payments.map((payment) => (
            <Card key={payment.id}>
              <View style={styles.top}>
                <Text style={styles.name}>{payment.full_name}</Text>
                <Pill text={payment.status} color={statusTone(payment.status)} />
              </View>
              <Text style={styles.meta}>•••• {payment.mobile_last4} · {payment.bureau ? payment.bureau.toUpperCase() : '—'} · {formatMoney(payment.amount)}</Text>
              {payment.failure_reason ? <Text style={[styles.meta, { color: colors.red }]}>{payment.failure_reason}</Text> : null}
              <Text style={styles.meta}>{formatDateTime(payment.created_at)}</Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
})
