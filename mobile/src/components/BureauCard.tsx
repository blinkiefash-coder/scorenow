import { Image } from 'expo-image'
import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { useDashboard } from '../lib/dashboard'
import { formatDate } from '../lib/format'
import { colors, scoreColor } from '../lib/theme'
import { bureauNames, type BureauId, type BureauReport } from '../lib/types'
import { Button, Card, Pill } from './ui'

export const bureauLogos: Record<BureauId, number> = {
  cibil: require('../../assets/brand/logo-cibil.png'),
  equifax: require('../../assets/brand/logo-equifax.svg'),
  experian: require('../../assets/brand/logo-experian-new.svg'),
  crif: require('../../assets/brand/logo-crif.png'),
}

export function BureauCard({ bureau, report }: { bureau: BureauId; report?: BureauReport }) {
  const { options, busyBureau, getReport, retryReport } = useDashboard()
  const busy = busyBureau === bureau
  const available = options?.bureaus.find((item) => item.id === bureau)?.available ?? true
  const completed = report?.status === 'completed'

  return (
    <Card onPress={completed ? () => router.push({ pathname: '/report/[id]', params: { id: report.request_id } }) : undefined}>
      <View style={styles.top}>
        <View style={styles.logoTile}><Image source={bureauLogos[bureau]} style={styles.logo} contentFit="contain" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{bureauNames[bureau]}</Text>
          {completed ? <Text style={styles.meta}>Updated {formatDate(report.report_date ?? report.requested_at)}</Text> : null}
        </View>
        {report ? (
          <Pill
            text={report.status}
            color={completed ? colors.green : report.status === 'failed' ? colors.red : colors.gold}
          />
        ) : null}
      </View>

      {completed ? (
        <>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: scoreColor(report.credit_score) }]}>{report.credit_score ?? '—'}</Text>
            <Text style={styles.band}>{report.score_band ?? ''}</Text>
            <Text style={styles.view}>View report ›</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(4, (((report.credit_score ?? 300) - 300) / 600) * 100))}%`, backgroundColor: scoreColor(report.credit_score) }]} />
          </View>
        </>
      ) : null}

      {report?.status === 'failed' ? (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.failure}>{report.failure_reason || 'We could not fetch this report.'}</Text>
          <Button title="Retry" small onPress={() => void retryReport(report.request_id, bureau)} loading={busy} />
        </View>
      ) : null}

      {report?.status === 'processing' ? <Text style={styles.failure}>Your report is being prepared. Pull down to refresh.</Text> : null}

      {!report ? (
        <View style={{ marginTop: 12 }}>
          <Button
            title={available ? (options?.demoMode ? 'Get free report' : `Get report${options ? ` · ₹${options.price}` : ''}`) : 'Coming soon'}
            small
            variant="gold"
            disabled={!available}
            loading={busy}
            onPress={() => void getReport(bureau)}
          />
        </View>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoTile: { width: 62, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 6 },
  logo: { width: '100%', height: '100%' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.sky, marginTop: 10, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  name: { fontSize: 15, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 12 },
  score: { fontSize: 34, fontWeight: '900' },
  band: { fontSize: 13, color: colors.muted, fontWeight: '700', textTransform: 'capitalize', flex: 1 },
  view: { fontSize: 13, color: colors.blue, fontWeight: '800' },
  failure: { fontSize: 13, color: colors.muted, marginTop: 10, marginBottom: 8 },
})
