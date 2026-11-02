import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { Text } from '../components/Text'
import { Page } from '../components/Page'
import { SelectField } from '../components/SelectField'
import { Button, Card, EmptyState, Segmented, StatTile } from '../components/ui'
import { fdPlans, fdTenures } from '../lib/content'
import { formatMoney } from '../lib/format'
import { colors } from '../lib/theme'

export default function FixedDepositsScreen() {
  const [tenure, setTenure] = useState(12)
  const [descending, setDescending] = useState(true)

  const visible = fdPlans
    .filter((plan) => tenure >= plan.minMonths && tenure <= plan.maxMonths)
    .sort((a, b) => (descending ? b.rate - a.rate : a.rate - b.rate))

  return (
    <Page title="Fixed deposits">
      <View style={styles.tiles}>
        <StatTile label="Top rate" value={`${Math.max(...fdPlans.map((plan) => plan.rate)).toFixed(2)}%`} tone={colors.green} />
        <StatTile label="Partner banks" value={String(fdPlans.length)} />
        <StatTile label="Min. invest" value={formatMoney(Math.min(...fdPlans.map((plan) => plan.min)))} />
      </View>

      <View style={{ height: 14 }} />
      <SelectField label="Tenure" value={fdTenures.find((item) => item.months === tenure)?.label ?? ''} options={fdTenures.map((item) => item.label)} onChange={(label) => setTenure(fdTenures.find((item) => item.label === label)?.months ?? 12)} />
      <Segmented options={[{ id: 'high', label: 'Highest rate first' }, { id: 'low', label: 'Lowest rate first' }]} value={descending ? 'high' : 'low'} onChange={(value) => setDescending(value === 'high')} />
      <View style={{ height: 10 }} />

      {visible.length === 0 ? <EmptyState title="No banks offer this tenure" /> : visible.map((plan, index) => (
        <Card key={plan.bank}>
          <View style={styles.top}>
            <View style={[styles.avatar, { backgroundColor: [colors.blue, colors.green, colors.violet, colors.gold][index % 4] }]}><Text style={styles.avatarText}>{plan.bank.charAt(0)}</Text></View>
            <Text style={styles.bank}>{plan.bank}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.rate}>{plan.rate.toFixed(2)}%</Text>
              <Text style={styles.meta}>p.a.</Text>
            </View>
          </View>
          <Text style={styles.meta}>Min {formatMoney(plan.min)} · Max {plan.max}</Text>
          <Text style={styles.meta}>Tenure {plan.tenure}</Text>
          <Text style={styles.meta}>Payout {plan.payout}</Text>
          <View style={{ marginTop: 12 }}>
            <Button title="Invest now" small onPress={() => Alert.alert('Coming soon', `Online FD booking with ${plan.bank} is coming soon. Please contact the bank directly to invest.`)} />
          </View>
        </Card>
      ))}
      <Text style={styles.disclaimer}>Interest rates are indicative and may change. Please confirm the latest rate and terms with the bank before investing.</Text>
    </Page>
  )
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  bank: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
  rate: { fontSize: 20, fontWeight: '900', color: colors.green },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
  disclaimer: { fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 16 },
})
